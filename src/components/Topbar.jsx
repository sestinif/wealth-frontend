import React from 'react';
import { useNavigate } from 'react-router-dom';
import { removeToken } from '../api.js';
import Icon from './Icon';

export default function Topbar({ title, username, onMenu }) {
  const navigate = useNavigate();
  const isMac = navigator.platform?.includes('Mac');

  const handleLogout = () => {
    removeToken();
    navigate('/login');
  };

  return (
    <div className="topbar">
      <div className="topbar__left">
        <button className="topbar__menu" onClick={onMenu} aria-label="Menu"><Icon name="menu" size={18} /></button>
        <div className="topbar__title">{title}</div>
      </div>
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
