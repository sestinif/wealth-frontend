export const formatEUR = (value, decimals = 2) =>
  `€ ${Number(value).toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

export const formatUSD = (value, decimals = 0) =>
  `$ ${Number(value).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

export const formatQty = (value, decimals = 2) => {
  return Number(value).toFixed(decimals);
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
