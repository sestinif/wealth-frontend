import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import PageLayout from '../components/PageLayout';
import FormInput from '../components/FormInput';
import AssetBadge from '../components/AssetBadge';
import EmptyState from '../components/EmptyState';
import { PageSkeleton } from '../components/Skeleton';
import { api } from '../api.js';
import { formatEUR, formatUSD, formatPct } from '../utils/format';

const TT = {
  background: 'rgba(14,15,23,0.96)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10, padding: '8px 12px',
  fontSize: 12, fontFamily: "'Geist Mono', ui-monospace, monospace",
  fontVariantNumeric: 'tabular-nums',
  boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
};
const TT_ITEM = { color: '#f2f1f5', fontSize: 12 };
const AXIS = { fill: '#56546a', fontSize: 10, fontFamily: "'Geist Mono', ui-monospace, monospace" };
const GRID = { stroke: 'rgba(255,255,255,0.04)', strokeDasharray: '2 4', vertical: false };
const ANIM = { animationDuration: 900, animationEasing: 'ease-out' };

// Glowing dot on the most recent point — reads as "live", very premium.
const lastDot = (len, color) => (p) =>
  p.index === len - 1 && p.cx != null
    ? <g key="last"><circle cx={p.cx} cy={p.cy} r={7} fill={color} opacity={0.2} /><circle cx={p.cx} cy={p.cy} r={3.5} fill={color} stroke="#0a0b11" strokeWidth={2} /></g>
    : <g key={p.index} />;

