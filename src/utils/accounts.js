// Login pages of the banks and brokers. Links only: Wealth never sees a credential.
// To add or remove an account, edit this list and nothing else.
// `match` (optional) ties an account to the balances Wealth already tracks (see balanceFor).
export const ACCOUNT_GROUPS = [
  {
    key: 'banks', label: 'Banks',
    items: [
      { name: 'Mercury', url: 'https://app.mercury.com/login', domain: 'mercury.com', match: 'mercury' },
      { name: 'Relay', url: 'https://app.relayfi.com/login', domain: 'relayfi.com', match: 'relay' },
      { name: 'Revolut Business', url: 'https://business.revolut.com/', domain: 'business.revolut.com', logoDomain: 'revolut.com' },
      { name: 'Wise', url: 'https://wise.com/login', domain: 'wise.com' },
    ],
  },
  {
    key: 'brokers', label: 'Brokers',
    items: [
      { name: 'DeGiro', url: 'https://www.degiro.com/', domain: 'degiro.com' },
      { name: 'Bybit', url: 'https://www.bybit.com/en/login', domain: 'bybit.com' },
    ],
  },
];

// The site's icon, by domain. If it does not load, the avatar falls back to initials.
export const logoUrl = (domain) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;

// One figure for an account, from the external balances Wealth tracks
// ([{ name, currency, balance }]). Null when there is no match, or when the
// matches are in different currencies (no single honest total).
export function balanceFor(match, externalAccounts) {
  if (!match || !Array.isArray(externalAccounts)) return null;
  const key = String(match).toLowerCase();
  const hits = externalAccounts.filter(a => String(a.name || '').toLowerCase().includes(key));
  if (hits.length === 0) return null;
  const currency = (hits[0].currency || 'EUR').toUpperCase();
  if (hits.some(a => (a.currency || 'EUR').toUpperCase() !== currency)) return null;
  const amount = Math.round(hits.reduce((s, a) => s + (Number(a.balance) || 0), 0) * 100) / 100;
  return { amount, currency };
}
