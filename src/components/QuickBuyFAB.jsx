import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useToast } from './Toast';
import AssetBadge from './AssetBadge';
import Icon from './Icon';
import { formatPrice, localDay } from '../utils/format';
import { assetColor } from '../utils/marks';

export default function QuickBuyFAB() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState([]);
  const [prices, setPrices] = useState({});
  const [asset, setAsset] = useState('');
  const [amountEur, setAmountEur] = useState('');
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [useLivePrice, setUseLivePrice] = useState(true);
  const [priceEur, setPriceEur] = useState('');
  const [priceUsd, setPriceUsd] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastEdited, setLastEdited] = useState('amount');

  useEffect(() => {
    if (!open) return;
    Promise.all([api.getAssets(), api.getPrices()]).then(([a, p]) => {
      setAssets(a); setPrices(p);
      if (a.length > 0 && !asset) setAsset(a[0].symbol);
    }).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (useLivePrice && asset && prices[asset]) {
      setPriceEur((prices[asset].eur || '').toString());
      setPriceUsd((prices[asset].usd || '').toString());
    }
  }, [asset, useLivePrice, prices]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const currentAsset = assets.find(a => a.symbol === asset);

  const handleAmount = (v) => {
    setAmountEur(v); setLastEdited('amount');
    const p = parseFloat(priceEur); const a = parseFloat(v);
    if (p > 0 && a > 0) setQty((a / p).toFixed(8));
    else if (!v) setQty('');
  };
  const handleQty = (v) => {
    setQty(v); setLastEdited('qty');
    const p = parseFloat(priceEur); const q = parseFloat(v);
    if (p > 0 && q > 0) setAmountEur((q * p).toFixed(2));
    else if (!v) setAmountEur('');
  };

  const resetForm = () => {
    setAmountEur(''); setQty(''); setNotes(''); setLastEdited('amount');
    setPriceEur(''); setPriceUsd(''); setUseLivePrice(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountEur);
    const parsedPrice = parseFloat(priceEur);
    if (!asset || !parsedAmount || parsedAmount <= 0 || !parsedPrice || parsedPrice <= 0) {
      toast('Fill in asset, amount and price', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const today = localDay();
      const usd = (currentAsset?.asset_type === 'crypto') ? parseFloat(priceUsd) || 0 : 0;
      const exactQty = lastEdited === 'qty' ? parseFloat(qty) : null;
      await api.addPurchase(today, asset, parsedAmount, parsedPrice, notes, usd, null, 0, exactQty);
      toast(`${asset} purchase recorded`, 'success');
      resetForm();
      setOpen(false);
    } catch (err) {
      toast('Error: ' + err.message, 'error');
    } finally { setSubmitting(false); }
  };

  const livePrice = prices[asset];
  const isCrypto = currentAsset?.asset_type === 'crypto' || currentAsset?.asset_type === 'dex_token';

  return (
    <>
      <button
        className="fab"
        onClick={() => setOpen(true)}
        title="Quick buy"
        aria-label="Quick buy"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fab-overlay" onClick={() => setOpen(false)} />
          <div className="fab-modal" role="dialog" aria-label="Quick buy">
            <div className="fab-modal__header">
              <div>
                <div className="fab-modal__eyebrow">Quick buy</div>
                <div className="fab-modal__title">Record a new purchase</div>
              </div>
              <button className="fab-modal__close" onClick={() => setOpen(false)} aria-label="Close"><Icon name="x" size={16} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Asset</label>
                <div className="fab-assets">
                  {assets.map(a => (
                    <button
                      key={a.symbol} type="button"
                      className={`fab-asset-chip ${asset === a.symbol ? 'active' : ''}`}
                      onClick={() => setAsset(a.symbol)}
                    >
                      <AssetBadge asset={a.symbol} color={assetColor(a)} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
                <div className="form-group">
                  <label className="form-label">Amount in EUR</label>
                  <input
                    type="number" step="any" className="form-input"
                    value={amountEur} onChange={e => handleAmount(e.target.value)}
                    placeholder="0.00" autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{asset} quantity</label>
                  <input
                    type="number" step="any" className="form-input"
                    value={qty} onChange={e => handleQty(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="fab-price-row">
                <label className="checkbox-wrapper">
                  <input type="checkbox" checked={useLivePrice} onChange={e => setUseLivePrice(e.target.checked)} />
                  <span className="checkbox-label">Use live price</span>
                </label>
                {livePrice && (
                  <div className="fab-price-display">
                    {isCrypto && livePrice.usd
                      ? <>{formatPrice(livePrice.usd, 'USD')} <span style={{ color: 'var(--text-3)' }}>· {formatPrice(livePrice.eur, 'EUR')}</span></>
                      : formatPrice(livePrice.eur || 0, 'EUR')}
                  </div>
                )}
              </div>

              {!useLivePrice && (
                <div className="form-group">
                  <label className="form-label">Price in EUR</label>
                  <input
                    type="number" step="any" className="form-input"
                    value={priceEur}
                    onChange={e => {
                      setPriceEur(e.target.value);
                      const p = parseFloat(e.target.value);
                      if (p > 0) {
                        if (lastEdited === 'amount') {
                          const a = parseFloat(amountEur);
                          if (a > 0) setQty((a / p).toFixed(8));
                        } else {
                          const q = parseFloat(qty);
                          if (q > 0) setAmountEur((q * p).toFixed(2));
                        }
                      }
                    }}
                    placeholder="0.00"
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <input
                  type="text" className="form-input"
                  value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Weekly DCA, Binance, etc."
                />
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn--ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={submitting}>
                  {submitting ? 'Adding…' : 'Record purchase'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
