import React from 'react';

// Shimmer block. Reuses the .skeleton (shimmer) + .skel (layout) classes.
export function Skel({ w = '100%', h = 12, r = 6, style = {} }) {
  return <span className="skeleton skel" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

// Mirrors the real dashboard layout so the load feels instant & intentional,
// rather than a generic "CARICAMENTO..." flash.
export function DashboardSkeleton() {
  return (
    <>
      <div className="hero-greeting" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <Skel w={220} h={22} />
          <Skel w={300} h={12} />
        </div>
        <Skel w={120} h={28} r={7} />
      </div>

      <div className="skel-hero">
        {[0, 1, 2].map(i => (
          <div key={i} className="skel-hero__cell">
            <Skel w={90} h={9} />
            <Skel w={160} h={30} />
            <Skel w={70} h={11} />
          </div>
        ))}
      </div>

      <div className="section-header">
        <Skel w={180} h={10} />
        <Skel w={96} h={20} r={6} />
      </div>

      <div className="skel-strip">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="skel-strip__row">
            <Skel w={62} h={18} r={5} />
            <Skel w={80} h={12} />
            <Skel w={56} h={12} />
            <Skel w={92} h={12} />
            <Skel w={70} h={12} />
            <Skel w={32} h={18} r={9} />
          </div>
        ))}
      </div>
    </>
  );
}

// Generic page skeleton for the secondary pages (Reports, Diary, Settings…).
export function PageSkeleton({ rows = 5 }) {
  return (
    <>
      <div className="hero-greeting" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <Skel w={200} h={20} />
          <Skel w={260} h={12} />
        </div>
      </div>
      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skel w={`${40 + (i % 3) * 12}%`} h={12} />
              <Skel w={70} h={12} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
