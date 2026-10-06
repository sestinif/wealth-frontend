import React from 'react';

/**
 * The Wealth mark — the same drawing as public/favicon.svg.
 *
 * The product used to show two unrelated logos: a violet gradient square
 * with a "W" inside the app (sidebar, login, setup, loading) and this
 * rising-line chart in the browser tab. One brand, one drawing.
 *
 * It paints its own rounded square and edge, so the containers that
 * wrap it only handle size and spacing — no background, no glow.
 *
 * The tile is a shade lighter than the page and the edge is a real
 * white line: on a black bookmark bar the old near-black tile with a
 * thin violet stroke simply disappeared. The line is thick and bright
 * for the same reason — it has to read at 16px.
 */
export default function BrandMark({ size = 30, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Wealth"
    >
      <rect width="32" height="32" rx="7.5" fill="#1B1B24" />
      <rect
        x="0.9"
        y="0.9"
        width="30.2"
        height="30.2"
        rx="6.7"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.30"
        strokeWidth="1.6"
      />
      <path
        d="M7.5 21.5 L13 15.5 L18 18.5 L24.5 9.5"
        fill="none"
        stroke="#A3AEFF"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24.5" cy="9.5" r="3" fill="#A3AEFF" />
    </svg>
  );
}
