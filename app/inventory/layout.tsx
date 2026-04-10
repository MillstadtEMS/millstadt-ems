import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#020617",
};

export const metadata: Metadata = {
  title: { default: "Inventory", template: "%s · MAS Inventory" },
  robots: "noindex,nofollow",
  manifest: "/inventory-manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MAS Inventory",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
  },
};

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
