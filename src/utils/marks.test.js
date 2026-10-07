import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE, MARKET, MARKET_AREA, TONE, colorFor, assetColor, isReserved, mix } from './marks.js';

test('colorFor gives the same tint for the same name, whatever the case or the spacing', () => {
  assert.equal(colorFor('Relay'), colorFor('  relay '));
  assert.equal(colorFor('Revolut Business'), colorFor('revolut   business'));
  assert.ok(PALETTE.includes(colorFor('Relay')));
});

test('colorFor always answers with a palette tint, even for an empty name', () => {
  assert.ok(PALETTE.includes(colorFor('')));
  assert.ok(PALETTE.includes(colorFor(null)));
});

test('the banks and brokers in use each have a tint of their own', () => {
  const names = ['Mercury', 'Relay', 'Revolut Business', 'Wise', 'DeGiro', 'Bybit'];
  assert.equal(new Set(names.map(colorFor)).size, names.length);
  names.forEach(n => assert.ok(PALETTE.includes(colorFor(n))));
});

test('an account keeps the tint of its bank', () => {
  assert.equal(colorFor('Mercury Checking ••1234'), colorFor('Mercury'));
  assert.equal(colorFor('degiro'), colorFor('DeGiro'));
});

test('isReserved spots greens and reds, and lets the other colours through', () => {
  ['#4FD1A1', '#00FF00', '#22C55E', '#F58A9B', '#FF0000', '#EF4444'].forEach(c => assert.equal(isReserved(c), true, c));
  ['#00BCD4', '#F7931A', '#2c3ae2', '#0ea5e9', '#9A9AA8', '#FFFFFF', '', 'red'].forEach(c => assert.equal(isReserved(c), false, c));
  [...PALETTE, ...Object.values(MARKET)].forEach(c => assert.equal(isReserved(c), false, c));
});

test('assetColor does not hand out a green or a red, even when picked in Settings', () => {
  assert.equal(assetColor({ symbol: 'VUAA', color: '#22C55E' }), colorFor('VUAA'));
  assert.equal(assetColor({ symbol: 'BRETT', color: '#FF0000' }), colorFor('BRETT'));
});

test('mix blends two colours into one solid hex', () => {
  assert.equal(mix('#FFFFFF', '#000000', 0.5), '#808080');
  assert.equal(mix('#D4A13E', '#1B1B24', 1), '#D4A13E');
  assert.equal(mix('#D4A13E', '#1B1B24', 0), '#1B1B24');
  assert.equal(MARKET_AREA.crypto, mix(MARKET.crypto, '#1B1B24', 0.5));
});

test('assetColor keeps the colour picked in Settings', () => {
  assert.equal(assetColor({ symbol: 'VUAA', color: '#00BCD4' }), '#00BCD4');
  assert.equal(assetColor({ symbol: 'AERO', color: '#2c3ae2' }), '#2c3ae2');
});

test('assetColor falls back to a steady tint when no valid colour is set', () => {
  assert.equal(assetColor({ symbol: 'VUAA', color: '' }), colorFor('VUAA'));
  assert.equal(assetColor({ symbol: 'VUAA', color: 'red' }), colorFor('VUAA'));
  assert.equal(assetColor(undefined, 'VUAA'), colorFor('VUAA'));
});

test('the palette and the markets stay clear of the gain and loss colours', () => {
  const reserved = Object.values(TONE);
  [...PALETTE, ...Object.values(MARKET)].forEach(c => assert.ok(!reserved.includes(c.toUpperCase())));
});
