import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar({ username }) {
  const location = useLocation();

  const LogoIcon = () => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #8B5CF6 0%, #C026D3 100%)', padding: '8px' }}>
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="24" fontWeight="700" fill="white" fontFamily="Inter">W</text>
    </svg>
  );

  const DashboardIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
    </svg>
  );

  const DiaryIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4h16v16H4z"></path>
      <path d="M9 9h6"></path>
      <path d="M9 13h6"></path>
      <path d="M9 17h4"></path>
    </svg>
  );

  const ReportIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12h18M3 6h18M3 18h18"></path>
      <rect x="3" y="3" width="18" height="18" rx="2"></rect>
    </svg>
  );

  const ChartIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="12 3 20 7.5 20 16.5 12 21 4 16.5 4 7.5 12 3"></polyline>
      <polyline points="12 12 20 7.5"></polyline>
      <polyline points="12 12 12 21"></polyline>
      <polyline points="12 12 4 7.5"></polyline>
    </svg>
  );

  const SettingsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24"></path>
    </svg>
  );

  const navItems = [
    { path: '/dashboard', label: 'DASHBOARD', icon: <DashboardIcon /> },
    { path: '/diary', label: 'DIARIO', icon: <DiaryIcon /> },
    { path: '/reports', label: 'REPORT', icon: <ReportIcon /> },
    { path: '/charts', label: 'GRAFICI', icon: <ChartIcon /> },
    { path: '/settings', label: 'IMPOSTAZIONI', icon: <SettingsIcon /> }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div style={{
      position: 'fixed',
      left: 0,
      top: 0,
      width: '220px',
      height: '100vh',
      background: 'linear-gradient(180deg, rgba(26, 23, 53, 0.95) 0%, rgba(13, 11, 33, 0.95) 100%)',
      backdropFilter: 'blur(12px)',
      borderRight: '1px solid rgba(139, 92, 246, 0.15)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      zIndex: 100
    }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ marginBottom: '12px' }}>
          <LogoIcon />
        </div>
        <div style={{ color: '#FFFFFF', fontSize: '14px', fontWeight: '700', letterSpacing: '1px', marginBottom: '4px' }}>WEALTH</div>
        <div style={{ color: '#8B85A8', fontSize: '10px', fontWeight: '500', letterSpacing: '0.5px' }}>INVESTMENT TRACKER</div>
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#8B85A8' }}>
          <div style={{ width: '6px', height: '6px', background: '#00E676', borderRadius: '50%' }}></div>
          VUAA · BTC
        </div>
      </div>

      <nav style={{ flex: 1 }}>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 12px',
              marginBottom: '8px',
              borderRadius: '12px',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: '600',
              color: isActive(item.path) ? '#FFFFFF' : '#8B85A8',
              background: isActive(item.path) ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(192, 38, 211, 0.2) 100%)' : 'transparent',
              border: isActive(item.path) ? '1px solid rgba(139, 92, 246, 0.3)' : 'none',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
            onMouseEnter={(e) => {
              if (!isActive(item.path)) {
                e.target.style.color = '#FFFFFF';
                e.target.style.background = 'rgba(139, 92, 246, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive(item.path)) {
                e.target.style.color = '#8B85A8';
                e.target.style.background = 'transparent';
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', color: 'inherit' }}>
              {item.icon}
            </div>
            {item.label}
          </Link>
        ))}
      </nav>

      <div style={{
        paddingTop: '24px',
        borderTop: '1px solid rgba(139, 92, 246, 0.15)',
        fontSize: '11px',
        color: '#8B85A8',
        textAlign: 'center',
        wordBreak: 'break-word'
      }}>
        {username}
      </div>
    </div>
  );
}
