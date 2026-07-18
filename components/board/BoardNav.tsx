"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/board", label: "Financials", exact: true },
  { href: "/board/budget", label: "Budget" },
  { href: "/board/levy", label: "Levy" },
];

export default function BoardNav() {
  const path = usePathname() || "";
  return (
    <nav className="board-nav" aria-label="Primary">
      {ITEMS.map((it) => {
        const on = it.exact ? path === it.href : path.startsWith(it.href);
        return (
          <Link key={it.href} href={it.href} className={on ? "on" : ""} aria-current={on ? "page" : undefined}>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
