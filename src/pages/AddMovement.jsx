import React, { useState, useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import PageHead from '../components/PageHead';
import Tabs from '../components/Tabs';
import Field from '../components/Field';
import AmountField from '../components/AmountField';
import Segmented from '../components/Segmented';
import Pick from '../components/Pick';
import LedgerRow from '../components/LedgerRow';
import DetailSheet from '../components/DetailSheet';
import Avatar from '../components/Avatar';
import AlertMessage from '../components/AlertMessage';
import AddAssetModal from '../components/AddAssetModal';
import { useToast } from '../components/Toast';
import { PageSkeleton } from '../components/Skeleton';
import { api } from '../api.js';
import { formatEUR, formatUSD, formatPrice, formatDay, formatDayLong, localDay } from '../utils/format';
import { planFunding } from '../utils/purchase';

// Says when the looked-up price is from, if it is not the exact minute asked (markets closed, daily data only).
const priceNote = (p, ts) => {
  if (p.precision === 'day') return 'Daily close, no intraday data that far back';
  const gapMin = Math.round((ts - new Date(p.as_of).getTime() / 1000) / 60);
  if (gapMin > 15) return `Last price before then, from ${new Date(p.as_of).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
  return 'At that date and time';
};

const localTime = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

const TABS = [
  { key: 'buy', label: 'Purchase' },
  { key: 'bank', label: 'Bank' },
  { key: 'dry', label: 'Dry powder' },
];

export default function AddMovement() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    return ['buy', 'bank', 'dry'].includes(t) ? t : 'buy';
  });

  // Shared data
  const [prices, setPrices] = useState({});
  const [assets, setAssets] = useState([]);
  const [cashPositions, setCashPositions] = useState([]);
  const [bankEntries, setBankEntries] = useState([]);

  // --- Buy asset form ---
  const [date, setDate] = useState(localDay());
  const [asset, setAsset] = useState('');
  const [amountEur, setAmountEur] = useState('');
  const [priceEur, setPriceEur] = useState('');
  const [priceUsd, setPriceUsd] = useState('');
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [fundedFrom, setFundedFrom] = useState('');
  // Time of the buy + the market price looked up for that minute
  const [time, setTime] = useState(localTime());
  const [histState, setHistState] = useState({ loading: false, error: '', note: '' });

  // --- Bank cash form ---
  const [bank, setBank] = useState('Relay');
  const [newBank, setNewBank] = useState('');
  const [beDirection, setBeDirection] = useState('in');
  const [beAmount, setBeAmount] = useState('');
  const [beCurrency, setBeCurrency] = useState('USD');
  const [beDate, setBeDate] = useState(localDay());
  const [beNote, setBeNote] = useState('');
  const [beSubmitting, setBeSubmitting] = useState(false);
  const [bankSel, setBankSel] = useState(null);   // bank entry id open in the sheet

  // --- Dry powder form ---
  const [cpLabel, setCpLabel] = useState('');
  const [cpAmount, setCpAmount] = useState('');
  const [cpCurrency, setCpCurrency] = useState('EUR');
  const [cpEditId, setCpEditId] = useState(null);
  const [cpSubmitting, setCpSubmitting] = useState(false);
  const [cashSel, setCashSel] = useState(null);   // broker id open in the sheet

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
  // Every asset is entered the same way: quantity + date + time, price looked up at that minute.
  const hasAsset = !!currentAsset;
  // Shares and ETF units are bought whole; crypto is not.
  const wholeOnly = currentAsset?.asset_type === 'stock_etf';

  // Price = market price at the entered date + time (editable); amount = quantity × price.
  // Quantity is typed (what really landed in the account), so it is stored exactly.
  useEffect(() => {
    if (!hasAsset || !asset || !date || !time) return;
    const ts = new Date(`${date}T${time}`).getTime() / 1000;
    if (!ts) return;
    let cancelled = false;
    setHistState({ loading: true, error: '', note: '' });
    const t = setTimeout(async () => {
      try {
        const p = await api.getHistoricalPrice(asset, ts);
        if (cancelled) return;
        setPriceEur(String(p.eur));
        setPriceUsd(p.usd ? String(p.usd) : '');
        setHistState({ loading: false, error: '', note: priceNote(p, ts) });
      } catch (err) {
        if (cancelled) return;
        setPriceEur(''); setPriceUsd('');
        setHistState({ loading: false, error: `${err.message}. Type the price yourself.`, note: '' });
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [hasAsset, asset, date, time]);

  useEffect(() => {
    const q = parseFloat(qty);
    const p = parseFloat(priceEur);
    setAmountEur(q > 0 && p > 0 ? (q * p).toFixed(2) : '');
  }, [qty, priceEur]);

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
    if (!(parseFloat(qty) > 0)) { setError('Enter the quantity you received'); return; }
    if (wholeOnly && !Number.isInteger(Number(qty))) { setError('Shares are whole numbers. Enter how many you bought, without decimals.'); return; }
    if (!priceEur) { setError(histState.error || 'Market price not available for that time'); return; }
    if (!date || !asset || !amountEur || !priceEur) { setError('Fill in all fields'); return; }
    const parsedAmount = parseFloat(amountEur);
    const parsedPrice = parseFloat(priceEur);
    if (isNaN(parsedAmount) || parsedAmount <= 0) { setError('Amount must be greater than zero'); return; }
    if (isNaN(parsedPrice) || parsedPrice <= 0) { setError('Price must be greater than zero'); return; }

    setSubmitting(true);
    try {
      const usd = parseFloat(priceUsd) || 0;

      // Resolve dry-powder funding BEFORE saving, so the link + exact deducted amount
      // (in the broker's currency) are stored on the purchase and can be restored on delete.
      const fundPos = fundedFrom ? cashPositions.find(p => p.id === fundedFrom) || null : null;
      const plan = planFunding(fundPos, parsedAmount, eurUsdRate);

      // The typed quantity is the source of truth (the stored price is rounded).
      const exactQty = parseFloat(qty);
      await api.addPurchase(date, asset, parsedAmount, parsedPrice, notes, usd, plan?.fundFrom ?? null, plan?.deducted ?? 0, exactQty);

      if (plan) {
        try {
          await api.updateCashPosition(fundPos.id, fundPos.label, plan.newBalance, plan.currency, '', 'purchase');
          setCashPositions(await api.getCashPositions());
          toast(`${formatEUR(parsedAmount)} deployed from ${fundPos.label}`, 'success');
        } catch (e) {
          // The purchase is saved, so say plainly that the broker is now out of step.
          // Silent, it left the balance too high and deleting the purchase later
          // would have put back money that was never taken.
          const fmt = plan.currency === 'USD' ? formatUSD : formatEUR;
          toast(`Purchase saved, but ${fundPos.label} wasn’t updated. Set its balance to ${fmt(plan.newBalance)} by hand.`, 'error');
        }
      }

      // Back to a blank form. Date and time go back to now, and the price follows them.
      setAmountEur(''); setQty(''); setNotes(''); setFundedFrom('');
      setDate(localDay()); setTime(localTime());
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
      if (cpEditId === id) resetCpForm();
      toast('Dry powder removed', 'success');
    } catch (err) { toast(err.message, 'error'); }
  };

  const dryPowderTotal = cashPositions.reduce((s, p) => s + toEur(Number(p.amount_eur) || 0, p.currency), 0);

  if (loading) return <PageLayout title="Add movement" username="" size="md"><PageSkeleton rows={6} /></PageLayout>;
  if (!user) return <div className="loading-screen"><div className="loading-error">Failed to load</div></div>;

  const curFmt = (cur) => ((cur || 'EUR').toUpperCase() === 'USD' ? formatUSD : formatEUR);
  const bankSheetEntry = bankEntries.find(en => en.id === bankSel) || null;
  const cashSheetPos = cashPositions.find(p => p.id === cashSel) || null;
  const bankIn = bankSheetEntry ? Number(bankSheetEntry.amount) >= 0 : false;

  return (
    <PageLayout title="Add movement" username={user.username} size="md">
      <PageHead title="Add movement" />
      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      <div className="m-form" style={{ marginTop: 22 }}>

        {/* === PURCHASE === */}
        {tab === 'buy' && (
          <form onSubmit={handleBuySubmit}>
            <Field label="Asset" right={<button type="button" className="m-link" onClick={() => setShowAddAsset(true)}>New asset</button>}>
              <select className="form-input" value={asset} onChange={e => setAsset(e.target.value)}>
                {assets.map(a => <option key={a.symbol} value={a.symbol}>{`${a.name || a.symbol} · ${a.symbol}`}</option>)}
              </select>
            </Field>

            <Field label={wholeOnly ? 'Shares' : 'Quantity'} hint={wholeOnly ? 'Whole shares only.' : 'The exact amount you received.'}>
              <input className="form-input" type="number" step={wholeOnly ? 1 : 'any'} min={wholeOnly ? 1 : undefined}
                inputMode={wholeOnly ? 'numeric' : 'decimal'} placeholder={wholeOnly ? '0' : '0.00000000'} value={qty}
                onChange={e => setQty(e.target.value)} />
            </Field>

            <div className="m-g2">
              <Field label="Date">
                <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
              </Field>
              <Field label="Time">
                <input className="form-input" type="time" value={time} onChange={e => setTime(e.target.value)} />
              </Field>
            </div>

            <div className="m-g2">
              <Field label="Price (€)" hint={histState.error || (histState.loading ? 'Looking up the price…' : histState.note)}>
                <input className="form-input" type="number" step="any" value={priceEur} placeholder="—"
                  onChange={e => { setPriceEur(e.target.value); setPriceUsd(''); setHistState(h => ({ ...h, error: '', note: 'Typed by you' })); }} />
              </Field>
              <Field label="Amount invested" hint="Quantity × market price">
                <input className="form-input" type="text" readOnly value={amountEur ? formatEUR(parseFloat(amountEur)) : ''} placeholder="—" />
              </Field>
            </div>

            {cashPositions.length > 0 && (
              <Field label="Funded from" hint={fundedFrom ? 'Deducted from this broker’s dry powder.' : undefined}>
                <select className="form-input" value={fundedFrom} onChange={e => setFundedFrom(e.target.value)}>
                  <option value="">None</option>
                  {cashPositions.map(p => (
                    <option key={p.id} value={p.id}>{`${p.label} (${curFmt(p.currency)(p.amount_eur)})`}</option>
                  ))}
                </select>
              </Field>
            )}

            <Field label="Note">
              <input className="form-input" type="text" placeholder="Optional" value={notes} onChange={e => setNotes(e.target.value)} />
            </Field>

            <AlertMessage type="error" message={error} />
            <button type="submit" className="btn btn--primary btn--lg btn--full" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add purchase'}
            </button>
          </form>
        )}

        {/* === BANK === */}
        {tab === 'bank' && (
          <>
            <form onSubmit={handleBankSubmit}>
              <Field>
                <Segmented options={[{ key: 'in', label: 'Money in' }, { key: 'out', label: 'Money out' }]}
                  value={beDirection} onChange={setBeDirection} />
              </Field>

              <Field label="Bank"
                right={activeBank && !isNewBank ? <span>Balance {curFmt(beCurrency)(bankBalance)}</span> : null}>
                <select className="form-input" value={bank} onChange={e => setBank(e.target.value)}>
                  {ledgerBanks.map(b => <option key={b} value={b}>{b}</option>)}
                  <option value="__new__">New bank…</option>
                </select>
              </Field>

              {isNewBank && (
                <Field label="Bank name">
                  <input className="form-input" type="text" placeholder="Wise" value={newBank} onChange={e => setNewBank(e.target.value)} />
                </Field>
              )}

              <AmountField label="Amount" right={<Pick options={['USD', 'EUR']} value={beCurrency} onChange={setBeCurrency} />}
                symbol={beCurrency === 'USD' ? '$' : '€'} value={beAmount} onChange={setBeAmount}
                caption={beCurrency === 'USD' && parseFloat(beAmount) > 0 && eurUsdRate ? `About ${formatEUR(parseFloat(beAmount) / eurUsdRate)}` : undefined} />

              <div className="m-g2">
                <Field label="Date">
                  <input className="form-input" type="date" value={beDate} onChange={e => setBeDate(e.target.value)} />
                </Field>
                <Field label="Note">
                  <input className="form-input" type="text" placeholder="Optional" value={beNote} onChange={e => setBeNote(e.target.value)} />
                </Field>
              </div>

              <button type="submit" className="btn btn--primary btn--lg btn--full" disabled={beSubmitting}>
                {beSubmitting ? 'Saving…' : beDirection === 'out' ? 'Add money out' : 'Add money in'}
              </button>
            </form>

            {bankRecent.length > 0 && (
              <>
                <div className="m-section"><span>Recent in {activeBank}</span></div>
                {bankRecent.map(en => {
                  const enFmt = curFmt(en.currency || 'USD');
                  const isIn = Number(en.amount) >= 0;
                  const kind = isIn ? 'Money in' : 'Money out';
                  return (
                    <LedgerRow key={en.id} date={formatDay(en.date)} avatar={<Avatar label={en.bank} />}
                      title={en.note || kind} sub={en.note ? kind : ''}
                      amount={`${isIn ? '+' : '−'}${enFmt(Math.abs(Number(en.amount) || 0))}`}
                      tone={isIn ? 'in' : ''} onClick={() => setBankSel(en.id)} />
                  );
                })}
              </>
            )}
          </>
        )}

        {/* === DRY POWDER === */}
        {tab === 'dry' && (
          <>
            {cashPositions.length > 0 && (
              <>
                <div className="m-section"><span>Brokers</span><span>{formatEUR(dryPowderTotal)}</span></div>
                {cashPositions.map(p => {
                  const isUsd = (p.currency || 'EUR').toUpperCase() === 'USD';
                  return (
                    <LedgerRow key={p.id} date="" avatar={<Avatar label={p.label} />} title={p.label}
                      sub={isUsd && eurUsdRate ? `About ${formatEUR(toEur(p.amount_eur, 'USD'))}` : 'Uninvested cash'}
                      amount={curFmt(p.currency)(p.amount_eur)} onClick={() => setCashSel(p.id)} />
                  );
                })}
              </>
            )}

            <div className="m-section"><span>{cpEditId ? 'Edit broker' : 'Add a broker'}</span></div>
            <form onSubmit={handleCashSubmit}>
              <Field label="Broker">
                <input className="form-input" type="text" placeholder="Trade Republic" value={cpLabel} onChange={e => setCpLabel(e.target.value)} />
              </Field>
              <AmountField label="Amount" right={<Pick options={['EUR', 'USD']} value={cpCurrency} onChange={setCpCurrency} />}
                symbol={cpCurrency === 'USD' ? '$' : '€'} value={cpAmount} onChange={setCpAmount}
                caption={cpCurrency === 'USD' && parseFloat(cpAmount) > 0 && eurUsdRate
                  ? `About ${formatEUR(parseFloat(cpAmount) / eurUsdRate)}`
                  : 'Cash parked on a broker, waiting to be invested.'} />
              {cpEditId && (
                <button type="button" className="btn btn--ghost btn--lg btn--full" style={{ marginBottom: 8 }} onClick={resetCpForm}>Cancel</button>
              )}
              <button type="submit" className="btn btn--primary btn--lg btn--full" disabled={cpSubmitting}>
                {cpSubmitting ? 'Saving…' : cpEditId ? 'Save changes' : 'Add broker'}
              </button>
            </form>
          </>
        )}
      </div>

      <DetailSheet open={!!bankSheetEntry} onClose={() => setBankSel(null)}
        avatar={bankSheetEntry ? <Avatar label={bankSheetEntry.bank} /> : null}
        title={bankSheetEntry?.bank} subtitle="Bank movement"
        amount={bankSheetEntry ? `${bankIn ? '+' : '−'}${curFmt(bankSheetEntry.currency || 'USD')(Math.abs(Number(bankSheetEntry.amount) || 0))}` : null}
        rows={bankSheetEntry ? [
          { label: 'Date', value: formatDayLong(bankSheetEntry.date) },
          { label: 'Type', value: bankIn ? 'Money in' : 'Money out' },
          { label: 'Note', value: bankSheetEntry.note },
        ] : []}
        danger={bankSheetEntry ? {
          label: 'Delete movement',
          onConfirm: async () => { await handleBankEntryDelete(bankSheetEntry.id); setBankSel(null); },
        } : undefined} />

      <DetailSheet open={!!cashSheetPos} onClose={() => setCashSel(null)}
        avatar={cashSheetPos ? <Avatar label={cashSheetPos.label} /> : null}
        title={cashSheetPos?.label} subtitle="Broker"
        amount={cashSheetPos ? curFmt(cashSheetPos.currency)(cashSheetPos.amount_eur) : null}
        rows={cashSheetPos ? [{ label: 'Currency', value: (cashSheetPos.currency || 'EUR').toUpperCase() }] : []}
        danger={cashSheetPos ? {
          label: 'Delete broker',
          onConfirm: async () => { await handleCashDelete(cashSheetPos.id); setCashSel(null); },
        } : undefined}>
        {cashSheetPos && (
          <button type="button" className="btn btn--ghost btn--full" style={{ marginTop: 14 }}
            onClick={() => { handleCashEdit(cashSheetPos); setCashSel(null); }}>Edit amount</button>
        )}
      </DetailSheet>

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
