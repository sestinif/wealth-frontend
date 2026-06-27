import React, { useState, useEffect, useRef } from 'react';
import PageLayout from '../components/PageLayout';
import FormInput from '../components/FormInput';
import AlertMessage from '../components/AlertMessage';
import AssetBadge from '../components/AssetBadge';
import Icon from '../components/Icon';
import { PageSkeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { api } from '../api.js';
import { getDisplayName, setDisplayName as saveDisplayName } from '../utils/user';
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
  const [nameInput, setNameInput] = useState(() => getDisplayName(''));

  const handleSaveName = () => {
    saveDisplayName(nameInput);
    toast(nameInput.trim() ? `Perfect, I'll call you ${nameInput.trim()}` : 'Name reset', 'success');
  };

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
      toast(`${result.symbol} added to portfolio`, 'success');
    } catch (err) { setAssetError(err.message); }
  };

  const handleRemoveAsset = async (symbol) => {
    setAssetError(''); setAssetSuccess('');
    try {
      await api.removeAsset(symbol);
      setAssets(prev => prev.filter(a => a.symbol !== symbol));
      toast(`${symbol} removed`, 'success');
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
    if (!oldPassword || !newPassword || !confirmPassword) { setError('Please fill in all fields'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    if (newPassword.length < 8) { setError('At least 8 characters'); return; }
    setSubmitting(true);
    try {
      await api.changePassword(oldPassword, newPassword);
      setSuccess('Password changed');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
      toast('Password updated', 'success');
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const getPrice = (asset) => {
    const p = prices[asset.symbol];
    if (!p) return '—';
    const isCrypto = asset.asset_type === 'crypto' || asset.asset_type === 'dex_token';
    const val = isCrypto ? (p.usd || p.eur || 0) : (p.eur || 0);
    if (!val || val < 0.000001) return '—';
    return isCrypto ? formatUSD(val) : formatEUR(val);
  };

  if (loading) return <PageLayout title="Settings" username="" size="md"><PageSkeleton rows={5} /></PageLayout>;
  if (!user) return <div className="loading-screen"><div className="loading-error">Error</div></div>;

  return (
    <PageLayout title="Settings" username={user.username} size="md">

      {/* Header */}
      <div className="page-head animate-in">
        <div className="page-head__title">Settings</div>
        <div className="page-head__sub">Manage Portfolio and Account</div>
      </div>

      {/* Tabs */}
      <div className="tab-bar animate-in-1">
        {[['portfolio', 'Portfolio'], ['account', 'Account & Security']].map(([k, l]) => (
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
            <div className="section-header__title">Tracked Assets · {assets.length}</div>
          </div>

          <div className="asset-list mb-24">
            {assets.map(asset => (
              <div key={asset.symbol} className="asset-row">
                <AssetBadge asset={asset.symbol} color={asset.color} />
                <div className="asset-row__price">{getPrice(asset)}</div>
                <input type="color" className="asset-row__color" value={asset.color} onChange={e => handleColorChange(asset.symbol, e.target.value)} title="Change Color" />
                <button className="asset-row__remove" onClick={() => handleRemoveAsset(asset.symbol)} title="Remove" aria-label="Remove"><Icon name="trash" size={14} /></button>
              </div>
            ))}
          </div>

          <div className="section-header">
            <div className="section-header__title">Add New Asset</div>
          </div>

          <div className="panel">
            <div className="search-tabs">
              {[['crypto', 'Crypto'], ['dex', 'DEX / Meme'], ['stock', 'Stock & ETF']].map(([k, l]) => (
                <button key={k} className={`btn btn--ghost btn--sm ${searchType === k ? 'active' : ''}`}
                  onClick={() => { setSearchType(k); setSearchResults([]); setSearchQuery(''); }}>{l}</button>
              ))}
            </div>
            <FormInput
              placeholder={
                searchType === 'crypto' ? 'Search crypto (ethereum, solana...)'
                : searchType === 'dex' ? 'Search meme coin (brett, pepe, wif...)'
                : 'Search ETF/stock (SPY, AAPL...)'
              }
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            />
            {searching && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>Searching...</div>}
            {searchResults.length > 0 && (
              <div className="asset-list" style={{ marginTop: 8 }}>
                {searchResults.map(r => (
                  <div key={r.symbol + (r.coingecko_id || r.yfinance_symbols || '')} className="search-result">
                    {r.thumb ? (
                      <img src={r.thumb} alt={r.symbol} style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(139,123,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#B3A8FF', fontWeight: 600, flexShrink: 0 }}>
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
                    <button className="btn btn--primary btn--sm" onClick={() => handleAddAsset(r)}>Add</button>
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
          <div className="panel" style={{ marginBottom: 20 }}>
            <FormInput label="Display Name" placeholder={user.username} value={nameInput} onChange={e => setNameInput(e.target.value)} />
            <div className="form-hint" style={{ marginBottom: 12 }}>How you'd like to be greeted on the dashboard (e.g. Federico)</div>
            <button className="btn btn--primary btn--sm" onClick={handleSaveName} style={{ marginBottom: 20 }}>Save Name</button>
            <FormInput label="Username" value={user.username} disabled />
            <FormInput label="Email" type="email" value={user.email} disabled />
            <div className="info-text" style={{ marginTop: 4, fontSize: 11 }}>
              Member since {new Date(user.created_at).toLocaleDateString('en-US')}
            </div>
          </div>

          <div className="section-header">
            <div className="section-header__title">Security · Change Password</div>
          </div>
          <div className="panel" style={{ marginBottom: 20 }}>
            <form onSubmit={handleChangePassword}>
              <FormInput label="Current Password" type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
              <FormInput label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <FormInput label="Confirm" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              <AlertMessage type="error" message={error} />
              <AlertMessage type="success" message={success} />
              <button type="submit" className="btn btn--primary btn--full" disabled={submitting}>
                {submitting ? 'Saving...' : 'Update Password'}
              </button>
            </form>
          </div>

          <div className="section-header">
            <div className="section-header__title">Security · Sessions</div>
          </div>
          <div className="panel" style={{ marginBottom: 20 }}>
            <div className="info-text" style={{ marginBottom: 12, fontSize: 12, color: 'var(--text-2)' }}>
              Logs out this and all other devices. You'll need to sign in again.
            </div>
            <button className="btn btn--danger btn--sm" onClick={() => api.logoutAll()}>
              Log Out All Devices
            </button>
          </div>

          <div className="section-header">
            <div className="section-header__title">App Info</div>
          </div>
          <div className="panel">
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
