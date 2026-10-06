import React, { useState } from 'react';
import { coinIconUrl } from './AssetBadge';

// 32px round mark: the asset's logo, or two grey initials when there is no logo.
// Pass `asset` (a symbol) for an asset, or `label` for anything else (a bank).
export default function Avatar({ asset, label }) {
  const [failed, setFailed] = useState(false);
  if (asset && !failed) {
    return (
      <span className="m-avatar">
        <img src={coinIconUrl(asset)} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      </span>
    );
  }
  return <span className="m-avatar m-avatar--text">{String(asset || label || '').slice(0, 2).toUpperCase()}</span>;
}
