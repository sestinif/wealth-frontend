import { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import FormInput from './FormInput';
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
      alert('Errore: ' + err.message);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)', zIndex: 9998, animation: 'fadeIn 0.15s ease',
      }} />
      <div style={{
        position: 'fixed', top: '12%', left: '50%', transform: 'translateX(-50%)',
        width: '92%', maxWidth: 500, zIndex: 9999,
        animation: 'fadeUp 0.25s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{
          background: '#11121c', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#eeedf2' }}>Aggiungi nuovo asset</div>
              <div style={{ fontSize: 11, color: '#85819a', marginTop: 2 }}>Cerca su CoinGecko o Yahoo Finance</div>
            </div>
            <button onClick={onClose} className="btn btn--ghost btn--sm">✕</button>
          </div>

          <div style={{ padding: 20 }}>
            <div className="search-tabs">
              {[['crypto', 'Crypto'], ['dex', 'DEX / Meme'], ['stock', 'Stock & ETF']].map(([k, l]) => (
                <button key={k} className={`btn btn--ghost btn--sm ${type === k ? 'active' : ''}`}
                  onClick={() => { setType(k); setResults([]); setQuery(''); }}>{l}</button>
              ))}
            </div>

            <input
              ref={inputRef}
              type="text"
              className="form-input form-input--lg"
              placeholder={
                type === 'crypto' ? 'Es. bitcoin, ethereum, solana...'
                : type === 'dex' ? 'Es. brett, pepe, wif, bonk...'
                : 'Es. VUAA, SPY, AAPL...'
              }
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ marginBottom: 12 }}
            />

            {loading && <div style={{ fontSize: 11, color: '#85819a', textAlign: 'center', padding: 12 }}>Ricerca in corso...</div>}

            <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {results.map(r => (
                <div key={r.symbol + (r.coingecko_id || r.yfinance_symbols || '')} className="search-result">
                  {r.thumb ? (
                    <img src={r.thumb} alt={r.symbol} style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#a78bfa', fontWeight: 600, flexShrink: 0 }}>
                      {r.symbol?.slice(0, 2)}
                    </div>
                  )}
                  <div className="search-result__info" style={{ minWidth: 0 }}>
                    <div className="search-result__symbol">
                      {r.symbol}
                      {r.chain && <span style={{ fontSize: 9, marginLeft: 6, padding: '1px 5px', borderRadius: 3, background: 'rgba(167,139,250,0.15)', color: '#a78bfa', textTransform: 'uppercase' }}>{r.chain}</span>}
                    </div>
                    <div className="search-result__name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.name}
                      {r.liquidity_usd ? <span style={{ opacity: 0.5, marginLeft: 4 }}>· Liq ${r.liquidity_usd >= 1e6 ? (r.liquidity_usd / 1e6).toFixed(1) + 'M' : (r.liquidity_usd / 1e3).toFixed(0) + 'K'}</span>
                        : r.coingecko_id && type === 'crypto' ? <span style={{ opacity: 0.5, marginLeft: 4 }}>· {r.coingecko_id}</span> : null}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: (r.price_usd || r.price_eur) ? '#eeedf2' : '#4a4660', fontWeight: 500, fontFamily: 'var(--font-num)', marginRight: 8, minWidth: 70, textAlign: 'right' }}>
                    {r.price_usd ? formatUSD(r.price_usd) : r.price_eur ? formatEUR(r.price_eur) : '—'}
                  </div>
                  <button className="btn btn--primary btn--sm" disabled={adding === r.symbol} onClick={() => handleAdd(r)}>
                    {adding === r.symbol ? '...' : 'Aggiungi'}
                  </button>
                </div>
              ))}
              {!loading && query.length >= 2 && results.length === 0 && (
                <div style={{ fontSize: 12, color: '#4a4660', textAlign: 'center', padding: 20 }}>
                  Nessun risultato per "{query}"
                </div>
              )}
              {!loading && query.length < 2 && (
                <div style={{ fontSize: 12, color: '#4a4660', textAlign: 'center', padding: 20 }}>
                  Digita almeno 2 caratteri
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
