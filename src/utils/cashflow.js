// Pure cash-flow maths for the Reports "Cash flow" tab: what came into the bank
// accounts, what went out, what is left (saved) and what went into investments,
// month by month and year by year. Everything in EUR.
import { toEur } from './networth.js';

const cents = (n) => Math.round(n * 100) / 100;

const finish = (key, t) => ({
  key,
  inflow: cents(t.inflow),
  outflow: cents(t.outflow),
  saved: cents(t.inflow - t.outflow),
  invested: cents(t.invested),
  // No bank movement at all in the period: "saved" is unknown, not zero.
  hasBank: t.inflow > 0 || t.outflow > 0,
});

// purchases: [{date, amount_eur}], bankEntries: [{date, amount, currency}] (amount > 0 in, < 0 out).
// rate: USD per 1 EUR (null = USD counts at face value, like the rest of the app).
// Returns { months, years, total }, months and years newest first.
export function buildCashflow(purchases = [], bankEntries = [], rate = null) {
  const months = new Map();
  const slot = (day) => {
    const key = String(day || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(key)) return null;
    if (!months.has(key)) months.set(key, { inflow: 0, outflow: 0, invested: 0 });
    return months.get(key);
  };

  for (const p of purchases) {
    const m = slot(p.date);
    if (m) m.invested += Number(p.amount_eur) || 0;
  }
  for (const b of bankEntries) {
    const m = slot(b.date);
    if (!m) continue;
    const v = toEur(b.amount, b.currency, rate);
    if (v >= 0) m.inflow += v; else m.outflow += -v;
  }

  const sum = (list) => list.reduce((s, r) => ({
    inflow: s.inflow + r.inflow, outflow: s.outflow + r.outflow, invested: s.invested + r.invested,
  }), { inflow: 0, outflow: 0, invested: 0 });

  const monthRows = [...months.entries()].map(([k, t]) => finish(k, t)).sort((a, b) => (a.key < b.key ? 1 : -1));

  const byYear = new Map();
  for (const [k, t] of months) {
    const y = k.slice(0, 4);
    byYear.set(y, sum([byYear.get(y) || { inflow: 0, outflow: 0, invested: 0 }, t]));
  }
  const yearRows = [...byYear.entries()].map(([k, t]) => finish(k, t)).sort((a, b) => (a.key < b.key ? 1 : -1));

  return { months: monthRows, years: yearRows, total: finish('total', sum([...months.values()])) };
}
