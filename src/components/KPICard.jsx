import React from 'react';

export default function KPICard({ label, value, color, subtext, interactive = true }) {
  const cardClass = `card kpi-card ${interactive ? 'card--interactive' : ''}`;

  return (
    <div className={cardClass} style={{ borderLeft: `3px solid ${color[0]}` }}>
      <div className="kpi-card__label">{label}</div>
      <div className="kpi-card__value" style={{ color: color[0] }}>
        {value}
      </div>
      {subtext && <div className="kpi-card__subtext">{subtext}</div>}
    </div>
  );
}
