import React, { useState } from 'react';
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
      <div className="card auth-card">
        <div className="auth-logo">W</div>
        <h1 className="auth-title">WEALTH</h1>
        <p className="auth-subtitle">INVESTMENT TRACKER</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="text" className="form-input form-input--lg form-input--upper"
              placeholder="USERNAME" value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
          <div className="form-group">
            <input
              type="password" className="form-input form-input--lg"
              placeholder="PASSWORD" value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <AlertMessage type="error" message={error} />

          <button type="submit" className="btn btn--primary btn--full btn--lg" disabled={loading}>
            {loading ? 'ACCESSO IN CORSO...' : 'ACCEDI'}
          </button>
        </form>
      </div>
    </div>
  );
}
