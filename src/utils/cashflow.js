// Pure maths for the Reports "Cash flow" tab: two figures per month and per year, in EUR.
//
// Saved    = money that came into the accumulation accounts (Mercury via its API, the
//            other banks via the Bank ledger) plus money set aside as dry powder.
// Invested = what was actually bought (crypto, stocks).
//
// Buying from a broker's dry powder lowers that dry powder, but it is not money taken
// out of savings: it was saved before and is invested now. Those movements carry
// kind 'purchase' and are left out of Saved, as are currency fixes ('convert').
// The dry powder that was already there when the log started ('opening' rows) counts
// in the month the log began (October 2026), which is when it was set aside.
import { toEur } from './networth.js';

// How far back to ask the bank for its movements: before the bank itself existed, so
// the whole history comes back.
export const BANK_HISTORY_START = '2019-01-01';

const cents = (n) => Math.round(n * 100) / 100;
const eur = (row, amount, rate) => (Number.isFinite(row.amount_eur) ? row.amount_eur : toEur(amount, row.currency, rate));

// purchases: [{date, amount_eur}]
// bankEntries (ledger): [{date, amount, currency, amount_eur?}]   amount > 0 in, < 0 out
// bankFlows (Mercury):  [{date, amount, currency, amount_eur?}]   same sign rule
// dryEvents:            [{date, delta, currency, amount_eur?, opening, kind}]
// rate: USD per 1 EUR, only used when a row has no dated amount_eur.
// Returns { months, years }: [{ key, saved, invested }], newest first.
export function buildCashflow({ purchases = [], bankEntries = [], bankFlows = [], dryEvents = [], rate = null } = {}) {
  const months = new Map();
  const slot = (day) => {
    const key = String(day || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(key)) return null;
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
    if (e.kind && e.kind !== 'manual') continue;
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

// The periods that can be picked: every year from the first one with data to `now`, and
// for a year its months up to `now`.
export function flowPeriods(cf, now = new Date()) {
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  const firstYear = cf.years.reduce((min, r) => Math.min(min, parseInt(r.key)), thisYear);
  const years = [];
  for (let y = firstYear; y <= thisYear; y++) years.push(y);
  const monthsOf = (year) => {
    const to = year < thisYear ? 12 : year === thisYear ? thisMonth : 0;
    const out = [];
    for (let m = 1; m <= to; m++) out.push(m);
    return out;
  };
  return { years, monthsOf };
}
