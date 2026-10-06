import React from 'react';
import { moneyParts } from '../utils/format';

// A money figure with dimmed cents: "€63,195" + ".72".
// sign: also show "+" on positive values (profits, money in).
export default function Money({ value, currency = 'EUR', sign = false, className = '' }) {
  const { negative, symbol, int, cents } = moneyParts(value, currency);
  const lead = negative ? '−' : sign ? '+' : '';
  return (
    <span className={`m-money ${className}`.trim()}>
      {lead}{symbol}{int}<span className="m-money__cents">.{cents}</span>
    </span>
  );
}
