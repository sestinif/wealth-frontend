import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCashflow, flowSeries } from './cashflow.js';

const purchases = [
  { date: '2026-09-11', amount_eur: 483.59 },
  { date: '2026-09-11', amount_eur: 502 },
  { date: '2026-10-08', amount_eur: 986.85 },
  { date: '2025-12-30', amount_eur: 500 },
];
const bank = [
  { date: '2026-09-10', amount: 3498, currency: 'USD' },
  { date: '2026-09-20', amount: -1000, currency: 'EUR' },
  { date: '2026-10-05', amount: 1000, currency: 'EUR' },
  { date: '2025-12-01', amount: 2000, currency: 'EUR' },
];

test('groups by month, newest first', () => {
  const { months } = buildCashflow(purchases, bank);
  assert.deepEqual(months.map(m => m.key), ['2026-10', '2026-09', '2025-12']);
});

test('in, out, saved and invested per month', () => {
  const sep = buildCashflow(purchases, bank).months.find(m => m.key === '2026-09');
  assert.equal(sep.inflow, 3498);       // no rate: USD at face value
  assert.equal(sep.outflow, 1000);
  assert.equal(sep.saved, 2498);
  assert.equal(sep.invested, 985.59);
});

test('USD entries are converted with the rate', () => {
  const sep = buildCashflow([], [{ date: '2026-09-10', amount: 1100, currency: 'USD' }], 1.1).months[0];
  assert.equal(sep.inflow, 1000);
});

test('a month with only purchases still shows, saved can be negative', () => {
  const oct = buildCashflow(purchases, [{ date: '2026-10-02', amount: -200, currency: 'EUR' }]).months.find(m => m.key === '2026-10');
  assert.equal(oct.inflow, 0);
  assert.equal(oct.saved, -200);
  assert.equal(oct.invested, 986.85);
});

test('years add their months up', () => {
  const { years, total } = buildCashflow(purchases, bank);
  assert.deepEqual(years.map(y => y.key), ['2026', '2025']);
  const y26 = years[0];
  assert.equal(y26.inflow, 4498);
  assert.equal(y26.outflow, 1000);
  assert.equal(y26.saved, 3498);
  assert.equal(y26.invested, 1972.44);
  assert.equal(total.inflow, 6498);
});

test('rows with a broken date are ignored, empty input is fine', () => {
  assert.equal(buildCashflow([{ date: '', amount_eur: 5 }], [{ date: 'x', amount: 5, currency: 'EUR' }]).months.length, 0);
  assert.equal(buildCashflow().total.saved, 0);
});

test('a period with no bank movements is flagged, not shown as zero saved', () => {
  const { months, years } = buildCashflow([{ date: '2025-03-02', amount_eur: 100 }], [{ date: '2026-01-05', amount: 50, currency: 'EUR' }]);
  assert.equal(months.find(m => m.key === '2025-03').hasBank, false);
  assert.equal(months.find(m => m.key === '2026-01').hasBank, true);
  assert.equal(years.find(y => y.key === '2025').hasBank, false);
});

test('the dated euro value from the server wins over the live rate', () => {
  const m = buildCashflow([], [{ date: '2026-09-10', amount: 3498, currency: 'USD', amount_eur: 3011.36 }], 1.1186).months[0];
  assert.equal(m.inflow, 3011.36);
});

test('dry powder set aside counts as saved, deployed dry powder leaves it', () => {
  const dry = [
    { date: '2026-10-02', delta: 1000, currency: 'EUR' },
    { date: '2026-10-20', delta: -400, currency: 'EUR' },
  ];
  const oct = buildCashflow([{ date: '2026-10-20', amount_eur: 400 }], [{ date: '2026-10-05', amount: 500, currency: 'EUR' }], null, dry).months[0];
  assert.equal(oct.saved, 1100);     // 500 bank + 1000 − 400 dry powder
  assert.equal(oct.invested, 400);
});

test('the dry powder that was already there counts in lifetime only', () => {
  const dry = [
    { date: '2026-10-09', delta: 2500, currency: 'EUR', opening: true },
    { date: '2026-10-09', delta: 300, currency: 'EUR', opening: false },
  ];
  const { months, years, total } = buildCashflow([], [], null, dry);
  assert.equal(months[0].saved, 300);
  assert.equal(years[0].saved, 300);
  assert.equal(total.saved, 2800);
  assert.equal(buildCashflow([], [], null, [dry[0]]).total.hasBank, true);
  assert.equal(buildCashflow([], [], null, [dry[0]]).months.length, 0);
});

test('dry powder in dollars uses the dated euro value when the server sends it', () => {
  const m = buildCashflow([], [], 1.1, [{ date: '2026-10-02', delta: 1100, currency: 'USD', amount_eur: 982.14 }]).months[0];
  assert.equal(m.saved, 982.14);
});

test('chart bars: lifetime is one per year, oldest first', () => {
  const cf = buildCashflow(purchases, bank);
  assert.deepEqual(flowSeries(cf, 'lifetime', 2026, 10).map(b => b.label), ['2025', '2026']);
});

test('chart bars: a year is always its twelve months, empty ones at zero', () => {
  const bars = flowSeries(buildCashflow(purchases, bank), 'year', 2026, 10);
  assert.equal(bars.length, 12);
  assert.deepEqual(bars.map(b => b.label).slice(0, 3), ['Jan', 'Feb', 'Mar']);
  assert.equal(bars[8].invested, 985.59);
  assert.equal(bars[8].saved, 2498);
  assert.equal(bars[0].invested, 0);
  assert.ok(bars.every(b => b.selected));
});

test('chart bars: the month view marks only the chosen month', () => {
  const bars = flowSeries(buildCashflow(purchases, bank), 'month', 2026, 9);
  assert.deepEqual(bars.filter(b => b.selected).map(b => b.key), ['2026-09']);
});
