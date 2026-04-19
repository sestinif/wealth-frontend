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
  const [cacheAge, setCacheAge] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Progressive disclosure
  const [showDetails, setShowDetails] = useState(false);
  const [showMarket, setShowMarket] = useState(false);
  const [showCharts, setShowCharts] = useState(false);

  const refresh = async () => {
    try {
      const [d, u, a, s] = await Promise.all([api.getDashboard(), api.getMe(), api.getAssets(), api.getPricesStatus().catch(() => ({}))]);
      setData(d); setUser(u); setAssets(a);
      setCacheAge(s?.cache_age_seconds);
      api.getMarketInfo().then(setMarketInfo).catch(() => {});
    } catch (err) {}
  };

  const forceRefresh = async () => {
    setRefreshing(true);
    try { await api.refreshPrices(); await refresh(); toast('Prezzi aggiornati', 'success'); }
    catch (err) { toast('Errore: ' + err.message, 'error'); }
    finally { setRefreshing(false); }
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
    } catch (err) { toast('Errore: ' + err.message, 'error'); }
  };

  if (loading) return <div className="loading-screen"><div className="loading-logo">W</div><div className="loading-text">CARICAMENTO...</div></div>;
  if (!data || !user) return <div className="loading-screen"><div className="loading-error">Errore nel caricamento</div></div>;

  const { summary, prices, purchases } = data;
  const gc = (s) => assets.find(a => a.symbol === s)?.color || '#8B5CF6';
  const gd = (s) => assets.find(a => a.symbol === s)?.decimals || 2;
  const pnlC = summary.pnl >= 0 ? 'var(--green)' : 'var(--red)';

  const mainAssets = assets.filter(a => summary.by_asset[a.symbol]?.include_in_totals !== false && summary.by_asset[a.symbol]);
  const specAssets = assets.filter(a => summary.by_asset[a.symbol]?.include_in_totals === false && summary.by_asset[a.symbol]);

  // EUR→USD rate from any crypto that has both prices
  const eurUsdRate = (() => {
    for (const sym of Object.keys(prices)) {
      const p = prices[sym];
      if (p?.eur > 0 && p?.usd > 0) return p.usd / p.eur;
    }
    return null;
  })();

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';
  const performers = mainAssets
    .map(a => ({ symbol: a.symbol, pnl_pct: summary.by_asset[a.symbol].invested > 0 ? ((summary.by_asset[a.symbol].value / summary.by_asset[a.symbol].invested - 1) * 100) : 0 }))
    .sort((a, b) => b.pnl_pct - a.pnl_pct);
  const best = performers[0];

  // Charts data
  const chartData = buildChartData(purchases, prices, assets, 'main');
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

  return (
    <PageLayout title="Dashboard" username={user.username}>

      {/* === HERO SECTION === */}
      <div className="animate-in" style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4, letterSpacing: '-0.3px' }}>
          {greeting}, {user.username}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
          {best && best.pnl_pct > 0
            ? <><span style={{ color: 'var(--text-1)' }}>{best.symbol}</span> è il tuo asset migliore con <span style={{ color: 'var(--green)' }}>+{best.pnl_pct.toFixed(1)}%</span> di rendimento</>
            : `${summary.n_purchases} acquisti nel tuo portfolio`}
        </div>
      </div>

      <div className="hero-stats animate-in-1">
        <div className="hero-stat">
          <div className="hero-stat__label"><span className="live-dot" />Valore Portfolio</div>
          <AnimatedNumber value={summary.total_value} prefix="€ " className="hero-stat__value" style={{ color: 'var(--text-1)' }} />
          {summary.spec_value > 0 && (
            <div className="hero-stat__sub">+ € {summary.spec_value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} speculativo</div>
          )}
        </div>
        <div className="hero-stat">
          <div className="hero-stat__label">Profitto / Perdita</div>
          <AnimatedNumber value={Math.abs(summary.pnl)} prefix={summary.pnl >= 0 ? '+€ ' : '-€ '} className="hero-stat__value" style={{ color: pnlC }} />
          <div className="hero-stat__sub" style={{ color: pnlC, opacity: 0.9 }}>{formatPct(summary.pnl_pct)}</div>
        </div>
        <div className="hero-stat">
          <div className="hero-stat__label">Totale Investito</div>
          <AnimatedNumber value={summary.total_invested} prefix="€ " className="hero-stat__value" style={{ color: 'var(--text-2)' }} />
          <div className="hero-stat__sub">{summary.n_purchases} acquisti totali</div>
        </div>
      </div>

      {/* === COMPACT ASSET STRIP (always visible) === */}
      <div className="animate-in-2">
        <div className="section-header">
          <div className="section-header__title">
            Portfolio Principale · {mainAssets.length} asset
          </div>
          <div className="section-header__actions">
            <button className={`collapse-btn ${showDetails ? 'expanded' : ''}`} onClick={() => setShowDetails(!showDetails)}>
              {showDetails ? 'Nascondi dettagli' : 'Mostra dettagli'}
              <span className="collapse-btn__arrow">▼</span>
            </button>
          </div>
        </div>

        {!showDetails ? (
          // COMPACT VIEW — 1 row per asset
          <div className="asset-strip">
            {[...mainAssets, ...specAssets].map(asset => {
              const d = summary.by_asset[asset.symbol];
              if (!d) return null;
              const pi = prices[asset.symbol] || {};
              const mi = marketInfo[asset.symbol] || {};
              const isCrypto = asset.asset_type === 'crypto' || asset.asset_type === 'dex_token';
              const priceMain = isCrypto ? formatPrice(pi.usd || pi.eur || 0, 'USD') : formatPrice(pi.eur || 0, 'EUR');
              const priceEur = isCrypto && pi.eur > 0 ? formatPrice(pi.eur, 'EUR') : null;
              const priceUsdForStock = !isCrypto && pi.eur > 0 && eurUsdRate ? formatPrice(pi.eur * eurUsdRate, 'USD') : null;
              const included = d.include_in_totals !== false;
              const pc = d.pnl >= 0 ? 'var(--green)' : 'var(--red-soft)';
              const ch24 = mi.change_24h || 0;
              const ch24Color = ch24 >= 0 ? 'var(--green)' : 'var(--red-soft)';
              return (
                <div key={asset.symbol} className="asset-strip__row" style={{ opacity: included ? 1 : 0.55 }}>
                  <div className="asset-strip__cell">
                    <AssetBadge asset={asset.symbol} color={asset.color} />
                  </div>
                  <div className="asset-strip__cell">
                    <div className="asset-strip__price-main">{priceMain}</div>
                    {priceEur && <div className="asset-strip__price-sub">≈ {priceEur}</div>}
                    {priceUsdForStock && <div className="asset-strip__price-sub">≈ {priceUsdForStock}</div>}
                  </div>
                  <div className="asset-strip__cell asset-strip__cell--right">
                    <div className="asset-strip__primary" style={{ color: ch24Color }}>
                      {ch24 !== 0 ? (ch24 >= 0 ? '+' : '') + ch24.toFixed(2) + '%' : '—'}
                    </div>
                    <div className="asset-strip__secondary">24h</div>
                  </div>
                  <div className="asset-strip__cell asset-strip__cell--right">
                    <div className="asset-strip__primary">{formatEUR(d.value)}</div>
                    <div className="asset-strip__secondary">{formatQty(d.qty, asset.decimals)} {asset.symbol}</div>
                  </div>
                  <div className="asset-strip__cell asset-strip__cell--right">
                    <div className="asset-strip__primary" style={{ color: pc }}>{formatPnL(d.pnl)}</div>
                    <div className="asset-strip__secondary" style={{ color: pc }}>
                      {d.invested > 0 ? ((d.value / d.invested - 1) * 100).toFixed(2) + '%' : '—'}
                    </div>
                  </div>
                  <div className="asset-strip__cell asset-strip__cell--right">
                    <label className="toggle" title={included ? 'Escluso dai totali' : 'Incluso nei totali'}>
                      <input type="checkbox" checked={included} onChange={() => handleToggleTracking(asset.symbol, included)} />
                      <span className="toggle__slider" />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // DETAILED VIEW — cards with all info
          <>
            {mainAssets.length > 0 && (
              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: `repeat(${Math.min(mainAssets.length, 4)}, 1fr)`, marginBottom: 16 }}>
                {mainAssets.map(asset => renderAssetCard(asset, summary, prices, marketInfo, handleToggleTracking, true, eurUsdRate))}
              </div>
            )}
            {specAssets.length > 0 && (
              <>
                <div className="section-header" style={{ marginTop: 20 }}>
                  <div className="section-header__title">Speculativo · Non incluso</div>
                  <div className="section-header__meta">
                    Valore <span style={{ color: 'var(--text-1)' }}>{formatEUR(summary.spec_value)}</span>
                    <span style={{ marginLeft: 10, color: summary.spec_pnl >= 0 ? 'var(--green)' : 'var(--red-soft)' }}>
                      {formatPnL(summary.spec_pnl)} ({formatPct(summary.spec_pnl_pct)})
                    </span>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: `repeat(${Math.min(specAssets.length, 4)}, 1fr)` }}>
                  {specAssets.map(asset => renderAssetCard(asset, summary, prices, marketInfo, handleToggleTracking, false, eurUsdRate))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="divider-subtle" />

      {/* === MARKET OVERVIEW (collapsed by default) === */}
      <div className="animate-in-3" style={{ marginBottom: 16 }}>
        <div className="section-header">
          <div className="section-header__title">Panoramica Mercato</div>
          <button className={`collapse-btn ${showMarket ? 'expanded' : ''}`} onClick={() => setShowMarket(!showMarket)}>
            {showMarket ? 'Nascondi' : 'Mostra'}
            <span className="collapse-btn__arrow">▼</span>
          </button>
        </div>
        {showMarket && (
          <div className="card overflow-auto" style={{ padding: 0 }}>
            {Object.keys(marketInfo).length > 0 ? (
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
                    const isCrypto = asset.asset_type === 'crypto' || asset.asset_type === 'dex_token';
                    return (
                      <tr key={asset.symbol}>
                        <td><AssetBadge asset={asset.symbol} color={asset.color} /></td>
                        <td className="text-right">{isCrypto ? formatPrice(pi.usd || 0, 'USD') : formatPrice(pi.eur || 0, 'EUR')}</td>
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
            ) : (
              <div style={{ padding: 20, fontSize: 12, color: 'var(--text-3)' }}><span className="live-dot" /> Caricamento dati...</div>
            )}
          </div>
        )}
      </div>

      {/* === CHARTS (collapsed by default) === */}
      <div style={{ marginBottom: 16 }}>
        <div className="section-header">
          <div className="section-header__title">Grafici & Analytics</div>
          <button className={`collapse-btn ${showCharts ? 'expanded' : ''}`} onClick={() => setShowCharts(!showCharts)}>
            {showCharts ? 'Nascondi' : 'Mostra'}
            <span className="collapse-btn__arrow">▼</span>
          </button>
        </div>
        {showCharts && (
          <>
            <div className="grid-2col section-gap">
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

            <div className="card overflow-auto">
              <h3 className="card__title">Ultimi acquisti</h3>
              <DataTable columns={recentColumns} data={recentPurchases} defaultSort={{ key: 'date', direction: 'desc' }} />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '20px 0 8px', fontSize: 10, color: 'var(--text-3)' }}>
        <span>Prezzi {cacheAge != null ? `aggiornati ${Math.round(cacheAge / 60)} min fa` : 'in caricamento'}</span>
        <button onClick={forceRefresh} disabled={refreshing} className="btn btn--ghost btn--sm" style={{ fontSize: 10, padding: '3px 10px' }}>
          {refreshing ? 'Aggiornamento...' : '↻ Aggiorna ora'}
        </button>
      </div>
    </PageLayout>
  );
}

function renderAssetCard(asset, summary, prices, marketInfo, onToggle, included, eurUsdRate) {
  const d = summary.by_asset[asset.symbol];
  if (!d) return null;
  const pi = prices[asset.symbol] || {};
  const mi = marketInfo[asset.symbol] || {};
  const isCrypto = asset.asset_type === 'crypto' || asset.asset_type === 'dex_token';
  const price = isCrypto ? formatPrice(pi.usd || pi.eur || 0, 'USD') : formatPrice(pi.eur || 0, 'EUR');
  const secondaryPrice = isCrypto && pi.eur > 0 && pi.usd > 0
    ? formatPrice(pi.eur, 'EUR')
    : !isCrypto && pi.eur > 0 && eurUsdRate
      ? formatPrice(pi.eur * eurUsdRate, 'USD')
      : null;
  const pc = d.pnl >= 0 ? 'var(--green)' : 'var(--red)';
  const ch24 = mi.change_24h || 0;
  const ch24Color = ch24 >= 0 ? 'var(--green)' : 'var(--red-soft)';

  return (
    <div key={asset.symbol} className="asset-card" style={{ opacity: included ? 1 : 0.82 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <AssetBadge asset={asset.symbol} color={asset.color} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: pc, fontWeight: 500, fontFamily: 'var(--font-num)' }}>{formatPnL(d.pnl)}</div>
            {ch24 !== 0 && <div style={{ fontSize: 9, color: ch24Color, fontFamily: 'var(--font-num)' }}>{ch24 >= 0 ? '+' : ''}{ch24}% 24h</div>}
          </div>
          <label className="toggle" title={included ? 'Escluso' : 'Incluso'}>
            <input type="checkbox" checked={included} onChange={() => onToggle(asset.symbol, included)} />
            <span className="toggle__slider" />
          </label>
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-1)', fontFamily: 'var(--font-num)', letterSpacing: '-0.3px' }}>{price}</div>
          {secondaryPrice && (
            <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-num)' }}>≈ {secondaryPrice}</span>
          )}
        </div>
        {(mi.ath_usd > 0 || mi.ath_eur > 0) && (
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-num)', opacity: 0.5, marginTop: 2 }}>
            ATH {mi.ath_usd > 0 ? formatPrice(mi.ath_usd, 'USD') : formatPrice(mi.ath_eur, 'EUR')}
          </div>
        )}
      </div>
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
      const a = assetMap[symbol];
      if (mode === 'main' && a && a.include_in_totals === false) continue;
      const priceInfo = prices[symbol] || {};
      totalValue += q * (priceInfo.eur || 0);
    }
    days.push({ date: ds, value: Math.round(totalValue) });
  }
  return days;
}
