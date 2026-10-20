// Pure maths for the history charts: the portfolio rebuilt day by day from the
// purchases and the daily closes, its return, a comparison against single assets,
// and moving averages. No React, no network: everything here takes plain data.
//
//   prices  { SYMBOL: { points: [['YYYY-MM-DD', closeEUR], ...] } }   from GET /history/prices
//   live    { SYMBOL: { eur } }                                         today's price (dashboard.prices)
//   purchases [{ date, asset, quantity, amount_eur, price_eur }]
import { localDay } from './format.js';
import { PERIODS } from './networth.js';

export const RANGES = [['1M', 30], ['3M', 90], ['1Y', 365], ['All', 100000]];

export const addDays = (day, n) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// Every day from `from` to `to`, both included.
export function daysBetween(from, to) {
  const out = [];
  for (let d = from; d <= to && out.length < 20000; d = addDays(d, 1)) out.push(d);
  return out;
}

// The close of the last day at or before a given day, or null before the series starts.
export function closeLookup(points = []) {
  const sorted = [...points].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return (day) => {
    let lo = 0, hi = sorted.length - 1, found = null;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid][0] <= day) { found = sorted[mid][1]; lo = mid + 1; } else hi = mid - 1;
    }
    return found;
  };
}

const day10 = (d) => String(d).slice(0, 10);
const counts = (assets, symbol) => {
  const a = assets.find(x => x.symbol === symbol);
  return !a || a.include_in_totals !== false;
};

// What one asset is worth per unit on a day: the market close when there is one,
// otherwise the price of the last purchase up to that day (a step line), which is
// the honest fallback for an asset the sources do not cover.
function unitPrice(symbol, day, today, lookups, live, buys) {
  if (day === today && live?.[symbol]?.eur > 0) return live[symbol].eur;
  const close = lookups[symbol] ? lookups[symbol](day) : null;
  if (close != null) return close;
  const upTo = buys.filter(b => b.date <= day);
  return (upTo.length ? upTo[upTo.length - 1] : buys[0]).price;
}

