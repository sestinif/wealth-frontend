import React from 'react';

// A labelled on/off row: the whole row is the label, so the text is tappable too.
// Reuses the legacy .toggle control.
export default function Switch({ label, checked, onChange }) {
  return (
    <label className="m-switch">
      <span>{label}</span>
      <span className="toggle">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="toggle__slider" />
      </span>
    </label>
  );
}
