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
import {
  BASELINE_YEAR,
  CALLS_2025_ANNUAL,
  CALLS_2025_AVG_PER_DAY,
  CALLS_2025_MONTHLY,
  formatPercentChange,
  percentChange,
} from "@/lib/baseline/calls-2025";

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

type OpenTip = null | "monthly" | "avg" | "projected";

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

    // Per-month breakdown with YoY comparison vs the 2025 baseline.
    // Every value here is REAL ticker data, not a projection:
    //   - Past months: actual completed count.
    //   - Current month: actual month-to-date count (labeled MTD so
    //     the partial-month nature is obvious — its Δ vs the prior-
    //     year full month is honest even though it's apples-to-
    //     full-oranges until the month closes).
    //   - Future months: render "—" for the current value + Δ so we
    //     don't fabricate numbers.
    // For the avg/day breakdown, the denominator on the current month
    // is day-of-month (MTD avg) — also a real running average, not a
    // projection.
    const monthlyBreakdown: {
      month: string;
      count: number;            // current-year actual (or MTD on current month)
      prevCount: number;        // 2025 actual for the same month
      isCurrent: boolean;
      isFuture: boolean;
      isMTD: boolean;
    }[] = [];
    const dailyAvgByMonth: {
      month: string;
      avgPerDay: number;        // current-year actual avg/day (or MTD)
      prevAvgPerDay: number;    // 2025 actual avg/day for the same month
      isCurrent: boolean;
      isFuture: boolean;
      isMTD: boolean;
    }[] = [];

    for (let i = 0; i < 12; i++) {
      const key = `${y}-${String(i + 1).padStart(2, "0")}`;
      const rawCount = monthCounts.get(key) ?? 0;
      const isCurrent = i === monthIdx;
      const isFuture = i > monthIdx;
      const daysInMonth = new Date(y, i + 1, 0).getDate();
      const denom = isCurrent ? Math.max(1, now.getDate()) : daysInMonth;
      const prevCount = CALLS_2025_MONTHLY[i] ?? 0;
      const daysInPrevMonth = new Date(BASELINE_YEAR, i + 1, 0).getDate();
      monthlyBreakdown.push({
        month: MONTH_NAMES[i],
        count: rawCount,
        prevCount,
        isCurrent,
        isFuture,
        isMTD: isCurrent,
      });
      dailyAvgByMonth.push({
        month: MONTH_NAMES[i],
        avgPerDay: isFuture ? 0 : rawCount / denom,
        prevAvgPerDay: prevCount / daysInPrevMonth,
        isCurrent,
        isFuture,
        isMTD: isCurrent,
      });
    }

    // ── Previous-year comparison ───────────────────────────────────
    // The baseline below (lib/baseline/calls-2025.ts) is the 2025
    // monthly/annual actual totals transcribed from the ESO PDF
    // reports. We compare:
    //   - this-month tile  → prev-year same-month actual  vs current
    //                        same-month projection (so-far / day-of-
    //                        month × days-in-month)
    //   - avg/day tile     → prev-year annual avg/day      vs current
    //                        YTD avg/day (which IS the projected
    //                        annual avg/day, since projected = avg ×
    //                        days_in_year, so projected/days = avg)
    //   - projected tile   → prev-year annual TOTAL         vs current
    //                        year-end projection
    const prevMonthActual = CALLS_2025_MONTHLY[monthIdx] ?? 0;
    const daysInCurrentMonth = new Date(y, monthIdx + 1, 0).getDate();
    const dayOfMonth = Math.max(1, now.getDate());
    const monthProjected = thisMonthCount > 0
      ? Math.round((thisMonthCount / dayOfMonth) * daysInCurrentMonth)
      : 0;

    const compare = {
      monthly: {
        previousYearActual: prevMonthActual,
        currentYearProjected: monthProjected,
        monthLabel: MONTH_NAMES[monthIdx],
      },
      avgPerDay: {
        previousYearActual: CALLS_2025_AVG_PER_DAY,
        currentYearProjected: avgPerDay,
      },
      projected: {
        previousYearActual: CALLS_2025_ANNUAL,
        currentYearProjected: projected,
      },
    };

    return {
      thisMonthCount,
      avgPerDay,
      projected,
      monthlyBreakdown,
      dailyAvgByMonth,
      monthLabel: MONTH_SHORT[monthIdx],
      year: y,
      compare,
      daysInCurrentMonth,
      dayOfMonth,
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
        label="Current month"
        accent="gold"
        clickable
        isOpen={openTip === "monthly"}
        mobileAppLike={mobileAppLike}
        onToggle={() => toggle("monthly")}
        onHoverOpen={() => openHover("monthly")}
        onHoverClose={scheduleClose}
        tooltip={
          <>
            <ComparisonTable
              title={`Monthly totals · ${BASELINE_YEAR} vs ${stats.year}`}
              accent="gold"
              rows={stats.monthlyBreakdown.map((m) => ({
                label: m.month,
                prev: m.prevCount,
                curr: m.isFuture ? null : m.count,
                isCurrent: m.isCurrent,
                isFuture: m.isFuture,
                isMTD: m.isMTD,
              }))}
              fmt={(n) => Math.round(n).toLocaleString()}
            />
            <FormulaFooter accent="gold" />
          </>
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
          <>
            <ComparisonTable
              title={`Calls per day · ${BASELINE_YEAR} vs ${stats.year}`}
              accent="sky"
              rows={stats.dailyAvgByMonth.map((m) => ({
                label: m.month + (m.isCurrent ? "  (MTD)" : ""),
                prev: m.prevAvgPerDay,
                curr: m.isFuture ? null : m.avgPerDay,
                isCurrent: m.isCurrent,
                isFuture: m.isFuture,
                isMTD: m.isMTD,
              }))}
              fmt={(n) => n.toFixed(1)}
            />
            <FormulaFooter accent="sky" />
          </>
        }
      />

      <Stat
        number={stats.projected.toLocaleString()}
        label="Projected"
        accent="emerald"
        clickable
        isOpen={openTip === "projected"}
        mobileAppLike={mobileAppLike}
        onToggle={() => toggle("projected")}
        onHoverOpen={() => openHover("projected")}
        onHoverClose={scheduleClose}
        title="Year-end projection: year-to-date pace × days in year."
        tooltip={
          <>
            <CompareBlock
              kind="annual"
              accent="emerald"
              previousYearActual={stats.compare.projected.previousYearActual}
              currentYearProjected={stats.compare.projected.currentYearProjected}
              prevLabel={`${BASELINE_YEAR} actual total`}
              currLabel={`${stats.year} projected total`}
            />
            <FormulaFooter accent="emerald" mode="projection" />
          </>
        }
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

// ── Compare block (prev-year actual vs current-year projected) ────────
function CompareBlock({
  kind, accent,
  previousYearActual, currentYearProjected,
  prevLabel, currLabel,
  decimals = 0,
  note,
}: {
  kind: "monthly" | "avg" | "annual";
  accent: Accent;
  previousYearActual: number;
  currentYearProjected: number;
  prevLabel: string;
  currLabel: string;
  decimals?: number;
  note?: string;
}) {
  const change = percentChange(previousYearActual, currentYearProjected);
  const changeLabel = formatPercentChange(previousYearActual, currentYearProjected);
  // Color the % chip green when projected goes up, rose when it drops,
  // slate when we can't compute (N/A).
  const chip = change === null
    ? { bg: "rgba(148,163,184,0.18)", fg: "#cbd5e1" }
    : change >= 0
      ? { bg: "rgba(16,185,129,0.18)", fg: "#34d399" }
      : { bg: "rgba(248,113,113,0.18)", fg: "#fca5a5" };
  const fmt = (n: number) => decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString();
  const kindLabel = kind === "monthly" ? "Monthly calls" : kind === "avg" ? "Calls per day" : "Projected annual calls";

  return (
    <div style={{ marginBottom: 12 }}>
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
        {kindLabel} · YoY
      </div>
      <div style={{ display: "grid", gap: 4 }}>
        <Row label={prevLabel}  value={fmt(previousYearActual)} />
        <Row label={currLabel}  value={fmt(currentYearProjected)} highlight={accent} />
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "5px 6px", marginTop: 2,
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}>
          <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 700 }}>Change</span>
          <span style={{
            background: chip.bg, color: chip.fg,
            fontSize: 12, fontWeight: 900, letterSpacing: "0.04em",
            padding: "3px 9px", borderRadius: 999,
            fontVariantNumeric: "tabular-nums",
          }}>{changeLabel}</span>
        </div>
      </div>
      {note && (
        <p style={{ color: "#64748b", fontSize: 11, lineHeight: 1.4, margin: "8px 0 0" }}>
          {note}
        </p>
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: Accent }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      padding: "4px 6px", borderRadius: 6,
      background: highlight ? `${accentColor(highlight)}10` : "transparent",
    }}>
      <span style={{ color: "#cbd5e1", fontSize: 12.5 }}>{label}</span>
      <span style={{
        color: "white", fontSize: 13.5, fontWeight: 800,
        fontVariantNumeric: "tabular-nums",
      }}>{value}</span>
    </div>
  );
}

