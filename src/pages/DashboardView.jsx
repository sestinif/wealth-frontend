import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import AnimatedNumber from '../components/AnimatedNumber';
import StatRow from '../components/StatRow';
import DetailSheet from '../components/DetailSheet';
import Avatar from '../components/Avatar';
import Money from '../components/Money';
import Icon from '../components/Icon';
import MarketOverview from '../components/MarketOverview';
import {
  formatEUR, formatUSD, formatQty, formatPrice, formatDayLong, pctText,
  TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE,
} from '../utils/format';
import { computeNetWorth, periodSeries, portfolioSeries30d, PERIODS } from '../utils/networth';
import { assetColor } from '../utils/marks';

const ownMoney = (amount, currency) =>
  ((currency || 'EUR').toUpperCase() === 'USD' ? formatUSD : formatEUR)(Number(amount) || 0);

// Pure view of the dashboard: net worth, allocation, three figures, holdings.
export default function DashboardView({
  displayName, data, assets, networth, cashPositions, history, marketInfo,
  cacheAge, refreshing, onRefresh, onToggleTracking,
}) {
  const [currency, setCurrency] = useState('EUR');
  const [period, setPeriod] = useState('1M');
  const [openCat, setOpenCat] = useState(null);
  const [sheetSym, setSheetSym] = useState(null);
  const [showMarket, setShowMarket] = useState(false);

  const { summary, prices, purchases } = data;
  const by = summary.by_asset;
  const nw = computeNetWorth({ summary, assets, prices, networth, cashPositions });

  // Everything is computed in EUR; the toggle only changes how it is shown.
  const isUsd = currency === 'USD' && !!nw.rate;
  const fx = isUsd ? nw.rate : 1;
  const cur = isUsd ? 'USD' : 'EUR';
  const money = (v) => (isUsd ? formatUSD(v * fx) : formatEUR(v));
  const signed = (v) => `${v >= 0 ? '+' : ''}${money(v)}`;
  const priceOf = (sym) => {
    const pi = prices[sym] || {};
    return isUsd ? formatPrice(pi.usd || (pi.eur || 0) * fx, 'USD') : formatPrice(pi.eur || 0, 'EUR');
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const trend = periodSeries(history, portfolioSeries30d(purchases, prices, assets), period);

  const share = (v) => (nw.total > 0 ? (v / nw.total) * 100 : 0);
  const byValue = (list) => [...list].sort((a, b) => (by[b.symbol]?.value || 0) - (by[a.symbol]?.value || 0));
  const assetLines = (list) => byValue(list).map(a => ({ key: a.symbol, name: a.name || a.symbol, value: money(by[a.symbol].value) }));
  const cats = [
    { key: 'stock', label: 'Stock market', color: 'var(--stock)', value: nw.stock, lines: assetLines(nw.stockAssets) },
    { key: 'cash', label: 'Cash', color: 'var(--cash)', value: nw.cash,
      lines: nw.accounts.map((acc, i) => ({ key: `${acc.name}-${i}`, name: acc.name, value: ownMoney(acc.balance, acc.currency) })) },
    { key: 'crypto', label: 'Crypto market', color: 'var(--crypto)', value: nw.crypto, lines: assetLines(nw.cryptoAssets) },
    { key: 'dry', label: 'Dry powder', color: 'var(--dry)', value: nw.dry,
      lines: (cashPositions || []).map(p => ({ key: p.id, name: p.label, value: ownMoney(p.amount_eur, p.currency) })) },
  ].sort((a, b) => b.value - a.value);

  const returnPct = summary.total_invested > 0 ? (summary.pnl / summary.total_invested) * 100 : 0;

  const holding = (a, muted) => {
    const d = by[a.symbol];
    const profitPct = d.invested > 0 ? (d.value / d.invested - 1) * 100 : 0;
    const tone = d.pnl >= 0 ? 'm-up' : 'm-down';
    return (
      <button type="button" key={a.symbol} className={`m-table__row ${muted ? 'is-muted' : ''}`} onClick={() => setSheetSym(a.symbol)}>
        <span className="m-table__name m-table__name--mark">
          <Avatar asset={a.symbol} color={assetColor(a)} />
          <span className="m-row__main">
            <span className="m-row__title">{a.name || a.symbol}</span>
            <span className="m-table__sub">{formatQty(d.qty, a.decimals)} {a.symbol}</span>
          </span>
        </span>
        <span className="m-table__price m-muted">{priceOf(a.symbol)}</span>
        <span>
          {money(d.value)}
          <span className={`m-table__sub m-table__phone ${tone}`}>{signed(d.pnl)}</span>
        </span>
        <span className="m-table__profit">
          <span className={tone}>{signed(d.pnl)}</span>
          <span className="m-table__sub">{pctText(profitPct)}</span>
        </span>
      </button>
    );
  };

  const sheetAsset = sheetSym ? assets.find(a => a.symbol === sheetSym) : null;
  const sd = sheetAsset ? by[sheetAsset.symbol] : null;
  const sheetIncluded = sd ? sd.include_in_totals !== false : false;
  const change24 = sheetAsset ? marketInfo[sheetAsset.symbol]?.change_24h : undefined;
  const sheetRows = sd ? [
    { label: 'Price', value: priceOf(sheetAsset.symbol) },
    { label: 'Average price', value: isUsd
      ? formatPrice(sd.avg_price_usd || (sd.avg_price || 0) * fx, 'USD')
      : formatPrice(sd.avg_price || 0, 'EUR') },
    { label: '24h change', value: change24 == null ? '' : pctText(change24) },
    { label: 'Quantity', value: `${formatQty(sd.qty, sheetAsset.decimals)} ${sheetAsset.symbol}` },
    { label: 'Invested', value: money(sd.invested) },
    { label: 'Profit', value: `${signed(sd.pnl)} (${pctText(sd.invested > 0 ? (sd.value / sd.invested - 1) * 100 : 0)})` },
  ] : [];

  return (
    <>
      {refreshing && <div className="top-progress"><div className="top-progress__bar" /></div>}

      <div className="m-greet">
        <h1 className="m-greet__title">{greeting}, {displayName}</h1>
        <div className="currency-toggle" title={nw.rate ? `1 € = ${nw.rate.toFixed(4)} $` : 'Exchange rate unavailable'}>
          {['EUR', 'USD'].map(c => (
            <button key={c} type="button"
              className={`currency-toggle__btn ${currency === c ? 'active' : ''}`}
              onClick={() => setCurrency(c)} disabled={c === 'USD' && !nw.rate}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="m-top">
        <div className="m-card">
          <div className="m-nw__head">
            <div className="m-label">Net worth</div>
            <div className="m-periods">
              {PERIODS.map(([k]) => (
                <button key={k} type="button" className={`m-periods__btn ${period === k ? 'is-active' : ''}`} onClick={() => setPeriod(k)}>{k}</button>
              ))}
            </div>
          </div>
          <AnimatedNumber value={nw.total * fx} prefix={isUsd ? '$' : '€'} smallDecimals className="m-nw__value" />
          {trend.series.length > 1 && (
            <>
              <div className="m-nw__delta">
                <span className={trend.delta >= 0 ? 'm-up' : 'm-down'}>{signed(trend.delta)} ({pctText(trend.deltaPct)})</span> · {trend.label}
              </div>
              <div className="m-nw__chart">
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={trend.series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={[(min) => min * 0.985, (max) => max * 1.01]} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE}
                      cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                      formatter={(v) => [money(v), trend.usingHistory ? 'Net worth' : 'Portfolio']}
                      labelFormatter={(l) => formatDayLong(l)} />
                    <Area type="monotone" dataKey="value" stroke="#8D9BFF" strokeWidth={1.5} strokeLinecap="round" fill="none"
                      dot={false} activeDot={{ r: 3.5, fill: '#8D9BFF', stroke: '#1B1B24', strokeWidth: 1.5 }}
                      isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>

        <div className="m-card">
          <div className="m-label">Allocation</div>
          <div className="m-bar" role="img" aria-label="Allocation by market">
            {cats.filter(c => c.value > 0).map(c => (
              <span key={c.key} className="m-bar__seg" style={{ width: `${share(c.value)}%`, background: c.color }} />
            ))}
          </div>
          {cats.map(c => {
            const open = openCat === c.key;
            const canOpen = c.lines.length > 0;
            const Tag = canOpen ? 'button' : 'div';
            const has = c.value > 0;
            return (
              <React.Fragment key={c.key}>
                <Tag className={`m-cat ${open ? 'is-open' : ''}`}
                  {...(canOpen ? { type: 'button', 'aria-expanded': open, onClick: () => setOpenCat(open ? null : c.key) } : {})}>
                  <span className="m-cat__dot" style={{ background: c.color }} />
                  <span className={has ? '' : 'm-muted'}>
                    {c.label}{has && <span className="m-cat__pct">{share(c.value).toFixed(0)}%</span>}
                  </span>
                  <span className={has ? '' : 'm-muted'}>{has ? money(c.value) : '—'}</span>
                  <span className="m-cat__chev">{canOpen && <Icon name="chevron" size={14} />}</span>
                </Tag>
                {open && c.lines.map(l => (
                  <div className="m-sub" key={l.key}>
                    <span className="m-sub__name">{l.name}</span>
                    <span className="m-sub__val">{l.value}</span>
                  </div>
                ))}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <StatRow items={[
        { label: 'Profit', value: <Money value={summary.pnl * fx} currency={cur} sign />, tone: summary.pnl >= 0 ? 'up' : 'down' },
        { label: 'Return', value: pctText(returnPct), tone: returnPct >= 0 ? 'up' : 'down' },
        { label: 'Invested', value: <Money value={summary.total_invested * fx} currency={cur} /> },
        // What the investments are worth now, and the share of the net worth they make up.
        { label: `Total invested · ${Math.round(share(nw.portfolio))}%`, value: <Money value={nw.portfolio * fx} currency={cur} /> },
      ]} />

      <div className="m-table__head">
        <span>Holdings</span><span>Price</span><span>Value</span><span>Profit</span>
      </div>
      {byValue(nw.mainAssets).map(a => holding(a, false))}

      {nw.specAssets.length > 0 && (
        <>
          <div className="m-section">
            <span>Speculative, not included</span>
            <span>{money(summary.spec_value || 0)} · <span className={(summary.spec_pnl || 0) >= 0 ? 'm-up' : 'm-down'}>{signed(summary.spec_pnl || 0)}</span></span>
          </div>
          {byValue(nw.specAssets).map(a => holding(a, true))}
        </>
      )}

      <div className="m-section">
        <span>Market overview</span>
        <button type="button" className="m-link" onClick={() => setShowMarket(s => !s)}>{showMarket ? 'Hide' : 'Show'}</button>
      </div>
      {showMarket && <MarketOverview assets={assets} prices={prices} marketInfo={marketInfo} />}

      <div className="m-foot">
        <span>Prices {cacheAge != null ? `updated ${Math.round(cacheAge / 60)} min ago` : 'loading'}</span>
        <button type="button" className="m-link" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh now'}
        </button>
      </div>

      <DetailSheet open={!!sd} onClose={() => setSheetSym(null)}
        avatar={sheetAsset && <Avatar asset={sheetAsset.symbol} color={assetColor(sheetAsset)} />}
        title={sheetAsset ? (sheetAsset.name || sheetAsset.symbol) : ''}
        subtitle={sheetAsset?.symbol}
        amount={sd && <Money value={sd.value * fx} currency={cur} />}
        rows={sheetRows}>
        {sd && (
          <div className="m-sheet__row">
            <span>Include in totals</span>
            <label className="toggle">
              <input type="checkbox" aria-label="Include in totals" checked={sheetIncluded}
                onChange={() => onToggleTracking(sheetAsset.symbol, sheetIncluded)} />
              <span className="toggle__slider" />
            </label>
          </div>
        )}
      </DetailSheet>
    </>
  );
}
