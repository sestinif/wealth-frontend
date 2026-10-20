import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, daysBetween, closeLookup, buildPortfolioHistory, sma, rangeStart, buildComparison, buildPriceChart, periodView,
} from './history.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} is not ${b}`);
const TODAY = '2026-10-04';
const btc = { symbol: 'BTC', asset_type: 'crypto' };
const prices = { BTC: { points: [['2026-10-01', 100], ['2026-10-02', 110], ['2026-10-03', 99]] } };
const buy = (date, asset, quantity, amount_eur, price_eur) => ({ date, asset, quantity, amount_eur, price_eur });

test('days: addDays crosses months and daysBetween includes both ends', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.deepEqual(daysBetween('2026-10-01', '2026-10-03'), ['2026-10-01', '2026-10-02', '2026-10-03']);
  assert.deepEqual(daysBetween('2026-10-03', '2026-10-01'), []);
});

test('closeLookup gives the last close at or before the day, null before the start', () => {
  const at = closeLookup([['2026-10-03', 3], ['2026-10-01', 1]]);
  assert.equal(at('2026-09-30'), null);
  assert.equal(at('2026-10-01'), 1);
  assert.equal(at('2026-10-02'), 1);
  assert.equal(at('2026-10-09'), 3);
});

test('portfolio: one purchase follows the price, the last day uses the live price', () => {
  const { series, approx } = buildPortfolioHistory({
    purchases: [buy('2026-10-01', 'BTC', 1, 100, 100)], assets: [btc], prices, live: { BTC: { eur: 120 } }, today: TODAY,
  });
  assert.deepEqual(approx, []);
  assert.deepEqual(series.map(r => r.date), ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
  assert.deepEqual(series.map(r => r.value), [100, 110, 99, 120]);
  assert.deepEqual(series.map(r => r.invested), [100, 100, 100, 100]);
  near(series[1].pct, 0.1);
  near(series[2].pct, -0.01);
  assert.deepEqual(series.map(r => Math.round(r.twr * 1e6) / 1e6), [100, 110, 99, 120]);
});

test('portfolio: buying more never moves the time-weighted index, only prices do', () => {
  const { series } = buildPortfolioHistory({
    purchases: [buy('2026-10-01', 'BTC', 1, 100, 100), buy('2026-10-02', 'BTC', 1, 110, 110)],
    assets: [btc], prices, live: { BTC: { eur: 120 } }, today: TODAY,
  });
  assert.deepEqual(series.map(r => r.value), [100, 220, 198, 240]);
  assert.deepEqual(series.map(r => r.invested), [100, 210, 210, 210]);
  near(series[1].twr, 110);
  near(series[2].twr, 99);
  near(series[3].twr, 120);
  near(series[3].pct, (240 - 210) / 210);
});

test('portfolio: an asset the sources do not cover is valued at its purchase prices and reported', () => {
  const { series, approx } = buildPortfolioHistory({
    purchases: [buy('2026-10-01', 'XYZ', 10, 100, 10), buy('2026-10-03', 'XYZ', 10, 150, 15)],
    assets: [{ symbol: 'XYZ', asset_type: 'dex_token' }], prices: {}, live: {}, today: TODAY,
  });
  assert.deepEqual(approx, ['XYZ']);
  assert.deepEqual(series.map(r => r.value), [100, 100, 300, 300]);
});

test('portfolio: a close before the series starts falls back to the purchase price', () => {
  const { series } = buildPortfolioHistory({
    purchases: [buy('2026-09-28', 'BTC', 1, 90, 90)], assets: [btc], prices, live: {}, today: '2026-10-02',
  });
  assert.deepEqual(series.map(r => r.value), [90, 90, 90, 100, 110]);
});

test('portfolio: assets outside the totals are left out', () => {
  const { series } = buildPortfolioHistory({
    purchases: [buy('2026-10-01', 'BTC', 1, 100, 100), buy('2026-10-01', 'MEME', 1000, 500, 0.5)],
    assets: [btc, { symbol: 'MEME', asset_type: 'dex_token', include_in_totals: false }], prices, live: {}, today: '2026-10-02',
  });
  assert.deepEqual(series.map(r => r.value), [100, 110]);
  assert.deepEqual(series.map(r => r.invested), [100, 100]);
});

test('portfolio: a stock closes on weekdays only, the weekend carries Friday forward', () => {
  const vuaa = { symbol: 'VUAA', asset_type: 'stock_etf' };
  const { series } = buildPortfolioHistory({
    purchases: [buy('2026-10-09', 'VUAA', 2, 200, 100)], assets: [vuaa],
    prices: { VUAA: { points: [['2026-10-09', 100], ['2026-10-12', 105]] } }, live: {}, today: '2026-10-12',
  });
  assert.deepEqual(series.map(r => r.value), [200, 200, 200, 210]);
});

test('portfolio: nothing bought gives nothing', () => {
  assert.deepEqual(buildPortfolioHistory({ purchases: [], assets: [], prices: {}, today: TODAY }), { series: [], approx: [] });
});

test('sma: average of the last n, null until there are n', () => {
  assert.deepEqual(sma([['a', 1], ['b', 2], ['c', 3], ['d', 4]], 2), [null, 1.5, 2.5, 3.5]);
  assert.deepEqual(sma([['a', 1]], 3), [null]);
});

test('rangeStart counts back from today but never before the floor', () => {
  assert.equal(rangeStart('1M', '2026-10-31', null), '2026-10-01');
  assert.equal(rangeStart('1Y', '2026-10-31', '2026-06-01'), '2026-06-01');
  assert.equal(rangeStart('All', '2026-10-31', '2026-06-01'), '2026-06-01');
});

test('comparison: every line starts at 0 % on the same day', () => {
  const { series } = buildPortfolioHistory({
    purchases: [buy('2026-10-01', 'BTC', 1, 100, 100)], assets: [btc], prices, live: { BTC: { eur: 120 } }, today: TODAY,
  });
  const cmp = buildComparison({ portfolio: series, symbols: ['BTC'], prices, live: { BTC: { eur: 120 } }, range: 'All', today: TODAY });
  assert.equal(cmp.from, '2026-10-01');
  assert.equal(cmp.rows[0].PORTFOLIO, 0);
  assert.equal(cmp.rows[0].BTC, 0);
  near(cmp.rows[1].BTC, 10);
  near(cmp.rows[2].PORTFOLIO, -1);
  near(cmp.last.BTC, 20);
  near(cmp.last.PORTFOLIO, 20);
});

test('comparison: a shorter range rebases to its own first day', () => {
  const { series } = buildPortfolioHistory({
    purchases: [buy('2026-10-01', 'BTC', 1, 100, 100)], assets: [btc], prices, live: { BTC: { eur: 120 } }, today: TODAY,
  });
  const cmp = buildComparison({ portfolio: series, symbols: ['BTC'], prices, live: { BTC: { eur: 120 } }, range: '1M', today: TODAY });
  // 1M reaches before the first purchase, so it starts there: same as All
  assert.equal(cmp.from, '2026-10-01');
  const short = buildComparison({ portfolio: series, symbols: ['BTC'], prices, live: {}, range: '1M', today: '2026-12-01' });
  assert.equal(short.rows.length, 31);
});

test('comparison: an asset with no prices has no line, an asset that starts later starts later', () => {
  const p = { A: { points: [['2026-10-03', 50], ['2026-10-04', 55]] } };
  const cmp = buildComparison({ portfolio: [], symbols: ['A', 'B'], prices: p, live: {}, range: '1M', today: '2026-10-04' });
  assert.equal(cmp.rows.find(r => r.date === '2026-10-02').A, undefined);
  assert.equal(cmp.rows.find(r => r.date === '2026-10-03').A, 0);
  near(cmp.last.A, 10);
  assert.equal(cmp.last.B, undefined);
  assert.equal(cmp.last.PORTFOLIO, undefined);
});

test('price chart: rows with averages, the live point, where it was bought and the average cost', () => {
  const points = Array.from({ length: 60 }, (_, i) => [addDays('2026-08-01', i), 100 + i]);
  const out = buildPriceChart({
    symbol: 'BTC', prices: { BTC: { points } }, live: { BTC: { eur: 200 } },
    purchases: [buy('2026-09-01', 'BTC', 1, 130, 130), buy('2026-09-10', 'BTC', 3, 420, 140), buy('2026-09-12', 'ETH', 1, 1, 1)],
    range: 'All', today: '2026-10-01',
  });
  assert.equal(out.rows.length, 61);
  assert.equal(out.rows[0].sma50, null);
  assert.equal(out.rows[48].sma50, null);          // 49 closes: not enough yet
  near(out.rows[49].sma50, 124.5);                  // mean of 100..149
  near(out.rows[59].sma50, 134.5);                  // mean of 110..159
  assert.equal(out.rows[60].close, 200);
  assert.equal(out.rows[60].date, '2026-10-01');
  assert.equal(out.rows[0].sma200, null);
  assert.deepEqual(out.buys.map(b => b.date), ['2026-09-01', '2026-09-10']);
  near(out.avgCost, (130 + 420) / 4);
});

test('price chart: no prices, no chart', () => {
  assert.deepEqual(buildPriceChart({ symbol: 'X', prices: {}, today: TODAY }), { rows: [], buys: [], avgCost: null });
});

test('periodView: the change leaves out the money added during the period', () => {
  const { series } = buildPortfolioHistory({
    purchases: [buy('2026-10-01', 'BTC', 1, 100, 100), buy('2026-10-02', 'BTC', 1, 110, 110)],
    assets: [btc], prices, live: { BTC: { eur: 120 } }, today: TODAY,
  });
  const v = periodView(series, '1W', TODAY);
  assert.deepEqual(v.series.map(r => r.value), [100, 220, 198, 240]);
  near(v.delta, 30);                  // profit went from 0 to 240 - 210
  near(v.deltaPct, 20);               // the price went from 100 to 120
  assert.match(v.label, /new purchases left out/);
});

test('periodView: a period shorter than the history starts inside it', () => {
  const pts = Array.from({ length: 60 }, (_, i) => [addDays('2026-08-01', i), 100 + i]);
  const { series } = buildPortfolioHistory({
    purchases: [buy('2026-08-01', 'BTC', 1, 100, 100)], assets: [btc], prices: { BTC: { points: pts } }, live: {}, today: '2026-09-29',
  });
  const v = periodView(series, '1W', '2026-09-29');
  assert.equal(v.series.length, 8);
  assert.equal(v.series[0].date, '2026-09-22');
  near(v.delta, 7);
});

test('portfolio: paying more or less than the close does not make a jump in the return', () => {
  const { series } = buildPortfolioHistory({
    purchases: [buy('2026-10-01', 'BTC', 1, 100, 100), buy('2026-10-02', 'BTC', 1, 130, 130)],   // the close of the 2nd is 110
    assets: [btc], prices, live: {}, today: '2026-10-03',
  });
  near(series[1].twr, 110);                // the price went 100 → 110, nothing else
  near(series[2].twr, 99);
  assert.deepEqual(series.map(r => r.invested), [100, 230, 230]);
  near(series[1].profit, 220 - 230);       // but the profit is what you really paid
});
