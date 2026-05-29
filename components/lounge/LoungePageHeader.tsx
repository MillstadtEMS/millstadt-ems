"use client";

/**
 * Shared page header for lounge sub-pages.
 *
 * Replaces the ad-hoc inline-styled "kicker / title / description" blocks
 * scattered across About Me, Certs, My File, Hospitals, Maintenance, Truck
 * Wash, Incidents, etc. Two variants:
 *
 * - default: typographic header with gold Mono kicker + Geist display title
 *   + optional muted description + optional trailing actions slot.
 *
 * - photo: same content, layered over a tinted brand photo (e.g. the patient
 *   compartment shot on /maintenance). The photo lives behind a dark veil
 *   so the copy stays legible without fighting for attention.
 */

import type { ReactNode } from "react";

interface Props {
  kicker?: string;
  title: ReactNode;
  description?: ReactNode;
  photo?: string;
  /** Where on the photo to focus (CSS object-position). Defaults to "center 45%". */
  photoPosition?: string;
  /** Optional right-aligned slot for actions or chips. */
  actions?: ReactNode;
  /** Optional class on the outer element if a page wants to override spacing. */
  className?: string;
}

export default function LoungePageHeader({
  kicker,
  title,
  description,
  photo,
  photoPosition = "center 45%",
  actions,
  className,
}: Props) {
  const isPhoto = Boolean(photo);
  return (
    <header className={`mas-page-header ${isPhoto ? "is-photo" : "is-flat"} ${className ?? ""}`.trim()}>
      <style>{HEADER_CSS}</style>
      {isPhoto && (
        <>
          <div
            className="mas-page-header-photo"
            style={{
              backgroundImage: `url('${photo}')`,
              backgroundPosition: photoPosition,
            }}
            aria-hidden
          />
          <div className="mas-page-header-veil" aria-hidden />
        </>
      )}
      <div className="mas-page-header-inner">
        <div className="mas-page-header-copy">
          {kicker && <span className="mas-page-header-kicker">{kicker}</span>}
          <h1 className="mas-page-header-title">{title}</h1>
          {description && <p className="mas-page-header-desc">{description}</p>}
        </div>
        {actions && <div className="mas-page-header-actions">{actions}</div>}
      </div>
    </header>
  );
}

const HEADER_CSS = `
.mas-page-header {
  position: relative;
  isolation: isolate;
  border-radius: var(--mas-r-3, 14px);
  border: 1px solid var(--mas-border, rgba(248,250,252,0.07));
  background: var(--mas-surface-1, #081626);
  padding: 22px 24px;
  margin-bottom: 20px;
  overflow: hidden;
  box-shadow: var(--mas-shadow-1, 0 1px 0 rgba(255,255,255,0.04) inset, 0 1px 2px rgba(0,0,0,0.24));
  animation: mas-page-header-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
}
.mas-page-header.is-photo {
  min-height: 168px;
  display: flex; align-items: flex-end;
  padding: 28px;
  border-color: var(--mas-border-strong, rgba(248,250,252,0.14));
  box-shadow: var(--mas-shadow-3, 0 1px 0 rgba(255,255,255,0.04) inset, 0 22px 56px rgba(0,0,0,0.45));
}
.mas-page-header-photo {
  position: absolute; inset: 0;
  background-size: cover;
  background-repeat: no-repeat;
  filter: saturate(0.92);
  z-index: 0;
}
.mas-page-header-veil {
  position: absolute; inset: 0;
  background:
    linear-gradient(95deg, rgba(4,13,26,0.92) 0%, rgba(4,13,26,0.68) 48%, rgba(4,13,26,0.10) 92%);
  z-index: 0;
}
.mas-page-header.is-photo::after {
  content: "";
  position: absolute; left: 0; right: 0; bottom: 0; height: 2px;
  background: linear-gradient(90deg, var(--mas-brand-gold, #f0b429), transparent 65%);
  z-index: 1;
}
.mas-page-header-inner {
  position: relative;
  z-index: 1;
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 24px;
  width: 100%;
  flex-wrap: wrap;
}
.mas-page-header-copy { min-width: 0; max-width: 680px; }
.mas-page-header-kicker {
  display: block;
  color: var(--mas-brand-gold, #f0b429);
  font-family: var(--font-mas-mono, ui-monospace, monospace);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 600;
}
.mas-page-header-title {
  margin: 6px 0 0;
  font-family: var(--font-mas-display, inherit);
  color: var(--mas-ink, #f8fafc);
  font-size: clamp(1.65rem, 2.6vw, 2.1rem);
  line-height: 1.12;
  letter-spacing: -0.02em;
  font-weight: 700;
}
.mas-page-header-desc {
  margin: 10px 0 0;
  color: var(--mas-ink-muted, #cbd5e1);
  font-size: 0.94rem;
  line-height: 1.55;
  max-width: 60ch;
}
.mas-page-header-actions {
  flex-shrink: 0;
  display: flex; gap: 8px; flex-wrap: wrap;
  align-items: center;
}

@keyframes mas-page-header-in {
  from { opacity: 0; transform: translate3d(0, 6px, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
}

@media (max-width: 720px) {
  .mas-page-header { padding: 18px 18px; margin-bottom: 16px; }
  .mas-page-header.is-photo { padding: 22px 18px; min-height: 150px; }
  .mas-page-header-veil {
    background: linear-gradient(180deg, rgba(4,13,26,0.84) 0%, rgba(4,13,26,0.96) 100%);
  }
}
`;
