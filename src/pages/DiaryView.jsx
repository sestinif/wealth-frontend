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
const direction = (en) => (Number(en.amount) >= 0 ? 'Money in' : 'Money out');

// Pure view: every purchase and bank movement in one ledger.
export default function DiaryView({ purchases, assets, bankEntries, cashPositions, onDeletePurchase, onDeleteBankEntry }) {
  const [tab, setTab] = useState('all');
  const [asset, setAsset] = useState('ALL');
  const [selected, setSelected] = useState(null);   // ledger row id

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
          { label: 'Funded from', value: brokerOf(p) },
          { label: 'Note', value: p.notes },
        ],
        danger: { label: 'Delete purchase', onConfirm: async () => { await onDeletePurchase(p.id); setSelected(null); } },
      };
    }
    const en = current.item;
    return {
      avatar: d.avatar, title: d.title, subtitle: 'Bank movement',
      amount: d.amount,
      rows: [
        { label: 'Date', value: formatDayLong(en.date) },
        { label: 'Type', value: direction(en) },
        { label: 'Note', value: en.note },
      ],
      danger: { label: 'Delete movement', onConfirm: async () => { await onDeleteBankEntry(en.id); setSelected(null); } },
    };
  })();

  const last = stats.lastDate ? formatDay(stats.lastDate) : null;

  return (
    <>
      <PageHead title="Diary" action={{ to: '/add', label: 'Add movement' }} />

      <StatRow variant="hero"
        items={[
          { label: 'Total invested', value: <Money value={stats.invested} /> },
          { label: 'Transactions', value: stats.count },
          { label: 'Last purchase', value: last || '—' },
        ]}
        note={`${stats.count} transactions${last ? ` · last purchase ${last}` : ''}`} />

      <Tabs tabs={TABS} value={tab} onChange={setTab}
        right={tab !== 'bank' && (
          <select className="m-select" aria-label="Filter by asset" value={asset} onChange={(e) => setAsset(e.target.value)}>
            <option value="ALL">All assets</option>
            {assets.map(a => <option key={a.symbol} value={a.symbol}>{a.symbol}</option>)}
          </select>
        )} />

      {groups.length === 0 ? (
        <div className="m-empty">
          <div>{ledger.length === 0 ? 'No transactions yet' : 'No transactions for this filter'}</div>
          {ledger.length === 0 && <Link to="/add" className="btn btn--primary">Add movement</Link>}
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

      <DetailSheet open={!!sheet} onClose={() => setSelected(null)}
        avatar={sheet?.avatar} title={sheet?.title} subtitle={sheet?.subtitle}
        amount={sheet?.amount} rows={sheet?.rows} danger={sheet?.danger} />
    </>
  );
}
