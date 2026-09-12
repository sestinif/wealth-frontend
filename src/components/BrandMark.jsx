import React from 'react';

/**
 * The Wealth mark — the same drawing as public/favicon.svg.
 *
 * The product used to show two unrelated logos: a violet gradient square
 * with a "W" inside the app (sidebar, login, setup, loading) and this
 * rising-line chart in the browser tab. One brand, one drawing.
 *
 * It paints its own rounded square and hairline, so the containers that
 * wrap it only handle size and spacing — no background, no glow.
 */
export default function BrandMark({ size = 30, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      role="img"
      aria-label="Wealth"
    >
      <rect width="512" height="512" rx="108" fill="#15151A" />
      <rect
        x="8"
        y="8"
        width="496"
        height="496"
        rx="100"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.10"
        strokeWidth="10"
      />
      <path
        d="M112 336 L208 240 L288 288 L400 144 L400 376 L112 376 Z"
        fill="#8B7BFF"
        fillOpacity="0.16"
      />
      <path
        d="M112 336 L208 240 L288 288 L400 144"
        fill="none"
        stroke="#8B7BFF"
        strokeWidth="40"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="400" cy="144" r="34" fill="#8B7BFF" />
    </svg>
  );
}