// ── Formula + disclaimer footer ───────────────────────────────────────
// ── Per-month comparison table (4-column: month / prev / curr / Δ) ────
//
// Used for the "This <month>" and "Avg / day" tooltips so the user can
// scan the entire year at a glance:
//
//   Month     2025    2026    Δ
//   January    66      80    +21%
//   February   71      72     +1%
//   May *      65      92    +41%   ← current month, projected
//
// Past months show actuals; current month shows the rest-of-month
// projection (so-far ÷ day-of-month × days-in-month); future months
// render "—" for current + Δ so the row still appears but doesn't
// fabricate a comparison.
function ComparisonTable({
  title, accent, rows, fmt,
}: {
  title: string;
  accent: Accent;
  rows: {
    label: string;
    prev: number;
    curr: number | null;
    isCurrent: boolean;
    isFuture: boolean;
    isMTD: boolean;
  }[];
  fmt: (n: number) => string;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        color: accentColor(accent), fontSize: 10, fontWeight: 900,
        letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 8,
      }}>
        {title}
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.1fr)",
        rowGap: 2,
        columnGap: 6,
        fontSize: 12,
        fontVariantNumeric: "tabular-nums",
      }}>
        {/* header row */}
        <span style={hdr}>&nbsp;</span>
        <span style={{ ...hdr, textAlign: "right" }}>{BASELINE_YEAR}</span>
        <span style={{ ...hdr, textAlign: "right" }}>now</span>
        <span style={{ ...hdr, textAlign: "right" }}>Δ</span>

        {rows.map((r) => {
          const change = r.curr === null ? null : percentChange(r.prev, r.curr);
          const changeLabel = r.curr === null ? "—" : formatPercentChange(r.prev, r.curr);
          const chipFg = change === null ? "#64748b"
            : change >= 0 ? "#34d399" : "#fca5a5";
          const rowBg = r.isCurrent ? `${accentColor(accent)}14` : "transparent";
          const labelColor = r.isCurrent ? "white" : r.isFuture ? "#475569" : "#cbd5e1";
          const numColor   = r.isCurrent ? "white" : r.isFuture ? "#475569" : "#e2e8f0";
          return (
            <span key={r.label + "-row"} style={{ display: "contents" }}>
              <span style={{ ...cell, color: labelColor, background: rowBg, fontWeight: r.isCurrent ? 800 : 500 }}>
                {r.label}{r.isMTD ? " · MTD" : ""}
              </span>
              <span style={{ ...cell, color: numColor, background: rowBg, textAlign: "right" }}>
                {fmt(r.prev)}
              </span>
              <span style={{ ...cell, color: numColor, background: rowBg, textAlign: "right", fontWeight: r.isCurrent ? 800 : 500 }}>
                {r.curr === null ? "—" : fmt(r.curr)}
              </span>
              <span style={{ ...cell, color: chipFg, background: rowBg, textAlign: "right", fontWeight: 800 }}>
                {changeLabel}
              </span>
            </span>
          );
        })}
      </div>
      <p style={{ color: "#64748b", fontSize: 10, lineHeight: 1.4, margin: "8px 0 0" }}>
        <span style={{ color: accentColor(accent) }}>MTD</span> = month-to-date (real ticker count through today). All other values are actual completed months.
      </p>
    </div>
  );
}

