import React from 'react';
import AssetBadge from './AssetBadge';
import { formatPrice } from '../utils/format';

export default function MarketOverview({ assets, prices, marketInfo }) {
  if (Object.keys(marketInfo).length === 0) {
    return <div className="m-card m-muted" style={{ fontSize: 13 }}>Loading data…</div>;
  }
  return (
    <div className="card overflow-auto" style={{ padding: 0 }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Asset</th>
            <th className="text-right">Price</th>
            <th className="text-right">24h</th>
            <th className="text-right">7d</th>
            <th className="text-right">ATH</th>
            <th className="text-right">From ATH</th>
            <th className="text-right">Market cap</th>
            <th className="text-right">Rank</th>
          </tr>
        </thead>
        <tbody>
          {assets.map(asset => {
            const mi = marketInfo[asset.symbol];
            if (!mi) return null;
            const pi = prices[asset.symbol] || {};
            const isCrypto = asset.asset_type === 'crypto' || asset.asset_type === 'dex_token';
            return (
              <tr key={asset.symbol}>
                <td><AssetBadge asset={asset.symbol} color={asset.color} /></td>
                <td className="text-right">{isCrypto ? formatPrice(pi.usd || 0, 'USD') : formatPrice(pi.eur || 0, 'EUR')}</td>
                <td className="text-right" style={{ color: (mi.change_24h || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {mi.change_24h >= 0 ? '+' : ''}{mi.change_24h || 0}%
                </td>
                <td className="text-right" style={{ color: (mi.change_7d || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {mi.change_7d ? (mi.change_7d >= 0 ? '+' : '') + mi.change_7d + '%' : '—'}
                </td>
                <td className="text-right" style={{ color: 'var(--text-1)' }}>
                  {mi.ath_usd > 0 ? formatPrice(mi.ath_usd, 'USD') : mi.ath_eur > 0 ? formatPrice(mi.ath_eur, 'EUR') : '—'}
                </td>
                <td className="text-right" style={{ color: 'var(--red)' }}>
                  {mi.ath_change_pct ? mi.ath_change_pct + '%' : '—'}
                </td>
                <td className="text-right">
                  {mi.market_cap_usd > 0 ? '$' + (mi.market_cap_usd >= 1e9 ? (mi.market_cap_usd / 1e9).toFixed(1) + 'B' : (mi.market_cap_usd / 1e6).toFixed(0) + 'M') : '—'}
                </td>
                <td className="text-right">{mi.rank > 0 ? '#' + mi.rank : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
