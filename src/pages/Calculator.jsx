import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import PageHead from '../components/PageHead';
import StatRow from '../components/StatRow';
import Field from '../components/Field';
import { PageSkeleton } from '../components/Skeleton';
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
    if (tDca >= dca) tReason = 'Target must be below your current average — buying can only lower it.';
    else if (tPrice >= tDca) tReason = `Impossible at ${fmt(tPrice)}: you can’t pull the average below the price you buy at.`;
    else {
      tNeed = qty * (dca - tDca) / (tDca / tPrice - 1);
      tAddQty = tNeed / tPrice;
    }
  }
  const tValid = tDca > 0 && tPrice > 0 && !tReason;

  return (
    <PageLayout title="DCA calculator" username={user.username} size="md">
      <PageHead title="DCA calculator">
        {heldAssets.length > 0 && (
          <select className="m-select" aria-label="Asset" value={symbol} onChange={e => setSymbol(e.target.value)}>
            {heldAssets.map(a => <option key={a.symbol} value={a.symbol}>{a.symbol}</option>)}
          </select>
        )}
      </PageHead>

      {heldAssets.length === 0 ? (
        <div className="m-empty">
          <div>No holdings yet</div>
          <Link to="/add" className="btn btn--primary">Add movement</Link>
        </div>
      ) : (
        <>
          <StatRow items={[
            { label: 'Your average', value: fmt(dca) },
            { label: 'Quantity', value: qtyFmt(qty) },
            { label: 'Market price', value: fmt(curPrice) },
            { label: 'Unrealized', value: `${pnlPct >= 0 ? '+' : '−'}${Math.abs(pnlPct).toFixed(1)}%`, tone: pnlPct >= 0 ? 'up' : 'down' },
          ]} />

          <div className="m-g2 m-g2--cards">
            <div className="m-card">
              <div className="m-label" style={{ marginBottom: 14 }}>What-if buy</div>
              <Field label={`Amount (${ccy})`}>
                <input type="number" step="any" className="form-input" value={buyAmount} onChange={e => setBuyAmount(e.target.value)} placeholder="1000" />
              </Field>
              <Field label={`Buy price (${ccy})`} hint="Leave empty to use the market price.">
                <input type="number" step="any" className="form-input" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} placeholder={curPrice ? String(Math.round(curPrice)) : '0'} />
              </Field>
              <div className="m-result">
                <div className="m-label">New average</div>
                <div className="m-result__value">{bValid ? fmt(bNewDca) : '—'}</div>
                {bValid && (
                  <div className="m-result__meta">
                    <span className={bDelta <= 0 ? 'm-up' : 'm-down'}>{bDelta <= 0 ? '−' : '+'}{fmt(Math.abs(bDelta))}</span> · +{qtyFmt(bAddQty)} {symbol}, {qtyFmt(bNewQty)} in total
                  </div>
                )}
              </div>
            </div>

            <div className="m-card">
              <div className="m-label" style={{ marginBottom: 14 }}>Reach a target average</div>
              <Field label={`Target average (${ccy})`}>
                <input type="number" step="any" className="form-input" value={targetDca} onChange={e => setTargetDca(e.target.value)} placeholder={dca ? String(Math.round(dca * 0.9)) : '0'} />
              </Field>
              <Field label={`Buy price (${ccy})`} hint="Leave empty to use the market price.">
                <input type="number" step="any" className="form-input" value={targetPrice} onChange={e => setTargetPrice(e.target.value)} placeholder={curPrice ? String(Math.round(curPrice)) : '0'} />
              </Field>
              <div className="m-result">
                <div className="m-label">You need to invest</div>
                <div className="m-result__value">{tValid ? fmt(tNeed) : '—'}</div>
                {tValid && <div className="m-result__meta">+{qtyFmt(tAddQty)} {symbol} at {fmt(tPrice)}</div>}
                {tReason && <div className="m-result__warn">{tReason}</div>}
              </div>
            </div>
          </div>
        </>
      )}
    </PageLayout>
  );
}
