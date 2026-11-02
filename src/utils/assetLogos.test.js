import { test } from 'node:test';
import assert from 'node:assert/strict';
import { issuerLogo, registerAssets, logoForSymbol, resetAssetLogos } from './assetLogos.js';

test('the issuer in the fund name gives the logo, local file when we keep one', () => {
  assert.equal(issuerLogo('iShares Edge MSCI USA Momentum Factor UCITS ETF USD (Acc)'), '/logos/ishares.png');
  assert.equal(issuerLogo('Vanguard FTSE All-World UCITS ETF'), '/logos/vanguard.png');
  assert.match(issuerLogo('Xtrackers MSCI World UCITS ETF 1C'), /domain=xtrackers\.com/);
});

test('an unknown issuer, or a word that only looks like one, gives no logo', () => {
  assert.equal(issuerLogo('Some Random Fund'), '');
  assert.equal(issuerLogo('Bubbles Growth ETF'), '');
  assert.equal(issuerLogo(''), '');
  assert.equal(issuerLogo(undefined), '');
});

test('a registered ETF is found by its symbol, whatever the case; crypto is ignored', () => {
  resetAssetLogos();
  registerAssets([
    { symbol: 'IUMO.L', name: 'iShares Edge MSCI USA Momentum Factor UCITS ETF', asset_type: 'stock_etf' },
    { symbol: 'BTC', name: 'iShares Bitcoin', asset_type: 'crypto' },
  ]);
  assert.equal(logoForSymbol('iumo.l'), '/logos/ishares.png');
  assert.equal(logoForSymbol('BTC'), '');
  assert.equal(logoForSymbol('NOPE'), '');
});
