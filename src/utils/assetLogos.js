// Logo of an ETF, found by itself from the fund's name: "iShares Edge MSCI USA…" shows iShares.
// A new ETF from a known issuer needs nothing from us. Issuers whose logo we keep in /public/logos
// use that file; the others use the issuer's site icon, the same way Numbers does for its suppliers.

const LOCAL = { ishares: '/logos/ishares.png', vanguard: '/logos/vanguard.png' };

// [word in the fund's name, key of a local logo or the issuer's website]
const ISSUERS = [
  ['ishares', 'ishares'],
  ['vanguard', 'vanguard'],
  ['xtrackers', 'xtrackers.com'],
  ['amundi', 'amundi.com'],
  ['lyxor', 'amundi.com'],
  ['spdr', 'ssga.com'],
  ['invesco', 'invesco.com'],
  ['wisdomtree', 'wisdomtree.eu'],
  ['vaneck', 'vaneck.com'],
  ['global x', 'globalxetfs.eu'],
  ['ubs', 'ubs.com'],
  ['hsbc', 'hsbc.com'],
  ['bnp paribas', 'bnpparibas.com'],
  ['franklin', 'franklintempleton.com'],
  ['ark ', 'ark-funds.com'],
];

const words = (name) => ` ${String(name || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;

// Logo url for a fund name, or '' when its issuer is not one we know (the initials show then).
export function issuerLogo(name) {
  const text = words(name);
  for (const [word, target] of ISSUERS) {
    if (!text.includes(` ${word.trim()} `)) continue;
    if (LOCAL[target]) return LOCAL[target];
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(target)}&sz=64`;
  }
  return '';
}

// symbol → asset name, filled whenever the app loads the asset list.
const names = new Map();
const listeners = new Set();

export function registerAssets(assets) {
  let changed = false;
  for (const a of Array.isArray(assets) ? assets : []) {
    const sym = String(a?.symbol || '').toUpperCase();
    if (sym && a.asset_type === 'stock_etf' && names.get(sym) !== a.name) { names.set(sym, a.name); changed = true; }
  }
  if (changed) listeners.forEach(fn => fn());
}

export const logoForSymbol = (symbol) => issuerLogo(names.get(String(symbol || '').toUpperCase()));
export const hasRegisteredAssets = () => names.size > 0;
export const onAssetLogos = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const resetAssetLogos = () => { names.clear(); };
