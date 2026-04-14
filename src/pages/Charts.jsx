import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PageLayout from '../components/PageLayout';
import FormInput from '../components/FormInput';
import { api } from '../api.js';
import { TOOLTIP_STYLE } from '../utils/format';

const GRID_STROKE = 'rgba(139, 92, 246, 0.1)';
const AXIS_STYLE = { fontSize: '10px' };

export default function Charts() {
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dcaAsset, setDcaAsset] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userData, dashboardData, assetsData] = await Promise.all([
          api.getMe(), api.getDashboard(), api.getAssets()
        ]);
        setUser(userData);
        setDashboard(dashboardData);
        setAssets(assetsData);
        if (assetsData.length > 0 && !dcaAsset) setDcaAsset(assetsData[0].symbol);
      } catch (err) { /* handled by loading */ }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <div className="loading-screen"><div className="loading-logo">W</div><div className="loading-text">CARICAMENTO...</div></div>;
  if (!user) return <div className="loading-screen"><div className="loading-error">Errore nel caricamento</div></div>;

  const portfolioData = buildPortfolioData(dashboard);
  const allocationData = buildAllocationData(dashboard, assets);
  const monthlyData = buildMonthlyData(dashboard);
  const dcaData = buildDCAData(dashboard, dcaAsset);
  const dcaOptions = assets.map(a => ({ value: a.symbol, label: a.symbol }));

  return (
    <PageLayout title="Grafici" username={user.username}>
      <div className="grid-2col section-gap">
        <ChartCard title="Valore Portfolio — 30 Giorni" data={portfolioData}>
          <AreaChart data={portfolioData}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#C026D3" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="date" stroke="#8B85A8" style={AXIS_STYLE} />
            <YAxis stroke="#8B85A8" style={AXIS_STYLE} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Area type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2} fill="url(#chartGradient)" />
          </AreaChart>
        </ChartCard>

        <ChartCard title="Allocazione Asset" data={allocationData}>
          <AreaChart data={allocationData}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="date" stroke="#8B85A8" style={AXIS_STYLE} />
            <YAxis stroke="#8B85A8" style={AXIS_STYLE} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend />
            {assets.map(a => (
              <Area key={a.symbol} type="monotone" dataKey={a.symbol}
                stackId="1" stroke={a.color} fill={a.color} fillOpacity={0.6} />
            ))}
          </AreaChart>
        </ChartCard>
      </div>

      <div className="grid-2col">
        <ChartCard title="Investimenti Mensili" data={monthlyData}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
            <XAxis dataKey="month" stroke="#8B85A8" style={AXIS_STYLE} />
            <YAxis stroke="#8B85A8" style={AXIS_STYLE} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend />
            <Bar dataKey="invested" name="Investito" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
            <Bar dataKey="value" name="Valore" fill="#C026D3" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ChartCard>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="card__title mb-0">DCA vs Market Price</h3>
            <div style={{ width: '120px' }}>
              <FormInput type="select" value={dcaAsset} onChange={e => setDcaAsset(e.target.value)} options={dcaOptions} />
            </div>
          </div>
          {dcaData.length === 0 ? (
            <div className="no-data">Nessun dato per {dcaAsset}</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dcaData}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="acquisto" stroke="#8B85A8" style={AXIS_STYLE} />
                <YAxis stroke="#8B85A8" style={AXIS_STYLE} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend />
                <Line type="monotone" dataKey="DCA Medio" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Prezzo Market" stroke="#F7931A" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

function ChartCard({ title, data, children }) {
  return (
    <div className="card">
      <h3 className="card__title">{title}</h3>
      {!data || data.length === 0 ? (
        <div className="no-data">Nessun dato — aggiungi acquisti nel Diario</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>{children}</ResponsiveContainer>
      )}
    </div>
  );
}

function buildPortfolioData(dashboard) {
  if (!dashboard?.purchases?.length) return [];
  const { prices, purchases } = dashboard;
  const sorted = [...purchases].sort((a, b) => new Date(a.date) - new Date(b.date));
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const past = sorted.filter(p => p.date <= ds);
    const qtyByAsset = {};
    past.forEach(p => { qtyByAsset[p.asset] = (qtyByAsset[p.asset] || 0) + p.quantity; });
    let value = 0;
    for (const [sym, qty] of Object.entries(qtyByAsset)) {
      value += qty * ((prices[sym] || {}).eur || 0);
    }
    days.push({ date: ds, value: Math.round(value) });
  }
  return days;
}

function buildAllocationData(dashboard, assets) {
  if (!dashboard?.purchases?.length) return [];
  const { prices, purchases } = dashboard;
  const sorted = [...purchases].sort((a, b) => new Date(a.date) - new Date(b.date));
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const past = sorted.filter(p => p.date <= ds);
    const qtyByAsset = {};
    past.forEach(p => { qtyByAsset[p.asset] = (qtyByAsset[p.asset] || 0) + p.quantity; });
    const entry = { date: ds };
    assets.forEach(a => {
      const qty = qtyByAsset[a.symbol] || 0;
      entry[a.symbol] = Math.round(qty * ((prices[a.symbol] || {}).eur || 0));
    });
    days.push(entry);
  }
  return days;
}

function buildMonthlyData(dashboard) {
  if (!dashboard?.purchases?.length) return [];
  const { prices, purchases } = dashboard;
  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  const year = new Date().getFullYear();
  return months.map((month, i) => {
    const ms = `${year}-${String(i + 1).padStart(2, '0')}`;
    const mp = purchases.filter(p => p.date.startsWith(ms));
    const invested = mp.reduce((s, p) => s + p.amount_eur, 0);
    const qtyByAsset = {};
    mp.forEach(p => { qtyByAsset[p.asset] = (qtyByAsset[p.asset] || 0) + p.quantity; });
    let value = 0;
    for (const [sym, qty] of Object.entries(qtyByAsset)) {
      value += qty * ((prices[sym] || {}).eur || 0);
    }
    return { month, invested: Math.round(invested), value: Math.round(value) };
  }).filter(d => d.invested > 0 || d.value > 0);
}

function buildDCAData(dashboard, selectedAsset) {
  if (!dashboard?.purchases?.length || !selectedAsset) return [];
  const assetPurchases = dashboard.purchases
    .filter(p => p.asset === selectedAsset)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  if (!assetPurchases.length) return [];
  const priceInfo = dashboard.prices[selectedAsset] || {};
  let totalInv = 0, totalQty = 0;
  return assetPurchases.map((p, i) => {
    totalInv += p.amount_eur; totalQty += p.quantity;
    return { acquisto: i + 1, 'DCA Medio': Math.round(totalInv / totalQty), 'Prezzo Market': Math.round(priceInfo.eur || 0) };
  });
}
