import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

// One place for a row's details and its destructive action.
// Phone (≤640px): sheet rising from the bottom. Desktop: panel on the right.
// Closes on backdrop tap, Esc, or dragging the handle down.
export default function DetailSheet({ open, onClose, avatar, title, subtitle, amount, rows = [], danger, children }) {
  const sheetRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const dragStart = useRef(null);
  const [armed, setArmed] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    setArmed(false);
    setOffset(0);
    const previous = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sheetRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (previous && previous.focus) previous.focus();
    };
  }, [open]);

  // An armed delete disarms itself, so a stray second tap later cannot delete.
  useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  if (!open) return null;

  const onTouchStart = (e) => { dragStart.current = e.touches[0].clientY; };
  const onTouchMove = (e) => {
    if (dragStart.current != null) setOffset(Math.max(0, e.touches[0].clientY - dragStart.current));
  };
  const onTouchEnd = () => {
    if (offset > 80) closeRef.current();
    setOffset(0);
    dragStart.current = null;
  };

  return createPortal(
    <div className="m-sheet__backdrop" onClick={() => closeRef.current()}>
      <div ref={sheetRef} className="m-sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
        style={offset ? { transform: `translateY(${offset}px)` } : undefined}
        onClick={(e) => e.stopPropagation()}>
        <div className="m-sheet__top" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <div className="m-sheet__grab" />
          <div className="m-sheet__head">
            {avatar}
            <div className="m-sheet__titles">
              <div className="m-sheet__title">{title}</div>
              {subtitle && <div className="m-sheet__subtitle">{subtitle}</div>}
            </div>
            <button type="button" className="m-sheet__close" aria-label="Close" onClick={() => closeRef.current()}>
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>
        {amount && <div className="m-sheet__amount">{amount}</div>}
        <dl className="m-sheet__rows">
          {rows.filter(r => r && r.value != null && r.value !== '').map(r => (
            <div className="m-sheet__row" key={r.label}><dt>{r.label}</dt><dd>{r.value}</dd></div>
          ))}
        </dl>
        {children}
        {danger && (
          <button type="button" className={`m-sheet__danger ${armed ? 'is-armed' : ''}`}
            onClick={() => (armed ? danger.onConfirm() : setArmed(true))}>
            {armed ? (danger.confirmLabel || 'Confirm delete') : danger.label}
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
