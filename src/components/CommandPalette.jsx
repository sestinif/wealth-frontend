import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const COMMANDS = [
  { label: 'Dashboard', path: '/dashboard', keys: 'D' },
  { label: 'Diario — Aggiungi acquisto', path: '/diary', keys: 'A' },
  { label: 'Report', path: '/reports', keys: 'R' },
  { label: 'Grafici', path: '/charts', keys: 'G' },
  { label: 'Impostazioni — Gestisci asset', path: '/settings', keys: 'S' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
        setQuery('');
        setSelected(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  if (!open) return null;

  const filtered = COMMANDS.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (cmd) => {
    navigate(cmd.path);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && filtered[selected]) { handleSelect(filtered[selected]); }
  };

  return (
    <>
      <div onClick={() => setOpen(false)} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)', zIndex: 9998,
        animation: 'fadeIn 0.15s ease',
      }} />
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 440, zIndex: 9999,
        animation: 'fadeUp 0.2s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{
          background: '#16171f', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,58,237,0.1)',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setSelected(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Cerca o naviga..."
              style={{
                width: '100%', background: 'none', border: 'none', outline: 'none',
                color: '#ededf0', fontSize: 14, fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ padding: '6px 6px', maxHeight: 280, overflowY: 'auto' }}>
            {filtered.map((cmd, i) => (
              <div
                key={cmd.path}
                onClick={() => handleSelect(cmd)}
                style={{
                  padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: i === selected ? 'rgba(124,58,237,0.1)' : 'transparent',
                  transition: 'background 60ms',
                }}
                onMouseEnter={() => setSelected(i)}
              >
                <span style={{ fontSize: 13, color: i === selected ? '#ededf0' : '#85819a', fontWeight: i === selected ? 500 : 400 }}>
                  {cmd.label}
                </span>
                <span style={{ fontSize: 10, color: '#4a4660', fontFamily: 'monospace', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: 4 }}>
                  {cmd.keys}
                </span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '16px 12px', fontSize: 12, color: '#4a4660', textAlign: 'center' }}>
                Nessun risultato
              </div>
            )}
          </div>
          <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 12, justifyContent: 'center' }}>
            <span style={{ fontSize: 10, color: '#4a4660' }}>↑↓ naviga</span>
            <span style={{ fontSize: 10, color: '#4a4660' }}>↵ seleziona</span>
            <span style={{ fontSize: 10, color: '#4a4660' }}>esc chiudi</span>
          </div>
        </div>
      </div>
    </>
  );
}
