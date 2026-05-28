// Friendly display name, stored client-side (the backend only has `username`).
// Falls back to the username when not set.
const KEY = 'wealth_display_name';

export const getDisplayName = (fallback = '') => {
  try { return localStorage.getItem(KEY) || fallback; } catch { return fallback; }
};

export const setDisplayName = (name) => {
  try {
    if (name && name.trim()) localStorage.setItem(KEY, name.trim());
    else localStorage.removeItem(KEY);
  } catch { /* ignore */ }
};
