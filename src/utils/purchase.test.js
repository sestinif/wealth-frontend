import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planFunding, purchaseBody, restoredBalance } from './purchase.js';

const eurBroker = { id: 'b1', label: 'Trade Republic', amount_eur: 1000, currency: 'EUR' };
const usdBroker = { id: 'b2', label: 'Bybit', amount_eur: 500, currency: 'USD' };

test('buying from a euro broker takes the euros out one for one', () => {
  assert.deepEqual(planFunding(eurBroker, 250, 1.08), {
    fundFrom: 'b1', deducted: 250, newBalance: 750, currency: 'EUR',
  });
});

test('buying from a dollar broker takes out the amount in dollars', () => {
  // rate = dollars per euro. €100 at 1.08 is $108.
  assert.deepEqual(planFunding(usdBroker, 100, 1.08), {
    fundFrom: 'b2', deducted: 108, newBalance: 392, currency: 'USD',
  });
});

test('a purchase bigger than the broker holds empties it, and only that part is recorded', () => {
  assert.deepEqual(planFunding(eurBroker, 1500, 1.08), {
    fundFrom: 'b1', deducted: 1000, newBalance: 0, currency: 'EUR',
  });
});

test('cents survive the arithmetic', () => {
  const plan = planFunding({ id: 'b', label: 'x', amount_eur: 0.3, currency: 'EUR' }, 0.1, 1);
  assert.equal(plan.deducted, 0.1);
  assert.equal(plan.newBalance, 0.2);
});

test('with no rate a dollar broker is treated at face value, like everywhere else in the app', () => {
  assert.equal(planFunding(usdBroker, 100, null).deducted, 100);
});

test('no broker, no plan', () => {
  assert.equal(planFunding(null, 100, 1.08), null);
  assert.equal(planFunding(undefined, 100, 1.08), null);
});

test('deleting the purchase puts back exactly what was taken out', () => {
  const plan = planFunding(usdBroker, 100, 1.08);
  const after = { ...usdBroker, amount_eur: plan.newBalance };
  assert.equal(restoredBalance(after, plan.deducted), 500);
});

test('restoring onto a missing or odd balance still gives a number', () => {
  assert.equal(restoredBalance({ amount_eur: null }, 40), 40);
  assert.equal(restoredBalance({ amount_eur: '12.5' }, '7.5'), 20);
});

test('the purchase request carries the exact quantity only when one was typed', () => {
  const base = { date: '2026-10-09', asset: 'BTC', amountEur: 472.5, priceEur: 63000 };
  assert.equal('quantity' in purchaseBody({ ...base, quantity: null }), false);
  assert.equal('quantity' in purchaseBody({ ...base, quantity: 0 }), false);
  assert.equal('quantity' in purchaseBody({ ...base, quantity: NaN }), false);
  assert.equal(purchaseBody({ ...base, quantity: 0.0075 }).quantity, 0.0075);
});

test('the purchase request keeps the field names the server expects', () => {
  assert.deepEqual(
    purchaseBody({
      date: '2026-10-09', asset: 'BTC', amountEur: 100, priceEur: 50000,
      priceUsd: 54000, notes: 'dca', fundedFrom: 'b1', fundedAmount: 100,
    }),
    {
      date: '2026-10-09', asset: 'BTC', amount_eur: 100, price_eur: 50000,
      price_usd: 54000, notes: 'dca', funded_from: 'b1', funded_amount: 100,
    },
  );
});
