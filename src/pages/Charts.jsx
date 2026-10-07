import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import PageLayout from '../components/PageLayout';
import PageHead from '../components/PageHead';
import Money from '../components/Money';
import { PageSkeleton } from '../components/Skeleton';
import { api } from '../api.js';
import {
  formatEUR, formatPrice, formatDayLong, pctText, localDay,
  TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE,
} from '../utils/format';
import { periodSeries, portfolioSeries30d, PERIODS } from '../utils/networth';
import { MARKET, MARKET_AREA, TONE, assetColor } from '../utils/marks';

const AXIS_TICK = { fill: '#9A9AA8', fontSize: 12 };
const CURSOR = { stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 };
const tooltipProps = { contentStyle: TOOLTIP_STYLE, labelStyle: TOOLTIP_LABEL_STYLE, itemStyle: TOOLTIP_ITEM_STYLE };
const signedEUR = (v) => `${v >= 0 ? '+' : ''}${formatEUR(v)}`;
const shareText = (pct) => (pct < 0.1 ? '<0.1' : pct.toFixed(1));

// Prices below €1 (dex tokens) die under Math.round — keep sane precision instead.
const px = (v) => {
  const n = Number(v) || 0;
  if (n >= 100) return Math.round(n);
  if (n >= 1) return Number(n.toFixed(2));
  return Number(n.toFixed(6));
};

