import React, { useState } from 'react';
import { coinIconUrl } from './AssetBadge';

// 32px round mark: a logo, or two grey initials when there is none.
// Pass `asset` (a symbol) for a coin logo, `src` for any other logo, `label` for the initials.
export default function Avatar({ asset, label, src }) {
  const image = src || (asset ? coinIconUrl(asset) : null);
  // Remember which image failed, so a different one on the same instance still gets its try.
  const [failed, setFailed] = useState(null);
  if (image && failed !== image) {
    return (
      <span className="m-avatar">
        <img src={image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(image)} />
      </span>
    );
  }
  return <span className="m-avatar m-avatar--text">{String(asset || label || '').slice(0, 2).toUpperCase()}</span>;
}
