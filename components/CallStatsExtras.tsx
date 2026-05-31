"use client";

/**
 * Monthly + daily-average + projected-year-end stats that sit directly
 * underneath the CallVolumeCounter scoreboard on the homepage.
 *
 * Hydration-safe by construction: this component renders nothing until
 * `mounted` flips true inside useEffect — meaning SSR emits an empty
 * placeholder and the client only paints after first paint. No useState
 * initial value depends on `new Date()` during SSR, so there can be no
 * server/client timestamp mismatch.
 *
 * Tooltips are driven by React state (not CSS `:hover`) so they:
 *   - actually work on touch (mobile)
 *   - can be tested in headless browsers
 *   - close cleanly when the user clicks/taps anywhere else
 *
 * Numbers refresh every 60 s — add / edit / remove a call in the ticker
 * editor and these update without a page reload.
 *
 * Projection model: standard YTD-pace linear extrapolation. Matches the
 * visible "avg / day" number you can see on the page, so the math you
 * can do in your head agrees with what's printed.
 *      projected = round( (ytd / daysElapsed) * daysInYear )
 */

import { useEffect, useMemo, useRef, useState } from "react";

interface Call {
  id: string;
  dispatchDate: string;
  dispatchTime: string;
  dispatchNature: string;
  dispatchDatetime: string;
  sourceYear: number;
  completedAt: string | null;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type OpenTip = null | "monthly" | "avg";

export default function CallStatsExtras() {
  const [mounted, setMounted] = useState(false);
  const [calls, setCalls] = useState<Call[]>([]);
  const [now, setNow] = useState<Date | null>(null);
  const [openTip, setOpenTip] = useState<OpenTip>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Mount + fetch. Nothing here runs during SSR.
  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    async function load() {
      try {
        const r = await fetch("/api/cad/log", { cache: "no-store" });
        if (r.ok) {
          const data: Call[] = await r.json();
          setCalls(data);
        }
      } catch { /* silent */ }
    }
    load();
    const reloadId = setInterval(load, 60_000);
    const tickId   = setInterval(() => setNow(new Date()), 60_000);
    return () => { clearInterval(reloadId); clearInterval(tickId); };
  }, []);

  // Close popup when clicking outside the stats row.
  useEffect(() => {
    if (!openTip) return;
    function onDown(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpenTip(null);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openTip]);

  const stats = useMemo(() => {
    if (!now) return null;
    const monthCounts = new Map<string, number>();
    for (const c of calls) {
      const m = c.dispatchDate.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
      if (!m) continue;
      const key = `${m[3]}-${m[1]}`; // YYYY-MM
      monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
    }
    const y = now.getFullYear();
    const monthIdx = now.getMonth();
    const thisKey = `${y}-${String(monthIdx + 1).padStart(2, "0")}`;
    const thisMonthCount = monthCounts.get(thisKey) ?? 0;

    // Days math (calendar-day based, local time — same as a human would count).
    const yearStart = new Date(y, 0, 1);
    const yearEnd = new Date(y + 1, 0, 1);
    const daysInYear = Math.round((yearEnd.getTime() - yearStart.getTime()) / 86_400_000);

    // Day-of-year: 1 on Jan 1, 60 on Mar 1 (non-leap), 150 on May 30.
    const dayOfYear = Math.floor((now.getTime() - yearStart.getTime()) / 86_400_000) + 1;
    const elapsedDays = Math.max(1, dayOfYear);

    let ytdTotal = 0;
    for (let i = 0; i <= monthIdx; i++) {
      const key = `${y}-${String(i + 1).padStart(2, "0")}`;
      ytdTotal += monthCounts.get(key) ?? 0;
    }

    const avgPerDay = ytdTotal / elapsedDays;
    const projected = ytdTotal > 0
      ? Math.round(avgPerDay * daysInYear)
      : 0;

    // Per-month breakdown — counts.
    const monthlyBreakdown: { month: string; count: number; isCurrent: boolean }[] = [];
    // Per-month breakdown — daily average (completed = full days-in-month;
    // current month = MTD using today's day-of-month).
    const dailyAvgByMonth: { month: string; avgPerDay: number; isCurrent: boolean }[] = [];
    for (let i = 0; i <= monthIdx; i++) {
      const key = `${y}-${String(i + 1).padStart(2, "0")}`;
      const count = monthCounts.get(key) ?? 0;
      const isCurrent = i === monthIdx;
      monthlyBreakdown.push({ month: MONTH_NAMES[i], count, isCurrent });
      const denom = isCurrent ? Math.max(1, now.getDate()) : new Date(y, i + 1, 0).getDate();
      dailyAvgByMonth.push({ month: MONTH_NAMES[i], avgPerDay: count / denom, isCurrent });
    }

    return {
      thisMonthCount,
      avgPerDay,
      projected,
      monthlyBreakdown,
      dailyAvgByMonth,
      monthLabel: MONTH_SHORT[monthIdx],
      year: y,
    };
  }, [calls, now]);

  if (!mounted || !stats) return null;
  if (stats.thisMonthCount === 0 && stats.projected === 0) return null;

  function toggle(which: OpenTip) {
    setOpenTip((cur) => (cur === which ? null : which));
  }

  return (
    <div
      ref={wrapperRef}
      style={{
        width: "100%",
        maxWidth: 720,
        margin: "26px auto 0",
        padding: "0 16px",
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 14,
        textAlign: "center",
        position: "relative",
      }}
    >
      <Stat
        number={stats.thisMonthCount.toLocaleString()}
        label={`This ${stats.monthLabel}`}
        accent="gold"
        clickable
        isOpen={openTip === "monthly"}
        onToggle={() => toggle("monthly")}
        tooltip={
          <PerMonthTable
            title={`${stats.year} · monthly totals`}
            accent="gold"
            rows={stats.monthlyBreakdown.map((m) => ({
              label: m.month,
              value: m.count.toLocaleString(),
              isCurrent: m.isCurrent,
            }))}
          />
        }
      />

      <Stat
        number={stats.avgPerDay.toFixed(1)}
        label="Avg / day"
        accent="sky"
        clickable
        isOpen={openTip === "avg"}
        onToggle={() => toggle("avg")}
        tooltip={
          <PerMonthTable
            title={`${stats.year} · avg / day by month`}
            accent="sky"
            rows={stats.dailyAvgByMonth.map((m) => ({
              label: m.month + (m.isCurrent ? "  (MTD)" : ""),
              value: m.avgPerDay.toFixed(1),
              isCurrent: m.isCurrent,
            }))}
          />
        }
      />

      <Stat
        number={stats.projected.toLocaleString()}
        label="Projected"
        accent="emerald"
        title="Year-end projection: year-to-date pace × days in year."
      />
    </div>
  );
}

