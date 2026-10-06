import React from 'react';

export default function Tabs({ tabs, value, onChange, right }) {
  return (
    <div className="m-tabs">
      <div className="m-tabs__list" role="tablist">
        {tabs.map(t => (
          <button key={t.key} type="button" role="tab" aria-selected={value === t.key}
            className={`m-tabs__tab ${value === t.key ? 'is-active' : ''}`}
            onClick={() => onChange(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      {right && <div className="m-tabs__right">{right}</div>}
    </div>
  );
}
