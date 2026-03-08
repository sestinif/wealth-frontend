import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await api.login(username, password);
      onLogin(result.access_token, result.username);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const LogoIcon = () => (
    <div style={{
      width: '64px', height: '64px',
      background: 'linear-gradient(135deg, #8B5CF6 0%, #C026D3 100%)',
      borderRadius: '16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '2rem', fontWeight: '800', color: '#FFF',
      boxShadow: '0 12px 32px rgba(139,92,246,0.45)',
      fontFamily: 'Inter, sans-serif'
    }}>W</div>
  );

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0D0B21',
      padding: '16px'
    }}>
      <div style={{
        maxWidth: '420px',
        width: '100%',
        background: 'rgba(26, 23, 53, 0.9)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(139, 92, 246, 0.15)',
        borderRadius: '16px',
        padding: '40px',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
          <LogoIcon />
        </div>

        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#FFFFFF',
          marginBottom: '4px',
          letterSpacing: '0.5px',
          textTransform: 'uppercase'
        }}>
          WEALTH
        </h1>

        <p style={{
          fontSize: '12px',
          color: '#8B85A8',
          marginBottom: '32px',
          letterSpacing: '0.5px',
          textTransform: 'uppercase'
        }}>
          INVESTMENT TRACKER
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="USERNAME"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              marginBottom: '16px',
              background: 'rgba(139, 92, 246, 0.05)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              borderRadius: '10px',
              color: '#FFFFFF',
              fontSize: '13px',
              outline: 'none',
              transition: 'all 0.2s ease',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
            onFocus={(e) => {
              e.target.style.background = 'rgba(139, 92, 246, 0.1)';
              e.target.style.borderColor = 'rgba(139, 92, 246, 0.3)';
            }}
            onBlur={(e) => {
              e.target.style.background = 'rgba(139, 92, 246, 0.05)';
              e.target.style.borderColor = 'rgba(139, 92, 246, 0.15)';
            }}
          />

          <input
            type="password"
            placeholder="PASSWORD"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              marginBottom: '24px',
              background: 'rgba(139, 92, 246, 0.05)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              borderRadius: '10px',
              color: '#FFFFFF',
              fontSize: '13px',
              outline: 'none',
              transition: 'all 0.2s ease',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
            onFocus={(e) => {
              e.target.style.background = 'rgba(139, 92, 246, 0.1)';
              e.target.style.borderColor = 'rgba(139, 92, 246, 0.3)';
            }}
            onBlur={(e) => {
              e.target.style.background = 'rgba(139, 92, 246, 0.05)';
              e.target.style.borderColor = 'rgba(139, 92, 246, 0.15)';
            }}
          />

          {error && (
            <div style={{
              color: '#FF5252',
              fontSize: '12px',
              marginBottom: '16px',
              padding: '12px',
              background: 'rgba(255, 82, 82, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 82, 82, 0.3)'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #C026D3 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 20px rgba(139, 92, 246, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }
            }}
          >
            {loading ? 'ACCESSO IN CORSO...' : 'ACCEDI'}
          </button>
        </form>

        <p style={{
          marginTop: '16px',
          fontSize: '12px',
          color: '#8B85A8'
        }}>
          <a href="#" style={{ color: '#8B5CF6', textDecoration: 'none', cursor: 'pointer' }}>
            PASSWORD DIMENTICATA?
          </a>
        </p>
      </div>
    </div>
  );
}
