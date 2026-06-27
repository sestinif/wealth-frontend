import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import AlertMessage from '../components/AlertMessage';
import Icon from '../components/Icon';

export default function SetupPage({ onComplete }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const requirements = [
    { text: 'At least 8 characters', met: password.length >= 8 },
    { text: 'Contains an uppercase letter', met: /[A-Z]/.test(password) },
    { text: 'Contains a number', met: /[0-9]/.test(password) },
    { text: 'Passwords match', met: password && password === confirmPassword }
  ];

  const allMet = requirements.every(r => r.met);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!allMet) { setError('All requirements must be met'); return; }

    setLoading(true);
    try {
      await api.setup(username, email, password);
      onComplete();
      navigate('/login');
    } catch (err) {
      const msg = err.message || 'Setup failed';
      setError(msg.startsWith('[') ? 'Check all fields and try again.' : msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">W</div>
        <h1 className="auth-title">Welcome to Wealth</h1>
        <p className="auth-subtitle">Create your account</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input type="text" className="form-input form-input--lg" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="form-group">
            <input type="email" className="form-input form-input--lg form-input--lower" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <input type="password" className="form-input form-input--lg" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div className="form-group">
            <input type="password" className="form-input form-input--lg" placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>

          <div className="req-list">
            {requirements.map((req, i) => (
              <div key={i} className={`req-item ${req.met ? 'req-item--met' : 'req-item--unmet'}`}>
                <Icon name={req.met ? 'check' : 'circle'} size={13} strokeWidth={req.met ? 2.5 : 2} /> {req.text}
              </div>
            ))}
          </div>

          <AlertMessage type="error" message={error} />

          <button type="submit" className="btn btn--primary btn--full btn--lg" disabled={loading || !allMet} style={{ opacity: allMet && !loading ? 1 : 0.5 }}>
            {loading ? 'CREATING...' : 'CREATE ACCOUNT'}
          </button>
        </form>
      </div>
    </div>
  );
}
