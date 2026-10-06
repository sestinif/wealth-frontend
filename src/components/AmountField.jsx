import React, { useId } from 'react';

// The one big figure of a form: currency symbol, large input, a caption under it.
export default function AmountField({ label, right, symbol, value, onChange, placeholder = '0.00', caption, disabled }) {
  const id = useId();
  return (
    <div className="form-group">
      <div className="form-label">
        <label htmlFor={id}>{label}</label>
        {right}
      </div>
      <div className="m-amount">
        <span className="m-amount__sym">{symbol}</span>
        <input id={id} className="m-amount__input" type="number" step="any" min="0" inputMode="decimal"
          value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} />
      </div>
      {caption && <div className="m-caption">{caption}</div>}
    </div>
  );
}
