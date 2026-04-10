import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Inventory", template: "%s · MAS Inventory" },
  robots: "noindex,nofollow",
};

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
