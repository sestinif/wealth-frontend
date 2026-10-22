import React, { useState } from 'react';

// Logos the icon set does not have, kept in /public/logos so they never depend on another site.
export const ASSET_LOGOS = {
  VUAA: { src: '/logos/vanguard.png' },
  AERO: { src: '/logos/aero.png' },
  BRETT: { src: '/logos/brett.png' },
};

// Coin logo: our own file when there is one, else the cryptocurrency-icons CDN
// (unknown symbols 404, and the caller falls back to initials).
export const coinIconUrl = (symbol) => {
  const own = ASSET_LOGOS[String(symbol || '').toUpperCase()];
  if (own) return own.src;
  const slug = String(symbol || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/${slug}.svg`;
};

// Real coin logos (via cryptocurrency-icons CDN) in a tidy circular chip,
// with a graceful colored-initial fallback for stocks/ETFs/unknowns.
// Backward compatible: same { asset, color } props used everywhere.
export default function AssetBadge({ asset, color = '#9A9AA8', showSymbol = true }) {
  const [err, setErr] = useState(false);
  const sym = String(asset || '');
  const url = coinIconUrl(sym);

  return (
    <span className="asset-badge">
      <span
        className="asset-badge__icon"
        style={err ? { background: `${color}3D`, color: `color-mix(in srgb, ${color} 70%, white)` } : undefined}
      >
        {!err
          ? <img src={url} alt="" loading="lazy" decoding="async" onError={() => setErr(true)} />
          : sym.slice(0, 1).toUpperCase()}
      </span>
      {showSymbol && <span className="asset-badge__sym">{sym}</span>}
    </span>
  );
}
