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
import { buildCashflow, flowPeriods, BANK_HISTORY_START } from '../utils/cashflow';
import { eurUsdRate } from '../utils/networth';
import { assetColor } from '../utils/marks';

const signedEUR = (v) => `${v >= 0 ? '+' : ''}${formatEUR(v)}`;

// Everything is entered with care from this month on; earlier figures were rebuilt and may be off.
const RELIABLE_FROM = '2026-10';

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
  const [flowBy, setFlowBy] = useState('month');
  const [mercuryOk, setMercuryOk] = useState(true);
  const [mercuryCount, setMercuryCount] = useState(null);

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
          const [purchases, bankEntries, prices, dryEvents, flows] = await Promise.all([
            api.getPurchases(), api.getBankEntries(), api.getPrices(),
            api.getCashEvents().catch(() => []),
            api.getBankFlows(BANK_HISTORY_START).catch(() => ({ available: false, rows: [] })),
          ]);
          if (stale) return;
          setMercuryOk(!!flows?.available);
          setMercuryCount(flows?.available ? (flows.stats?.counted ?? (flows.rows || []).length) : null);
          setCashflow(buildCashflow({
            purchases, bankEntries: bankEntries || [], bankFlows: flows?.rows || [], dryEvents: dryEvents || [], rate: eurUsdRate(prices),
          }));
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


  // Cash flow: two figures for the chosen month or year, over the whole history.
  const periods = flowPeriods(cashflow || { years: [] });
  const flowYear = periods.years.includes(year) ? year : periods.years[periods.years.length - 1];
  const flowMonths = periods.monthsOf(flowYear);
  const flowMonth = flowMonths.includes(month) ? month : flowMonths[flowMonths.length - 1];

  const cashflowView = (cf) => {
    const byYear = flowBy === 'year';
    const key = byYear ? String(flowYear) : `${flowYear}-${String(flowMonth).padStart(2, '0')}`;
    const sel = (byYear ? cf.years : cf.months).find(r => r.key === key) || { saved: 0, invested: 0 };
    return (
      <>
        <div className="m-flow__head">
          <div className="m-flow__period">{byYear ? flowYear : formatMonth(`${key}-01`)}</div>
          <div className="m-flow__seg">
            <Segmented options={[{ key: 'month', label: 'Month' }, { key: 'year', label: 'Year' }]} value={flowBy} onChange={setFlowBy} />
          </div>
        </div>
        <div className="m-flow__figures">
          <div className="m-stat">
            <div className="m-stat__label">Saved</div>
            <div className={`m-stat__value ${sel.saved > 0 ? 'm-stat__value--up' : sel.saved < 0 ? 'm-stat__value--down' : ''}`}><Money value={sel.saved} /></div>
          </div>
          <div className="m-flow__plus" aria-hidden="true">+</div>
          <div className="m-stat">
            <div className="m-stat__label">Invested</div>
            <div className="m-stat__value"><Money value={sel.invested} /></div>
          </div>
        </div>
        <div className="m-flow__note">
          {mercuryOk
            ? mercuryCount !== null && <div>Mercury: {mercuryCount} {mercuryCount === 1 ? 'movement' : 'movements'} read, whole history.</div>
            : <div>Mercury did not answer, so Saved is missing its movements. Reload to try again.</div>}
        </div>
      </>
    );
  };

  const isFlow = tab === 'cashflow';
  // The period on screen ends before RELIABLE_FROM (a whole year, or a single month).
  const shownYear = isFlow ? flowYear : year;
  const shownMonth = isFlow ? flowMonth : month;
  const yearOnly = isFlow ? flowBy === 'year' : tab === 'annual';
  const oldPeriod = tab !== 'lifetime' && (yearOnly
    ? shownYear < parseInt(RELIABLE_FROM.slice(0, 4))
    : `${shownYear}-${String(shownMonth).padStart(2, '0')}` < RELIABLE_FROM);
  const oldNotice = oldPeriod && (
    <div className="m-notice" role="note">
      <span className="m-notice__dot" />
      These figures may be inaccurate. Everything is tracked correctly from {formatMonth(`${RELIABLE_FROM}-01`)}.
    </div>
  );
  const showYear = isFlow || tab !== 'lifetime';
  const showMonth = isFlow ? flowBy === 'month' : tab === 'monthly';
  const yearChoices = isFlow ? periods.years.map(y => ({ value: y, label: String(y) })) : yearOptions;
  const monthChoices = isFlow ? monthOptions.filter(o => flowMonths.includes(o.value)) : monthOptions;
  const filters = !showYear ? null : (
    <div style={{ display: 'flex', gap: 14 }}>
      <select className="m-select" aria-label="Year" value={isFlow ? flowYear : year} onChange={e => setYear(parseInt(e.target.value))}>
        {yearChoices.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {showMonth && (
        <select className="m-select" aria-label="Month" value={isFlow ? flowMonth : month} onChange={e => setMonth(parseInt(e.target.value))}>
          {monthChoices.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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

      {oldNotice}

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
