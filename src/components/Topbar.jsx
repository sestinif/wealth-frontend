import React from 'react';
import { useNavigate } from 'react-router-dom';
import { removeToken } from '../api.js';

export default function Topbar({ title, username }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    removeToken();
    navigate('/login');
  };

  return (
    <div className="topbar">
      <div className="topbar__title">{title}</div>
      <div className="topbar__right">
        <span className="topbar__username">{username}</span>
        <button className="btn btn--danger btn--sm" onClick={handleLogout}>
          ESCI
        </button>
      </div>
    </div>
  );
}
