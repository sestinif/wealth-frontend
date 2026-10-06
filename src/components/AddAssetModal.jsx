import { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import Icon from './Icon';
import Segmented from './Segmented';
import Avatar from './Avatar';
import EmptyState from './EmptyState';
import { formatUSD, formatEUR } from '../utils/format';

export default function AddAssetModal({ existingAssets, onClose, onAdded }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('crypto');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState('');
  const timeoutRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, []);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!query || query.length < 2) { setResults([]); return; }
    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await api.searchAssets(query, type);
        const configured = new Set(existingAssets.map(a => a.symbol));
        setResults(r.filter(x => !configured.has(x.symbol)));
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 350);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [query, type, existingAssets]);

  const handleAdd = async (result) => {
    setAdding(result.symbol);
    try {
      const newAsset = await api.addAsset({
        symbol: result.symbol, name: result.name, asset_type: result.asset_type,
        coingecko_id: result.coingecko_id || null,
        yfinance_symbols: result.yfinance_symbols || null,
        color: '', decimals: result.asset_type === 'crypto' ? 4 : 2,
      });
      onAdded(newAsset);
    } catch (err) {
      setAdding('');
      alert('Error: ' + err.message);
    }
  };

  return (
    <>
      <div onClick={onClose} className="m-overlay" />
      <div style={{
        position: 'fixed', top: '12%', left: 0, right: 0, margin: '0 auto',
        width: '92%', maxWidth: 500, zIndex: 9999,
        animation: 'fadeUp 0.25s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div className="m-dialog">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-1)' }}>Add new asset</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>Search on CoinGecko or Yahoo Finance</div>
            </div>
            <button onClick={onClose} className="btn btn--ghost btn--sm" aria-label="Close"><Icon name="x" size={14} /></button>
          </div>

          <div style={{ padding: 20 }}>
            <div style={{ marginBottom: 12 }}>
              <Segmented options={[{ key: 'crypto', label: 'Crypto' }, { key: 'dex', label: 'DEX and meme' }, { key: 'stock', label: 'Stocks and ETFs' }]}
                value={type} onChange={(k) => { setType(k); setResults([]); setQuery(''); }} />
            </div>

            <input
              ref={inputRef}
              type="text"
              className="form-input form-input--lg"
              placeholder={
                type === 'crypto' ? 'Try bitcoin, ethereum or solana'
                : type === 'dex' ? 'Try brett, pepe or wif'
                : 'Try VUAA, SPY or AAPL'
              }
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ marginBottom: 12 }}
            />

            {loading && <div style={{ fontSize: 12, color: 'var(--text-2)', textAlign: 'center', padding: 12 }}>Searching…</div>}

            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {results.map(r => (
                <div key={r.symbol + (r.coingecko_id || r.yfinance_symbols || '')} className="m-setrow">
                  {r.thumb
                    ? <span className="m-avatar"><img src={r.thumb} alt="" /></span>
                    : <Avatar label={r.symbol} />}
                  <span className="m-row__main">
                    <span className="m-row__title">{r.name || r.symbol}</span>
                    <span className="m-row__sub">
                      {[
                        r.symbol,
                        r.chain,
                        r.liquidity_usd ? `Liquidity ${formatUSD(r.liquidity_usd, 0)}`
                          : r.coingecko_id && type === 'crypto' ? r.coingecko_id : null,
                      ].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="m-setrow__price">
                    {r.price_usd ? formatUSD(r.price_usd) : r.price_eur ? formatEUR(r.price_eur) : '—'}
                  </span>
                  <button className="btn btn--primary btn--sm" disabled={adding === r.symbol} onClick={() => handleAdd(r)}>
                    {adding === r.symbol ? '…' : 'Add'}
                  </button>
                </div>
              ))}
              {!loading && query.length >= 2 && results.length === 0 && (
                <EmptyState compact icon="search" title="No results" description={`Nothing found for "${query}". Try another name or symbol.`} />
              )}
              {!loading && query.length < 2 && (
                <EmptyState compact icon="search" title="Search for an asset" description="Type at least 2 characters to start searching." />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
