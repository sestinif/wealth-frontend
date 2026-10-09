// Dev-only: swaps the methods of the real `api` object for fixture-backed ones,
// so the real pages render in /preview.html without a login or a backend.
import * as fx from './fixtures';

const ok = (value) => () => Promise.resolve(value);
let nextId = 1000;

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
    postNetworthSnapshot: ok({}),
    getMarketInfo: ok(fx.marketInfo),
    getAssets: () => Promise.resolve(state.assets),
    getPurchases: () => Promise.resolve(state.purchases),
    getCashPositions: () => Promise.resolve(state.cashPositions),
    getBankEntries: () => Promise.resolve(state.bankEntries),
    getCashEvents: () => Promise.resolve([
      { date: '2026-10-09', delta: 250, currency: 'EUR', opening: true },
      { date: '2026-10-03', delta: 400, currency: 'EUR', opening: false },
      { date: '2026-09-18', delta: -150, currency: 'EUR', opening: false },
    ]),
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
