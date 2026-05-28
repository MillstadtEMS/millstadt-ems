import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#040d1a",
};

export const metadata: Metadata = {
  title: { default: "Employee Lounge", template: "%s · MAS Lounge" },
  robots: "noindex,nofollow",
};

export default function LoungeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
