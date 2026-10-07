import React, { useState, useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import PageHead from '../components/PageHead';
import Tabs from '../components/Tabs';
import StatRow from '../components/StatRow';
import Money from '../components/Money';
import LedgerRow from '../components/LedgerRow';
import Avatar from '../components/Avatar';
import { PageSkeleton } from '../components/Skeleton';
import { api } from '../api.js';
import { formatEUR, formatQty, formatDay, sortByDate, pctText } from '../utils/format';
import { assetColor } from '../utils/marks';

const signedEUR = (v) => `${v >= 0 ? '+' : ''}${formatEUR(v)}`;

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

  if (loading) return <PageLayout title="Report" username="" size="md"><PageSkeleton rows={6} /></PageLayout>;
  if (!user) return <div className="loading-screen"><div className="loading-error">Failed to load</div></div>;

  const getDecimals = (sym) => assets.find(a => a.symbol === sym)?.decimals || 2;
  const getName = (sym) => assets.find(a => a.symbol === sym)?.name || sym;
  const getColor = (sym) => assetColor(assets.find(a => a.symbol === sym), sym);

  const yearOptions = Array.from({ length: new Date().getFullYear() - 2023 }, (_, i) => ({
    value: 2024 + i, label: String(2024 + i)
  }));
  const monthOptions = [
    [1, 'January'], [2, 'February'], [3, 'March'], [4, 'April'], [5, 'May'], [6, 'June'],
    [7, 'July'], [8, 'August'], [9, 'September'], [10, 'October'], [11, 'November'], [12, 'December']
  ].map(([v, l]) => ({ value: v, label: l }));

  const assetData = report
    ? Object.entries(report.by_asset || {}).map(([asset, d]) => ({ asset, ...d })).sort((a, b) => b.value - a.value)
    : [];
  const transactions = report?.transactions ? sortByDate(report.transactions, 'date', 'desc') : [];

  const breakdownRow = (d) => {
    const profitPct = d.invested > 0 ? (d.value / d.invested - 1) * 100 : 0;
    const tone = d.pnl >= 0 ? 'm-up' : 'm-down';
    return (
      <div key={d.asset} className="m-table__row m-table__row--static">
        <span className="m-table__name m-table__name--mark">
          <Avatar asset={d.asset} color={getColor(d.asset)} />
          <span className="m-row__main">
            <span className="m-row__title">{getName(d.asset)}</span>
            <span className="m-table__sub">{formatQty(d.qty, getDecimals(d.asset))} {d.asset}</span>
          </span>
        </span>
        <span className="m-table__price m-muted">{formatEUR(d.invested)}</span>
        <span>
          {formatEUR(d.value)}
          <span className={`m-table__sub m-table__phone ${tone}`}>{signedEUR(d.pnl)}</span>
        </span>
        <span className="m-table__profit">
          <span className={tone}>{signedEUR(d.pnl)}</span>
          <span className="m-table__sub">{pctText(profitPct)}</span>
        </span>
      </div>
    );
  };

  const filters = tab === 'lifetime' ? null : (
    <div style={{ display: 'flex', gap: 14 }}>
      <select className="m-select" aria-label="Year" value={year} onChange={e => setYear(parseInt(e.target.value))}>
        {yearOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {tab === 'monthly' && (
        <select className="m-select" aria-label="Month" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
          {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
    </div>
  );

  return (
    <PageLayout title="Report" username={user.username} size="md">
      <PageHead title="Reports">{filters}</PageHead>

      <Tabs
        tabs={[{ key: 'lifetime', label: 'Lifetime' }, { key: 'annual', label: 'Annual' }, { key: 'monthly', label: 'Monthly' }]}
        value={tab} onChange={setTab} />

      {report && (
        <>
          <div style={{ paddingTop: 20 }}>
            <StatRow items={[
              { label: 'Invested', value: <Money value={report.total_invested} /> },
              { label: 'Current value', value: <Money value={report.total_value} /> },
              { label: `Profit · ${pctText(report.pnl_pct)}`, value: <Money value={report.pnl} sign />, tone: report.pnl >= 0 ? 'up' : 'down' },
            ]} />
          </div>

          {assetData.length === 0 ? (
            <div className="m-empty">Nothing in this period</div>
          ) : (
            <>
              <div className="m-table__head">
                <span>Breakdown by asset</span><span>Invested</span><span>Value</span><span>Profit</span>
              </div>
              {assetData.map(breakdownRow)}
            </>
          )}

          {transactions.length > 0 && (
            <>
              <div className="m-section">
                <span>Transactions in period · {transactions.length}</span>
                <button type="button" className="m-link" onClick={() => setShowTx(!showTx)}>{showTx ? 'Hide' : 'Show'}</button>
              </div>
              {showTx && transactions.map((p, i) => (
                <LedgerRow key={p.id ?? i} date={formatDay(p.date)} avatar={<Avatar asset={p.asset} color={getColor(p.asset)} />}
                  title={getName(p.asset)} sub={`${formatQty(p.quantity, getDecimals(p.asset))} ${p.asset}`}
                  amount={formatEUR(p.amount_eur)} />
              ))}
            </>
          )}
        </>
      )}
    </PageLayout>
  );
}
