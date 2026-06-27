import React, { useState, useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import FormInput from '../components/FormInput';
import AssetBadge from '../components/AssetBadge';
import AlertMessage from '../components/AlertMessage';
import AddAssetModal from '../components/AddAssetModal';
import { useToast } from '../components/Toast';
import { PageSkeleton } from '../components/Skeleton';
import { api } from '../api.js';
import { formatEUR, formatUSD, formatQty, formatDate } from '../utils/format';

export default function Diary() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [prices, setPrices] = useState({});
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [asset, setAsset] = useState('');
  const [amountEur, setAmountEur] = useState('');
  const [priceEur, setPriceEur] = useState('');
  const [priceUsd, setPriceUsd] = useState('');
  const [notes, setNotes] = useState('');
  const [useLivePrice, setUseLivePrice] = useState(true);
  const [filterAsset, setFilterAsset] = useState('ALL');
  const [qty, setQty] = useState('');
  const [lastEdited, setLastEdited] = useState('amount'); // 'amount' or 'qty'
  const [priceCurrency, setPriceCurrency] = useState('EUR'); // 'EUR' or 'USD'
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [fundedFrom, setFundedFrom] = useState(''); // broker id whose dry powder funds this buy

  // Dry powder — uninvested broker cash (manual)
  const [cashPositions, setCashPositions] = useState([]);
  const [cpLabel, setCpLabel] = useState('');
  const [cpAmount, setCpAmount] = useState('');
  const [cpCurrency, setCpCurrency] = useState('EUR');
  const [cpEditId, setCpEditId] = useState(null);
  const [cpSubmitting, setCpSubmitting] = useState(false);
  const [cpDeleteConfirm, setCpDeleteConfirm] = useState(null);

  const resetCpForm = () => { setCpLabel(''); setCpAmount(''); setCpCurrency('EUR'); setCpEditId(null); };

  const handleCashSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(cpAmount);
    if (!cpLabel.trim()) { toast('Enter a broker name', 'error'); return; }
    if (isNaN(amount) || amount < 0) { toast('Enter a valid amount', 'error'); return; }
    setCpSubmitting(true);
    try {
      if (cpEditId) {
        await api.updateCashPosition(cpEditId, cpLabel.trim(), amount, cpCurrency);
        toast('Dry powder updated', 'success');
      } else {
        await api.addCashPosition(cpLabel.trim(), amount, cpCurrency);
        toast('Dry powder added', 'success');
      }
      setCashPositions(await api.getCashPositions());
      resetCpForm();
    } catch (err) { toast(err.message, 'error'); }
    finally { setCpSubmitting(false); }
  };

  const handleCashEdit = (p) => { setCpEditId(p.id); setCpLabel(p.label); setCpAmount(String(p.amount_eur)); setCpCurrency((p.currency || 'EUR').toUpperCase()); };

  const handleCashDelete = async (id) => {
    try {
      await api.deleteCashPosition(id);
      setCashPositions(prev => prev.filter(p => p.id !== id));
      setCpDeleteConfirm(null);
      if (cpEditId === id) resetCpForm();
      toast('Dry powder removed', 'success');
    } catch (err) { toast(err.message, 'error'); }
  };

  // EUR↔USD rate from any asset that has both prices (same trick as the dashboard).
  const eurUsdRate = (() => {
    for (const sym of Object.keys(prices)) {
      const p = prices[sym];
      if (p?.eur > 0 && p?.usd > 0) return p.usd / p.eur;
    }
    return null;
  })();
  const toEur = (amount, currency) => {
    const cur = (currency || 'EUR').toUpperCase();
    if (cur === 'USD' && eurUsdRate) return amount / eurUsdRate;
    return amount;
  };
  // Dry powder total normalized to EUR (USD positions converted).
  const dryPowderTotal = cashPositions.reduce((s, p) => s + toEur(Number(p.amount_eur) || 0, p.currency), 0);

  const handleAssetAdded = async (newAsset) => {
    const [updatedAssets, updatedPrices] = await Promise.all([api.getAssets(), api.getPrices()]);
    setAssets(updatedAssets);
    setPrices(updatedPrices);
    setAsset(newAsset.symbol);
    setShowAddAsset(false);
    toast(`${newAsset.symbol} added · selected for purchase`, 'success');
  };

  const currentAsset = assets.find(a => a.symbol === asset);
  const isCrypto = currentAsset?.asset_type === 'crypto';
  const getDecimals = (sym) => assets.find(a => a.symbol === sym)?.decimals || 2;
  const getColor = (sym) => assets.find(a => a.symbol === sym)?.color || '#8B7BFF';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userData, purchasesData, pricesData, assetsData, cashData] = await Promise.all([
          api.getMe(), api.getPurchases(), api.getPrices(), api.getAssets(),
          api.getCashPositions().catch(() => [])
        ]);
        setUser(userData);
        setPurchases(purchasesData);
        setPrices(pricesData);
        setAssets(assetsData);
        setCashPositions(cashData || []);
        if (assetsData.length > 0 && !asset) setAsset(assetsData[0].symbol);
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const hasUsdRate = prices[asset]?.eur && prices[asset]?.usd;

  // Round live prices to sane precision (2 decimals for normal prices, more for sub-1 micro).
  const liveStr = (n) => {
    const v = Number(n);
    if (!v) return '';
    return (Math.abs(v) >= 1 ? v.toFixed(2) : v.toFixed(6)).toString();
  };

  useEffect(() => {
    if (useLivePrice && asset && prices[asset]) {
      const priceInfo = prices[asset];
      if (priceCurrency === 'USD' && priceInfo.usd) {
        setPriceUsd(liveStr(priceInfo.usd));
        if (priceInfo.eur) setPriceEur(liveStr(priceInfo.eur));
      } else {
        setPriceEur(liveStr(priceInfo.eur));
        setPriceUsd(liveStr(priceInfo.usd));
      }
    }
  }, [asset, useLivePrice, prices, priceCurrency]);

  const handleAmountChange = (v) => {
    setAmountEur(v);
    setLastEdited('amount');
    const p = parseFloat(priceEur);
    const a = parseFloat(v);
    if (p > 0 && a > 0) setQty((a / p).toFixed(8));
    else if (!v) setQty('');
  };
  const handleQtyChange = (v) => {
    setQty(v);
    setLastEdited('qty');
    const p = parseFloat(priceEur);
    const q = parseFloat(v);
    if (p > 0 && q > 0) setAmountEur((q * p).toFixed(2));
    else if (!v) setAmountEur('');
  };
  const handlePriceEurChange = (v) => {
    setPriceEur(v);
    const p = parseFloat(v);
    if (p > 0) {
      if (lastEdited === 'amount') {
        const a = parseFloat(amountEur);
        if (a > 0) setQty((a / p).toFixed(8));
      } else {
        const q = parseFloat(qty);
        if (q > 0) setAmountEur((q * p).toFixed(2));
      }
    }
  };

  const handlePriceInputChange = (v) => {
    // The user is entering the price in the selected currency
    if (priceCurrency === 'USD') {
      setPriceUsd(v);
      const p = parseFloat(v);
      if (p > 0 && hasUsdRate) {
        const rate = prices[asset].eur / prices[asset].usd;
        handlePriceEurChange((p * rate).toString());
      }
    } else {
      handlePriceEurChange(v);
      // Try to update USD from EUR if we have the rate
      const p = parseFloat(v);
      if (p > 0 && hasUsdRate) {
        const rate = prices[asset].usd / prices[asset].eur;
        setPriceUsd((p * rate).toString());
      }
    }
  };

  const currentPriceInput = priceCurrency === 'USD' ? priceUsd : priceEur;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || !asset || !amountEur || !priceEur) { setError('Fill in all fields'); return; }
    const parsedAmount = parseFloat(amountEur);
    const parsedPrice = parseFloat(priceEur);
    if (isNaN(parsedAmount) || parsedAmount <= 0) { setError('Amount must be greater than zero'); return; }
    if (isNaN(parsedPrice) || parsedPrice <= 0) { setError('Price must be greater than zero'); return; }

    setSubmitting(true);
    try {
      const usd = isCrypto ? parseFloat(priceUsd) || 0 : 0;
      await api.addPurchase(date, asset, parsedAmount, parsedPrice, notes, usd);
      const updatedPurchases = await api.getPurchases();
      setPurchases(updatedPurchases);

      // Funded from a broker? Deduct the invested amount from its dry powder so it stays in sync.
      if (fundedFrom) {
        const pos = cashPositions.find(p => p.id === fundedFrom);
        if (pos) {
          const cur = (pos.currency || 'EUR').toUpperCase();
          const deduction = cur === 'USD' && eurUsdRate ? parsedAmount * eurUsdRate : parsedAmount;
          const newAmount = Math.max(0, (Number(pos.amount_eur) || 0) - deduction);
          try {
            await api.updateCashPosition(pos.id, pos.label, Number(newAmount.toFixed(2)), cur);
            setCashPositions(await api.getCashPositions());
            toast(`${formatEUR(parsedAmount)} deployed from ${pos.label}`, 'success');
          } catch (e) { /* purchase already saved; dry powder sync is best-effort */ }
        }
      }

      setAmountEur(''); setPriceEur(''); setPriceUsd(''); setQty(''); setNotes(''); setFundedFrom('');
      setDate(new Date().toISOString().split('T')[0]);
      setError('');
      toast(`${asset} purchase added`, 'success');
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.deletePurchase(id);
      setPurchases(prev => prev.filter(p => p.id !== id));
      setDeleteConfirm(null);
      toast('Purchase deleted', 'success');
    } catch (err) { setError(err.message); }
  };

  if (loading) return <PageLayout title="Diary" username="" size="md"><PageSkeleton rows={6} /></PageLayout>;
  if (!user) return <div className="loading-screen"><div className="loading-error">Failed to load</div></div>;

  const filteredPurchases = filterAsset === 'ALL' ? purchases : purchases.filter(p => p.asset === filterAsset);

  const assetOptions = assets.map(a => ({ value: a.symbol, label: a.symbol }));
  const selectedAssetName = assets.find(a => a.symbol === asset)?.name || '';
  const filterButtons = ['ALL', ...assets.map(a => a.symbol)];

  return (
    <PageLayout title="Diary" username={user.username} size="md">

      {/* Header */}
      <div className="page-head animate-in">
        <div className="page-head__title">Diary</div>
        <div className="page-head__sub">{purchases.length} transactions · {formatEUR(purchases.reduce((s, p) => s + (p.amount_eur || 0), 0))} invested</div>
      </div>

      {/* === TWO-COLUMN TOP: Log a Purchase | Dry Powder === */}
      <div className="diary-top animate-in-1">

        {/* LEFT — Log a Purchase */}
        <div className="panel">
          <div className="diary-card__head"><span className="diary-card__dot" style={{ background: 'var(--accent)' }} />Log a Purchase</div>
          <form onSubmit={handleSubmit} className="diary-form">
            <div className="form-grid">
              <FormInput label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
              <div className="form-group">
                <label className="form-label">Asset</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select className="form-input" value={asset} onChange={e => setAsset(e.target.value)} style={{ flex: 1, fontWeight: 600 }}>
                    {assetOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <button type="button" className="icon-btn" onClick={() => setShowAddAsset(true)} title="Add new asset" aria-label="Add asset">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
                {selectedAssetName && <div className="form-hint" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedAssetName}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">
                  Price {asset}
                  <span className="mini-toggle" style={{ float: 'right' }}>
                    {['EUR', 'USD'].map(c => (
                      <button
                        key={c} type="button"
                        className={`mini-toggle__btn ${priceCurrency === c ? 'active' : ''}`}
                        onClick={() => setPriceCurrency(c)}
                        disabled={c === 'USD' && !hasUsdRate}
                      >
                        {c}
                      </button>
                    ))}
                  </span>
                </label>
                <input
                  type="number" step="any" className="form-input"
                  value={currentPriceInput}
                  onChange={e => handlePriceInputChange(e.target.value)}
                  placeholder="0.00" disabled={useLivePrice}
                />
                {priceCurrency === 'USD' && priceEur && (
                  <div className="form-hint">≈ {parseFloat(priceEur).toLocaleString('en-US', { minimumFractionDigits: parseFloat(priceEur) < 0.01 ? 8 : 2, maximumFractionDigits: parseFloat(priceEur) < 0.01 ? 8 : 4, useGrouping: 'always' })} €</div>
                )}
              </div>
              <FormInput label="Amount EUR" type="number" step="any" value={amountEur} onChange={e => handleAmountChange(e.target.value)} placeholder="0.00" />
              <FormInput label={`Quantity ${asset || ''}`} type="number" step="any" value={qty} onChange={e => handleQtyChange(e.target.value)} placeholder="0.00" />
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: -6, marginBottom: 12 }}>
              Fill in <strong style={{ color: 'var(--text-2)' }}>Amount EUR</strong> or <strong style={{ color: 'var(--text-2)' }}>Quantity</strong> — the other is computed automatically
            </div>

            <div className="form-row">
              <label className="checkbox-wrapper">
                <input type="checkbox" checked={useLivePrice} onChange={e => setUseLivePrice(e.target.checked)} />
                <span className="checkbox-label">Use live price</span>
              </label>
            </div>

            {cashPositions.length > 0 && (
              <div className="form-group">
                <label className="form-label">Funded From <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
                <select className="form-input" value={fundedFrom} onChange={e => setFundedFrom(e.target.value)}>
                  <option value="">— Don’t touch dry powder —</option>
                  {cashPositions.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({(p.currency || 'EUR').toUpperCase() === 'USD' ? formatUSD(p.amount_eur) : formatEUR(p.amount_eur)})
                    </option>
                  ))}
                </select>
                <div className="form-hint">The invested amount is deducted from this broker’s dry powder.</div>
              </div>
            )}

            <FormInput label="Notes" type="textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add a note..." />
            <AlertMessage type="error" message={error} />

            <div className="diary-form__foot">
              <button type="submit" className="btn btn--primary btn--lg btn--full" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Purchase'}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT — Dry Powder */}
        <div className="panel">
          <div className="diary-card__head">
            <span className="diary-card__dot" style={{ background: 'var(--dry)' }} />Dry Powder
            <span className="diary-card__total" style={{ color: 'var(--dry)' }}>{formatEUR(dryPowderTotal)}</span>
          </div>
          {cashPositions.length > 0 && (
            <div className="dry-list">
              {cashPositions.map(p => {
                const isUsd = (p.currency || 'EUR').toUpperCase() === 'USD';
                return (
                  <div key={p.id} className="dry-row" style={{ opacity: cpEditId === p.id ? 0.5 : 1 }}>
                    <span className="dry-row__dot" />
                    <span className="dry-row__label">{p.label}</span>
                    <span className="dry-row__amount">
                      {isUsd ? formatUSD(p.amount_eur) : formatEUR(p.amount_eur)}
                      {isUsd && eurUsdRate && <span className="dry-row__sub">≈ {formatEUR(toEur(p.amount_eur, 'USD'))}</span>}
                    </span>
                    {cpDeleteConfirm === p.id ? (
                      <span className="dry-row__actions">
                        <button className="btn btn--danger btn--sm" onClick={() => handleCashDelete(p.id)}>Yes</button>
                        <button className="btn btn--ghost btn--sm" onClick={() => setCpDeleteConfirm(null)}>No</button>
                      </span>
                    ) : (
                      <span className="dry-row__actions">
                        <button className="btn btn--ghost btn--sm" onClick={() => handleCashEdit(p)}>Edit</button>
                        <button className="btn btn--danger btn--sm" onClick={() => setCpDeleteConfirm(p.id)}>Delete</button>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <form onSubmit={handleCashSubmit} className={`diary-form ${cashPositions.length > 0 ? 'dry-form' : ''}`}>
            <div className="form-grid">
              <FormInput label="Broker" type="text" value={cpLabel} onChange={e => setCpLabel(e.target.value)} placeholder="e.g. Trade Republic" />
              <div className="form-group">
                <label className="form-label">
                  Amount
                  <span className="mini-toggle" style={{ float: 'right' }}>
                    {['EUR', 'USD'].map(c => (
                      <button
                        key={c} type="button"
                        className={`mini-toggle__btn ${cpCurrency === c ? 'active' : ''}`}
                        onClick={() => setCpCurrency(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </span>
                </label>
                <input type="number" step="any" className="form-input" value={cpAmount} onChange={e => setCpAmount(e.target.value)} placeholder="0.00" />
                {cpCurrency === 'USD' && parseFloat(cpAmount) > 0 && eurUsdRate && (
                  <div className="form-hint">≈ {formatEUR(parseFloat(cpAmount) / eurUsdRate)}</div>
                )}
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: -6, marginBottom: 12 }}>
              {cpEditId ? 'Edit this broker’s parked cash.' : 'Cash parked on a broker, waiting to be invested. Drops automatically when you fund a purchase from it.'}
            </div>
            <div className="diary-form__foot">
              {cpEditId && (
                <button type="button" className="btn btn--ghost btn--lg btn--full" onClick={resetCpForm}>Cancel</button>
              )}
              <button type="submit" className="btn btn--primary btn--lg btn--full" disabled={cpSubmitting}>
                {cpSubmitting ? 'Saving...' : cpEditId ? 'Save Changes' : 'Add Broker'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* === HISTORY — clean rows === */}
      <div className="animate-in-2">
        <div className="section-header">
          <div className="section-header__title">History · {filteredPurchases.length}</div>
          <div className="section-header__actions">
            <div className="filter-bar">
              {filterButtons.map(f => (
                <button key={f} className={`btn btn--ghost btn--sm ${filterAsset === f ? 'active' : ''}`} onClick={() => setFilterAsset(f)}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="panel panel--flush" style={{ padding: '6px 0' }}>
          {filteredPurchases.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No transactions yet</div>
          ) : (
            [...filteredPurchases].sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => (
              <div key={p.id} className="tx-row">
                <AssetBadge asset={p.asset} color={getColor(p.asset)} />
                <span className="tx-row__date">{formatDate(p.date)}</span>
                <div className="tx-row__right">
                  <div className="tx-row__amount">{formatEUR(p.amount_eur)}</div>
                  <div className="tx-row__detail">{formatQty(p.quantity, getDecimals(p.asset))} {p.asset} @ {formatEUR(p.price_eur)}</div>
                </div>
                <div className="tx-row__actions">
                  {deleteConfirm === p.id ? (
                    <div className="delete-actions">
                      <button className="btn btn--danger btn--sm" onClick={() => handleDelete(p.id)}>Yes</button>
                      <button className="btn btn--ghost btn--sm" onClick={() => setDeleteConfirm(null)}>No</button>
                    </div>
                  ) : (
                    <button className="btn btn--ghost btn--sm" onClick={() => setDeleteConfirm(p.id)}>Delete</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showAddAsset && (
        <AddAssetModal
          existingAssets={assets}
          onClose={() => setShowAddAsset(false)}
          onAdded={handleAssetAdded}
        />
      )}
    </PageLayout>
  );
}
