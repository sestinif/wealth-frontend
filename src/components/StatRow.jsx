import React from 'react';

// Three figures in a row, no boxes.
// variant "hero": on phones only the first figure stays, big, with `note` under it.
export default function StatRow({ items, variant = 'row', note }) {
  return (
    <div className={`m-stats m-stats--${variant}`}>
      {items.map(it => (
        <div className="m-stat" key={it.label}>
          <div className="m-stat__label">{it.label}</div>
          <div className={`m-stat__value ${it.tone ? `m-stat__value--${it.tone}` : ''}`}>{it.value}</div>
        </div>
      ))}
      {note && <div className="m-stats__note">{note}</div>}
    </div>
  );
}
