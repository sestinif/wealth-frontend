# Wealth «Mercury dark» — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Wealth frontend to the approved Mercury-dark look: new foundations for every page, plus fully rebuilt Diary and Dashboard.

**Architecture:** A new stylesheet `src/mercury.css` is loaded after the legacy `src/styles.css`. It redefines the existing CSS variables (same names, new values), switches off the legacy ornaments, and holds every new component style under an `m-` prefix. Diary and Dashboard are split into a container (fetching, unchanged logic) and a pure view (props in, markup out), so the views can be rendered with fixtures in a dev-only preview page. All maths moves into pure, tested modules in `src/utils/`.

**Tech Stack:** React 18, Vite 6, react-router-dom 6, recharts 2, plain CSS. Tests: Node 20 built-in runner (`node --test`), no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-06-wealth-mercury-redesign-design.md`

## Global Constraints

- Work in `/Users/seastini_f/Claude Code Projects/Internal/App/Wealth/wealth-frontend-main`. Branch `mercury-phase-1` (already checked out). Commit after each task. **Never push** and never switch branch — the owner merges and pushes.
- No backend changes. No new npm dependencies.
- One typeface: Inter, weights 400 and 500 only. No Space Grotesk, no Instrument Serif.
- No text below 12px in anything this plan creates. No `text-transform: uppercase`, no wide `letter-spacing`.
- No gradients, no glow, no grain, no decorative shadows. Only functional shadows (floating button).
- Colour carries one meaning: green `#4FD1A1` = gain or money in, rose `#F58A9B` = loss. Everything else is indigo `#8D9BFF` or grey.
- Money format: symbol first, en-US grouping — `€63,195.72`, `$1,000.00`. Negative uses U+2212: `−€99.64`.
- Legacy CSS variable **names** stay; only values change. Do not delete legacy CSS in this phase.
- Every page touched must look right at **390px wide** and at desktop width.
- No decorative element that the spec does not ask for.
- New component class names start with `m-`.
- UI copy is English, sentence case (`Add movement`, not `Add Movement`).

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `package.json` | modify | add `test` script |
| `index.html` | modify | load Inter 400/500 only, flat background, theme colour |
| `src/main.jsx` | modify | import `mercury.css` after `styles.css` |
| `src/mercury.css` | create | tokens, ornament switches, app frame, base controls, all `m-` components |
| `src/utils/format.js` | modify | symbol-first money, date helpers, `moneyParts`, tooltip style |
| `src/utils/format.test.js` | create | tests for the above |
| `src/utils/ledger.js` | create | merge, filter, group and summarise the Diary ledger |
| `src/utils/ledger.test.js` | create | tests |
| `src/utils/networth.js` | create | EUR/USD rate, net-worth breakdown, chart series |
| `src/utils/networth.test.js` | create | tests |
| `src/components/Icon.jsx` | modify | add `dots` glyph |
| `src/components/Sidebar.jsx` | modify | sentence-case labels, drop subtitle/status and its fetch |
| `src/components/Money.jsx` | create | money figure with dimmed cents |
| `src/components/Avatar.jsx` | create | 32px round asset logo or initials |
| `src/components/PageHead.jsx` | create | page title + primary action |
| `src/components/StatRow.jsx` | create | row of three figures |
| `src/components/Tabs.jsx` | create | underline tabs with a right slot |
| `src/components/LedgerRow.jsx` | create | one Diary row |
| `src/components/DetailSheet.jsx` | create | bottom sheet (phone) / right panel (desktop) with confirmable danger action |
| `src/components/MarketOverview.jsx` | create | the market table, moved out of Dashboard unchanged |
| `src/pages/DiaryView.jsx` | create | pure Diary view |
| `src/pages/Diary.jsx` | modify | container only |
| `src/pages/DashboardView.jsx` | create | pure Dashboard view |
| `src/pages/Dashboard.jsx` | modify | container only |
| `preview.html`, `src/preview/main.jsx`, `src/preview/fixtures.js` | create | dev-only page rendering the views with fixtures (not part of `vite build`) |

## How to verify visually (used by every UI task)

The app cannot be logged into (no password available). Use the preview page.

1. Start the dev server with the Browser tool `preview_start` and `name: "wealth"` (config lives in `Internal/App/.claude/launch.json`, port 5173). Never start it with Bash.
2. Open `http://localhost:5173/preview.html?p=<page>`.
3. Desktop: `resize_window` preset `desktop`, take a screenshot.
4. Phone: `resize_window` with `width: 390, height: 844`, reload, take a screenshot. Reset to `desktop` when done.
5. `read_console_messages` with `onlyErrors: true` must return nothing from our code.

---

### Task 1: Pure helpers — money, dates, ledger, net worth

**Files:**
- Modify: `package.json`
- Modify: `src/utils/format.js`
- Create: `src/utils/format.test.js`, `src/utils/ledger.js`, `src/utils/ledger.test.js`, `src/utils/networth.js`, `src/utils/networth.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces (from `src/utils/format.js`): `formatEUR(value, decimals=2)`, `formatUSD(value, decimals=2)`, `formatPrice(value, currency='EUR')`, `formatPnL(value)`, `formatDay(dateStr)` → `'Sep 11'`, `formatDayLong(dateStr)` → `'Sep 11, 2026'`, `formatMonth(dateStr)` → `'September 2026'`, `moneyParts(value, currency='EUR', decimals=2)` → `{ negative, symbol, int, cents }`. Existing exports (`formatQty`, `formatPct`, `formatDate`, `sortByDate`, `TOOLTIP_STYLE`, `TOOLTIP_LABEL_STYLE`, `TOOLTIP_ITEM_STYLE`, `CHART_GRID`, `yEur`, `CHART_COLORS`, `CHART_OTHER`, `rankedColors`, `allocationSlices`) keep their names.
- Produces (from `src/utils/ledger.js`): `buildLedger(purchases, bankEntries)` → `[{ kind: 'purchase'|'bank', id: string, date: 'YYYY-MM-DD', item }]` newest first; `filterLedger(rows, { tab: 'all'|'purchases'|'bank', asset: 'ALL'|symbol })`; `groupByMonth(rows)` → `[{ key: 'YYYY-MM', invested: number, rows }]`; `ledgerStats(purchases)` → `{ invested, count, lastDate: 'YYYY-MM-DD'|null }`.
- Produces (from `src/utils/networth.js`): `eurUsdRate(prices)` → number|null; `toEur(amount, currency, rate)`; `computeNetWorth({ summary, assets, prices, networth, cashPositions })` → `{ rate, mainAssets, specAssets, cryptoAssets, stockAssets, accounts, crypto, stock, cash, dry, portfolio, total }`; `portfolioSeries30d(purchases, prices, assets, today=new Date())` → `[{ date, value }]`; `PERIODS` = `[['1W',7,'last 7 days'],['1M',30,'last 30 days'],['1Y',365,'last year'],['All',100000,'all time']]`; `periodSeries(history, fallback, period, today=new Date())` → `{ series, usingHistory, delta, deltaPct, label }`.

- [ ] **Step 1: Add the test script**

In `package.json`, replace the `scripts` block with:

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "node --test src/utils/"
  },
```

- [ ] **Step 2: Write the failing format tests**

Create `src/utils/format.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatEUR, formatUSD, formatPrice, formatPnL,
  formatDay, formatDayLong, formatMonth, moneyParts,
} from './format.js';

const MINUS = '−';

test('formatEUR puts the symbol first and groups thousands', () => {
  assert.equal(formatEUR(63195.72), '€63,195.72');
  assert.equal(formatEUR(0), '€0.00');
  assert.equal(formatEUR(66300, 0), '€66,300');
});

test('formatEUR uses a real minus sign, never on a rounded zero', () => {
  assert.equal(formatEUR(-99.64), `${MINUS}€99.64`);
  assert.equal(formatEUR(-0.001), '€0.00');
});

test('formatUSD mirrors formatEUR', () => {
  assert.equal(formatUSD(1000), '$1,000.00');
  assert.equal(formatUSD(-3498), `${MINUS}$3,498.00`);
});

test('formatPrice adapts decimals to the size of the price', () => {
  assert.equal(formatPrice(66300), '€66,300.00');
  assert.equal(formatPrice(0.7474), '€0.7474');
  assert.equal(formatPrice(0.0051), '€0.0051');
  assert.equal(formatPrice(0.000012), '€0.000012');
  assert.equal(formatPrice(120.5, 'USD'), '$120.50');
});

test('formatPnL always shows a sign', () => {
  assert.equal(formatPnL(342.59), '+€342.59');
  assert.equal(formatPnL(-5323.86), `${MINUS}€5,323.86`);
});

test('date helpers do not depend on the local timezone', () => {
  assert.equal(formatDay('2026-09-11'), 'Sep 11');
  assert.equal(formatDay('2026-09-11T23:30:00'), 'Sep 11');
  assert.equal(formatDayLong('2026-09-11'), 'Sep 11, 2026');
  assert.equal(formatMonth('2026-09-01'), 'September 2026');
});

test('moneyParts splits a figure for dimmed cents', () => {
  assert.deepEqual(moneyParts(63195.72), { negative: false, symbol: '€', int: '63,195', cents: '72' });
  assert.deepEqual(moneyParts(-5, 'USD'), { negative: true, symbol: '$', int: '5', cents: '00' });
});
```

- [ ] **Step 3: Run the tests and watch them fail**

Run: `npm test`
Expected: FAIL — `formatDay` is not exported (SyntaxError on import).

- [ ] **Step 4: Rewrite the money and date part of `src/utils/format.js`**

Replace everything from the top of the file down to and including the `formatDate` export (the block that currently defines `formatEUR`, `formatUSD`, `formatQty`, `formatPrice`, `formatPnL`, `formatPct`, `formatDate`) with:

```js
const MINUS = '−';
const group = (n, min, max = min) =>
  Math.abs(Number(n)).toLocaleString('en-US', { minimumFractionDigits: min, maximumFractionDigits: max, useGrouping: 'always' });
// A value that rounds to zero is not negative ("−€0.00" reads as a bug).
const isNegative = (value, digits) => Number(value) < 0 && /[1-9]/.test(digits);
const money = (symbol, value, min, max) => {
  const digits = group(value, min, max);
  return `${isNegative(value, digits) ? MINUS : ''}${symbol}${digits}`;
};

export const formatEUR = (value, decimals = 2) => money('€', value, decimals);
export const formatUSD = (value, decimals = 2) => money('$', value, decimals);

export const formatQty = (value, decimals = 2) => {
  const n = Number(value);
  // Auto decimals for very small values
  let d = decimals;
  if (Math.abs(n) > 0 && Math.abs(n) < 1) d = Math.max(decimals, 4);
  if (Math.abs(n) > 1000) d = Math.min(decimals, 2);
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' });
};

// Adaptive decimals: micro-prices need more digits, without trailing zeros.
export const formatPrice = (value, currency = 'EUR') => {
  const a = Math.abs(Number(value));
  const [min, max] = a > 0 && a < 0.01 ? [4, 8] : a < 1 ? [4, 4] : [2, 2];
  return money(currency === 'USD' ? '$' : '€', value, min, max);
};

export const formatPnL = (value) => `${value >= 0 ? '+' : ''}${formatEUR(value)}`;

export const formatPct = (value) => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(2)}%`;
};

// Legacy numeric date (dd/mm/yyyy) — still used by pages not yet restyled.
export const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('it-IT');

