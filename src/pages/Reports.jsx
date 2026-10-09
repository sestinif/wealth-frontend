import React, { useState, useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import PageHead from '../components/PageHead';
import Tabs from '../components/Tabs';
import Segmented from '../components/Segmented';
import StatRow from '../components/StatRow';
import Money from '../components/Money';
import LedgerRow from '../components/LedgerRow';
import Avatar from '../components/Avatar';
import { PageSkeleton } from '../components/Skeleton';
import { api } from '../api.js';
import { formatEUR, formatQty, formatDay, formatMonth, sortByDate, pctText } from '../utils/format';
import { buildCashflow } from '../utils/cashflow';
import { eurUsdRate } from '../utils/networth';
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
  const [cashflow, setCashflow] = useState(null);
  const [flowBy, setFlowBy] = useState('lifetime');

  useEffect(() => {
    Promise.all([api.getMe(), api.getAssets()])
      .then(([userData, assetsData]) => { setUser(userData); setAssets(assetsData); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Flipping through months fires one request each, and they can come back out
    // of order. Only the answer to the LAST choice may land, or the screen shows
    // a different month from the one selected.
    let stale = false;
    const fetchReport = async () => {
      try {
        if (tab === 'cashflow') {
          const [purchases, bankEntries, prices, dryEvents] = await Promise.all([
            api.getPurchases(), api.getBankEntries(), api.getPrices(), api.getCashEvents().catch(() => []),
          ]);
          if (!stale) setCashflow(buildCashflow(purchases, bankEntries || [], eurUsdRate(prices), dryEvents || []));
          return;
        }
        let data;
        if (tab === 'monthly') data = await api.getMonthlyReport(year, month);
        else if (tab === 'annual') data = await api.getAnnualReport(year);
        else data = await api.getLifetimeReport();
        if (!stale) setReport(data);
      } catch (err) { if (!stale) setError(err.message); }
    };
    fetchReport();
    return () => { stale = true; };
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


  const savedCell = (r) => (!r.hasBank ? '—' : r.saved === 0 ? formatEUR(0) : signedEUR(r.saved));
  const savedTone = (r) => (!r.hasBank || r.saved === 0 ? 'm-muted' : r.saved > 0 ? 'm-up' : 'm-down');

  // Lifetime lists its years, a year lists its months; a row opens that period.
  const flowRow = (r, label) => {
    const open = () => {
      setYear(parseInt(r.key.slice(0, 4)));
      if (r.key.length > 4) { setMonth(parseInt(r.key.slice(5, 7))); setFlowBy('month'); }
      else setFlowBy('year');
    };
    return (
      <button type="button" key={r.key} className="m-table__row m-table__row--flow" onClick={open}>
        <span className="m-table__name">{label}</span>
        <span>{formatEUR(r.invested)}</span>
        <span className={savedTone(r)}>{savedCell(r)}</span>
      </button>
    );
  };

  const cashflowView = (cf) => {
    const none = { invested: 0, saved: 0, hasBank: false };
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const sel = flowBy === 'lifetime' ? cf.total
      : flowBy === 'year' ? cf.years.find(r => r.key === String(year)) || none
      : cf.months.find(r => r.key === monthKey) || none;
    const rows = flowBy === 'lifetime' ? cf.years
      : flowBy === 'year' ? cf.months.filter(r => r.key.startsWith(`${year}-`))
      : [];
    return (
      <>
        <div style={{ paddingTop: 20 }}>
          <Segmented options={[{ key: 'lifetime', label: 'Lifetime' }, { key: 'year', label: 'Year' }, { key: 'month', label: 'Month' }]}
            value={flowBy} onChange={setFlowBy} />
        </div>
        <div style={{ paddingTop: 20 }}>
          <StatRow items={[
            { label: 'Invested', value: <Money value={sel.invested} /> },
            { label: 'Saved', value: sel.hasBank ? <Money value={sel.saved} sign /> : '—', tone: sel.hasBank && sel.saved !== 0 ? (sel.saved > 0 ? 'up' : 'down') : undefined },
          ]} />
        </div>
        {rows.length > 0 && (
          <div className="m-table--flow">
            <div className="m-table__head">
              <span>{flowBy === 'lifetime' ? 'Year' : 'Month'}</span><span>Invested</span><span>Saved</span>
            </div>
            {rows.map(r => flowRow(r, r.key.length > 4 ? formatMonth(`${r.key}-01`) : r.key))}
          </div>
        )}
      </>
    );
  };

  const isFlow = tab === 'cashflow';
  // Cash flow goes back as far as the data does, not just to the first year of the reports.
  const flowYears = cashflow
    ? [...new Set([...cashflow.years.map(r => parseInt(r.key)), new Date().getFullYear(), year])].sort((a, b) => a - b).map(y => ({ value: y, label: String(y) }))
    : yearOptions;
  const showYear = isFlow ? flowBy !== 'lifetime' : tab !== 'lifetime';
  const showMonth = isFlow ? flowBy === 'month' : tab === 'monthly';
  const filters = !showYear ? null : (
    <div style={{ display: 'flex', gap: 14 }}>
      <select className="m-select" aria-label="Year" value={year} onChange={e => setYear(parseInt(e.target.value))}>
        {(isFlow ? flowYears : yearOptions).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {showMonth && (
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
        tabs={[{ key: 'lifetime', label: 'Lifetime' }, { key: 'annual', label: 'Annual' }, { key: 'monthly', label: 'Monthly' }, { key: 'cashflow', label: 'Cash flow' }]}
        value={tab} onChange={setTab} />

      {tab === 'cashflow' ? (cashflow && cashflowView(cashflow)) : report && (
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
