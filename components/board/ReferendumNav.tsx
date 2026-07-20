"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { section: "overview", href: "/board/referendum", label: "Budget", exact: true },
  { section: "levy", href: "/board/referendum/levy", label: "Levy" },
  { section: "staffing", href: "/board/referendum/staffing", label: "Staffing" },
  { section: "fleet", href: "/board/referendum/fleet", label: "Fleet" },
  { section: "debt", href: "/board/referendum/debt", label: "Debt" },
  { section: "forecast", href: "/board/referendum/forecast", label: "Forecast" },
  { section: "detail", href: "/board/referendum/detailed", label: "Detail" },
];

export default function ReferendumNav({ visibleSections }: { visibleSections: string[] }) {
  const path = usePathname() || "";
  const items = ITEMS.filter((item) => visibleSections.includes(item.section));
  return (
    <nav className="board-subnav" aria-label="Budget sections">
      {items.map((it) => {
        const on = it.exact ? path === it.href : path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} className={on ? "on" : ""} aria-current={on ? "page" : undefined}>{it.label}</Link>
        );
      })}
    </nav>
  );
}
