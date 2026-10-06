import React from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';

// Page title on the left, the page's one primary action on the right.
// On phones the action shrinks to a round "+".
export default function PageHead({ title, action, children }) {
  return (
    <div className="m-head">
      <h1 className="m-head__title">{title}</h1>
      <div className="m-head__side">
        {children}
        {action && (
          <Link to={action.to} className="btn btn--primary m-head__cta" aria-label={action.label}>
            <span className="m-head__cta-icon"><Icon name="plus" size={16} /></span>
            <span className="m-head__cta-label">{action.label}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