// ── Stat tile ──────────────────────────────────────────────────────────

type Accent = "gold" | "sky" | "emerald";

function accentColor(a: Accent): string {
  return a === "gold" ? "#f0b429" : a === "sky" ? "#7dd3fc" : "#34d399";
}

function Stat({
  number,
  label,
  accent,
  clickable,
  isOpen,
  onToggle,
  tooltip,
  title,
}: {
  number: string;
  label: string;
  accent: Accent;
  clickable?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  tooltip?: React.ReactNode;
  title?: string;
}) {
  const tileStyle: React.CSSProperties = {
    background: "rgba(7,20,40,0.55)",
    border: `1px solid ${isOpen ? accentColor(accent) : "rgba(255,255,255,0.08)"}`,
    borderRadius: 14,
    padding: "16px 12px 14px",
    cursor: clickable ? "pointer" : "default",
    position: "relative",
    transition: "border-color 0.15s",
  };
  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onToggle : undefined}
      onKeyDown={(e) => { if (clickable && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onToggle?.(); } }}
      style={tileStyle}
      title={title}
      aria-expanded={clickable ? !!isOpen : undefined}
    >
      <div
        style={{
          color: accentColor(accent),
          fontWeight: 900,
          letterSpacing: "-0.02em",
          fontSize: "clamp(1.65rem, 4.5vw, 2.5rem)",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          textShadow: "0 2px 12px rgba(0,0,0,0.55)",
        }}
      >
        {number}
      </div>
      <div
        style={{
          marginTop: 6,
          color: "white",
          fontWeight: 700,
          fontSize: "clamp(0.7rem, 1.4vw, 0.8rem)",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          opacity: 0.85,
        }}
      >
        {label}
        {clickable && (
          <span
            aria-hidden
            style={{
              marginLeft: 6,
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: 999,
              background: accentColor(accent),
              opacity: 0.7,
            }}
          />
        )}
      </div>

      {isOpen && tooltip && (
        <div
          role="dialog"
          aria-modal="false"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            minWidth: 220,
            background: "#020912",
            border: `1px solid ${accentColor(accent)}40`,
            borderRadius: 12,
            boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
            padding: 12,
            textAlign: "left",
          }}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}

function PerMonthTable({
  title,
  accent,
  rows,
}: {
  title: string;
  accent: Accent;
  rows: { label: string; value: string; isCurrent: boolean }[];
}) {
  return (
    <div>
      <div
        style={{
          color: accentColor(accent),
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 4 }}>
        {rows.map((r) => (
          <li
            key={r.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 6px",
              borderRadius: 6,
              background: r.isCurrent ? `${accentColor(accent)}14` : "transparent",
              fontSize: 13,
              color: r.isCurrent ? "white" : "#cbd5e1",
              fontWeight: r.isCurrent ? 800 : 500,
            }}
          >
            <span>{r.label}</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