const hdr: React.CSSProperties = {
  color: "#94a3b8", fontSize: 9.5, fontWeight: 800,
  letterSpacing: "0.18em", textTransform: "uppercase",
  padding: "2px 6px 6px",
};
const cell: React.CSSProperties = {
  padding: "4px 6px",
  borderRadius: 5,
};

type FooterMode = "actual" | "projection";

function FormulaFooter({ accent, note, mode = "actual" }: { accent: Accent; note?: string; mode?: FooterMode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        style={{
          background: "transparent", border: 0, padding: 0,
          color: "#94a3b8", fontSize: 11, fontWeight: 800,
          letterSpacing: "0.14em", textTransform: "uppercase",
          cursor: "pointer", fontFamily: "inherit",
          display: "inline-flex", alignItems: "center", gap: 6,
        }}
        aria-expanded={open}
      >
        <span style={{ color: accentColor(accent) }}>{open ? "▾" : "▸"}</span>
        How this is calculated
      </button>
      {open && (
        <div style={{
          marginTop: 8, padding: 10, borderRadius: 8,
          background: "rgba(255,255,255,0.03)",
          color: "#cbd5e1", fontSize: 11.5, lineHeight: 1.55,
        }}>
          {mode === "projection" ? (
            <p style={{ margin: "0 0 8px" }}>
              Year-end projection is calculated by extrapolating year-to-date call volume to a full 365 days, then compared against {BASELINE_YEAR} actual totals. The projection is an estimate that updates every time a new call lands on the ticker.
            </p>
          ) : (
            <p style={{ margin: "0 0 8px" }}>
              Every value in this table is real ticker data. Past months are the completed totals; the current month is the live month-to-date count through today. {BASELINE_YEAR} numbers come from the monthly ESO 911 Call Volume reports.
            </p>
          )}
          {note && (
            <p style={{ margin: "0 0 8px", color: "#94a3b8" }}>{note}</p>
          )}
          <div style={{
            fontFamily: "var(--font-mas-mono), ui-monospace, monospace",
            fontSize: 10.5, color: "#94a3b8", display: "grid", gap: 4,
          }}>
            {mode === "projection" ? (
              <>
                <div><span style={{ color: accentColor(accent) }}>projected annual</span> = ytd calls ÷ days elapsed × 365</div>
                <div><span style={{ color: accentColor(accent) }}>% change</span> = ((projected − prev actual) ÷ prev actual) × 100</div>
              </>
            ) : (
              <>
                <div><span style={{ color: accentColor(accent) }}>monthly value</span> = real ticker count (current month is month-to-date)</div>
                <div><span style={{ color: accentColor(accent) }}>calls per day</span> = monthly count ÷ days in that month (or day-of-month on the current row)</div>
                <div><span style={{ color: accentColor(accent) }}>% change</span> = ((current − prev actual) ÷ prev actual) × 100</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
