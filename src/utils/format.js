export const formatEUR = (value, decimals = 2) =>
  `€ ${Number(value).toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: 'always' })}`;

export const formatUSD = (value, decimals = 0) =>
  `$ ${Number(value).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: 'always' })}`;

export const formatQty = (value, decimals = 2) => {
  const n = Number(value);
  // Auto decimals for very small values
  let d = decimals;
  if (Math.abs(n) > 0 && Math.abs(n) < 1) d = Math.max(decimals, 4);
  if (Math.abs(n) > 1000) d = Math.min(decimals, 2);
  return n.toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' });
};

export const formatPrice = (value, currency = 'EUR') => {
  const n = Number(value);
  // Adaptive decimals: micro-prices like $0.000012 need many decimals
  let decimals = 2;
  if (Math.abs(n) > 0 && Math.abs(n) < 0.01) decimals = 8;
  else if (Math.abs(n) < 1) decimals = 4;
  else if (Math.abs(n) < 100) decimals = 2;
  const symbol = currency === 'USD' ? '$ ' : '€ ';
  const locale = currency === 'USD' ? 'en-US' : 'it-IT';
  return symbol + n.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: 'always' });
};

export const formatPnL = (value) => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatEUR(value)}`;
};

export const formatPct = (value) => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(2)}%`;
};

export const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('it-IT');

export const sortByDate = (array, key = 'date', order = 'desc') => {
  return [...array].sort((a, b) => {
    const diff = new Date(a[key]) - new Date(b[key]);
    return order === 'desc' ? -diff : diff;
  });
};

export const TOOLTIP_STYLE = {
  background: 'rgba(14, 15, 23, 0.96)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px',
  padding: '8px 12px',
  fontFamily: "'Inter', sans-serif",
  fontVariantNumeric: 'tabular-nums',
  boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
};
export const TOOLTIP_LABEL_STYLE = { color: '#85819a', fontSize: 10, marginBottom: 2 };
export const TOOLTIP_ITEM_STYLE = { color: '#ededf0', fontSize: 12 };
export const CHART_GRID = { stroke: 'rgba(255,255,255,0.04)', strokeDasharray: '2 4', vertical: false };
