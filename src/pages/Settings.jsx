import React, { useState, useEffect, useRef } from 'react';
import PageLayout from '../components/PageLayout';
import FormInput from '../components/FormInput';
import AlertMessage from '../components/AlertMessage';
import AssetBadge from '../components/AssetBadge';
import { useToast } from '../components/Toast';
import { api } from '../api.js';
import { formatEUR, formatUSD } from '../utils/format';

export default function Settings() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [tab, setTab] = useState('portfolio'); // portfolio | account

  const [assets, setAssets] = useState([]);
  const [prices, setPrices] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('crypto');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [assetError, setAssetError] = useState('');
  const [assetSuccess, setAssetSuccess] = useState('');
  const searchTimeout = useRef(null);

  useEffect(() => {
    Promise.all([api.getMe(), api.getAssets(), api.getPrices()])
      .then(([u, a, p]) => { setUser(u); setAssets(a); setPrices(p); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await api.searchAssets(searchQuery, searchType);
        const configured = new Set(assets.map(a => a.symbol));
        setSearchResults(results.filter(r => !configured.has(r.symbol)));
      } catch (err) { setSearchResults([]); }
      finally { setSearching(false); }
    }, 400);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchQuery, searchType, assets]);

  const handleAddAsset = async (result) => {
    setAssetError(''); setAssetSuccess('');
    try {
      await api.addAsset({
        symbol: result.symbol, name: result.name, asset_type: result.asset_type,
        coingecko_id: result.coingecko_id || null,
        yfinance_symbols: result.yfinance_symbols || null,
        color: '', decimals: result.asset_type === 'crypto' ? 4 : 2,
      });
      const [updated, newPrices] = await Promise.all([api.getAssets(), api.getPrices()]);
      setAssets(updated); setPrices(newPrices);
      setSearchResults(prev => prev.filter(r => r.symbol !== result.symbol));
      toast(`${result.symbol} aggiunto al portfolio`, 'success');
    } catch (err) { setAssetError(err.message); }
  };

  const handleRemoveAsset = async (symbol) => {
    setAssetError(''); setAssetSuccess('');
    try {
      await api.removeAsset(symbol);
      setAssets(prev => prev.filter(a => a.symbol !== symbol));
      toast(`${symbol} rimosso`, 'success');
    } catch (err) { setAssetError(err.message); }
  };

  const handleColorChange = async (symbol, color) => {
    try {
      await api.updateAssetColor(symbol, color);
      setAssets(prev => prev.map(a => a.symbol === symbol ? { ...a, color } : a));
    } catch (err) {}
  };

  const handleChangePassword = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (!oldPassword || !newPassword || !confirmPassword) { setError('Completa tutti i campi'); return; }
    if (newPassword !== confirmPassword) { setError('Le password non coincidono'); return; }
    if (newPassword.length < 8) { setError('Almeno 8 caratteri'); return; }
    setSubmitting(true);
    try {
      await api.changePassword(oldPassword, newPassword);
      setSuccess('Password cambiata');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      toast('Password aggiornata', 'success');
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const getPrice = (asset) => {
    const p = prices[asset.symbol];
    if (!p) return '—';
    const isCrypto = asset.asset_type === 'crypto' || asset.asset_type === 'dex_token';
    return isCrypto ? formatUSD(p.usd || p.eur || 0) : formatEUR(p.eur || 0);
  };

  if (loading) return <div className="loading-screen"><div className="loading-logo">W</div><div className="loading-text">CARICAMENTO...</div></div>;
  if (!user) return <div className="loading-screen"><div className="loading-error">Errore</div></div>;

  return (
    <PageLayout title="Impostazioni" username={user.username} size="md">

      {/* Header */}
      <div className="animate-in" style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4, letterSpacing: '-0.3px' }}>
          Impostazioni
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
          Gestisci portfolio e account
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar animate-in-1">
        {[['portfolio', 'Portfolio'], ['account', 'Account & Sicurezza']].map(([k, l]) => (
          <button key={k} className={`btn btn--ghost ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>

      {/* === PORTFOLIO TAB === */}
      {tab === 'portfolio' && (
        <div className="animate-in-2">
          <AlertMessage type="error" message={assetError} />
          <AlertMessage type="success" message={assetSuccess} />

          <div className="section-header">
            <div className="section-header__title">Asset tracciati · {assets.length}</div>
          </div>

          <div className="asset-list mb-24">
            {assets.map(asset => (
              <div key={asset.symbol} className="asset-row">
                <AssetBadge asset={asset.symbol} color={asset.color} />
                <div className="asset-row__info">
                  <div className="asset-row__name">{asset.name}</div>
                  <div className="asset-row__type">
                    {asset.asset_type === 'crypto' ? 'Crypto' : asset.asset_type === 'dex_token' ? 'DEX Token' : 'Stock / ETF'}
                  </div>
                </div>
                <div className="asset-row__price">{getPrice(asset)}</div>
                <input type="color" className="asset-row__color" value={asset.color} onChange={e => handleColorChange(asset.symbol, e.target.value)} title="Cambia colore" />
                <button className="btn btn--danger btn--sm" onClick={() => handleRemoveAsset(asset.symbol)} title="Rimuovi">×</button>
              </div>
            ))}
          </div>

          <div className="section-header">
            <div className="section-header__title">Aggiungi nuovo asset</div>
          </div>

          <div className="card">
            <div className="search-tabs">
              {[['crypto', 'Crypto'], ['dex', 'DEX / Meme'], ['stock', 'Stock & ETF']].map(([k, l]) => (
                <button key={k} className={`btn btn--ghost btn--sm ${searchType === k ? 'active' : ''}`}
                  onClick={() => { setSearchType(k); setSearchResults([]); setSearchQuery(''); }}>{l}</button>
              ))}
            </div>
            <FormInput
              placeholder={
                searchType === 'crypto' ? 'Cerca crypto (ethereum, solana...)'
                : searchType === 'dex' ? 'Cerca meme coin (brett, pepe, wif...)'
                : 'Cerca ETF/azione (SPY, AAPL...)'
              }
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            />
            {searching && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>Ricerca...</div>}
            {searchResults.length > 0 && (
              <div className="asset-list" style={{ marginTop: 8 }}>
                {searchResults.map(r => (
                  <div key={r.symbol + (r.coingecko_id || r.yfinance_symbols || '')} className="search-result">
                    {r.thumb ? (
                      <img src={r.thumb} alt={r.symbol} style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#a78bfa', fontWeight: 600, flexShrink: 0 }}>
                        {r.symbol?.slice(0, 2)}
                      </div>
                    )}
                    <div className="search-result__info" style={{ minWidth: 0 }}>
                      <div className="search-result__symbol">{r.symbol}</div>
                      <div className="search-result__name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.name}
                        {r.coingecko_id && <span style={{ opacity: 0.5, marginLeft: 4 }}>· {r.coingecko_id}</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: (r.price_usd || r.price_eur) ? 'var(--text-1)' : 'var(--text-3)', fontWeight: 500, fontVariantNumeric: 'tabular-nums', marginRight: 8, minWidth: 70, textAlign: 'right' }}>
                      {r.price_usd ? formatUSD(r.price_usd) : r.price_eur ? formatEUR(r.price_eur) : '—'}
                    </div>
                    <button className="btn btn--primary btn--sm" onClick={() => handleAddAsset(r)}>Aggiungi</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* === ACCOUNT TAB === */}
      {tab === 'account' && (
        <div className="animate-in-2">
          <div className="section-header">
            <div className="section-header__title">Account</div>
          </div>
          <div className="card" style={{ marginBottom: 20 }}>
            <FormInput label="Username" value={user.username} disabled />
            <FormInput label="Email" type="email" value={user.email} disabled />
            <div className="info-text" style={{ marginTop: 4, fontSize: 11 }}>
              Membro da {new Date(user.created_at).toLocaleDateString('it-IT')}
            </div>
          </div>

          <div className="section-header">
            <div className="section-header__title">Sicurezza · Cambia password</div>
          </div>
          <div className="card" style={{ marginBottom: 20 }}>
            <form onSubmit={handleChangePassword}>
              <FormInput label="Password attuale" type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
              <FormInput label="Nuova password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <FormInput label="Conferma" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              <AlertMessage type="error" message={error} />
              <AlertMessage type="success" message={success} />
              <button type="submit" className="btn btn--primary btn--full" disabled={submitting}>
                {submitting ? 'Salvataggio...' : 'Aggiorna password'}
              </button>
            </form>
          </div>

          <div className="section-header">
            <div className="section-header__title">Informazioni app</div>
          </div>
          <div className="card">
            <div className="info-text">
              <div><span className="info-label">Wealth</span> · v3.0</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Multi-Asset Investment Tracker</div>
            </div>
          </div>
        </div>
      )}

    </PageLayout>
  );
}
