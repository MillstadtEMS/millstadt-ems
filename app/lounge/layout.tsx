import type { Metadata, Viewport } from "next";

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
    <>
      {/* Hard mobile guardrails. The lounge sections are app-like on
          phones (bottom tab bar via LoungeShell, single-pane Messenger,
          etc.), so we cap content to the viewport and forbid any
          accidental horizontal overflow that older sections might
          introduce. The "View desktop site" toggle in the More drawer
          flips a data-attribute that disables these rules. */}
      <style>{`
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
      `}</style>
      {children}
    </>
  );
}
