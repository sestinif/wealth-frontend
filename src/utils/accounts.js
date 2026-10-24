// Login pages of the banks and brokers. Links only: Wealth never sees a credential.
// To add or remove an account, edit this list and nothing else.
// `match` (optional) ties an account to the balances Wealth already tracks (see balanceFor).
// `owner`: who the account belongs to (a company, or Personal). Shown next to the account.
export const ACCOUNT_GROUPS = [
  {
    key: 'banks', label: 'Banks',
    items: [
      { name: 'Mercury', url: 'https://app.mercury.com/login', domain: 'mercury.com', match: 'mercury', owner: 'Scaling Catalyst' },
      { name: 'Relay', url: 'https://app.relayfi.com/login', domain: 'relayfi.com', match: 'relay', owner: 'Scaling Catalyst' },
    ],
  },
  {
    key: 'brokers', label: 'Brokers',
    items: [
      { name: 'DeGiro', url: 'https://www.degiro.com/', domain: 'degiro.com', owner: 'Personal' },
      { name: 'Bybit', url: 'https://www.bybit.com/en/login', domain: 'bybit.com', owner: 'Personal' },
    ],
  },
];

// The site's icon, by domain. If it does not load, the avatar falls back to initials.
// The known bank or broker named by a free label ("Degiro", "Relay", "Mercury Checking"):
// the first account whose match word or name (or the name's first word) is in it. Null otherwise.
export function accountFor(label) {
  const text = String(label || '').toLowerCase();
  if (!text) return null;
  for (const group of ACCOUNT_GROUPS) {
    for (const item of group.items || []) {
      // The match word, the full name, and the name's first word ("Revolut" for a "Revolut Business").
      const words = [item.match, item.name, String(item.name || '').split(' ')[0]]
        .filter(w => w && w.length >= 3).map(w => String(w).toLowerCase());
      if (words.some(w => text.includes(w))) return item;
    }
  }
  return null;
}

// Its logo, or null.
export function accountLogo(label) {
  const item = accountFor(label);
  return item ? logoUrl(item.logoDomain || item.domain) : null;
}

// Who it belongs to ("Scaling Catalyst", "Personal"…), or null when not set.
export function ownerOf(label) {
  return accountFor(label)?.owner || null;
}

export const logoUrl = (domain) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;

// One figure for an account, from the external balances Wealth tracks
// ([{ name, currency, balance }]). Null when there is no match, or when the
// matches are in different currencies (no single honest total), or in a
// currency the app cannot format (it only knows EUR and USD).
export function balanceFor(match, externalAccounts) {
  if (!match || !Array.isArray(externalAccounts)) return null;
  const key = String(match).toLowerCase();
  const hits = externalAccounts.filter(a => String(a.name || '').toLowerCase().includes(key));
  if (hits.length === 0) return null;
  const currency = (hits[0].currency || 'EUR').toUpperCase();
  if (currency !== 'EUR' && currency !== 'USD') return null;
  if (hits.some(a => (a.currency || 'EUR').toUpperCase() !== currency)) return null;
  const amount = Math.round(hits.reduce((s, a) => s + (Number(a.balance) || 0), 0) * 100) / 100;
  return { amount, currency };
}
