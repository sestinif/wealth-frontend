import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api.js';

export default function Sidebar({ username }) {
  const location = useLocation();
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    api.getAssets().then(setAssets).catch(() => {});
  }, []);

  const navItems = [
    { path: '/dashboard', label: 'DASHBOARD', icon: <DashboardIcon /> },
    { path: '/diary', label: 'DIARIO', icon: <DiaryIcon /> },
    { path: '/reports', label: 'REPORT', icon: <ReportIcon /> },
    { path: '/charts', label: 'GRAFICI', icon: <ChartIcon /> },
    { path: '/settings', label: 'IMPOSTAZIONI', icon: <SettingsIcon /> }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">W</div>
        <div className="sidebar__title">WEALTH</div>
        <div className="sidebar__subtitle">INVESTMENT TRACKER</div>
        <div className="sidebar__status">
          <div className="sidebar__status-dot" />
          {assets.length > 0 ? `${assets.length} ASSET TRACKED` : '...'}
        </div>
      </div>

      <nav className="sidebar__nav">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <div className="nav-item__icon">{item.icon}</div>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar__footer">{username}</div>
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

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24" />
    </svg>
  );
}