// Calendar dates are stored as YYYY-MM-DD: read them as UTC so the label
// never slips a day in a negative-offset timezone.
const calendar = (dateStr, opts) =>
  new Date(`${String(dateStr).slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', ...opts });
export const formatDay = (dateStr) => calendar(dateStr, { month: 'short', day: 'numeric' });
export const formatDayLong = (dateStr) => calendar(dateStr, { month: 'short', day: 'numeric', year: 'numeric' });
export const formatMonth = (dateStr) => calendar(dateStr, { month: 'long', year: 'numeric' });

// Pieces of a money figure, so the view can dim the cents.
export const moneyParts = (value, currency = 'EUR', decimals = 2) => {
  const digits = group(value, decimals);
  const [int, cents = ''] = digits.split('.');
  return { negative: isNegative(value, digits), symbol: currency === 'USD' ? '$' : '€', int, cents };
};
```

Then, further down in the same file, replace the three tooltip constants (`TOOLTIP_STYLE`, `TOOLTIP_LABEL_STYLE`, `TOOLTIP_ITEM_STYLE`) with:

```js
export const TOOLTIP_STYLE = {
  background: '#23232E',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  padding: '8px 12px',
  fontFamily: "'Inter', sans-serif",
  fontVariantNumeric: 'tabular-nums',
  boxShadow: 'none',
};
export const TOOLTIP_LABEL_STYLE = { color: '#9A9AA8', fontSize: 12, marginBottom: 2 };
export const TOOLTIP_ITEM_STYLE = { color: '#EDEDF3', fontSize: 13 };
```

Leave `sortByDate`, `CHART_GRID`, `yEur`, `CHART_COLORS`, `CHART_OTHER`, `rankedColors`, `allocationSlices` untouched.

- [ ] **Step 5: Run the format tests**

Run: `npm test`
Expected: all 7 tests in `format.test.js` PASS.

- [ ] **Step 6: Write the failing ledger tests**

Create `src/utils/ledger.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLedger, filterLedger, groupByMonth, ledgerStats } from './ledger.js';

const purchases = [
  { id: 'a', date: '2026-06-25', asset: 'BTC', amount_eur: 522.15 },
  { id: 'b', date: '2026-09-11', asset: 'BTC', amount_eur: 483.59 },
  { id: 'c', date: '2026-09-10', asset: 'VUAA', amount_eur: 100 },
];
const bank = [
  { id: 1, date: '2026-10-05', bank: 'Relay', amount: 1000, currency: 'USD' },
  { id: 2, date: '2026-09-10', bank: 'Relay', amount: 3498, currency: 'USD' },
];

test('buildLedger merges both sources, newest first, purchases before bank on the same day', () => {
  const rows = buildLedger(purchases, bank);
  assert.deepEqual(rows.map(r => r.id), ['b-1', 'p-b', 'p-c', 'b-2', 'p-a']);
  assert.equal(rows[1].kind, 'purchase');
  assert.equal(rows[1].item.asset, 'BTC');
});

test('buildLedger tolerates missing inputs and timestamps', () => {
  assert.deepEqual(buildLedger(), []);
  assert.equal(buildLedger([{ id: 'x', date: '2026-01-02T10:00:00', asset: 'BTC', amount_eur: 1 }])[0].date, '2026-01-02');
});

test('filterLedger by tab', () => {
  const rows = buildLedger(purchases, bank);
  assert.equal(filterLedger(rows, { tab: 'purchases' }).length, 3);
  assert.equal(filterLedger(rows, { tab: 'bank' }).length, 2);
  assert.equal(filterLedger(rows).length, 5);
});

test('filterLedger by asset hides bank rows, except on the bank tab where the asset is ignored', () => {
  const rows = buildLedger(purchases, bank);
  assert.deepEqual(filterLedger(rows, { tab: 'all', asset: 'BTC' }).map(r => r.id), ['p-b', 'p-a']);
  assert.equal(filterLedger(rows, { tab: 'bank', asset: 'BTC' }).length, 2);
});

test('groupByMonth keeps order and sums only purchases', () => {
  const groups = groupByMonth(buildLedger(purchases, bank));
  assert.deepEqual(groups.map(g => g.key), ['2026-10', '2026-09', '2026-06']);
  assert.equal(groups[0].invested, 0);
  assert.equal(groups[1].invested, 583.59);
  assert.equal(groups[1].rows.length, 3);
});

test('ledgerStats', () => {
  assert.deepEqual(ledgerStats(purchases), { invested: 1105.74, count: 3, lastDate: '2026-09-11' });
  assert.deepEqual(ledgerStats([]), { invested: 0, count: 0, lastDate: null });
});
```

- [ ] **Step 7: Run and watch them fail**

Run: `npm test`
Expected: FAIL — cannot find module `./ledger.js`.

- [ ] **Step 8: Implement `src/utils/ledger.js`**

```js
// Pure helpers for the Diary: one ledger out of purchases and bank movements.

const dayOf = (d) => String(d || '').slice(0, 10);
const cents = (n) => Math.round(n * 100) / 100;

export function buildLedger(purchases = [], bankEntries = []) {
  const rows = [
    ...purchases.map(p => ({ kind: 'purchase', id: `p-${p.id}`, date: dayOf(p.date), item: p })),
    ...bankEntries.map(b => ({ kind: 'bank', id: `b-${b.id}`, date: dayOf(b.date), item: b })),
  ];
  // Newest first. The sort is stable, so on the same day purchases stay ahead of bank rows.
  return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function filterLedger(rows, { tab = 'all', asset = 'ALL' } = {}) {
  if (tab === 'bank') return rows.filter(r => r.kind === 'bank');
  const byTab = tab === 'purchases' ? rows.filter(r => r.kind === 'purchase') : rows;
  if (asset === 'ALL') return byTab;
  return byTab.filter(r => r.kind === 'purchase' && r.item.asset === asset);
}

// Rows must already be sorted newest first (buildLedger does it).
export function groupByMonth(rows) {
  const groups = [];
  for (const r of rows) {
    const key = r.date.slice(0, 7);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) { g = { key, invested: 0, rows: [] }; groups.push(g); }
    g.rows.push(r);
    if (r.kind === 'purchase') g.invested = cents(g.invested + (Number(r.item.amount_eur) || 0));
  }
  return groups;
}

export function ledgerStats(purchases = []) {
  const invested = cents(purchases.reduce((s, p) => s + (Number(p.amount_eur) || 0), 0));
  const lastDate = purchases.reduce((m, p) => (dayOf(p.date) > m ? dayOf(p.date) : m), '');
  return { invested, count: purchases.length, lastDate: lastDate || null };
}
```

- [ ] **Step 9: Run the ledger tests**

Run: `npm test`
Expected: all tests in `ledger.test.js` PASS.

- [ ] **Step 10: Write the failing net-worth tests**

Create `src/utils/networth.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eurUsdRate, toEur, computeNetWorth, periodSeries, portfolioSeries30d } from './networth.js';

const assets = [
  { symbol: 'BTC', asset_type: 'crypto' },
  { symbol: 'SOL', asset_type: 'dex_token' },
  { symbol: 'VUAA', asset_type: 'stock_etf' },
  { symbol: 'MEME', asset_type: 'crypto' },
  { symbol: 'NONE', asset_type: 'crypto' },
];
const summary = { by_asset: {
  BTC: { value: 12000, include_in_totals: true },
  SOL: { value: 20 },
  VUAA: { value: 68000 },
  MEME: { value: 500, include_in_totals: false },
} };
const prices = { VUAA: { eur: 134, usd: null }, BTC: { eur: 80000, usd: 100000 } };

test('eurUsdRate uses the first asset priced in both currencies', () => {
  assert.equal(eurUsdRate(prices), 1.25);
  assert.equal(eurUsdRate({ VUAA: { eur: 134, usd: null } }), null);
  assert.equal(eurUsdRate(), null);
});

test('toEur converts dollars, and falls back to face value without a rate', () => {
  assert.equal(toEur(1250, 'USD', 1.25), 1000);
  assert.equal(toEur(1250, 'usd', null), 1250);
  assert.equal(toEur(500, 'EUR', 1.25), 500);
  assert.equal(toEur('abc', 'EUR', 1.25), 0);
});

test('computeNetWorth splits by market and converts cash', () => {
  const nw = computeNetWorth({
    summary, assets, prices,
    networth: { external_accounts: [{ name: 'Mercury', currency: 'USD', balance: 2500 }, { name: 'Relay', currency: 'EUR', balance: 100 }] },
    cashPositions: [{ id: 1, label: 'Degiro', amount_eur: 50, currency: 'EUR' }],
  });
  assert.equal(nw.rate, 1.25);
  assert.equal(nw.crypto, 12020);
  assert.equal(nw.stock, 68000);
  assert.equal(nw.cash, 2100);
  assert.equal(nw.dry, 50);
  assert.equal(nw.portfolio, 80020);
  assert.equal(nw.total, 82170);
  assert.deepEqual(nw.mainAssets.map(a => a.symbol), ['BTC', 'SOL', 'VUAA']);
  assert.deepEqual(nw.specAssets.map(a => a.symbol), ['MEME']);
  assert.equal(nw.accounts.length, 2);
});

test('computeNetWorth survives missing pieces', () => {
  const nw = computeNetWorth({ summary: { by_asset: {} } });
  assert.equal(nw.total, 0);
  assert.equal(nw.rate, null);
});

test('periodSeries cuts the history to the period and reports the change', () => {
  const history = [
    { date: '2026-09-01', total: 100 }, { date: '2026-09-30', total: 110 },
    { date: '2026-10-05', total: 120 }, { date: '2026-10-06', total: 132 },
  ];
  const today = new Date('2026-10-06T12:00:00Z');
  const week = periodSeries(history, [], '1W', today);
  assert.deepEqual(week.series.map(p => p.date), ['2026-09-30', '2026-10-05', '2026-10-06']);
  assert.equal(week.delta, 22);
  assert.equal(week.deltaPct, 20);
  assert.equal(week.label, 'last 7 days');
  assert.equal(week.usingHistory, true);
  assert.equal(periodSeries(history, [], 'All', today).series.length, 4);
});

test('periodSeries falls back to the portfolio series while history is short', () => {
  const fallback = [{ date: '2026-10-05', value: 10 }, { date: '2026-10-06', value: 15 }];
  const r = periodSeries([{ date: '2026-10-06', total: 132 }], fallback, '1M', new Date('2026-10-06T12:00:00Z'));
  assert.equal(r.usingHistory, false);
  assert.equal(r.series, fallback);
  assert.equal(r.delta, 5);
  assert.equal(r.label, 'portfolio, last 30 days');
});

test('portfolioSeries30d values holdings at today\'s prices, skipping excluded assets', () => {
  const purchases = [
    { date: '2026-09-01', asset: 'BTC', quantity: 0.1 },
    { date: '2026-10-06', asset: 'BTC', quantity: 0.1 },
    { date: '2026-09-01', asset: 'MEME', quantity: 1000 },
  ];
  const series = portfolioSeries30d(purchases, { BTC: { eur: 80000 }, MEME: { eur: 1 } },
    [{ symbol: 'BTC' }, { symbol: 'MEME', include_in_totals: false }], new Date('2026-10-06T12:00:00Z'));
  assert.equal(series.length, 30);
  assert.equal(series[0].date, '2026-09-07');
  assert.equal(series[0].value, 8000);
  assert.equal(series[29].date, '2026-10-06');
  assert.equal(series[29].value, 16000);
  assert.deepEqual(portfolioSeries30d([], {}, []), []);
});
```

- [ ] **Step 11: Run and watch them fail**

Run: `npm test`
Expected: FAIL — cannot find module `./networth.js`.

- [ ] **Step 12: Implement `src/utils/networth.js`**

```js
// Pure net-worth maths, shared by the Dashboard view and the daily snapshot.

export function eurUsdRate(prices = {}) {
  for (const sym of Object.keys(prices)) {
    const p = prices[sym];
    if (p?.eur > 0 && p?.usd > 0) return p.usd / p.eur;
  }
  return null;
}

// USD → EUR with the derived rate. Without a rate (prices unavailable) the
// amount counts at face value, as the app has always done.
export function toEur(amount, currency, rate) {
  const n = Number(amount) || 0;
  return (currency || 'EUR').toUpperCase() === 'USD' && rate ? n / rate : n;
}

const isCrypto = (a) => a.asset_type === 'crypto' || a.asset_type === 'dex_token';

export function computeNetWorth({ summary, assets = [], prices = {}, networth, cashPositions = [] }) {
  const by = summary?.by_asset || {};
  const rate = eurUsdRate(prices);
  const held = assets.filter(a => by[a.symbol]);
  const mainAssets = held.filter(a => by[a.symbol].include_in_totals !== false);
  const specAssets = held.filter(a => by[a.symbol].include_in_totals === false);
  const valueOf = (a) => by[a.symbol]?.value || 0;
  const sum = (list) => list.reduce((s, a) => s + valueOf(a), 0);
  const cryptoAssets = mainAssets.filter(isCrypto);
  const stockAssets = mainAssets.filter(a => a.asset_type === 'stock_etf');
  const accounts = networth?.external_accounts || [];
  const cash = accounts.reduce((s, acc) => s + toEur(acc.balance, acc.currency, rate), 0);
  const dry = (cashPositions || []).reduce((s, p) => s + toEur(p.amount_eur, p.currency, rate), 0);
  const portfolio = sum(mainAssets);
  return {
    rate, mainAssets, specAssets, cryptoAssets, stockAssets, accounts,
    crypto: sum(cryptoAssets), stock: sum(stockAssets), cash, dry,
    portfolio, total: portfolio + cash + dry,
  };
}

// Last 30 days of the portfolio, each day's holdings valued at today's prices.
// Only a fallback while the recorded net-worth history is still short.
export function portfolioSeries30d(purchases = [], prices = {}, assets = [], today = new Date()) {
  if (!purchases.length) return [];
  const assetMap = Object.fromEntries(assets.map(a => [a.symbol, a]));
  const sorted = [...purchases].sort((a, b) => new Date(a.date) - new Date(b.date));
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const qty = {};
    sorted.filter(p => String(p.date).slice(0, 10) <= ds).forEach(p => { qty[p.asset] = (qty[p.asset] || 0) + p.quantity; });
    let total = 0;
    for (const [symbol, q] of Object.entries(qty)) {
      const a = assetMap[symbol];
      if (a && a.include_in_totals === false) continue;
      total += q * ((prices[symbol] || {}).eur || 0);
    }
    days.push({ date: ds, value: Math.round(total) });
  }
  return days;
}

export const PERIODS = [
  ['1W', 7, 'last 7 days'],
  ['1M', 30, 'last 30 days'],
  ['1Y', 365, 'last year'],
  ['All', 100000, 'all time'],
];

// history: [{ date: 'YYYY-MM-DD', total }]. fallback: [{ date, value }].
export function periodSeries(history = [], fallback = [], period = '1M', today = new Date()) {
  const [, days, label] = PERIODS.find(p => p[0] === period) || PERIODS[1];
  const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const hist = history.filter(h => h.date >= cutoffStr).map(h => ({ date: h.date, value: h.total || 0 }));
  const usingHistory = hist.length >= 2;
  const series = usingHistory ? hist : fallback;
  const first = series.find(p => p.value > 0)?.value ?? 0;
  const last = series.length ? series[series.length - 1].value : 0;
  return {
    series, usingHistory,
    delta: last - first,
    deltaPct: first > 0 ? ((last - first) / first) * 100 : 0,
    label: usingHistory ? label : 'portfolio, last 30 days',
  };
}
```

- [ ] **Step 13: Run the whole suite and the build**

Run: `npm test`
Expected: every test PASS, 0 failures.

Run: `npm run build`
Expected: `✓ built in …`, no errors.

- [ ] **Step 14: Commit**

```bash
git add package.json src/utils
git commit -m "Add tested helpers for money, dates, the diary ledger and net worth"
```

---

### Task 2: Foundations — tokens, ornaments off, app frame, preview page

**Files:**
- Create: `src/mercury.css`, `preview.html`, `src/preview/main.jsx`, `src/preview/fixtures.js`
- Modify: `src/main.jsx`, `index.html`, `src/components/Sidebar.jsx`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: CSS variables with new values, including the new `--crypto`; the preview registry `PAGES` in `src/preview/main.jsx` (an object `{ key: () => JSX }`) that later tasks add entries to; fixtures exported from `src/preview/fixtures.js` (`assets`, `purchases`, `bankEntries`, `cashPositions`, `dashboard`, `networth`, `history`, `marketInfo`).

- [ ] **Step 1: Create `src/mercury.css` with tokens, switches and frame**

```css
/* ================================================================
   WEALTH — Mercury dark
   Loaded after styles.css. Same variable names, new values; legacy
   ornaments off; every new component lives under the m- prefix.
   ================================================================ */

/* ---------- 1. Tokens ---------- */
:root {
  --bg: #14141B;
  --bg-card: #1B1B24;
  --bg-card-grad: #1B1B24;
  --bg-elev: #23232E;
  --bg-card-2: #23232E;
  --bg-input: #23232E;
  --bg-hover: #262632;
  --border: rgba(255,255,255,0.08);
  --border-hover: rgba(255,255,255,0.16);
  --border-focus: rgba(141,155,255,0.6);
  --highlight: 0 0 0 0 transparent;
  --edge: 0 0 0 0 transparent;
  --inset: 0 0 0 0 transparent;
  --accent: #8D9BFF;
  --accent-2: #8D9BFF;
  --accent-soft: #8D9BFF;
  --accent-strong: #8D9BFF;
  --accent-dim: rgba(141,155,255,0.12);
  --accent-bg: rgba(141,155,255,0.12);
  --accent-rgb: 141,155,255;
  --text-1: #EDEDF3;
  --text-2: #9A9AA8;
  --text-3: #9A9AA8;
  --green: #4FD1A1;
  --green-soft: #4FD1A1;
  --green-bg: rgba(79,209,161,0.12);
  --green-rgb: 79,209,161;
  --red: #F58A9B;
  --red-soft: #F58A9B;
  --red-bg: rgba(245,138,155,0.12);
  --red-rgb: 245,138,155;
  --stock: #8D9BFF;
  --stock-bg: rgba(141,155,255,0.12);
  --cash: #5F69B8;
  --cash-bg: rgba(95,105,184,0.14);
  --crypto: #3D4272;
  --dry: #6B6B7B;
  --dry-bg: rgba(255,255,255,0.04);
  --font-num: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-serif: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --radius: 12px;
  --radius-sm: 8px;
  --elev-1: 0 0 0 0 transparent;
  --elev-2: 0 0 0 0 transparent;
  --elev-3: 0 16px 48px rgba(0,0,0,0.5);
}

body {
  background: var(--bg);
  /* Only 400 and 500 are loaded: never fake a bolder weight. */
  font-synthesis: none;
  font-feature-settings: "tnum" 1, "cv05" 1, "ss01" 1;
}

/* ---------- 2. Legacy ornaments off ---------- */
body::before, body::after { content: none; }
.page-layout { background-image: none; }
.card::after, .hero-stats::before, .hero-stats::after, .asset-card::after, .fab::before { content: none; }
.num--up, .num--down { animation: none; }

.card__title, .hero-stat__label, .calc-stat__lbl, .calc-result__lbl,
.section-header__title, .asset-strip__label, .kpi-card__label,
.data-table th, .form-label, .donut-center__lbl, .fab-modal__eyebrow {
  text-transform: none; letter-spacing: 0; font-size: 12px; font-weight: 500;
}
.collapse-btn { text-transform: none; letter-spacing: 0; }

/* ---------- 3. App frame ---------- */
.sidebar { background: var(--bg); backdrop-filter: none; box-shadow: none; }
.sidebar__title { font-size: 14px; font-weight: 500; letter-spacing: 0; }
.sidebar__section-label { font-size: 12px; letter-spacing: 0; opacity: 1; color: var(--text-2); }
.sidebar__footer, .sidebar__user, .sidebar__logout { font-size: 12px; }
.nav-item { font-size: 14px; font-weight: 400; }
.nav-item:hover { background: var(--bg-card); }
.nav-item.active { font-weight: 500; background: var(--bg-elev); }
.nav-item.active::before { content: none; }
.nav-item.active .nav-item__icon, .nav-item--accent .nav-item__icon { color: inherit; }
.applink { background: transparent; box-shadow: none; }
.applink__chip { background: var(--accent); color: var(--bg); font-size: 12px; font-weight: 500; }
.applink__name { font-size: 13px; letter-spacing: 0; font-weight: 400; }

.topbar { background: var(--bg); backdrop-filter: none; box-shadow: none; }
.topbar__title { display: none; }
.topbar__username, .cmdk-hint { font-size: 12px; }

.page-head__title { font-size: 26px; font-weight: 400; letter-spacing: -0.02em; line-height: 1.2; }

@media (max-width: 768px) {
  .sidebar { box-shadow: none; border-right: 1px solid var(--border); }
  .nav-backdrop { backdrop-filter: none; background: rgba(8,8,12,0.62); }
}

/* ---------- 4. Base controls ---------- */
.btn {
  font-size: 13px; font-weight: 500; text-transform: none; letter-spacing: 0;
  padding: 8px 14px; border-radius: 8px;
}
.btn:hover, .btn:active { transform: none; }
.btn--primary, .btn--primary:hover { background: var(--accent); color: var(--bg); box-shadow: none; }
.btn--primary:hover { background: #A3AEFF; }
.btn--ghost.active { background: var(--bg-elev); border-color: var(--border-hover); color: var(--text-1); }
.btn--sm { padding: 6px 10px; font-size: 12px; border-radius: 8px; }
.btn--lg { font-size: 14px; border-radius: 8px; }

.panel, .card { background: var(--bg-card); border: 1px solid var(--border); box-shadow: none; }
.card--interactive:hover { transform: none; box-shadow: none; }

.currency-toggle { background: transparent; border-radius: 8px; }
.currency-toggle__btn { font-size: 12px; font-weight: 400; letter-spacing: 0; padding: 5px 10px; border-radius: 6px; color: var(--text-2); }
.currency-toggle__btn.active { background: var(--bg-elev); color: var(--text-1); box-shadow: none; }

.toggle__slider { background: #2A2A36; }
.toggle__slider::before { background: var(--text-1); }
.toggle__slider::before,
.toggle input:checked + .toggle__slider::before,
.toggle:hover .toggle__slider::before { box-shadow: none; }

.fab, .fab:hover { background: var(--accent); color: var(--bg); box-shadow: 0 8px 24px rgba(0,0,0,0.4); transform: none; }
```

- [ ] **Step 2: Load it**

In `src/main.jsx`, add the import right after the `styles.css` one:

```js
import './styles.css'
import './mercury.css'
```

- [ ] **Step 3: Update `index.html`**

Replace the `theme-color` meta, the Google Fonts `<link href=…>` and the opening `<body …>` tag with these three lines respectively:

```html
    <meta name="theme-color" content="#14141B" />
```

```html
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap" rel="stylesheet">
```

```html
  <body style="margin: 0; padding: 0; background-color: #14141B; font-family: 'Inter', -apple-system, sans-serif;">
```

Leave the Content-Security-Policy meta and everything else as it is.

- [ ] **Step 4: Sentence-case the sidebar and drop its status line**

In `src/components/Sidebar.jsx`:

1. Change the first import line to `import React from 'react';` and the third to `import { removeToken } from '../api.js';`.
2. Delete these lines (the fetch that only fed the status line):

```js
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    api.getAssets().then(setAssets).catch(() => {});
  }, []);
```

3. Replace the `sections` array with:

```js
  const sections = [
    {
      label: 'Overview',
      items: [{ path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> }],
    },
    {
      label: 'Add',
      items: [{ path: '/add', label: 'Add movement', icon: <PlusIcon />, accent: true }],
    },
    {
      label: 'Track',
      items: [
        { path: '/diary', label: 'Diary', icon: <DiaryIcon /> },
        { path: '/dca', label: 'DCA', icon: <DcaIcon /> },
      ],
    },
    {
      label: 'Analyze',
      items: [
        { path: '/reports', label: 'Reports', icon: <ReportIcon /> },
        { path: '/charts', label: 'Charts', icon: <ChartIcon /> },
      ],
    },
  ];
```

4. Replace the whole `<div className="sidebar__brand">…</div>` block with:

```jsx
      <div className="sidebar__brand">
        <div className="sidebar__logo"><BrandMark size={30} /></div>
        <div className="sidebar__title">Wealth</div>
      </div>
```

5. Change `<div className="sidebar__section-label">APPS</div>` to `<div className="sidebar__section-label">Apps</div>`, `<span className="applink__name">PERSONALS</span>` to `<span className="applink__name">Personals</span>`, and the bare text `SETTINGS` inside the settings `<Link>` to `Settings`.

- [ ] **Step 5: Create the preview fixtures**

Create `src/preview/fixtures.js` (sample figures, not the owner's real ones):

```js
// Sample data for the dev-only preview page. Shapes mirror the API.

export const assets = [
  { symbol: 'VUAA', name: 'Vanguard FTSE All-World UCITS ETF', asset_type: 'stock_etf', color: '#00BCD4', decimals: 4 },
  { symbol: 'BTC', name: 'Bitcoin', asset_type: 'crypto', color: '#F7931A', decimals: 8 },
  { symbol: 'AERO', name: 'Aerodrome Finance', asset_type: 'crypto', color: '#2c3ae2', decimals: 2 },
  { symbol: 'BRETT', name: 'Brett', asset_type: 'crypto', color: '#0ea5e9', decimals: 2, include_in_totals: false },
];

export const purchases = [
  { id: 'p1', date: '2026-09-11', asset: 'BTC', quantity: 0.00754148, price_eur: 66300, amount_eur: 500, notes: '' },
  { id: 'p2', date: '2026-06-27', asset: 'BTC', quantity: 0.01325678, price_eur: 52800.5, amount_eur: 700, notes: 'Dip' },
  { id: 'p3', date: '2026-06-25', asset: 'VUAA', quantity: 6.0002777, price_eur: 108.03, amount_eur: 648.21, notes: '', funded_from: 'c1', funded_amount: 648.21 },
  { id: 'p4', date: '2026-03-02', asset: 'AERO', quantity: 1601.65316232, price_eur: 0.744617, amount_eur: 1192.62, notes: '' },
  { id: 'p5', date: '2026-03-02', asset: 'BRETT', quantity: 32944.08850814, price_eur: 0.066434, amount_eur: 2188.6, notes: '' },
];

export const bankEntries = [
  { id: 1, date: '2026-10-05', bank: 'Relay', amount: 1000, currency: 'USD', note: '' },
  { id: 2, date: '2026-09-10', bank: 'Relay', amount: 3500, currency: 'USD', note: 'Client invoice' },
  { id: 3, date: '2026-06-26', bank: 'Relay', amount: -420.5, currency: 'USD', note: 'Software' },
];

export const cashPositions = [{ id: 'c1', label: 'Degiro', amount_eur: 250, currency: 'EUR' }];

export const dashboard = {
  purchases,
  prices: {
    BTC: { eur: 76000, usd: 85120 },
    VUAA: { eur: 134.34, usd: null },
    AERO: { eur: 0.7474, usd: 0.8371 },
    BRETT: { eur: 0.0051, usd: 0.0057 },
  },
  summary: {
    total_invested: 3040.83, pnl: 543, n_purchases: 5,
    spec_value: 168.01, spec_pnl: -2020.59, spec_pnl_pct: -92.32,
    by_asset: {
      VUAA: { qty: 6.0002777, value: 806.08, invested: 648.21, pnl: 157.87, avg_price: 108.03, include_in_totals: true },
      BTC: { qty: 0.02079826, value: 1580.67, invested: 1200, pnl: 380.67, avg_price: 57697.13, avg_price_usd: 64620.79, include_in_totals: true },
      AERO: { qty: 1601.65316232, value: 1197.08, invested: 1192.62, pnl: 4.46, avg_price: 0.744617, avg_price_usd: 0.833971, include_in_totals: true },
      BRETT: { qty: 32944.08850814, value: 168.01, invested: 2188.6, pnl: -2020.59, avg_price: 0.066434, avg_price_usd: 0.074406, include_in_totals: false },
    },
  },
};

export const networth = {
  external_accounts: [
    { source: 'mercury', name: 'Mercury Checking ••1234', currency: 'USD', balance: 28000 },
    { source: 'ledger', name: 'Relay', currency: 'USD', balance: 5600 },
  ],
};

// 60 daily points rising from about 31,000 to about 34,400, with a dip.
export const history = Array.from({ length: 60 }, (_, i) => {
  const d = new Date('2026-10-06T00:00:00Z'); d.setUTCDate(d.getUTCDate() - (59 - i));
  const wobble = Math.sin(i / 4) * 350 - (i > 20 && i < 28 ? 900 : 0);
  return { date: d.toISOString().slice(0, 10), total: Math.round(31000 + i * 58 + wobble) };
});

export const marketInfo = {
  BTC: { change_24h: 1.8, change_7d: -2.4, ath_usd: 126000, ath_change_pct: -32.4, market_cap_usd: 1.7e12, rank: 1 },
  AERO: { change_24h: -3.1, change_7d: 6.2, ath_usd: 2.31, ath_change_pct: -63.8, market_cap_usd: 7.4e8, rank: 142 },
  BRETT: { change_24h: 0.4, change_7d: -9.9, ath_usd: 0.23, ath_change_pct: -97.5, market_cap_usd: 5.6e7, rank: 780 },
};
```

- [ ] **Step 6: Create the preview page**

Create `preview.html` in the project root:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap" rel="stylesheet">
    <title>Wealth · preview</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #14141B; font-family: 'Inter', -apple-system, sans-serif;">
    <div id="root"></div>
    <script type="module" src="/src/preview/main.jsx"></script>
  </body>
</html>
```

Create `src/preview/main.jsx`:

```jsx
// Dev-only preview: renders real components with fixtures, no login needed.
// Open /preview.html?p=<key>. Not an entry of `vite build`, so it never ships.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import PageLayout from '../components/PageLayout';
import '../styles.css';
import '../mercury.css';

const Frame = ({ title, size, children }) => (
  <PageLayout title={title} username="federico" size={size}>{children}</PageLayout>
);

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
};

const key = new URLSearchParams(window.location.search).get('p') || 'frame';
const Page = PAGES[key] || (() => <pre style={{ color: '#EDEDF3', padding: 24 }}>Unknown page. Try: {Object.keys(PAGES).join(', ')}</pre>);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MemoryRouter initialEntries={['/diary']}>
      <ToastProvider><Page /></ToastProvider>
    </MemoryRouter>
  </React.StrictMode>,
);
```

- [ ] **Step 7: Build and test**

Run: `npm run build`
Expected: `✓ built in …`, and `dist/` contains `index.html` but **no** `preview.html`.

Run: `ls dist | grep -c preview`
Expected: `0`

Run: `npm test`
Expected: all PASS.

- [ ] **Step 8: Look at it**

Follow "How to verify visually" with `?p=frame`, desktop and 390px. Check all of these:

- Background is flat `#14141B`: no grain, no vignette, no violet wash at the top.
- Sidebar: `Wealth`, section labels and items in sentence case, active item is a grey pill with no left bar; on 390px it is hidden and the hamburger opens it.
- Primary button is flat indigo with dark text; hovering does not lift it or add a glow.
- Digits `1234567890` are evenly spaced; nothing is rendered in a serif or in Space Grotesk.
- No console errors.

