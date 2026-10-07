import React, { useEffect, useState } from 'react';
import { coinIconUrl } from './AssetBadge';
import { colorFor } from '../utils/marks';

// Image url → true (it loaded) or false (it is missing). Shared by every avatar,
// so a logo is asked for once and a row never flickers when it is drawn again.
const seen = new Map();

// 32px round mark: a logo, or two initials in the colour of who they stand for.
// Pass `asset` (a symbol) for a coin logo, `src` for any other logo, `label` for the initials.
// `color` is the asset's own colour; without it the name picks a steady tint.
// The initials show from the first paint; the logo takes their place once it has loaded.
export default function Avatar({ asset, label, src, color }) {
  const image = src || (asset ? coinIconUrl(asset) : null);
  const [, redraw] = useState(0);

  useEffect(() => {
    if (!image || seen.has(image)) return undefined;
    let alive = true;
    const settle = (ok) => { seen.set(image, ok); if (alive) redraw(n => n + 1); };
    const probe = new Image();
    probe.referrerPolicy = 'no-referrer';
    probe.onload = () => settle(true);
    probe.onerror = () => settle(false);
    probe.src = image;
    return () => { alive = false; };
  }, [image]);

  if (image && seen.get(image)) {
    return (
      <span className="m-avatar">
        <img src={image} alt="" decoding="async" referrerPolicy="no-referrer" />
      </span>
    );
  }
  const name = String(asset || label || '');
  return <span className="m-avatar m-avatar--text" style={{ '--mark': color || colorFor(name) }}>{name.slice(0, 2).toUpperCase()}</span>;
}
