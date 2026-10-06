// Pure net-worth maths, shared by the Dashboard view and the daily snapshot.

export function eurUsdRate(prices = {}) {
  for (const sym of Object.keys(prices)) {
    const p = prices[sym];
    if (p?.eur > 0 && p?.usd > 0) return p.usd / p.eur;
  }
  return null;
}

// USD → EUR with the derived rate. Without a rate (prices unavailable) the
// amount counts at face value, as the app has always done.
export function toEur(amount, currency, rate) {
  const n = Number(amount) || 0;
  return (currency || 'EUR').toUpperCase() === 'USD' && rate ? n / rate : n;
}

const isCrypto = (a) => a.asset_type === 'crypto' || a.asset_type === 'dex_token';

export function computeNetWorth({ summary, assets = [], prices = {}, networth, cashPositions = [] }) {
  const by = summary?.by_asset || {};
  const rate = eurUsdRate(prices);
  const held = assets.filter(a => by[a.symbol]);
  const mainAssets = held.filter(a => by[a.symbol].include_in_totals !== false);
  const specAssets = held.filter(a => by[a.symbol].include_in_totals === false);
  const valueOf = (a) => by[a.symbol]?.value || 0;
  const sum = (list) => list.reduce((s, a) => s + valueOf(a), 0);
  const cryptoAssets = mainAssets.filter(isCrypto);
  const stockAssets = mainAssets.filter(a => a.asset_type === 'stock_etf');
  const accounts = networth?.external_accounts || [];
  const cash = accounts.reduce((s, acc) => s + toEur(acc.balance, acc.currency, rate), 0);
  const dry = (cashPositions || []).reduce((s, p) => s + toEur(p.amount_eur, p.currency, rate), 0);
  const portfolio = sum(mainAssets);
  return {
    rate, mainAssets, specAssets, cryptoAssets, stockAssets, accounts,
    crypto: sum(cryptoAssets), stock: sum(stockAssets), cash, dry,
    portfolio, total: portfolio + cash + dry,
  };
}

// Last 30 days of the portfolio, each day's holdings valued at today's prices.
// Only a fallback while the recorded net-worth history is still short.
export function portfolioSeries30d(purchases = [], prices = {}, assets = [], today = new Date()) {
  if (!purchases.length) return [];
  const assetMap = Object.fromEntries(assets.map(a => [a.symbol, a]));
  const sorted = [...purchases].sort((a, b) => new Date(a.date) - new Date(b.date));
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const ds = d.toISOString().split('T')[0];
    const qty = {};
    sorted.filter(p => String(p.date).slice(0, 10) <= ds).forEach(p => { qty[p.asset] = (qty[p.asset] || 0) + p.quantity; });
    let total = 0;
    for (const [symbol, q] of Object.entries(qty)) {
      const a = assetMap[symbol];
      if (a && a.include_in_totals === false) continue;
      total += q * ((prices[symbol] || {}).eur || 0);
    }
    days.push({ date: ds, value: Math.round(total) });
  }
  return days;
}

export const PERIODS = [
  ['1W', 7, 'last 7 days'],
  ['1M', 30, 'last 30 days'],
  ['1Y', 365, 'last year'],
  ['All', 100000, 'all time'],
];

// history: [{ date: 'YYYY-MM-DD', total }]. fallback: [{ date, value }].
export function periodSeries(history = [], fallback = [], period = '1M', today = new Date()) {
  const [, days, label] = PERIODS.find(p => p[0] === period) || PERIODS[1];
  const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const hist = history.filter(h => h.date >= cutoffStr).map(h => ({ date: h.date, value: h.total || 0 }));
  const usingHistory = hist.length >= 2;
  const series = usingHistory ? hist : fallback;
  const first = series.find(p => p.value > 0)?.value ?? 0;
  const last = series.length ? series[series.length - 1].value : 0;
  return {
    series, usingHistory,
    delta: last - first,
    deltaPct: first > 0 ? ((last - first) / first) * 100 : 0,
    label: usingHistory ? label : 'portfolio, last 30 days',
  };
}
