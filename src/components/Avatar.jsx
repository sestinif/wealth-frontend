import React from 'react';
import AssetBadge from './AssetBadge';

// 32px round mark: the asset's logo, or two initials for anything else.
export default function Avatar({ asset, color, label }) {
  if (asset) {
    return <span className="m-avatar"><AssetBadge asset={asset} color={color} showSymbol={false} /></span>;
  }
  return <span className="m-avatar m-avatar--text">{String(label || '').slice(0, 2).toUpperCase()}</span>;
}
