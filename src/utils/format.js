const MINUS = '−';
const group = (n, min, max = min) =>
  Math.abs(Number(n)).toLocaleString('en-US', { minimumFractionDigits: min, maximumFractionDigits: max, useGrouping: 'always' });
// A value that rounds to zero is not negative ("−€0.00" reads as a bug).
const isNegative = (value, digits) => Number(value) < 0 && /[1-9]/.test(digits);
const money = (symbol, value, min, max) => {
  const digits = group(value, min, max);
  return `${isNegative(value, digits) ? MINUS : ''}${symbol}${digits}`;
};

export const formatEUR = (value, decimals = 2) => money('€', value, decimals);
export const formatUSD = (value, decimals = 2) => money('$', value, decimals);

export const formatQty = (value, decimals = 2) => {
  const n = Number(value);
  // Auto decimals for very small values
  let d = decimals;
  if (Math.abs(n) > 0 && Math.abs(n) < 1) d = Math.max(decimals, 4);
  if (Math.abs(n) > 1000) d = Math.min(decimals, 2);
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' });
};

// Adaptive decimals: micro-prices need more digits, without trailing zeros.
export const formatPrice = (value, currency = 'EUR') => {
  const a = Math.abs(Number(value));
  const [min, max] = a > 0 && a < 0.01 ? [4, 8] : a < 1 ? [4, 4] : [2, 2];
  return money(currency === 'USD' ? '$' : '€', value, min, max);
};

// Signed percentage with one decimal and a real minus. A change that rounds to zero has no sign.
export const pctText = (value) => {
  const digits = Math.abs(Number(value) || 0).toFixed(1);
  if (digits === '0.0') return '0.0%';
  return `${value >= 0 ? '+' : '−'}${digits}%`;
};

// YYYY-MM-DD of a Date in LOCAL time (toISOString would give the UTC day).
export const localDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Calendar dates are stored as YYYY-MM-DD: read them as UTC so the label
// never slips a day in a negative-offset timezone.
const calendar = (dateStr, opts) =>
  new Date(`${String(dateStr).slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', ...opts });
export const formatDay = (dateStr) => calendar(dateStr, { month: 'short', day: 'numeric' });
export const formatDayLong = (dateStr) => calendar(dateStr, { month: 'short', day: 'numeric', year: 'numeric' });
export const formatMonth = (dateStr) => calendar(dateStr, { month: 'long', year: 'numeric' });

// Pieces of a money figure, so the view can dim the cents.
export const moneyParts = (value, currency = 'EUR', decimals = 2) => {
  const digits = group(value, decimals);
  const [int, cents = ''] = digits.split('.');
  return { negative: isNegative(value, digits), symbol: currency === 'USD' ? '$' : '€', int, cents };
};

export const sortByDate = (array, key = 'date', order = 'desc') => {
  return [...array].sort((a, b) => {
    const diff = new Date(a[key]) - new Date(b[key]);
    return order === 'desc' ? -diff : diff;
  });
};

export const TOOLTIP_STYLE = {
  background: '#23232E',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  padding: '8px 12px',
  fontFamily: "'Inter', sans-serif",
  fontVariantNumeric: 'tabular-nums',
  boxShadow: 'none',
};
export const TOOLTIP_LABEL_STYLE = { color: '#9A9AA8', fontSize: 12, marginBottom: 2 };
export const TOOLTIP_ITEM_STYLE = { color: '#EDEDF3', fontSize: 13 };

