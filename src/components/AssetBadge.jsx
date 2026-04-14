import React from 'react';

export default function AssetBadge({ asset, color = '#8B5CF6' }) {
  return (
    <span
      className="badge"
      style={{ background: `${color}33`, color: color }}
    >
      {asset}
    </span>
  );
}
