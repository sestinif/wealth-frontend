import React, { useState, useEffect } from 'react';
import PageLayout from '../components/PageLayout';
import { useToast } from '../components/Toast';
import { PageSkeleton } from '../components/Skeleton';
import { api } from '../api.js';
import DiaryView from './DiaryView';
import { restoredBalance } from '../utils/purchase';
import { formatEUR, formatUSD } from '../utils/format';

// Diary is the pure history view: every purchase and every bank movement.
// All manual entry lives in the Add Movement page (/add).
export default function Diary() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [assets, setAssets] = useState([]);
  const [cashPositions, setCashPositions] = useState([]);
  const [bankEntries, setBankEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userData, purchasesData, assetsData, cashData, entriesData] = await Promise.all([
          api.getMe(), api.getPurchases(), api.getAssets(),
          api.getCashPositions().catch(() => []),
          api.getBankEntries().catch(() => []),
        ]);
        setUser(userData);
        setPurchases(purchasesData);
        setAssets(assetsData);
        setCashPositions(cashData || []);
        setBankEntries(entriesData || []);
      } catch (err) { /* page shows failed state below */ }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    try {
      const p = purchases.find(x => x.id === id);
      await api.deletePurchase(id);
      setPurchases(prev => prev.filter(x => x.id !== id));
      // Restore dry powder if this purchase was funded from a broker (reverses the deduction).
      if (p && p.funded_from && p.funded_amount) {
        const pos = cashPositions.find(x => x.id === p.funded_from);
        if (pos) {
          const cur = (pos.currency || 'EUR').toUpperCase();
          const restored = restoredBalance(pos, p.funded_amount);
          try {
            await api.updateCashPosition(pos.id, pos.label, restored, cur);
            setCashPositions(await api.getCashPositions());
            toast(`Purchase deleted · restored to ${pos.label}`, 'success');
          } catch (e) {
            // The purchase is gone, so the user has to know the broker still shows the old balance.
            const fmt = cur === 'USD' ? formatUSD : formatEUR;
            toast(`Purchase deleted, but ${pos.label} wasn’t updated. Add ${fmt(p.funded_amount)} back by hand.`, 'error');
          }
        } else {
          toast('Purchase deleted. Its broker is no longer in the list, so there was nothing to restore.', 'success');
        }
      } else {
        toast('Purchase deleted', 'success');
      }
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleBankEntryDelete = async (id) => {
    try {
      await api.deleteBankEntry(id);
      setBankEntries(prev => prev.filter(en => en.id !== id));
      toast('Movement deleted', 'success');
    } catch (err) { toast(err.message, 'error'); }
  };

  if (loading) return <PageLayout title="Diary" username="" size="md"><PageSkeleton rows={6} /></PageLayout>;
  if (!user) return <div className="loading-screen"><div className="loading-error">Failed to load</div></div>;

  return (
    <PageLayout title="Diary" username={user.username} size="md">
      <DiaryView purchases={purchases} assets={assets} bankEntries={bankEntries} cashPositions={cashPositions}
        onDeletePurchase={handleDelete} onDeleteBankEntry={handleBankEntryDelete} />
    </PageLayout>
  );
}