- [ ] **Step 9: Commit**

```bash
git add index.html preview.html src/main.jsx src/mercury.css src/components/Sidebar.jsx src/preview
git commit -m "Mercury dark foundations: tokens, flat surfaces, one typeface, preview page"
```

---

### Task 3: Shared components

**Files:**
- Modify: `src/components/Icon.jsx`, `src/mercury.css`, `src/preview/main.jsx`
- Create: `src/components/Money.jsx`, `src/components/Avatar.jsx`, `src/components/PageHead.jsx`, `src/components/StatRow.jsx`, `src/components/Tabs.jsx`, `src/components/LedgerRow.jsx`, `src/components/DetailSheet.jsx`

**Interfaces:**
- Consumes: `moneyParts` from `src/utils/format.js` (Task 1); `PAGES` registry in `src/preview/main.jsx` (Task 2).
- Produces (default exports, props):
  - `Money({ value, currency = 'EUR', sign = false, className = '' })`
  - `Avatar({ asset, label })` — pass `asset` (symbol) for a logo, or `label` for initials
  - `PageHead({ title, action, children })` — `action` is `{ to, label }`
  - `StatRow({ items, variant = 'row', note })` — `items` is `[{ label, value, tone }]`, `tone` is `'up' | 'down' | undefined`, `variant` is `'row' | 'hero'`, `note` is a string shown only on phones in the `hero` variant
  - `Tabs({ tabs, value, onChange, right })` — `tabs` is `[{ key, label }]`
  - `LedgerRow({ date, avatar, title, sub, subShort, amount, tone, onClick })` — `tone` is `'in' | ''`
  - `DetailSheet({ open, onClose, avatar, title, subtitle, amount, rows = [], danger, children })` — `rows` is `[{ label, value }]` (rows with empty value are skipped); `danger` is `{ label, confirmLabel, onConfirm }`
