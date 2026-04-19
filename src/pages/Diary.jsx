import React, { useState, useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import DataTable from '../components/DataTable';
import FormInput from '../components/FormInput';
import AssetBadge from '../components/AssetBadge';
import AlertMessage from '../components/AlertMessage';
import AddAssetModal from '../components/AddAssetModal';
import { useToast } from '../components/Toast';
import { api } from '../api.js';
import { formatEUR, formatQty, formatDate } from '../utils/format';

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

  const handleAssetAdded = async (newAsset) => {
    const [updatedAssets, updatedPrices] = await Promise.all([api.getAssets(), api.getPrices()]);
    setAssets(updatedAssets);
    setPrices(updatedPrices);
    setAsset(newAsset.symbol);
    setShowAddAsset(false);
    toast(`${newAsset.symbol} aggiunto · selezionato per l'acquisto`, 'success');
  };

  const currentAsset = assets.find(a => a.symbol === asset);
  const isCrypto = currentAsset?.asset_type === 'crypto';
  const getDecimals = (sym) => assets.find(a => a.symbol === sym)?.decimals || 2;
  const getColor = (sym) => assets.find(a => a.symbol === sym)?.color || '#8B5CF6';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userData, purchasesData, pricesData, assetsData] = await Promise.all([
          api.getMe(), api.getPurchases(), api.getPrices(), api.getAssets()
        ]);
        setUser(userData);
        setPurchases(purchasesData);
        setPrices(pricesData);
        setAssets(assetsData);
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
    if (!date || !asset || !amountEur || !priceEur) { setError('Completa tutti i campi'); return; }
    const parsedAmount = parseFloat(amountEur);
    const parsedPrice = parseFloat(priceEur);
    if (isNaN(parsedAmount) || parsedAmount <= 0) { setError('Importo deve essere maggiore di zero'); return; }
    if (isNaN(parsedPrice) || parsedPrice <= 0) { setError('Prezzo deve essere maggiore di zero'); return; }

    setSubmitting(true);
    try {
      const usd = isCrypto ? parseFloat(priceUsd) || 0 : 0;
      await api.addPurchase(date, asset, parsedAmount, parsedPrice, notes, usd);
      const updatedPurchases = await api.getPurchases();
      setPurchases(updatedPurchases);
      setAmountEur(''); setPriceEur(''); setPriceUsd(''); setQty(''); setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      setError('');
      toast(`Acquisto ${asset} aggiunto`, 'success');
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.deletePurchase(id);
      setPurchases(prev => prev.filter(p => p.id !== id));
      setDeleteConfirm(null);
      toast('Acquisto eliminato', 'success');
    } catch (err) { setError(err.message); }
  };

  if (loading) return <div className="loading-screen"><div className="loading-logo">W</div><div className="loading-text">CARICAMENTO...</div></div>;
  if (!user) return <div className="loading-screen"><div className="loading-error">Errore nel caricamento</div></div>;

  const filteredPurchases = filterAsset === 'ALL' ? purchases : purchases.filter(p => p.asset === filterAsset);

  const columns = [
    { key: 'date', label: 'Data', sortable: true, render: v => formatDate(v) },
    { key: 'asset', label: 'Asset', sortable: true, render: v => <AssetBadge asset={v} color={getColor(v)} /> },
    { key: 'amount_eur', label: 'Importo', align: 'right', sortable: true, render: v => formatEUR(v) },
    { key: 'quantity', label: 'Quantità', align: 'right', muted: true, sortable: true, render: (v, row) => formatQty(v, getDecimals(row.asset)) },
    { key: 'price_eur', label: 'Prezzo', align: 'right', muted: true, sortable: true, render: v => formatEUR(v) },
  ];

  const renderActions = (row) => {
    if (deleteConfirm === row.id) {
      return (
        <div className="delete-actions">
          <button className="btn btn--danger btn--sm" onClick={() => handleDelete(row.id)}>Sì</button>
          <button className="btn btn--ghost btn--sm" onClick={() => setDeleteConfirm(null)}>No</button>
        </div>
      );
    }
    return <button className="btn btn--danger btn--sm" onClick={() => setDeleteConfirm(row.id)}>Elimina</button>;
  };

  const assetOptions = assets.map(a => ({ value: a.symbol, label: a.symbol }));
  const selectedAssetName = assets.find(a => a.symbol === asset)?.name || '';
  const filterButtons = ['ALL', ...assets.map(a => a.symbol)];

  return (
    <PageLayout title="Diario" username={user.username} size="md">

      {/* Header */}
      <div className="animate-in" style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4, letterSpacing: '-0.3px' }}>
          Diario Acquisti
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
          {purchases.length} acquisti registrati
        </div>
      </div>

      <div className="section-header animate-in-1">
        <div className="section-header__title">Nuovo acquisto</div>
      </div>
      <div className="card section-gap animate-in-1">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <FormInput label="Data" type="date" value={date} onChange={e => setDate(e.target.value)} />
            <div className="form-group">
              <label className="form-label">Asset</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <select className="form-input" value={asset} onChange={e => setAsset(e.target.value)} style={{ flex: 1, fontWeight: 600 }}>
                  {assetOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowAddAsset(true)} title="Aggiungi nuovo asset" style={{ padding: '0 10px', fontSize: 16 }}>+</button>
              </div>
              {selectedAssetName && <div className="form-hint" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedAssetName}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">
                Prezzo {asset}
                <span style={{ float: 'right', display: 'inline-flex', gap: 2 }}>
                  {['EUR', 'USD'].map(c => (
                    <button
                      key={c} type="button"
                      onClick={() => setPriceCurrency(c)}
                      disabled={c === 'USD' && !hasUsdRate}
                      style={{
                        padding: '1px 7px', fontSize: 10, fontWeight: 600,
                        background: priceCurrency === c ? 'var(--accent)' : 'transparent',
                        color: priceCurrency === c ? '#fff' : 'var(--text-3)',
                        border: '1px solid ' + (priceCurrency === c ? 'var(--accent)' : 'var(--border)'),
                        borderRadius: 4, cursor: (c === 'USD' && !hasUsdRate) ? 'not-allowed' : 'pointer',
                        opacity: (c === 'USD' && !hasUsdRate) ? 0.3 : 1,
                      }}>
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
                <div className="form-hint">≈ € {parseFloat(priceEur).toLocaleString('it-IT', { minimumFractionDigits: parseFloat(priceEur) < 0.01 ? 8 : 2, maximumFractionDigits: parseFloat(priceEur) < 0.01 ? 8 : 4 })}</div>
              )}
            </div>
            <FormInput label="Importo EUR" type="number" step="any" value={amountEur} onChange={e => handleAmountChange(e.target.value)} placeholder="0.00" />
            <FormInput label={`Quantità ${asset || ''}`} type="number" step="any" value={qty} onChange={e => handleQtyChange(e.target.value)} placeholder="0.00" />
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: -6, marginBottom: 12 }}>
            Compila <strong style={{ color: 'var(--text-2)' }}>Importo EUR</strong> o <strong style={{ color: 'var(--text-2)' }}>Quantità</strong> — l'altro si calcola automaticamente
          </div>

          <div className="form-row">
            <label className="checkbox-wrapper">
              <input type="checkbox" checked={useLivePrice} onChange={e => setUseLivePrice(e.target.checked)} />
              <span className="checkbox-label">Usa prezzo live</span>
            </label>
          </div>

          <FormInput label="Note" type="textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Aggiungi una nota..." />
          <AlertMessage type="error" message={error} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Aggiunta in corso...' : 'Aggiungi acquisto'}
            </button>
          </div>
        </form>
      </div>

      <div className="animate-in-2">
        <div className="section-header">
          <div className="section-header__title">Storico acquisti · {filteredPurchases.length}</div>
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
        <div className="card overflow-auto" style={{ padding: 0 }}>
          <DataTable columns={columns} data={filteredPurchases} defaultSort={{ key: 'date', direction: 'desc' }} actions={renderActions} />
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
