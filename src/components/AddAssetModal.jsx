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
              {[['crypto', 'Crypto & Meme'], ['stock', 'Stock & ETF']].map(([k, l]) => (
                <button key={k} className={`btn btn--ghost btn--sm ${type === k ? 'active' : ''}`}
                  onClick={() => { setType(k); setResults([]); setQuery(''); }}>{l}</button>
              ))}
            </div>

            <input
              ref={inputRef}
              type="text"
              className="form-input form-input--lg"
              placeholder={type === 'crypto' ? 'Es. pepe, brett, wif, bonk, solana...' : 'Es. VUAA, SPY, AAPL...'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ marginBottom: 12 }}
            />

            {loading && <div style={{ fontSize: 11, color: '#85819a', textAlign: 'center', padding: 12 }}>Ricerca in corso...</div>}

            <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {results.map(r => (
                <div key={r.symbol + (r.coingecko_id || '')} className="search-result">
                  <div className="search-result__info">
                    <div className="search-result__symbol">{r.symbol}</div>
                    <div className="search-result__name">{r.name}</div>
                  </div>
                  {(r.price_usd || r.price_eur) ? (
                    <div style={{ fontSize: 12, color: '#eeedf2', fontWeight: 500, fontFamily: 'var(--font-num)', marginRight: 8 }}>
                      {r.price_usd ? formatUSD(r.price_usd) : formatEUR(r.price_eur)}
                    </div>
                  ) : null}
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
