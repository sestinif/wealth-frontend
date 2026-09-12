import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, removeToken } from '../api.js';
import BrandMark from './BrandMark';

export default function Sidebar({ username, open = false, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    api.getAssets().then(setAssets).catch(() => {});
  }, []);

  const sections = [
    {
      label: 'OVERVIEW',
      items: [{ path: '/dashboard', label: 'DASHBOARD', icon: <DashboardIcon /> }],
    },
    {
      label: 'ADD',
      items: [{ path: '/add', label: 'ADD MOVEMENT', icon: <PlusIcon />, accent: true }],
    },
    {
      label: 'TRACK',
      items: [
        { path: '/diary', label: 'DIARY', icon: <DiaryIcon /> },
        { path: '/dca', label: 'DCA', icon: <DcaIcon /> },
      ],
    },
    {
      label: 'ANALYZE',
      items: [
        { path: '/reports', label: 'REPORTS', icon: <ReportIcon /> },
        { path: '/charts', label: 'CHARTS', icon: <ChartIcon /> },
      ],
    },
  ];

  const handleLogout = () => {
    removeToken();
    navigate('/login');
  };

  return (
    <div className={`sidebar ${open ? 'sidebar--open' : ''}`}>
      <div className="sidebar__brand">
        <div className="sidebar__logo"><BrandMark size={30} /></div>
        <div className="sidebar__title">WEALTH</div>
        <div className="sidebar__subtitle">INVESTMENT TRACKER</div>
        <div className="sidebar__status">
          <div className="sidebar__status-dot" />
          {assets.length > 0 ? `${assets.length} ASSETS TRACKED` : '...'}
        </div>
      </div>

      {/* Sibling app. Its own APPS section, in the same section rhythm as
          OVERVIEW / ADD / TRACK below, so it reads as a place rather than a
          button dropped in the margin — and it's a card, not a line of
          9px grey text, because it competes with real navigation for the
          eye. The tinted chip and the ↗ say "another app, new tab". */}
      <div className="sidebar__section sidebar__section--apps">
        <div className="sidebar__section-label">APPS</div>
        <a
          className="applink"
          href="https://personals.scalingcatalyst.com/"
          target="_blank"
          rel="noopener noreferrer"
          title="Open Personals (personal expenses)"
        >
          <span className="applink__chip">P</span>
          <span className="applink__name">PERSONALS</span>
          <svg className="applink__arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 17L17 7M17 7H8M17 7v9" />
          </svg>
        </a>
      </div>

      <nav className="sidebar__nav">
        {sections.map(section => (
          <div key={section.label} className="sidebar__section">
            <div className="sidebar__section-label">{section.label}</div>
            {section.items.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`nav-item ${item.accent ? 'nav-item--accent' : ''} ${location.pathname === item.path ? 'active' : ''}`}
              >
                <div className="nav-item__icon">{item.icon}</div>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar__footer sidebar__footer--nav">
        <Link
          to="/settings"
          onClick={onClose}
          className={`nav-item nav-item--compact ${location.pathname === '/settings' ? 'active' : ''}`}
        >
          <div className="nav-item__icon"><SettingsIcon /></div>
          SETTINGS
        </Link>
        <div className="sidebar__footer-row">
          <span className="sidebar__user">{username}</span>
          <button type="button" className="sidebar__logout" onClick={handleLogout}>Log Out</button>
        </div>
      </div>
    </div>
  );
}

function DashboardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function DiaryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16v16H4z" /><path d="M9 9h6" /><path d="M9 13h6" /><path d="M9 17h4" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12h18M3 6h18M3 18h18" /><rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="12 3 20 7.5 20 16.5 12 21 4 16.5 4 7.5 12 3" />
      <polyline points="12 12 20 7.5" /><polyline points="12 12 12 21" /><polyline points="12 12 4 7.5" />
    </svg>
  );
}

function DcaIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="10" y2="11" /><line x1="14" y1="11" x2="16" y2="11" />
      <line x1="8" y1="15" x2="10" y2="15" /><line x1="14" y1="15" x2="16" y2="15" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24" />
    </svg>
  );
}
