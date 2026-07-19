"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Database,
  FileCheck2,
  FileText,
  LayoutDashboard,
  Search,
  Users,
  X,
} from "lucide-react";

export interface BoardCommandItem {
  label: string;
  eyebrow: string;
  href: string;
  keywords?: string;
  adminOnly?: boolean;
  hidden?: boolean;
}

const ICONS: Record<string, typeof Search> = {
  Home: LayoutDashboard,
  Meetings: CalendarDays,
  Briefings: FileCheck2,
  Budget: Database,
  Documents: FileText,
  Administration: Users,
};

export default function BoardSearchPalette({
  items,
  isAdmin,
}: {
  items: BoardCommandItem[];
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isCombo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isCombo) {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 40);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((item) => !item.hidden && (!item.adminOnly || isAdmin))
      .filter((item) => {
        if (!q) return true;
        return `${item.label} ${item.eyebrow} ${item.keywords ?? ""}`.toLowerCase().includes(q);
      })
      .slice(0, 9);
  }, [items, isAdmin, query]);

  return (
    <>
      <button type="button" className="board-search-trigger" onClick={() => setOpen(true)}>
        <Search size={16} aria-hidden="true" />
        <span>Search records or actions</span>
        <kbd>⌘K</kbd>
      </button>

      {open && (
        <div className="board-command-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
          <section
            className="board-command"
            role="dialog"
            aria-modal="true"
            aria-label="Search records and commands"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="board-command-search">
              <Search size={18} aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search meetings, minutes, and documents..."
              />
              <button type="button" onClick={() => setOpen(false)} aria-label="Close search">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="board-command-meta">
              <span>Visible records only</span>
              <span>Meetings</span>
              <span>Minutes</span>
              {items.some((item) => item.label === "Documents") && <span>Documents</span>}
              {items.some((item) => item.label === "Board briefings") && <span>Briefings</span>}
            </div>

            <div className="board-command-results">
              {results.length === 0 && <div className="board-empty compact">Search returned no results.</div>}
              {results.map((item) => {
                const Icon = ICONS[item.eyebrow] ?? Search;
                return (
                  <Link key={`${item.href}-${item.label}`} href={item.href} onClick={() => setOpen(false)} className="board-command-row">
                    <span className="board-command-icon"><Icon size={17} aria-hidden="true" /></span>
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.eyebrow}</small>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
