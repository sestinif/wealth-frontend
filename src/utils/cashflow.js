// Pure maths for the Reports "Cash flow" tab: two figures per month and per year, in EUR.
//
// Saved    = money that came into the accumulation accounts (Mercury via its API, the
//            other banks via the Bank ledger) plus money set aside as dry powder.
// Invested = what was actually bought (crypto, stocks).
//
// Buying from a broker's dry powder lowers that dry powder, but it is not money taken
// out of savings: it was saved before and is invested now. Those movements carry
// kind 'purchase' and are left out of Saved, as are currency fixes ('convert') and the
// balances that already existed when the dry-powder log started ('opening').
import { toEur } from './networth.js';

// Before this month there is no reliable record of what was saved.
export const FLOW_START = '2026-09';

const cents = (n) => Math.round(n * 100) / 100;
const eur = (row, amount, rate) => (Number.isFinite(row.amount_eur) ? row.amount_eur : toEur(amount, row.currency, rate));

// purchases: [{date, amount_eur}]
// bankEntries (ledger): [{date, amount, currency, amount_eur?}]   amount > 0 in, < 0 out
// bankFlows (Mercury):  [{date, amount, currency, amount_eur?}]   same sign rule
// dryEvents:            [{date, delta, currency, amount_eur?, opening, kind}]
// rate: USD per 1 EUR, only used when a row has no dated amount_eur.
// Returns { months, years }: [{ key, saved, invested }], newest first, from FLOW_START on.
export function buildCashflow({ purchases = [], bankEntries = [], bankFlows = [], dryEvents = [], rate = null } = {}) {
  const months = new Map();
  const slot = (day) => {
    const key = String(day || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(key) || key < FLOW_START) return null;
    if (!months.has(key)) months.set(key, { saved: 0, invested: 0 });
    return months.get(key);
  };

  for (const p of purchases) {
    const m = slot(p.date);
    if (m) m.invested += Number(p.amount_eur) || 0;
  }
  for (const b of [...bankEntries, ...bankFlows]) {
    const m = slot(b.date);
    if (m) m.saved += eur(b, b.amount, rate);
  }
  for (const e of dryEvents) {
    if (e.opening || (e.kind && e.kind !== 'manual')) continue;
    const m = slot(e.date);
    if (m) m.saved += eur(e, e.delta, rate);
  }

  const row = (key, t) => ({ key, saved: cents(t.saved), invested: cents(t.invested) });
  const newestFirst = (a, b) => (a.key < b.key ? 1 : -1);
  const years = new Map();
  for (const [k, t] of months) {
    const y = years.get(k.slice(0, 4)) || { saved: 0, invested: 0 };
    years.set(k.slice(0, 4), { saved: y.saved + t.saved, invested: y.invested + t.invested });
  }
  return {
    months: [...months].map(([k, t]) => row(k, t)).sort(newestFirst),
    years: [...years].map(([k, t]) => row(k, t)).sort(newestFirst),
  };
}

// The periods that can be picked: years from the start year to `now`, and for a year
// the months that fall between FLOW_START and `now`.
export function flowPeriods(now = new Date()) {
  const [startYear, startMonth] = FLOW_START.split('-').map(Number);
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  const years = [];
  for (let y = startYear; y <= Math.max(thisYear, startYear); y++) years.push(y);
  const monthsOf = (year) => {
    const from = year === startYear ? startMonth : 1;
    const to = year >= thisYear ? (year === thisYear ? thisMonth : 0) : 12;
    const out = [];
    for (let m = from; m <= to; m++) out.push(m);
    return out;
  };
  return { years, monthsOf };
}
