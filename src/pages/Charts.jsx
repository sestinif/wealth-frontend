import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import PageLayout from '../components/PageLayout';
import FormInput from '../components/FormInput';
import { api } from '../api.js';

const TT = { background: '#1a1b24', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', fontSize: '12px' };
const AXIS = { fill: '#55505f', fontSize: 10 };

export default function Charts() {
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dcaAsset, setDcaAsset] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [u, d, a] = await Promise.all([api.getMe(), api.getDashboard(), api.getAssets()]);
        setUser(u); setDashboard(d); setAssets(a);
        if (a.length > 0 && !dcaAsset) setDcaAsset(a[0].symbol);
      } catch (err) {}
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <div className="loading-screen"><div className="loading-logo">W</div><div className="loading-text">CARICAMENTO...</div></div>;
  if (!user) return <div className="loading-screen"><div className="loading-error">Errore nel caricamento</div></div>;

  const portfolioData = buildPortfolio(dashboard);
  const allocData = buildAllocation(dashboard, assets);
  const monthlyData = buildMonthly(dashboard);
  const dcaData = buildDCA(dashboard, dcaAsset);

  return (
    <PageLayout title="Grafici" username={user.username}>
      <div className="grid-2col section-gap animate-in">
        <div className="card">
          <h3 className="card__title">Valore Portfolio — 30 giorni</h3>
          {portfolioData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={portfolioData}>
                <defs>
                  <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="transparent" tick={AXIS} />
                <YAxis stroke="transparent" tick={AXIS} />
                <Tooltip contentStyle={TT} />
                <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={1.5} fill="url(#pg)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="no-data">Nessun dato</div>}
        </div>

        <div className="card">
          <h3 className="card__title">Allocazione per asset</h3>
          {allocData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={allocData}>
                <XAxis dataKey="date" stroke="transparent" tick={AXIS} />
                <YAxis stroke="transparent" tick={AXIS} />
                <Tooltip contentStyle={TT} />
                {assets.map(a => (
                  <Area key={a.symbol} type="monotone" dataKey={a.symbol}
                    stackId="1" stroke={a.color} fill={a.color} fillOpacity={0.35} strokeWidth={1} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="no-data">Nessun dato</div>}
        </div>
      </div>

      <div className="grid-2col animate-in" style={{ animationDelay: '0.05s' }}>
        <div className="card">
          <h3 className="card__title">Investimenti mensili</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barGap={2}>
                <XAxis dataKey="month" stroke="transparent" tick={AXIS} />
                <YAxis stroke="transparent" tick={AXIS} />
                <Tooltip contentStyle={TT} />
                <Bar dataKey="invested" name="Investito" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="value" name="Valore" fill="#a78bfa" radius={[4, 4, 0, 0]} barSize={16} opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="no-data">Nessun dato</div>}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 className="card__title mb-0">DCA vs Market</h3>
            <div style={{ width: 100 }}>
              <FormInput type="select" value={dcaAsset} onChange={e => setDcaAsset(e.target.value)}
                options={assets.map(a => ({ value: a.symbol, label: a.symbol }))} />
            </div>
          </div>
          {dcaData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dcaData}>
                <XAxis dataKey="n" stroke="transparent" tick={AXIS} />
                <YAxis stroke="transparent" tick={AXIS} />
                <Tooltip contentStyle={TT} />
                <Line type="monotone" dataKey="dca" name="DCA Medio" stroke="#7c3aed" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="market" name="Prezzo" stroke="#a78bfa" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="no-data">Nessun dato per {dcaAsset}</div>}
        </div>
      </div>
    </PageLayout>
  );
}

function buildPortfolio(d) {
  if (!d?.purchases?.length) return [];
  const { prices, purchases } = d;
  const s = [...purchases].sort((a, b) => new Date(a.date) - new Date(b.date));
  return Array.from({ length: 30 }, (_, i) => {
    const dt = new Date(); dt.setDate(dt.getDate() - (29 - i));
    const ds = dt.toISOString().split('T')[0];
    const q = {}; s.filter(p => p.date <= ds).forEach(p => { q[p.asset] = (q[p.asset] || 0) + p.quantity; });
    let v = 0; for (const [sym, qty] of Object.entries(q)) v += qty * ((prices[sym] || {}).eur || 0);
    return { date: ds, value: Math.round(v) };
  });
}

function buildAllocation(d, assets) {
  if (!d?.purchases?.length) return [];
  const { prices, purchases } = d;
  const s = [...purchases].sort((a, b) => new Date(a.date) - new Date(b.date));
  return Array.from({ length: 30 }, (_, i) => {
    const dt = new Date(); dt.setDate(dt.getDate() - (29 - i));
    const ds = dt.toISOString().split('T')[0];
    const q = {}; s.filter(p => p.date <= ds).forEach(p => { q[p.asset] = (q[p.asset] || 0) + p.quantity; });
    const e = { date: ds };
    assets.forEach(a => { e[a.symbol] = Math.round((q[a.symbol] || 0) * ((prices[a.symbol] || {}).eur || 0)); });
    return e;
  });
}

function buildMonthly(d) {
  if (!d?.purchases?.length) return [];
  const { prices, purchases } = d;
  const ms = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  const y = new Date().getFullYear();
  return ms.map((m, i) => {
    const k = `${y}-${String(i + 1).padStart(2, '0')}`;
    const mp = purchases.filter(p => p.date.startsWith(k));
    const inv = mp.reduce((s, p) => s + p.amount_eur, 0);
    const q = {}; mp.forEach(p => { q[p.asset] = (q[p.asset] || 0) + p.quantity; });
    let v = 0; for (const [sym, qty] of Object.entries(q)) v += qty * ((prices[sym] || {}).eur || 0);
    return { month: m, invested: Math.round(inv), value: Math.round(v) };
  }).filter(x => x.invested > 0 || x.value > 0);
}

function buildDCA(d, asset) {
  if (!d?.purchases?.length || !asset) return [];
  const ps = d.purchases.filter(p => p.asset === asset).sort((a, b) => new Date(a.date) - new Date(b.date));
  if (!ps.length) return [];
  const pi = d.prices[asset] || {};
  let ti = 0, tq = 0;
  return ps.map((p, i) => {
    ti += p.amount_eur; tq += p.quantity;
    return { n: i + 1, dca: Math.round(ti / tq), market: Math.round(pi.eur || 0) };
  });
}
