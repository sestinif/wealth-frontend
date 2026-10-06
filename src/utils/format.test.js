import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatEUR, formatUSD, formatPrice, formatPnL,
  formatDay, formatDayLong, formatMonth, moneyParts, pctText, localDay,
} from './format.js';

const MINUS = '−';

test('formatEUR puts the symbol first and groups thousands', () => {
  assert.equal(formatEUR(63195.72), '€63,195.72');
  assert.equal(formatEUR(0), '€0.00');
  assert.equal(formatEUR(66300, 0), '€66,300');
});

test('formatEUR uses a real minus sign, never on a rounded zero', () => {
  assert.equal(formatEUR(-99.64), `${MINUS}€99.64`);
  assert.equal(formatEUR(-0.001), '€0.00');
});

test('formatUSD mirrors formatEUR', () => {
  assert.equal(formatUSD(1000), '$1,000.00');
  assert.equal(formatUSD(-3498), `${MINUS}$3,498.00`);
});

test('formatPrice adapts decimals to the size of the price', () => {
  assert.equal(formatPrice(66300), '€66,300.00');
  assert.equal(formatPrice(0.7474), '€0.7474');
  assert.equal(formatPrice(0.0051), '€0.0051');
  assert.equal(formatPrice(0.000012), '€0.000012');
  assert.equal(formatPrice(120.5, 'USD'), '$120.50');
});

test('formatPnL always shows a sign', () => {
  assert.equal(formatPnL(342.59), '+€342.59');
  assert.equal(formatPnL(-5323.86), `${MINUS}€5,323.86`);
});

test('date helpers do not depend on the local timezone', () => {
  assert.equal(formatDay('2026-09-11'), 'Sep 11');
  assert.equal(formatDay('2026-09-11T23:30:00'), 'Sep 11');
  assert.equal(formatDayLong('2026-09-11'), 'Sep 11, 2026');
  assert.equal(formatMonth('2026-09-01'), 'September 2026');
});

test('moneyParts splits a figure for dimmed cents', () => {
  assert.deepEqual(moneyParts(63195.72), { negative: false, symbol: '€', int: '63,195', cents: '72' });
  assert.deepEqual(moneyParts(-5, 'USD'), { negative: true, symbol: '$', int: '5', cents: '00' });
});

test('pctText: signed, one decimal, real minus, and a plain zero', () => {
  assert.equal(pctText(31.66), '+31.7%');
  assert.equal(pctText(-95.3), '−95.3%');
  assert.equal(pctText(0), '0.0%');
  assert.equal(pctText(-0.04), '0.0%');
});

test('localDay is the calendar day in local time, also just after midnight', () => {
  assert.equal(localDay(new Date(2026, 9, 6, 0, 30)), '2026-10-06');
  assert.equal(localDay(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.match(localDay(), /^\d{4}-\d{2}-\d{2}$/);
});
