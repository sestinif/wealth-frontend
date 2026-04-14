import React, { useState, useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import DataTable from '../components/DataTable';
import FormInput from '../components/FormInput';
import AssetBadge from '../components/AssetBadge';
import AlertMessage from '../components/AlertMessage';
import { api } from '../api.js';
import { formatEUR, formatQty, formatDate } from '../utils/format';

export default function Diary() {
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
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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

  useEffect(() => {
    if (useLivePrice && asset && prices[asset]) {
      const priceInfo = prices[asset];
      setPriceEur(priceInfo.eur || '');
      if (isCrypto) {
        setPriceUsd(priceInfo.usd || '');
      } else {
        setPriceUsd('');
      }
    }
  }, [asset, useLivePrice, prices, assets]);

  const quantity = amountEur && priceEur ? (parseFloat(amountEur) / parseFloat(priceEur)).toFixed(8) : 0;

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
      setAmountEur(''); setPriceEur(''); setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      setError('');
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.deletePurchase(id);
      setPurchases(prev => prev.filter(p => p.id !== id));
      setDeleteConfirm(null);
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

  const assetOptions = assets.map(a => ({ value: a.symbol, label: `${a.symbol} — ${a.name}` }));
  const filterButtons = ['ALL', ...assets.map(a => a.symbol)];

  return (
    <PageLayout title="Diario" username={user.username} size="md">
      <div className="card section-gap">
        <h2 className="card__title card__title--lg">Aggiungi Acquisto</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <FormInput label="Data" type="date" value={date} onChange={e => setDate(e.target.value)} />
            <FormInput label="Asset" type="select" value={asset} onChange={e => setAsset(e.target.value)} options={assetOptions} />
            <FormInput label="Importo EUR" type="number" step="0.01" value={amountEur} onChange={e => setAmountEur(e.target.value)} placeholder="0.00" />
            {isCrypto ? (
              <div className="form-group">
                <label className="form-label">Prezzo {asset} (USD $)</label>
                <input
                  type="number" step="1" className="form-input"
                  value={priceUsd}
                  onChange={e => {
                    setPriceUsd(e.target.value);
                    if (prices[asset]?.eur && prices[asset]?.usd && parseFloat(e.target.value) > 0) {
                      const rate = prices[asset].eur / prices[asset].usd;
                      setPriceEur((parseFloat(e.target.value) * rate).toFixed(2));
                    }
                  }}
                  placeholder="es. 85000" disabled={useLivePrice}
                />
                {priceEur && <div className="form-hint">≈ {formatEUR(priceEur, 0)}</div>}
              </div>
            ) : (
              <FormInput label="Prezzo EUR" type="number" step="0.01" value={priceEur} onChange={e => setPriceEur(e.target.value)} placeholder="0.00" disabled={useLivePrice} />
            )}
          </div>

          <div className="form-row">
            <label className="checkbox-wrapper">
              <input type="checkbox" checked={useLivePrice} onChange={e => setUseLivePrice(e.target.checked)} />
              <span className="checkbox-label">Usa prezzo live</span>
            </label>
          </div>

          <FormInput label="Note" type="textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Aggiungi una nota..." />
          <AlertMessage type="error" message={error} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="qty-preview">Quantità: <span className="qty-preview__value">{quantity}</span></div>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? 'Aggiunta in corso...' : 'Aggiungi'}
            </button>
          </div>
        </form>
      </div>

      <div className="card overflow-auto">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 className="card__title mb-0">Acquisti</h2>
          <div className="filter-bar">
            {filterButtons.map(f => (
              <button key={f} className={`btn btn--ghost btn--sm ${filterAsset === f ? 'active' : ''}`} onClick={() => setFilterAsset(f)}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <DataTable columns={columns} data={filteredPurchases} defaultSort={{ key: 'date', direction: 'desc' }} actions={renderActions} />
      </div>
    </PageLayout>
  );
}
