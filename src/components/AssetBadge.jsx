import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { logoForSymbol, hasRegisteredAssets, onAssetLogos } from '../utils/assetLogos';

// Logos the icon set does not have, kept in /public/logos so they never depend on another site.
export const ASSET_LOGOS = {
  VUAA: { src: '/logos/vanguard.png' },
  AERO: { src: '/logos/aero.png' },
  BRETT: { src: '/logos/brett.png' },
  'EIMI.L': { src: '/logos/ishares.png' },
  'IS3N.DE': { src: '/logos/ishares.png' },
};

// Coin logo: our own file when there is one, else the cryptocurrency-icons CDN
// (unknown symbols 404, and the caller falls back to initials).
export const coinIconUrl = (symbol) => {
  const own = ASSET_LOGOS[String(symbol || '').toUpperCase()];
  if (own) return own.src;
  const etf = logoForSymbol(symbol);   // an ETF's logo comes from the issuer in its name
  if (etf) return etf;
  const slug = String(symbol || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/${slug}.svg`;
};

// Redraws when the asset list arrives (the names that tell which issuer an ETF has), and asks for it
// once if no screen has loaded it yet.
let assetsAsked = false;
export function useAssetLogos() {
  const [, redraw] = useState(0);
  useEffect(() => {
    const off = onAssetLogos(() => redraw(n => n + 1));
    if (!hasRegisteredAssets() && !assetsAsked) {
      assetsAsked = true;
      Promise.resolve(api.getAssets()).catch(() => { assetsAsked = false; });
    }
    return off;
  }, []);
}

// Real coin logos (via cryptocurrency-icons CDN) in a tidy circular chip,
// with a graceful colored-initial fallback for stocks/ETFs/unknowns.
// Backward compatible: same { asset, color } props used everywhere.
export default function AssetBadge({ asset, color = '#9A9AA8', showSymbol = true }) {
  const [err, setErr] = useState(false);
  useAssetLogos();
  const sym = String(asset || '');
  const url = coinIconUrl(sym);
  useEffect(() => { setErr(false); }, [url]);   // a better logo found later gets its chance

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
