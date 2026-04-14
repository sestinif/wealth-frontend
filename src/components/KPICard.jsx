import React from 'react';

export default function KPICard({ label, value, color, subtext, interactive = true }) {
  const cardClass = `card kpi-card ${interactive ? 'card--interactive' : ''}`;

  return (
    <div className={cardClass}>
      <div className="kpi-card__label">{label}</div>
      <div
        className="kpi-card__value"
        style={{ background: `linear-gradient(135deg, ${color[0]}, ${color[1]})` }}
      >
        {value}
      </div>
      {subtext && <div className="kpi-card__subtext">{subtext}</div>}
    </div>
  );
}
