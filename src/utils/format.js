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

export const formatPnL = (value) => `${value >= 0 ? '+' : ''}${formatEUR(value)}`;

export const formatPct = (value) => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(2)}%`;
};

// Legacy numeric date (dd/mm/yyyy) — still used by pages not yet restyled.
export const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('it-IT');

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
export const CHART_GRID = { stroke: 'rgba(255,255,255,0.06)', strokeDasharray: '2 4', vertical: false };

// Y-axis €-compact: 1 decimal so a tight range doesn't produce duplicate ticks
export const yEur = (v) => '€' + (Math.abs(v) >= 1000 ? (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : Math.round(v));

// Curated categorical palette for charts — all muted at a similar saturation
// so slices never clash, regardless of the per-asset brand colors. Largest
// holding gets the first colour. Sub-threshold holdings collapse into "Altri".
export const CHART_COLORS = ['#8B7BFF', '#34D399', '#FBBF24', '#FB7185', '#60A5FA', '#C88AE6', '#5EEAD4', '#F59E0B'];
export const CHART_OTHER = '#7A7880';

// value-ranked { symbol -> palette colour } map (consistent across donut/stacked)
export const rankedColors = (assets, valueOf) => {
  const m = {};
  [...assets].sort((a, b) => (valueOf(b) || 0) - (valueOf(a) || 0))
    .forEach((a, i) => { m[a.symbol] = CHART_COLORS[i % CHART_COLORS.length]; });
  return m;
};

// build donut/pie data: sort desc, collapse <minPct into "Altri", assign palette
export const allocationSlices = (items, minPct = 0.01) => {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const sorted = [...items].filter(i => i.value > 0).sort((a, b) => b.value - a.value);
  const big = []; let other = 0;
  sorted.forEach(i => { (i.value / total >= minPct ? big.push(i) : (other += i.value)); });
  const out = big.map((i, idx) => ({ name: i.name, value: i.value, color: CHART_COLORS[idx % CHART_COLORS.length], pct: (i.value / total * 100).toFixed(1) }));
  if (other > 0) out.push({ name: 'Altri', value: other, color: CHART_OTHER, pct: (other / total * 100).toFixed(1) });
  return out;
};
