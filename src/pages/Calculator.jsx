import React, { useState, useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import { PageSkeleton } from '../components/Skeleton';
import AssetBadge from '../components/AssetBadge';
import EmptyState from '../components/EmptyState';
import { api } from '../api.js';
import { formatPrice } from '../utils/format';

export default function Calculator() {
  const [user, setUser] = useState(null);
  const [assets, setAssets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState('');

  // What-if buy
  const [buyAmount, setBuyAmount] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  // Target DCA
  const [targetDca, setTargetDca] = useState('');
  const [targetPrice, setTargetPrice] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [u, d, a] = await Promise.all([api.getMe(), api.getDashboard(), api.getAssets()]);
        setUser(u); setSummary(d.summary); setPrices(d.prices || {}); setAssets(a);
        const held = a.filter(x => d.summary.by_asset[x.symbol]?.qty > 0)
          .sort((x, y) => (d.summary.by_asset[y.symbol].value) - (d.summary.by_asset[x.symbol].value));
        if (held[0]) setSymbol(held[0].symbol);
      } catch (e) {}
      finally { setLoading(false); }
    })();
  }, []);

  // Reset the calculators when switching asset.
  useEffect(() => { setBuyAmount(''); setBuyPrice(''); setTargetDca(''); setTargetPrice(''); }, [symbol]);

  if (loading) return <PageLayout title="DCA" username="" size="md"><PageSkeleton rows={6} /></PageLayout>;
  if (!user || !summary) return <div className="loading-screen"><div className="loading-error">Failed to load</div></div>;

  const heldAssets = assets.filter(x => summary.by_asset[x.symbol]?.qty > 0);
  const asset = assets.find(a => a.symbol === symbol);
  const d = symbol ? summary.by_asset[symbol] : null;
  const isCrypto = asset?.asset_type === 'crypto' || asset?.asset_type === 'dex_token';
  const ccy = isCrypto ? 'USD' : 'EUR';
  const fmt = (v) => formatPrice(v || 0, ccy);
  const qtyFmt = (v) => Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 8 });

  const curPrice = isCrypto ? (prices[symbol]?.usd || 0) : (prices[symbol]?.eur || 0);
  const qty = d?.qty || 0;
  const dca = isCrypto ? (d?.avg_price_usd || d?.avg_price || 0) : (d?.avg_price || 0);
  const costBasis = qty * dca;
  const positionValue = qty * curPrice;
  const pnlPct = costBasis > 0 ? (positionValue / costBasis - 1) * 100 : 0;

  // --- What-if buy ---
  const bAmt = parseFloat(buyAmount) || 0;
  const bPrice = parseFloat(buyPrice) || curPrice;
  const bAddQty = bPrice > 0 ? bAmt / bPrice : 0;
  const bNewQty = qty + bAddQty;
  const bNewDca = bNewQty > 0 ? (costBasis + bAmt) / bNewQty : 0;
  const bDelta = bNewDca - dca;
  const bValid = bAmt > 0 && bPrice > 0;

  // --- Target DCA → amount to invest ---
  const tDca = parseFloat(targetDca) || 0;
  const tPrice = parseFloat(targetPrice) || curPrice;
  let tNeed = 0, tAddQty = 0, tReason = '';
  if (tDca > 0 && tPrice > 0) {
    if (tDca >= dca) tReason = 'Target must be below your current DCA — buying can only lower it.';
    else if (tPrice >= tDca) tReason = `Impossible at ${fmt(tPrice)}: you can’t pull the DCA below the price you buy at.`;
    else {
      tNeed = qty * (dca - tDca) / (tDca / tPrice - 1);
      tAddQty = tNeed / tPrice;
    }
  }
  const tValid = tDca > 0 && tPrice > 0 && !tReason;

  return (
    <PageLayout title="DCA Calculator" username={user.username} size="md">

      <div className="page-head animate-in">
        <div className="page-head__title">DCA Calculator</div>
        <div className="page-head__sub">Plan how a buy moves your average cost</div>
      </div>

      {/* Asset selector */}
      {heldAssets.length === 0 ? (
        <div className="panel animate-in-1">
          <EmptyState compact icon="inbox" title="No Holdings" description="Log a purchase in the Diary first, then plan your averaging here." />
        </div>
      ) : (
        <>
          <div className="calc-assets animate-in-1">
            {heldAssets.map(a => (
              <button key={a.symbol} type="button"
                className={`calc-asset ${symbol === a.symbol ? 'active' : ''}`}
                onClick={() => setSymbol(a.symbol)}>
                <AssetBadge asset={a.symbol} color={a.color} />
              </button>
            ))}
          </div>

          {/* Current position */}
          <div className="panel section-gap animate-in-1">
            <div className="diary-card__head"><span className="diary-card__dot" style={{ background: asset?.color || 'var(--accent)' }} />Current Position · {symbol}</div>
            <div className="calc-stats">
              <div className="calc-stat">
                <div className="calc-stat__lbl">Your DCA</div>
                <div className="calc-stat__val">{fmt(dca)}</div>
              </div>
              <div className="calc-stat">
                <div className="calc-stat__lbl">Quantity</div>
                <div className="calc-stat__val">{qtyFmt(qty)}</div>
              </div>
              <div className="calc-stat">
                <div className="calc-stat__lbl">Market Price</div>
                <div className="calc-stat__val">{fmt(curPrice)}</div>
              </div>
              <div className="calc-stat">
                <div className="calc-stat__lbl">Unrealized</div>
                <div className="calc-stat__val" style={{ color: pnlPct >= 0 ? 'var(--green)' : 'var(--red-soft)' }}>
                  {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Two calculators */}
          <div className="diary-top">
            {/* What-if buy */}
            <div className="panel">
              <div className="diary-card__head"><span className="diary-card__dot" style={{ background: 'var(--accent)' }} />What-If Buy</div>
              <div className="form-group">
                <label className="form-label">Amount ({ccy})</label>
                <input type="number" step="any" className="form-input" value={buyAmount} onChange={e => setBuyAmount(e.target.value)} placeholder="1000" />
              </div>
              <div className="form-group">
                <label className="form-label">Buy Price ({ccy})</label>
                <input type="number" step="any" className="form-input" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} placeholder={curPrice ? String(Math.round(curPrice)) : '0'} />
                <div className="form-hint">Leave empty to use the current market price.</div>
              </div>
              <div className="calc-result">
                <div className="calc-result__lbl">New DCA</div>
                <div className="calc-result__val">{bValid ? fmt(bNewDca) : '—'}</div>
                {bValid && (
                  <div className="calc-result__meta">
                    <span style={{ color: bDelta <= 0 ? 'var(--green)' : 'var(--red-soft)' }}>
                      {bDelta <= 0 ? '▼ ' : '▲ '}{fmt(Math.abs(bDelta))}
                    </span>
                    <span style={{ color: 'var(--text-3)' }}> · +{qtyFmt(bAddQty)} {symbol} → {qtyFmt(bNewQty)} total</span>
                  </div>
                )}
              </div>
            </div>

            {/* Target DCA */}
            <div className="panel">
              <div className="diary-card__head"><span className="diary-card__dot" style={{ background: 'var(--dry)' }} />Reach a Target DCA</div>
              <div className="form-group">
                <label className="form-label">Target DCA ({ccy})</label>
                <input type="number" step="any" className="form-input" value={targetDca} onChange={e => setTargetDca(e.target.value)} placeholder={dca ? String(Math.round(dca * 0.9)) : '0'} />
              </div>
              <div className="form-group">
                <label className="form-label">Buy Price ({ccy})</label>
                <input type="number" step="any" className="form-input" value={targetPrice} onChange={e => setTargetPrice(e.target.value)} placeholder={curPrice ? String(Math.round(curPrice)) : '0'} />
                <div className="form-hint">Leave empty to use the current market price.</div>
              </div>
              <div className="calc-result">
                <div className="calc-result__lbl">You Need to Invest</div>
                <div className="calc-result__val">{tValid ? fmt(tNeed) : '—'}</div>
                {tValid && (
                  <div className="calc-result__meta">
                    <span style={{ color: 'var(--text-3)' }}>+{qtyFmt(tAddQty)} {symbol} at {fmt(tPrice)}</span>
                  </div>
                )}
                {tReason && <div className="calc-result__warn">{tReason}</div>}
              </div>
            </div>
          </div>
        </>
      )}
    </PageLayout>
  );
}
