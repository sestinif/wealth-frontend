import React, { useId } from 'react';

// Catmull-Rom -> cubic bezier: turns even steppy real-world data into a
// smooth, organic curve (the difference between "premium" and "homemade").
function smoothPath(pts) {
  if (pts.length < 2) return '';
  const t = 0.16; // tension
  const d = [`M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) * t;
    const c1y = p1[1] + (p2[1] - p0[1]) * t;
    const c2x = p2[0] - (p3[0] - p1[0]) * t;
    const c2y = p2[1] - (p3[1] - p1[1]) * t;
    d.push(`C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`);
  }
  return d.join(' ');
}

// Smooth area sparkline. Edges are softened by a horizontal mask (set in CSS)
// so it never collides with adjacent cell borders.
export default function Sparkline({ data = [], color = '#2dd17f', className = 'hero-stat__spark', style }) {
  const gid = useId();
  const pts = (data || []).filter(v => typeof v === 'number' && isFinite(v));
  if (pts.length < 2) return null;

  const W = 100, H = 32, pad = 4;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = (max - min) || 1;

  const coords = pts.map((v, i) => {
    const x = (i / (pts.length - 1)) * W;
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return [x, y];
  });
  const line = smoothPath(coords);
  const area = `${line} L${W},${H} L0,${H} Z`;
  const id = `spark-${gid.replace(/:/g, '')}`;

  return (
    <div className={className} style={style} aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}
