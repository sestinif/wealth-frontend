import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAssetSeries, changePct, isIntraday } from './assetChart.js';

const NOW = Date.parse('2026-11-02T12:00:00Z');
const day = (n) => new Date(NOW - n * 86400000).toISOString().slice(0, 10);

test('1D and 7D use the live points as they are', () => {
  const rows = buildAssetSeries({ range: '1D', intraday: [[2000, 5], [1000, 4]], now: NOW });
  assert.deepEqual(rows, [{ t: 1000, price: 4 }, { t: 2000, price: 5 }]);
  assert.ok(isIntraday('7D') && !isIntraday('1M'));
});

test('1M keeps the last 30 days of daily closes and ends on the live price', () => {
  const daily = [[day(45), 1], [day(29), 2], [day(1), 3]];
  const rows = buildAssetSeries({ range: '1M', daily, live: 3.5, now: NOW });
  assert.deepEqual(rows.map(r => r.price), [2, 3, 3.5]);
  assert.equal(rows[rows.length - 1].t, NOW);
});

test('1Y keeps what 1M drops', () => {
  const daily = [[day(200), 1], [day(1), 3]];
  assert.equal(buildAssetSeries({ range: '1Y', daily, now: NOW }).length, 2);
  assert.equal(buildAssetSeries({ range: '1M', daily, now: NOW }).length, 1);
});

test('no live price, no extra point; zero and bad prices are dropped', () => {
  const rows = buildAssetSeries({ range: '1M', daily: [[day(2), 0], [day(1), 3]], now: NOW });
  assert.deepEqual(rows.map(r => r.price), [3]);
});

test('changePct is first to last, null without two rows', () => {
  assert.ok(Math.abs(changePct([{ t: 1, price: 100 }, { t: 2, price: 110 }]) - 10) < 1e-9);
  assert.equal(changePct([{ t: 1, price: 100 }]), null);
  assert.equal(changePct([]), null);
});
