import React, { useState, useEffect } from 'react';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PageLayout from '../components/PageLayout';
import DataTable from '../components/DataTable';
import AssetBadge from '../components/AssetBadge';
import { api } from '../api.js';
import { formatEUR, formatUSD, formatQty, formatPnL, formatPct, formatDate, TOOLTIP_STYLE } from '../utils/format';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [user, setUser] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [d, u, a] = await Promise.all([api.getDashboard(), api.getMe(), api.getAssets()]);
        setData(d); setUser(u); setAssets(a);
      } catch (err) {}
      finally { setLoading(false); }
    };
    fetchData();
    const iv = setInterval(fetchData, 60000);
    return () => clearInterval(iv);
  }, []);

  if (loading) return <div className="loading-screen"><div className="loading-logo">W</div><div className="loading-text">CARICAMENTO...</div></div>;
  if (!data || !user) return <div className="loading-screen"><div className="loading-error">Errore nel caricamento</div></div>;

  const { summary, prices, purchases } = data;
  const gc = (s) => assets.find(a => a.symbol === s)?.color || '#8B5CF6';
  const gd = (s) => assets.find(a => a.symbol === s)?.decimals || 2;
  const pnlC = summary.pnl >= 0 ? 'var(--green)' : 'var(--red)';

  const chartData = buildChartData(purchases, prices);
  const allocData = assets.filter(a => summary.by_asset[a.symbol]?.value > 0)
    .map(a => ({ name: a.symbol, value: summary.by_asset[a.symbol].value, color: a.color }));

  const cols = [
    { key: 'date', label: 'Data', sortable: true, render: v => formatDate(v) },
    { key: 'asset', label: 'Asset', render: v => <AssetBadge asset={v} color={gc(v)} /> },
    { key: 'amount_eur', label: 'Importo', align: 'right', sortable: true, render: v => formatEUR(v) },
    { key: 'quantity', label: 'Quantità', align: 'right', muted: true, render: (v, r) => formatQty(v, gd(r.asset)) },
    { key: 'price_eur', label: 'Prezzo', align: 'right', muted: true, render: v => formatEUR(v) },
  ];

  const recent = [...purchases].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
  const assetCount = assets.filter(a => summary.by_asset[a.symbol]).length;

  return (
    <PageLayout title="Dashboard" username={user.username}>

      {/* Hero Stats */}
      <div className="hero-stats animate-in">
        <div className="hero-stat">
          <div className="hero-stat__label">Valore Totale</div>
          <div className="hero-stat__value" style={{ color: 'var(--text-1)' }}>{formatEUR(summary.total_value)}</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat__label">Profitto / Perdita</div>
          <div className="hero-stat__value" style={{ color: pnlC }}>{formatPnL(summary.pnl)}</div>
          <div className="hero-stat__sub">{formatPct(summary.pnl_pct)}</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat__label">Totale Investito</div>
          <div className="hero-stat__value" style={{ color: 'var(--text-2)' }}>{formatEUR(summary.total_invested)}</div>
          <div className="hero-stat__sub">{summary.n_purchases} acquisti</div>
        </div>
      </div>

      {/* Asset Cards */}
      <div className="asset-cards animate-in" style={{ gridTemplateColumns: `repeat(${Math.min(assetCount || 1, 4)}, 1fr)`, animationDelay: '0.05s' }}>
        {assets.map(asset => {
          const d = summary.by_asset[asset.symbol];
          if (!d) return null;
          const pi = prices[asset.symbol] || {};
          const price = asset.asset_type === 'crypto' ? formatUSD(pi.usd || pi.eur || 0) : formatEUR(pi.eur || 0);
          const pc = d.pnl >= 0 ? 'var(--green)' : 'var(--red)';
          return (
            <div key={asset.symbol} className="asset-card">
              <div className="asset-card__header">
                <AssetBadge asset={asset.symbol} color={asset.color} />
                <span style={{ fontSize: 11, color: pc, fontWeight: 500 }}>{formatPnL(d.pnl)}</span>
              </div>
              <div className="asset-card__price">{price}</div>
              <div className="asset-card__detail">
                {formatQty(d.qty, asset.decimals)} · Inv. {formatEUR(d.invested)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid-2col section-gap animate-in" style={{ animationDelay: '0.1s' }}>
        <div className="card">
          <h3 className="card__title">Portfolio — 30 giorni</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                <XAxis dataKey="date" stroke="transparent" tick={{ fill: '#4e4968', fontSize: 10 }} />
                <YAxis stroke="transparent" tick={{ fill: '#4e4968', fontSize: 10 }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={1.5} fill="url(#ag)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="no-data">Nessun dato</div>}
        </div>

        <div className="card">
          <h3 className="card__title">Allocazione</h3>
          {allocData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={allocData} cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {allocData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                {allocData.map(it => (
                  <div key={it.name} className="chart-legend__item">
                    <div className="chart-legend__dot" style={{ background: it.color }} />
                    <span className="chart-legend__text">
                      {it.name} {summary.total_value > 0 ? (it.value / summary.total_value * 100).toFixed(1) : '0'}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="no-data">Nessun asset</div>}
        </div>
      </div>

      {/* Recent */}
      <div className="card overflow-auto animate-in" style={{ animationDelay: '0.15s' }}>
        <h3 className="card__title">Ultimi acquisti</h3>
        <DataTable columns={cols} data={recent} defaultSort={{ key: 'date', direction: 'desc' }} />
      </div>
    </PageLayout>
  );
}

function buildChartData(purchases, prices) {
  if (!purchases?.length) return [];
  const sorted = [...purchases].sort((a, b) => new Date(a.date) - new Date(b.date));
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const past = sorted.filter(p => p.date <= ds);
    const qty = {};
    past.forEach(p => { qty[p.asset] = (qty[p.asset] || 0) + p.quantity; });
    let v = 0;
    for (const [s, q] of Object.entries(qty)) v += q * ((prices[s] || {}).eur || 0);
    days.push({ date: ds, value: Math.round(v) });
  }
  return days;
}
