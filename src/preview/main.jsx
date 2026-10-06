// Dev-only preview: renders real components with fixtures, no login needed.
// Open /preview.html?p=<key>. Not an entry of `vite build`, so it never ships.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import PageLayout from '../components/PageLayout';
import PageHead from '../components/PageHead';
import StatRow from '../components/StatRow';
import Tabs from '../components/Tabs';
import LedgerRow from '../components/LedgerRow';
import DetailSheet from '../components/DetailSheet';
import Avatar from '../components/Avatar';
import Money from '../components/Money';
import DiaryView from '../pages/DiaryView';
import DashboardView from '../pages/DashboardView';
import * as fixtures from './fixtures';
import '../styles.css';
import '../mercury.css';

const Frame = ({ title, size, children }) => (
  <PageLayout title={title} username="federico" size={size}>{children}</PageLayout>
);

function ComponentsDemo() {
  const [tab, setTab] = React.useState('all');
  const [open, setOpen] = React.useState(new URLSearchParams(window.location.search).has('sheet'));
  return (
    <Frame title="Components" size="md">
      <PageHead title="Components" action={{ to: '/add', label: 'Add movement' }} />
      <StatRow variant="hero" note="70 transactions · last purchase Sep 11" items={[
        { label: 'Total invested', value: <Money value={63195.72} /> },
        { label: 'Transactions', value: 70 },
        { label: 'Last purchase', value: 'Sep 11' },
      ]} />
      <Tabs tabs={[{ key: 'all', label: 'All' }, { key: 'purchases', label: 'Purchases' }, { key: 'bank', label: 'Bank' }]}
        value={tab} onChange={setTab}
        right={<select className="m-select" aria-label="Filter by asset"><option>All assets</option><option>BTC</option></select>} />
      <div className="m-month"><span>September 2026</span><span>€483.59 invested</span></div>
      <LedgerRow date="Sep 11" avatar={<Avatar asset="BTC" />} title="Bitcoin"
        sub="0.00729397 BTC at €66,300.00" subShort="0.00729 BTC · €66,300" amount="€483.59" onClick={() => setOpen(true)} />
      <LedgerRow date="Sep 10" avatar={<Avatar label="Relay" />} title="Relay" sub="Money in" amount="+$3,498.00" tone="in" onClick={() => setOpen(true)} />
      <LedgerRow date="Sep 2" avatar={<Avatar asset="VUAA" />} title="Vanguard FTSE All-World UCITS ETF"
        sub="28.99721699 VUAA at €111.39 · from Degiro" subShort="28.99722 VUAA · €111" amount="€3,230.00" onClick={() => setOpen(true)} />
      <StatRow items={[
        { label: 'Profit', value: <Money value={19883.56} sign />, tone: 'up' },
        { label: 'Return', value: '−95.3%', tone: 'down' },
        { label: 'Invested', value: <Money value={63195.72} /> },
      ]} />
      <DetailSheet open={open} onClose={() => setOpen(false)} avatar={<Avatar asset="BTC" />}
        title="Bitcoin" subtitle="Purchase" amount={<Money value={483.59} />}
        rows={[{ label: 'Date', value: 'Sep 11, 2026' }, { label: 'Quantity', value: '0.00729397 BTC' }, { label: 'Price', value: '€66,300.00' }, { label: 'Note', value: '' }]}
        danger={{ label: 'Delete purchase', onConfirm: () => setOpen(false) }} />
    </Frame>
  );
}

// Stateful so that deleting from the sheet really removes the row.
function DiaryDemo({ empty = false }) {
  const [purchases, setPurchases] = React.useState(empty ? [] : fixtures.purchases);
  const [bank, setBank] = React.useState(empty ? [] : fixtures.bankEntries);
  return (
    <Frame title="Diary" size="md">
      <DiaryView purchases={purchases} assets={fixtures.assets} bankEntries={bank} cashPositions={fixtures.cashPositions}
        onDeletePurchase={(id) => setPurchases(p => p.filter(x => x.id !== id))}
        onDeleteBankEntry={(id) => setBank(b => b.filter(x => x.id !== id))} />
    </Frame>
  );
}

function DashboardDemo({ bare = false }) {
  const [data, setData] = React.useState(fixtures.dashboard);
  const toggle = (symbol, included) => setData(d => ({
    ...d,
    summary: { ...d.summary, by_asset: { ...d.summary.by_asset, [symbol]: { ...d.summary.by_asset[symbol], include_in_totals: !included } } },
  }));
  return (
    <Frame title="Dashboard">
      <DashboardView displayName="Federico" data={data} assets={fixtures.assets}
        networth={bare ? null : fixtures.networth}
        cashPositions={bare ? [] : fixtures.cashPositions}
        history={bare ? [] : fixtures.history}
        marketInfo={fixtures.marketInfo} cacheAge={240} refreshing={false}
        onRefresh={() => {}} onToggleTracking={toggle} />
    </Frame>
  );
}

// Each entry renders one screen. Later tasks add to this map.
const PAGES = {
  frame: () => (
    <Frame title="Frame">
      <div className="page-head"><div className="page-head__title">Foundations</div></div>
      <div className="panel">
        <div className="panel__head"><div className="panel__title">Legacy panel on new tokens</div></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn--primary">Primary</button>
          <button className="btn btn--ghost">Ghost</button>
          <button className="btn btn--ghost active">Ghost active</button>
          <button className="btn btn--danger">Danger</button>
          <label className="toggle"><input type="checkbox" defaultChecked /><span className="toggle__slider" /></label>
        </div>
        <p style={{ marginTop: 16, color: 'var(--text-2)', fontSize: 13 }}>
          Gain <span style={{ color: 'var(--green)' }}>+€342.59</span> · loss <span style={{ color: 'var(--red)' }}>−€99.64</span> · 1234567890
        </p>
      </div>
    </Frame>
  ),
  components: () => <ComponentsDemo />,
  diary: () => <DiaryDemo />,
  'diary-empty': () => <DiaryDemo empty />,
  dashboard: () => <DashboardDemo />,
  'dashboard-bare': () => <DashboardDemo bare />,
};

const key = new URLSearchParams(window.location.search).get('p') || 'frame';
const Page = PAGES[key] || (() => <pre style={{ color: '#EDEDF3', padding: 24 }}>Unknown page. Try: {Object.keys(PAGES).join(', ')}</pre>);

// Hot reloads re-run this module: keep one root per page load.
const container = document.getElementById('root');
const root = container.__previewRoot || (container.__previewRoot = ReactDOM.createRoot(container));

root.render(
  <React.StrictMode>
    <MemoryRouter initialEntries={['/diary']}>
      <ToastProvider><Page /></ToastProvider>
    </MemoryRouter>
  </React.StrictMode>,
);
