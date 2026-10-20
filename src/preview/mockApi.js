// Dev-only: swaps the methods of the real `api` object for fixture-backed ones,
// so the real pages render in /preview.html without a login or a backend.
import * as fx from './fixtures';

const ok = (value) => () => Promise.resolve(value);
let nextId = 1000;


// Synthetic daily closes for the preview: a seeded random walk bent so it ends on `end`.
function synth(seed, days, start, end, vol, skipWeekends = false) {
  let a = seed >>> 0;
  const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const out = [];
  const now = new Date();
  let level = 0;
  const raw = [];
  for (let i = days; i >= 1; i--) {
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - i));
    if (skipWeekends && (d.getUTCDay() === 0 || d.getUTCDay() === 6)) continue;
    level += (rnd() - 0.48) * vol;
    raw.push([d.toISOString().slice(0, 10), level]);
  }
  const lastLevel = raw[raw.length - 1][1];
  const g = Math.log(end / start);
  raw.forEach(([day, lv], i) => {
    const bend = g * (i / (raw.length - 1)) - (lastLevel * (i / (raw.length - 1)));
    out.push([day, Number((start * Math.exp(lv + bend)).toPrecision(8))]);
  });
  return out;
}

export function installMockApi(api) {
  const state = {
    purchases: [...fx.purchases],
    bankEntries: [...fx.bankEntries],
    cashPositions: [...fx.cashPositions],
    assets: [...fx.assets],
  };
  Object.assign(api, {
    getMe: ok(fx.me),
    getPrices: ok(fx.dashboard.prices),
    getPricesStatus: ok({ cache_age_seconds: 240 }),
    refreshPrices: ok({}),
    getDashboard: () => Promise.resolve({ ...fx.dashboard, purchases: state.purchases }),
    getNetWorth: ok(fx.networth),
    getNetworthHistory: ok(fx.history),
    getPriceHistory: ok({
      as_of: new Date().toISOString().slice(0, 10), complete: true, missing: [],
      assets: {
        BTC: { points: synth(11, 730, 47000, 75500, 0.03) },
        AERO: { points: synth(23, 727, 1.1, 0.74, 0.045) },
        VUAA: { points: synth(37, 457, 108, 133.5, 0.012, true) },
      },
    }),
    postNetworthSnapshot: ok({}),
    getMarketInfo: ok(fx.marketInfo),
    getAssets: () => Promise.resolve(state.assets),
    getPurchases: () => Promise.resolve(state.purchases),
    getCashPositions: () => Promise.resolve(state.cashPositions),
    getBankEntries: () => Promise.resolve(state.bankEntries),
    getCashEvents: () => Promise.resolve([
      { date: '2026-10-09', delta: 250, currency: 'EUR', opening: true, kind: 'manual' },
      { date: '2026-09-02', delta: 2000, currency: 'EUR', opening: false, kind: 'manual' },
      { date: '2026-10-10', delta: -1500, currency: 'EUR', opening: false, kind: 'purchase' },
    ]),
    getBankFlows: () => Promise.resolve({ available: true, stats: { accounts: 2, seen: 2, counted: 2 }, rows: [
      { date: '2026-09-15', amount: 4000, currency: 'USD', amount_eur: 3443.53 },
      { date: '2026-10-03', amount: 2500, currency: 'USD', amount_eur: 2231.35 },
    ] }),
    getLifetimeReport: ok(fx.reports.lifetime),
    getAnnualReport: ok(fx.reports.annual),
    getMonthlyReport: ok(fx.reports.monthly),
    searchAssets: ok(fx.searchResults),
    getHistoricalPrice: (asset, ts) => Promise.resolve({ eur: 71922.48, usd: 80615.48 }),
    addPurchase: (date, asset, amount_eur, price_eur, notes = '', priceUsd = 0, fundedFrom = null, fundedAmount = 0, quantity = null) => {
      const p = { id: `p${nextId++}`, date, asset, amount_eur, price_eur, quantity: quantity > 0 ? quantity : amount_eur / price_eur, notes };
      state.purchases = [p, ...state.purchases];
      return Promise.resolve(p);
    },
    deletePurchase: (id) => { state.purchases = state.purchases.filter(p => p.id !== id); return Promise.resolve({}); },
    addBankEntry: (bank, date, amount, currency = 'USD', note = '') => {
      const en = { id: nextId++, bank, date, amount, currency, note };
      state.bankEntries = [en, ...state.bankEntries];
      return Promise.resolve(en);
    },
    deleteBankEntry: (id) => { state.bankEntries = state.bankEntries.filter(e => e.id !== id); return Promise.resolve({}); },
    addCashPosition: (label, amount_eur, currency = 'EUR') => {
      const p = { id: `c${nextId++}`, label, amount_eur, currency };
      state.cashPositions = [...state.cashPositions, p];
      return Promise.resolve(p);
    },
    updateCashPosition: (id, label, amount_eur, currency = 'EUR') => {
      state.cashPositions = state.cashPositions.map(p => (p.id === id ? { ...p, label, amount_eur, currency } : p));
      return Promise.resolve({});
    },
    deleteCashPosition: (id) => { state.cashPositions = state.cashPositions.filter(p => p.id !== id); return Promise.resolve({}); },
    addAsset: (a) => { state.assets = [...state.assets, { decimals: 4, color: '#8D9BFF', ...a }]; return Promise.resolve({}); },
    removeAsset: (symbol) => { state.assets = state.assets.filter(a => a.symbol !== symbol); return Promise.resolve({}); },
    updateAssetColor: ok({}),
    updateAssetTracking: ok({}),
    changePassword: ok({}),
    logoutAll: ok({}),
    login: ok({ access_token: 'preview' }),
    setup: ok({ access_token: 'preview' }),
  });
}
