import React from 'react';

// A labelled control: label on the left, an optional extra on the right, hint below.
export default function Field({ label, right, hint, children }) {
  return (
    <div className="form-group">
      {(label || right) && (
        <div className="form-label">
          <span>{label}</span>
          {right}
        </div>
      )}
      {children}
      {hint && <div className="form-hint">{hint}</div>}
    </div>
  );
}
