import React, { useId } from 'react';

// Tiny dependency-free area sparkline. Fills the lower band of a hero stat
// to add craft and at-a-glance trend — the Mercury/Ramp "data card" look.
export default function Sparkline({ data = [], color = '#2dd17f', className = 'hero-stat__spark', style }) {
  const gid = useId();
  const pts = (data || []).filter(v => typeof v === 'number' && isFinite(v));
  if (pts.length < 2) return null;

  const W = 100, H = 32, pad = 3;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = (max - min) || 1;

  const coords = pts.map((v, i) => {
    const x = (i / (pts.length - 1)) * W;
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return [x, y];
  });
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  const id = `spark-${gid.replace(/:/g, '')}`;

  return (
    <div className={className} style={style} aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.26" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
