import React from 'react';

/**
 * LeeWay-owned brand assets, served from public/assets with the GitHub Pages
 * base path. No third-party model, Google AI Studio, or Gemini service is used.
 */
const asset = (name: string) => `${import.meta.env.BASE_URL}assets/${name}`;

export const LEEWAY_LOCK_EMBLEM = asset('leeway-lock-emblem.png');
export const LEEWAY_INDUSTRIES_MARK = asset('leeway-industries-mark.png');

/** Creator-supplied LeeWay Industries mark used at top-left of workspace pages. */
export function LeeWayIndustriesBrand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`leeway-brand ${compact ? 'leeway-brand--compact' : ''}`}>
      <img
        src={LEEWAY_INDUSTRIES_MARK}
        alt="LeeWay Industries"
        className="leeway-brand__mark"
        draggable={false}
      />
      <span className="leeway-brand__text">
        <span className="leeway-brand__name">LEEWAY</span>
        <span className="leeway-brand__sub">INDUSTRIES</span>
      </span>
    </span>
  );
}

/** Footer watermark: full logo beside the exact approved wording. */
export function LeeWayFooterBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`leeway-footer-brand ${compact ? 'leeway-footer-brand--compact' : ''}`}>
      <img
        src={LEEWAY_INDUSTRIES_MARK}
        alt="LeeWay Industries"
        className="leeway-footer-brand__mark"
        draggable={false}
      />
      <span className="leeway-footer-brand__divider" aria-hidden="true" />
      <span className="leeway-footer-brand__copy">
        <span className="leeway-footer-brand__title">Powered by Leeway Innovations</span>
        <span className="leeway-footer-brand__sub">A LeeWay Industries Product</span>
      </span>
    </div>
  );
}

/**
 * Screen 1. Only the Creator-supplied full LeeWay Industries logo is shown.
 * Loading is announced to assistive technology with hidden text; no other
 * logo, promotion, download, or fixed delay is used to conceal failures.
 */
export function LeeWayLoadingScreen() {
  return (
    <div className="lw-loader" role="status" aria-live="polite">
      <div className="lw-loader__grid" aria-hidden="true" />
      <div className="lw-loader__core">
        <img
          src={LEEWAY_INDUSTRIES_MARK}
          alt="LeeWay Industries loading"
          className="lw-loader__logo"
          draggable={false}
        />
      </div>
      <span className="sr-only">Loading LeeWay Device Bridge</span>
    </div>
  );
}
