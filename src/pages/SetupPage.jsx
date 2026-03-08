import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

export default function SetupPage({ onComplete }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const passwordRequirements = [
    { text: 'MINIMO 8 CARATTERI', met: password.length >= 8 },
    { text: 'CONTIENE MAIUSCOLA', met: /[A-Z]/.test(password) },
    { text: 'CONTIENE NUMERO', met: /[0-9]/.test(password) },
    { text: 'LE PASSWORD COINCIDONO', met: password && password === confirmPassword }
  ];

  const allRequirementsMet = passwordRequirements.every(req => req.met);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!allRequirementsMet) {
      setError('Tutti i requisiti devono essere soddisfatti');
      return;
    }

    setLoading(true);

    try {
      await api.setup(username, email, password);
      onComplete();
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const LogoIcon = () => (
    <svg width="60" height="60" viewBox="0 0 40 40" fill="none" style={{ borderRadius: '12px', background: 'linear-gradient(135deg, #8B5CF6 0%, #C026D3 100%)' }}>
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="32" fontWeight="700" fill="white" fontFamily="Inter">W</text>
    </svg>
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
          BENVENUTO IN WEALTH
        </h1>

        <p style={{
          fontSize: '12px',
          color: '#8B85A8',
          marginBottom: '32px',
          letterSpacing: '0.5px',
          textTransform: 'uppercase'
        }}>
          CREA IL TUO ACCOUNT
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
              marginBottom: '12px',
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
            type="email"
            placeholder="EMAIL"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              marginBottom: '12px',
              background: 'rgba(139, 92, 246, 0.05)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              borderRadius: '10px',
              color: '#FFFFFF',
              fontSize: '13px',
              outline: 'none',
              transition: 'all 0.2s ease',
              fontWeight: '500',
              textTransform: 'lowercase',
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
              marginBottom: '12px',
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
            placeholder="CONFERMA PASSWORD"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              marginBottom: '20px',
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

          <div style={{
            marginBottom: '20px',
            textAlign: 'left',
            fontSize: '11px'
          }}>
            {passwordRequirements.map((req, idx) => (
              <div
                key={idx}
                style={{
                  color: req.met ? '#00E676' : '#8B85A8',
                  marginBottom: '6px',
                  fontWeight: '500',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase'
                }}
              >
                {req.met ? '✓ ' : '○ '}{req.text}
              </div>
            ))}
          </div>

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
            disabled={loading || !allRequirementsMet}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: allRequirementsMet && !loading ? 'linear-gradient(135deg, #8B5CF6 0%, #C026D3 100%)' : 'rgba(139, 92, 246, 0.2)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: allRequirementsMet && !loading ? 'pointer' : 'not-allowed',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'all 0.2s ease',
              opacity: allRequirementsMet && !loading ? 1 : 0.5
            }}
            onMouseEnter={(e) => {
              if (allRequirementsMet && !loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 20px rgba(139, 92, 246, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (allRequirementsMet && !loading) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }
            }}
          >
            {loading ? 'CREAZIONE IN CORSO...' : 'CREA ACCOUNT'}
          </button>
        </form>
      </div>
    </div>
  );
}
