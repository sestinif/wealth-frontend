# Wealth «Mercury dark» — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the remaining pages of Wealth — Add movement, Charts, Reports, DCA calculator, Settings, Login, Setup and the three overlays — to the Mercury-dark look already live on Diary and Dashboard.

**Architecture:** Phase 1 left a kit in place: `src/mercury.css` (tokens + `m-` components), shared components in `src/components/`, pure helpers in `src/utils/`, and a dev-only preview at `/preview.html?p=<key>`. Phase 2 adds a small form kit, then rewrites the **markup** of each remaining page with that kit. **State, effects, handlers and API calls of every page stay as they are**: only what is rendered changes. The preview gets a mock of the `api` object so the real pages render without a login.

**Tech Stack:** React 18, Vite 6, react-router-dom 6, recharts 2, plain CSS. Tests: Node built-in runner (`npm test`). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-06-wealth-mercury-redesign-design.md` (§7 covers these pages). The owner approved mockups for Add movement and Charts on 06/10/2026; their content is written into Tasks 2 and 3.

## Global Constraints

- Work in `/Users/seastini_f/Claude Code Projects/Internal/App/Wealth/wealth-frontend-main`, branch `mercury-phase-2` (already checked out). Commit after each task. **Never push**, never switch branch. Use `git add` with explicit paths, never `git add -A` or `git add .`.
- No backend changes. No new npm dependencies. Do not edit `src/styles.css` (legacy stylesheet; overrides go in `src/mercury.css`).
- **Logic is frozen.** In a page you restyle, do not change state names, effects, handlers, validation, API calls or what they send. If the new markup makes a piece of state unused, delete that state; nothing else.
- One typeface: Inter 400/500. No text below 12px. No `text-transform: uppercase`, no wide `letter-spacing`. No inline `fontSize` below 12.
- No gradients, glow, grain or decorative shadows. Charts: `isAnimationActive={false}`, one indigo hue (`#8D9BFF`, `#5F69B8`, `#3D4272`) plus grey `#9A9AA8`.
- Colour carries one meaning: green `var(--green)` = gain or money in, rose `var(--red)` = loss or destructive action. Everything else indigo or grey. Never use `--cash`, `--stock`, `--crypto`, `--dry` as text colour.
- Money: use `formatEUR`, `formatUSD`, `formatPrice`, `formatPnL` or `<Money>`; symbol first; never hand-build a figure with a trailing `€`.
- Dates shown to the user: `formatDay` (`Sep 11`) or `formatDayLong` (`Sep 11, 2026`), not `formatDate`.
- UI copy: English, sentence case (`Add purchase`, `Money in`, `Sign in`). No ALL CAPS strings.
- New class names start with `m-`. Legacy selectors with two or more classes (for example `.auth-card .form-input`) beat single-class overrides: when you override a legacy rule in `mercury.css`, match its selector.
- Destructive actions sit behind the `DetailSheet` danger button (tap to arm, tap again to confirm), never as an always-visible button in a row.
- Every page touched must look right at **390px** and at desktop width, with no sideways scroll.

## Kit available from Phase 1 (do not re-create)

Components (default exports in `src/components/`):
- `PageHead({ title, action, children })` — `action` is `{ to, label }`; `children` render to the left of the action.
- `StatRow({ items, variant = 'row', note })` — `items` is `[{ label, value, tone }]`, tone `'up' | 'down'`.
- `Tabs({ tabs, value, onChange, right })` — `tabs` is `[{ key, label }]`.
- `LedgerRow({ date, avatar, title, sub, subShort, amount, tone, onClick })` — tone `'in' | ''`.
- `DetailSheet({ open, onClose, avatar, title, subtitle, amount, rows, danger, children })` — `rows` is `[{ label, value }]` (empty values are skipped); `danger` is `{ label, confirmLabel, onConfirm }`.
- `Avatar({ asset, label })`, `Money({ value, currency = 'EUR', sign = false })`, `Icon({ name, size })`, `MarketOverview`.

Helpers: `src/utils/format.js` (`formatEUR`, `formatUSD`, `formatPrice`, `formatPnL`, `formatQty`, `formatDay`, `formatDayLong`, `formatMonth`, `moneyParts`, `TOOLTIP_STYLE`, `TOOLTIP_LABEL_STYLE`, `TOOLTIP_ITEM_STYLE`), `src/utils/networth.js` (`computeNetWorth`, `periodSeries`, `portfolioSeries30d`, `PERIODS`), `src/utils/ledger.js`.

CSS classes in `src/mercury.css`: `m-card`, `m-label`, `m-link`, `m-select`, `m-month`, `m-empty`, `m-section`, `m-foot`, `m-muted`, `m-up`, `m-down`, `m-top`, `m-nw__head`, `m-nw__value`, `m-nw__delta`, `m-nw__chart`, `m-periods`, `m-periods__btn`, `m-table__head`, `m-table__row`, `m-table__name`, `m-table__sub`, `m-table__price`, `m-table__profit`, `m-table__phone`, `m-row__title`, `m-sheet__row`. The three tone helpers (`.m-muted…`, `.m-up…`, `.m-down…`) must stay the last rules of the file.

## How to verify visually

Start the dev server with the Browser tool `preview_start`, `name: "wealth"` (never with Bash). Open `http://localhost:5173/preview.html?p=<key>`. Screenshot at desktop (`resize_window` preset `desktop`) and at phone (`width: 390, height: 844`), then reset to `desktop`. `read_console_messages` with `onlyErrors: true` must show nothing from our code. No sideways scroll: `document.documentElement.scrollWidth === window.innerWidth`.

---

### Task 1: Form kit, row variants, preview API mock

**Files:**
- Create: `src/components/Field.jsx`, `src/components/AmountField.jsx`, `src/components/Segmented.jsx`, `src/components/Switch.jsx`, `src/components/Pick.jsx`, `src/preview/mockApi.js`
- Modify: `src/components/LedgerRow.jsx`, `src/components/StatRow.jsx`, `src/components/Tabs.jsx`, `src/mercury.css`, `src/preview/fixtures.js`, `src/preview/main.jsx`

**Interfaces:**
- Consumes: Phase 1 kit.
- Produces:
  - `Field({ label, right, hint, children })` — label row (label left, `right` node at the far right), the control, an optional hint line.
  - `AmountField({ label, right, symbol, value, onChange, placeholder = '0.00', caption, disabled })` — the big amount input; `onChange` receives the string value.
  - `Segmented({ options, value, onChange })` — `options` is `[{ key, label }]`.
  - `Switch({ label, checked, onChange })` — `onChange` receives the boolean.
  - `Pick({ options, value, onChange, disabledKeys = [] })` — small inline text choice (`EUR · USD`); `options` is an array of strings.
  - `LedgerRow` renders a non-interactive `div` (no dots, no pointer) when `onClick` is not passed.
  - `StatRow` accepts 4 items (2×2 on phones).
  - `Tabs` no longer claims ARIA tab roles.
  - CSS: restyled legacy form classes (`form-group`, `form-label`, `form-input`, `form-hint`), `m-form`, `m-g2`, `m-caption`, `m-legend`, `m-dist`, `m-result`.
  - `installMockApi(api)` from `src/preview/mockApi.js`, and preview keys reserved for later tasks.

- [ ] **Step 1: Create `src/components/Field.jsx`**

```jsx
import React from 'react';

// A labelled control: label on the left, an optional extra on the right, hint below.
export default function Field({ label, right, hint, children }) {
  return (
    <div className="form-group">
      {(label || right) && (
        <div className="form-label">
          <span>{label}</span>
          {right}
        </div>
      )}
      {children}
      {hint && <div className="form-hint">{hint}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/AmountField.jsx`**

