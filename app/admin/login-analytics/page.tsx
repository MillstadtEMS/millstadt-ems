"use client";

/**
 * Admin · Login Activity
 *
 * Shows every employee with their most recent successful sign-in and
 * total attempt counts. Crew who have never signed in are flagged so
 * leadership can follow up. Filter chips narrow by:
 *   - Never signed in
 *   - Signed in within last 7 / 30 days
 *   - Stale (no sign-in in 30+ days)
 *
 * Mobile-first: rows wrap, filters wrap, sort flips to a stack on
 * narrow screens.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface LoginRow {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  certification: string | null;
  isAdmin: boolean;
  isActive: boolean;
  lastSuccessAt: string | null;
  lastSuccessIp: string | null;
  lastSuccessUa: string | null;
  successCount: number;
  lastFailAt: string | null;
  failCount: number;
}

type Filter = "all" | "never" | "active7" | "active30" | "stale30";

function fmtDateTime(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("en-US", {
    dateStyle: "medium", timeStyle: "short", timeZone: "America/Chicago",
  });
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

function shortUa(ua: string | null): string {
  if (!ua) return "—";
  if (/iphone|ipad/i.test(ua)) return "iPhone/iPad";
  if (/android/i.test(ua))     return "Android";
  if (/macintosh/i.test(ua))   return "Mac";
  if (/windows/i.test(ua))     return "Windows";
  return "Other";
}

export default function LoginAnalyticsPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ isAdmin: boolean } | null>(null);
  const [rows, setRows] = useState<LoginRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/lounge/me").then(async (r) => {
      if (!r.ok) { router.push("/lounge/login"); return; }
      const d = await r.json();
      if (!d.employee?.isAdmin) { router.push("/lounge"); return; }
      setMe(d.employee);
    });
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/login-analytics", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setRows(Array.isArray(d.employees) ? d.employees : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (me) load(); }, [me, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!r.isActive) return false;
      if (q) {
        const hay = `${r.firstName} ${r.lastName} ${r.username} ${r.certification ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const days = daysSince(r.lastSuccessAt);
      if (filter === "never")    return r.lastSuccessAt === null;
      if (filter === "active7")  return days !== null && days <= 7;
      if (filter === "active30") return days !== null && days <= 30;
      if (filter === "stale30")  return days !== null && days > 30;
      return true;
    });
  }, [rows, filter, search]);

  const counts = useMemo(() => {
    const active = rows.filter((r) => r.isActive);
    const never = active.filter((r) => !r.lastSuccessAt).length;
    const seven = active.filter((r) => {
      const d = daysSince(r.lastSuccessAt);
      return d !== null && d <= 7;
    }).length;
    const thirty = active.filter((r) => {
      const d = daysSince(r.lastSuccessAt);
      return d !== null && d <= 30;
    }).length;
    const stale = active.filter((r) => {
      const d = daysSince(r.lastSuccessAt);
      return d !== null && d > 30;
    }).length;
    return { total: active.length, never, seven, thirty, stale };
  }, [rows]);

  if (!me) return <p style={{ color: "#94a3b8", padding: 22 }}>Loading…</p>;

  return (
    <div>
      <header style={{ marginBottom: 18 }}>
        <div style={{ color: "#7dd3fc", fontSize: 11, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          Admin · Analytics
        </div>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.85rem", fontWeight: 900, letterSpacing: "-0.015em" }}>
          Login activity
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "0.92rem", marginTop: 4 }}>
          Who's actually using the lounge. Crew who never signed in get flagged so you can follow up.
        </p>
      </header>

      {/* Counters */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
        <Tile label="Active crew" value={counts.total} accent="#cbd5e1" />
        <Tile label="Never signed in" value={counts.never} accent="#fca5a5" />
        <Tile label="Active · 7 days" value={counts.seven} accent="#34d399" />
        <Tile label="Active · 30 days" value={counts.thirty} accent="#7dd3fc" />
        <Tile label="Stale · 30+ days" value={counts.stale} accent="#fcd34d" />
      </div>

      {/* Filter chips + search */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {[
          { v: "all" as const,      label: "All" },
          { v: "never" as const,    label: `Never (${counts.never})` },
          { v: "active7" as const,  label: `Last 7d` },
          { v: "active30" as const, label: `Last 30d` },
          { v: "stale30" as const,  label: `Stale 30+d` },
        ].map((c) => (
          <button
            key={c.v}
            type="button"
            onClick={() => setFilter(c.v)}
            style={{ ...chip, ...(filter === c.v ? chipOn : chipOff) }}
          >
            {c.label}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name / username / cert…"
          style={{ flex: 1, minWidth: 200, background: "#071428", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: "8px 12px", color: "white", fontSize: 13, fontFamily: "inherit" }}
        />
      </div>

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "#94a3b8" }}>Nobody matches the current filter.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
          {filtered.map((r) => {
            const days = daysSince(r.lastSuccessAt);
            const tone =
              !r.lastSuccessAt ? rose :
              days! <= 7       ? emerald :
              days! <= 30      ? sky :
              amber;
            return (
              <li key={r.id} style={{ ...rowCard, borderLeft: `3px solid ${tone}` }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  <Link href={`/admin/filing-cabinet/${r.id}`} style={{ color: "white", textDecoration: "none", flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 900, fontSize: 14 }}>
                      {r.firstName} {r.lastName}{r.isAdmin && <span style={{ color: "#a78bfa", marginLeft: 6 }}>★</span>}
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
                      @{r.username}{r.certification ? ` · ${r.certification}` : ""}
                    </div>
                  </Link>
                  <div style={{ minWidth: 160 }}>
                    <div style={{ color: "#94a3b8", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 800 }}>Last sign-in</div>
                    <div style={{ color: r.lastSuccessAt ? "white" : "#fca5a5", fontSize: 13, fontWeight: 700 }}>{fmtDateTime(r.lastSuccessAt)}</div>
                    {r.lastSuccessAt && days !== null && (
                      <div style={{ color: "#94a3b8", fontSize: 11 }}>
                        {days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`}
                        {r.lastSuccessUa ? ` · ${shortUa(r.lastSuccessUa)}` : ""}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 14, color: "#94a3b8", fontSize: 12 }}>
                    <span><strong style={{ color: "white", fontWeight: 900 }}>{r.successCount}</strong> signs</span>
                    {r.failCount > 0 && <span><strong style={{ color: "#fca5a5", fontWeight: 900 }}>{r.failCount}</strong> failed</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div style={{ background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ color: accent, fontSize: 10, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: "white", fontSize: 26, fontWeight: 900, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

const chip: React.CSSProperties = {
  border: "1px solid", borderRadius: 999, padding: "6px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.10em", textTransform: "uppercase",
};
const chipOn: React.CSSProperties = { borderColor: "#f0b429", color: "#040d1a", background: "#f0b429" };
const chipOff: React.CSSProperties = { borderColor: "rgba(255,255,255,0.12)", color: "#cbd5e1", background: "transparent" };
const rowCard: React.CSSProperties = {
  padding: "12px 14px", background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12,
};
const emerald = "#34d399";
const sky = "#7dd3fc";
const amber = "#fcd34d";
const rose = "#fca5a5";
