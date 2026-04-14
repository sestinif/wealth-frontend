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

const handleResponse = async (response) => {
  if (response.status === 401) {
    removeToken();
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Errore del server' }));
    throw new Error(error.detail || 'Errore del server');
  }

  return response.json().catch(() => ({}));
};

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
    return handleResponse(response);
  },

  login: async (username, password) => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return handleResponse(response);
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

  getPrices: async () => {
    const response = await fetch(`${BASE_URL}/prices`);
    return handleResponse(response);
  },

  getPurchases: async () => {
    const response = await fetch(`${BASE_URL}/purchases`, {
      headers: authHeaders()
    });
    return handleResponse(response);
  },

  addPurchase: async (date, asset, amountEur, priceEur, notes = '', priceUsd = 0) => {
    const response = await fetch(`${BASE_URL}/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({ date, asset, amount_eur: amountEur, price_eur: priceEur, price_usd: priceUsd, notes })
    });
    return handleResponse(response);
  },

  updatePurchase: async (id, date, asset, amountEur, priceEur, notes = '') => {
    const response = await fetch(`${BASE_URL}/purchases/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({ date, asset, amount_eur: amountEur, price_eur: priceEur, notes })
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
    const response = await fetch(`${BASE_URL}/assets`);
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
    const response = await fetch(`${BASE_URL}/assets/${symbol}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    return handleResponse(response);
  },

  updateAssetColor: async (symbol, color) => {
    const response = await fetch(`${BASE_URL}/assets/${symbol}/color`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ color })
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