```jsx
import React, { useId } from 'react';

// The one big figure of a form: currency symbol, large input, a caption under it.
export default function AmountField({ label, right, symbol, value, onChange, placeholder = '0.00', caption, disabled }) {
  const id = useId();
  return (
    <div className="form-group">
      <div className="form-label">
        <label htmlFor={id}>{label}</label>
        {right}
      </div>
      <div className="m-amount">
        <span className="m-amount__sym">{symbol}</span>
        <input id={id} className="m-amount__input" type="number" step="any" min="0" inputMode="decimal"
          value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} />
      </div>
      {caption && <div className="m-caption">{caption}</div>}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/Segmented.jsx`**

```jsx
import React from 'react';

// Two or three mutually exclusive choices, neutral colours.
export default function Segmented({ options, value, onChange }) {
  return (
    <div className="m-seg" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(o => (
        <button key={o.key} type="button" aria-pressed={value === o.key}
          className={`m-seg__btn ${value === o.key ? 'is-active' : ''}`} onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/components/Switch.jsx`**

```jsx
import React from 'react';

// A labelled on/off row. Reuses the legacy .toggle control.
export default function Switch({ label, checked, onChange }) {
  return (
    <div className="m-switch">
      <span>{label}</span>
      <label className="toggle">
        <input type="checkbox" aria-label={label} checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="toggle__slider" />
      </label>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/components/Pick.jsx`**

```jsx
import React from 'react';

// A small inline choice written as text: "EUR · USD".
export default function Pick({ options, value, onChange, disabledKeys = [] }) {
  return (
    <span className="m-pick">
      {options.map(o => (
        <button key={o} type="button" aria-pressed={value === o} disabled={disabledKeys.includes(o)}
          className={`m-pick__btn ${value === o ? 'is-active' : ''}`} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </span>
  );
}
```

- [ ] **Step 6: `LedgerRow` without a click target**

Replace the whole of `src/components/LedgerRow.jsx` with:

```jsx
import React from 'react';
import Icon from './Icon';

// One ledger line. Desktop: date · avatar · name+detail · amount · dots.
// Phone: avatar · name+short detail · amount with the date under it.
// Without onClick it is a plain row: no dots, no pointer.
export default function LedgerRow({ date, avatar, title, sub, subShort, amount, tone = '', onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`m-row ${onClick ? '' : 'm-row--static'}`.trim()} {...(onClick ? { type: 'button', onClick } : {})}>
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
      <span className="m-row__more" aria-hidden="true">{onClick && <Icon name="dots" size={16} />}</span>
    </Tag>
  );
}
```

- [ ] **Step 7: `StatRow` with four items, `Tabs` without tab roles**

In `src/components/StatRow.jsx` replace the opening tag line

```jsx
    <div className={`m-stats m-stats--${variant}`}>
```

with

```jsx
    <div className={`m-stats m-stats--${variant} ${items.length === 4 ? 'm-stats--four' : ''}`.trim()}>
```

In `src/components/Tabs.jsx` remove `role="tablist"` from the list `div`, and on the button replace `role="tab" aria-selected={value === t.key}` with `aria-pressed={value === t.key}`.

- [ ] **Step 8: Add the form styles to `src/mercury.css`**

Insert this block immediately **before** the line `/* Dashboard */`:

```css
/* Forms — the legacy form classes, restyled once for every page */
.form-group { margin-bottom: 16px; }
.form-label {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  margin-bottom: 6px; font-size: 12px; font-weight: 400; color: var(--text-2);
  text-transform: none; letter-spacing: 0;
}
.form-input, .auth-card .form-input {
  width: 100%; height: 44px; padding: 0 12px;
  background: transparent; border: 1px solid var(--border-hover); border-radius: 8px;
  color: var(--text-1); font: inherit; font-size: 15px; box-shadow: none;
}
textarea.form-input { height: auto; min-height: 72px; padding: 10px 12px; }
.form-input::placeholder, .auth-card .form-input::placeholder { color: var(--text-2); }
.form-input:focus, .auth-card .form-input:focus { border-color: var(--accent); box-shadow: none; outline: none; }
.form-input:disabled { opacity: 1; color: var(--text-2); border-color: var(--border); }
.form-input--lg { height: 48px; padding: 0 14px; font-size: 16px; border-radius: 8px; }
select.form-input {
  appearance: none; -webkit-appearance: none; padding-right: 32px;
  background: transparent url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%239A9AA8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") right 12px center no-repeat;
}
select.form-input option { background: var(--bg-elev); color: var(--text-1); }
.form-hint, .m-caption { margin-top: 6px; font-size: 12px; color: var(--text-2); }
.alert { font-size: 13px; border-radius: 8px; }

.m-form { max-width: 440px; }
.m-g2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; }
.m-g2--cards { gap: 14px; margin-top: 14px; align-items: start; }

.m-amount { display: flex; align-items: baseline; gap: 2px; padding-bottom: 10px; border-bottom: 1px solid var(--border-hover); }
.m-amount:focus-within { border-bottom-color: var(--accent); }
.m-amount__sym { font-size: 34px; letter-spacing: -0.025em; color: var(--text-2); }
.m-amount__input {
  flex: 1; min-width: 0; padding: 0; background: none; border: 0; outline: none;
  color: var(--text-1); font: inherit; font-size: 34px; letter-spacing: -0.025em;
  -moz-appearance: textfield; appearance: textfield;
}
.m-amount__input::-webkit-outer-spin-button, .m-amount__input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.m-amount__input::placeholder { color: var(--text-2); }

.m-seg { display: grid; padding: 3px; border: 1px solid var(--border); border-radius: 8px; }
.m-seg__btn { padding: 8px 0; background: none; border: 0; border-radius: 6px; font: inherit; font-size: 13px; color: var(--text-2); cursor: pointer; }
.m-seg__btn.is-active { background: var(--bg-elev); color: var(--text-1); font-weight: 500; }

.m-switch { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; font-size: 14px; color: var(--text-1); }

.m-pick { display: inline-flex; gap: 2px; }
.m-pick__btn { padding: 6px 4px; margin: -6px 0; background: none; border: 0; font: inherit; font-size: 12px; color: var(--text-2); cursor: pointer; }
.m-pick__btn + .m-pick__btn::before { content: '·'; margin-right: 6px; color: var(--text-2); }
.m-pick__btn.is-active { color: var(--text-1); font-weight: 500; }
.m-pick__btn:disabled { opacity: 0.4; cursor: not-allowed; }

.m-row--static { cursor: default; }
.m-row--static:hover { background: none; }

.m-stats--four { grid-template-columns: repeat(4, minmax(0, 1fr)); }

.m-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 10px; font-size: 12px; color: var(--text-2); }
.m-legend__dot { display: inline-block; width: 8px; height: 8px; margin-right: 6px; border-radius: 50%; }

.m-dist { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 10px; padding: 9px 0; border-top: 1px solid var(--border); font-size: 13px; color: var(--text-1); }
.m-dist__name { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.m-dist__pct { margin-left: 6px; font-size: 12px; color: var(--text-2); }
.m-dist__bar { grid-column: 1 / -1; height: 4px; border-radius: 2px; background: var(--bg-elev); }
.m-dist__fill { display: block; height: 4px; border-radius: 2px; background: var(--accent); }

.m-result { margin-top: 4px; padding-top: 14px; border-top: 1px solid var(--border); }
.m-result__value { margin: 2px 0 4px; font-size: 24px; letter-spacing: -0.02em; color: var(--text-1); }
.m-result__meta { font-size: 13px; color: var(--text-2); }
.m-result__warn { margin-top: 6px; font-size: 13px; color: var(--red); }

```

