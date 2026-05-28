import { useState, useEffect, useRef } from 'react';

// Render the currency symbol smaller & dimmed (.num__sym) while keeping
// sign and digits at full weight — a classic premium fintech detail.
const renderPrefix = (p) =>
  [...p].map((ch, i) =>
    ch === '€' || ch === '$'
      ? <span key={i} className="num__sym">{ch}</span>
      : ch
  );

export default function AnimatedNumber({ value, prefix = '', suffix = '', duration = 800, decimals = 2, className = '', style = {} }) {
  const [display, setDisplay] = useState(0);
  const [flash, setFlash] = useState('');
  const prevValue = useRef(0);
  const frameRef = useRef(null);
  const flashTimer = useRef(null);

  useEffect(() => {
    const start = prevValue.current;
    const end = typeof value === 'number' ? value : parseFloat(value) || 0;

    // Tick flash on change — skip the initial 0 -> value mount animation.
    if (start !== 0 && end !== start) {
      const dir = end > start ? 'num--up' : 'num--down';
      setFlash('');
      // Force the class to re-apply so the animation restarts every tick.
      requestAnimationFrame(() => setFlash(dir));
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(''), 700);
    }

    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(start + (end - start) * eased);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        prevValue.current = end;
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [value, duration]);

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const formatted = display.toLocaleString('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span
      className={`${className} ${flash}`.trim()}
      style={{ fontVariantNumeric: 'tabular-nums', ...style }}
    >
      {renderPrefix(prefix)}{formatted}{suffix}
    </span>
  );
}
