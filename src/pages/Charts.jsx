import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { api } from '../api.js';

export default function Charts() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const generatePortfolioData = () => {
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last30Days.push({ date: dateStr, value: Math.random() * 5000 + 10000 });
    }
    return last30Days;
  };

  const generateAllocationData = () => {
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const btcVal = Math.random() * 3000 + 5000;
      const vuaaVal = Math.random() * 4000 + 4000;
      last30Days.push({ date: dateStr, BTC: btcVal, VUAA: vuaaVal });
    }
    return last30Days;
  };

  const generateMonthlyData = () => {
    const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    return months.map(month => ({
      month,
      invested: Math.random() * 3000 + 1000,
      value: Math.random() * 4000 + 2000
    }));
  };

  const generateDCAData = () => {
    const data = [];
    let btcPrice = 35000;
    for (let i = 0; i < 12; i++) {
      btcPrice += Math.random() * 4000 - 2000;
      data.push({
        month: i + 1,
        dca: 38000 + Math.random() * 2000,
        market: btcPrice
      });
    }
    return data;
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#8B85A8' }}>Loading...</div>;
  if (!user) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#FF5252' }}>Error loading data</div>;

  const portfolioData = generatePortfolioData();
  const allocationData = generateAllocationData();
  const monthlyData = generateMonthlyData();
  const dcaData = generateDCAData();

  const ChartCard = ({ title, children }) => (
    <div style={{
      background: 'rgba(26, 23, 53, 0.9)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(139, 92, 246, 0.15)',
      borderRadius: '16px',
      padding: '24px'
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
        <Topbar title="Grafici" username={user.username} />
        
        <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <ChartCard title="Valore Portfolio - 30 Giorni">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={portfolioData}>
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
                  <Area type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="BTC vs VUAA - Allocazione">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={allocationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
                  <XAxis dataKey="date" stroke="#8B85A8" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#8B85A8" style={{ fontSize: '10px' }} />
                  <Tooltip contentStyle={{ background: 'rgba(13, 11, 33, 0.95)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '8px' }} />
                  <Legend />
                  <Area type="monotone" dataKey="BTC" stackId="1" stroke="#F7931A" fill="#F7931A" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="VUAA" stackId="1" stroke="#00BCD4" fill="#00BCD4" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <ChartCard title="Investimenti Mensili">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
                  <XAxis dataKey="month" stroke="#8B85A8" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#8B85A8" style={{ fontSize: '10px' }} />
                  <Tooltip contentStyle={{ background: 'rgba(13, 11, 33, 0.95)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="invested" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="value" fill="#C026D3" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="DCA BTC vs Market Price">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dcaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
                  <XAxis dataKey="month" stroke="#8B85A8" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#8B85A8" style={{ fontSize: '10px' }} />
                  <Tooltip contentStyle={{ background: 'rgba(13, 11, 33, 0.95)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '8px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="dca" stroke="#8B5CF6" strokeWidth={2} dot={false} name="DCA Medio" />
                  <Line type="monotone" dataKey="market" stroke="#F7931A" strokeWidth={2} dot={false} name="Prezzo Market" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      </div>
    </div>
  );
}
