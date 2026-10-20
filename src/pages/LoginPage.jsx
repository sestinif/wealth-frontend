import React, { useState } from 'react';
import BrandMark from '../components/BrandMark';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import AlertMessage from '../components/AlertMessage';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const result = await api.login(username, password);
      onLogin(result.access_token, result.username);
      navigate('/dashboard');
    } catch (err) { setError(err.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-col">
        <header className="auth-head">
          <BrandMark size={48} className="auth-mark" />
          <h1 className="auth-title">Wealth</h1>
          <p className="auth-subtitle">Sign in to your account</p>
        </header>

        <div className="auth-card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-username">Username</label>
              <input
                id="login-username" type="text" className="form-input"
                placeholder="Your username" value={username} required autoFocus autoComplete="username"
                onChange={e => setUsername(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <input
                id="login-password" type="password" className="form-input"
                placeholder="Your password" value={password} required autoComplete="current-password"
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <AlertMessage type="error" message={error} />

            <button type="submit" className="btn btn--primary btn--full btn--lg" disabled={loading}>
              {loading ? 'Signing In…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
