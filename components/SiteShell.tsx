"use client";

import { usePathname } from "next/navigation";
import LoungeButton from "./LoungeButton";
import MobileTabBar from "./MobileTabBar";

export default function SiteShell({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const standalone =
    pathname.startsWith("/truckcheck") ||
    pathname.startsWith("/inventory") ||
    pathname.startsWith("/lounge");

  if (standalone) {
    return (
      <main className="flex-1 w-full overflow-x-hidden" style={{ paddingTop: 0 }}>
        {children}
      </main>
    );
  }

  return (
    <>
      {header}
      <main
        className="flex-1 w-full overflow-x-hidden mems-main-pad"
        style={{ paddingTop: "120px" }}
      >
        {children}
      </main>
      {footer}
      <LoungeButton />
      <MobileTabBar />
    </>
  );
}
