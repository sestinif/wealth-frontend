import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLedger, filterLedger, groupByMonth, ledgerStats } from './ledger.js';

const purchases = [
  { id: 'a', date: '2026-06-25', asset: 'BTC', amount_eur: 522.15 },
  { id: 'b', date: '2026-09-11', asset: 'BTC', amount_eur: 483.59 },
  { id: 'c', date: '2026-09-10', asset: 'VUAA', amount_eur: 100 },
];
const bank = [
  { id: 1, date: '2026-10-05', bank: 'Relay', amount: 1000, currency: 'USD' },
  { id: 2, date: '2026-09-10', bank: 'Relay', amount: 3498, currency: 'USD' },
];

test('buildLedger merges both sources, newest first, purchases before bank on the same day', () => {
  const rows = buildLedger(purchases, bank);
  assert.deepEqual(rows.map(r => r.id), ['b-1', 'p-b', 'p-c', 'b-2', 'p-a']);
  assert.equal(rows[1].kind, 'purchase');
  assert.equal(rows[1].item.asset, 'BTC');
});

test('buildLedger tolerates missing inputs and timestamps', () => {
  assert.deepEqual(buildLedger(), []);
  assert.equal(buildLedger([{ id: 'x', date: '2026-01-02T10:00:00', asset: 'BTC', amount_eur: 1 }])[0].date, '2026-01-02');
});

test('filterLedger by tab', () => {
  const rows = buildLedger(purchases, bank);
  assert.equal(filterLedger(rows, { tab: 'purchases' }).length, 3);
  assert.equal(filterLedger(rows, { tab: 'bank' }).length, 2);
  assert.equal(filterLedger(rows).length, 5);
});

test('filterLedger by asset hides bank rows, except on the bank tab where the asset is ignored', () => {
  const rows = buildLedger(purchases, bank);
  assert.deepEqual(filterLedger(rows, { tab: 'all', asset: 'BTC' }).map(r => r.id), ['p-b', 'p-a']);
  assert.equal(filterLedger(rows, { tab: 'bank', asset: 'BTC' }).length, 2);
});

test('groupByMonth keeps order and sums only purchases', () => {
  const groups = groupByMonth(buildLedger(purchases, bank));
  assert.deepEqual(groups.map(g => g.key), ['2026-10', '2026-09', '2026-06']);
  assert.equal(groups[0].invested, 0);
  assert.equal(groups[1].invested, 583.59);
  assert.equal(groups[1].rows.length, 3);
});

test('ledgerStats', () => {
  assert.deepEqual(ledgerStats(purchases), { invested: 1105.74, count: 3, lastDate: '2026-09-11' });
  assert.deepEqual(ledgerStats([]), { invested: 0, count: 0, lastDate: null });
});
