import React, { useState, useEffect } from 'react';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import PageLayout from '../components/PageLayout';
import DataTable from '../components/DataTable';
import AssetBadge from '../components/AssetBadge';
import AnimatedNumber from '../components/AnimatedNumber';
import { useToast } from '../components/Toast';
import { api } from '../api.js';
import { formatEUR, formatUSD, formatQty, formatPnL, formatPct, formatDate, formatPrice, TOOLTIP_STYLE } from '../utils/format';

export default function Dashboard() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [user, setUser] = useState(null);
  const [assets, setAssets] = useState([]);
  const [marketInfo, setMarketInfo] = useState({});
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const [d, u, a] = await Promise.all([api.getDashboard(), api.getMe(), api.getAssets()]);
      setData(d); setUser(u); setAssets(a);
      api.getMarketInfo().then(setMarketInfo).catch(() => {});
    } catch (err) {}
  };

  useEffect(() => {
    const init = async () => { await refresh(); setLoading(false); };
    init();
    const iv = setInterval(refresh, 60000);
    return () => clearInterval(iv);
  }, []);

  const handleToggleTracking = async (symbol, currentValue) => {
    try {
      await api.updateAssetTracking(symbol, !currentValue);
      await refresh();
      toast(`${symbol} ${!currentValue ? 'incluso nei totali' : 'escluso dai totali'}`, 'success');
    } catch (err) {
      toast('Errore: ' + err.message, 'error');
    }
  };

  if (loading) return <div className="loading-screen"><div className="loading-logo">W</div><div className="loading-text">CARICAMENTO...</div></div>;
  if (!data || !user) return <div className="loading-screen"><div className="loading-error">Errore nel caricamento</div></div>;

  const { summary, prices, purchases } = data;
  const gc = (s) => assets.find(a => a.symbol === s)?.color || '#8B5CF6';
  const gd = (s) => assets.find(a => a.symbol === s)?.decimals || 2;
  const pnlC = summary.pnl >= 0 ? 'var(--green)' : 'var(--red)';

  const chartData = buildChartData(purchases, prices, assets, 'main');
  const mainAssets = assets.filter(a => summary.by_asset[a.symbol]?.include_in_totals !== false && summary.by_asset[a.symbol]);
  const specAssets = assets.filter(a => summary.by_asset[a.symbol]?.include_in_totals === false && summary.by_asset[a.symbol]);

  const allocData = mainAssets
    .filter(a => summary.by_asset[a.symbol]?.value > 0)
    .map(a => ({ name: a.symbol, value: summary.by_asset[a.symbol].value, color: a.color }));

  const recentColumns = [
    { key: 'date', label: 'Data', sortable: true, render: v => formatDate(v) },
    { key: 'asset', label: 'Asset', render: v => <AssetBadge asset={v} color={gc(v)} /> },
    { key: 'amount_eur', label: 'Importo', align: 'right', sortable: true, render: v => formatEUR(v) },
    { key: 'quantity', label: 'Quantità', align: 'right', muted: true, render: (v, row) => formatQty(v, gd(row.asset)) },
    { key: 'price_eur', label: 'Prezzo', align: 'right', muted: true, render: v => formatPrice(v, 'EUR') },
  ];

  const recentPurchases = [...purchases].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';
  const performers = mainAssets
    .map(a => ({ symbol: a.symbol, pnl_pct: summary.by_asset[a.symbol].invested > 0 ? ((summary.by_asset[a.symbol].value / summary.by_asset[a.symbol].invested - 1) * 100) : 0 }))
    .sort((a, b) => b.pnl_pct - a.pnl_pct);
  const best = performers[0];

  return (
    <PageLayout title="Dashboard" username={user.username}>

      {/* Greeting */}
      <div className="animate-in" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2, letterSpacing: '-0.2px' }}>
          {greeting}, {user.username}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
          {best && best.pnl_pct > 0
            ? `${best.symbol} è il tuo asset migliore con ${best.pnl_pct.toFixed(1)}% di rendimento`
            : `${summary.n_purchases} acquisti nel tuo portfolio`}
        </div>
      </div>

      {/* Hero Stats (main only) */}
      <div className="hero-stats animate-in-1">
        <div className="hero-stat">
          <div className="hero-stat__label"><span className="live-dot" />Valore Portfolio</div>
          <AnimatedNumber value={summary.total_value} prefix="€ " className="hero-stat__value" style={{ color: 'var(--text-1)' }} />
        </div>
        <div className="hero-stat">
          <div className="hero-stat__label">Profitto / Perdita</div>
          <AnimatedNumber value={Math.abs(summary.pnl)} prefix={summary.pnl >= 0 ? '+€ ' : '-€ '} className="hero-stat__value" style={{ color: pnlC }} />
          <div className="hero-stat__sub">{formatPct(summary.pnl_pct)}</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat__label">Totale Investito</div>
          <AnimatedNumber value={summary.total_invested} prefix="€ " className="hero-stat__value" style={{ color: 'var(--text-2)' }} />
          <div className="hero-stat__sub">{summary.n_purchases} acquisti</div>
        </div>
      </div>

      {/* Main Assets */}
      {mainAssets.length > 0 && (
        <div className="animate-in-2" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8, padding: '0 2px' }}>
            Portfolio Principale
          </div>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: `repeat(${Math.min(mainAssets.length, 4)}, 1fr)` }}>
            {mainAssets.map(asset => renderAssetCard(asset, summary, prices, marketInfo, handleToggleTracking, true))}
          </div>
        </div>
      )}

      {/* Speculative Assets */}
      {specAssets.length > 0 && (
        <div className="animate-in-3" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, padding: '0 2px' }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Speculativo · Non incluso nei totali
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-num)' }}>
              Valore: <span style={{ color: 'var(--text-1)' }}>{formatEUR(summary.spec_value)}</span>
              <span style={{ marginLeft: 10, color: summary.spec_pnl >= 0 ? 'var(--green)' : 'var(--red-soft)' }}>
                {formatPnL(summary.spec_pnl)} ({formatPct(summary.spec_pnl_pct)})
              </span>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: `repeat(${Math.min(specAssets.length, 4)}, 1fr)` }}>
            {specAssets.map(asset => renderAssetCard(asset, summary, prices, marketInfo, handleToggleTracking, false))}
          </div>
        </div>
      )}

      {/* Market Overview Table */}
      <div className="card section-gap animate-in-4">
        <h3 className="card__title">Panoramica Mercato</h3>
        {Object.keys(marketInfo).length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th className="text-right">Prezzo</th>
                  <th className="text-right">24h</th>
                  <th className="text-right">7g</th>
                  <th className="text-right">ATH</th>
                  <th className="text-right">Da ATH</th>
                  <th className="text-right">Market Cap</th>
                  <th className="text-right">Rank</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(asset => {
                  const mi = marketInfo[asset.symbol];
                  if (!mi) return null;
                  const pi = prices[asset.symbol] || {};
                  return (
                    <tr key={asset.symbol}>
                      <td><AssetBadge asset={asset.symbol} color={asset.color} /></td>
                      <td className="text-right">
                        {asset.asset_type === 'crypto' || asset.asset_type === 'dex_token' ? formatPrice(pi.usd || 0, 'USD') : formatPrice(pi.eur || 0, 'EUR')}
                      </td>
                      <td className="text-right" style={{ color: (mi.change_24h || 0) >= 0 ? 'var(--green)' : 'var(--red-soft)' }}>
                        {mi.change_24h >= 0 ? '+' : ''}{mi.change_24h || 0}%
                      </td>
                      <td className="text-right" style={{ color: (mi.change_7d || 0) >= 0 ? 'var(--green)' : 'var(--red-soft)' }}>
                        {mi.change_7d ? (mi.change_7d >= 0 ? '+' : '') + mi.change_7d + '%' : '—'}
                      </td>
                      <td className="text-right" style={{ color: 'var(--text-1)' }}>
                        {mi.ath_usd > 0 ? formatPrice(mi.ath_usd, 'USD') : mi.ath_eur > 0 ? formatPrice(mi.ath_eur, 'EUR') : '—'}
                      </td>
                      <td className="text-right" style={{ color: 'var(--red-soft)' }}>
                        {mi.ath_change_pct ? mi.ath_change_pct + '%' : '—'}
                      </td>
                      <td className="text-right">
                        {mi.market_cap_usd > 0 ? '$' + (mi.market_cap_usd >= 1e9 ? (mi.market_cap_usd / 1e9).toFixed(1) + 'B' : (mi.market_cap_usd / 1e6).toFixed(0) + 'M') : '—'}
                      </td>
                      <td className="text-right">{mi.rank > 0 ? '#' + mi.rank : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '12px 0' }}>
            <span className="live-dot" /> Caricamento dati di mercato...
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid-2col section-gap animate-in">
        <div className="card">
          <h3 className="card__title">Portfolio Principale — 30 giorni</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="transparent" tick={{ fill: '#4a4660', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis stroke="transparent" tick={{ fill: '#4a4660', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={1.5} fill="url(#dg)" />
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
                {allocData.map(item => (
                  <div key={item.name} className="chart-legend__item">
                    <div className="chart-legend__dot" style={{ background: item.color }} />
                    <span className="chart-legend__text">
                      {item.name} {summary.total_value > 0 ? (item.value / summary.total_value * 100).toFixed(1) : '0'}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="no-data">Nessun asset</div>}
        </div>
      </div>

      {/* Recent */}
      <div className="card overflow-auto animate-in">
        <h3 className="card__title">Ultimi acquisti</h3>
        <DataTable columns={recentColumns} data={recentPurchases} defaultSort={{ key: 'date', direction: 'desc' }} />
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '16px 0 8px', fontSize: 10, color: 'var(--text-3)' }}>
        Aggiornato alle {new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} · Refresh ogni 60s
      </div>
    </PageLayout>
  );
}

function renderAssetCard(asset, summary, prices, marketInfo, onToggle, included) {
  const d = summary.by_asset[asset.symbol];
  if (!d) return null;
  const pi = prices[asset.symbol] || {};
  const mi = marketInfo[asset.symbol] || {};
  const isCrypto = asset.asset_type === 'crypto' || asset.asset_type === 'dex_token';
  const price = isCrypto ? formatPrice(pi.usd || pi.eur || 0, 'USD') : formatPrice(pi.eur || 0, 'EUR');
  const pc = d.pnl >= 0 ? 'var(--green)' : 'var(--red)';
  const ch24 = mi.change_24h || 0;
  const ch24Color = ch24 >= 0 ? 'var(--green)' : 'var(--red-soft)';

  return (
    <div key={asset.symbol} className="asset-card" style={{ opacity: included ? 1 : 0.82, position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <AssetBadge asset={asset.symbol} color={asset.color} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: pc, fontWeight: 500, fontFamily: 'var(--font-num)' }}>{formatPnL(d.pnl)}</div>
            {ch24 !== 0 && <div style={{ fontSize: 9, color: ch24Color, fontFamily: 'var(--font-num)' }}>{ch24 >= 0 ? '+' : ''}{ch24}% 24h</div>}
          </div>
          <button
            onClick={() => onToggle(asset.symbol, included)}
            title={included ? 'Escludi dai totali' : 'Includi nei totali'}
            style={{
              width: 22, height: 22, padding: 0, border: '1px solid var(--border)',
              borderRadius: 5, background: 'transparent', cursor: 'pointer',
              color: included ? 'var(--accent-soft)' : 'var(--text-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
            }}>
            {included ? '●' : '○'}
          </button>
        </div>
      </div>

      {/* Price */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-1)', fontFamily: 'var(--font-num)', letterSpacing: '-0.3px' }}>{price}</div>
        {(mi.ath_usd > 0 || mi.ath_eur > 0) && (
          <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-num)', opacity: 0.5 }}>
            ATH {mi.ath_usd > 0 ? formatPrice(mi.ath_usd, 'USD') : formatPrice(mi.ath_eur, 'EUR')}
          </span>
        )}
      </div>

      {/* 2-row compact stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 6, columnGap: 12, fontSize: 11 }}>
        <div>
          <div style={{ color: 'var(--text-3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 1 }}>Quantità</div>
          <div style={{ color: 'var(--text-1)', fontFamily: 'var(--font-num)' }}>{formatQty(d.qty, asset.decimals)}</div>
        </div>
        <div>
          <div style={{ color: 'var(--text-3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 1 }}>Investito</div>
          <div style={{ color: 'var(--text-1)', fontFamily: 'var(--font-num)' }}>{formatEUR(d.invested)}</div>
        </div>
        <div>
          <div style={{ color: 'var(--text-3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 1 }}>DCA</div>
          <div style={{ color: 'var(--text-2)', fontFamily: 'var(--font-num)' }}>
            {isCrypto ? formatPrice(d.avg_price_usd || d.avg_price || 0, 'USD') : formatPrice(d.avg_price || 0, 'EUR')}
          </div>
        </div>
        <div>
          <div style={{ color: 'var(--text-3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 1 }}>Valore</div>
          <div style={{ color: 'var(--text-1)', fontFamily: 'var(--font-num)' }}>{formatEUR(d.value)}</div>
        </div>
      </div>
    </div>
  );
}

function buildChartData(purchases, prices, assets, mode) {
  if (!purchases?.length) return [];
  // mode 'main' = only assets with include_in_totals != false
  const assetMap = Object.fromEntries(assets.map(a => [a.symbol, a]));
  const sorted = [...purchases].sort((a, b) => new Date(a.date) - new Date(b.date));
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const past = sorted.filter(p => p.date <= ds);
    const qty = {};
    past.forEach(p => { qty[p.asset] = (qty[p.asset] || 0) + p.quantity; });
    let totalValue = 0;
    for (const [symbol, q] of Object.entries(qty)) {
      // Skip speculative assets if mode is 'main' - fallback: include all if asset not tracked
      const a = assetMap[symbol];
      if (mode === 'main' && a && a.include_in_totals === false) continue;
      const priceInfo = prices[symbol] || {};
      totalValue += q * (priceInfo.eur || 0);
    }
    days.push({ date: ds, value: Math.round(totalValue) });
  }
  return days;
}
