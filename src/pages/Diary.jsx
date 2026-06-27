import React, { useState, useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import DataTable from '../components/DataTable';
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

  useEffect(() => {
    if (useLivePrice && asset && prices[asset]) {
      const priceInfo = prices[asset];
      if (priceCurrency === 'USD' && priceInfo.usd) {
        setPriceUsd(priceInfo.usd.toString());
        if (priceInfo.eur) setPriceEur(priceInfo.eur.toString());
      } else {
        setPriceEur((priceInfo.eur || '').toString());
        setPriceUsd((priceInfo.usd || '').toString());
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
      setAmountEur(''); setPriceEur(''); setPriceUsd(''); setQty(''); setNotes('');
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

  const columns = [
    { key: 'date', label: 'Date', sortable: true, render: v => formatDate(v) },
    { key: 'asset', label: 'Asset', sortable: true, render: v => <AssetBadge asset={v} color={getColor(v)} /> },
    { key: 'amount_eur', label: 'Amount', align: 'right', sortable: true, render: v => formatEUR(v) },
    { key: 'quantity', label: 'Quantity', align: 'right', muted: true, sortable: true, render: (v, row) => formatQty(v, getDecimals(row.asset)) },
    { key: 'price_eur', label: 'Price', align: 'right', muted: true, sortable: true, render: v => formatEUR(v) },
  ];

  const renderActions = (row) => {
    if (deleteConfirm === row.id) {
      return (
        <div className="delete-actions">
          <button className="btn btn--danger btn--sm" onClick={() => handleDelete(row.id)}>Yes</button>
          <button className="btn btn--ghost btn--sm" onClick={() => setDeleteConfirm(null)}>No</button>
        </div>
      );
    }
    return <button className="btn btn--danger btn--sm" onClick={() => setDeleteConfirm(row.id)}>Delete</button>;
  };

  const assetOptions = assets.map(a => ({ value: a.symbol, label: a.symbol }));
  const selectedAssetName = assets.find(a => a.symbol === asset)?.name || '';
  const filterButtons = ['ALL', ...assets.map(a => a.symbol)];

  return (
    <PageLayout title="Diary" username={user.username} size="md">

      {/* Header */}
      <div className="page-head animate-in">
        <div className="page-head__title">Purchase Diary</div>
        <div className="page-head__sub">{purchases.length} purchases logged</div>
      </div>

      <div className="section-header animate-in-1">
        <div className="section-header__title">New Purchase</div>
      </div>
      <div className="panel section-gap animate-in-1">
        <form onSubmit={handleSubmit}>
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

          <FormInput label="Notes" type="textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add a note..." />
          <AlertMessage type="error" message={error} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn--primary btn--lg" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Purchase'}
            </button>
          </div>
        </form>
      </div>

      <div className="animate-in-2">
        <div className="section-header">
          <div className="section-header__title">Purchase History · {filteredPurchases.length}</div>
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
        <div className="panel panel--flush overflow-auto">
          <DataTable columns={columns} data={filteredPurchases} defaultSort={{ key: 'date', direction: 'desc' }} actions={renderActions} />
        </div>
      </div>

      {/* === DRY POWDER — uninvested broker cash === */}
      <div className="animate-in-2" style={{ marginTop: 28 }}>
        <div className="section-header">
          <div className="section-header__title">Dry Powder · Uninvested Cash</div>
          <div className="section-header__meta">
            Total <span style={{ color: 'var(--dry)', fontFamily: 'var(--font-num)' }}>{formatEUR(dryPowderTotal)}</span>
          </div>
        </div>
        <div className="panel section-gap animate-in-2">
          <form onSubmit={handleCashSubmit}>
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
              Cash sitting on a broker, waiting to be invested. Counts toward your net worth but not as invested.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
              {cpEditId && (
                <button type="button" className="btn btn--ghost" onClick={resetCpForm}>Cancel</button>
              )}
              <button type="submit" className="btn btn--primary btn--lg" disabled={cpSubmitting}>
                {cpSubmitting ? 'Saving...' : cpEditId ? 'Save Changes' : 'Add Dry Powder'}
              </button>
            </div>
          </form>
        </div>

        {cashPositions.length > 0 && (
          <div className="panel panel--flush overflow-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Broker</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cashPositions.map(p => (
                  <tr key={p.id} style={{ opacity: cpEditId === p.id ? 0.6 : 1 }}>
                    <td style={{ color: 'var(--text-1)' }}>{p.label}</td>
                    <td className="text-right" style={{ fontFamily: 'var(--font-num)', color: 'var(--text-1)' }}>
                      {(p.currency || 'EUR').toUpperCase() === 'USD' ? formatUSD(p.amount_eur) : formatEUR(p.amount_eur)}
                      {(p.currency || 'EUR').toUpperCase() === 'USD' && eurUsdRate && (
                        <span style={{ color: 'var(--text-3)', fontSize: 11, marginLeft: 6 }}>≈ {formatEUR(toEur(p.amount_eur, 'USD'))}</span>
                      )}
                    </td>
                    <td className="text-right">
                      {cpDeleteConfirm === p.id ? (
                        <div className="delete-actions" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn btn--danger btn--sm" onClick={() => handleCashDelete(p.id)}>Yes</button>
                          <button className="btn btn--ghost btn--sm" onClick={() => setCpDeleteConfirm(null)}>No</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn btn--ghost btn--sm" onClick={() => handleCashEdit(p)}>Edit</button>
                          <button className="btn btn--danger btn--sm" onClick={() => setCpDeleteConfirm(p.id)}>Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
