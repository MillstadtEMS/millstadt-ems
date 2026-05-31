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
import { createPortal } from "react-dom";

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
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileAppLike = useMobileAppLike();

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
    function onDown(e: PointerEvent) {
      if (!wrapperRef.current) return;
      const target = e.target as Element | null;
      if (target?.closest("[data-callstats-popout='true']")) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpenTip(null);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
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

    // Per-month breakdown — counts. We iterate all 12 months so the
    // tooltip shows the whole year; future months render as "—" so it's
    // obvious there's no data yet.
    const monthlyBreakdown: { month: string; count: number; isCurrent: boolean; isFuture: boolean }[] = [];
    // Per-month breakdown — daily average (completed = full days-in-month;
    // current month = MTD using today's day-of-month; future = none).
    const dailyAvgByMonth: { month: string; avgPerDay: number; isCurrent: boolean; isFuture: boolean }[] = [];
    for (let i = 0; i < 12; i++) {
      const key = `${y}-${String(i + 1).padStart(2, "0")}`;
      const count = monthCounts.get(key) ?? 0;
      const isCurrent = i === monthIdx;
      const isFuture = i > monthIdx;
      monthlyBreakdown.push({ month: MONTH_NAMES[i], count, isCurrent, isFuture });
      const denom = isCurrent ? Math.max(1, now.getDate()) : new Date(y, i + 1, 0).getDate();
      dailyAvgByMonth.push({ month: MONTH_NAMES[i], avgPerDay: isFuture ? 0 : count / denom, isCurrent, isFuture });
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
  // Hover-open + hover-close-with-grace-period so the cursor can travel
  // from tile to tooltip without flicker.
  function openHover(which: OpenTip) {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
    setOpenTip(which);
  }
  function scheduleClose() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setOpenTip(null), 180);
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
        mobileAppLike={mobileAppLike}
        onToggle={() => toggle("monthly")}
        onHoverOpen={() => openHover("monthly")}
        onHoverClose={scheduleClose}
        tooltip={
          <PerMonthTable
            title={`${stats.year} · monthly totals`}
            accent="gold"
            rows={stats.monthlyBreakdown.map((m) => ({
              label: m.month,
              value: m.isFuture ? "—" : m.count.toLocaleString(),
              isCurrent: m.isCurrent,
              isFuture: m.isFuture,
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
        mobileAppLike={mobileAppLike}
        onToggle={() => toggle("avg")}
        onHoverOpen={() => openHover("avg")}
        onHoverClose={scheduleClose}
        tooltip={
          <PerMonthTable
            title={`${stats.year} · avg / day by month`}
            accent="sky"
            rows={stats.dailyAvgByMonth.map((m) => ({
              label: m.month + (m.isCurrent ? "  (MTD)" : ""),
              value: m.isFuture ? "—" : m.avgPerDay.toFixed(1),
              isCurrent: m.isCurrent,
              isFuture: m.isFuture,
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

function useMobileAppLike() {
  const [mobileAppLike, setMobileAppLike] = useState(false);

  useEffect(() => {
    function update() {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: fullscreen)").matches ||
        ("standalone" in window.navigator &&
          (window.navigator as Navigator & { standalone?: boolean }).standalone === true);
      const touch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
      const narrow = window.matchMedia("(max-width: 760px)").matches;
      setMobileAppLike(standalone || touch || narrow);
    }

    const queries = [
      window.matchMedia("(display-mode: standalone)"),
      window.matchMedia("(display-mode: fullscreen)"),
      window.matchMedia("(hover: none), (pointer: coarse)"),
      window.matchMedia("(max-width: 760px)"),
    ];
    update();
    for (const query of queries) query.addEventListener("change", update);
    window.addEventListener("orientationchange", update);
    window.addEventListener("resize", update);
    return () => {
      for (const query of queries) query.removeEventListener("change", update);
      window.removeEventListener("orientationchange", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return mobileAppLike;
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
  mobileAppLike,
  onToggle,
  onHoverOpen,
  onHoverClose,
  tooltip,
  title,
}: {
  number: string;
  label: string;
  accent: Accent;
  clickable?: boolean;
  isOpen?: boolean;
  mobileAppLike?: boolean;
  onToggle?: () => void;
  onHoverOpen?: () => void;
  onHoverClose?: () => void;
  tooltip?: React.ReactNode;
  title?: string;
}) {
  const tileRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => { setPortalReady(true); }, []);

  useEffect(() => {
    if (!isOpen || !mobileAppLike) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [isOpen, mobileAppLike]);

  // Recompute fixed coords when the tooltip is open. The stats row
  // sits inside the hero section which has overflow:hidden — using
  // position:fixed via a portal escapes that clip so 12 months show.
  useEffect(() => {
    if (!isOpen || !tileRef.current) return;
    function update() {
      if (!tileRef.current) return;
      const r = tileRef.current.getBoundingClientRect();
      setCoords({ top: r.bottom + 8, left: r.left + r.width / 2, width: r.width });
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isOpen]);

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
      ref={tileRef}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onToggle : undefined}
      onKeyDown={(e) => { if (clickable && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onToggle?.(); } }}
      onMouseEnter={clickable && !mobileAppLike ? onHoverOpen : undefined}
      onMouseLeave={clickable && !mobileAppLike ? onHoverClose : undefined}
      onFocus={clickable && !mobileAppLike ? onHoverOpen : undefined}
      onBlur={clickable && !mobileAppLike ? onHoverClose : undefined}
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

      {isOpen && tooltip && portalReady && (
        mobileAppLike
          ? createPortal(
            <div
              data-callstats-popout="true"
              role="presentation"
              onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                padding: "18px 12px max(env(safe-area-inset-bottom), 18px)",
                background: "rgba(2,9,18,0.66)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
              }}
            >
              <section
                role="dialog"
                aria-modal="false"
                aria-label={label}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "min(100%, 430px)",
                  maxHeight: "min(76vh, 620px)",
                  overflowY: "auto",
                  borderRadius: "24px 24px 18px 18px",
                  background:
                    "linear-gradient(180deg, rgba(7,20,40,0.98), rgba(2,9,18,0.98))",
                  border: `1px solid ${accentColor(accent)}55`,
                  boxShadow: "0 28px 70px rgba(0,0,0,0.72), inset 0 1px 0 rgba(255,255,255,0.08)",
                  padding: "10px 14px 14px",
                  textAlign: "left",
                }}
              >
                <div
                  aria-hidden
                  style={{
                    width: 46,
                    height: 5,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.22)",
                    margin: "0 auto 12px",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 10,
                    paddingBottom: 10,
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div>
                    <div style={{ color: accentColor(accent), fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                      {label}
                    </div>
                    <div style={{ color: "white", fontSize: 24, lineHeight: 1, fontWeight: 950, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                      {number}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onToggle}
                    style={{
                      minWidth: 76,
                      minHeight: 38,
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                      color: "white",
                      fontFamily: "inherit",
                      fontSize: 12,
                      fontWeight: 900,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                    }}
                  >
                    Close
                  </button>
                </div>
                {tooltip}
              </section>
            </div>,
            document.body,
          )
          : coords && createPortal(
            <div
              data-callstats-popout="true"
              role="dialog"
              aria-modal="false"
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={onHoverOpen}
              onMouseLeave={onHoverClose}
              style={{
                position: "fixed",
                top: coords.top,
                left: coords.left,
                transform: "translateX(-50%)",
                zIndex: 9999,
                minWidth: 240,
                maxHeight: "calc(100vh - 80px)",
                overflowY: "auto",
                background: "#020912",
                border: `1px solid ${accentColor(accent)}40`,
                borderRadius: 12,
                boxShadow: "0 18px 40px rgba(0,0,0,0.65)",
                padding: 12,
                textAlign: "left",
              }}
            >
              {tooltip}
            </div>,
            document.body,
          )
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
  rows: { label: string; value: string; isCurrent: boolean; isFuture: boolean }[];
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
              color: r.isCurrent ? "white" : r.isFuture ? "#475569" : "#cbd5e1",
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