export default function Charts() {
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dcaAsset, setDcaAsset] = useState('');
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [u, d, a] = await Promise.all([api.getMe(), api.getDashboard(), api.getAssets()]);
        setUser(u); setDashboard(d); setAssets(a);
        if (a.length > 0 && !dcaAsset) setDcaAsset(a[0].symbol);
      } catch (err) {}
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <PageLayout title="Grafici" username=""><PageSkeleton rows={6} /></PageLayout>;
  if (!user || !dashboard) return <div className="loading-screen"><div className="loading-error">Errore</div></div>;

  const days = timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : 30;
  const portfolioData = buildPortfolio(dashboard, days);
  const allocData = buildAllocation(dashboard, assets, days);
  const monthlyData = buildMonthly(dashboard);
  const dcaData = buildDCA(dashboard, dcaAsset);
  const pieData = buildPie(dashboard, assets);

  // Summary stats for charts
  const firstVal = portfolioData[0]?.value || 0;
  const lastVal = portfolioData[portfolioData.length - 1]?.value || 0;
  const portfolioChange = firstVal > 0 ? ((lastVal - firstVal) / firstVal * 100) : 0;
  const gc = (s) => assets.find(a => a.symbol === s)?.color || '#7c5cff';

  return (
    <PageLayout title="Grafici" username={user.username}>

      {/* Header */}
      <div className="animate-in" style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4, letterSpacing: '-0.3px' }}>
          Grafici & Analytics
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
          Andamento del tuo portfolio nel tempo
        </div>
      </div>

      {/* Portfolio Value — Full Width */}
      <div className="card section-gap animate-in-1">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 className="card__title mb-0">Valore Portfolio</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-1)', fontFamily: 'var(--font-num)' }}>
                {formatEUR(lastVal)}
              </span>
              <span style={{ fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-num)', color: portfolioChange >= 0 ? 'var(--green)' : 'var(--red-soft)' }}>
                {portfolioChange >= 0 ? '+' : ''}{portfolioChange.toFixed(2)}% ({days}g)
              </span>
            </div>
          </div>
          <div className="filter-bar">
            {['7d', '14d', '30d'].map(r => (
              <button key={r} className={`btn btn--ghost btn--sm ${timeRange === r ? 'active' : ''}`} onClick={() => setTimeRange(r)}>{r}</button>
            ))}
          </div>
        </div>
        {portfolioData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={portfolioData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={portfolioChange >= 0 ? '#2dd17f' : '#ff5a6e'} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={portfolioChange >= 0 ? '#2dd17f' : '#ff5a6e'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="label" stroke="transparent" tick={AXIS} axisLine={false} tickLine={false} />
              <YAxis stroke="transparent" tick={AXIS} axisLine={false} tickLine={false} domain={['auto', 'auto']}
                tickFormatter={v => '€' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
              <Tooltip contentStyle={TT} itemStyle={TT_ITEM} formatter={(v) => [formatEUR(v), 'Valore']} labelStyle={{ color: '#85819a', fontSize: 10 }}
                cursor={{ stroke: 'rgba(124,92,255,0.4)', strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Area type="monotone" dataKey="value" {...ANIM}
                stroke={portfolioChange >= 0 ? '#2dd17f' : '#ff5a6e'}
                strokeWidth={2} strokeLinecap="round" fill="url(#pg)"
                dot={lastDot(portfolioData.length, portfolioChange >= 0 ? '#2dd17f' : '#ff5a6e')}
                activeDot={{ r: 4, fill: '#fff', stroke: '#0a0b11', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : <EmptyState compact icon="chart" title="Nessun dato" description="Registra acquisti per costruire lo storico del portfolio." />}
      </div>

      {/* Allocation + Pie */}
      <div className="grid-2col section-gap animate-in-2">
        <div className="card">
          <div className="card__head">
            <h3 className="card__title">Allocazione nel tempo</h3>
            <span className="card__subtitle">Valori in EUR · stacked</span>
          </div>
          {allocData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={allocData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="label" stroke="transparent" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis stroke="transparent" tick={AXIS} axisLine={false} tickLine={false}
                  tickFormatter={v => '€' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                <Tooltip contentStyle={TT} itemStyle={TT_ITEM} formatter={(v) => formatEUR(v)} labelStyle={{ color: '#85819a', fontSize: 10 }} />
                {assets.map(a => (
                  <Area key={a.symbol} type="monotone" dataKey={a.symbol} {...ANIM}
                    stackId="1" stroke={a.color} fill={a.color} fillOpacity={0.4} strokeWidth={0} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyState compact icon="chart" title="Nessun dato" description="L'allocazione comparirà dopo i primi acquisti." />}
        </div>

        <div className="card">
          <div className="card__head">
            <h3 className="card__title">Distribuzione attuale</h3>
            <span className="card__subtitle">Peso % in EUR</span>
          </div>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value"
                    stroke="#0a0b11" strokeWidth={2} {...ANIM}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TT} itemStyle={TT_ITEM} formatter={(v) => [formatEUR(v), 'Valore']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {pieData.map(item => (
                  <div key={item.name} className="pie-legend__row">
                    <div className="pie-legend__dot" style={{ background: item.color }} />
                    <span className="pie-legend__name">{item.name}</span>
                    <span className="pie-legend__value">{formatEUR(item.value)}</span>
                    <span className="pie-legend__pct">{item.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : <EmptyState compact icon="inbox" title="Nessun dato" description="Nessun asset con valore da distribuire." />}
        </div>
      </div>

      {/* Monthly + DCA */}
      <div className="grid-2col animate-in-3">
        <div className="card">
          <div className="card__head">
            <h3 className="card__title">Investimenti mensili {new Date().getFullYear()}</h3>
            <span className="card__subtitle">Investito vs valore · EUR</span>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData} barGap={1} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="month" stroke="transparent" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis stroke="transparent" tick={AXIS} axisLine={false} tickLine={false}
                  tickFormatter={v => '€' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                <Tooltip contentStyle={TT} itemStyle={TT_ITEM} formatter={(v) => [formatEUR(v)]} labelStyle={{ color: '#85819a', fontSize: 10 }}
                  cursor={{ fill: 'rgba(124,92,255,0.06)' }} />
                <Bar dataKey="invested" name="Investito" fill="#7c5cff" radius={[6, 6, 0, 0]} barSize={14} {...ANIM} />
                <Bar dataKey="value" name="Valore attuale" fill="#b9a6ff" radius={[6, 6, 0, 0]} barSize={14} fillOpacity={0.5} {...ANIM} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState compact icon="chart" title="Nessun investimento" description="Gli investimenti mensili dell'anno appariranno qui." />}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 className="card__title mb-0">DCA vs Market Price</h3>
              {dcaData.length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                  {dcaData.length} acquisti · Media: {formatEUR(dcaData[dcaData.length - 1]?.dca || 0)}
                </div>
              )}
            </div>
            <div style={{ width: 90 }}>
              <FormInput type="select" value={dcaAsset} onChange={e => setDcaAsset(e.target.value)}
                options={assets.map(a => ({ value: a.symbol, label: a.symbol }))} />
            </div>
          </div>
          {dcaData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dcaData}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="n" stroke="transparent" tick={AXIS} axisLine={false} tickLine={false} />
                <YAxis stroke="transparent" tick={AXIS} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip contentStyle={TT} itemStyle={TT_ITEM} formatter={(v) => [formatEUR(v)]} labelFormatter={(n) => `Acquisto #${n}`} labelStyle={{ color: '#85819a', fontSize: 10 }} />
                <Line type="monotone" dataKey="dca" name="Il tuo DCA" stroke="#7c5cff" strokeWidth={2} strokeLinecap="round" {...ANIM}
                  dot={lastDot(dcaData.length, '#7c5cff')} activeDot={{ r: 4, fill: '#b9a6ff', stroke: '#0a0b11', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="market" name="Prezzo attuale" stroke="rgba(167,139,250,0.4)" strokeWidth={1.5} dot={false} strokeDasharray="6 3" {...ANIM} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyState compact icon="inbox" title={`Nessun acquisto ${dcaAsset}`} description="Seleziona un asset con acquisti registrati." />}
        </div>
      </div>
    </PageLayout>
  );
}

function buildPortfolio(d, days) {
  if (!d?.purchases?.length) return [];
  const { prices, purchases } = d;
  const s = [...purchases].sort((a, b) => new Date(a.date) - new Date(b.date));
  return Array.from({ length: days }, (_, i) => {
    const dt = new Date(); dt.setDate(dt.getDate() - (days - 1 - i));
    const ds = dt.toISOString().split('T')[0];
    const q = {}; s.filter(p => p.date <= ds).forEach(p => { q[p.asset] = (q[p.asset] || 0) + p.quantity; });
    let v = 0; for (const [sym, qty] of Object.entries(q)) v += qty * ((prices[sym] || {}).eur || 0);
    return { date: ds, label: `${dt.getDate()}/${dt.getMonth() + 1}`, value: Math.round(v) };
  });
}

function buildAllocation(d, assets, days) {
  if (!d?.purchases?.length) return [];
  const { prices, purchases } = d;
  const s = [...purchases].sort((a, b) => new Date(a.date) - new Date(b.date));
  return Array.from({ length: days }, (_, i) => {
    const dt = new Date(); dt.setDate(dt.getDate() - (days - 1 - i));
    const ds = dt.toISOString().split('T')[0];
    const q = {}; s.filter(p => p.date <= ds).forEach(p => { q[p.asset] = (q[p.asset] || 0) + p.quantity; });
    const e = { date: ds, label: `${dt.getDate()}/${dt.getMonth() + 1}` };
    assets.forEach(a => { e[a.symbol] = Math.round((q[a.symbol] || 0) * ((prices[a.symbol] || {}).eur || 0)); });
    return e;
  });
}

function buildMonthly(d) {
  if (!d?.purchases?.length) return [];
  const { prices, purchases } = d;
  const ms = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
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
    return { n: i + 1, dca: Math.round(ti / tq), market: Math.round(pi.eur || 0) };
  });
}

function buildPie(d, assets) {
  if (!d?.summary?.by_asset) return [];
  const total = d.summary.total_value || 1;
  return assets
    .filter(a => d.summary.by_asset[a.symbol]?.value > 0)
    .map(a => ({
      name: a.symbol,
      value: d.summary.by_asset[a.symbol].value,
      color: a.color,
      pct: (d.summary.by_asset[a.symbol].value / total * 100).toFixed(1),
    }))
    .sort((a, b) => b.value - a.value);
}
