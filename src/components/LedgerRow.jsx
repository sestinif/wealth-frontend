import React from 'react';
import Icon from './Icon';

// One ledger line. Desktop: date · avatar · name+detail · amount · dots.
// Phone: avatar · name+short detail · amount with the date under it.
export default function LedgerRow({ date, avatar, title, sub, subShort, amount, tone = '', onClick }) {
  return (
    <button type="button" className="m-row" onClick={onClick}>
      <span className="m-row__date">{date}</span>
      {avatar}
      <span className="m-row__main">
        <span className="m-row__title">{title}</span>
        <span className="m-row__sub m-row__sub--full">{sub}</span>
        <span className="m-row__sub m-row__sub--short">{subShort ?? sub}</span>
      </span>
      <span className="m-row__amt">
        <span className={`m-row__amount ${tone ? `m-row__amount--${tone}` : ''}`}>{amount}</span>
        <span className="m-row__date-m">{date}</span>
      </span>
      <span className="m-row__more" aria-hidden="true"><Icon name="dots" size={16} /></span>
    </button>
  );
}
