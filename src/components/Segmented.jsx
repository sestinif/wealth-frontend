import React from 'react';

// Two or three mutually exclusive choices, neutral colours.
export default function Segmented({ options, value, onChange }) {
  return (
    <div className="m-seg" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(o => (
        <button key={o.key} type="button" aria-pressed={value === o.key}
          className={`m-seg__btn ${value === o.key ? 'is-active' : ''}`} onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
