export const formatEUR = (value, decimals = 2) =>
  `€ ${Number(value).toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

export const formatUSD = (value, decimals = 0) =>
  `$ ${Number(value).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

export const formatQty = (value, decimals = 2) => {
  const n = Number(value);
  // Auto decimals for very small values
  let d = decimals;
  if (Math.abs(n) > 0 && Math.abs(n) < 1) d = Math.max(decimals, 4);
  if (Math.abs(n) > 1000) d = Math.min(decimals, 2);
  return n.toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d });
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
  return symbol + n.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
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
  background: 'rgba(13, 11, 33, 0.95)',
  border: '1px solid rgba(139, 92, 246, 0.3)',
  borderRadius: '8px',
};
