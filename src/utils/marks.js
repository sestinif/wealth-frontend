// Pure helpers for colour that carries information: which tint a round mark takes,
// and the one colour of each market.

// Seven tints from the Calendar palette. No greens, no amber, no red: in Wealth
// green and pink mean gain and loss, and amber is the crypto market.
export const PALETTE = ['#5483DC', '#9778C2', '#34C7DD', '#BB5E80', '#C36BC0', '#A87B5B', '#A2AE5F'];

// One colour per market, the same in the allocation and in the charts.
// Mirrored by --stock, --crypto, --cash and --dry in mercury.css (charts need plain hex).
export const MARKET = { stock: '#8D9BFF', crypto: '#D4A13E', cash: '#34C7DD', dry: '#9C9CA8' };

// Gain and loss, for the charts. Mirrored by --green and --red in mercury.css.
export const TONE = { up: '#4FD1A1', down: '#F58A9B' };

const HEX = /^#[0-9a-f]{6}$/i;
const clean = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLowerCase();

// The banks and brokers in use each own a tint, so no two of them look alike.
// Any other name gets its tint from the name itself.
const NAMED = {
  mercury: PALETTE[0], relay: PALETTE[3], revolut: PALETTE[4],
  wise: PALETTE[5], degiro: PALETTE[1], bybit: PALETTE[2],
};

// A steady tint for a name: the same bank or broker always gets the same colour.
export function colorFor(text) {
  const key = clean(text);
  const named = NAMED[key.split(' ')[0]];
  if (named) return named;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

const rgb = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));

// Is this colour a green or a red? Those two are kept for gain and loss,
// so an asset wearing one would read as a result, not as a name.
export function isReserved(hex) {
  if (!HEX.test(hex || '')) return false;
  const [r, g, b] = rgb(hex).map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d < 0.2) return false;                       // greys and near-greys say nothing
  let hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  hue = (hue * 60 + 360) % 360;
  return (hue >= 95 && hue <= 170) || hue >= 345 || hue <= 15;
}

// An asset keeps the colour picked for it in Settings. Without one, or when the pick
// is a green or a red, it gets a steady tint from its symbol.
export function assetColor(asset, symbol) {
  const picked = asset && asset.color;
  if (HEX.test(picked || '') && !isReserved(picked)) return picked;
  return colorFor((asset && asset.symbol) || symbol);
}

// `amount` of one colour over another, as a solid hex: a quieter tone with no transparency.
export function mix(fg, bg, amount) {
  const a = Math.max(0, Math.min(1, amount));
  const [f, k] = [rgb(fg), rgb(bg)];
  return '#' + f.map((v, i) => Math.round(v * a + k[i] * (1 - a)).toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Large filled areas take half of the market colour over the card: the full colour
// stays on the line above them and on the legend.
const CARD = '#1B1B24';
export const MARKET_AREA = Object.fromEntries(Object.entries(MARKET).map(([k, c]) => [k, mix(c, CARD, 0.5)]));