- Produces (CSS classes reused by later tasks): `m-card`, `m-label`, `m-muted`, `m-up`, `m-down`, `m-link`, `m-select`, `m-month`, `m-empty`, `m-row__title`.

- [ ] **Step 1: Add the `dots` glyph**

In `src/components/Icon.jsx`, add this entry to `PATHS`, after the `menu` line:

```jsx
  dots: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
```

- [ ] **Step 2: Create `src/components/Money.jsx`**

```jsx
import React from 'react';
import { moneyParts } from '../utils/format';

// A money figure with dimmed cents: "€63,195" + ".72".
// sign: also show "+" on positive values (profits, money in).
export default function Money({ value, currency = 'EUR', sign = false, className = '' }) {
  const { negative, symbol, int, cents } = moneyParts(value, currency);
  const lead = negative ? '−' : sign ? '+' : '';
  return (
    <span className={`m-money ${className}`.trim()}>
      {lead}{symbol}{int}<span className="m-money__cents">.{cents}</span>
    </span>
  );
}
```

- [ ] **Step 3: Create `src/components/Avatar.jsx`**

```jsx
import React from 'react';
import AssetBadge from './AssetBadge';

// 32px round mark: the asset's logo, or two initials for anything else.
export default function Avatar({ asset, color, label }) {
  if (asset) {
    return <span className="m-avatar"><AssetBadge asset={asset} color={color} showSymbol={false} /></span>;
  }
  return <span className="m-avatar m-avatar--text">{String(label || '').slice(0, 2).toUpperCase()}</span>;
}
```

- [ ] **Step 4: Create `src/components/PageHead.jsx`**

```jsx
import React from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';

// Page title on the left, the page's one primary action on the right.
// On phones the action shrinks to a round "+".
export default function PageHead({ title, action, children }) {
  return (
    <div className="m-head">
      <h1 className="m-head__title">{title}</h1>
      <div className="m-head__side">
        {children}
        {action && (
          <Link to={action.to} className="btn btn--primary m-head__cta" aria-label={action.label}>
            <span className="m-head__cta-icon"><Icon name="plus" size={16} /></span>
            <span className="m-head__cta-label">{action.label}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/components/StatRow.jsx`**

```jsx
import React from 'react';

// Three figures in a row, no boxes.
// variant "hero": on phones only the first figure stays, big, with `note` under it.
export default function StatRow({ items, variant = 'row', note }) {
  return (
    <div className={`m-stats m-stats--${variant}`}>
      {items.map(it => (
        <div className="m-stat" key={it.label}>
          <div className="m-stat__label">{it.label}</div>
          <div className={`m-stat__value ${it.tone ? `m-stat__value--${it.tone}` : ''}`}>{it.value}</div>
        </div>
      ))}
      {note && <div className="m-stats__note">{note}</div>}
    </div>
  );
}
```

- [ ] **Step 6: Create `src/components/Tabs.jsx`**

```jsx
import React from 'react';

export default function Tabs({ tabs, value, onChange, right }) {
  return (
    <div className="m-tabs">
      <div className="m-tabs__list" role="tablist">
        {tabs.map(t => (
          <button key={t.key} type="button" role="tab" aria-selected={value === t.key}
            className={`m-tabs__tab ${value === t.key ? 'is-active' : ''}`}
            onClick={() => onChange(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      {right && <div className="m-tabs__right">{right}</div>}
    </div>
  );
}
```

- [ ] **Step 7: Create `src/components/LedgerRow.jsx`**

