"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/board", label: "Financials", exact: true },
  { href: "/board/budget", label: "Budget" },
  { href: "/board/cashflow", label: "Cash Flow" },
  { href: "/board/levy", label: "Levy" },
];

export default function BoardNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const path = usePathname() || "";
  const items = isAdmin ? [...ITEMS, { href: "/board/admin", label: "Admin" }] : ITEMS;
  return (
    <nav className="board-nav" aria-label="Primary">
      {items.map((it) => {
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
