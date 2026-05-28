"use client";

import { usePathname } from "next/navigation";

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
    pathname.startsWith("/truckcheck") || pathname.startsWith("/inventory");

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
      <main className="flex-1 w-full overflow-x-hidden" style={{ paddingTop: "120px" }}>
        {children}
      </main>
      {footer}
    </>
  );
}
