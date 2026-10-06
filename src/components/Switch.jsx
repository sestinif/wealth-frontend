import React from 'react';

// A labelled on/off row. Reuses the legacy .toggle control.
export default function Switch({ label, checked, onChange }) {
  return (
    <div className="m-switch">
      <span>{label}</span>
      <label className="toggle">
        <input type="checkbox" aria-label={label} checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="toggle__slider" />
      </label>
    </div>
  );
}
