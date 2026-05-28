import React from 'react';
import Icon from './Icon';

// A proper empty state (icon + title + hint + optional CTA) instead of bare
// "Nessun dato" text — one of the biggest tells between polished and homemade.
export default function EmptyState({ icon = 'inbox', title, description, action, compact = false }) {
  return (
    <div className="empty-state" style={compact ? { minHeight: 120, padding: '28px 16px' } : undefined}>
      <div className="empty-state__icon"><Icon name={icon} size={20} /></div>
      {title && <div className="empty-state__title">{title}</div>}
      {description && <div className="empty-state__desc">{description}</div>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