```jsx
import React from 'react';
import Icon from './Icon';

// One ledger line. Desktop: date · avatar · name+detail · amount · dots.
// Phone: avatar · name+short detail · amount with the date under it.
export default function LedgerRow({ date, avatar, title, sub, subShort, amount, tone = '', onClick }) {
  return (
    <button type="button" className="m-row" onClick={onClick}>
      <span className="m-row__date">{date}</span>
      {avatar}
      <span className="m-row__main">
        <span className="m-row__title">{title}</span>
        <span className="m-row__sub m-row__sub--full">{sub}</span>
        <span className="m-row__sub m-row__sub--short">{subShort ?? sub}</span>
      </span>
      <span className="m-row__amt">
        <span className={`m-row__amount ${tone ? `m-row__amount--${tone}` : ''}`}>{amount}</span>
        <span className="m-row__date-m">{date}</span>
      </span>
      <span className="m-row__more" aria-hidden="true"><Icon name="dots" size={16} /></span>
    </button>
  );
}
```

- [ ] **Step 8: Create `src/components/DetailSheet.jsx`**

```jsx
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

// One place for a row's details and its destructive action.
// Phone (≤640px): sheet rising from the bottom. Desktop: panel on the right.
// Closes on backdrop tap, Esc, or dragging the handle down.
export default function DetailSheet({ open, onClose, avatar, title, subtitle, amount, rows = [], danger, children }) {
  const sheetRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const dragStart = useRef(null);
  const [armed, setArmed] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    setArmed(false);
    setOffset(0);
    const previous = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sheetRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (previous && previous.focus) previous.focus();
    };
  }, [open]);

  // An armed delete disarms itself, so a stray second tap later cannot delete.
  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  if (!open) return null;

  const onTouchStart = (e) => { dragStart.current = e.touches[0].clientY; };
  const onTouchMove = (e) => {
    if (dragStart.current != null) setOffset(Math.max(0, e.touches[0].clientY - dragStart.current));
  };
  const onTouchEnd = () => {
    if (offset > 80) closeRef.current();
    setOffset(0);
    dragStart.current = null;
  };

  return createPortal(
    <div className="m-sheet__backdrop" onClick={() => closeRef.current()}>
      <div ref={sheetRef} className="m-sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
        style={offset ? { transform: `translateY(${offset}px)` } : undefined}
        onClick={(e) => e.stopPropagation()}>
        <div className="m-sheet__top" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <div className="m-sheet__grab" />
          <div className="m-sheet__head">
            {avatar}
            <div className="m-sheet__titles">
              <div className="m-sheet__title">{title}</div>
              {subtitle && <div className="m-sheet__subtitle">{subtitle}</div>}
            </div>
            <button type="button" className="m-sheet__close" aria-label="Close" onClick={() => closeRef.current()}>
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>
        {amount && <div className="m-sheet__amount">{amount}</div>}
        <dl className="m-sheet__rows">
          {rows.filter(r => r && r.value != null && r.value !== '').map(r => (
            <div className="m-sheet__row" key={r.label}><dt>{r.label}</dt><dd>{r.value}</dd></div>
          ))}
        </dl>
        {children}
        {danger && (
          <button type="button" className={`m-sheet__danger ${armed ? 'is-armed' : ''}`}
            onClick={() => (armed ? danger.onConfirm() : setArmed(true))}>
            {armed ? (danger.confirmLabel || 'Confirm delete') : danger.label}
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
```

- [ ] **Step 9: Append the component styles to `src/mercury.css`**

Add at the end of the file:

```css
/* ---------- 5. Components ---------- */
.m-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 18px; }
.m-label { font-size: 12px; color: var(--text-2); }
.m-link { background: none; border: 0; padding: 0; font: inherit; font-size: 13px; color: var(--accent); cursor: pointer; }
.m-link:disabled { color: var(--text-2); cursor: default; }
.m-money__cents { color: var(--text-2); }

.m-avatar {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; overflow: hidden;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--bg-elev); color: var(--text-2); font-size: 12px; font-weight: 500;
}
.m-avatar .asset-badge__icon { width: 32px; height: 32px; background: transparent; box-shadow: none; font-size: 12px; font-weight: 500; }
.m-avatar .asset-badge__icon img { width: 20px; height: 20px; }

/* Page head */
.m-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 22px; }
.m-head__title { font-size: 26px; font-weight: 400; letter-spacing: -0.02em; line-height: 1.2; color: var(--text-1); }
.m-head__side { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.m-head__cta { text-decoration: none; }
.m-head__cta-icon { display: none; }

/* Stat row */
.m-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; padding-bottom: 22px; border-bottom: 1px solid var(--border); }
.m-stat__label { font-size: 12px; color: var(--text-2); margin-bottom: 4px; }
.m-stat__value { font-size: 24px; font-weight: 400; letter-spacing: -0.02em; color: var(--text-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.m-stat__value--up { color: var(--green); }
.m-stat__value--down { color: var(--red); }
.m-stat__value--up .m-money__cents, .m-stat__value--down .m-money__cents { color: inherit; }
.m-stats__note { display: none; }

/* Tabs */
.m-tabs { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-top: 14px; border-bottom: 1px solid var(--border); }
.m-tabs__list { display: flex; gap: 22px; }
.m-tabs__tab {
  background: none; border: 0; border-bottom: 2px solid transparent; margin-bottom: -1px;
  padding: 0 0 12px; font: inherit; font-size: 13px; color: var(--text-2); cursor: pointer;
}
.m-tabs__tab:hover { color: var(--text-1); }
.m-tabs__tab.is-active { color: var(--text-1); font-weight: 500; border-bottom-color: var(--accent); }
.m-tabs__right { padding-bottom: 10px; }
.m-select {
  appearance: none; -webkit-appearance: none; border: 0; cursor: pointer;
  padding: 0 18px 0 0; font: inherit; font-size: 13px; color: var(--text-2);
  background: transparent url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239A9AA8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") right center no-repeat;
}
.m-select option { background: var(--bg-elev); color: var(--text-1); }

/* Ledger */
.m-month { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 18px 0 6px; font-size: 12px; color: var(--text-2); }
.m-row {
  display: grid; grid-template-columns: 56px 32px minmax(0, 1fr) auto 20px; gap: 12px; align-items: center;
  width: 100%; padding: 11px 0; background: none; border: 0; border-top: 1px solid var(--border);
  color: var(--text-1); font: inherit; font-size: 14px; text-align: left; cursor: pointer;
}
.m-row:hover { background: rgba(255,255,255,0.02); }
.m-row__date { font-size: 13px; color: var(--text-2); white-space: nowrap; }
.m-row__main { display: block; min-width: 0; }
.m-row__title, .m-row__sub { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.m-row__sub { font-size: 12px; color: var(--text-2); margin-top: 1px; }
.m-row__sub--short, .m-row__date-m { display: none; }
.m-row__amt { text-align: right; white-space: nowrap; }
.m-row__amount--in { color: var(--green); }
.m-row__more { display: flex; justify-content: flex-end; color: var(--text-2); opacity: 0; }
.m-row:hover .m-row__more, .m-row:focus-visible .m-row__more { opacity: 1; }
.m-empty { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 48px 0; font-size: 14px; color: var(--text-2); text-align: center; }
.m-empty .btn { text-decoration: none; }

/* Detail sheet */
.m-sheet__backdrop { position: fixed; inset: 0; z-index: 400; background: rgba(8,8,12,0.62); animation: fadeIn 160ms var(--ease); }
.m-sheet {
  position: absolute; left: 0; right: 0; bottom: 0; max-height: 86vh; overflow-y: auto; outline: none;
  background: var(--bg-card); border-top: 1px solid var(--border); border-radius: 20px 20px 0 0;
  padding: 10px 18px calc(20px + env(safe-area-inset-bottom));
  animation: mSheetUp 220ms var(--ease);
}
@keyframes mSheetUp { from { transform: translateY(24px); opacity: 0; } }
@keyframes mSheetIn { from { transform: translateX(24px); opacity: 0; } }
.m-sheet__grab { width: 36px; height: 4px; border-radius: 2px; background: #3A3A48; margin: 0 auto 16px; }
.m-sheet__head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.m-sheet__titles { flex: 1; min-width: 0; }
.m-sheet__title { font-size: 15px; color: var(--text-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.m-sheet__subtitle { font-size: 12px; color: var(--text-2); }
.m-sheet__close {
  display: none; width: 32px; height: 32px; align-items: center; justify-content: center; flex-shrink: 0;
  background: none; border: 1px solid var(--border); border-radius: 8px; color: var(--text-2); cursor: pointer;
}
.m-sheet__close:hover { color: var(--text-1); border-color: var(--border-hover); }
.m-sheet__amount { font-size: 28px; letter-spacing: -0.02em; color: var(--text-1); margin-bottom: 12px; }
.m-sheet__row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 11px 0; border-top: 1px solid var(--border); font-size: 13px; }
.m-sheet__row dt, .m-sheet__row > span:first-child { color: var(--text-2); }
.m-sheet__row dd { color: var(--text-1); text-align: right; min-width: 0; overflow-wrap: anywhere; }
.m-sheet__danger {
  width: 100%; margin-top: 14px; padding: 11px; font: inherit; font-size: 14px; cursor: pointer;
  color: var(--red); background: transparent; border: 1px solid var(--border); border-radius: 10px;
}
.m-sheet__danger.is-armed { background: var(--red-bg); border-color: rgba(245,138,155,0.4); }

@media (min-width: 641px) {
  .m-sheet {
    left: auto; top: 0; width: 380px; max-height: none; padding: 24px;
    border-top: 0; border-left: 1px solid var(--border); border-radius: 0;
    animation-name: mSheetIn;
  }
  .m-sheet__grab { display: none; }
  .m-sheet__close { display: inline-flex; }
}

@media (max-width: 640px) {
  .m-head__title { font-size: 22px; }
  .m-head__cta { width: 32px; height: 32px; padding: 0; border-radius: 50%; }
  .m-head__cta-label { display: none; }
  .m-head__cta-icon { display: block; }

  .m-stat__value { font-size: 16px; }
  .m-stats--hero { display: block; padding-bottom: 18px; }
  .m-stats--hero .m-stat:not(:first-child) { display: none; }
  .m-stats--hero .m-stat__value { font-size: 32px; letter-spacing: -0.02em; margin: 2px 0 6px; }
  .m-stats--hero .m-stats__note { display: block; font-size: 12px; color: var(--text-2); }

  .m-select { font-size: 16px; }   /* below 16px iOS zooms the page on focus */

  .m-row { grid-template-columns: 32px minmax(0, 1fr) auto; }
  .m-row__date, .m-row__more, .m-row__sub--full { display: none; }
  .m-row__sub--short { display: block; }
  .m-row__date-m { display: block; font-size: 12px; color: var(--text-2); margin-top: 1px; }
}

/* Tone helpers — last, so they win over component colours */
.m-muted { color: var(--text-2); }
.m-up { color: var(--green); }
.m-down { color: var(--red); }
```

- [ ] **Step 10: Add a `components` page to the preview**

In `src/preview/main.jsx`, add these imports under the existing `PageLayout` import:

```jsx
import PageHead from '../components/PageHead';
import StatRow from '../components/StatRow';
import Tabs from '../components/Tabs';
import LedgerRow from '../components/LedgerRow';
import DetailSheet from '../components/DetailSheet';
import Avatar from '../components/Avatar';
import Money from '../components/Money';
```

Add this component above `const PAGES`:

```jsx
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
      <LedgerRow date="Sep 11" avatar={<Avatar asset="BTC" color="#F7931A" />} title="Bitcoin"
        sub="0.00729397 BTC at €66,300.00" subShort="0.00729 BTC · €66,300" amount="€483.59" onClick={() => setOpen(true)} />
      <LedgerRow date="Sep 10" avatar={<Avatar label="Relay" />} title="Relay" sub="Money in" amount="+$3,498.00" tone="in" onClick={() => setOpen(true)} />
      <LedgerRow date="Sep 2" avatar={<Avatar asset="VUAA" color="#00BCD4" />} title="Vanguard FTSE All-World UCITS ETF"
        sub="28.99721699 VUAA at €111.39 · from Degiro" subShort="28.99722 VUAA · €111" amount="€3,230.00" onClick={() => setOpen(true)} />
      <StatRow items={[
        { label: 'Profit', value: <Money value={19883.56} sign />, tone: 'up' },
        { label: 'Return', value: '−95.3%', tone: 'down' },
        { label: 'Invested', value: <Money value={63195.72} /> },
      ]} />
      <DetailSheet open={open} onClose={() => setOpen(false)} avatar={<Avatar asset="BTC" color="#F7931A" />}
        title="Bitcoin" subtitle="Purchase" amount={<Money value={483.59} />}
        rows={[{ label: 'Date', value: 'Sep 11, 2026' }, { label: 'Quantity', value: '0.00729397 BTC' }, { label: 'Price', value: '€66,300.00' }, { label: 'Note', value: '' }]}
        danger={{ label: 'Delete purchase', onConfirm: () => setOpen(false) }} />
    </Frame>
  );
}
```

