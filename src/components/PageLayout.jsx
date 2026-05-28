import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function PageLayout({ title, username, size = 'lg', children }) {
  const sizeClass = size === 'md' ? 'page-inner--md' : size === 'sm' ? 'page-inner--sm' : '';
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="page-layout">
      <Sidebar username={username} open={navOpen} onClose={() => setNavOpen(false)} />
      {navOpen && <div className="nav-backdrop" onClick={() => setNavOpen(false)} />}
      <div className="page-content">
        <Topbar title={title} username={username} onMenu={() => setNavOpen(true)} />
        <div className={`page-inner ${sizeClass}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