// The portfolio from the first purchase to today.
// Returns { series: [{ date, value, invested, profit, pct, twr }], approx: [symbols valued at purchase prices] }.
//   value    what the holdings are worth at the close of the day
//   invested money put in up to and including that day
//   twr      time-weighted index (100 on the first day): buying more never moves it, only prices do
//            (a purchase counts at the day's close, not at the price actually paid)
export function buildPortfolioHistory({ purchases = [], assets = [], prices = {}, live = {}, today = localDay() }) {
  const rows = purchases
    .filter(p => counts(assets, p.asset) && Number(p.quantity) !== 0)
    .map(p => ({ date: day10(p.date), asset: p.asset, qty: Number(p.quantity) || 0, amount: Number(p.amount_eur) || 0, price: Number(p.price_eur) || 0 }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (!rows.length) return { series: [], approx: [] };

  const symbols = [...new Set(rows.map(r => r.asset))];
  const lookups = {};
  const approx = [];
  symbols.forEach(s => {
    const pts = prices[s]?.points;
    if (pts && pts.length) lookups[s] = closeLookup(pts); else approx.push(s);
  });
  const buysOf = Object.fromEntries(symbols.map(s => [s, rows.filter(r => r.asset === s)]));

  const first = rows[0].date;
  const series = [];
  let prevValue = 0;
  let twr = 100;
  let idx = 0;
  const qty = {};
  let invested = 0;
  for (const date of daysBetween(first, today)) {
    // What came in today, valued at today's close: the return then ignores the small gap between
    // the price you got and the close, so buying never shows up as a gain or a loss of its own.
    let flow = 0;
    while (idx < rows.length && rows[idx].date <= date) {
      const r = rows[idx];
      qty[r.asset] = (qty[r.asset] || 0) + r.qty;
      invested += r.amount;
      flow += r.qty * unitPrice(r.asset, date, today, lookups, live, buysOf[r.asset]);
      idx++;
    }
    let value = 0;
    for (const s of symbols) {
      if (!qty[s]) continue;
      value += qty[s] * unitPrice(s, date, today, lookups, live, buysOf[s]);
    }
    if (series.length && prevValue > 0) twr *= (value - flow) / prevValue;
    series.push({ date, value, invested, profit: value - invested, pct: invested > 0 ? (value - invested) / invested : 0, twr });
    prevValue = value;
  }
  return { series, approx };
}

// Simple moving average over the last `n` closes, aligned with `points`.
// null until there are n closes to average.
export function sma(points = [], n) {
  const out = [];
  let sum = 0;
  points.forEach((p, i) => {
    sum += p[1];
    if (i >= n) sum -= points[i - n][1];
    out.push(i >= n - 1 ? sum / n : null);
  });
  return out;
}

// Where a range starts: `days` back from today, but never before `floor`.
export function rangeStart(rangeKey, today, floor) {
  const days = (RANGES.find(r => r[0] === rangeKey) || RANGES[2])[1];
  const from = addDays(today, -days);
  return floor && from < floor ? floor : from;
}

// Returns, all starting at 0 % on the same day so the lines can be laid over each other.
// `symbols` are assets (their price); the portfolio line is its time-weighted return.
// Returns { rows: [{ date, PORTFOLIO, BTC, ... }] (percent), from, last: { KEY: percent } }.
export function buildComparison({ portfolio = [], symbols = [], prices = {}, live = {}, range = '1Y', today = localDay() }) {
  const firstPortfolioDay = portfolio.length ? portfolio[0].date : null;
  const from = rangeStart(range, today, firstPortfolioDay);
  const days = daysBetween(from, today);
  const portfolioByDay = Object.fromEntries(portfolio.map(r => [r.date, r.twr]));
  const baseTwr = portfolioByDay[from];

  const lines = symbols.filter(s => prices[s]?.points?.length).map(s => {
    const look = closeLookup(prices[s].points);
    const at = (d) => (d === today && live?.[s]?.eur > 0 ? live[s].eur : look(d));
    // An asset that starts later than the range simply starts later on the chart.
    const startDay = days.find(d => at(d) != null);
    return { key: s, at, base: startDay ? at(startDay) : null, startDay };
  });

  const rows = days.map(date => {
    const row = { date };
    if (baseTwr > 0 && portfolioByDay[date] != null) row.PORTFOLIO = (portfolioByDay[date] / baseTwr - 1) * 100;
    for (const l of lines) {
      if (l.base > 0 && date >= l.startDay) {
        const v = l.at(date);
        if (v != null) row[l.key] = (v / l.base - 1) * 100;
      }
    }
    return row;
  });
  const last = {};
  const tail = rows[rows.length - 1] || {};
  Object.keys(tail).forEach(k => { if (k !== 'date') last[k] = tail[k]; });
  return { rows, from, last };
}

// One asset's price over a range with its 50- and 200-day averages, plus where it was bought.
// Returns { rows: [{ date, close, sma50, sma200 }], buys: [{ date, price, qty }], avgCost }.
export function buildPriceChart({ symbol, prices = {}, live = {}, purchases = [], range = '1Y', today = localDay() }) {
  const pts = [...(prices[symbol]?.points || [])];
  if (!pts.length) return { rows: [], buys: [], avgCost: null };
  const liveEur = live?.[symbol]?.eur;
  if (liveEur > 0 && pts[pts.length - 1][0] < today) pts.push([today, liveEur]);
  const a50 = sma(pts, 50);
  const a200 = sma(pts, 200);
  const from = rangeStart(range, today, null);
  const rows = [];
  pts.forEach((p, i) => {
    if (p[0] >= from) rows.push({ date: p[0], close: p[1], sma50: a50[i], sma200: a200[i] });
  });
  const mine = purchases.filter(p => p.asset === symbol && Number(p.quantity) > 0);
  const buys = mine
    .map(p => ({ date: day10(p.date), price: Number(p.price_eur) || 0, qty: Number(p.quantity) || 0 }))
    .filter(b => b.date >= from && b.price > 0);
  const qty = mine.reduce((s, p) => s + (Number(p.quantity) || 0), 0);
  const cost = mine.reduce((s, p) => s + (Number(p.amount_eur) || 0), 0);
  return { rows, buys, avgCost: qty > 0 ? cost / qty : null };
}

// The rebuilt portfolio over one of the 1W / 1M / 1Y / All periods, in the shape the Portfolio Value
// card draws. The change leaves out the money you added: the gain in euro is the change in profit,
// the gain in percent is the time-weighted one.
export function periodView(series = [], period = '1M', today = localDay()) {
  const [, days, label] = PERIODS.find(p => p[0] === period) || PERIODS[1];
  const cutoff = addDays(today, -days);
  const slice = series.filter(r => r.date >= cutoff);
  const rows = slice.length ? slice : series.slice(-1);
  const a = rows[0];
  const b = rows[rows.length - 1];
  return {
    series: rows.map(r => ({ date: r.date, value: r.value })),
    usingHistory: true,
    delta: a && b ? b.profit - a.profit : 0,
    deltaPct: a && b && a.twr > 0 ? (b.twr / a.twr - 1) * 100 : 0,
    label: `${label} · new purchases left out`,
  };
}
