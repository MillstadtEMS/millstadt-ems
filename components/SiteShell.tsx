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
  // Routes that render their own full chrome (their own header/sidebar) and
  // must NOT also get the public site header. /admin uses the same LoungeShell
  // as /lounge, so it belongs here too — otherwise the global CAD ticker +
  // weather nav stacks on top of the lounge sidebar and overlaps page content.
  const standalone =
    pathname.startsWith("/truckcheck") ||
    pathname.startsWith("/inventory") ||
    pathname.startsWith("/lounge") ||
    pathname.startsWith("/admin");

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
    </>
  );
}
