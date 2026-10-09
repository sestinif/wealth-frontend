import { readResponse } from './utils/http.js';
import { purchaseBody } from './utils/purchase.js';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

const TOKEN_KEY = 'wealth_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const removeToken = () => localStorage.removeItem(TOKEN_KEY);

const authHeaders = () => {
  const token = getToken();
  return {
    'Authorization': `Bearer ${token}`
  };
};

const handleResponse = (response, options = {}) =>
  readResponse(response, {
    ...options,
    onSessionExpired: () => {
      removeToken();
      window.location.href = '/login';
    },
  });

export const api = {
  health: async () => {
    const response = await fetch(`${BASE_URL}/health`);
    return handleResponse(response);
  },

  checkSetupRequired: async () => {
    const response = await fetch(`${BASE_URL}/setup-required`);
    return handleResponse(response);
  },

  setup: async (username, email, password) => {
    const response = await fetch(`${BASE_URL}/auth/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    return handleResponse(response, { sessionAware: false });
  },

  login: async (username, password) => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    // A 401 here is a wrong password, not an expired session.
    return handleResponse(response, { sessionAware: false });
  },

  getMe: async () => {
    const response = await fetch(`${BASE_URL}/auth/me`, {
      headers: authHeaders()
    });
    return handleResponse(response);
  },

  changePassword: async (oldPassword, newPassword) => {
    const response = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
    });
    return handleResponse(response);
  },

  // Revoke every existing session server-side (bumps token_version), then clear the
  // local token and bounce to login like a normal logout. If the server can't be
  // reached, nothing changes and the caller is told: signing out locally while the
  // other devices stay signed in would look like it worked when it hadn't.
  // (A 401 means this session is already dead, so signing out locally is right.)
  logoutAll: async () => {
    let response;
    try {
      response = await fetch(`${BASE_URL}/auth/logout-all`, {
        method: 'POST',
        headers: authHeaders()
      });
    } catch {
      throw new Error('Couldn\u2019t reach the server. You\u2019re still signed in on every device.');
    }
    if (!response.ok && response.status !== 401) {
      throw new Error('The server didn\u2019t sign the other devices out. You\u2019re still signed in.');
    }
    removeToken();
    window.location.href = '/login';
  },

  getPrices: async () => {
    const response = await fetch(`${BASE_URL}/prices`, {
      headers: authHeaders()
    });
    return handleResponse(response);
  },

  getPricesStatus: async () => {
    const response = await fetch(`${BASE_URL}/prices/status`, {
      headers: authHeaders()
    });
    return handleResponse(response);
  },

  refreshPrices: async () => {
    const response = await fetch(`${BASE_URL}/prices/refresh`, {
      method: 'POST',
      headers: authHeaders()
    });
    return handleResponse(response);
  },

  getPurchases: async () => {
    const response = await fetch(`${BASE_URL}/purchases`, {
      headers: authHeaders()
    });
    return handleResponse(response);
  },

  // Market price {eur, usd} of a crypto asset at a unix time (seconds)
  getHistoricalPrice: async (asset, ts) => {
    const response = await fetch(`${BASE_URL}/prices/historical?asset=${encodeURIComponent(asset)}&ts=${Math.floor(ts)}`, {
      headers: authHeaders()
    });
    return handleResponse(response);
  },

  // `quantity` is the exact amount received when the user typed one; the server
  // then keeps it instead of recomputing amount / price.
  addPurchase: async (date, asset, amountEur, priceEur, notes = '', priceUsd = 0, fundedFrom = null, fundedAmount = 0, quantity = null) => {
    const response = await fetch(`${BASE_URL}/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify(purchaseBody({ date, asset, amountEur, priceEur, priceUsd, notes, fundedFrom, fundedAmount, quantity }))
    });
    return handleResponse(response);
  },

  updatePurchase: async (id, date, asset, amountEur, priceEur, notes = '', priceUsd = null) => {
    const body = { date, asset, amount_eur: amountEur, price_eur: priceEur, notes };
    // Only send price_usd when the caller has it, so editing never zeroes a stored value
    if (priceUsd !== null && priceUsd !== undefined) body.price_usd = priceUsd;
    const response = await fetch(`${BASE_URL}/purchases/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify(body)
    });
    return handleResponse(response);
  },

  deletePurchase: async (id) => {
    const response = await fetch(`${BASE_URL}/purchases/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    return handleResponse(response);
  },

  getDashboard: async () => {
    const response = await fetch(`${BASE_URL}/dashboard`, {
      headers: authHeaders()
    });
    return handleResponse(response);
  },

  // Net worth = portfolio + read-only external bank balances (Mercury).
  // external_accounts is [] when bank sync is off, so this is always safe to call.
  getNetWorth: async () => {
    const response = await fetch(`${BASE_URL}/networth`, {
      headers: authHeaders()
    });
    return handleResponse(response);
  },

  // Daily net-worth snapshots (powers the 1W/1M/1Y/All chart).
  postNetworthSnapshot: async (payload) => {
    const response = await fetch(`${BASE_URL}/networth/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload)
    });
    return handleResponse(response);
  },

  getNetworthHistory: async () => {
    const response = await fetch(`${BASE_URL}/networth/history`, {
      headers: authHeaders()
    });
    return handleResponse(response);
  },

  // --- Dry powder (uninvested broker cash) ---

  getCashPositions: async () => {
    const response = await fetch(`${BASE_URL}/cash-positions`, {
      headers: authHeaders()
    });
    return handleResponse(response);
  },

  addCashPosition: async (label, amountEur, currency = 'EUR', note = '') => {
    const response = await fetch(`${BASE_URL}/cash-positions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ label, amount_eur: amountEur, currency, note })
    });
    return handleResponse(response);
  },

  updateCashPosition: async (id, label, amountEur, currency = 'EUR', note = '') => {
    const response = await fetch(`${BASE_URL}/cash-positions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ label, amount_eur: amountEur, currency, note })
    });
    return handleResponse(response);
  },

  deleteCashPosition: async (id) => {
    const response = await fetch(`${BASE_URL}/cash-positions/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    return handleResponse(response);
  },

  // --- Bank ledger (manual money in/out per bank, e.g. Relay) ---

  getBankEntries: async () => {
    const response = await fetch(`${BASE_URL}/bank-entries`, {
      headers: authHeaders()
    });
    return handleResponse(response);
  },

  addBankEntry: async (bank, date, amount, currency = 'USD', note = '') => {
    const response = await fetch(`${BASE_URL}/bank-entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ bank, date, amount, currency, note })
    });
    return handleResponse(response);
  },

  deleteBankEntry: async (id) => {
    const response = await fetch(`${BASE_URL}/bank-entries/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    return handleResponse(response);
  },

  getMonthlyReport: async (year, month) => {
    const response = await fetch(`${BASE_URL}/reports/monthly?year=${year}&month=${month}`, {
      headers: authHeaders()
    });
    return handleResponse(response);
  },

  getAnnualReport: async (year) => {
    const response = await fetch(`${BASE_URL}/reports/annual?year=${year}`, {
      headers: authHeaders()
    });
    return handleResponse(response);
  },

  getLifetimeReport: async () => {
    const response = await fetch(`${BASE_URL}/reports/lifetime`, {
      headers: authHeaders()
    });
    return handleResponse(response);
  },

  // --- Asset Management ---

  getAssets: async () => {
    const response = await fetch(`${BASE_URL}/assets`, {
      headers: authHeaders()
    });
    return handleResponse(response);
  },

  addAsset: async (assetData) => {
    const response = await fetch(`${BASE_URL}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(assetData)
    });
    return handleResponse(response);
  },

  removeAsset: async (symbol) => {
    const response = await fetch(`${BASE_URL}/assets/${encodeURIComponent(symbol)}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    return handleResponse(response);
  },

  updateAssetTracking: async (symbol, included) => {
    const response = await fetch(`${BASE_URL}/assets/${encodeURIComponent(symbol)}/tracking`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ included })
    });
    return handleResponse(response);
  },

  updateAssetColor: async (symbol, color) => {
    const response = await fetch(`${BASE_URL}/assets/${encodeURIComponent(symbol)}/color`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ color })
    });
    return handleResponse(response);
  },

  getMarketInfo: async () => {
    const response = await fetch(`${BASE_URL}/assets/market-info`, {
      headers: authHeaders()
    });
    return handleResponse(response);
  },

  searchAssets: async (query, type) => {
    const response = await fetch(`${BASE_URL}/assets/search?q=${encodeURIComponent(query)}&type=${type}`, {
      headers: authHeaders()
    });
    return handleResponse(response);
  },
};
