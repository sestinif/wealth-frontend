import React, { useState } from 'react';
import { coinIconUrl } from './AssetBadge';

// 32px round mark: the asset's logo, or two grey initials when there is no logo.
// Pass `asset` (a symbol) for an asset, or `label` for anything else (a bank).
export default function Avatar({ asset, label }) {
  // Remember which symbol failed, so a different asset on the same instance tries its own logo.
  const [failedAsset, setFailedAsset] = useState(null);
  if (asset && failedAsset !== asset) {
    return (
      <span className="m-avatar">
        <img src={coinIconUrl(asset)} alt="" loading="lazy" decoding="async" onError={() => setFailedAsset(asset)} />
      </span>
    );
  }
  return <span className="m-avatar m-avatar--text">{String(asset || label || '').slice(0, 2).toUpperCase()}</span>;
}
