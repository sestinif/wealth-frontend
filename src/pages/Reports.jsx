import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { api } from '../api.js';

export default function Reports() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('lifetime');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [report, setReport] = useState(null);

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

  useEffect(() => {
    const fetchReport = async () => {
      try {
        let data;
        if (tab === 'monthly') {
          data = await api.getMonthlyReport(year, month);
        } else if (tab === 'annual') {
          data = await api.getAnnualReport(year);
        } else {
          data = await api.getLifetimeReport();
        }
        setReport(data);
      } catch (err) {
        setError(err.message);
      }
    };
    fetchReport();
  }, [tab, year, month]);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#8B85A8' }}>Loading...</div>;
  if (!user) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#FF5252' }}>Error loading data</div>;

  const StatCard = ({ label, value, color, subtext }) => (
    <div style={{
      flex: 1,
      minWidth: '150px',
      background: 'rgba(26, 23, 53, 0.9)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(139, 92, 246, 0.15)',
      borderRadius: '16px',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '11px', color: '#8B85A8', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: '18px', fontWeight: '700', background: `linear-gradient(135deg, ${color[0]} 0%, ${color[1]} 100%)`, backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '4px' }}>
        {value}
      </div>
      {subtext && <div style={{ fontSize: '10px', color: '#8B85A8', fontWeight: '500' }}>{subtext}</div>}
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0D0B21' }}>
      <Sidebar username={user.username} />
      <div style={{ flex: 1, marginLeft: '220px', marginTop: '70px' }}>
        <Topbar title="Report" username={user.username} />
        
        <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', borderBottom: '1px solid rgba(139, 92, 246, 0.15)', paddingBottom: '16px' }}>
            {['monthly', 'annual', 'lifetime'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '10px 16px',
                  background: tab === t ? 'linear-gradient(135deg, #8B5CF6 0%, #C026D3 100%)' : 'transparent',
                  color: '#FFFFFF',
                  border: tab === t ? 'none' : '1px solid rgba(139, 92, 246, 0.15)',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                {t === 'monthly' ? 'MENSILE' : t === 'annual' ? 'ANNUALE' : 'LIFETIME'}
              </button>
            ))}
          </div>

          {tab === 'monthly' && (
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                style={{
                  padding: '10px 12px',
                  background: 'rgba(139, 92, 246, 0.05)',
                  border: '1px solid rgba(139, 92, 246, 0.15)',
                  borderRadius: '10px',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  outline: 'none'
                }}
              >
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                style={{
                  padding: '10px 12px',
                  background: 'rgba(139, 92, 246, 0.05)',
                  border: '1px solid rgba(139, 92, 246, 0.15)',
                  borderRadius: '10px',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  outline: 'none'
                }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {tab === 'annual' && (
            <div style={{ marginBottom: '24px' }}>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                style={{
                  padding: '10px 12px',
                  background: 'rgba(139, 92, 246, 0.05)',
                  border: '1px solid rgba(139, 92, 246, 0.15)',
                  borderRadius: '10px',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  outline: 'none'
                }}
              >
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {report && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <StatCard label="Investito" value={`€ ${report.total_invested.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} color={['#8B85A8', '#6B63B5']} />
                <StatCard label="Valore Attuale" value={`€ ${report.total_value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} color={['#8B5CF6', '#C026D3']} />
                <StatCard label="P&L" value={`${report.pnl >= 0 ? '+' : ''}€ ${report.pnl.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} color={report.pnl >= 0 ? ['#00E676', '#00C853'] : ['#FF5252', '#D32F2F']} subtext={`${report.pnl_pct >= 0 ? '+' : ''}${report.pnl_pct.toFixed(2)}%`} />
              </div>

              <div style={{
                background: 'rgba(26, 23, 53, 0.9)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '32px'
              }}>
                <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Breakdown per Asset</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.15)' }}>
                      <th style={{ padding: '12px', textAlign: 'left', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Asset</th>
                      <th style={{ padding: '12px', textAlign: 'right', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Investito</th>
                      <th style={{ padding: '12px', textAlign: 'right', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valore</th>
                      <th style={{ padding: '12px', textAlign: 'right', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quantita</th>
                      <th style={{ padding: '12px', textAlign: 'right', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.by_asset).map(([asset, data], idx) => (
                      <tr key={asset} style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.1)', backgroundColor: idx % 2 === 0 ? 'rgba(139, 92, 246, 0.05)' : 'transparent' }}>
                        <td style={{ padding: '12px', color: '#FFFFFF', fontWeight: '600' }}>{asset}</td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#8B85A8' }}>€ {data.invested.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#FFFFFF' }}>€ {data.value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '12px', textAlign: 'right', color: '#8B85A8' }}>{data.qty.toFixed(4)}</td>
                        <td style={{ padding: '12px', textAlign: 'right', color: data.pnl >= 0 ? '#00E676' : '#FF5252', fontWeight: '600' }}>{data.pnl >= 0 ? '+' : ''}€ {data.pnl.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {report.transactions && report.transactions.length > 0 && (
                <div style={{
                  background: 'rgba(26, 23, 53, 0.9)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(139, 92, 246, 0.15)',
                  borderRadius: '16px',
                  padding: '24px',
                  overflowX: 'auto'
                }}>
                  <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Transazioni</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.15)' }}>
                        <th style={{ padding: '12px', textAlign: 'left', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data</th>
                        <th style={{ padding: '12px', textAlign: 'left', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Asset</th>
                        <th style={{ padding: '12px', textAlign: 'right', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Importo</th>
                        <th style={{ padding: '12px', textAlign: 'right', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quantita</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.transactions.map((tx, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.1)', backgroundColor: idx % 2 === 0 ? 'rgba(139, 92, 246, 0.05)' : 'transparent' }}>
                          <td style={{ padding: '12px', color: '#FFFFFF' }}>{new Date(tx.date).toLocaleDateString('it-IT')}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ background: tx.asset === 'BTC' ? 'rgba(247, 147, 26, 0.2)' : 'rgba(0, 188, 212, 0.2)', color: tx.asset === 'BTC' ? '#F7931A' : '#00BCD4', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600' }}>
                              {tx.asset}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#FFFFFF' }}>€ {tx.amount_eur.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#8B85A8' }}>{tx.quantity.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
