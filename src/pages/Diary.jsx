import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import AssetBadge from '../components/AssetBadge';
import { useToast } from '../components/Toast';
import { PageSkeleton } from '../components/Skeleton';
import { api } from '../api.js';
import { formatEUR, formatUSD, formatQty, formatDate } from '../utils/format';

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
  const [filterAsset, setFilterAsset] = useState('ALL');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [beDelId, setBeDelId] = useState(null);

  const getDecimals = (sym) => assets.find(a => a.symbol === sym)?.decimals || 2;
  const getColor = (sym) => assets.find(a => a.symbol === sym)?.color || '#8B7BFF';

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
      setDeleteConfirm(null);
      // Restore dry powder if this purchase was funded from a broker (reverses the deduction).
      if (p && p.funded_from && p.funded_amount) {
        const pos = cashPositions.find(x => x.id === p.funded_from);
        if (pos) {
          const cur = (pos.currency || 'EUR').toUpperCase();
          const restored = (Number(pos.amount_eur) || 0) + Number(p.funded_amount);
          try {
            await api.updateCashPosition(pos.id, pos.label, Number(restored.toFixed(2)), cur);
            setCashPositions(await api.getCashPositions());
            toast(`Restored to ${pos.label}`, 'success');
          } catch (e) { /* best-effort */ }
        }
      } else {
        toast('Purchase deleted', 'success');
      }
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleBankEntryDelete = async (id) => {
    try {
      await api.deleteBankEntry(id);
      setBeDelId(null);
      setBankEntries(prev => prev.filter(en => en.id !== id));
      toast('Movement deleted', 'success');
    } catch (err) { toast(err.message, 'error'); }
  };

  if (loading) return <PageLayout title="Diary" username="" size="md"><PageSkeleton rows={6} /></PageLayout>;
  if (!user) return <div className="loading-screen"><div className="loading-error">Failed to load</div></div>;

  const filteredPurchases = filterAsset === 'ALL' ? purchases : purchases.filter(p => p.asset === filterAsset);
  const filterButtons = ['ALL', ...assets.map(a => a.symbol)];

  // Hard-grid registro: rows grouped under month headers, newest month first.
  const monthLabel = (ds) => new Date(ds).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();
  const monthKey = (ds) => String(ds || '').slice(0, 7);
  const groupByMonth = (rows, dateOf) => {
    const groups = new Map();
    [...rows].sort((a, b) => new Date(dateOf(b)) - new Date(dateOf(a))).forEach(r => {
      const k = monthKey(dateOf(r));
      if (!groups.has(k)) groups.set(k, { key: k, label: monthLabel(dateOf(r)), rows: [] });
      groups.get(k).rows.push(r);
    });
    return [...groups.values()];
  };
  const purchaseGroups = groupByMonth(filteredPurchases, p => p.date);
  const bankGroups = groupByMonth(bankEntries, en => en.date);

  return (
    <PageLayout title="Diary" username={user.username} size="md">

      {/* Header */}
      <div className="page-head page-head--row animate-in">
        <div>
          <div className="page-head__title">Diary</div>
          <div className="page-head__sub">{purchases.length} transactions · {formatEUR(purchases.reduce((s, p) => s + (p.amount_eur || 0), 0))} invested</div>
        </div>
        <Link to="/add" className="btn btn--primary btn--sm page-head__cta">+ Add Movement</Link>
      </div>

      {/* === PURCHASES === */}
      <div className="animate-in-1">
        <div className="section-header">
          <div className="section-header__title">Purchases · {filteredPurchases.length}</div>
          <div className="section-header__actions">
            <div className="filter-bar">
              {filterButtons.map(f => (
                <button key={f} className={`btn btn--ghost btn--sm ${filterAsset === f ? 'active' : ''}`} onClick={() => setFilterAsset(f)}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="panel panel--flush" style={{ padding: '6px 0' }}>
          {filteredPurchases.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No transactions yet</div>
          ) : (
            purchaseGroups.map(g => (
              <React.Fragment key={g.key}>
                <div className="month-head">
                  <span className="month-head__label">{g.label}</span>
                  <span className="month-head__total">{formatEUR(g.rows.reduce((s, p) => s + (p.amount_eur || 0), 0))} invested</span>
                </div>
                {g.rows.map(p => (
                  <div key={p.id} className="tx-row">
                    <AssetBadge asset={p.asset} color={getColor(p.asset)} />
                    <span className="tx-row__date">{formatDate(p.date)}</span>
                    <span className="tx-row__detail">
                      {formatQty(p.quantity, getDecimals(p.asset))} {p.asset} @ {formatEUR(p.price_eur)}
                      {(() => { const l = cashPositions.find(x => x.id === p.funded_from)?.label; return l ? ` · from ${l}` : ''; })()}
                    </span>
                    <span className="tx-row__amount">{formatEUR(p.amount_eur)}</span>
                    <div className="tx-row__actions">
                      {deleteConfirm === p.id ? (
                        <div className="delete-actions">
                          <button className="btn btn--danger btn--sm" onClick={() => handleDelete(p.id)}>Yes</button>
                          <button className="btn btn--ghost btn--sm" onClick={() => setDeleteConfirm(null)}>No</button>
                        </div>
                      ) : (
                        <button className="btn btn--ghost btn--sm" onClick={() => setDeleteConfirm(p.id)}>Delete</button>
                      )}
                    </div>
                  </div>
                ))}
              </React.Fragment>
            ))
          )}
        </div>
      </div>

      {/* === BANK MOVEMENTS === */}
      <div className="animate-in-2" style={{ marginTop: 24 }}>
        <div className="section-header">
          <div className="section-header__title">Bank Movements · {bankEntries.length}</div>
        </div>
        <div className="panel panel--flush" style={{ padding: '6px 0' }}>
          {bankEntries.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>No bank movements yet</div>
          ) : (
            bankGroups.map(g => (
              <React.Fragment key={g.key}>
                <div className="month-head">
                  <span className="month-head__label">{g.label}</span>
                </div>
                {g.rows.map(en => {
                  const enFmt = ((en.currency || 'USD').toUpperCase() === 'USD') ? formatUSD : formatEUR;
                  const isIn = Number(en.amount) >= 0;
                  return (
                    <div key={en.id} className="tx-row">
                      <span className="tx-row__label">{en.bank}</span>
                      <span className="tx-row__date">{formatDate(en.date)}</span>
                      <span className="tx-row__detail">{en.note || ''}</span>
                      <span className={`tx-row__amount ${isIn ? 'tx-row__amount--in' : 'tx-row__amount--out'}`}>
                        {isIn ? '+' : '−'}{enFmt(Math.abs(Number(en.amount) || 0))}
                      </span>
                      <div className="tx-row__actions">
                        <button type="button" className="cash-entry__del"
                          onClick={() => beDelId === en.id ? handleBankEntryDelete(en.id) : setBeDelId(en.id)}>
                          {beDelId === en.id ? 'Sure?' : '×'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))
          )}
        </div>
      </div>
    </PageLayout>
  );
}