Then, inside the existing `@media (max-width: 860px) { … }` block (the one that holds `.m-top { grid-template-columns: minmax(0, 1fr); }`), add:

```css
  .m-g2--cards { grid-template-columns: minmax(0, 1fr); }
```

And inside the existing `@media (max-width: 640px) { … }` block, just before its closing brace, add:

```css
  .form-input { font-size: 16px; }   /* below 16px iOS zooms the page on focus */
  .m-stats--four { grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 14px; }
```

Confirm the last three rules of the file are still the tone helpers.

- [ ] **Step 9: Extend the fixtures**

In `src/preview/fixtures.js`:

1. In the `history` generator, add a `portfolio` field next to `total` so the object reads `{ date: …, total: Math.round(31000 + i * 58 + wobble), portfolio: Math.round(3000 + i * 9.7 + wobble / 4) }`.
2. Append:

```js
export const me = { username: 'federico', email: 'federico@example.com', created_at: '2024-03-01T10:00:00Z' };

const reportOf = (rows) => {
  const by_asset = {};
  rows.forEach(p => {
    const d = dashboard.summary.by_asset[p.asset];
    const share = p.quantity / d.qty;
    const cur = by_asset[p.asset] || { invested: 0, value: 0, qty: 0, pnl: 0 };
    cur.invested += p.amount_eur; cur.qty += p.quantity; cur.value += d.value * share;
    cur.pnl = cur.value - cur.invested;
    by_asset[p.asset] = cur;
  });
  const total_invested = rows.reduce((s, p) => s + p.amount_eur, 0);
  const total_value = Object.values(by_asset).reduce((s, d) => s + d.value, 0);
  const pnl = total_value - total_invested;
  return { total_invested, total_value, pnl, pnl_pct: total_invested > 0 ? (pnl / total_invested) * 100 : 0, by_asset, transactions: rows };
};
export const reports = {
  lifetime: reportOf(purchases),
  annual: reportOf(purchases.filter(p => p.date.startsWith('2026'))),
  monthly: reportOf(purchases.filter(p => p.date.startsWith('2026-06'))),
};

export const searchResults = [
  { symbol: 'ETH', name: 'Ethereum', asset_type: 'crypto', coingecko_id: 'ethereum', price_usd: 2700.81, thumb: '' },
  { symbol: 'SOL', name: 'Solana', asset_type: 'crypto', coingecko_id: 'solana', price_usd: 119.99, thumb: '' },
];
```

- [ ] **Step 10: Create `src/preview/mockApi.js`**

```js
// Dev-only: swaps the methods of the real `api` object for fixture-backed ones,
// so the real pages render in /preview.html without a login or a backend.
import * as fx from './fixtures';

const ok = (value) => () => Promise.resolve(value);
let nextId = 1000;

export function installMockApi(api) {
  const state = {
    purchases: [...fx.purchases],
    bankEntries: [...fx.bankEntries],
    cashPositions: [...fx.cashPositions],
    assets: [...fx.assets],
  };
  Object.assign(api, {
    getMe: ok(fx.me),
    getPrices: ok(fx.dashboard.prices),
    getPricesStatus: ok({ cache_age_seconds: 240 }),
    refreshPrices: ok({}),
    getDashboard: () => Promise.resolve({ ...fx.dashboard, purchases: state.purchases }),
    getNetWorth: ok(fx.networth),
    getNetworthHistory: ok(fx.history),
    postNetworthSnapshot: ok({}),
    getMarketInfo: ok(fx.marketInfo),
    getAssets: () => Promise.resolve(state.assets),
    getPurchases: () => Promise.resolve(state.purchases),
    getCashPositions: () => Promise.resolve(state.cashPositions),
    getBankEntries: () => Promise.resolve(state.bankEntries),
    getLifetimeReport: ok(fx.reports.lifetime),
    getAnnualReport: ok(fx.reports.annual),
    getMonthlyReport: ok(fx.reports.monthly),
    searchAssets: ok(fx.searchResults),
    addPurchase: (date, asset, amount_eur, price_eur, notes = '') => {
      const p = { id: `p${nextId++}`, date, asset, amount_eur, price_eur, quantity: amount_eur / price_eur, notes };
      state.purchases = [p, ...state.purchases];
      return Promise.resolve(p);
    },
    deletePurchase: (id) => { state.purchases = state.purchases.filter(p => p.id !== id); return Promise.resolve({}); },
    addBankEntry: (bank, date, amount, currency = 'USD', note = '') => {
      const en = { id: nextId++, bank, date, amount, currency, note };
      state.bankEntries = [en, ...state.bankEntries];
      return Promise.resolve(en);
    },
    deleteBankEntry: (id) => { state.bankEntries = state.bankEntries.filter(e => e.id !== id); return Promise.resolve({}); },
    addCashPosition: (label, amount_eur, currency = 'EUR') => {
      const p = { id: `c${nextId++}`, label, amount_eur, currency };
      state.cashPositions = [...state.cashPositions, p];
      return Promise.resolve(p);
    },
    updateCashPosition: (id, label, amount_eur, currency = 'EUR') => {
      state.cashPositions = state.cashPositions.map(p => (p.id === id ? { ...p, label, amount_eur, currency } : p));
      return Promise.resolve({});
    },
    deleteCashPosition: (id) => { state.cashPositions = state.cashPositions.filter(p => p.id !== id); return Promise.resolve({}); },
    addAsset: (a) => { state.assets = [...state.assets, { decimals: 4, color: '#8D9BFF', ...a }]; return Promise.resolve({}); },
    removeAsset: (symbol) => { state.assets = state.assets.filter(a => a.symbol !== symbol); return Promise.resolve({}); },
    updateAssetColor: ok({}),
    updateAssetTracking: ok({}),
    changePassword: ok({}),
    logoutAll: ok({}),
    login: ok({ access_token: 'preview' }),
    setup: ok({ access_token: 'preview' }),
  });
}
```

- [ ] **Step 11: Wire the mock and a `forms` page into the preview**

In `src/preview/main.jsx`:

1. Add these imports next to the others:

```jsx
import { api } from '../api.js';
import { installMockApi } from './mockApi';
import Field from '../components/Field';
import AmountField from '../components/AmountField';
import Segmented from '../components/Segmented';
import Switch from '../components/Switch';
import Pick from '../components/Pick';
```

2. Directly after the imports add `installMockApi(api);`

3. Add this component above `const PAGES`:

```jsx
function FormsDemo() {
  const [amount, setAmount] = React.useState('500');
  const [dir, setDir] = React.useState('in');
  const [live, setLive] = React.useState(true);
  const [cur, setCur] = React.useState('EUR');
  return (
    <Frame title="Forms" size="md">
      <PageHead title="Forms" />
      <div className="m-form">
        <Field><Segmented options={[{ key: 'in', label: 'Money in' }, { key: 'out', label: 'Money out' }]} value={dir} onChange={setDir} /></Field>
        <Field label="Asset" right={<button type="button" className="m-link">New asset</button>}>
          <select className="form-input"><option>Bitcoin · BTC</option><option>Vanguard FTSE All-World UCITS ETF · VUAA</option></select>
        </Field>
        <AmountField label="Amount" right={<Pick options={['EUR', 'USD']} value={cur} onChange={setCur} />}
          symbol={cur === 'USD' ? '$' : '€'} value={amount} onChange={setAmount} caption="You get 0.00754148 BTC" />
        <div className="m-g2">
          <Field label="Quantity"><input className="form-input" type="number" defaultValue="0.00754148" /></Field>
          <Field label="Price" right={<Pick options={['EUR', 'USD']} value="EUR" onChange={() => {}} disabledKeys={['USD']} />} hint="Live price">
            <input className="form-input" type="number" defaultValue="66300" disabled={live} />
          </Field>
        </div>
        <Switch label="Use live price" checked={live} onChange={setLive} />
        <Field label="Note"><input className="form-input" placeholder="Optional" /></Field>
        <button type="button" className="btn btn--primary btn--lg btn--full">Add purchase</button>
      </div>
      <StatRow items={[
        { label: 'Your average', value: '€57,697.13' }, { label: 'Quantity', value: '0.0208' },
        { label: 'Market price', value: '€76,000.00' }, { label: 'Unrealized', value: '+31.7%', tone: 'up' },
      ]} />
      <LedgerRow date="Oct 5" avatar={<Avatar label="Relay" />} title="Relay" sub="Money in" amount="+$1,000.00" tone="in" />
    </Frame>
  );
}
```

