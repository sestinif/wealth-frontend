import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCashflow, flowPeriods, FLOW_START } from './cashflow.js';

const month = (cf, key) => cf.months.find(m => m.key === key);

test('saved is what came into Mercury and the ledger banks, plus dry powder set aside', () => {
  const cf = buildCashflow({
    bankFlows: [{ date: '2026-10-03', amount: 3000, currency: 'EUR' }],                  // Mercury
    bankEntries: [{ date: '2026-10-05', amount: 1000, currency: 'EUR' }],                // Relay, by hand
    dryEvents: [{ date: '2026-10-07', delta: 2000, currency: 'EUR', kind: 'manual' }],   // put on Degiro
  });
  assert.equal(month(cf, '2026-10').saved, 6000);
  assert.equal(month(cf, '2026-10').invested, 0);
});

test('buying from dry powder is invested, and takes nothing off saved', () => {
  // 2k on Degiro in September, 1.5k of stock bought from it in October.
  const cf = buildCashflow({
    purchases: [{ date: '2026-10-10', amount_eur: 1500 }],
    dryEvents: [
      { date: '2026-09-02', delta: 2000, currency: 'EUR', kind: 'manual' },
      { date: '2026-10-10', delta: -1500, currency: 'EUR', kind: 'purchase' },
    ],
  });
  assert.deepEqual(month(cf, '2026-09'), { key: '2026-09', saved: 2000, invested: 0 });
  assert.deepEqual(month(cf, '2026-10'), { key: '2026-10', saved: 0, invested: 1500 });
});

test('the dry powder that was already there, and currency fixes, are not savings', () => {
  const cf = buildCashflow({ dryEvents: [
    { date: '2026-10-09', delta: 2500, currency: 'EUR', opening: true, kind: 'manual' },
    { date: '2026-10-09', delta: -500, currency: 'EUR', kind: 'convert' },
    { date: '2026-10-09', delta: 550, currency: 'USD', kind: 'convert' },
    { date: '2026-10-09', delta: 300, currency: 'EUR' },   // rows written before `kind` existed count as manual
  ] });
  assert.equal(month(cf, '2026-10').saved, 300);
});

test('a transfer between two Mercury accounts nets to zero', () => {
  const cf = buildCashflow({ bankFlows: [
    { date: '2026-10-01', amount: -2000, currency: 'USD', amount_eur: -1785.08 },
    { date: '2026-10-01', amount: 2000, currency: 'USD', amount_eur: 1785.08 },
    { date: '2026-10-02', amount: 1000, currency: 'USD', amount_eur: 892.54 },
  ] });
  assert.equal(month(cf, '2026-10').saved, 892.54);
});

test('dollars use the dated euro value from the server, the live rate only as fallback', () => {
  const dated = buildCashflow({ bankEntries: [{ date: '2026-09-10', amount: 3498, currency: 'USD', amount_eur: 3011.36 }], rate: 1.1186 });
  assert.equal(month(dated, '2026-09').saved, 3011.36);
  const live = buildCashflow({ bankEntries: [{ date: '2026-09-10', amount: 1100, currency: 'USD' }], rate: 1.1 });
  assert.equal(month(live, '2026-09').saved, 1000);
});

test('nothing before the start month is counted, in either figure', () => {
  assert.equal(FLOW_START, '2026-09');
  const cf = buildCashflow({
    purchases: [{ date: '2026-08-31', amount_eur: 500 }, { date: '2026-09-01', amount_eur: 100 }, { date: '2025-11-04', amount_eur: 2000 }],
    bankEntries: [{ date: '2026-06-01', amount: 900, currency: 'EUR' }],
  });
  assert.deepEqual(cf.months.map(m => m.key), ['2026-09']);
  assert.deepEqual(cf.years, [{ key: '2026', saved: 0, invested: 100 }]);
});

test('years add their months up, newest first', () => {
  const cf = buildCashflow({
    purchases: [{ date: '2026-09-11', amount_eur: 985.59 }, { date: '2026-10-08', amount_eur: 986.85 }, { date: '2027-01-05', amount_eur: 10 }],
    bankEntries: [{ date: '2026-09-10', amount: 3011.36, currency: 'EUR' }, { date: '2026-10-05', amount: 892.54, currency: 'EUR' }],
  });
  assert.deepEqual(cf.years, [{ key: '2027', saved: 0, invested: 10 }, { key: '2026', saved: 3903.9, invested: 1972.44 }]);
  assert.deepEqual(cf.months.map(m => m.key), ['2027-01', '2026-10', '2026-09']);
});

test('broken dates are ignored, empty input is fine', () => {
  assert.deepEqual(buildCashflow({ purchases: [{ date: '', amount_eur: 5 }], bankEntries: [{ date: 'x', amount: 5, currency: 'EUR' }] }), { months: [], years: [] });
  assert.deepEqual(buildCashflow(), { months: [], years: [] });
});

test('pickable periods run from the start month to today', () => {
  const p = flowPeriods(new Date(2026, 9, 9));        // 9 October 2026
  assert.deepEqual(p.years, [2026]);
  assert.deepEqual(p.monthsOf(2026), [9, 10]);
  const q = flowPeriods(new Date(2027, 1, 3));        // 3 February 2027
  assert.deepEqual(q.years, [2026, 2027]);
  assert.deepEqual(q.monthsOf(2026), [9, 10, 11, 12]);
  assert.deepEqual(q.monthsOf(2027), [1, 2]);
});
