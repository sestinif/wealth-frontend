import React, { useState, useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import FormInput from '../components/FormInput';
import AlertMessage from '../components/AlertMessage';
import AddAssetModal from '../components/AddAssetModal';
import { useToast } from '../components/Toast';
import { PageSkeleton } from '../components/Skeleton';
import { api } from '../api.js';
import { formatEUR, formatUSD, formatDate } from '../utils/format';

const TABS = [
  { key: 'buy', label: 'Buy Asset' },
  { key: 'bank', label: 'Bank Cash' },
  { key: 'dry', label: 'Dry Powder' },
];

export default function AddMovement() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('buy');

  // Shared data
  const [prices, setPrices] = useState({});
  const [assets, setAssets] = useState([]);
  const [cashPositions, setCashPositions] = useState([]);
  const [bankEntries, setBankEntries] = useState([]);

  // --- Buy asset form ---
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [asset, setAsset] = useState('');
  const [amountEur, setAmountEur] = useState('');
  const [priceEur, setPriceEur] = useState('');
  const [priceUsd, setPriceUsd] = useState('');
  const [notes, setNotes] = useState('');
  const [useLivePrice, setUseLivePrice] = useState(true);
  const [qty, setQty] = useState('');
  const [lastEdited, setLastEdited] = useState('amount');
  const [priceCurrency, setPriceCurrency] = useState('EUR');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [fundedFrom, setFundedFrom] = useState('');

  // --- Bank cash form ---
  const [bank, setBank] = useState('Relay');
  const [newBank, setNewBank] = useState('');
  const [beDirection, setBeDirection] = useState('in');
  const [beAmount, setBeAmount] = useState('');
  const [beCurrency, setBeCurrency] = useState('USD');
  const [beDate, setBeDate] = useState(new Date().toISOString().split('T')[0]);
  const [beNote, setBeNote] = useState('');
  const [beSubmitting, setBeSubmitting] = useState(false);
  const [beDelId, setBeDelId] = useState(null);

  // --- Dry powder form ---
  const [cpLabel, setCpLabel] = useState('');
  const [cpAmount, setCpAmount] = useState('');
  const [cpCurrency, setCpCurrency] = useState('EUR');
  const [cpEditId, setCpEditId] = useState(null);
  const [cpSubmitting, setCpSubmitting] = useState(false);
  const [cpDeleteConfirm, setCpDeleteConfirm] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userData, pricesData, assetsData, cashData, entriesData] = await Promise.all([
          api.getMe(), api.getPrices(), api.getAssets(),
          api.getCashPositions().catch(() => []),
          api.getBankEntries().catch(() => []),
        ]);
        setUser(userData);
        setPrices(pricesData);
        setAssets(assetsData);
        setCashPositions(cashData || []);
        setBankEntries(entriesData || []);
        if (assetsData.length > 0) setAsset(assetsData[0].symbol);
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

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

  // ============ BUY ASSET (moved verbatim from Diary) ============

  const currentAsset = assets.find(a => a.symbol === asset);
  const isCrypto = currentAsset?.asset_type === 'crypto';
  const hasUsdRate = prices[asset]?.eur && prices[asset]?.usd;

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
    if (priceCurrency === 'USD') {
      setPriceUsd(v);
      const p = parseFloat(v);
      if (p > 0 && hasUsdRate) {
        const rate = prices[asset].eur / prices[asset].usd;
        handlePriceEurChange((p * rate).toString());
      }
    } else {
      handlePriceEurChange(v);
      const p = parseFloat(v);
      if (p > 0 && hasUsdRate) {
        const rate = prices[asset].usd / prices[asset].eur;
        setPriceUsd((p * rate).toString());
      }
    }
  };
  const currentPriceInput = priceCurrency === 'USD' ? priceUsd : priceEur;

  const handleAssetAdded = async (newAsset) => {
    const [updatedAssets, updatedPrices] = await Promise.all([api.getAssets(), api.getPrices()]);
    setAssets(updatedAssets);
    setPrices(updatedPrices);
    setAsset(newAsset.symbol);
    setShowAddAsset(false);
    toast(`${newAsset.symbol} added · selected for purchase`, 'success');
  };

  const handleBuySubmit = async (e) => {
    e.preventDefault();
    if (!date || !asset || !amountEur || !priceEur) { setError('Fill in all fields'); return; }
    const parsedAmount = parseFloat(amountEur);
    const parsedPrice = parseFloat(priceEur);
    if (isNaN(parsedAmount) || parsedAmount <= 0) { setError('Amount must be greater than zero'); return; }
    if (isNaN(parsedPrice) || parsedPrice <= 0) { setError('Price must be greater than zero'); return; }

    setSubmitting(true);
    try {
      const usd = isCrypto ? parseFloat(priceUsd) || 0 : 0;

      // Resolve dry-powder funding BEFORE saving, so the link + exact deducted amount
      // (in the broker's currency) are stored on the purchase and can be restored on delete.
      let fundFrom = null, fundDeducted = 0, fundPos = null, fundNewBal = 0, fundCur = 'EUR';
      if (fundedFrom) {
        fundPos = cashPositions.find(p => p.id === fundedFrom) || null;
        if (fundPos) {
          fundCur = (fundPos.currency || 'EUR').toUpperCase();
          const deduction = fundCur === 'USD' && eurUsdRate ? parsedAmount * eurUsdRate : parsedAmount;
          const oldBal = Number(fundPos.amount_eur) || 0;
          fundNewBal = Math.max(0, oldBal - deduction);
          fundDeducted = Number((oldBal - fundNewBal).toFixed(2));
          fundFrom = fundPos.id;
        }
      }

      await api.addPurchase(date, asset, parsedAmount, parsedPrice, notes, usd, fundFrom, fundDeducted);

      if (fundPos) {
        try {
          await api.updateCashPosition(fundPos.id, fundPos.label, Number(fundNewBal.toFixed(2)), fundCur);
          setCashPositions(await api.getCashPositions());
          toast(`${formatEUR(parsedAmount)} deployed from ${fundPos.label}`, 'success');
        } catch (e) { /* purchase already saved; dry powder sync is best-effort */ }
      }

      setAmountEur(''); setPriceEur(''); setPriceUsd(''); setQty(''); setNotes(''); setFundedFrom('');
      setDate(new Date().toISOString().split('T')[0]);
      setError('');
      toast(`${asset} purchase added`, 'success');
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  // ============ BANK CASH ============

  const ledgerBanks = [...new Set(bankEntries.map(en => en.bank))];
  if (!ledgerBanks.includes('Relay')) ledgerBanks.unshift('Relay');
  const isNewBank = bank === '__new__';
  const activeBank = isNewBank ? newBank.trim() : bank;
  const bankRecent = bankEntries.filter(en => en.bank === activeBank).slice(0, 6);
  const bankBalance = bankEntries
    .filter(en => en.bank === activeBank && (en.currency || 'USD').toUpperCase() === beCurrency)
    .reduce((s, en) => s + (Number(en.amount) || 0), 0);

  const handleBankSubmit = async (e) => {
    e.preventDefault();
    const raw = parseFloat(String(beAmount).replace(',', '.'));
    if (!activeBank) { toast('Enter a bank name', 'error'); return; }
    if (!raw || Number.isNaN(raw) || raw <= 0) { toast('Enter a valid amount', 'error'); return; }
    const amount = beDirection === 'out' ? -Math.abs(raw) : Math.abs(raw);
    setBeSubmitting(true);
    try {
      await api.addBankEntry(activeBank, beDate, amount, beCurrency, beNote.trim());
      setBankEntries(await api.getBankEntries());
      if (isNewBank) { setBank(activeBank); setNewBank(''); }
      setBeAmount(''); setBeNote('');
      toast(`${activeBank} updated`, 'success');
    } catch (err) { toast(err.message, 'error'); }
    finally { setBeSubmitting(false); }
  };

  const handleBankEntryDelete = async (id) => {
    try {
      await api.deleteBankEntry(id);
      setBeDelId(null);
      setBankEntries(await api.getBankEntries());
    } catch (err) { toast(err.message, 'error'); }
  };

  // ============ DRY POWDER (moved verbatim from Diary) ============

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

  const dryPowderTotal = cashPositions.reduce((s, p) => s + toEur(Number(p.amount_eur) || 0, p.currency), 0);

  if (loading) return <PageLayout title="Add Movement" username="" size="md"><PageSkeleton rows={6} /></PageLayout>;
  if (!user) return <div className="loading-screen"><div className="loading-error">Failed to load</div></div>;

  const assetOptions = assets.map(a => ({ value: a.symbol, label: a.symbol }));
  const selectedAssetName = assets.find(a => a.symbol === asset)?.name || '';

  return (
    <PageLayout title="Add Movement" username={user.username} size="md">

      <div className="page-head animate-in">
        <div className="page-head__title">Add Movement</div>
        <div className="page-head__sub">One place for every manual entry</div>
      </div>

      {/* Type selector */}
      <div className="seg-tabs animate-in-1">
        {TABS.map(t => (
          <button
            key={t.key} type="button"
            className={`seg-tabs__btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* === BUY ASSET === */}
      {tab === 'buy' && (
        <div className="panel animate-in-2 add-panel">
          <div className="diary-card__head"><span className="diary-card__dot" style={{ background: 'var(--accent)' }} />Buy Asset</div>
          <form onSubmit={handleBuySubmit} className="diary-form">
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
      )}

      {/* === BANK CASH === */}
      {tab === 'bank' && (
        <div className="panel animate-in-2 add-panel">
          <div className="diary-card__head">
            <span className="diary-card__dot" style={{ background: 'var(--cash)' }} />Bank Cash
            {activeBank && !isNewBank && (
              <span className="diary-card__total" style={{ color: 'var(--cash)' }}>
                {beCurrency === 'USD' ? formatUSD(bankBalance) : formatEUR(bankBalance)}
              </span>
            )}
          </div>
          <form onSubmit={handleBankSubmit} className="diary-form">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Bank</label>
                <select className="form-input" value={bank} onChange={e => setBank(e.target.value)} style={{ fontWeight: 600 }}>
                  {ledgerBanks.map(b => <option key={b} value={b}>{b}</option>)}
                  <option value="__new__">+ New bank…</option>
                </select>
              </div>
              {isNewBank && (
                <FormInput label="Bank Name" type="text" value={newBank} onChange={e => setNewBank(e.target.value)} placeholder="e.g. Wise" />
              )}
              <div className="form-group">
                <label className="form-label">Direction</label>
                <div className="dir-toggle">
                  <button type="button" className={`dir-toggle__btn ${beDirection === 'in' ? 'active dir-toggle__btn--in' : ''}`} onClick={() => setBeDirection('in')}>Money In</button>
                  <button type="button" className={`dir-toggle__btn ${beDirection === 'out' ? 'active dir-toggle__btn--out' : ''}`} onClick={() => setBeDirection('out')}>Money Out</button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">
                  Amount
                  <span className="mini-toggle" style={{ float: 'right' }}>
                    {['USD', 'EUR'].map(c => (
                      <button
                        key={c} type="button"
                        className={`mini-toggle__btn ${beCurrency === c ? 'active' : ''}`}
                        onClick={() => setBeCurrency(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </span>
                </label>
                <input type="number" step="any" min="0" className="form-input" value={beAmount} onChange={e => setBeAmount(e.target.value)} placeholder="0.00" />
                {beCurrency === 'USD' && parseFloat(beAmount) > 0 && eurUsdRate && (
                  <div className="form-hint">≈ {formatEUR(parseFloat(beAmount) / eurUsdRate)}</div>
                )}
              </div>
              <FormInput label="Date" type="date" value={beDate} onChange={e => setBeDate(e.target.value)} />
              <FormInput label="Note (optional)" type="text" value={beNote} onChange={e => setBeNote(e.target.value)} placeholder="e.g. Client payment" />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: -6, marginBottom: 12 }}>
              The bank’s balance is the running sum of its movements. It shows up in the dashboard’s Cash panel automatically.
            </div>
            <div className="diary-form__foot">
              <button type="submit" className="btn btn--primary btn--lg btn--full" disabled={beSubmitting}>
                {beSubmitting ? 'Saving...' : beDirection === 'out' ? 'Add Money Out' : 'Add Money In'}
              </button>
            </div>
          </form>

          {bankRecent.length > 0 && (
            <div className="bank-recent">
              <div className="bank-recent__title">Recent · {activeBank}</div>
              {bankRecent.map(en => {
                const enFmt = ((en.currency || 'USD').toUpperCase() === 'USD') ? formatUSD : formatEUR;
                const isIn = Number(en.amount) >= 0;
                return (
                  <div key={en.id} className="cash-entry">
                    <span className="cash-entry__date">{formatDate(en.date)}</span>
                    <span className={`cash-entry__amount ${isIn ? 'cash-entry__amount--in' : 'cash-entry__amount--out'}`}>
                      {isIn ? '+' : '−'}{enFmt(Math.abs(Number(en.amount) || 0))}
                    </span>
                    {en.note ? <span className="cash-entry__note">{en.note}</span> : <span className="cash-entry__note" />}
                    <button type="button" className="cash-entry__del"
                      onClick={() => beDelId === en.id ? handleBankEntryDelete(en.id) : setBeDelId(en.id)}>
                      {beDelId === en.id ? 'Sure?' : '×'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* === DRY POWDER === */}
      {tab === 'dry' && (
        <div className="panel animate-in-2 add-panel">
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
      )}

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
