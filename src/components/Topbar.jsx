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
    <div style={{
      position: 'fixed',
      top: 0,
      left: '220px',
      right: 0,
      height: '70px',
      background: 'rgba(13, 11, 33, 0.8)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: '32px',
      paddingRight: '32px',
      zIndex: 50
    }}>
      <div style={{
        fontSize: '18px',
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: '0.5px',
        textTransform: 'uppercase'
      }}>
        {title}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <span style={{
          fontSize: '12px',
          color: '#8B85A8',
          textTransform: 'uppercase',
          fontWeight: '500',
          letterSpacing: '0.5px'
        }}>
          {username}
        </span>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            background: 'rgba(255, 82, 82, 0.1)',
            color: '#FF5252',
            border: '1px solid rgba(255, 82, 82, 0.3)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 82, 82, 0.2)';
            e.target.style.borderColor = 'rgba(255, 82, 82, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 82, 82, 0.1)';
            e.target.style.borderColor = 'rgba(255, 82, 82, 0.3)';
          }}
        >
          ESCI
        </button>
      </div>
    </div>
  );
}
