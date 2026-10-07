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

// A steady tint for a name: the same bank or broker always gets the same colour.
export function colorFor(text) {
  const key = clean(text);
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

// An asset keeps the colour picked for it in Settings; without one it gets a steady tint from its symbol.
export function assetColor(asset, symbol) {
  const picked = asset && asset.color;
  if (HEX.test(picked || '')) return picked;
  return colorFor((asset && asset.symbol) || symbol);
}
