import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

/**
 * Lounge sub-layout.
 *
 * - Loads Geist + Geist Mono as the display + numeric faces (Inter is already
 *   loaded by the root layout as the body face).
 * - Publishes a design-token system as CSS variables (color, surface, ink,
 *   spacing, radius, shadow, motion) under `.lounge-root` so every lounge
 *   component can opt into the same rhythm via `var(--mas-…)`.
 * - Preserves the original mobile guardrails (max-width: 100vw, overflow-x
 *   gating) gated by the existing `data-lounge-view="desktop"` opt-out.
 *
 * Anything outside the lounge keeps its current Inter-only typography.
 */

const display = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mas-display",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const mono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mas-mono",
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#040d1a",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: { default: "Employee Lounge", template: "%s · MAS Lounge" },
  robots: "noindex,nofollow",
  manifest: "/lounge/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EMS Lounge",
    startupImage: ["/lounge/lounge-button.png"],
  },
  other: {
    "apple-touch-icon": "/lounge/lounge-button.png",
    "mobile-web-app-capable": "yes",
  },
};

export default function LoungeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`lounge-root ${display.variable} ${mono.variable}`}>
      <style>{LOUNGE_TOKENS}</style>
      {children}
    </div>
  );
}

/**
 * Token system — single source of truth for the lounge.
 *
 * Naming: `--mas-{family}-{tier}`.
 *   - ink:       text colors (primary, muted, soft, faint)
 *   - surface:   background tiers (base, raised, panel, well)
 *   - border:    hairline + emphasized hairlines
 *   - brand:     Millstadt navy + gold (matches livery)
 *   - signal:    semantic status (positive, warn, critical, info)
 *   - subject:   the 10 Wall subject tag tints, normalized here so Wall
 *                and any future widget reads them from one place
 *   - radius:    6 / 10 / 14 / 20 / 28
 *   - space:     4-px rhythm — 1..16
 *   - shadow:    soft / lifted / deep
 *   - ease:      cubic motion curves + standard durations
 *
 * Components that want the redesign opt in by reading `var(--mas-…)`. Older
 * inline-styled components keep working untouched.
 */
const LOUNGE_TOKENS = `
.lounge-root {
  /* Type stacks. Geist for display, Inter (from root) for body, Geist Mono for numbers/timestamps. */
  --mas-font-display: var(--font-mas-display), "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --mas-font-body: "Inter", var(--font-inter), ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --mas-font-mono: var(--font-mas-mono), ui-monospace, "SFMono-Regular", "JetBrains Mono", Menlo, monospace;

  /* Ink (text) */
  --mas-ink:         #f8fafc;
  --mas-ink-muted:   #cbd5e1;
  --mas-ink-soft:    #94a3b8;
  --mas-ink-faint:   #64748b;
  --mas-ink-on-light:#0c1c2e;

  /* Surface tiers */
  --mas-surface:     #040d1a;  /* App background */
  --mas-surface-1:   #081626;  /* Card */
  --mas-surface-2:   #0c1f33;  /* Elevated card */
  --mas-surface-well:#02060d;  /* Inputs, recessed wells */

  /* Borders */
  --mas-border:        rgba(248,250,252,0.07);
  --mas-border-strong: rgba(248,250,252,0.14);
  --mas-border-focus:  rgba(240,180,41,0.55);

  /* Brand (matches Unit 3926 livery) */
  --mas-brand-navy:   #0c2340;
  --mas-brand-gold:   #f0b429;
  --mas-brand-gold-2: #d49a16;

  /* Semantic */
  --mas-positive: #34d399;
  --mas-warn:     #fbbf24;
  --mas-critical: #f87171;
  --mas-info:     #7dd3fc;

  /* Wall subject tints — kept here so any widget can render the same chip. */
  --mas-subj-announcements: #f0b429;
  --mas-subj-new-hires:     #86efac;
  --mas-subj-promotions:    #a78bfa;
  --mas-subj-saves:         #fb7185;
  --mas-subj-training:      #7dd3fc;
  --mas-subj-community:     #fcd34d;
  --mas-subj-equipment:     #fdba74;
  --mas-subj-chief:         #fecaca;
  --mas-subj-shift:         #a5f3fc;
  --mas-subj-recognition:   #fef3c7;

  /* Radius */
  --mas-r-1: 6px;
  --mas-r-2: 10px;
  --mas-r-3: 14px;
  --mas-r-4: 20px;
  --mas-r-5: 28px;
  --mas-r-pill: 999px;

  /* Spacing — 4-px rhythm */
  --mas-s-1: 4px;
  --mas-s-2: 8px;
  --mas-s-3: 12px;
  --mas-s-4: 16px;
  --mas-s-5: 20px;
  --mas-s-6: 24px;
  --mas-s-7: 32px;
  --mas-s-8: 40px;
  --mas-s-9: 56px;
  --mas-s-10: 72px;
  --mas-s-11: 96px;

  /* Shadows — soft, layered, never gaudy */
  --mas-shadow-1: 0 1px 0 rgba(255,255,255,0.04) inset, 0 1px 2px rgba(0,0,0,0.24);
  --mas-shadow-2: 0 1px 0 rgba(255,255,255,0.04) inset, 0 10px 24px rgba(0,0,0,0.30);
  --mas-shadow-3: 0 1px 0 rgba(255,255,255,0.04) inset, 0 22px 56px rgba(0,0,0,0.45);

  /* Motion */
  --mas-ease:  cubic-bezier(0.22, 1, 0.36, 1);
  --mas-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --mas-fast:  120ms;
  --mas-base:  220ms;
  --mas-slow:  360ms;
}

/* Body face for everything inside the lounge root. */
.lounge-root {
  font-family: var(--mas-font-body);
  color: var(--mas-ink);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* Headings reach for the display face by default; opt out with a class. */
.lounge-root h1,
.lounge-root h2,
.lounge-root h3,
.lounge-root h4,
.lounge-root .mas-display {
  font-family: var(--mas-font-display);
  letter-spacing: -0.012em;
  font-feature-settings: "ss01", "cv11";
}

/* Numeric / monospaced surfaces — counts, timestamps, scoreboards. */
.lounge-root .mas-mono,
.lounge-root .mas-numeric {
  font-family: var(--mas-font-mono);
  font-feature-settings: "tnum", "zero";
  letter-spacing: 0;
}

/* Hard mobile guardrails. Lounge sections are app-like on phones (bottom
   tab bar via LoungeShell, single-pane Messenger, etc.), so we cap content
   to the viewport and forbid any accidental horizontal overflow. The
   "View desktop site" toggle in the More drawer flips a data-attribute
   that disables these rules. */
html, body { max-width: 100vw; }
@media (max-width: 899px) {
  html:not([data-lounge-view="desktop"]) body { overflow-x: hidden; }
  html:not([data-lounge-view="desktop"]) main img,
  html:not([data-lounge-view="desktop"]) main video {
    max-width: 100%;
    height: auto;
  }
  html:not([data-lounge-view="desktop"]) main {
    max-width: 100vw;
    overflow-x: hidden;
  }
  html:not([data-lounge-view="desktop"]) main *,
  html:not([data-lounge-view="desktop"]) main *::before,
  html:not([data-lounge-view="desktop"]) main *::after {
    box-sizing: border-box;
  }
}
html[data-lounge-view="desktop"] body {
  min-width: 1100px;
}

/* Honor reduced-motion preferences across the lounge. */
@media (prefers-reduced-motion: reduce) {
  .lounge-root * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;
