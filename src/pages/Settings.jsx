import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { api, removeToken } from '../api.js';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await api.getMe();
        setUser(userData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Completa tutti i campi');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Le password non coincidono');
      return;
    }

    if (newPassword.length < 8) {
      setError('La nuova password deve avere almeno 8 caratteri');
      return;
    }

    setSubmitting(true);
    try {
      await api.changePassword(oldPassword, newPassword);
      setSuccess('Password cambiata con successo');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Errore nel cambio password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    removeToken();
    navigate('/login');
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#8B85A8' }}>Loading...</div>;
  if (!user) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#FF5252' }}>Error loading data</div>;

  const SectionCard = ({ title, children }) => (
    <div style={{
      background: 'rgba(26, 23, 53, 0.9)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(139, 92, 246, 0.15)',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px'
    }}>
      <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {title}
      </h3>
      {children}
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0D0B21' }}>
      <Sidebar username={user.username} />
      <div style={{ flex: 1, marginLeft: '220px', marginTop: '70px' }}>
        <Topbar title="Impostazioni" username={user.username} />
        
        <div style={{ padding: '32px', maxWidth: '600px', margin: '0 auto' }}>
          <SectionCard title="Account">
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Username</label>
              <input
                type="text"
                value={user.username}
                disabled
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(139, 92, 246, 0.05)',
                  border: '1px solid rgba(139, 92, 246, 0.15)',
                  borderRadius: '10px',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  outline: 'none',
                  opacity: 0.6
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '11px', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(139, 92, 246, 0.05)',
                  border: '1px solid rgba(139, 92, 246, 0.15)',
                  borderRadius: '10px',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  outline: 'none',
                  opacity: 0.6
                }}
              />
            </div>

            <div style={{ fontSize: '11px', color: '#8B85A8' }}>
              Membro da {new Date(user.created_at).toLocaleDateString('it-IT')}
            </div>
          </SectionCard>

          <SectionCard title="Cambia Password">
            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Password Attuale</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(139, 92, 246, 0.05)',
                    border: '1px solid rgba(139, 92, 246, 0.15)',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '11px', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Nuova Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(139, 92, 246, 0.05)',
                    border: '1px solid rgba(139, 92, 246, 0.15)',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '11px', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Conferma Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(139, 92, 246, 0.05)',
                    border: '1px solid rgba(139, 92, 246, 0.15)',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
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

              {success && (
                <div style={{
                  color: '#00E676',
                  fontSize: '12px',
                  marginBottom: '16px',
                  padding: '12px',
                  background: 'rgba(0, 230, 118, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(0, 230, 118, 0.3)'
                }}>
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #C026D3 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  opacity: submitting ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!submitting) e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  if (!submitting) e.target.style.transform = 'translateY(0)';
                }}
              >
                {submitting ? 'CAMBIO IN CORSO...' : 'CAMBIA PASSWORD'}
              </button>
            </form>
          </SectionCard>

          <SectionCard title="Informazioni App">
            <div style={{ fontSize: '12px', color: '#8B85A8', lineHeight: '1.6' }}>
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#FFFFFF' }}>WEALTH</strong>
              </div>
              <div style={{ marginBottom: '8px' }}>Version: 2.0.0</div>
              <div style={{ marginBottom: '16px' }}>Investment Tracker per BTC e VUAA</div>
              <div style={{ fontSize: '11px', color: '#6B63B5' }}>
                Tracking intelligente dei tuoi investimenti con analytics avanzati
              </div>
            </div>
          </SectionCard>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: 'rgba(255, 82, 82, 0.1)',
              color: '#FF5252',
              border: '1px solid rgba(255, 82, 82, 0.3)',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
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
    </div>
  );
}