And add the entry to `PAGES` (after `frame`):

```jsx
  components: () => <ComponentsDemo />,
```

- [ ] **Step 11: Build**

Run: `npm run build && npm test`
Expected: build succeeds, all tests PASS.

- [ ] **Step 12: Look at it**

Open `?p=components` at desktop and at 390px, then `?p=components&sheet=1` at both sizes.

Desktop:
- Title 26px with an indigo `Add movement` button on the right.
- Three figures in a row; `.72` is grey; `Profit` green, `Return` rose.
- Active tab has a 2px indigo underline sitting on the hairline.
- Rows: date column, 32px round avatar (Bitcoin logo; `RE` initials for Relay), name over a grey detail line, amount on the right; dots appear only on hover; `+$3,498.00` is green.
- With `&sheet=1`: panel on the right, 380px wide, with a close button; `Note` row is absent (empty value). Clicking `Delete purchase` turns it into `Confirm delete` with a rose tint; after 4 seconds it reverts. Esc closes it.

390px:
- `+` round button replaces the text button.
- First StatRow shows only `€63,195.72` at 32px with the note line under it; the second StatRow keeps three figures at 16px and nothing overflows.
- Rows are two lines: short detail on the left, date under the amount; the long Vanguard name is cut with an ellipsis and does not push the amount off screen.
- With `&sheet=1`: sheet rises from the bottom with a grab handle and rounded top corners.

No console errors.

- [ ] **Step 13: Commit**

```bash
git add src/components src/mercury.css src/preview/main.jsx
git commit -m "Shared Mercury components: page head, stat row, tabs, ledger row, detail sheet"
```

---

### Task 4: Diary

**Files:**
- Create: `src/pages/DiaryView.jsx`
- Modify: `src/pages/Diary.jsx` (full rewrite), `src/preview/main.jsx`

**Interfaces:**
- Consumes: `buildLedger`, `filterLedger`, `groupByMonth`, `ledgerStats` (Task 1); `formatEUR`, `formatUSD`, `formatPrice`, `formatDay`, `formatDayLong`, `formatMonth` (Task 1); `PageHead`, `StatRow`, `Tabs`, `LedgerRow`, `DetailSheet`, `Avatar`, `Money` (Task 3); fixtures `assets`, `purchases`, `bankEntries`, `cashPositions` (Task 2).
- Produces: `DiaryView({ purchases, assets, bankEntries, cashPositions, onDeletePurchase, onDeleteBankEntry })` — both callbacks take the raw record id and may be async.

- [ ] **Step 1: Create `src/pages/DiaryView.jsx`**

```jsx
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
        avatar: <Avatar asset={p.asset} />,
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
```

- [ ] **Step 2: Rewrite `src/pages/Diary.jsx` as the container**

Replace the whole file with:

```jsx
import React, { useState, useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import { useToast } from '../components/Toast';
import { PageSkeleton } from '../components/Skeleton';
import { api } from '../api.js';
import DiaryView from './DiaryView';

// Diary is the pure history view: every purchase and every bank movement.
// All manual entry lives in the Add Movement page (/add).
export default function Diary() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [assets, setAssets] = useState([]);
  const [cashPositions, setCashPositions] = useState([]);
  const [bankEntries, setBankEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userData, purchasesData, assetsData, cashData, entriesData] = await Promise.all([
          api.getMe(), api.getPurchases(), api.getAssets(),
          api.getCashPositions().catch(() => []),
          api.getBankEntries().catch(() => []),
        ]);
        setUser(userData);
        setPurchases(purchasesData);
        setAssets(assetsData);
        setCashPositions(cashData || []);
        setBankEntries(entriesData || []);
      } catch (err) { /* page shows failed state below */ }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    try {
      const p = purchases.find(x => x.id === id);
      await api.deletePurchase(id);
      setPurchases(prev => prev.filter(x => x.id !== id));
      // Restore dry powder if this purchase was funded from a broker (reverses the deduction).
      if (p && p.funded_from && p.funded_amount) {
        const pos = cashPositions.find(x => x.id === p.funded_from);
        if (pos) {
          const cur = (pos.currency || 'EUR').toUpperCase();
          const restored = (Number(pos.amount_eur) || 0) + Number(p.funded_amount);
          try {
            await api.updateCashPosition(pos.id, pos.label, Number(restored.toFixed(2)), cur);
            setCashPositions(await api.getCashPositions());
            toast(`Restored to ${pos.label}`, 'success');
          } catch (e) { /* best-effort */ }
        }
      } else {
        toast('Purchase deleted', 'success');
      }
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleBankEntryDelete = async (id) => {
    try {
      await api.deleteBankEntry(id);
      setBankEntries(prev => prev.filter(en => en.id !== id));
      toast('Movement deleted', 'success');
    } catch (err) { toast(err.message, 'error'); }
  };

  if (loading) return <PageLayout title="Diary" username="" size="md"><PageSkeleton rows={6} /></PageLayout>;
  if (!user) return <div className="loading-screen"><div className="loading-error">Failed to load</div></div>;

  return (
    <PageLayout title="Diary" username={user.username} size="md">
      <DiaryView purchases={purchases} assets={assets} bankEntries={bankEntries} cashPositions={cashPositions}
        onDeletePurchase={handleDelete} onDeleteBankEntry={handleBankEntryDelete} />
    </PageLayout>
  );
}
```

- [ ] **Step 3: Add the Diary to the preview**

In `src/preview/main.jsx` add the imports:

```jsx
import DiaryView from '../pages/DiaryView';
import * as fixtures from './fixtures';
```

Add this component above `const PAGES`:

```jsx
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
```

And the entries in `PAGES`:

```jsx
  diary: () => <DiaryDemo />,
  'diary-empty': () => <DiaryDemo empty />,
```

- [ ] **Step 4: Build and test**

Run: `npm run build && npm test`
Expected: build succeeds, all tests PASS.

- [ ] **Step 5: Look at it and use it**

Open `?p=diary` at desktop and at 390px. Check:

- Figures: `Total invested €5,229.43`, `Transactions 5`, `Last purchase Sep 11`.
- Month headers in order: October 2026 (no total), September 2026 (`€500.00 invested`), June 2026 (`€1,348.21 invested`), March 2026 (`€3,381.22 invested`).
- 26 June Relay row shows `Software` and `−$420.50` in normal text colour (not green, not red).
- The 25 June Vanguard row's detail ends with `· from Degiro`.
- Tab `Purchases` hides the three Relay rows; tab `Bank` shows only them and hides the asset select.
- Select `BTC` on `All`: only the two Bitcoin rows remain. Select `VUAA` then switch to `Bank` and back: the select still says `VUAA`.
- Click the 11 Sep Bitcoin row: sheet shows `€500.00`, Date `Sep 11, 2026`, Quantity `0.00754148 BTC`, Price `€66,300.00`, and no `Note` or `Funded from` row. Click `Delete purchase`, then `Confirm delete`: the sheet closes, the row is gone, `Transactions` reads `4`.
- At 390px nothing scrolls sideways (`document.documentElement.scrollWidth === window.innerWidth`, check with the Browser `javascript_tool`).

Open `?p=diary-empty`: figures read `€0.00`, `0`, `—`; the body shows `No transactions yet` with an `Add movement` button.

No console errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Diary.jsx src/pages/DiaryView.jsx src/preview/main.jsx
git commit -m "Diary: one ledger for purchases and bank movements, actions in a detail sheet"
```

---

### Task 5: Dashboard

**Files:**
- Create: `src/components/MarketOverview.jsx`, `src/pages/DashboardView.jsx`
- Modify: `src/pages/Dashboard.jsx` (full rewrite), `src/mercury.css`, `src/preview/main.jsx`

**Interfaces:**
- Consumes: `computeNetWorth`, `periodSeries`, `portfolioSeries30d`, `PERIODS` (Task 1); `formatEUR`, `formatUSD`, `formatQty`, `formatPrice`, `formatDayLong`, tooltip styles (Task 1); `StatRow`, `DetailSheet`, `Avatar`, `Money`, `Icon` and classes `m-card`, `m-label`, `m-muted`, `m-up`, `m-down`, `m-link`, `m-row__title`, `m-sheet__row` (Task 3); fixtures `assets`, `dashboard`, `networth`, `cashPositions`, `history`, `marketInfo` (Task 2).
- Produces: `MarketOverview({ assets, prices, marketInfo })`; `DashboardView({ displayName, data, assets, networth, cashPositions, history, marketInfo, cacheAge, refreshing, onRefresh, onToggleTracking })` where `data` is `{ summary, prices, purchases }` and `onToggleTracking(symbol, currentlyIncluded)`.

- [ ] **Step 1: Create `src/components/MarketOverview.jsx`**

The table is the one that lives in `Dashboard.jsx` today, moved as it is.

```jsx
import React from 'react';
import AssetBadge from './AssetBadge';
import { formatPrice } from '../utils/format';

