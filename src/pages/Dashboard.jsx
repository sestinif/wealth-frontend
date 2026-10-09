import React, { useState, useEffect, useRef } from 'react';
import PageLayout from '../components/PageLayout';
import { DashboardSkeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { api } from '../api.js';
import { getDisplayName } from '../utils/user';
import { computeNetWorth } from '../utils/networth';
import DashboardView from './DashboardView';

export default function Dashboard() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [networth, setNetworth] = useState(null);
  const [cashPositions, setCashPositions] = useState([]);
  const [history, setHistory] = useState([]);
  const snapshotDone = useRef(false);
  const [user, setUser] = useState(null);
  const [assets, setAssets] = useState([]);
  const [marketInfo, setMarketInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [cacheAge, setCacheAge] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    try {
      const [d, u, a, s, nw, cp] = await Promise.all([
        api.getDashboard(), api.getMe(), api.getAssets(),
        api.getPricesStatus().catch(() => ({})),
        api.getNetWorth().catch(() => null),
        api.getCashPositions().catch(() => null),
      ]);
      // nw / cp are null when THIS round's request failed. Keep what the last good
      // round showed: replacing it dropped the bank balances (or the dry powder)
      // out of the total for a minute, and the number jumped down and back.
      setData(d); setUser(u); setAssets(a);
      setNetworth(prev => nw ?? prev);
      setCashPositions(prev => cp ?? prev);
      setCacheAge(s?.cache_age_seconds);
      api.getMarketInfo().then(setMarketInfo).catch(() => {});
      api.getNetworthHistory().then(h => setHistory(h || [])).catch(() => {});

      // Record today's net-worth snapshot once per load (backend upserts per day).
      // Only when every part of the total arrived: with the bank balances or the
      // dry powder missing, the day was saved too low and the chart showed a dip.
      // Not marked done until it is saved, so the next refresh tries again.
      if (!snapshotDone.current && nw && cp) {
        try {
          const n = computeNetWorth({ summary: d.summary, assets: a, prices: d.prices || {}, networth: nw, cashPositions: cp });
          await api.postNetworthSnapshot({ total: n.total, portfolio: n.portfolio, cash: n.cash, dry: n.dry });
          snapshotDone.current = true;
          api.getNetworthHistory().then(h => setHistory(h || [])).catch(() => {});
        } catch (e) { /* best-effort */ }
      }
    } catch (err) {}
  };

  const forceRefresh = async () => {
    setRefreshing(true);
    try { await api.refreshPrices(); await refresh(); toast('Prices updated', 'success'); }
    catch (err) { toast('Error: ' + err.message, 'error'); }
    finally { setRefreshing(false); }
  };

  useEffect(() => {
    const init = async () => { await refresh(); setLoading(false); };
    init();
    const iv = setInterval(refresh, 60000);
    return () => clearInterval(iv);
  }, []);

  const handleToggleTracking = async (symbol, currentValue) => {
    try {
      await api.updateAssetTracking(symbol, !currentValue);
      await refresh();
      toast(`${symbol} ${!currentValue ? 'included in totals' : 'excluded from totals'}`, 'success');
    } catch (err) { toast('Error: ' + err.message, 'error'); }
  };

  if (loading) return <PageLayout title="Dashboard" username=""><DashboardSkeleton /></PageLayout>;
  if (!data || !user) return <div className="loading-screen"><div className="loading-error">Failed to load</div></div>;

  return (
    <PageLayout title="Dashboard" username={user.username}>
      <DashboardView displayName={getDisplayName(user.username)} data={data} assets={assets}
        networth={networth} cashPositions={cashPositions} history={history} marketInfo={marketInfo}
        cacheAge={cacheAge} refreshing={refreshing} onRefresh={forceRefresh} onToggleTracking={handleToggleTracking} />
    </PageLayout>
  );
}
