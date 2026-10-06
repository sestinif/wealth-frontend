// Sample data for the dev-only preview page. Shapes mirror the API.

export const assets = [
  { symbol: 'VUAA', name: 'Vanguard FTSE All-World UCITS ETF', asset_type: 'stock_etf', color: '#00BCD4', decimals: 4 },
  { symbol: 'BTC', name: 'Bitcoin', asset_type: 'crypto', color: '#F7931A', decimals: 8 },
  { symbol: 'AERO', name: 'Aerodrome Finance', asset_type: 'crypto', color: '#2c3ae2', decimals: 2 },
  { symbol: 'BRETT', name: 'Brett', asset_type: 'crypto', color: '#0ea5e9', decimals: 2, include_in_totals: false },
];

export const purchases = [
  { id: 'p1', date: '2026-09-11', asset: 'BTC', quantity: 0.00754148, price_eur: 66300, amount_eur: 500, notes: '' },
  { id: 'p2', date: '2026-06-27', asset: 'BTC', quantity: 0.01325678, price_eur: 52800.5, amount_eur: 700, notes: 'Dip' },
  { id: 'p3', date: '2026-06-25', asset: 'VUAA', quantity: 6.0002777, price_eur: 108.03, amount_eur: 648.21, notes: '', funded_from: 'c1', funded_amount: 648.21 },
  { id: 'p4', date: '2026-03-02', asset: 'AERO', quantity: 1601.65316232, price_eur: 0.744617, amount_eur: 1192.62, notes: '' },
  { id: 'p5', date: '2026-03-02', asset: 'BRETT', quantity: 32944.08850814, price_eur: 0.066434, amount_eur: 2188.6, notes: '' },
];

export const bankEntries = [
  { id: 1, date: '2026-10-05', bank: 'Relay', amount: 1000, currency: 'USD', note: '' },
  { id: 2, date: '2026-09-10', bank: 'Relay', amount: 3500, currency: 'USD', note: 'Client invoice' },
  { id: 3, date: '2026-06-26', bank: 'Relay', amount: -420.5, currency: 'USD', note: 'Software' },
];

export const cashPositions = [{ id: 'c1', label: 'Degiro', amount_eur: 250, currency: 'EUR' }];

export const dashboard = {
  purchases,
  prices: {
    BTC: { eur: 76000, usd: 85120 },
    VUAA: { eur: 134.34, usd: null },
    AERO: { eur: 0.7474, usd: 0.8371 },
    BRETT: { eur: 0.0051, usd: 0.0057 },
  },
  summary: {
    total_invested: 3040.83, pnl: 543, n_purchases: 5,
    spec_value: 168.01, spec_pnl: -2020.59, spec_pnl_pct: -92.32,
    by_asset: {
      VUAA: { qty: 6.0002777, value: 806.08, invested: 648.21, pnl: 157.87, avg_price: 108.03, include_in_totals: true },
      BTC: { qty: 0.02079826, value: 1580.67, invested: 1200, pnl: 380.67, avg_price: 57697.13, avg_price_usd: 64620.79, include_in_totals: true },
      AERO: { qty: 1601.65316232, value: 1197.08, invested: 1192.62, pnl: 4.46, avg_price: 0.744617, avg_price_usd: 0.833971, include_in_totals: true },
      BRETT: { qty: 32944.08850814, value: 168.01, invested: 2188.6, pnl: -2020.59, avg_price: 0.066434, avg_price_usd: 0.074406, include_in_totals: false },
    },
  },
};

export const networth = {
  external_accounts: [
    { source: 'mercury', name: 'Mercury Checking ••1234', currency: 'USD', balance: 28000 },
    { source: 'ledger', name: 'Relay', currency: 'USD', balance: 5600 },
  ],
};

// 60 daily points rising from about 31,000 to about 34,400, with a dip.
export const history = Array.from({ length: 60 }, (_, i) => {
  const d = new Date('2026-10-06T00:00:00Z'); d.setUTCDate(d.getUTCDate() - (59 - i));
  const wobble = Math.sin(i / 4) * 350 - (i > 20 && i < 28 ? 900 : 0);
  return { date: d.toISOString().slice(0, 10), total: Math.round(31000 + i * 58 + wobble), portfolio: Math.round(3000 + i * 9.7 + wobble / 4) };
});

export const marketInfo = {
  BTC: { change_24h: 1.8, change_7d: -2.4, ath_usd: 126000, ath_change_pct: -32.4, market_cap_usd: 1.7e12, rank: 1 },
  AERO: { change_24h: -3.1, change_7d: 6.2, ath_usd: 2.31, ath_change_pct: -63.8, market_cap_usd: 7.4e8, rank: 142 },
  BRETT: { change_24h: 0.4, change_7d: -9.9, ath_usd: 0.23, ath_change_pct: -97.5, market_cap_usd: 5.6e7, rank: 780 },
};

export const me = { username: 'federico', email: 'federico@example.com', created_at: '2024-03-01T10:00:00Z' };

const reportOf = (rows) => {
  const by_asset = {};
  rows.forEach(p => {
    const d = dashboard.summary.by_asset[p.asset];
    const share = p.quantity / d.qty;
    const cur = by_asset[p.asset] || { invested: 0, value: 0, qty: 0, pnl: 0 };
    cur.invested += p.amount_eur; cur.qty += p.quantity; cur.value += d.value * share;
    cur.pnl = cur.value - cur.invested;
    by_asset[p.asset] = cur;
  });
  const total_invested = rows.reduce((s, p) => s + p.amount_eur, 0);
  const total_value = Object.values(by_asset).reduce((s, d) => s + d.value, 0);
  const pnl = total_value - total_invested;
  return { total_invested, total_value, pnl, pnl_pct: total_invested > 0 ? (pnl / total_invested) * 100 : 0, by_asset, transactions: rows };
};
export const reports = {
  lifetime: reportOf(purchases),
  annual: reportOf(purchases.filter(p => p.date.startsWith('2026'))),
  monthly: reportOf(purchases.filter(p => p.date.startsWith('2026-06'))),
};

export const searchResults = [
  { symbol: 'ETH', name: 'Ethereum', asset_type: 'crypto', coingecko_id: 'ethereum', price_usd: 2700.81, thumb: '' },
  { symbol: 'SOL', name: 'Solana', asset_type: 'crypto', coingecko_id: 'solana', price_usd: 119.99, thumb: '' },
];