4. Add to `PAGES`: `forms: () => <FormsDemo />,`

- [ ] **Step 12: Build and test**

Run: `npm test` — expected: 20 pass, 0 fail.
Run: `npm run build` — expected: succeeds. Run: `ls dist | grep -c preview` — expected output `0`.

- [ ] **Step 13: Look at it**

`?p=forms` at desktop and 390px:
- Fields are 44px tall, transparent with a hairline border, labels 12px grey above; focus turns the border indigo with no glow.
- The amount is a large figure with a grey `€`, an underline, and the caption under it; switching `EUR`/`USD` in the label changes the symbol.
- The price field is greyed while the switch is on, and editable when it is off.
- The segmented control highlights one side in grey (no green, no red).
- The four figures sit in one row on desktop and 2×2 at 390px.
- The static ledger row shows no dots and does not react to hover.
- `?p=diary` and `?p=dashboard` still look as before (the Diary tabs still work).
- At 390px the inputs have 16px text and nothing scrolls sideways.

- [ ] **Step 14: Commit**

```bash
git add src/components/Field.jsx src/components/AmountField.jsx src/components/Segmented.jsx src/components/Switch.jsx src/components/Pick.jsx src/components/LedgerRow.jsx src/components/StatRow.jsx src/components/Tabs.jsx src/mercury.css src/preview/fixtures.js src/preview/mockApi.js src/preview/main.jsx
git commit -m "Form kit, static ledger row, four-up stat row, preview API mock"
```

---

### Task 2: Add movement

**Files:**
- Modify: `src/pages/AddMovement.jsx` (render part and unused state only), `src/preview/main.jsx`
- Modify if needed: `src/mercury.css` (only to add an `m-` rule you genuinely need; say which in the report)

**Interfaces:**
- Consumes: `PageHead`, `Tabs`, `Field`, `AmountField`, `Segmented`, `Switch`, `Pick`, `LedgerRow`, `DetailSheet`, `Avatar`, `Money`, `FormInput`, `AlertMessage`, `AddAssetModal`; `formatEUR`, `formatUSD`, `formatDay`, `formatDayLong`; the mocked `api` in the preview.
- Produces: preview keys `add`, `add-bank`, `add-dry`.

**What stays:** every `useState` that is still read, every effect, and all handlers (`handleBuySubmit`, `handleAmountChange`, `handleQtyChange`, `handlePriceInputChange`, `handleBankSubmit`, `handleBankEntryDelete`, `handleCashSubmit`, `handleCashEdit`, `handleCashDelete`, `resetCpForm`, `handleAssetAdded`) and the derived values they use (`currentPriceInput`, `hasUsdRate`, `eurUsdRate`, `toEur`, `ledgerBanks`, `activeBank`, `isNewBank`, `bankBalance`, `bankRecent`, `dryPowderTotal`, `assetOptions`). Read the top half of the file first to learn them.

**What changes:** only the JSX returned after the loading and error guards.

- [ ] **Step 1: Initial tab from the URL**

Change `const [tab, setTab] = useState('buy');` to:

```jsx
  const [tab, setTab] = useState(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    return ['buy', 'bank', 'dry'].includes(t) ? t : 'buy';
  });
```

Change the `TABS` constant labels to `Purchase`, `Bank`, `Dry powder` (keys unchanged).

- [ ] **Step 2: Page frame**

Inside `<PageLayout title="Add movement" …>` render, in this order: `<PageHead title="Add movement" />`, `<Tabs tabs={TABS} value={tab} onChange={setTab} />`, then one `<div className="m-form" style={{ marginTop: 22 }}>` holding the active tab's form. Remove the `page-head`, `seg-tabs`, `panel`, `add-panel`, `diary-card__head`, `diary-form`, `diary-form__foot` wrappers and the `animate-in*` classes. `AddAssetModal` stays at the end as it is.

- [ ] **Step 3: Purchase tab** (`tab === 'buy'`), fields in this order inside the existing `<form onSubmit={handleBuySubmit}>`:

1. `Field` label `Asset`, `right` = `<button type="button" className="m-link" onClick={() => setShowAddAsset(true)}>New asset</button>`; control = `<select className="form-input">` over `assets`, each option text `${a.name || a.symbol} · ${a.symbol}`, value `a.symbol`, bound to `asset` / `setAsset`. No separate icon button, no name hint under it.
2. `AmountField` label `Amount`, `symbol="€"`, `value={amountEur}`, `onChange={handleAmountChange}`; `caption` = `` `You get ${qty} ${asset}` `` when `qty` is a positive number, otherwise `Fill in the amount or the quantity. The other is computed.`
3. `<div className="m-g2">` with two fields:
   - `Field` label `` `Quantity` `` — `<input className="form-input" type="number" step="any" placeholder="0.00" value={qty} onChange={e => handleQtyChange(e.target.value)} />`
   - `Field` label `Price`, `right` = `<Pick options={['EUR', 'USD']} value={priceCurrency} onChange={setPriceCurrency} disabledKeys={hasUsdRate ? [] : ['USD']} />`, `hint` = when `priceCurrency === 'USD' && priceEur`: `` `About ${formatPrice(parseFloat(priceEur))}` `` (import `formatPrice`), else none — control = the existing price input (`value={currentPriceInput}`, `onChange={e => handlePriceInputChange(e.target.value)}`, `disabled={useLivePrice}`) with class `form-input`.
4. `<Switch label="Use live price" checked={useLivePrice} onChange={setUseLivePrice} />`
5. `<div className="m-g2">` with `Field` label `Date` (date input bound to `date`) and, **only when `cashPositions.length > 0`**, `Field` label `Funded from` with a select: first option value `""` text `None`, then one option per broker with text `` `${p.label} (${amount in its currency})` ``; `hint` shown only when `fundedFrom` is set: `Deducted from this broker's dry powder.` When there are no brokers the Date field is alone and not wrapped in `m-g2`.
6. `Field` label `Note` — `<input className="form-input" type="text" placeholder="Optional" value={notes} onChange={e => setNotes(e.target.value)} />`
7. `<AlertMessage type="error" message={error} />`
8. `<button type="submit" className="btn btn--primary btn--lg btn--full" disabled={submitting}>{submitting ? 'Adding…' : 'Add purchase'}</button>`

- [ ] **Step 4: Bank tab** (`tab === 'bank'`), inside the existing `<form onSubmit={handleBankSubmit}>`:

