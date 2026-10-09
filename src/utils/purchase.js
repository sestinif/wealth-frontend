// The money maths of recording a purchase, free of the page so it can be tested.

const cents = (n) => Number(Number(n).toFixed(2));

// Buying from a broker's "dry powder": how much to take out, in the broker's
// own currency, and what is left. `rate` is dollars per euro. A purchase bigger
// than the balance empties it and records only the part actually taken, so
// deleting the purchase later gives back exactly that and no more.
export function planFunding(position, amountEur, rate) {
  if (!position) return null;
  const currency = (position.currency || 'EUR').toUpperCase();
  const deduction = currency === 'USD' && rate ? amountEur * rate : amountEur;
  const oldBalance = Number(position.amount_eur) || 0;
  const newBalance = Math.max(0, oldBalance - deduction);
  return {
    fundFrom: position.id,
    deducted: cents(oldBalance - newBalance),
    newBalance: cents(newBalance),
    currency,
  };
}

// The balance after a funded purchase is deleted: what was taken goes back.
export function restoredBalance(position, fundedAmount) {
  return cents((Number(position?.amount_eur) || 0) + Number(fundedAmount));
}

// The request body for a new purchase. `quantity` rides along only when the
// user typed an exact one (the amount of coin received, say): the server then
// keeps it as it is instead of recomputing amount / price, which drifts because
// the amount is rounded to cents.
export function purchaseBody({
  date, asset, amountEur, priceEur, priceUsd = 0, notes = '',
  fundedFrom = null, fundedAmount = 0, quantity = null,
}) {
  const body = {
    date, asset,
    amount_eur: amountEur, price_eur: priceEur, price_usd: priceUsd,
    notes, funded_from: fundedFrom, funded_amount: fundedAmount,
  };
  if (Number.isFinite(quantity) && quantity > 0) body.quantity = quantity;
  return body;
}
