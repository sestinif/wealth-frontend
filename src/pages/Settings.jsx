import React, { useState, useEffect, useRef } from 'react';
import PageLayout from '../components/PageLayout';
import PageHead from '../components/PageHead';
import Tabs from '../components/Tabs';
import Segmented from '../components/Segmented';
import Field from '../components/Field';
import FormInput from '../components/FormInput';
import AlertMessage from '../components/AlertMessage';
import LedgerRow from '../components/LedgerRow';
import DetailSheet from '../components/DetailSheet';
import Avatar from '../components/Avatar';
import { PageSkeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { api } from '../api.js';
import { getDisplayName, setDisplayName as saveDisplayName } from '../utils/user';
import { formatEUR, formatUSD, formatPrice, formatDayLong } from '../utils/format';
import { assetColor, isReserved } from '../utils/marks';

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

  const [tab, setTab] = useState(() => (
    new URLSearchParams(window.location.search).get('tab') === 'account' ? 'account' : 'portfolio'
  )); // portfolio | account
  const [assetSel, setAssetSel] = useState(null);   // asset symbol open in the sheet
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
    } catch (err) { toast(err.message, 'error'); }
  };

  // Signing out of every device is hard to undo and sits right under the password
  // form, so it takes two taps: the first arms it, the second does it. The
  // armed state clears itself after 4 seconds.
  const [logoutArmed, setLogoutArmed] = useState(false);
  useEffect(() => {
    if (!logoutArmed) return;
    const t = setTimeout(() => setLogoutArmed(false), 4000);
    return () => clearTimeout(t);
  }, [logoutArmed]);
  const handleLogoutAll = async () => {
    if (!logoutArmed) { setLogoutArmed(true); return; }
    setLogoutArmed(false);
    try { await api.logoutAll(); } catch (err) { toast(err.message, 'error'); }
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
    return formatPrice(val, isCrypto ? 'USD' : 'EUR');
  };

  if (loading) return <PageLayout title="Settings" username="" size="md"><PageSkeleton rows={5} /></PageLayout>;
  if (!user) return <div className="loading-screen"><div className="loading-error">Error</div></div>;

  const typeLabel = (t) => (t === 'crypto' ? 'Crypto' : t === 'dex_token' ? 'DEX token' : 'Stock or ETF');
  const sheetAsset = assets.find(a => a.symbol === assetSel) || null;

  return (
    <PageLayout title="Settings" username={user.username} size="md">
      <PageHead title="Settings" />
      <Tabs tabs={[{ key: 'portfolio', label: 'Portfolio' }, { key: 'account', label: 'Account' }]}
        value={tab} onChange={setTab} />

      {/* === PORTFOLIO TAB === */}
      {tab === 'portfolio' && (
        <div>
          <AlertMessage type="error" message={assetError} />
          <AlertMessage type="success" message={assetSuccess} />

          <div className="m-section"><span>Tracked assets</span><span>{assets.length}</span></div>
          {assets.map(asset => (
            <LedgerRow key={asset.symbol} date="" avatar={<Avatar asset={asset.symbol} color={assetColor(asset)} />}
              title={asset.name || asset.symbol} sub={asset.name ? asset.symbol : ''}
              amount={getPrice(asset)} onClick={() => setAssetSel(asset.symbol)} />
          ))}

          <div className="m-section"><span>Add an asset</span></div>
          <div className="m-form">
            <Field>
              <Segmented options={[{ key: 'crypto', label: 'Crypto' }, { key: 'dex', label: 'DEX and meme' }, { key: 'stock', label: 'Stocks and ETFs' }]}
                value={searchType}
                onChange={(k) => { setSearchType(k); setSearchResults([]); setSearchQuery(''); }} />
            </Field>
            <FormInput
              placeholder={
                searchType === 'crypto' ? 'Search crypto (ethereum, solana…)'
                : searchType === 'dex' ? 'Search meme coins (brett, pepe, wif…)'
                : 'Search stocks or ETFs (spy, aapl…)'
              }
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            />
            {searching && <div className="m-caption">Searching…</div>}
            {searchResults.map(r => (
              <div key={r.symbol + (r.coingecko_id || r.yfinance_symbols || '')} className="m-setrow">
                {r.thumb
                  ? <span className="m-avatar"><img src={r.thumb} alt="" /></span>
                  : <Avatar label={r.symbol} />}
                <span className="m-row__main">
                  <span className="m-row__title">{r.name || r.symbol}</span>
                  <span className="m-row__sub">{[r.symbol, r.coingecko_id].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="m-setrow__price">
                  {r.price_usd ? formatUSD(r.price_usd) : r.price_eur ? formatEUR(r.price_eur) : '—'}
                </span>
                <button className="btn btn--primary btn--sm" onClick={() => handleAddAsset(r)}>Add</button>
              </div>
            ))}
          </div>

          <DetailSheet open={!!sheetAsset} onClose={() => setAssetSel(null)}
            avatar={sheetAsset ? <Avatar asset={sheetAsset.symbol} color={assetColor(sheetAsset)} /> : null}
            title={sheetAsset ? (sheetAsset.name || sheetAsset.symbol) : ''}
            subtitle={sheetAsset && sheetAsset.name ? sheetAsset.symbol : undefined}
            rows={sheetAsset ? [
              { label: 'Price', value: getPrice(sheetAsset) },
              { label: 'Type', value: typeLabel(sheetAsset.asset_type) },
            ] : []}
            danger={sheetAsset ? {
              label: 'Remove asset',
              onConfirm: async () => { await handleRemoveAsset(sheetAsset.symbol); setAssetSel(null); },
            } : undefined}>
            {sheetAsset && (
              <div className="m-sheet__row">
                <span>Colour</span>
                <input type="color" className="m-color" value={sheetAsset.color}
                  onChange={e => handleColorChange(sheetAsset.symbol, e.target.value)} aria-label="Colour" />
              </div>
            )}
            {sheetAsset && isReserved(sheetAsset.color) && (
              <div className="m-caption">Green and red are kept for gains and losses, so this asset shows in another tint. Pick a different colour to use your own.</div>
            )}
          </DetailSheet>
        </div>
      )}

      {/* === ACCOUNT TAB === */}
      {tab === 'account' && (
        <div className="m-form">
          <div className="m-section"><span>Account</span></div>
          <FormInput label="Display name" placeholder={user.username} value={nameInput} onChange={e => setNameInput(e.target.value)} />
          <div className="form-hint m-after">How you'd like to be greeted on the dashboard (for example Federico)</div>
          <button className="btn btn--primary" onClick={handleSaveName} style={{ marginBottom: 20 }}>Save name</button>
          <FormInput label="Username" value={user.username} disabled />
          <FormInput label="Email" type="email" value={user.email} disabled />
          <div className="m-caption">Member since {formatDayLong(user.created_at)}</div>

          <div className="m-section"><span>Password</span></div>
          <form onSubmit={handleChangePassword}>
            <FormInput label="Current password" type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
            <FormInput label="New password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <FormInput label="Confirm password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            <AlertMessage type="error" message={error} />
            <AlertMessage type="success" message={success} />
            <button type="submit" className="btn btn--primary btn--lg btn--full" disabled={submitting}>
              {submitting ? 'Saving…' : 'Update password'}
            </button>
          </form>

          <div className="m-section"><span>Sessions</span></div>
          <div className="m-caption" style={{ marginTop: 0, marginBottom: 12 }}>
            Logs out this and all other devices. You'll need to sign in again.
          </div>
          <button className="btn btn--danger" onClick={handleLogoutAll}>
            {logoutArmed ? 'Tap again to confirm' : 'Log out all devices'}
          </button>

          <div className="m-section"><span>About</span></div>
          <div className="m-caption" style={{ marginTop: 0 }}>Wealth 3.0</div>
        </div>
      )}

    </PageLayout>
  );
}
