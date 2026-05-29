"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * iOS/Android-style bottom tab bar. Renders only on mobile (CSS @media).
 * Five primary destinations + a "More" sheet for everything else. Tap
 * targets >= 48px, safe-area-inset padding for iPhone home indicator,
 * active state highlights the matching tab.
 */
type Tab = {
  href: string;
  label: string;
  icon: React.ReactNode;
  match: (path: string) => boolean;
};

const tabs: Tab[] = [
  {
    href: "/",
    label: "Home",
    match: (p) => p === "/",
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M12 3l9 8h-2v9h-5v-6H10v6H5v-9H3l9-8z" />
      </svg>
    ),
  },
  {
    href: "/about",
    label: "About",
    match: (p) => p === "/about" || p.startsWith("/leadership") || p.startsWith("/medical-control") || p.startsWith("/fleet"),
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
      </svg>
    ),
  },
  {
    href: "/contact",
    label: "Contact",
    match: (p) => p.startsWith("/contact"),
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
      </svg>
    ),
  },
  {
    href: "/news",
    label: "News",
    match: (p) => p.startsWith("/news") || p.startsWith("/whats-happening"),
    icon: (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-9 12H5v-2h6v2zm0-4H5v-2h6v2zm0-4H5V6h6v2zm5 8h-3v-6h3v6zm3-8h-5V6h5v2z" />
      </svg>
    ),
  },
];

const moreItems: { href: string; label: string }[] = [
  { href: "/leadership", label: "Leadership" },
  { href: "/medical-control", label: "Medical Control" },
  { href: "/fleet", label: "Fleet" },
  { href: "/careers", label: "Careers" },
  { href: "/services", label: "Services" },
  { href: "/coverage-area", label: "Coverage Area" },
  { href: "/community", label: "Community" },
  { href: "/kids-club", label: "Kids Club" },
  { href: "/gallery", label: "Gallery" },
  { href: "/testimonials", label: "Testimonials" },
  { href: "/weather", label: "Weather" },
  { href: "/traffic", label: "Traffic Conditions" },
  { href: "/movies", label: "Movies" },
  { href: "/senior-center", label: "Senior Center" },
  { href: "/links", label: "Quick Links" },
  { href: "/donations", label: "Donations" },
  { href: "/lounge", label: "Employee Lounge" },
];

export default function MobileTabBar() {
  const pathname = usePathname() || "/";
  const [moreOpen, setMoreOpen] = useState(false);

  const moreActive = !tabs.some((t) => t.match(pathname));

  return (
    <>
      <nav
        aria-label="Primary"
        className="mems-mobile-tabbar"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          background: "rgba(4,13,26,0.92)",
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
          borderTop: "1px solid rgba(240,180,41,0.18)",
          paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
          paddingTop: 8,
          display: "none",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            alignItems: "stretch",
            gap: 0,
          }}
        >
          {tabs.map((t) => {
            const active = t.match(pathname);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  minHeight: 56,
                  color: active ? "#f0b429" : "#94a3b8",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {t.icon}
                <span>{t.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              minHeight: 56,
              background: "transparent",
              border: 0,
              color: moreActive ? "#f0b429" : "#94a3b8",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
              cursor: "pointer",
            }}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
            <span>More</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="More navigation"
          onClick={() => setMoreOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            background: "rgba(2,6,12,0.62)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "flex-end",
            animation: "mems-sheet-fade 180ms ease-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxHeight: "82vh",
              overflowY: "auto",
              background: "#071428",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTop: "1px solid rgba(240,180,41,0.28)",
              paddingTop: 12,
              paddingBottom: "max(env(safe-area-inset-bottom), 18px)",
              boxShadow: "0 -24px 60px rgba(0,0,0,0.55)",
              animation: "mems-sheet-up 240ms cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <div
              aria-hidden
              style={{
                width: 44,
                height: 5,
                borderRadius: 999,
                background: "rgba(255,255,255,0.22)",
                margin: "4px auto 14px",
              }}
            />
            <div style={{ padding: "0 18px 6px" }}>
              <div
                style={{
                  color: "#f0b429",
                  fontSize: 11,
                  fontWeight: 900,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                More
              </div>
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: "0 12px" }}>
              {moreItems.map((it) => (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={() => setMoreOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 14px",
                      borderRadius: 14,
                      color: "#e2e8f0",
                      fontSize: 17,
                      fontWeight: 600,
                      textDecoration: "none",
                      background:
                        pathname.startsWith(it.href) && it.href !== "/"
                          ? "rgba(240,180,41,0.10)"
                          : "transparent",
                    }}
                  >
                    <span>{it.label}</span>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style={{ color: "#64748b" }}>
                      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              style={{
                display: "block",
                width: "calc(100% - 24px)",
                margin: "14px 12px 0",
                padding: "14px 16px",
                borderRadius: 14,
                background: "#040d1a",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "#f0b429",
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
