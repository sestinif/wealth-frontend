import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACCOUNT_GROUPS, balanceFor, logoUrl } from './accounts.js';

const external = [
  { name: 'Mercury Checking ••1234', currency: 'USD', balance: 28000 },
  { name: 'Mercury Savings ••3137', currency: 'USD', balance: 500.5 },
  { name: 'Relay', currency: 'USD', balance: 5600 },
  { name: 'Wise EUR', currency: 'EUR', balance: 10 },
  { name: 'Wise USD', currency: 'USD', balance: 10 },
];

test('balanceFor sums the tracked accounts whose name contains the key, ignoring case', () => {
  assert.deepEqual(balanceFor('mercury', external), { amount: 28500.5, currency: 'USD' });
  assert.deepEqual(balanceFor('RELAY', external), { amount: 5600, currency: 'USD' });
});

test('balanceFor gives nothing when it cannot give one honest figure', () => {
  assert.equal(balanceFor('wise', external), null);        // two currencies
  assert.equal(balanceFor('bybit', external), null);       // not tracked
  assert.equal(balanceFor(undefined, external), null);     // no key
  assert.equal(balanceFor('mercury', undefined), null);    // nothing loaded
  assert.equal(balanceFor('monzo', [{ name: 'Monzo', currency: 'GBP', balance: 5 }]), null);   // a currency the app cannot format
});

test('every account has a name, an https login url and a domain', () => {
  const items = ACCOUNT_GROUPS.flatMap(g => g.items);
  assert.equal(items.length, 6);
  for (const it of items) {
    assert.ok(it.name && it.domain, it.name);
    assert.match(it.url, /^https:\/\//);
    const host = new URL(it.url).hostname;
    assert.ok(host === it.domain || host.endsWith(`.${it.domain}`), `${it.name}: ${host} is not on ${it.domain}`);
  }
});

test('logoUrl asks for one domain icon', () => {
  assert.equal(logoUrl('mercury.com'), 'https://www.google.com/s2/favicons?domain=mercury.com&sz=64');
});
