import React, { useState, useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import KPICard from '../components/KPICard';
import DataTable from '../components/DataTable';
import AssetBadge from '../components/AssetBadge';
import FormInput from '../components/FormInput';
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
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: String(i + 1) }));

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

  return (
    <PageLayout title="Report" username={user.username} size="md">
      <div className="tab-bar">
        {[['monthly', 'Mensile'], ['annual', 'Annuale'], ['lifetime', 'Lifetime']].map(([key, label]) => (
          <button key={key} className={`btn btn--ghost ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {(tab === 'monthly' || tab === 'annual') && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <FormInput type="select" value={year} onChange={e => setYear(parseInt(e.target.value))} options={yearOptions} />
          {tab === 'monthly' && (
            <FormInput type="select" value={month} onChange={e => setMonth(parseInt(e.target.value))} options={monthOptions} />
          )}
        </div>
      )}

      {report && (
        <>
          <div className="kpi-grid">
            <KPICard label="Investito" value={formatEUR(report.total_invested)} color={['#8B85A8', '#6B63B5']} interactive={false} />
            <KPICard label="Valore Attuale" value={formatEUR(report.total_value)} color={['#8B5CF6', '#C026D3']} interactive={false} />
            <KPICard label="P&L" value={formatPnL(report.pnl)} color={report.pnl >= 0 ? ['#00E676', '#00C853'] : ['#FF5252', '#D32F2F']} subtext={formatPct(report.pnl_pct)} interactive={false} />
          </div>

          <div className="card section-gap">
            <h3 className="card__title">Breakdown per Asset</h3>
            <DataTable columns={assetColumns} data={assetData} />
          </div>

          {report.transactions && report.transactions.length > 0 && (
            <div className="card overflow-auto">
              <h3 className="card__title">Transazioni</h3>
              <DataTable columns={txColumns} data={report.transactions} defaultSort={{ key: 'date', direction: 'desc' }} />
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}
