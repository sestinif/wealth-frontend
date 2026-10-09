// Pure cash-flow maths for the Reports "Cash flow" tab, everything in EUR.
// Invested = purchases. Saved = how much the idle money grew: bank movements plus
// dry-powder movements (money set aside on a broker counts, money deployed into a
// purchase leaves it). Month by month, year by year, and lifetime.
import { toEur } from './networth.js';

const cents = (n) => Math.round(n * 100) / 100;

const finish = (key, t) => ({
  key,
  inflow: cents(t.inflow),
  outflow: cents(t.outflow),
  saved: cents(t.inflow - t.outflow),
  invested: cents(t.invested),
  // No bank or dry-powder movement at all in the period: "saved" is unknown, not zero.
  hasBank: t.inflow > 0 || t.outflow > 0,
});

// purchases: [{date, amount_eur}], bankEntries: [{date, amount, currency, amount_eur?}] (amount > 0 in, < 0 out).
// dryEvents: [{date, delta, currency, amount_eur?, opening}]. An `opening` row is a balance
// that was already there when the log started: its real date is unknown, so it counts in
// the lifetime total only, never in a month or a year.
// rate: USD per 1 EUR (null = USD counts at face value, like the rest of the app).
// Returns { months, years, total }, months and years newest first.
export function buildCashflow(purchases = [], bankEntries = [], rate = null, dryEvents = []) {
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
    // The server sends amount_eur at the rate of the movement's own day; the live
    // rate is only the fallback, since it would make past months drift.
    const v = Number.isFinite(b.amount_eur) ? b.amount_eur : toEur(b.amount, b.currency, rate);
    if (v >= 0) m.inflow += v; else m.outflow += -v;
  }
  let opening = 0;
  let hasOpening = false;
  for (const e of dryEvents) {
    const v = Number.isFinite(e.amount_eur) ? e.amount_eur : toEur(e.delta, e.currency, rate);
    if (e.opening) { opening += v; hasOpening = true; continue; }
    const m = slot(e.date);
    if (!m) continue;
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

  const all = sum([...months.values()]);
  const total = finish('total', { ...all, inflow: all.inflow + Math.max(opening, 0), outflow: all.outflow + Math.max(-opening, 0) });
  if (hasOpening) total.hasBank = true;
  return { months: monthRows, years: yearRows, total };
}
