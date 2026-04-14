import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import AlertMessage from '../components/AlertMessage';

export default function SetupPage({ onComplete }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const requirements = [
    { text: 'Minimo 8 caratteri', met: password.length >= 8 },
    { text: 'Contiene maiuscola', met: /[A-Z]/.test(password) },
    { text: 'Contiene numero', met: /[0-9]/.test(password) },
    { text: 'Le password coincidono', met: password && password === confirmPassword }
  ];

  const allMet = requirements.every(r => r.met);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!allMet) { setError('Tutti i requisiti devono essere soddisfatti'); return; }

    setLoading(true);
    try {
      await api.setup(username, email, password);
      onComplete();
      navigate('/login');
    } catch (err) {
      const msg = err.message || 'Setup failed';
      setError(msg.startsWith('[') ? 'Controlla tutti i campi e riprova.' : msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-wrapper">
      <div className="card auth-card">
        <div className="auth-logo">W</div>
        <h1 className="auth-title">Benvenuto in Wealth</h1>
        <p className="auth-subtitle">Crea il tuo account</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input type="text" className="form-input form-input--lg form-input--upper" placeholder="USERNAME" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="form-group">
            <input type="email" className="form-input form-input--lg form-input--lower" placeholder="EMAIL" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <input type="password" className="form-input form-input--lg" placeholder="PASSWORD" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div className="form-group">
            <input type="password" className="form-input form-input--lg" placeholder="CONFERMA PASSWORD" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>

          <div className="req-list">
            {requirements.map((req, i) => (
              <div key={i} className={`req-item ${req.met ? 'req-item--met' : 'req-item--unmet'}`}>
                {req.met ? '✓' : '○'} {req.text}
              </div>
            ))}
          </div>

          <AlertMessage type="error" message={error} />

          <button type="submit" className="btn btn--primary btn--full btn--lg" disabled={loading || !allMet} style={{ opacity: allMet && !loading ? 1 : 0.5 }}>
            {loading ? 'CREAZIONE IN CORSO...' : 'CREA ACCOUNT'}
          </button>
        </form>
      </div>
    </div>
  );
}
