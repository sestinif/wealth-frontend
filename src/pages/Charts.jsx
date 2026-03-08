import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { api } from '../api.js';

export default function Charts() {
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userData, dashboardData] = await Promise.all([api.getMe(), api.getDashboard()]);
        setUser(userData);
        setDashboard(dashboardData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const buildPortfolioData = () => {
    if (!dashboard || !dashboard.purchases || dashboard.purchases.length === 0) return [];
    const prices = dashboard.prices;
    const purchases = [...dashboard.purchases].sort((a, b) => new Date(a.date) - new Date(b.date));
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const pastPurchases = purchases.filter(p => p.date <= dateStr);
      const btcQty = pastPurchases.filter(p => p.asset === 'BTC').reduce((s, p) => s + p.quantity, 0);
      const vuaaQty = pastPurchases.filter(p => p.asset === 'VUAA').reduce((s, p) => s + p.quantity, 0);
      const value = btcQty * prices.BTC + vuaaQty * prices.VUAA;
      last30Days.push({ date: dateStr, value: Math.round(value) });
    }
    return last30Days;
  };

  const buildAllocationData = () => {
    if (!dashboard || !dashboard.purchases || dashboard.purchases.length === 0) return [];
    const prices = dashboard.prices;
    const purchases = [...dashboard.purchases].sort((a, b) => new Date(a.date) - new Date(b.date));
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const pastPurchases = purchases.filter(p => p.date <= dateStr);
      const btcQty = pastPurchases.filter(p => p.asset === 'BTC').reduce((s, p) => s + p.quantity, 0);
      const vuaaQty = pastPurchases.filter(p => p.asset === 'VUAA').reduce((s, p) => s + p.quantity, 0);
      last30Days.push({
        date: dateStr,
        BTC: Math.round(btcQty * prices.BTC),
        VUAA: Math.round(vuaaQty * prices.VUAA)
      });
    }
    return last30Days;
  };

  const buildMonthlyData = () => {
    if (!dashboard || !dashboard.purchases || dashboard.purchases.length === 0) return [];
    const prices = dashboard.prices;
    const purchases = dashboard.purchases;
    const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    const year = new Date().getFullYear();
    return months.map((month, i) => {
      const monthStr = `${year}-${String(i + 1).padStart(2, '0')}`;
      const monthPurchases = purchases.filter(p => p.date.startsWith(monthStr));
      const invested = monthPurchases.reduce((s, p) => s + p.amount_eur, 0);
      const btcQty = monthPurchases.filter(p => p.asset === 'BTC').reduce((s, p) => s + p.quantity, 0);
      const vuaaQty = monthPurchases.filter(p => p.asset === 'VUAA').reduce((s, p) => s + p.quantity, 0);
      const value = btcQty * prices.BTC + vuaaQty * prices.VUAA;
      return { month, invested: Math.round(invested), value: Math.round(value) };
    }).filter(d => d.invested > 0 || d.value > 0);
  };

  const buildDCAData = () => {
    if (!dashboard || !dashboard.purchases || dashboard.purchases.length === 0) return [];
    const prices = dashboard.prices;
    const btcPurchases = dashboard.purchases
      .filter(p => p.asset === 'BTC')
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    if (btcPurchases.length === 0) return [];
    let totalInvested = 0;
    let totalQty = 0;
    return btcPurchases.map((p, i) => {
      totalInvested += p.amount_eur;
      totalQty += p.quantity;
      const avgPrice = totalInvested / totalQty;
      return {
        acquisto: i + 1,
        'DCA Medio': Math.round(avgPrice),
        'Prezzo Market': Math.round(prices.BTC)
      };
    });
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#8B85A8' }}>Loading...</div>;
  if (!user) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#FF5252' }}>Error loading data</div>;

  const portfolioData = buildPortfolioData();
  const allocationData = buildAllocationData();
  const monthlyData = buildMonthlyData();
  const dcaData = buildDCAData();

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

  const NoData = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#8B85A8', fontSize: '13px' }}>
      Nessun dato — aggiungi acquisti nel Diario
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
              {portfolioData.length === 0 ? <NoData /> : (
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
              )}
            </ChartCard>

            <ChartCard title="BTC vs VUAA - Allocazione">
              {allocationData.length === 0 ? <NoData /> : (
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
              )}
            </ChartCard>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <ChartCard title="Investimenti Mensili">
              {monthlyData.length === 0 ? <NoData /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
                    <XAxis dataKey="month" stroke="#8B85A8" style={{ fontSize: '10px' }} />
                    <YAxis stroke="#8B85A8" style={{ fontSize: '10px' }} />
                    <Tooltip contentStyle={{ background: 'rgba(13, 11, 33, 0.95)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '8px' }} />
                    <Legend />
                    <Bar dataKey="invested" name="Investito" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="value" name="Valore" fill="#C026D3" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="DCA BTC vs Market Price">
              {dcaData.length === 0 ? <NoData /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dcaData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" />
                    <XAxis dataKey="acquisto" stroke="#8B85A8" style={{ fontSize: '10px' }} />
                    <YAxis stroke="#8B85A8" style={{ fontSize: '10px' }} />
                    <Tooltip contentStyle={{ background: 'rgba(13, 11, 33, 0.95)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '8px' }} />
                    <Legend />
                    <Line type="monotone" dataKey="DCA Medio" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Prezzo Market" stroke="#F7931A" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </div>
      </div>
    </div>
  );
}
