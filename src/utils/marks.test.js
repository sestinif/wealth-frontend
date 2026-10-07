import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE, MARKET, TONE, colorFor, assetColor } from './marks.js';

test('colorFor gives the same tint for the same name, whatever the case or the spacing', () => {
  assert.equal(colorFor('Relay'), colorFor('  relay '));
  assert.equal(colorFor('Revolut Business'), colorFor('revolut   business'));
  assert.ok(PALETTE.includes(colorFor('Relay')));
});

test('colorFor always answers with a palette tint, even for an empty name', () => {
  assert.ok(PALETTE.includes(colorFor('')));
  assert.ok(PALETTE.includes(colorFor(null)));
});

test('the banks and brokers in use do not all share one tint', () => {
  const tints = new Set(['Mercury', 'Relay', 'Wise', 'DeGiro', 'Bybit'].map(colorFor));
  assert.ok(tints.size >= 4);
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
