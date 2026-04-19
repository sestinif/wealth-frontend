import React, { useState, useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import DataTable from '../components/DataTable';
import AssetBadge from '../components/AssetBadge';
import FormInput from '../components/FormInput';
import AnimatedNumber from '../components/AnimatedNumber';
import { api } from '../api.js';
import { formatEUR, formatQty, formatPnL, formatPct, formatDate } from '../utils/format';

export default function Reports() {
  const [user, setUser] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('lifetime');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [report, setReport] = useState(null);
  const [showTx, setShowTx] = useState(false);

  useEffect(() => {
    Promise.all([api.getMe(), api.getAssets()])
      .then(([userData, assetsData]) => { setUser(userData); setAssets(assetsData); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        let data;
        if (tab === 'monthly') data = await api.getMonthlyReport(year, month);
        else if (tab === 'annual') data = await api.getAnnualReport(year);
        else data = await api.getLifetimeReport();
        setReport(data);
      } catch (err) { setError(err.message); }
    };
    fetchReport();
  }, [tab, year, month]);

  if (loading) return <div className="loading-screen"><div className="loading-logo">W</div><div className="loading-text">CARICAMENTO...</div></div>;
  if (!user) return <div className="loading-screen"><div className="loading-error">Errore nel caricamento</div></div>;

  const getColor = (sym) => assets.find(a => a.symbol === sym)?.color || '#8B5CF6';
  const getDecimals = (sym) => assets.find(a => a.symbol === sym)?.decimals || 2;

  const yearOptions = Array.from({ length: new Date().getFullYear() - 2023 }, (_, i) => ({
    value: 2024 + i, label: String(2024 + i)
  }));
  const monthOptions = [
    [1, 'Gennaio'], [2, 'Febbraio'], [3, 'Marzo'], [4, 'Aprile'], [5, 'Maggio'], [6, 'Giugno'],
    [7, 'Luglio'], [8, 'Agosto'], [9, 'Settembre'], [10, 'Ottobre'], [11, 'Novembre'], [12, 'Dicembre']
  ].map(([v, l]) => ({ value: v, label: l }));

  const assetColumns = [
    { key: 'asset', label: 'Asset', render: (v) => <AssetBadge asset={v} color={getColor(v)} /> },
    { key: 'invested', label: 'Investito', align: 'right', muted: true, render: v => formatEUR(v) },
    { key: 'value', label: 'Valore', align: 'right', render: v => formatEUR(v) },
    { key: 'qty', label: 'Quantità', align: 'right', muted: true, render: (v, row) => formatQty(v, getDecimals(row.asset)) },
    { key: 'pnl', label: 'P&L', align: 'right', render: v => <span className={v >= 0 ? 'pnl-positive' : 'pnl-negative'}>{formatPnL(v)}</span> },
  ];

  const txColumns = [
    { key: 'date', label: 'Data', sortable: true, render: v => formatDate(v) },
    { key: 'asset', label: 'Asset', render: v => <AssetBadge asset={v} color={getColor(v)} /> },
    { key: 'amount_eur', label: 'Importo', align: 'right', sortable: true, render: v => formatEUR(v) },
    { key: 'quantity', label: 'Quantità', align: 'right', muted: true, render: (v, row) => formatQty(v, getDecimals(row.asset)) },
  ];

  const assetData = report ? Object.entries(report.by_asset).map(([asset, d]) => ({ asset, ...d })) : [];
  const pnlC = report && report.pnl >= 0 ? 'var(--green)' : 'var(--red)';

  const periodLabel = tab === 'monthly'
    ? `${monthOptions.find(m => m.value === month)?.label} ${year}`
    : tab === 'annual' ? `Anno ${year}`
    : 'Lifetime';

  return (
    <PageLayout title="Report" username={user.username} size="md">

      {/* Header */}
      <div className="animate-in" style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4, letterSpacing: '-0.3px' }}>
          Report {periodLabel}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
          Analisi periodica del tuo portfolio
        </div>
      </div>

      {/* Tab + filters */}
      <div className="tab-bar animate-in-1">
        {[['lifetime', 'Lifetime'], ['annual', 'Annuale'], ['monthly', 'Mensile']].map(([key, label]) => (
          <button key={key} className={`btn btn--ghost ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
        {(tab === 'monthly' || tab === 'annual') && (
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
            <div style={{ width: 100 }}>
              <select className="form-input" value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ padding: '7px 12px' }}>
                {yearOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            {tab === 'monthly' && (
              <div style={{ width: 130 }}>
                <select className="form-input" value={month} onChange={e => setMonth(parseInt(e.target.value))} style={{ padding: '7px 12px' }}>
                  {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {report && (
        <>
          {/* Hero stats for the period */}
          <div className="hero-stats animate-in-2">
            <div className="hero-stat">
              <div className="hero-stat__label">Investito nel periodo</div>
              <AnimatedNumber value={report.total_invested} prefix="€ " className="hero-stat__value" style={{ color: 'var(--text-2)' }} />
              <div className="hero-stat__sub hero-stat__sub--placeholder">·</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat__label">Valore Attuale</div>
              <AnimatedNumber value={report.total_value} prefix="€ " className="hero-stat__value" style={{ color: 'var(--text-1)' }} />
              <div className="hero-stat__sub hero-stat__sub--placeholder">·</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat__label">Profitto / Perdita</div>
              <AnimatedNumber value={Math.abs(report.pnl)} prefix={report.pnl >= 0 ? '+€ ' : '-€ '} className="hero-stat__value" style={{ color: pnlC }} />
              <div className="hero-stat__sub" style={{ color: pnlC, opacity: 0.9 }}>{formatPct(report.pnl_pct)}</div>
            </div>
          </div>

          {/* Asset breakdown */}
          <div className="animate-in-3" style={{ marginBottom: 16 }}>
            <div className="section-header">
              <div className="section-header__title">Breakdown per Asset</div>
              <div className="section-header__meta">{assetData.length} asset</div>
            </div>
            <div className="card overflow-auto" style={{ padding: 0 }}>
              <DataTable columns={assetColumns} data={assetData} />
            </div>
          </div>

          {/* Transactions (collapsible) */}
          {report.transactions && report.transactions.length > 0 && (
            <div className="animate-in-4" style={{ marginBottom: 16 }}>
              <div className="section-header">
                <div className="section-header__title">Transazioni del periodo</div>
                <div className="section-header__actions">
                  <span className="section-header__meta">{report.transactions.length} acquisti</span>
                  <button className={`collapse-btn ${showTx ? 'expanded' : ''}`} onClick={() => setShowTx(!showTx)}>
                    {showTx ? 'Nascondi' : 'Mostra'}
                    <span className="collapse-btn__arrow">▼</span>
                  </button>
                </div>
              </div>
              {showTx && (
                <div className="card overflow-auto" style={{ padding: 0 }}>
                  <DataTable columns={txColumns} data={report.transactions} defaultSort={{ key: 'date', direction: 'desc' }} />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}