1. `Field` (no label) with `<Segmented options={[{ key: 'in', label: 'Money in' }, { key: 'out', label: 'Money out' }]} value={beDirection} onChange={setBeDirection} />`
2. `Field` label `Bank`, `right` = when `activeBank && !isNewBank`: `<span>Balance {bankBalance in beCurrency}</span>`; control = the existing bank select (`ledgerBanks` + the `__new__` option, text `New bank…`).
3. When `isNewBank`: `Field` label `Bank name` with the `newBank` input, placeholder `Wise`.
4. `AmountField` label `Amount`, `right` = `<Pick options={['USD', 'EUR']} value={beCurrency} onChange={setBeCurrency} />`, `symbol` = `$` or `€` by `beCurrency`, `value={beAmount}`, `onChange={setBeAmount}`; `caption` when `beCurrency === 'USD' && parseFloat(beAmount) > 0 && eurUsdRate`: `` `About ${formatEUR(parseFloat(beAmount) / eurUsdRate)}` ``.
5. `<div className="m-g2">`: `Field` label `Date` (bound to `beDate`), `Field` label `Note` (bound to `beNote`, placeholder `Optional`).
6. Submit button: `btn btn--primary btn--lg btn--full`, text `Saving…` while `beSubmitting`, otherwise `Add money out` or `Add money in`.

After the form, when `bankRecent.length > 0`: `<div className="m-section"><span>Recent in {activeBank}</span></div>` then one `LedgerRow` per entry: `date={formatDay(en.date)}`, `avatar={<Avatar label={en.bank} />}`, `title={en.note || (in ? 'Money in' : 'Money out')}`, `sub={in ? 'Money in' : 'Money out'}`, `amount` with `+` or `−` and the entry's own currency, `tone="in"` for money in, `onClick` opening a `DetailSheet` for that entry (keep the selected entry id in a new `useState`). The sheet: `avatar`, `title={en.bank}`, `subtitle="Bank movement"`, `amount`, `rows` Date (`formatDayLong`), Type, Note; `danger={{ label: 'Delete movement', onConfirm: async () => { await handleBankEntryDelete(en.id); close } }}`. Remove the `×` / `Sure?` button and the now-unused `beDelId` state. If `handleBankEntryDelete` reads `beDelId`, remove only that read.

- [ ] **Step 5: Dry powder tab** (`tab === 'dry'`):

1. When `cashPositions.length > 0`: `<div className="m-section"><span>Brokers</span><span>{formatEUR(dryPowderTotal)}</span></div>`, then one `LedgerRow` per position: `date=""`, `avatar={<Avatar label={p.label} />}`, `title={p.label}`, `sub` = for a USD position `` `About ${formatEUR(toEur(p.amount_eur, 'USD'))}` `` else `Uninvested cash`, `amount` in the position's currency, `onClick` opening a `DetailSheet` (selected id in a new `useState`): `title={p.label}`, `subtitle="Broker"`, `amount`, `rows` Currency; `children` = `<button type="button" className="btn btn--ghost btn--full" style={{ marginTop: 14 }} onClick={() => { handleCashEdit(p); close }}>Edit amount</button>`; `danger={{ label: 'Delete broker', onConfirm: async () => { await handleCashDelete(p.id); close } }}`. Remove the inline Edit/Delete/Yes/No buttons and the now-unused `cpDeleteConfirm` state (if `handleCashDelete` resets it, remove only that line).
2. `<div className="m-section"><span>{cpEditId ? 'Edit broker' : 'Add a broker'}</span></div>` then the existing `<form onSubmit={handleCashSubmit}>` with: `Field` label `Broker` (bound to `cpLabel`, placeholder `Trade Republic`); `AmountField` label `Amount`, `right` = `<Pick options={['EUR', 'USD']} value={cpCurrency} onChange={setCpCurrency} />`, symbol by `cpCurrency`, bound to `cpAmount`, `caption` = the EUR equivalent when USD and a rate exists, otherwise `Cash parked on a broker, waiting to be invested.`; then, when `cpEditId`, a `btn btn--ghost btn--lg btn--full` `Cancel` button (`onClick={resetCpForm}`, `style={{ marginBottom: 8 }}`); then the submit button with text `Saving…` / `Save changes` / `Add broker`.

On phones the empty first column of the broker rows must not leave a gap: the date span is hidden at ≤640px already; on desktop an empty 56px date column is acceptable.

- [ ] **Step 6: Preview entries**

In `src/preview/main.jsx` import `AddMovement from '../pages/AddMovement'` and add to `PAGES`:

```jsx
  add: () => <AddMovement />,
  'add-bank': () => <AddMovement />,
  'add-dry': () => <AddMovement />,
```

(`add-bank` and `add-dry` are opened as `?p=add-bank&tab=bank` and `?p=add-dry&tab=dry`.)

- [ ] **Step 7: Build, test, self-check**

Run: `npm test && npm run build` — expected: 20 pass; build succeeds.
Run: `grep -nE "fontSize: *(9|10|11)\b|seg-tabs|diary-card|panel|animate-in|formatDate|Sure\?" src/pages/AddMovement.jsx` — expected: no output.

- [ ] **Step 8: Look at it and use it** (controller)

`?p=add`, `?p=add-bank&tab=bank`, `?p=add-dry&tab=dry`, desktop and 390px: matches the approved mockup (single 440px column, tabs like the Diary, big amount, hairline fields, indigo full-width button). Typing `500` in Amount fills Quantity and the caption; typing a Quantity fills Amount; turning the switch off enables Price; `USD` in Price is selectable only with a rate. Bank: the balance shows next to the label; submitting adds a row under `Recent in Relay`; tapping it opens the sheet and delete needs two taps. Dry powder: tapping `Degiro` opens the sheet; `Edit amount` fills the form and shows `Cancel`; delete needs two taps.

- [ ] **Step 9: Commit**

```bash
git add src/pages/AddMovement.jsx src/preview/main.jsx src/mercury.css
git commit -m "Add movement: one column, the amount first, actions in the sheet"
```

---

### Task 3: Charts

**Files:**
- Modify: `src/pages/Charts.jsx`, `src/preview/main.jsx`

**Interfaces:**
- Consumes: `PageHead`, `Money`; `periodSeries`, `portfolioSeries30d`, `PERIODS`; `formatEUR`, `formatPrice`, `formatDayLong`, tooltip styles; classes `m-card`, `m-label`, `m-nw__head`, `m-nw__value`, `m-nw__delta`, `m-nw__chart`, `m-periods`, `m-periods__btn`, `m-g2 m-g2--cards`, `m-legend`, `m-legend__dot`, `m-dist*`, `m-select`, `m-up`, `m-down`.
- Produces: preview key `charts`.

**What stays:** the data fetching effect and the builders `buildAllocation`, `buildMonthly`, `buildDCA` (read them at the bottom of the file; keep their output shapes). **What goes:** the `TT`, `TT_ITEM`, `AXIS`, `GRID`, `ANIM`, `LEGEND`, `lastDot` constants, the `timeRange` state, `buildPortfolio`, `buildPie`, the pie chart, `rankedColors`/`allocationSlices` usage, `AssetBadge`, `FormInput`, `EmptyState` imports if unused.

Chart rules for every chart on the page: `isAnimationActive={false}`; `Tooltip` with `contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE}`; axis ticks `{ fill: '#9A9AA8', fontSize: 12 }`, `axisLine={false} tickLine={false}`; no `CartesianGrid`; no recharts `Legend` (use the `m-legend` markup).

- [ ] **Step 1: Layout**

`<PageHead title="Charts" />`, then:

1. **Portfolio value** — a full-width `m-card`:
   - `m-nw__head`: `<div className="m-label">Portfolio value</div>` and the `m-periods` buttons from `PERIODS` (state `period`, default `'1M'`).
   - Series: `const trend = periodSeries(history.map(h => ({ date: h.date, total: h.portfolio || 0 })).filter(h => h.total > 0), portfolioSeries30d(dashboard.purchases, dashboard.prices, assets), period);`
   - Figure: `<Money value={last value of trend.series, or dashboard.summary.total_value || 0 when the series is empty} />` inside a `<div className="m-nw__value">`.
   - `m-nw__delta` line: `<span className={trend.delta >= 0 ? 'm-up' : 'm-down'}>{signed delta} ({signed pct, one decimal})</span> · {trend.label}`.
   - `m-nw__chart`: `AreaChart` height 140, hidden `YAxis` with domain `[(min) => min * 0.985, (max) => max * 1.01]`, `Area` `stroke="#8D9BFF" strokeWidth={1.5} fill="none" dot={false}`; tooltip label `formatDayLong`, value `formatEUR`.
