import React, { useState, useEffect } from 'react';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PageLayout from '../components/PageLayout';
import KPICard from '../components/KPICard';
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
        const [dashboardData, userData, assetsData] = await Promise.all([
          api.getDashboard(), api.getMe(), api.getAssets()
        ]);
        setData(dashboardData);
        setUser(userData);
        setAssets(assetsData);
      } catch (err) { /* handled by loading state */ }
      finally { setLoading(false); }
    };
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="loading-screen"><div className="loading-logo">W</div><div className="loading-text">CARICAMENTO...</div></div>;
  if (!data || !user) return <div className="loading-screen"><div className="loading-error">Errore nel caricamento</div></div>;

  const { summary, prices, purchases } = data;
  const getColor = (sym) => assets.find(a => a.symbol === sym)?.color || '#8B5CF6';
  const getDecimals = (sym) => assets.find(a => a.symbol === sym)?.decimals || 2;

  const chartData = buildChartData(purchases, prices);

  // Dynamic allocation data
  const allocData = assets
    .filter(a => summary.by_asset[a.symbol]?.value > 0)
    .map(a => ({ name: a.symbol, value: summary.by_asset[a.symbol].value, color: a.color }));

  const recentColumns = [
    { key: 'date', label: 'Data', sortable: true, render: v => formatDate(v) },
    { key: 'asset', label: 'Asset', render: (v) => <AssetBadge asset={v} color={getColor(v)} /> },
    { key: 'amount_eur', label: 'Importo', align: 'right', sortable: true, render: v => formatEUR(v) },
    { key: 'quantity', label: 'Quantità', align: 'right', muted: true, render: (v, row) => formatQty(v, getDecimals(row.asset)) },
    { key: 'price_eur', label: 'Prezzo', align: 'right', muted: true, render: v => formatEUR(v) },
  ];

  const recentPurchases = [...purchases].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  return (
    <PageLayout title="Dashboard" username={user.username}>
      <div className="kpi-grid">
        <KPICard label="Valore Totale" value={formatEUR(summary.total_value)} color={['#8B5CF6', '#C026D3']} />
        <KPICard label="Profitto/Perdita" value={formatPnL(summary.pnl)} color={summary.pnl >= 0 ? ['#00E676', '#00C853'] : ['#FF5252', '#D32F2F']} subtext={formatPct(summary.pnl_pct)} />
        <KPICard label="Investito Totale" value={formatEUR(summary.total_invested)} color={['#8B85A8', '#6B63B5']} subtext={`${summary.n_purchases} acquisti`} />

        {/* Dynamic per-asset KPI cards */}
        {assets.map(asset => {
          const assetData = summary.by_asset[asset.symbol];
          if (!assetData) return null;
          const priceInfo = prices[asset.symbol] || {};
          const displayPrice = asset.asset_type === 'crypto'
            ? formatUSD(priceInfo.usd || 0)
            : formatEUR(priceInfo.eur || 0);
          return (
            <KPICard
              key={asset.symbol}
              label={`${asset.symbol} Prezzo`}
              value={displayPrice}
              color={[asset.color, asset.color]}
              subtext={`Qty: ${formatQty(assetData.qty, asset.decimals)}`}
            />
          );
        })}
      </div>

      <div className="grid-2col section-gap">
        <div className="card">
          <h3 className="card__title">Valore Portfolio — 30 Giorni</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="dashGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#C026D3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)" />
              <XAxis dataKey="date" stroke="#8B85A8" style={{ fontSize: '10px' }} />
              <YAxis stroke="#8B85A8" style={{ fontSize: '10px' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#dashGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 className="card__title" style={{ alignSelf: 'flex-start' }}>Allocazione Asset</h3>
          {allocData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={allocData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                    {allocData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="chart-legend">
                {allocData.map(item => (
                  <div key={item.name} className="chart-legend__item">
                    <div className="chart-legend__dot" style={{ background: item.color }} />
                    <span className="chart-legend__text">
                      {item.name}: {summary.total_value > 0 ? (item.value / summary.total_value * 100).toFixed(1) : '0.0'}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="no-data">Nessun asset con valore</div>
          )}
        </div>
      </div>

      <div className="card overflow-auto">
        <h3 className="card__title">Ultimi Acquisti</h3>
        <DataTable columns={recentColumns} data={recentPurchases} defaultSort={{ key: 'date', direction: 'desc' }} />
      </div>
    </PageLayout>
  );
}

function buildChartData(purchases, prices) {
  if (!purchases || purchases.length === 0) return [];
  const sorted = [...purchases].sort((a, b) => new Date(a.date) - new Date(b.date));
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const past = sorted.filter(p => p.date <= dateStr);
    const qtyByAsset = {};
    past.forEach(p => { qtyByAsset[p.asset] = (qtyByAsset[p.asset] || 0) + p.quantity; });
    let totalValue = 0;
    for (const [symbol, qty] of Object.entries(qtyByAsset)) {
      const priceInfo = prices[symbol] || {};
      totalValue += qty * (priceInfo.eur || 0);
    }
    days.push({ date: dateStr, value: Math.round(totalValue) });
  }
  return days;
}
