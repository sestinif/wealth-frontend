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
  const today = new Date(2026, 9, 6, 12);
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
  const r = periodSeries([{ date: '2026-10-06', total: 132 }], fallback, '1M', new Date(2026, 9, 6, 12));
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
    [{ symbol: 'BTC' }, { symbol: 'MEME', include_in_totals: false }], new Date(2026, 9, 6, 12));
  assert.equal(series.length, 30);
  assert.equal(series[0].date, '2026-09-07');
  assert.equal(series[0].value, 8000);
  assert.equal(series[29].date, '2026-10-06');
  assert.equal(series[29].value, 16000);
  assert.deepEqual(portfolioSeries30d([], {}, []), []);
});

test('series and period cut-offs use the local calendar day, also just after midnight', () => {
  const justAfterMidnight = new Date(2026, 9, 6, 0, 30);   // 6 Oct 2026, 00:30 local time
  const series = portfolioSeries30d([{ date: '2026-10-06', asset: 'BTC', quantity: 1 }], { BTC: { eur: 100 } }, [{ symbol: 'BTC' }], justAfterMidnight);
  assert.equal(series[29].date, '2026-10-06');
  assert.equal(series[29].value, 100);
  const history = [{ date: '2026-09-28', total: 9 }, { date: '2026-09-29', total: 1 }, { date: '2026-09-30', total: 2 }, { date: '2026-10-06', total: 3 }];
  assert.deepEqual(periodSeries(history, [], '1W', justAfterMidnight).series.map(p => p.date), ['2026-09-29', '2026-09-30', '2026-10-06']);
});
