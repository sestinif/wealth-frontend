import React from 'react';

// A small inline choice written as text: "EUR · USD".
export default function Pick({ options, value, onChange, disabledKeys = [] }) {
  return (
    <span className="m-pick">
      {options.map(o => (
        <button key={o} type="button" aria-pressed={value === o} disabled={disabledKeys.includes(o)}
          className={`m-pick__btn ${value === o ? 'is-active' : ''}`} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </span>
  );
}
