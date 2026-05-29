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
  return <>{children}</>;
}
