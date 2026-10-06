// Pure helpers for the Diary: one ledger out of purchases and bank movements.

const dayOf = (d) => String(d || '').slice(0, 10);
const cents = (n) => Math.round(n * 100) / 100;

export function buildLedger(purchases = [], bankEntries = []) {
  const rows = [
    ...purchases.map(p => ({ kind: 'purchase', id: `p-${p.id}`, date: dayOf(p.date), item: p })),
    ...bankEntries.map(b => ({ kind: 'bank', id: `b-${b.id}`, date: dayOf(b.date), item: b })),
  ];
  // Newest first. The sort is stable, so on the same day purchases stay ahead of bank rows.
  return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function filterLedger(rows, { tab = 'all', asset = 'ALL' } = {}) {
  if (tab === 'bank') return rows.filter(r => r.kind === 'bank');
  const byTab = tab === 'purchases' ? rows.filter(r => r.kind === 'purchase') : rows;
  if (asset === 'ALL') return byTab;
  return byTab.filter(r => r.kind === 'purchase' && r.item.asset === asset);
}

// Rows must already be sorted newest first (buildLedger does it).
export function groupByMonth(rows) {
  const groups = [];
  for (const r of rows) {
    const key = r.date.slice(0, 7);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) { g = { key, invested: 0, rows: [] }; groups.push(g); }
    g.rows.push(r);
    if (r.kind === 'purchase') g.invested = cents(g.invested + (Number(r.item.amount_eur) || 0));
  }
  return groups;
}

export function ledgerStats(purchases = []) {
  const invested = cents(purchases.reduce((s, p) => s + (Number(p.amount_eur) || 0), 0));
  const lastDate = purchases.reduce((m, p) => (dayOf(p.date) > m ? dayOf(p.date) : m), '');
  return { invested, count: purchases.length, lastDate: lastDate || null };
}
