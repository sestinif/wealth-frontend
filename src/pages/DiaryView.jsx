import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHead from '../components/PageHead';
import StatRow from '../components/StatRow';
import Tabs from '../components/Tabs';
import LedgerRow from '../components/LedgerRow';
import DetailSheet from '../components/DetailSheet';
import Avatar from '../components/Avatar';
import Money from '../components/Money';
import { formatEUR, formatUSD, formatPrice, formatDay, formatDayLong, formatMonth } from '../utils/format';
import { buildLedger, filterLedger, groupByMonth, ledgerStats } from '../utils/ledger';
import { assetColor } from '../utils/marks';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'bank', label: 'Bank' },
];

const qty = (n, max) => Number(n).toLocaleString('en-US', { maximumFractionDigits: max, useGrouping: 'always' });
const bankMoney = (en) => ((en.currency || 'USD').toUpperCase() === 'USD' ? formatUSD : formatEUR)(Math.abs(Number(en.amount) || 0));
const direction = (en) => (Number(en.amount) >= 0 ? 'Money In' : 'Money Out');

// Pure view: every purchase and bank movement in one ledger.
export default function DiaryView({ purchases, assets, bankEntries, cashPositions, onDeletePurchase, onEditPurchase, onDeleteBankEntry }) {
  const [tab, setTab] = useState('all');
  const [asset, setAsset] = useState('ALL');
  const [selected, setSelected] = useState(null);   // ledger row id
  const [form, setForm] = useState(null);           // purchase edit draft, null = not editing
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const close = () => { setSelected(null); setForm(null); setError(''); };

  const startEdit = (p) => {
    setError('');
    setForm({ date: p.date, quantity: String(p.quantity), amount: String(p.amount_eur), price: String(p.price_eur), notes: p.notes || '' });
  };
  const setField = (k, v) => setForm(f => {
    const n = { ...f, [k]: v };
    // Price follows amount / quantity until it is typed by hand.
    if (k === 'quantity' || k === 'amount') {
      const q = parseFloat(n.quantity), a = parseFloat(n.amount);
      if (q > 0 && a > 0) n.price = String(Math.round((a / q) * 100) / 100);
    }
    return n;
  });
  const save = async (p) => {
    const v = { date: form.date, quantity: parseFloat(form.quantity), amount: parseFloat(form.amount), price: parseFloat(form.price), notes: form.notes };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date) || !(v.quantity > 0) || !(v.amount > 0) || !(v.price > 0)) {
      setError('Date, quantity, amount and price are all required.'); return;
    }
    setSaving(true); setError('');
    try { await onEditPurchase(p, v); setForm(null); }
    catch (e) { setError(e.message || 'Could not save.'); }
    finally { setSaving(false); }
  };

  const assetOf = (sym) => assets.find(a => a.symbol === sym) || { symbol: sym, name: sym };
  const brokerOf = (p) => cashPositions.find(x => x.id === p.funded_from)?.label;

  const ledger = useMemo(() => buildLedger(purchases, bankEntries), [purchases, bankEntries]);
  const groups = groupByMonth(filterLedger(ledger, { tab, asset }));
  const stats = ledgerStats(purchases);
  const current = ledger.find(r => r.id === selected) || null;

  const describe = (r) => {
    if (r.kind === 'purchase') {
      const p = r.item;
      const a = assetOf(p.asset);
      const from = brokerOf(p);
      return {
        avatar: <Avatar asset={p.asset} color={assetColor(a)} />,
        title: a.name || p.asset,
        sub: `${qty(p.quantity, 8)} ${p.asset} at ${formatPrice(p.price_eur)}${from ? ` · from ${from}` : ''}`,
        subShort: `${qty(p.quantity, 5)} ${p.asset} · ${p.price_eur >= 100 ? formatEUR(p.price_eur, 0) : formatPrice(p.price_eur)}`,
        amount: formatEUR(p.amount_eur),
        tone: '',
      };
    }
    const en = r.item;
    const isIn = Number(en.amount) >= 0;
    return {
      avatar: <Avatar label={en.bank} />,
      title: en.bank,
      sub: en.note || direction(en),
      subShort: en.note || direction(en),
      amount: `${isIn ? '+' : '−'}${bankMoney(en)}`,
      tone: isIn ? 'in' : '',
    };
  };

  const sheet = (() => {
    if (!current) return null;
    const d = describe(current);
    if (current.kind === 'purchase') {
      const p = current.item;
      return {
        avatar: d.avatar, title: d.title, subtitle: 'Purchase',
        amount: <Money value={p.amount_eur} />,
        rows: [
          { label: 'Date', value: formatDayLong(p.date) },
          { label: 'Quantity', value: `${qty(p.quantity, 8)} ${p.asset}` },
          { label: 'Price', value: formatPrice(p.price_eur) },
          { label: 'Funded From', value: brokerOf(p) },
          { label: 'Note', value: p.notes },
        ],
        edit: form ? null : { label: 'Edit Purchase', onClick: () => startEdit(p) },
        danger: form ? null : { label: 'Delete Purchase', onConfirm: async () => { await onDeletePurchase(p.id); close(); } },
        form: form && (
          <div className="m-edit">
            <label className="m-edit__f">Date<input className="form-input" type="date" value={form.date} onChange={e => setField('date', e.target.value)} /></label>
            <label className="m-edit__f">Quantity ({p.asset})<input className="form-input" inputMode="decimal" value={form.quantity} onChange={e => setField('quantity', e.target.value)} /></label>
            <label className="m-edit__f">Amount (EUR)<input className="form-input" inputMode="decimal" value={form.amount} onChange={e => setField('amount', e.target.value)} /></label>
            <label className="m-edit__f">Price (EUR)<input className="form-input" inputMode="decimal" value={form.price} onChange={e => setField('price', e.target.value)} /></label>
            <label className="m-edit__f">Note<input className="form-input" value={form.notes} onChange={e => setField('notes', e.target.value)} /></label>
            {error && <div className="m-edit__err" role="alert">{error}</div>}
            <div className="m-edit__actions">
              <button type="button" className="m-sheet__edit" onClick={() => { setForm(null); setError(''); }} disabled={saving}>Cancel</button>
              <button type="button" className="m-sheet__save" onClick={() => save(p)} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>
        ),
      };
    }
    const en = current.item;
    return {
      avatar: d.avatar, title: d.title, subtitle: 'Bank Movement',
      amount: d.amount,
      rows: [
        { label: 'Date', value: formatDayLong(en.date) },
        { label: 'Type', value: direction(en) },
        { label: 'Note', value: en.note },
      ],
      danger: { label: 'Delete Movement', onConfirm: async () => { await onDeleteBankEntry(en.id); close(); } },
    };
  })();

  const last = stats.lastDate ? formatDay(stats.lastDate) : null;

  return (
    <>
      <PageHead title="Diary" action={{ to: '/add', label: 'Add Movement' }} />

      <StatRow variant="hero"
        items={[
          { label: 'Total Invested', value: <Money value={stats.invested} /> },
          { label: 'Transactions', value: stats.count },
          { label: 'Last Purchase', value: last || '—' },
        ]}
        note={`${stats.count} transactions${last ? ` · last purchase ${last}` : ''}`} />

      <Tabs tabs={TABS} value={tab} onChange={setTab}
        right={tab !== 'bank' && (
          <select className="m-select" aria-label="Filter by asset" value={asset} onChange={(e) => setAsset(e.target.value)}>
            <option value="ALL">All Assets</option>
            {assets.map(a => <option key={a.symbol} value={a.symbol}>{a.symbol}</option>)}
          </select>
        )} />

      {groups.length === 0 ? (
        <div className="m-empty">
          <div>{ledger.length === 0 ? 'No transactions yet' : 'No transactions for this filter'}</div>
          {ledger.length === 0 && <Link to="/add" className="btn btn--primary">Add Movement</Link>}
        </div>
      ) : groups.map(g => (
        <section key={g.key}>
          <div className="m-month">
            <span>{formatMonth(`${g.key}-01`)}</span>
            <span>{g.invested > 0 ? `${formatEUR(g.invested)} invested` : ''}</span>
          </div>
          {g.rows.map(r => {
            const d = describe(r);
            return (
              <LedgerRow key={r.id} date={formatDay(r.date)} avatar={d.avatar} title={d.title}
                sub={d.sub} subShort={d.subShort} amount={d.amount} tone={d.tone}
                onClick={() => setSelected(r.id)} />
            );
          })}
        </section>
      ))}

      <DetailSheet open={!!sheet} onClose={close}
        avatar={sheet?.avatar} title={sheet?.title} subtitle={sheet?.subtitle}
        amount={sheet?.amount} rows={sheet?.form ? [] : sheet?.rows} edit={sheet?.edit} danger={sheet?.danger}>
        {sheet?.form}
      </DetailSheet>
    </>
  );
}