export default function MarketOverview({ assets, prices, marketInfo }) {
  if (Object.keys(marketInfo).length === 0) {
    return <div className="m-card m-muted" style={{ fontSize: 13 }}>Loading data…</div>;
  }
  return (
    <div className="card overflow-auto" style={{ padding: 0 }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Asset</th>
            <th className="text-right">Price</th>
            <th className="text-right">24h</th>
            <th className="text-right">7d</th>
            <th className="text-right">ATH</th>
            <th className="text-right">From ATH</th>
            <th className="text-right">Market cap</th>
            <th className="text-right">Rank</th>
          </tr>
        </thead>
        <tbody>
          {assets.map(asset => {
            const mi = marketInfo[asset.symbol];
            if (!mi) return null;
            const pi = prices[asset.symbol] || {};
            const isCrypto = asset.asset_type === 'crypto' || asset.asset_type === 'dex_token';
            return (
              <tr key={asset.symbol}>
                <td><AssetBadge asset={asset.symbol} color={asset.color} /></td>
                <td className="text-right">{isCrypto ? formatPrice(pi.usd || 0, 'USD') : formatPrice(pi.eur || 0, 'EUR')}</td>
                <td className="text-right" style={{ color: (mi.change_24h || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {mi.change_24h >= 0 ? '+' : ''}{mi.change_24h || 0}%
                </td>
                <td className="text-right" style={{ color: (mi.change_7d || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {mi.change_7d ? (mi.change_7d >= 0 ? '+' : '') + mi.change_7d + '%' : '—'}
                </td>
                <td className="text-right" style={{ color: 'var(--text-1)' }}>
                  {mi.ath_usd > 0 ? formatPrice(mi.ath_usd, 'USD') : mi.ath_eur > 0 ? formatPrice(mi.ath_eur, 'EUR') : '—'}
                </td>
                <td className="text-right" style={{ color: 'var(--red)' }}>
                  {mi.ath_change_pct ? mi.ath_change_pct + '%' : '—'}
                </td>
                <td className="text-right">
                  {mi.market_cap_usd > 0 ? '$' + (mi.market_cap_usd >= 1e9 ? (mi.market_cap_usd / 1e9).toFixed(1) + 'B' : (mi.market_cap_usd / 1e6).toFixed(0) + 'M') : '—'}
                </td>
                <td className="text-right">{mi.rank > 0 ? '#' + mi.rank : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/pages/DashboardView.jsx`**

```jsx
import React, { useState } from 'react';
import { AreaChart, Area, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import AnimatedNumber from '../components/AnimatedNumber';
import StatRow from '../components/StatRow';
import DetailSheet from '../components/DetailSheet';
import Avatar from '../components/Avatar';
import Money from '../components/Money';
import Icon from '../components/Icon';
import MarketOverview from '../components/MarketOverview';
import {
  formatEUR, formatUSD, formatQty, formatPrice, formatDayLong,
  TOOLTIP_STYLE, TOOLTIP_LABEL_STYLE, TOOLTIP_ITEM_STYLE,
} from '../utils/format';
import { computeNetWorth, periodSeries, portfolioSeries30d, PERIODS } from '../utils/networth';

const ownMoney = (amount, currency) =>
  ((currency || 'EUR').toUpperCase() === 'USD' ? formatUSD : formatEUR)(Number(amount) || 0);
const pctText = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}%`;

// Pure view of the dashboard: net worth, allocation, three figures, holdings.
export default function DashboardView({
  displayName, data, assets, networth, cashPositions, history, marketInfo,
  cacheAge, refreshing, onRefresh, onToggleTracking,
}) {
  const [currency, setCurrency] = useState('EUR');
  const [period, setPeriod] = useState('1M');
  const [openCat, setOpenCat] = useState(null);
  const [sheetSym, setSheetSym] = useState(null);
  const [showMarket, setShowMarket] = useState(false);

  const { summary, prices, purchases } = data;
  const by = summary.by_asset;
  const nw = computeNetWorth({ summary, assets, prices, networth, cashPositions });

  // Everything is computed in EUR; the toggle only changes how it is shown.
  const isUsd = currency === 'USD' && !!nw.rate;
  const fx = isUsd ? nw.rate : 1;
  const cur = isUsd ? 'USD' : 'EUR';
  const money = (v) => (isUsd ? formatUSD(v * fx) : formatEUR(v));
  const signed = (v) => `${v >= 0 ? '+' : ''}${money(v)}`;
  const priceOf = (sym) => {
    const pi = prices[sym] || {};
    return isUsd ? formatPrice(pi.usd || (pi.eur || 0) * fx, 'USD') : formatPrice(pi.eur || 0, 'EUR');
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const trend = periodSeries(history, portfolioSeries30d(purchases, prices, assets), period);

  const share = (v) => (nw.total > 0 ? (v / nw.total) * 100 : 0);
  const byValue = (list) => [...list].sort((a, b) => (by[b.symbol]?.value || 0) - (by[a.symbol]?.value || 0));
  const assetLines = (list) => byValue(list).map(a => ({ key: a.symbol, name: a.name || a.symbol, value: money(by[a.symbol].value) }));
  const cats = [
    { key: 'stock', label: 'Stock market', color: 'var(--stock)', value: nw.stock, lines: assetLines(nw.stockAssets) },
    { key: 'cash', label: 'Cash', color: 'var(--cash)', value: nw.cash,
      lines: nw.accounts.map((acc, i) => ({ key: `${acc.name}-${i}`, name: acc.name, value: ownMoney(acc.balance, acc.currency) })) },
    { key: 'crypto', label: 'Crypto market', color: 'var(--crypto)', value: nw.crypto, lines: assetLines(nw.cryptoAssets) },
    { key: 'dry', label: 'Dry powder', color: 'var(--dry)', value: nw.dry,
      lines: (cashPositions || []).map(p => ({ key: p.id, name: p.label, value: ownMoney(p.amount_eur, p.currency) })) },
  ].sort((a, b) => b.value - a.value);

  const returnPct = summary.total_invested > 0 ? (summary.pnl / summary.total_invested) * 100 : 0;

  const holding = (a, muted) => {
    const d = by[a.symbol];
    const profitPct = d.invested > 0 ? (d.value / d.invested - 1) * 100 : 0;
    const tone = d.pnl >= 0 ? 'm-up' : 'm-down';
    return (
      <button type="button" key={a.symbol} className={`m-table__row ${muted ? 'is-muted' : ''}`} onClick={() => setSheetSym(a.symbol)}>
        <span className="m-table__name">
          <span className="m-row__title">{a.name || a.symbol}</span>
          <span className="m-table__sub">{formatQty(d.qty, a.decimals)} {a.symbol}</span>
        </span>
        <span className="m-table__price m-muted">{priceOf(a.symbol)}</span>
        <span>
          {money(d.value)}
          <span className={`m-table__sub m-table__phone ${tone}`}>{signed(d.pnl)}</span>
        </span>
        <span className="m-table__profit">
          <span className={tone}>{signed(d.pnl)}</span>
          <span className="m-table__sub">{pctText(profitPct)}</span>
        </span>
      </button>
    );
  };

  const sheetAsset = sheetSym ? assets.find(a => a.symbol === sheetSym) : null;
  const sd = sheetAsset ? by[sheetAsset.symbol] : null;
  const sheetIncluded = sd ? sd.include_in_totals !== false : false;
  const change24 = sheetAsset ? marketInfo[sheetAsset.symbol]?.change_24h : undefined;
  const sheetRows = sd ? [
    { label: 'Price', value: priceOf(sheetAsset.symbol) },
    { label: 'Average price', value: isUsd
      ? formatPrice(sd.avg_price_usd || (sd.avg_price || 0) * fx, 'USD')
      : formatPrice(sd.avg_price || 0, 'EUR') },
    { label: '24h change', value: change24 == null ? '' : pctText(change24) },
    { label: 'Quantity', value: `${formatQty(sd.qty, sheetAsset.decimals)} ${sheetAsset.symbol}` },
    { label: 'Invested', value: money(sd.invested) },
    { label: 'Profit', value: `${signed(sd.pnl)} (${pctText(sd.invested > 0 ? (sd.value / sd.invested - 1) * 100 : 0)})` },
  ] : [];

  return (
    <>
      {refreshing && <div className="top-progress"><div className="top-progress__bar" /></div>}

      <div className="m-greet">
        <h1 className="m-greet__title">{greeting}, {displayName}</h1>
        <div className="currency-toggle" title={nw.rate ? `1 € = ${nw.rate.toFixed(4)} $` : 'Exchange rate unavailable'}>
          {['EUR', 'USD'].map(c => (
            <button key={c} type="button"
              className={`currency-toggle__btn ${currency === c ? 'active' : ''}`}
              onClick={() => setCurrency(c)} disabled={c === 'USD' && !nw.rate}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="m-top">
        <div className="m-card">
          <div className="m-nw__head">
            <div className="m-label">Net worth</div>
            <div className="m-periods">
              {PERIODS.map(([k]) => (
                <button key={k} type="button" className={`m-periods__btn ${period === k ? 'is-active' : ''}`} onClick={() => setPeriod(k)}>{k}</button>
              ))}
            </div>
          </div>
          <AnimatedNumber value={nw.total * fx} prefix={isUsd ? '$' : '€'} smallDecimals className="m-nw__value" />
          {trend.series.length > 1 && (
            <>
              <div className="m-nw__delta">
                <span className={trend.delta >= 0 ? 'm-up' : 'm-down'}>{signed(trend.delta)}</span> · {trend.label}
              </div>
              <div className="m-nw__chart">
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={trend.series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <YAxis hide domain={[(min) => min * 0.985, (max) => max * 1.01]} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE}
                      cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                      formatter={(v) => [money(v), trend.usingHistory ? 'Net worth' : 'Portfolio']}
                      labelFormatter={(l) => formatDayLong(l)} />
                    <Area type="monotone" dataKey="value" stroke="#8D9BFF" strokeWidth={1.5} strokeLinecap="round" fill="none"
                      dot={false} activeDot={{ r: 3.5, fill: '#8D9BFF', stroke: '#1B1B24', strokeWidth: 1.5 }}
                      animationDuration={500} animationEasing="ease-out" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>

        <div className="m-card">
          <div className="m-label">Allocation</div>
          <div className="m-bar" role="img" aria-label="Allocation by market">
            {cats.filter(c => c.value > 0).map(c => (
              <span key={c.key} className="m-bar__seg" style={{ width: `${share(c.value)}%`, background: c.color }} />
            ))}
          </div>
          {cats.map(c => {
            const open = openCat === c.key;
            const canOpen = c.lines.length > 0;
            const Tag = canOpen ? 'button' : 'div';
            const has = c.value > 0;
            return (
              <React.Fragment key={c.key}>
                <Tag className={`m-cat ${open ? 'is-open' : ''}`}
                  {...(canOpen ? { type: 'button', 'aria-expanded': open, onClick: () => setOpenCat(open ? null : c.key) } : {})}>
                  <span className="m-cat__dot" style={{ background: c.color }} />
                  <span className={has ? '' : 'm-muted'}>
                    {c.label}{has && <span className="m-cat__pct">{share(c.value).toFixed(0)}%</span>}
                  </span>
                  <span className={has ? '' : 'm-muted'}>{has ? money(c.value) : '—'}</span>
                  <span className="m-cat__chev">{canOpen && <Icon name="chevron" size={14} />}</span>
                </Tag>
                {open && c.lines.map(l => (
                  <div className="m-sub" key={l.key}>
                    <span className="m-sub__name">{l.name}</span>
                    <span className="m-sub__val">{l.value}</span>
                  </div>
                ))}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <StatRow items={[
        { label: 'Profit', value: <Money value={summary.pnl * fx} currency={cur} sign />, tone: summary.pnl >= 0 ? 'up' : 'down' },
        { label: 'Return', value: pctText(returnPct), tone: returnPct >= 0 ? 'up' : 'down' },
        { label: 'Invested', value: <Money value={summary.total_invested * fx} currency={cur} /> },
      ]} />

      <div className="m-table__head">
        <span>Holdings</span><span>Price</span><span>Value</span><span>Profit</span>
      </div>
      {byValue(nw.mainAssets).map(a => holding(a, false))}

      {nw.specAssets.length > 0 && (
        <>
          <div className="m-section">
            <span>Speculative, not included</span>
            <span>{money(summary.spec_value || 0)}</span>
          </div>
          {byValue(nw.specAssets).map(a => holding(a, true))}
        </>
      )}

      <div className="m-section">
        <span>Market overview</span>
        <button type="button" className="m-link" onClick={() => setShowMarket(s => !s)}>{showMarket ? 'Hide' : 'Show'}</button>
      </div>
      {showMarket && <MarketOverview assets={assets} prices={prices} marketInfo={marketInfo} />}

      <div className="m-foot">
        <span>Prices {cacheAge != null ? `updated ${Math.round(cacheAge / 60)} min ago` : 'loading'}</span>
        <button type="button" className="m-link" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? 'Refreshing…' : 'Refresh now'}
        </button>
      </div>

      <DetailSheet open={!!sd} onClose={() => setSheetSym(null)}
        avatar={sheetAsset && <Avatar asset={sheetAsset.symbol} />}
        title={sheetAsset ? (sheetAsset.name || sheetAsset.symbol) : ''}
        subtitle={sheetAsset?.symbol}
        amount={sd && <Money value={sd.value * fx} currency={cur} />}
        rows={sheetRows}>
        {sd && (
          <div className="m-sheet__row">
            <span>Include in totals</span>
            <label className="toggle">
              <input type="checkbox" aria-label="Include in totals" checked={sheetIncluded}
                onChange={() => onToggleTracking(sheetAsset.symbol, sheetIncluded)} />
              <span className="toggle__slider" />
            </label>
          </div>
        )}
      </DetailSheet>
    </>
  );
}
```

- [ ] **Step 3: Rewrite `src/pages/Dashboard.jsx` as the container**

Replace the whole file with:

```jsx
import React, { useState, useEffect, useRef } from 'react';
import PageLayout from '../components/PageLayout';
import { DashboardSkeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { api } from '../api.js';
import { getDisplayName } from '../utils/user';
import { computeNetWorth } from '../utils/networth';
import DashboardView from './DashboardView';

export default function Dashboard() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [networth, setNetworth] = useState(null);
  const [cashPositions, setCashPositions] = useState([]);
  const [history, setHistory] = useState([]);
  const snapshotDone = useRef(false);
  const [user, setUser] = useState(null);
  const [assets, setAssets] = useState([]);
  const [marketInfo, setMarketInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [cacheAge, setCacheAge] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    try {
      const [d, u, a, s, nw, cp] = await Promise.all([
        api.getDashboard(), api.getMe(), api.getAssets(),
        api.getPricesStatus().catch(() => ({})),
        api.getNetWorth().catch(() => null),
        api.getCashPositions().catch(() => []),
      ]);
      setData(d); setUser(u); setAssets(a); setNetworth(nw); setCashPositions(cp || []);
      setCacheAge(s?.cache_age_seconds);
      api.getMarketInfo().then(setMarketInfo).catch(() => {});
      api.getNetworthHistory().then(h => setHistory(h || [])).catch(() => {});

      // Record today's net-worth snapshot once per load (backend upserts per day).
      if (!snapshotDone.current) {
        snapshotDone.current = true;
        try {
          const n = computeNetWorth({ summary: d.summary, assets: a, prices: d.prices || {}, networth: nw, cashPositions: cp || [] });
          await api.postNetworthSnapshot({ total: n.total, portfolio: n.portfolio, cash: n.cash, dry: n.dry });
          api.getNetworthHistory().then(h => setHistory(h || [])).catch(() => {});
        } catch (e) { /* best-effort */ }
      }
    } catch (err) {}
  };

  const forceRefresh = async () => {
    setRefreshing(true);
    try { await api.refreshPrices(); await refresh(); toast('Prices updated', 'success'); }
    catch (err) { toast('Error: ' + err.message, 'error'); }
    finally { setRefreshing(false); }
  };

  useEffect(() => {
    const init = async () => { await refresh(); setLoading(false); };
    init();
    const iv = setInterval(refresh, 60000);
    return () => clearInterval(iv);
  }, []);

  const handleToggleTracking = async (symbol, currentValue) => {
    try {
      await api.updateAssetTracking(symbol, !currentValue);
      await refresh();
      toast(`${symbol} ${!currentValue ? 'included in totals' : 'excluded from totals'}`, 'success');
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  };

  if (loading) return <PageLayout title="Dashboard" username=""><DashboardSkeleton /></PageLayout>;
  if (!data || !user) return <div className="loading-screen"><div className="loading-error">Failed to load</div></div>;

  return (
    <PageLayout title="Dashboard" username={user.username}>
      <DashboardView displayName={getDisplayName(user.username)} data={data} assets={assets}
        networth={networth} cashPositions={cashPositions} history={history} marketInfo={marketInfo}
        cacheAge={cacheAge} refreshing={refreshing} onRefresh={forceRefresh} onToggleTracking={handleToggleTracking} />
    </PageLayout>
  );
}
```

- [ ] **Step 4: Insert the Dashboard styles into `src/mercury.css`**

Insert this block immediately **before** the line `@media (min-width: 641px) {` (so the tone helpers at the end of the file still come last):

```css
/* Dashboard */
.m-greet { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
.m-greet__title { font-size: 24px; font-weight: 400; letter-spacing: -0.02em; line-height: 1.2; color: var(--text-1); min-width: 0; }
.m-top { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 14px; align-items: start; }
.m-top + .m-stats { padding-top: 20px; }
.m-nw__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.m-nw__value { display: block; margin: 2px 0 4px; font-size: 38px; font-weight: 400; letter-spacing: -0.025em; line-height: 1.15; color: var(--text-1); white-space: nowrap; }
.m-nw__value .num__affix { font-size: 1em; font-weight: 400; opacity: 1; margin: 0; top: 0; letter-spacing: inherit; }
.m-nw__value .num__dec { font-size: 1em; font-weight: 400; color: var(--text-2); }
.m-nw__delta { font-size: 13px; color: var(--text-2); }
.m-nw__chart { margin-top: 14px; }
.m-periods { display: flex; gap: 14px; }
.m-periods__btn { background: none; border: 0; padding: 0; font: inherit; font-size: 12px; color: var(--text-2); cursor: pointer; }
.m-periods__btn:hover { color: var(--text-1); }
.m-periods__btn.is-active { color: var(--text-1); font-weight: 500; }

.m-bar { display: flex; gap: 2px; height: 4px; margin: 12px 0 4px; }
.m-bar__seg { border-radius: 2px; min-width: 2px; }
.m-cat {
  display: grid; grid-template-columns: 8px minmax(0, 1fr) auto 14px; gap: 10px; align-items: center;
  width: 100%; padding: 11px 0; background: none; border: 0; border-top: 1px solid var(--border);
  color: var(--text-1); font: inherit; font-size: 14px; text-align: left;
}
button.m-cat { cursor: pointer; }
.m-cat__dot { width: 8px; height: 8px; border-radius: 50%; }
.m-cat__pct { margin-left: 6px; font-size: 12px; color: var(--text-2); }
.m-cat__chev { display: flex; color: var(--text-2); transition: transform 160ms var(--ease); }
.m-cat.is-open .m-cat__chev { transform: rotate(180deg); }
.m-sub { display: flex; justify-content: space-between; gap: 12px; padding: 0 24px 10px 18px; font-size: 13px; color: var(--text-2); }
.m-sub__name { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.m-sub__val { color: var(--text-1); white-space: nowrap; }

.m-table__head, .m-table__row { display: grid; grid-template-columns: minmax(0, 1.6fr) 1fr 1fr 1.1fr; gap: 12px; align-items: center; }
.m-table__head { padding: 18px 0 8px; font-size: 12px; color: var(--text-2); }
.m-table__row {
  width: 100%; padding: 11px 0; background: none; border: 0; border-top: 1px solid var(--border);
  color: var(--text-1); font: inherit; font-size: 14px; text-align: left; cursor: pointer;
}
.m-table__row:hover { background: rgba(255,255,255,0.02); }
.m-table__row.is-muted { opacity: 0.6; }
.m-table__head > :not(:first-child), .m-table__row > :not(:first-child) { text-align: right; white-space: nowrap; }
.m-table__name { min-width: 0; }
.m-table__sub { display: block; margin-top: 1px; font-size: 12px; color: var(--text-2); }
.m-table__phone { display: none; }
.m-section { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 22px 0 8px; font-size: 13px; color: var(--text-2); }
.m-foot { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 28px 0 8px; font-size: 12px; color: var(--text-2); }

@media (max-width: 860px) {
  .m-top { grid-template-columns: minmax(0, 1fr); }
}
```

Then, inside the existing `@media (max-width: 640px) { … }` block, add these lines just before its closing brace:

```css
  .m-greet__title { font-size: 22px; }
  .m-nw__value { font-size: 32px; }
  .m-table__head, .m-table__row { grid-template-columns: minmax(0, 1fr) auto; }
  .m-table__head > :not(:first-child), .m-table__price, .m-table__profit { display: none; }
  .m-table__phone { display: block; }
```

Finally, the tone helpers must also beat `.m-table__sub`. Replace the last three lines of the file (`.m-muted`, `.m-up`, `.m-down`) with:

```css
.m-muted, .m-table__sub.m-muted { color: var(--text-2); }
.m-up, .m-table__sub.m-up { color: var(--green); }
.m-down, .m-table__sub.m-down { color: var(--red); }
```

- [ ] **Step 5: Add the Dashboard to the preview**

In `src/preview/main.jsx` add the import:

```jsx
import DashboardView from '../pages/DashboardView';
```

Add this component above `const PAGES`:

```jsx
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
```

And the entries in `PAGES`:

```jsx
  dashboard: () => <DashboardDemo />,
  'dashboard-bare': () => <DashboardDemo bare />,
```

- [ ] **Step 6: Build and test**

Run: `npm run build && npm test`
Expected: build succeeds, all tests PASS.

- [ ] **Step 7: Look at it and use it**

Open `?p=dashboard` at desktop and at 390px. With the fixtures the expected figures are:

- Net worth `€33,833.83` (portfolio 3,583.83 + cash 30,000.00 + dry powder 250.00; the rate is 1.12, so $33,600 of cash is €30,000). `.83` is grey and the `€` is the same size as the digits.
- Allocation is sorted by value: Cash `89%` `€30,000.00`, Crypto market `8%` `€2,777.75`, Stock market `2%` `€806.08`, Dry powder `1%` `€250.00`. The bar has four segments in the same order.
- Figures: Profit `+€543.00` green, Return `+17.9%` green, Invested `€3,040.83`.
- Holdings, by value: Bitcoin `€1,580.67` (profit `+€380.67`, `+31.7%`), Aerodrome Finance `€1,197.08`, Vanguard FTSE All-World UCITS ETF `€806.08`. Then `Speculative, not included` `€168.01` with Brett dimmed and its profit `−€2,020.59` in rose.

Interactions:
- Click `1W`, `1Y`, `All`: the line redraws and the grey label changes to `last 7 days`, `last year`, `all time`.
- Click `Cash`: two account lines open under it (`Mercury Checking ••1234` `$28,000.00`, `Relay` `$5,600.00`) and the chevron flips. Click `Crypto market`: Cash closes and the two crypto lines open.
- Click `USD`: net worth becomes `$37,893.89`, holdings and figures switch to `$`; the two account lines stay in their own currency.
- Click the Bitcoin row: the sheet shows Price `€76,000.00`, Average price `€57,697.13`, 24h change `+1.8%`, Quantity, Invested `€1,200.00`, Profit `+€380.67 (+31.7%)`, and an `Include in totals` switch that is on. Turn it off: Bitcoin moves under `Speculative, not included` and the net worth reads `€32,253.16`.
- `Show` next to Market overview reveals the table; `Hide` hides it.

390px:
- The two cards stack; the three figures stay on one row at 16px without overflow.
- Holdings rows are two lines: value with profit under it; no Price column.
- No sideways scroll (`document.documentElement.scrollWidth === window.innerWidth`).

Open `?p=dashboard-bare`: no chart crash — the label reads `portfolio, last 30 days`; Cash and Dry powder rows are grey with `—` and are not clickable.

No console errors (recharts may warn about width 0 on first paint in a hidden pane — ignore only that).

- [ ] **Step 8: Commit**

```bash
git add src/components/MarketOverview.jsx src/pages/Dashboard.jsx src/pages/DashboardView.jsx src/mercury.css src/preview/main.jsx
git commit -m "Dashboard: net worth with its chart, allocation as a list, holdings table and sheet"
```

---

### Task 6: Whole-app pass and hand-off

**Files:**
- Modify: only what the checks below prove is broken.

**Interfaces:**
- Consumes: everything above.
- Produces: a build ready for the owner to push.

- [ ] **Step 1: Full test and build**

Run: `npm test && npm run build`
Expected: all tests PASS; build succeeds; `ls dist | grep -c preview` prints `0`.

- [ ] **Step 2: No forbidden leftovers in the new code**

Run: `grep -nE "font-size: *(9|10|11)px|uppercase|Space Grotesk|Instrument Serif|gradient\(" src/mercury.css src/components/{Money,Avatar,PageHead,StatRow,Tabs,LedgerRow,DetailSheet,MarketOverview}.jsx src/pages/{Diary,DiaryView,Dashboard,DashboardView}.jsx`
Expected: no output.

Run: `grep -n "Space+Grotesk\|Instrument+Serif" index.html`
Expected: no output.

- [ ] **Step 3: The real app still boots**

With the dev server running, open `http://localhost:5173/login`. Expected: the login card renders on the flat `#14141B` background, Inter only, the primary button flat indigo, no console errors. (Logging in is not possible; this only proves the real entry point is intact.)

- [ ] **Step 4: Final look, all five screens**

Take one desktop and one 390px screenshot each of `?p=diary`, `?p=dashboard`, `?p=components&sheet=1`. Compare with the checks in Tasks 3–5; fix anything that drifted, re-run Step 1, and commit the fix with a message naming what was fixed.

- [ ] **Step 5: Hand off**

Report to the owner: what changed, the screenshots, and that the deploy needs their push:

```bash
git -C "/Users/seastini_f/Claude Code Projects/Internal/App/Wealth/wealth-frontend-main" push https://github.com/sestinif/wealth-frontend.git main
```

Known and intended in this phase, to mention in the report:
- Add Movement, Reports, Charts, Calculator and Settings already use the new colours and typeface but keep their old layout until Phase 2. Reports still shows `1,234.00€` with the symbol after the number.
- The floating quick-buy button stays, restyled flat.
- The sidebar no longer shows `Investment tracker` and the count of tracked assets.
- Ledger avatars use the real coin logos already present in the app.
