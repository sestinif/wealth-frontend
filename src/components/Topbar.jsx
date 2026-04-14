import React from 'react';
import { useNavigate } from 'react-router-dom';
import { removeToken } from '../api.js';

export default function Topbar({ title, username }) {
  const navigate = useNavigate();
  const isMac = navigator.platform?.includes('Mac');

  const handleLogout = () => {
    removeToken();
    navigate('/login');
  };

  return (
    <div className="topbar">
      <div className="topbar__title">{title}</div>
      <div className="topbar__right">
        <span className="cmdk-hint" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}>
          {isMac ? '⌘' : 'Ctrl+'}K
        </span>
        <span className="topbar__username">{username}</span>
        <button className="btn btn--danger btn--sm" onClick={handleLogout}>Esci</button>
      </div>
    </div>
  );
}
