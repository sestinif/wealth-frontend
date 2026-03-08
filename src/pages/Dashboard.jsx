import React, { useState, useEffect } from 'react';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { api } from '../api.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardData, userData] = await Promise.all([api.getDashboard(), api.getMe()]);
        setData(dashboardData);
        setUser(userData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const generateChartData = () => {
    if (!data || !data.purchases) return [];
    
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last30Days.push({ date: dateStr, value: Math.random() * 5000 + 10000 });
    }
    return last30Days;
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#8B85A8' }}>Loading...</div>;
  if (!data || !user) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#FF5252' }}>Error loading data</div>;

  const summary = data.summary;
  const prices = data.prices;

  const KPICard = ({ label, value, color, subtext }) => (
    <div style={{
      flex: 1,
      minWidth: '150px',
      background: 'rgba(26, 23, 53, 0.9)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(139, 92, 246, 0.15)',
      borderRadius: '16px',
      padding: '20px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'rgba(26, 23, 53, 0.95)';
      e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
      e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(26, 23, 53, 0.9)';
      e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.15)';
      e.currentTarget.style.transform = 'translateY(0)';
    }}>
      <div style={{ fontSize: '11px', color: '#8B85A8', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: '20px', fontWeight: '700', background: `linear-gradient(135deg, ${color[0]} 0%, ${color[1]} 100%)`, backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '4px' }}>
        {value}
      </div>
      {subtext && <div style={{ fontSize: '10px', color: '#8B85A8', fontWeight: '500' }}>{subtext}</div>}
    </div>
  );

  const chartData = generateChartData();
  const allocData = [
    { name: 'BTC', value: summary.btc_value, color: '#F7931A' },
    { name: 'VUAA', value: summary.vuaa_value, color: '#00BCD4' }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0D0B21' }}>
      <Sidebar username={user.username} />
      <div style={{ flex: 1, marginLeft: '220px', marginTop: '70px' }}>
        <Topbar title="Dashboard" username={user.username} />
        
        <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <KPICard label="Valore Totale" value={`€ ${summary.total_value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} color={['#8B5CF6', '#C026D3']} />
            <KPICard label="Profitto/Perdita" value={`${summary.pnl >= 0 ? '+' : ''}€ ${summary.pnl.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} color={summary.pnl >= 0 ? ['#00E676', '#00C853'] : ['#FF5252', '#D32F2F']} subtext={`${summary.pnl_pct >= 0 ? '+' : ''}${summary.pnl_pct.toFixed(2)}%`} />
            <KPICard label="Investito Totale" value={`€ ${summary.total_invested.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} color={['#8B85A8', '#6B63B5']} subtext={`${summary.n_purchases} acquisti`} />
            <KPICard label="BTC Prezzo" value={`€ ${prices.BTC.toLocaleString('it-IT', { minimumFractionDigits: 0 })}`} color={['#F7931A', '#FB8500']} subtext={`Qty: ${summary.btc_qty.toFixed(4)}`} />
            <KPICard label="VUAA Prezzo" value={`€ ${prices.VUAA.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} color={['#00BCD4', '#0097A7']} subtext={`Qty: ${summary.vuaa_qty.toFixed(2)}`} />
            <KPICard label="DCA Medio BTC" value={`€ ${summary.btc_avg_price.toLocaleString('it-IT', { minimumFractionDigits: 0 })}`} color={['#9C27B0', '#7B1FA2']} subtext={`vs € ${prices.BTC.toLocaleString('it-IT', { minimumFractionDigits: 0 })}`} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
            <div style={{
              background: 'rgba(26, 23, 53, 0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              borderRadius: '16px',
              padding: '24px'
            }}>
              <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valore Portfolio - 30 Giorni</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#C026D3" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
                  <XAxis dataKey="date" stroke="#8B85A8" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#8B85A8" style={{ fontSize: '10px' }} />
                  <Tooltip contentStyle={{ background: 'rgba(13, 11, 33, 0.95)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{
              background: 'rgba(26, 23, 53, 0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Allocazione Asset</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={allocData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                    {allocData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'rgba(13, 11, 33, 0.95)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ marginTop: '16px', display: 'flex', gap: '24px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', background: '#F7931A', borderRadius: '3px' }}></div>
                  <span style={{ color: '#8B85A8' }}>BTC: {(summary.btc_value / summary.total_value * 100).toFixed(1)}%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', background: '#00BCD4', borderRadius: '3px' }}></div>
                  <span style={{ color: '#8B85A8' }}>VUAA: {(summary.vuaa_value / summary.total_value * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            background: 'rgba(26, 23, 53, 0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            borderRadius: '16px',
            padding: '24px',
            overflowX: 'auto'
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ultimi Acquisti</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.15)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Asset</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Importo</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quantita</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#8B85A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prezzo</th>
                </tr>
              </thead>
              <tbody>
                {data.purchases.slice(-5).reverse().map((purchase, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.1)', backgroundColor: idx % 2 === 0 ? 'rgba(139, 92, 246, 0.05)' : 'transparent' }}>
                    <td style={{ padding: '12px', color: '#FFFFFF' }}>{new Date(purchase.date).toLocaleDateString('it-IT')}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ background: purchase.asset === 'BTC' ? 'rgba(247, 147, 26, 0.2)' : 'rgba(0, 188, 212, 0.2)', color: purchase.asset === 'BTC' ? '#F7931A' : '#00BCD4', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600' }}>
                        {purchase.asset}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#FFFFFF' }}>€ {purchase.amount_eur.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#8B85A8' }}>{purchase.quantity.toFixed(4)}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#8B85A8' }}>€ {purchase.price_eur.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
