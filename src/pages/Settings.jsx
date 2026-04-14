import React, { useState, useEffect, useRef } from 'react';
import PageLayout from '../components/PageLayout';
import FormInput from '../components/FormInput';
import AlertMessage from '../components/AlertMessage';
import AssetBadge from '../components/AssetBadge';
import { api } from '../api.js';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Asset management
  const [assets, setAssets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('crypto');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [assetError, setAssetError] = useState('');
  const [assetSuccess, setAssetSuccess] = useState('');
  const searchTimeout = useRef(null);

  useEffect(() => {
    Promise.all([api.getMe(), api.getAssets()])
      .then(([userData, assetsData]) => { setUser(userData); setAssets(assetsData); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); return; }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await api.searchAssets(searchQuery, searchType);
        // Filter out already configured assets
        const configured = new Set(assets.map(a => a.symbol));
        setSearchResults(results.filter(r => !configured.has(r.symbol)));
      } catch (err) { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);

    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchQuery, searchType, assets]);

  const handleAddAsset = async (result) => {
    setAssetError(''); setAssetSuccess('');
    try {
      await api.addAsset({
        symbol: result.symbol,
        name: result.name,
        asset_type: result.asset_type,
        coingecko_id: result.coingecko_id || null,
        yfinance_symbols: result.yfinance_symbols || null,
        color: '#8B5CF6',
        decimals: result.asset_type === 'crypto' ? 4 : 2,
      });
      const updated = await api.getAssets();
      setAssets(updated);
      setSearchResults(prev => prev.filter(r => r.symbol !== result.symbol));
      setAssetSuccess(`${result.symbol} aggiunto`);
    } catch (err) { setAssetError(err.message); }
  };

  const handleRemoveAsset = async (symbol) => {
    setAssetError(''); setAssetSuccess('');
    try {
      await api.removeAsset(symbol);
      setAssets(prev => prev.filter(a => a.symbol !== symbol));
      setAssetSuccess(`${symbol} rimosso`);
    } catch (err) { setAssetError(err.message); }
  };

  const handleColorChange = async (symbol, color) => {
    try {
      await api.updateAssetColor(symbol, color);
      setAssets(prev => prev.map(a => a.symbol === symbol ? { ...a, color } : a));
    } catch (err) { /* silent */ }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!oldPassword || !newPassword || !confirmPassword) { setError('Completa tutti i campi'); return; }
    if (newPassword !== confirmPassword) { setError('Le password non coincidono'); return; }
    if (newPassword.length < 8) { setError('La nuova password deve avere almeno 8 caratteri'); return; }

    setSubmitting(true);
    try {
      await api.changePassword(oldPassword, newPassword);
      setSuccess('Password cambiata con successo');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) { setError(err.message || 'Errore nel cambio password'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="loading-screen"><div className="loading-logo">W</div><div className="loading-text">CARICAMENTO...</div></div>;
  if (!user) return <div className="loading-screen"><div className="loading-error">Errore nel caricamento</div></div>;

  return (
    <PageLayout title="Impostazioni" username={user.username} size="sm">
      {/* Account */}
      <div className="card section-gap">
        <h3 className="card__title">Account</h3>
        <FormInput label="Username" value={user.username} disabled />
        <FormInput label="Email" type="email" value={user.email} disabled />
        <div className="info-text">
          Membro da {new Date(user.created_at).toLocaleDateString('it-IT')}
        </div>
      </div>

      {/* Asset Configuration */}
      <div className="card section-gap">
        <h3 className="card__title">Configurazione Asset</h3>

        <AlertMessage type="error" message={assetError} />
        <AlertMessage type="success" message={assetSuccess} />

        {/* Current assets */}
        <div className="asset-list mb-24">
          {assets.map(asset => (
            <div key={asset.symbol} className="asset-row">
              <AssetBadge asset={asset.symbol} color={asset.color} />
              <div className="asset-row__info">
                <div className="asset-row__name">{asset.name}</div>
                <div className="asset-row__type">{asset.asset_type === 'crypto' ? 'Crypto' : 'Stock/ETF'}</div>
              </div>
              <input
                type="color"
                className="asset-row__color"
                value={asset.color}
                onChange={e => handleColorChange(asset.symbol, e.target.value)}
              />
              <button className="btn btn--danger btn--sm" onClick={() => handleRemoveAsset(asset.symbol)}>
                Rimuovi
              </button>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="search-tabs">
          {[['crypto', 'Crypto'], ['stock', 'Stock & ETF']].map(([key, label]) => (
            <button key={key} className={`btn btn--ghost btn--sm ${searchType === key ? 'active' : ''}`}
              onClick={() => { setSearchType(key); setSearchResults([]); setSearchQuery(''); }}>
              {label}
            </button>
          ))}
        </div>

        <FormInput
          placeholder={searchType === 'crypto' ? 'Cerca crypto... (es. ethereum, solana)' : 'Cerca ETF/azione... (es. VUAA, SPY, AAPL)'}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />

        {searching && <div className="info-text mb-16">Ricerca in corso...</div>}

        {searchResults.length > 0 && (
          <div className="asset-list">
            {searchResults.map(result => (
              <div key={result.symbol + (result.coingecko_id || '')} className="search-result">
                <div className="search-result__info">
                  <div className="search-result__symbol">{result.symbol}</div>
                  <div className="search-result__name">{result.name}</div>
                </div>
                <button className="btn btn--primary btn--sm" onClick={() => handleAddAsset(result)}>
                  Aggiungi
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="card section-gap">
        <h3 className="card__title">Cambia Password</h3>
        <form onSubmit={handleChangePassword}>
          <FormInput label="Password Attuale" type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
          <FormInput label="Nuova Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          <FormInput label="Conferma Password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          <AlertMessage type="error" message={error} />
          <AlertMessage type="success" message={success} />
          <button type="submit" className="btn btn--primary btn--full" disabled={submitting}>
            {submitting ? 'Cambio in corso...' : 'Cambia Password'}
          </button>
        </form>
      </div>

      {/* App Info */}
      <div className="card">
        <h3 className="card__title">Informazioni App</h3>
        <div className="info-text">
          <div className="mb-16"><span className="info-label">WEALTH</span></div>
          <div>Version: 3.0.0</div>
          <div className="mb-16">Multi-Asset Investment Tracker</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
            Tracking intelligente dei tuoi investimenti con analytics avanzati
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