2. `<div className="m-g2 m-g2--cards">`:
   - **Growth by market** — `m-card`, label `Growth by market`, a second grey line `last 30 days` is not needed. Data: `buildAllocation(dashboard, assets, 30)` gives one object per day with a value per asset symbol; reduce each day to `{ label, stock, crypto }` by summing symbols whose asset has `asset_type === 'stock_etf'` into `stock` and the rest into `crypto`. Chart: stacked `AreaChart` height 120, two `Area`s with `stackId="m"`, `stroke="none"`, `fillOpacity={1}`: `stock` `fill="#8D9BFF"`, `crypto` `fill="#3D4272"`; hidden `YAxis`; no `XAxis`. Under it an `m-legend` with two items (`Stock market`, `Crypto market`) using `m-legend__dot` with the same two colours.
   - **Distribution** — `m-card`, label `Distribution`, then one `m-dist` row per held asset with a positive value in `dashboard.summary.by_asset`, largest first: `<span className="m-dist__name">{name}<span className="m-dist__pct">{pct}%</span></span><span>{formatEUR(value)}</span><span className="m-dist__bar"><span className="m-dist__fill" style={{ width: `${Math.max(pct, 1)}%` }} /></span>`. `pct` has one decimal; below 0.1 show `<0.1`. Only assets included in totals count toward the percentages; excluded assets are not listed.
3. `<div className="m-g2 m-g2--cards">`:
   - **Monthly investments {year}** — `m-card`, label; `BarChart` height 140 over `buildMonthly(dashboard)`, `XAxis dataKey="month"`, hidden `YAxis`, two `Bar`s `barSize={10} radius={[2, 2, 0, 0]}`: `invested` `fill="#8D9BFF"` name `Invested`, `value` `fill="#5F69B8"` name `Current value`; `m-legend` with the two names.
   - **Average price vs market** — `m-card`; header row `m-nw__head` with the label and, on the right, `<select className="m-select" aria-label="Asset">` over the assets (bound to `dcaAsset` / `setDcaAsset`, option text the symbol); `LineChart` height 120 over `buildDCA(dashboard, dcaAsset)`: `Line dataKey="market"` `stroke="#9A9AA8" strokeWidth={1} strokeDasharray="4 4" dot={false}`, `Line dataKey="dca"` `stroke="#8D9BFF" strokeWidth={1.5} dot={false}`; hidden axes; `m-legend`: `Your average {formatPrice(last dca)}` and `Market {formatPrice(last market)}`. When `buildDCA` returns fewer than two points show `<div className="m-empty">Not enough purchases yet</div>` instead of the chart.

Any chart with fewer than two data points shows the same `m-empty` line with a fitting sentence rather than an empty box.

- [ ] **Step 2: Preview entry**

Import `Charts from '../pages/Charts'` in `src/preview/main.jsx` and add `charts: () => <Charts />,` to `PAGES`.

- [ ] **Step 3: Build, test, self-check**

Run: `npm test && npm run build` — expected: 20 pass; build succeeds.
Run: `grep -nE "Space Grotesk|PieChart|Legend|CartesianGrid|animationDuration|fontSize: *(9|10|11)\b|#8B7BFF|#34D399|page-head|panel" src/pages/Charts.jsx` — expected: no output.

- [ ] **Step 4: Look at it** (controller)

`?p=charts`, desktop and 390px: five blocks in the approved order; one indigo hue; the first card reads like the Dashboard's net-worth card; periods switch the line and the label; the distribution bars are proportional and the smallest still shows a sliver; the asset select changes the last chart; at 390px every block stacks and no chart overflows its card.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Charts.jsx src/preview/main.jsx
git commit -m "Charts: one hue, portfolio card like the dashboard, distribution as bars"
```

---

### Task 4: Reports and DCA calculator

**Files:**
- Modify: `src/pages/Reports.jsx`, `src/pages/Calculator.jsx`, `src/preview/main.jsx`

**Interfaces:**
- Consumes: `PageHead`, `Tabs`, `StatRow`, `Money`, `LedgerRow`, `Avatar`, `Field`; classes `m-select`, `m-section`, `m-link`, `m-table__*`, `m-card`, `m-label`, `m-g2 m-g2--cards`, `m-result*`, `m-empty`, `m-up`, `m-down`.
- Produces: preview keys `reports`, `dca`.

**Reports — what stays:** state (`tab`, `year`, `month`, `showTx`, the report data), effects, option lists. **What goes:** `DataTable`, `AnimatedNumber`, `AssetBadge`, `Icon` usage on this page, the `assetColumns`/`txColumns` definitions, `page-head`, `tab-bar`, `stat-band`, `section-header`, `panel`, `collapse-btn`.

- [ ] **Step 1: Reports layout**

1. `<PageHead title="Reports" />`
2. `<Tabs tabs={[{ key: 'lifetime', label: 'Lifetime' }, { key: 'annual', label: 'Annual' }, { key: 'monthly', label: 'Monthly' }]} value={tab} onChange={setTab} right={…} />` where `right` is, for `annual` and `monthly`, a `<select className="m-select" aria-label="Year">` bound to `year`, and for `monthly` also a `<select className="m-select" aria-label="Month">` bound to `month`, side by side with a 14px gap.
3. When `report` exists:
   - `<StatRow items={[{ label: 'Invested', value: <Money value={report.total_invested} /> }, { label: 'Current value', value: <Money value={report.total_value} /> }, { label: `Profit · ${pct with sign and one decimal}%`, value: <Money value={report.pnl} sign />, tone: report.pnl >= 0 ? 'up' : 'down' }]} />` with `style`-free spacing: wrap it in a `div` with `style={{ paddingTop: 20 }}`.
   - **Breakdown by asset**: `<div className="m-table__head"><span>Breakdown by asset</span><span>Invested</span><span>Value</span><span>Profit</span></div>` then one `<div className="m-table__row" style={{ cursor: 'default' }}>` per asset, largest value first, built like the Dashboard holdings row: name (the asset's `name` from `assets`, fallback the symbol) with the quantity and symbol as `m-table__sub`; invested in a `m-table__price m-muted` cell; value with the profit repeated as `m-table__sub m-table__phone` (toned); profit cell `m-table__profit` (toned) with the percentage as `m-table__sub`.
   - **Transactions in period**, when there are any: `<div className="m-section"><span>Transactions in period · {n}</span><button type="button" className="m-link" onClick={() => setShowTx(!showTx)}>{showTx ? 'Hide' : 'Show'}</button></div>` and, when shown, one static `LedgerRow` (no `onClick`) per purchase, newest first: `date={formatDay(p.date)}`, `avatar={<Avatar asset={p.asset} />}`, `title` the asset name, `sub` the quantity and symbol, `amount={formatEUR(p.amount_eur)}`.
4. When the report has no assets: `<div className="m-empty">Nothing in this period</div>`.

**Calculator — what stays:** all state and all the maths above the `return`. **What goes:** `calc-assets` chips, `panel`, `diary-top`, `diary-card__head`, `calc-stats`, `calc-result*`, `EmptyState`, `AssetBadge`, `page-head`.

- [ ] **Step 2: Calculator layout**

1. `<PageHead title="DCA calculator">` with, as children when `heldAssets.length > 0`, a `<select className="m-select" aria-label="Asset">` over `heldAssets` (option text `${a.name || a.symbol} · ${a.symbol}`), bound to `symbol` / `setSymbol`.
2. No holdings: `<div className="m-empty"><div>No holdings yet</div><Link to="/add" className="btn btn--primary">Add movement</Link></div>` (import `Link`).
3. Otherwise `<StatRow items={[…4 items…]} />`: `Your average` (`fmt(dca)`), `Quantity` (`qtyFmt(qty)`), `Market price` (`fmt(curPrice)`), `Unrealized` (signed percentage, one decimal, `tone` `'up'`/`'down'`).
4. `<div className="m-g2 m-g2--cards">` with two `m-card`s:
   - **What-if buy**: `<div className="m-label" style={{ marginBottom: 14 }}>What-if buy</div>`; `Field` label `` `Amount (${ccy})` `` with the `buyAmount` input; `Field` label `` `Buy price (${ccy})` `` with the `buyPrice` input and `hint="Leave empty to use the market price."`; then `<div className="m-result"><div className="m-label">New average</div><div className="m-result__value">{bValid ? fmt(bNewDca) : '—'}</div>{bValid && <div className="m-result__meta"><span className={bDelta <= 0 ? 'm-up' : 'm-down'}>{bDelta <= 0 ? '−' : '+'}{fmt(Math.abs(bDelta))}</span> · +{qtyFmt(bAddQty)} {symbol}, {qtyFmt(bNewQty)} in total</div>}</div>`.
   - **Reach a target average**: same structure with `targetDca` (`Target average (ccy)`) and `targetPrice`; result label `You need to invest`, value `tValid ? fmt(tNeed) : '—'`, meta `+{qtyFmt(tAddQty)} {symbol} at {fmt(tPrice)}` when valid, and `<div className="m-result__warn">{tReason}</div>` when `tReason`. In the two `tReason` strings replace `DCA` with `average`.
   The inputs use class `form-input`. No arrows `▼ ▲`.
5. `fmt` on this page: if it hand-builds a string with a trailing symbol, switch it to `formatPrice(v, ccy)` (import it) and keep its name.

- [ ] **Step 3: Preview entries**

Import both pages in `src/preview/main.jsx`; add `reports: () => <Reports />,` and `dca: () => <Calculator />,` to `PAGES`.

- [ ] **Step 4: Build, test, self-check**

Run: `npm test && npm run build` — expected: 20 pass; build succeeds.
Run: `grep -nE "DataTable|AnimatedNumber|suffix=|panel|page-head|tab-bar|section-header|calc-|diary-|fontSize: *(9|10|11)\b|formatDate|▼|▲" src/pages/Reports.jsx src/pages/Calculator.jsx` — expected: no output.

- [ ] **Step 5: Look at it** (controller)

`?p=reports`: the three tabs switch; year and month selects appear only where they apply; figures have the symbol first; the breakdown reads like the Dashboard holdings; `Show` reveals static rows that do not react to hover. `?p=dca`: the asset select changes the four figures; typing an amount shows the new average; an impossible target shows the rose warning. Both at desktop and 390px, no sideways scroll, the four figures 2×2 on the phone.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Reports.jsx src/pages/Calculator.jsx src/preview/main.jsx
git commit -m "Reports and DCA calculator on the shared kit"
```

