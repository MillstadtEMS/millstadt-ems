"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/board/referendum", label: "Overview", exact: true },
  { href: "/board/referendum/staffing", label: "Staffing" },
  { href: "/board/referendum/fleet", label: "Fleet" },
  { href: "/board/referendum/debt", label: "Debt" },
  { href: "/board/referendum/levy", label: "Levy Calculator" },
  { href: "/board/referendum/forecast", label: "Five-Year" },
  { href: "/board/referendum/detailed", label: "Detailed Model" },
];

export default function ReferendumNav() {
  const path = usePathname() || "";
  return (
    <nav className="board-subnav" aria-label="Referendum sections">
      {ITEMS.map((it) => {
        const on = it.exact ? path === it.href : path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} className={on ? "on" : ""} aria-current={on ? "page" : undefined}>{it.label}</Link>
        );
      })}
    </nav>
  );
}
