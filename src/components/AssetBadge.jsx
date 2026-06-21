import React, { useState } from 'react';

// Real coin logos (via cryptocurrency-icons CDN) in a tidy circular chip,
// with a graceful colored-initial fallback for stocks/ETFs/unknowns.
// Backward compatible: same { asset, color } props used everywhere.
export default function AssetBadge({ asset, color = '#8B7BFF', showSymbol = true }) {
  const [err, setErr] = useState(false);
  const sym = String(asset || '');
  const slug = sym.toLowerCase().replace(/[^a-z0-9]/g, '');
  const url = `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/${slug}.svg`;

  return (
    <span className="asset-badge">
      <span
        className="asset-badge__icon"
        style={err ? { background: `${color}22`, color, boxShadow: `inset 0 0 0 1px ${color}55` } : undefined}
      >
        {!err
          ? <img src={url} alt="" loading="lazy" decoding="async" onError={() => setErr(true)} />
          : sym.slice(0, 1).toUpperCase()}
      </span>
      {showSymbol && <span className="asset-badge__sym">{sym}</span>}
    </span>
  );
}
