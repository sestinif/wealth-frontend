// The price of one asset over 1D / 7D / 1M / 1Y, for the chart in a holding's sheet.
// 1D and 7D are live points [epoch_ms, price] from the server; 1M and 1Y are daily
// closes [YYYY-MM-DD, close] from the history cache. Everything ends in rows { t, price }.

export const ASSET_RANGES = ['1D', '7D', '1M', '1Y'];
export const isIntraday = (range) => range === '1D' || range === '7D';

const DAY_MS = 24 * 3600 * 1000;
const DAILY_SPAN = { '1M': 30, '1Y': 365 };

// `intraday`: [[ms, price]]; `daily`: [[day, close]]; `live`: the current price (EUR), if any.
export function buildAssetSeries({ range, intraday = [], daily = [], live = null, now = Date.now() }) {
  let rows;
  if (isIntraday(range)) {
    rows = intraday.map(([t, price]) => ({ t, price }));
  } else {
    const from = now - (DAILY_SPAN[range] || 365) * DAY_MS;
    rows = daily
      .map(([day, price]) => ({ t: Date.parse(`${day}T12:00:00Z`), price }))
      .filter(r => r.t >= from);
    // The newest daily close is yesterday's: close the line on today's live price.
    if (live > 0 && (!rows.length || now > rows[rows.length - 1].t)) rows.push({ t: now, price: live });
  }
  return rows.filter(r => Number.isFinite(r.t) && r.price > 0).sort((a, b) => a.t - b.t);
}

// Percent move from the first to the last row. null with fewer than two rows.
export function changePct(rows) {
  if (rows.length < 2 || !(rows[0].price > 0)) return null;
  return (rows[rows.length - 1].price / rows[0].price - 1) * 100;
}
