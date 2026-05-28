import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Truck Check — Millstadt EMS",
  description: "Daily ambulance inspection — Millstadt Ambulance Service",
  manifest: "/truckcheck/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Truck Check",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#040d1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function TruckCheckLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