export default function Charts() {
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dcaAsset, setDcaAsset] = useState('');
  const [period, setPeriod] = useState('1M');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [u, d, a, h] = await Promise.all([
          api.getMe(), api.getDashboard(), api.getAssets(),
          api.getNetworthHistory().catch(() => []),
        ]);
        setUser(u); setDashboard(d); setAssets(a); setHistory(h || []);
        if (a.length > 0 && !dcaAsset) setDcaAsset(a[0].symbol);
      } catch (err) {}
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <PageLayout title="Charts" username=""><PageSkeleton rows={6} /></PageLayout>;
  if (!user || !dashboard) return <div className="loading-screen"><div className="loading-error">Error</div></div>;

  // Portfolio value: recorded history when it is long enough, else the reconstruction.
  const trend = periodSeries(
    (history || []).map(h => ({ date: h.date, total: h.portfolio || 0 })).filter(h => h.total > 0),
    portfolioSeries30d(dashboard.purchases, dashboard.prices, assets),
    period,
  );
  const lastValue = trend.series.length ? trend.series[trend.series.length - 1].value : (dashboard.summary?.total_value || 0);

  // Growth by market: per day, every asset that counts toward the totals folded into stock or crypto.
  const isStock = Object.fromEntries(assets.map(a => [a.symbol, a.asset_type === 'stock_etf']));
  const growthData = buildAllocation(dashboard, assets, 30).map(day => {
    let stock = 0, crypto = 0;
    assets.forEach(a => {
      if (dashboard.summary?.by_asset?.[a.symbol]?.include_in_totals === false) return;
      if (isStock[a.symbol]) stock += day[a.symbol] || 0; else crypto += day[a.symbol] || 0;
    });
    return { date: day.date, stock, crypto };
  });

  // Distribution: held assets that count toward the totals, largest first.
  const by = dashboard.summary?.by_asset || {};
  const held = Object.entries(by)
    .filter(([, d]) => d && d.include_in_totals !== false && d.value > 0)
    .map(([symbol, d]) => {
      const asset = assets.find(a => a.symbol === symbol);
      return { symbol, name: asset?.name || symbol, value: d.value, color: assetColor(asset, symbol) };
    })
    .sort((a, b) => b.value - a.value);
  const heldTotal = held.reduce((s, h) => s + h.value, 0);

  const monthlyData = buildMonthly(dashboard);
  const dcaData = buildDCA(dashboard, dcaAsset);
  const lastDca = dcaData[dcaData.length - 1];

  return (
    <PageLayout title="Charts" username={user.username}>
      <PageHead title="Charts" />

      <div className="m-card">
        <div className="m-nw__head">
          <div className="m-label">Portfolio value</div>
          <div className="m-periods">
            {PERIODS.map(([k]) => (
              <button key={k} type="button" className={`m-periods__btn ${period === k ? 'is-active' : ''}`} onClick={() => setPeriod(k)}>{k}</button>
            ))}
          </div>
        </div>
        <div className="m-nw__value"><Money value={lastValue} /></div>
        {trend.series.length > 1 ? (
          <>
            <div className="m-nw__delta">
              <span className={trend.delta >= 0 ? 'm-up' : 'm-down'}>{signedEUR(trend.delta)} ({pctText(trend.deltaPct)})</span> · {trend.label}
            </div>
            <div className="m-nw__chart">
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={trend.series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={[(min) => min * 0.985, (max) => max * 1.01]} />
                  <Tooltip {...tooltipProps} cursor={CURSOR}
                    formatter={(v) => [formatEUR(v), 'Portfolio']}
                    labelFormatter={(l) => formatDayLong(l)} />
                  <Area type="monotone" dataKey="value" stroke="#8D9BFF" strokeWidth={1.5} strokeLinecap="round" fill="none"
                    dot={false} activeDot={{ r: 3.5, fill: '#8D9BFF', stroke: '#1B1B24', strokeWidth: 1.5 }}
                    isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : <div className="m-empty">Record purchases to build your portfolio history</div>}
      </div>

      <div className="m-g2 m-g2--cards">
        <div className="m-card">
          <div className="m-nw__head">
            <div className="m-label">Growth by market</div>
            <div className="m-label">Last 30 days, at today's prices</div>
          </div>
          {growthData.length > 1 ? (
            <>
              <div className="m-nw__chart">
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={growthData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip {...tooltipProps} cursor={CURSOR}
                      formatter={(v, name) => [formatEUR(v), name]}
                      labelFormatter={(l) => formatDayLong(l)} />
                    <Area type="monotone" dataKey="stock" name="Stock market" stackId="m" stroke={MARKET.stock} strokeWidth={1.5} fill={MARKET_AREA.stock} fillOpacity={1} isAnimationActive={false} />
                    <Area type="monotone" dataKey="crypto" name="Crypto market" stackId="m" stroke={MARKET.crypto} strokeWidth={1.5} fill={MARKET_AREA.crypto} fillOpacity={1} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="m-legend">
                <span><span className="m-legend__dot" style={{ background: MARKET.stock }} />Stock market</span>
                <span><span className="m-legend__dot" style={{ background: MARKET.crypto }} />Crypto market</span>
              </div>
            </>
          ) : <div className="m-empty">Growth will appear after your first purchases</div>}
        </div>

        <div className="m-card">
          <div className="m-label">Distribution</div>
          {held.length > 0 ? held.map(h => {
            const pct = (h.value / heldTotal) * 100;
            return (
              <div className="m-dist" key={h.symbol}>
                <span className="m-dist__label"><span className="m-dist__name">{h.name}</span><span className="m-dist__pct">{shareText(pct)}%</span></span>
                <span>{formatEUR(h.value)}</span>
                <span className="m-dist__bar"><span className="m-dist__fill" style={{ width: `${Math.max(pct, 1)}%`, background: h.color }} /></span>
              </div>
            );
          }) : <div className="m-empty">Nothing held yet</div>}
        </div>
      </div>

      <div className="m-g2 m-g2--cards">
        <div className="m-card">
          <div className="m-label">Monthly investments {new Date().getFullYear()}</div>
          {monthlyData.length > 0 ? (
            <>
              <div className="m-nw__chart">
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={monthlyData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="month" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip {...tooltipProps} cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      formatter={(v, name) => [formatEUR(v), name]} />
                    <Bar dataKey="invested" name="Invested" fill="#8D9BFF" barSize={10} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                    {/* Green when the month is worth more today than what went in, pink when it is worth less. */}
                    <Bar dataKey="value" name="Current value" fill={TONE.up} barSize={10} radius={[2, 2, 0, 0]} isAnimationActive={false}>
                      {monthlyData.map(m => <Cell key={m.month} fill={m.value >= m.invested ? TONE.up : TONE.down} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="m-legend">
                <span><span className="m-legend__dot" style={{ background: '#8D9BFF' }} />Invested</span>
                <span><span className="m-legend__dot" style={{ background: TONE.up }} />Worth more now</span>
                <span><span className="m-legend__dot" style={{ background: TONE.down }} />Worth less now</span>
              </div>
            </>
          ) : <div className="m-empty">No purchases this year yet</div>}
        </div>

        <div className="m-card">
          <div className="m-nw__head">
            <div className="m-label">Average price vs market</div>
            <select className="m-select" aria-label="Asset" value={dcaAsset} onChange={e => setDcaAsset(e.target.value)}>
              {assets.map(a => <option key={a.symbol} value={a.symbol}>{a.symbol}</option>)}
            </select>
          </div>
          {dcaData.length > 1 ? (
            <>
              <div className="m-nw__chart">
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={dcaData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="n" hide />
                    <YAxis hide domain={[(min) => min * 0.985, (max) => max * 1.015]} />
                    <Tooltip {...tooltipProps} cursor={CURSOR}
                      formatter={(v, name) => [formatPrice(v), name]}
                      labelFormatter={(n) => `Purchase #${n}`} />
                    <Line type="monotone" dataKey="market" name="Market" stroke="#9A9AA8" strokeWidth={1} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="dca" name="Your average" stroke="#8D9BFF" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="m-legend">
                <span><span className="m-legend__dot" style={{ background: '#8D9BFF' }} />Your average {formatPrice(lastDca.dca)}</span>
                <span><span className="m-legend__dot" style={{ background: '#9A9AA8' }} />Market {formatPrice(lastDca.market)}</span>
              </div>
            </>
          ) : <div className="m-empty">Not enough purchases yet</div>}
        </div>
      </div>
    </PageLayout>
  );
}

function buildAllocation(d, assets, days) {
  if (!d?.purchases?.length) return [];
  const { prices, purchases } = d;
  const s = [...purchases].sort((a, b) => new Date(a.date) - new Date(b.date));
  return Array.from({ length: days }, (_, i) => {
    const dt = new Date(); dt.setDate(dt.getDate() - (days - 1 - i));
    const ds = localDay(dt);
    const q = {}; s.filter(p => p.date <= ds).forEach(p => { q[p.asset] = (q[p.asset] || 0) + p.quantity; });
    const e = { date: ds, label: `${dt.getDate()}/${dt.getMonth() + 1}` };
    assets.forEach(a => { e[a.symbol] = Math.round((q[a.symbol] || 0) * ((prices[a.symbol] || {}).eur || 0)); });
    return e;
  });
}

function buildMonthly(d) {
  if (!d?.purchases?.length) return [];
  const { prices, purchases } = d;
  const ms = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const y = new Date().getFullYear();
  return ms.map((m, i) => {
    const k = `${y}-${String(i + 1).padStart(2, '0')}`;
    const mp = purchases.filter(p => p.date.startsWith(k));
    const inv = mp.reduce((s, p) => s + p.amount_eur, 0);
    const q = {}; mp.forEach(p => { q[p.asset] = (q[p.asset] || 0) + p.quantity; });
    let v = 0; for (const [sym, qty] of Object.entries(q)) v += qty * ((prices[sym] || {}).eur || 0);
    return { month: m, invested: Math.round(inv), value: Math.round(v) };
  }).filter(x => x.invested > 0 || x.value > 0);
}

function buildDCA(d, asset) {
  if (!d?.purchases?.length || !asset) return [];
  const ps = d.purchases.filter(p => p.asset === asset).sort((a, b) => new Date(a.date) - new Date(b.date));
  if (!ps.length) return [];
  const pi = d.prices[asset] || {};
  let ti = 0, tq = 0;
  return ps.map((p, i) => {
    ti += p.amount_eur; tq += p.quantity;
    return { n: i + 1, dca: px(ti / tq), market: px(pi.eur || 0) };
  });
}