---

### Task 5: Settings, Login, Setup and the overlays

**Files:**
- Modify: `src/pages/Settings.jsx`, `src/pages/LoginPage.jsx`, `src/pages/SetupPage.jsx`, `src/components/AddAssetModal.jsx`, `src/components/QuickBuyFAB.jsx`, `src/components/CommandPalette.jsx`, `src/mercury.css`, `src/preview/main.jsx`

**Interfaces:**
- Consumes: `PageHead`, `Tabs`, `Segmented`, `Field`, `LedgerRow`, `DetailSheet`, `Avatar`, `FormInput`, `AlertMessage`.
- Produces: preview keys `settings`, `settings-account`, `login`, `setup`, `overlays`, `asset-modal`.

**Settings — what stays:** state, effects, handlers (`handleColorChange`, `handleRemoveAsset`, `handleAddAsset`, `handleSaveName`, `handleChangePassword`, the search effect), `getPrice`.

- [ ] **Step 1: Settings layout**

1. Initial tab from the URL, like Task 2: `account` when `?tab=account`, else `portfolio`.
2. `<PageHead title="Settings" />`, `<Tabs tabs={[{ key: 'portfolio', label: 'Portfolio' }, { key: 'account', label: 'Account' }]} … />`.
3. **Portfolio**: the two `AlertMessage`s; `<div className="m-section"><span>Tracked assets</span><span>{assets.length}</span></div>`; one `LedgerRow` per asset — `date=""`, `avatar={<Avatar asset={asset.symbol} />}`, `title={asset.name || asset.symbol}`, `sub={asset.symbol}`, `amount={getPrice(asset)}`, `onClick` opening a `DetailSheet` (selected symbol in a new `useState`): `title`, `subtitle={asset.symbol}`, `rows` Price and Type (`Crypto`, `DEX token` or `Stock or ETF`), `children` = a `m-sheet__row` with `<span>Colour</span>` and the existing `<input type="color" …>` (keep `handleColorChange`), `danger={{ label: 'Remove asset', onConfirm: async () => { await handleRemoveAsset(asset.symbol); close } }}`. If `handleRemoveAsset` contains a `window.confirm`, remove that confirm (the sheet now confirms). Remove the always-visible trash button.
   Then `<div className="m-section"><span>Add an asset</span></div>` and, in a `m-form`: `Field` with `<Segmented options={[{ key: 'crypto', label: 'Crypto' }, { key: 'dex', label: 'DEX and meme' }, { key: 'stock', label: 'Stocks and ETFs' }]} value={searchType} onChange={(k) => { setSearchType(k); setSearchResults([]); setSearchQuery(''); }} />`; the search input (`form-input`, the three placeholders in sentence case without the parentheses examples in capitals); `Searching…` as a `m-caption`; the results as rows: static `LedgerRow`-like lines are not enough here because each needs an `Add` button — use `<div className="m-setrow">` with `Avatar` (use the result's `thumb` in an `<img>` inside `m-avatar` when present, else `<Avatar label={r.symbol} />`), name and symbol stacked (`m-row__title` + `m-row__sub`), the price in grey, and `<button className="btn btn--primary btn--sm" onClick={() => handleAddAsset(r)}>Add</button>`. Add the `.m-setrow` rule to `mercury.css` (grid `32px minmax(0,1fr) auto auto`, gap 12px, padding 11px 0, top hairline, 14px text).
4. **Account**, all inside one `m-form`: `m-section` `Account` — `FormInput` `Display name` + `form-hint` + `btn btn--primary` `Save name`; disabled `Username` and `Email`; a `m-caption` `Member since {formatDayLong(user.created_at)}`. `m-section` `Password` — the existing form with labels `Current password`, `New password`, `Confirm password`, alerts, `btn btn--primary btn--lg btn--full` `Update password` / `Saving…`. `m-section` `Sessions` — a `m-caption` with the existing sentence and `<button className="btn btn--danger" …>Log out all devices</button>`. `m-section` `About` — `m-caption` `Wealth 3.0`.

- [ ] **Step 2: Login and Setup**

In both pages: the title reads `Wealth` (sentence case); remove the `INVESTMENT TRACKER` subtitle element; button texts `Sign in` / `Signing in…` (and the Setup equivalents in sentence case — read the file); placeholders in sentence case. Add to `mercury.css`, matching the legacy selectors:

```css
.auth-card { padding: 32px 28px; border: 1px solid var(--border); border-radius: 12px; box-shadow: none; }
.auth-logo { filter: none; }
.auth-title { font-size: 22px; font-weight: 400; letter-spacing: -0.02em; margin-bottom: 24px; }
```

- [ ] **Step 3: Overlays**

Read `AddAssetModal.jsx`, `QuickBuyFAB.jsx`, `CommandPalette.jsx` and the legacy CSS blocks they use (`.fab-modal*`, `.cmdk*`, and whatever `AddAssetModal` uses). For each: put every string in sentence case, remove inline font sizes below 12, and replace hand-built money strings with the formatters. In `mercury.css` override their surfaces so they are flat: background `var(--bg-card)`, `1px solid var(--border)`, radius 12px, no `backdrop-filter`, no coloured shadow (a plain `0 16px 48px rgba(0,0,0,0.5)` is allowed on the floating panel), eyebrow/label text 12px grey in sentence case, primary buttons from the shared `.btn--primary`. Match the legacy selectors' specificity. Do not change what the overlays do.

- [ ] **Step 4: Preview entries**

In `src/preview/main.jsx` import the three pages and add:

```jsx
  settings: () => <Settings />,
  'settings-account': () => <Settings />,
  login: () => <LoginPage onLogin={() => {}} />,
  setup: () => <SetupPage onComplete={() => {}} />,
  overlays: () => <Frame title="Overlays"><PageHead title="Overlays" /><QuickBuyFAB /><CommandPalette /></Frame>,
  'asset-modal': () => <Frame title="Asset modal"><AddAssetModal existingAssets={fixtures.assets} onClose={() => {}} onAdded={() => {}} /></Frame>,
```

(`settings-account` is opened as `?p=settings-account&tab=account`. Import `QuickBuyFAB`, `CommandPalette` and `AddAssetModal` from `../components/`. The real app mounts the first two globally in `App.jsx`; the preview needs its own entries to show them.)

- [ ] **Step 5: Build, test, self-check**

Run: `npm test && npm run build` — expected: 20 pass; build succeeds.
Run: `grep -nE "fontSize: *(9|10|11)\b|section-header|tab-bar|panel|page-head|asset-row__remove|SIGN|INVESTMENT|Log Out" src/pages/Settings.jsx src/pages/LoginPage.jsx src/pages/SetupPage.jsx src/components/AddAssetModal.jsx src/components/QuickBuyFAB.jsx src/components/CommandPalette.jsx` — expected: no output.

- [ ] **Step 6: Look at it** (controller)

`?p=settings`, `?p=settings-account&tab=account`, `?p=login`, `?p=setup`, desktop and 390px. On `?p=overlays` press the floating `+` (quick buy) and `⌘K` (palette); open `?p=asset-modal` for the asset dialog. All flat, sentence case, no text under 12px, primary buttons indigo with dark text. Removing an asset needs the sheet and two taps.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Settings.jsx src/pages/LoginPage.jsx src/pages/SetupPage.jsx src/components/AddAssetModal.jsx src/components/QuickBuyFAB.jsx src/components/CommandPalette.jsx src/mercury.css src/preview/main.jsx
git commit -m "Settings, login, setup and overlays on the shared kit"
```

---

### Task 6: Loose ends and whole-app pass

**Files:**
- Modify: `src/utils/networth.js`, `src/utils/networth.test.js`, `src/App.jsx`, `src/components/Skeleton.jsx`, `src/mercury.css`, plus anything Step 5 finds.

- [ ] **Step 1: Dates in local time (failing test first)**

In `src/utils/networth.test.js` add:

```js
test('series and period cut-offs use the local calendar day, also just after midnight', () => {
  const justAfterMidnight = new Date(2026, 9, 6, 0, 30);   // 6 Oct 2026, 00:30 local time
  const series = portfolioSeries30d([{ date: '2026-10-06', asset: 'BTC', quantity: 1 }], { BTC: { eur: 100 } }, [{ symbol: 'BTC' }], justAfterMidnight);
  assert.equal(series[29].date, '2026-10-06');
  assert.equal(series[29].value, 100);
  const history = [{ date: '2026-09-29', total: 1 }, { date: '2026-09-30', total: 2 }, { date: '2026-10-06', total: 3 }];
  assert.deepEqual(periodSeries(history, [], '1W', justAfterMidnight).series.map(p => p.date), ['2026-09-29', '2026-09-30', '2026-10-06']);
});
```

Run: `TZ=Europe/Rome npm test` — expected: this test FAILS (last date is `2026-10-05`).

In `src/utils/networth.js` add near the top:

```js
// YYYY-MM-DD of a Date in LOCAL time (toISOString would give the UTC day).
const localDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
```

and use it in both functions: in `portfolioSeries30d` replace `const ds = d.toISOString().split('T')[0];` with `const ds = localDay(d);`; in `periodSeries` replace `const cutoffStr = cutoff.toISOString().slice(0, 10);` with `const cutoffStr = localDay(cutoff);`.

Run: `TZ=Europe/Rome npm test`, `TZ=America/Los_Angeles npm test`, `TZ=Pacific/Auckland npm test` — expected: all pass in each.

- [ ] **Step 2: Dead spotlight listener**

In `src/App.jsx` remove the `mousemove` cursor-spotlight effect (it sets `--mx` / `--my`; its CSS is switched off). Remove only that effect and any import it alone needed.

- [ ] **Step 3: Skeletons**

In `src/mercury.css`, in section 2, add `.skeleton { background: var(--bg-elev); background-image: none; animation: pulse 1.4s ease-in-out infinite; }`. In `src/components/Skeleton.jsx` make `DashboardSkeleton` mirror the new Dashboard: a 24px title line, two blocks side by side (`m-top` grid: left 220px tall, right 220px tall), a row of three short lines, then five 44px rows. Keep `Skel` and `PageSkeleton` exports and signatures.

- [ ] **Step 4: A leftover from Phase 1**

In `src/pages/DashboardView.jsx`, in the "Speculative, not included" `m-section`, the right side becomes `{money(summary.spec_value || 0)} · ` followed by the speculative profit, signed and toned: `<span className={(summary.spec_pnl || 0) >= 0 ? 'm-up' : 'm-down'}>{signed(summary.spec_pnl || 0)}</span>`.

- [ ] **Step 5: Whole-app sweep**

Run each and fix what it finds in files under `src/pages` and `src/components` (not in `src/styles.css`):

- `grep -rnE "fontSize: *(9|10|11)\b" src/pages src/components`
- `grep -rnE "'[A-Z][A-Z ]{4,}'|>[A-Z][A-Z ]{4,}<" src/pages src/components` (ALL CAPS strings shown to the user; `EUR`, `USD`, symbols and `DCA` are fine)
- `grep -rnE "suffix=\"€\"|\} €|€'\)|#8B7BFF|#7C5CFC|139,123,255|Space Grotesk|Instrument Serif" src/pages src/components src/utils`
- `grep -rnE "formatDate\(" src/pages src/components` (switch to `formatDay` / `formatDayLong`; if nothing uses `formatDate` any more, delete its export from `src/utils/format.js`)

Report every remaining hit you deliberately left, with the reason.

- [ ] **Step 6: Final checks**

Run: `npm test && npm run build && ls dist | grep -c preview` — expected: all tests pass, build succeeds, last command prints `0`.
Run: `grep -nE "font-size: *(9|10|11)px|uppercase|gradient\(" src/mercury.css` — expected: no output.

- [ ] **Step 7: Commit**

```bash
git add src/utils/networth.js src/utils/networth.test.js src/App.jsx src/components/Skeleton.jsx src/mercury.css src/pages src/components src/utils/format.js
git commit -m "Local-day dates, flat skeletons, whole-app copy and size sweep"
```

(This task may `git add` whole directories because the sweep touches unpredictable files — but check `git status` first and make sure nothing outside `src/` is staged.)
