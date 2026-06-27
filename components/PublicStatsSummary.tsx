"use client";

/**
 * Homepage call-statistics section — collapsible "drop down" rows. Each
 * top-level percentage (Medical / Trauma / Fire Response / Uncategorized)
 * is a button; tapping it drops down the individual categories with their
 * percentages. Cardiac Arrest is NOT its own row — those calls count
 * inside Medical and Trauma. Self-contained; never touches the hero.
 */

import Link from "next/link";
import { useState, useEffect } from "react";

interface GroupCat { name: string; count: number; pct: number }
interface ClassGroup { count: number; pct: number; categories: GroupCat[] }
interface FireStat { count: number; pct: number }
interface Stats {
  year: number;
  total: number;
  groups: { trauma: ClassGroup; medical: ClassGroup; uncategorized: ClassGroup };
  fire: { count: number; pct: number; still: FireStat; first: FireStat; other: FireStat };
}

interface DropRow { key: string; label: string; count: number; pct: number; accent: string; items: GroupCat[] }

export default function PublicStatsSummary() {
  const [data, setData] = useState<Stats | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/cad/stats", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (alive) setData(d); })
        .catch(() => {});
    load();
    const id = setInterval(load, 45_000); // keep the dropdowns live
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!data || data.total === 0) return null;

  const rows: DropRow[] = [
    { key: "medical", label: "Medical", count: data.groups.medical.count, pct: data.groups.medical.pct, accent: "#86efac", items: data.groups.medical.categories },
    { key: "trauma", label: "Trauma", count: data.groups.trauma.count, pct: data.groups.trauma.pct, accent: "#fca5a5", items: data.groups.trauma.categories },
    {
      key: "fire", label: "Fire Response", count: data.fire.count, pct: data.fire.pct, accent: "#fdba74",
      items: [
        { name: "Still Alarm", count: data.fire.still.count, pct: data.fire.still.pct },
        { name: "1st Alarm", count: data.fire.first.count, pct: data.fire.first.pct },
        ...(data.fire.other.count > 0 ? [{ name: "Other", count: data.fire.other.count, pct: data.fire.other.pct }] : []),
      ],
    },
    { key: "uncategorized", label: "Uncategorized", count: data.groups.uncategorized.count, pct: data.groups.uncategorized.pct, accent: "#94a3b8", items: data.groups.uncategorized.categories },
  ];

  return (
    <section className="bg-[#040d1a]" style={{ paddingTop: 28, paddingBottom: 28 }}>
      <div className="wrap" style={{ maxWidth: 760, marginLeft: "auto", marginRight: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <span style={{ height: 1, width: 30, background: "rgba(240,180,41,0.7)" }} />
          <span style={{ color: "#f0b429", fontSize: 11, fontWeight: 600, letterSpacing: "0.13em", textTransform: "uppercase" }}>
            {data.year} Year to Date · {data.total.toLocaleString()} calls
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginBottom: 14 }}>
          <h2 style={{ color: "white", fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>Call Statistics</h2>
          <Link href="/statistics" style={{ color: "#f0b429", fontSize: 13, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
            Full statistics →
          </Link>
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((r) => {
            const isOpen = !!open[r.key];
            return (
              <div key={r.key} style={{ background: "#071428", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => setOpen((o) => ({ ...o, [r.key]: !o[r.key] }))}
                  aria-expanded={isOpen}
                  style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "13px 15px", width: "100%", boxSizing: "border-box" }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span aria-hidden style={{ color: "#64748b", fontSize: 12, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s", display: "inline-block" }}>▶</span>
                    <span style={{ color: r.accent, fontSize: 15, fontWeight: 700 }}>{r.label}</span>
                    <span style={{ color: "#64748b", fontSize: 12 }}>{r.count}</span>
                  </span>
                  <span style={{ color: "white", fontSize: 19, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{r.pct.toFixed(1)}%</span>
                </button>
                {isOpen && (
                  <div style={{ padding: "2px 15px 14px", display: "grid", gap: 7, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    {r.items.length === 0 ? <span style={{ color: "#475569", fontSize: 12, paddingTop: 8 }}>None.</span> :
                      r.items.map((c) => (
                        <div key={c.name} style={{ marginTop: 6 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3, gap: 8 }}>
                            <span style={{ color: "#cbd5e1", fontWeight: 600 }}>{c.name}</span>
                            <span style={{ color: "#94a3b8", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{c.count}<span style={{ color: "#475569" }}> · {c.pct.toFixed(1)}%</span></span>
                          </div>
                          <div style={{ height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>
                            <div style={{ height: "100%", width: `${Math.min(100, c.pct)}%`, background: r.accent, borderRadius: 4, opacity: 0.85 }} />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
