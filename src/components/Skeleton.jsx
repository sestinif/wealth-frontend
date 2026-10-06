import React from 'react';

// Shimmer block. Reuses the .skeleton (shimmer) + .skel (layout) classes.
export function Skel({ w = '100%', h = 12, r = 6, style = {} }) {
  return <span className="skeleton skel" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

// Mirrors the new Dashboard (title, two blocks, a row of figures, a list)
// so the load feels instant and intentional.
export function DashboardSkeleton() {
  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <Skel w={200} h={24} />
      </div>

      <div className="m-top">
        <Skel h={220} r={12} />
        <Skel h={220} r={12} />
      </div>

      <div style={{ display: 'flex', gap: 24, padding: '20px 0' }}>
        {[0, 1, 2].map(i => <Skel key={i} w={90} h={14} />)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[0, 1, 2, 3, 4].map(i => <Skel key={i} h={44} r={8} />)}
      </div>
    </>
  );
}

// Generic page skeleton for the secondary pages (Reports, Diary, Settings…).
export function PageSkeleton({ rows = 5 }) {
  return (
    <>
      <div className="hero-greeting" style={{ marginBottom: 20 }}>
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
