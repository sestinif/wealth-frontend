import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import PageLayout from '../components/PageLayout';
import DataTable from '../components/DataTable';
import AssetBadge from '../components/AssetBadge';
import AnimatedNumber from '../components/AnimatedNumber';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';
import { DashboardSkeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { api } from '../api.js';
import { getDisplayName } from '../utils/user';
import { formatEUR, formatUSD, formatQty, formatPnL, formatPct, formatDate, formatPrice, TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE, CHART_GRID, allocationSlices, yEur } from '../utils/format';

export default function Dashboard() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [networth, setNetworth] = useState(null);
  const [cashPositions, setCashPositions] = useState([]);
  const [history, setHistory] = useState([]);
  const [chartPeriod, setChartPeriod] = useState('1M');
  const snapshotDone = useRef(false);
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
  const [displayCurrency, setDisplayCurrency] = useState('EUR');

  const refresh = async () => {
    try {
      const [d, u, a, s, nw, cp] = await Promise.all([
        api.getDashboard(), api.getMe(), api.getAssets(),
        api.getPricesStatus().catch(() => ({})),
        api.getNetWorth().catch(() => null),
        api.getCashPositions().catch(() => []),
      ]);
      setData(d); setUser(u); setAssets(a); setNetworth(nw); setCashPositions(cp || []);
      setCacheAge(s?.cache_age_seconds);
      api.getMarketInfo().then(setMarketInfo).catch(() => {});
      api.getNetworthHistory().then(h => setHistory(h || [])).catch(() => {});

      // Record today's net-worth snapshot once per load (backend upserts per day).
      if (!snapshotDone.current) {
        snapshotDone.current = true;
        try {
          const fig = computeNetFigures(d, a, nw, cp);
          await api.postNetworthSnapshot(fig);
          api.getNetworthHistory().then(h => setHistory(h || [])).catch(() => {});
        } catch (e) { /* best-effort */ }
      }
    } catch (err) {}
  };

  const forceRefresh = async () => {
    setRefreshing(true);
    try { await api.refreshPrices(); await refresh(); toast('Prices updated', 'success'); }
    catch (err) { toast('Error: ' + err.message, 'error'); }
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
      toast(`${symbol} ${!currentValue ? 'included in totals' : 'excluded from totals'}`, 'success');
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  };

  if (loading) return <PageLayout title="Dashboard" username=""><DashboardSkeleton /></PageLayout>;
  if (!data || !user) return <div className="loading-screen"><div className="loading-error">Failed to load</div></div>;

  const { summary, prices, purchases } = data;
  const gc = (s) => assets.find(a => a.symbol === s)?.color || '#8B7BFF';
  const gd = (s) => assets.find(a => a.symbol === s)?.decimals || 2;

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
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const performers = mainAssets
    .map(a => ({ symbol: a.symbol, pnl_pct: summary.by_asset[a.symbol].invested > 0 ? ((summary.by_asset[a.symbol].value / summary.by_asset[a.symbol].invested - 1) * 100) : 0 }))
    .sort((a, b) => b.pnl_pct - a.pnl_pct);
  const best = performers[0];

  // Charts data
  const chartData = buildChartData(purchases, prices, assets, 'main');
  const allocData = allocationSlices(
    mainAssets
      .filter(a => summary.by_asset[a.symbol]?.value > 0)
      .map(a => ({ name: a.symbol, value: summary.by_asset[a.symbol].value }))
  );

  // Hero portfolio trend (30d) — derived from the real time-series
  const valueSeries = chartData.map(d => d.value);
  const pfFirst = valueSeries.find(v => v > 0) || valueSeries[0] || 0;
  const pfLast = valueSeries[valueSeries.length - 1] || 0;
  const pfChange = pfFirst > 0 ? ((pfLast - pfFirst) / pfFirst * 100) : 0;
  const pfUp = pfChange >= 0;

  const recentColumns = [
    { key: 'date', label: 'Date', sortable: true, render: v => formatDate(v) },
    { key: 'asset', label: 'Asset', render: v => <AssetBadge asset={v} color={gc(v)} /> },
    { key: 'amount_eur', label: 'Amount', align: 'right', sortable: true, render: v => formatEUR(v) },
    { key: 'quantity', label: 'Quantity', align: 'right', muted: true, render: (v, row) => formatQty(v, gd(row.asset)) },
    { key: 'price_eur', label: 'Price', align: 'right', muted: true, render: v => formatPrice(v, 'EUR') },
  ];
  const recentPurchases = [...purchases].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  return (
    <PageLayout title="Dashboard" username={user.username}>

      {refreshing && <div className="top-progress"><div className="top-progress__bar" /></div>}

      {/* === HERO + TREND + KPI + ALLOCATION/ASSETS (clean mockup layout) === */}
      {(() => {
        const isUsd = displayCurrency === 'USD' && eurUsdRate;
        const rate = isUsd ? eurUsdRate : 1;
        const symPre = isUsd ? '$' : '';   // USD symbol before
        const symSuf = isUsd ? '' : '€';   // EUR symbol after (IT convention)
        const money = (v) => isUsd ? formatUSD(v * rate) : formatEUR(v);

        // --- Net worth split: invested (portfolio) + cash (read-only bank balances) ---
        // All figures normalized to EUR here; money() re-applies the USD rate for display.
        // Mercury returns balances in their own currency (often USD), so convert to EUR
        // using the same eurUsdRate the rest of the app already derives.
        const externalAccounts = networth?.external_accounts || [];
        const cashEur = externalAccounts.reduce((s, acc) => {
          const cur = (acc.currency || 'EUR').toUpperCase();
          const bal = Number(acc.balance) || 0;
          if (cur === 'EUR') return s + bal;
          if (cur === 'USD' && eurUsdRate) return s + bal / eurUsdRate;
          return s + bal; // unknown currency: best-effort, count at face value
        }, 0);

        // Invested split by market: crypto (incl. dex tokens) vs stock/ETF.
        const cryptoAssets = mainAssets.filter(a => a.asset_type === 'crypto' || a.asset_type === 'dex_token');
        const stockAssets = mainAssets.filter(a => a.asset_type === 'stock_etf');
        const valOf = (a) => summary.by_asset[a.symbol]?.value || 0;
        const cryptoEur = cryptoAssets.reduce((s, a) => s + valOf(a), 0);
        const stockEur = stockAssets.reduce((s, a) => s + valOf(a), 0);

        // Dry powder — uninvested broker cash. Each position carries its own currency;
        // convert USD positions to EUR with the same rate used everywhere else.
        const dryPowderEur = (cashPositions || []).reduce((s, p) => {
          const bal = Number(p.amount_eur) || 0;
          const cur = (p.currency || 'EUR').toUpperCase();
          if (cur === 'USD' && eurUsdRate) return s + bal / eurUsdRate;
          return s + bal;
        }, 0);

        const totalEur = cryptoEur + stockEur + cashEur + dryPowderEur;
        const pctOf = (v) => totalEur > 0 ? (v / totalEur) * 100 : 0;
        const cryptoPct = pctOf(cryptoEur);
        const stockPct = pctOf(stockEur);
        const cashPct = pctOf(cashEur);
        const dryPct = pctOf(dryPowderEur);
        const cashConnected = externalAccounts.length > 0;
        const nBrokers = (cashPositions || []).length;

        // Breakdown card config — order, color, count, meta. Driven so the markup stays flat.
        const breakdown = [
          { key: 'crypto', label: 'Crypto Market', color: 'var(--accent)', value: cryptoEur, pct: cryptoPct, meta: `${cryptoPct.toFixed(0)}% · ${cryptoAssets.length} assets` },
          { key: 'stock', label: 'Stock Market', color: 'var(--stock)', value: stockEur, pct: stockPct, meta: `${stockPct.toFixed(0)}% · ${stockAssets.length} assets` },
          { key: 'cash', label: 'Cash', color: 'var(--cash)', value: cashEur, pct: cashPct, empty: 'No Account Connected',
            meta: cashConnected ? `${cashPct.toFixed(0)}% · ${externalAccounts.length === 1 ? externalAccounts[0].name : `${externalAccounts.length} accounts`}` : null },
          { key: 'dry', label: 'Dry Powder', color: 'var(--dry)', value: dryPowderEur, pct: dryPct, empty: 'No Uninvested Cash',
            meta: nBrokers > 0 ? `${dryPct.toFixed(0)}% · ${nBrokers} ${nBrokers === 1 ? 'broker' : 'brokers'}` : null },
        ];

        // Real 30d delta from the portfolio time-series (same source as the chart)
        const deltaAbs = pfLast - pfFirst;
        const deltaStr = (deltaAbs >= 0 ? '+' : '-') + money(Math.abs(deltaAbs));

        // Top allocation slices (real data, already sorted desc with palette colors)
        const topAlloc = allocData.slice(0, 6);
        // Color lookup by symbol from the allocation palette (consistent dots)
        const allocColor = Object.fromEntries(allocData.map(s => [s.name, s.color]));

        // Top assets by value (real data) — reuse allocation colors for dots
        const topAssets = mainAssets
          .filter(a => summary.by_asset[a.symbol]?.value > 0)
          .sort((a, b) => summary.by_asset[b.symbol].value - summary.by_asset[a.symbol].value)
          .slice(0, 6);

        return (
          <>
            {/* greeting + currency toggle (kept) */}
            <div className="animate-in hero-greeting">
              <div>
                <div className="hero-greeting__title">{greeting}, {getDisplayName(user.username)}</div>
                <div className="hero-greeting__sub">
                  {best && best.pnl_pct > 0
                    ? <><span style={{ color: 'var(--text-1)' }}>{best.symbol}</span> is your top performer at <span style={{ color: 'var(--green)' }}>+{best.pnl_pct.toFixed(1)}%</span></>
                    : `${summary.n_purchases} purchases in your portfolio`}
                </div>
              </div>
              <div className="currency-toggle" title={eurUsdRate ? `1 € = ${eurUsdRate.toFixed(4)} $` : 'Tasso non disponibile'}>
                {['EUR', 'USD'].map(c => (
                  <button
                    key={c} type="button"
                    className={`currency-toggle__btn ${displayCurrency === c ? 'active' : ''}`}
                    onClick={() => setDisplayCurrency(c)}
                    disabled={c === 'USD' && !eurUsdRate}
                  >
                    {c === 'EUR' ? '€ EUR' : '$ USD'}
                  </button>
                ))}
              </div>
            </div>

            {/* 1. NET WORTH COMMAND CENTER — total + allocation donut + split by market */}
            <div className="networth-card animate-in-1">
              <div className="networth-card__top">
                <div className="networth-card__lead">
                  <div className="dash-hero__label"><span className="live-dot" />Net Worth</div>
                  <AnimatedNumber value={totalEur * rate} prefix={symPre} suffix={symSuf} className="networth-card__value" />
                  <div className="dash-hero__meta">
                    <span className={`dash-pill ${pfUp ? 'dash-pill--up' : 'dash-pill--down'}`}>
                      {pfUp ? '+' : ''}{pfChange.toFixed(1)}%
                    </span>
                    {chartData.length > 1 && (
                      <span className="dash-hero__delta">{deltaStr} · 30d portfolio</span>
                    )}
                  </div>
                </div>

                {/* Allocation donut — balances the number, symmetric hero */}
                {(() => {
                  const C = 289; let acc = 0;
                  const segs = breakdown.filter(b => b.pct > 0).map(b => {
                    const len = (b.pct / 100) * C; const seg = { color: b.color, len, off: acc }; acc += len; return seg;
                  });
                  const nMarkets = breakdown.filter(b => b.value > 0).length;
                  return (
                    <svg className="networth-donut" viewBox="0 0 120 120" role="img" aria-label="Allocation by market">
                      <circle cx="60" cy="60" r="46" fill="none" stroke="var(--bg-elev)" strokeWidth="13" />
                      {segs.map((s, i) => (
                        <circle key={i} cx="60" cy="60" r="46" fill="none" stroke={s.color} strokeWidth="13"
                          strokeDasharray={`${s.len} ${C - s.len}`} strokeDashoffset={-s.off}
                          transform="rotate(-90 60 60)" />
                      ))}
                      <text x="60" y="57" textAnchor="middle" fill="var(--text-1)" fontFamily="var(--font-num)" fontSize="16" fontWeight="600">{nMarkets}</text>
                      <text x="60" y="71" textAnchor="middle" fill="var(--text-3)" fontFamily="Inter" fontSize="7.5" letterSpacing="1">MARKETS</text>
                    </svg>
                  );
                })()}
              </div>

              {/* Proportion bar — crypto vs stock vs cash */}
              <div className="split-bar" role="img"
                aria-label={`Crypto ${cryptoPct.toFixed(0)}%, stock ${stockPct.toFixed(0)}%, cash ${cashPct.toFixed(0)}%, dry powder ${dryPct.toFixed(0)}%`}>
                {breakdown.filter(b => b.pct > 0).map(b => (
                  <span key={b.key} className="split-bar__seg" style={{ width: `${b.pct}%`, background: b.color }} />
                ))}
                {totalEur === 0 && <span className="split-bar__seg split-bar__seg--empty" />}
              </div>

              {/* Breakdown cards — one per market */}
              <div className="wealth-cards">
                {breakdown.map(b => (
                  <div key={b.key} className="wealth-card">
                    <div className="wealth-card__top">
                      <span className="wealth-card__dot" style={{ background: b.color }} />
                      {b.label}
                    </div>
                    <AnimatedNumber value={b.value * rate} prefix={symPre} suffix={symSuf} className="wealth-card__value" />
                    <div className="wealth-card__meta">
                      {b.meta || <span className="wealth-card__meta--off">{b.empty || '—'}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. NET WORTH CHART — period selectable (1W / 1M / 1Y / All) */}
            {(() => {
              const periods = [['1W', 7], ['1M', 30], ['1Y', 365], ['All', 100000]];
              const days = (periods.find(p => p[0] === chartPeriod) || ['1M', 30])[1];
              const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
              const cutoffStr = cutoff.toISOString().split('T')[0];
              const hist = (history || []).filter(h => h.date >= cutoffStr).map(h => ({ date: h.date, value: h.total || 0 }));
              const usingHistory = hist.length >= 2;
              const series = usingHistory ? hist : chartData;
              if (series.length < 2) return null;
              return (
                <div className="dash-trend animate-in-2">
                  <div className="chart-periods">
                    {periods.map(([k]) => (
                      <button key={k} type="button"
                        className={`chart-periods__btn ${chartPeriod === k ? 'active' : ''}`}
                        onClick={() => setChartPeriod(k)}>{k}</button>
                    ))}
                    {!usingHistory && <span className="chart-periods__note">portfolio · building history</span>}
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8B7BFF" stopOpacity={0.10} />
                          <stop offset="100%" stopColor="#8B7BFF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <YAxis hide domain={[(min) => min * 0.985, (max) => max * 1.01]} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE}
                        cursor={{ stroke: 'rgba(139,123,255,0.4)', strokeWidth: 1, strokeDasharray: '3 3' }}
                        formatter={(v) => [money(v), usingHistory ? 'Net worth' : 'Portfolio']} labelFormatter={(l) => formatDate(l)} />
                      <Area type="monotone" dataKey="value" stroke="#8B7BFF" strokeWidth={2} strokeLinecap="round"
                        fill="url(#hg)" dot={false} activeDot={{ r: 4, fill: '#8B7BFF', stroke: '#15151A', strokeWidth: 2 }}
                        animationDuration={900} animationEasing="ease-out" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}

            {/* 3. KPI ROW — guadagno / rendimento / asset */}
            {(() => {
              const pnlPct = summary.total_invested > 0 ? (summary.pnl / summary.total_invested) * 100 : 0;
              return (
                <div className="dash-kpis animate-in-2">
                  <div className="dash-kpi">
                    <div className="dash-kpi__label">Profit</div>
                    <div className={`dash-kpi__value ${summary.pnl >= 0 ? 'dash-kpi__value--green' : 'dash-kpi__value--red'}`}>
                      {summary.pnl >= 0 ? '+' : '-'}{money(Math.abs(summary.pnl))}
                    </div>
                  </div>
                  <div className="dash-kpi">
                    <div className="dash-kpi__label">Return</div>
                    <div className={`dash-kpi__value ${pnlPct >= 0 ? 'dash-kpi__value--green' : 'dash-kpi__value--red'}`}>
                      {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                    </div>
                  </div>
                  <div className="dash-kpi">
                    <div className="dash-kpi__label">Assets</div>
                    <div className="dash-kpi__value dash-kpi__value--1">{mainAssets.length}</div>
                  </div>
                </div>
              );
            })()}

            {/* 4. TWO-COLUMN — allocazione (labeled bars) + asset principali */}
            <div className="dash-split animate-in-3">
              {/* Left: allocation bars */}
              <div className="dash-panel">
                <div className="dash-panel__title">Allocation</div>
                {topAlloc.length > 0 ? (
                  <div className="alloc-bars">
                    {topAlloc.map(slice => (
                      <div key={slice.name} className="alloc-bar">
                        <span className="alloc-bar__label">{slice.name}</span>
                        <span className="alloc-bar__track">
                          <span className="alloc-bar__fill" style={{ width: `${slice.pct}%`, background: slice.color }} />
                        </span>
                        <span className="alloc-bar__pct">{Number(slice.pct).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState compact icon="inbox" title="No Assets" description="Set up your assets in Settings." />
                )}
              </div>

              {/* Right: top assets list */}
              <div className="dash-panel">
                <div className="dash-panel__title">Top Assets</div>
                {topAssets.length > 0 ? (
                  <div className="dash-assets">
                    {topAssets.map(asset => {
                      const d = summary.by_asset[asset.symbol];
                      const pnlPct = d.invested > 0 ? (d.value / d.invested - 1) * 100 : 0;
                      const up = pnlPct >= 0;
                      return (
                        <div key={asset.symbol} className="dash-asset">
                          <span className="dash-asset__dot" style={{ background: allocColor[asset.symbol] || asset.color }} />
                          <span className="dash-asset__name">{asset.symbol}</span>
                          <span className="dash-asset__value">{money(d.value)}</span>
                          <span className={`dash-asset__delta ${up ? 'dash-asset__delta--up' : 'dash-asset__delta--down'}`}>
                            {up ? '+' : ''}{pnlPct.toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState compact icon="inbox" title="No Assets"
                    description="Add a purchase with the + button at the bottom right to get started." />
                )}
              </div>
            </div>
          </>
        );
      })()}

      {/* === COMPACT ASSET STRIP (always visible) === */}
      <div className="animate-in-3">
        <div className="section-header">
          <div className="section-header__title">
            Main Portfolio · {mainAssets.length} assets
          </div>
          <div className="section-header__actions">
            <button className={`collapse-btn ${showDetails ? 'expanded' : ''}`} onClick={() => setShowDetails(!showDetails)}>
              {showDetails ? 'Hide Details' : 'Show Details'}
              <Icon name="chevron" size={13} className="collapse-btn__arrow" />
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
                    <div className="asset-strip__primary">
                      {isCrypto ? formatPrice(d.avg_price_usd || d.avg_price || 0, 'USD') : formatPrice(d.avg_price || 0, 'EUR')}
                    </div>
                    <div className="asset-strip__secondary">Avg · DCA</div>
                  </div>
                  <div className="asset-strip__cell asset-strip__cell--right">
                    <div className="asset-strip__primary" style={{ color: ch24Color }}>
                      {ch24 !== 0 ? (ch24 >= 0 ? '+' : '') + ch24.toFixed(2) + '%' : '—'}
                    </div>
                    <div className="asset-strip__secondary">24h</div>
                  </div>
                  <div className="asset-strip__cell asset-strip__cell--right">
                    <div className="asset-strip__primary">
                      {displayCurrency === 'USD' && eurUsdRate
                        ? formatUSD(d.value * eurUsdRate, 2)
                        : formatEUR(d.value)}
                    </div>
                    <div className="asset-strip__secondary">{formatQty(d.qty, asset.decimals)} {asset.symbol}</div>
                  </div>
                  <div className="asset-strip__cell asset-strip__cell--right">
                    <div className="asset-strip__primary">
                      {displayCurrency === 'USD' && eurUsdRate
                        ? (d.pnl >= 0 ? '+' : '') + formatUSD(d.pnl * eurUsdRate, 2)
                        : formatPnL(d.pnl)}
                    </div>
                    <div className="asset-strip__secondary" style={{ color: pc }}>
                      {d.invested > 0 ? ((d.value / d.invested - 1) * 100).toFixed(2) + '%' : '—'}
                    </div>
                  </div>
                  <div className="asset-strip__cell asset-strip__cell--right">
                    <label className="toggle" title={included ? 'Excluded from totals' : 'Included in totals'}>
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
              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', marginBottom: 16 }}>
                {mainAssets.map(asset => renderAssetCard(asset, summary, prices, marketInfo, handleToggleTracking, true, eurUsdRate))}
              </div>
            )}
            {specAssets.length > 0 && (
              <>
                <div className="section-header" style={{ marginTop: 20 }}>
                  <div className="section-header__title">Speculative · Not Included</div>
                  <div className="section-header__meta">
                    Value <span style={{ color: 'var(--text-1)' }}>{formatEUR(summary.spec_value)}</span>
                    <span style={{ marginLeft: 10, color: summary.spec_pnl >= 0 ? 'var(--green)' : 'var(--red-soft)' }}>
                      {formatPnL(summary.spec_pnl)} ({formatPct(summary.spec_pnl_pct)})
                    </span>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                  {specAssets.map(asset => renderAssetCard(asset, summary, prices, marketInfo, handleToggleTracking, false, eurUsdRate))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="divider-subtle" />

      {/* === MARKET OVERVIEW (collapsed by default) === */}
      <div className="animate-in-3" style={{ marginBottom: 24 }}>
        <div className="section-header">
          <div className="section-header__title">Market Overview</div>
          <button className={`collapse-btn ${showMarket ? 'expanded' : ''}`} onClick={() => setShowMarket(!showMarket)}>
            {showMarket ? 'Hide' : 'Show'}
            <Icon name="chevron" size={13} className="collapse-btn__arrow" />
          </button>
        </div>
        {showMarket && (
          <div className="card overflow-auto" style={{ padding: 0 }}>
            {Object.keys(marketInfo).length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">24h</th>
                    <th className="text-right">7d</th>
                    <th className="text-right">ATH</th>
                    <th className="text-right">From ATH</th>
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
              <div style={{ padding: 20, fontSize: 12, color: 'var(--text-3)' }}><span className="live-dot" /> Loading data...</div>
            )}
          </div>
        )}
      </div>

      {/* === CHARTS (collapsed by default) === */}
      <div style={{ marginBottom: 24 }}>
        <div className="section-header">
          <div className="section-header__title">Charts & Analytics</div>
          <button className={`collapse-btn ${showCharts ? 'expanded' : ''}`} onClick={() => setShowCharts(!showCharts)}>
            {showCharts ? 'Hide' : 'Show'}
            <Icon name="chevron" size={13} className="collapse-btn__arrow" />
          </button>
        </div>
        {showCharts && (
          <>
            <div className="card section-gap">
              <div className="card__head">
                <h3 className="card__title">Main Portfolio — 30 Days</h3>
                <span className="card__subtitle">Total Value in EUR</span>
              </div>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B7BFF" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#8B7BFF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="date" stroke="transparent" tick={{ fill: '#7A7880', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={40} tickFormatter={(d) => formatDate(d).slice(0, 5)} />
                    <YAxis
                      stroke="transparent"
                      tick={{ fill: '#7A7880', fontSize: 10 }}
                      axisLine={false} tickLine={false} width={48}
                      domain={[(min) => min * 0.985, (max) => max * 1.01]}
                      tickFormatter={yEur}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE}
                      cursor={{ stroke: 'rgba(139,123,255,0.4)', strokeWidth: 1, strokeDasharray: '3 3' }}
                      formatter={(v) => [formatEUR(v), 'Portfolio value']}
                      labelFormatter={(l) => formatDate(l)}
                    />
                    <Area type="monotone" dataKey="value" stroke="#8B7BFF" strokeWidth={2} strokeLinecap="round"
                      fill="url(#dg)" animationDuration={900} animationEasing="ease-out"
                      dot={(p) => p.index === chartData.length - 1
                        ? <g key="last"><circle cx={p.cx} cy={p.cy} r={7} fill="#8B7BFF" opacity={0.2} /><circle cx={p.cx} cy={p.cy} r={3.5} fill="#8B7BFF" stroke="#15151A" strokeWidth={2} /></g>
                        : <g key={p.index} />}
                      activeDot={{ r: 4, fill: '#fff', stroke: '#15151A', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <EmptyState compact icon="chart" title="No Data" description="Add purchases to see your portfolio trend." />}
            </div>

            <div className="card overflow-auto">
              <div className="card__head">
                <h3 className="card__title">Latest Purchases</h3>
                <span className="card__subtitle">Last {recentPurchases.length} movements</span>
              </div>
              <DataTable columns={recentColumns} data={recentPurchases} defaultSort={{ key: 'date', direction: 'desc' }} />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '20px 0 8px', fontSize: 10, color: 'var(--text-3)' }}>
        <span>Prices {cacheAge != null ? `updated ${Math.round(cacheAge / 60)} min ago` : 'loading'}</span>
        <button onClick={forceRefresh} disabled={refreshing} className="btn btn--ghost btn--sm" style={{ fontSize: 10, padding: '3px 10px' }}>
          {refreshing ? 'Refreshing...' : <><Icon name="refresh" size={12} /> Refresh now</>}
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
          <label className="toggle" title={included ? 'Excluded' : 'Included'}>
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
          <div style={{ color: 'var(--text-3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 1 }}>Quantity</div>
          <div style={{ color: 'var(--text-1)', fontFamily: 'var(--font-num)' }}>{formatQty(d.qty, asset.decimals)}</div>
        </div>
        <div>
          <div style={{ color: 'var(--text-3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 1 }}>Invested</div>
          <div style={{ color: 'var(--text-1)', fontFamily: 'var(--font-num)' }}>{formatEUR(d.invested)}</div>
        </div>
        <div>
          <div style={{ color: 'var(--text-3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 1 }}>DCA</div>
          <div style={{ color: 'var(--text-2)', fontFamily: 'var(--font-num)' }}>
            {isCrypto ? formatPrice(d.avg_price_usd || d.avg_price || 0, 'USD') : formatPrice(d.avg_price || 0, 'EUR')}
          </div>
        </div>
        <div>
          <div style={{ color: 'var(--text-3)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 1 }}>Value</div>
          <div style={{ color: 'var(--text-1)', fontFamily: 'var(--font-num)' }}>{formatEUR(d.value)}</div>
        </div>
      </div>
    </div>
  );
}

// EUR-normalized net-worth figures for the daily snapshot (same formula as the hero).
function computeNetFigures(d, assets, networth, cashPositions) {
  const summary = d.summary, prices = d.prices || {};
  let rate = null;
  for (const sym of Object.keys(prices)) {
    const p = prices[sym];
    if (p?.eur > 0 && p?.usd > 0) { rate = p.usd / p.eur; break; }
  }
  const toEur = (bal, cur) => ((cur || 'EUR').toUpperCase() === 'USD' && rate) ? bal / rate : bal;
  const mainAssets = (assets || []).filter(x => summary.by_asset[x.symbol]?.include_in_totals !== false && summary.by_asset[x.symbol]);
  const portfolio = mainAssets.reduce((s, x) => s + (summary.by_asset[x.symbol]?.value || 0), 0);
  const cash = (networth?.external_accounts || []).reduce((s, acc) => s + toEur(Number(acc.balance) || 0, acc.currency), 0);
  const dry = (cashPositions || []).reduce((s, p) => s + toEur(Number(p.amount_eur) || 0, p.currency), 0);
  return { total: portfolio + cash + dry, portfolio, cash, dry };
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
