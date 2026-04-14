import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function PageLayout({ title, username, size = 'lg', children }) {
  const sizeClass = size === 'md' ? 'page-inner--md' : size === 'sm' ? 'page-inner--sm' : '';

  return (
    <div className="page-layout">
      <Sidebar username={username} />
      <div className="page-content">
        <Topbar title={title} username={username} />
        <div className={`page-inner ${sizeClass}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
