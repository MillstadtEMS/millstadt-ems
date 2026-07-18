"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BoardNav({ isAdmin = false, showMeetings = true }: { isAdmin?: boolean; showMeetings?: boolean }) {
  const path = usePathname() || "";
  const items = [
    { href: "/board", label: "Home", exact: true },
    ...(showMeetings ? [{ href: "/board/meetings", label: "Meetings" }] : []),
    { href: "/board/referendum", label: "Referendum" },
    ...(isAdmin ? [{ href: "/board/admin", label: "Admin" }] : []),
  ];
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
