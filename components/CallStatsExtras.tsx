"use client";

/**
 * Monthly total + projected year-end, rendered alongside the
 * CallVolumeCounter scoreboard on the homepage.
 *
 * Hydration-safe by construction:
 *   - This component renders nothing until `mounted` flips true inside
 *     a useEffect — meaning SSR emits an empty placeholder and the
 *     client only paints the numbers after first paint. No useState
 *     initial value depends on `new Date()` during SSR, so there can
 *     be no server/client timestamp mismatch.
 *   - Fetches its own copy of /api/cad/log independently so it doesn't
 *     touch any ticker state.
 *   - Refreshes every 60 s (same cadence as CallVolumeCounter) so adds /
 *     edits to the call log are reflected without a page reload.
 */

import { useEffect, useMemo, useState } from "react";

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

export default function CallStatsExtras() {
  const [mounted, setMounted] = useState(false);
  const [calls, setCalls] = useState<Call[]>([]);
  const [now, setNow] = useState<Date | null>(null);

  // Fire only on the client, AFTER first paint. Nothing here runs during SSR.
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
    // Tick `now` once a minute so month transitions / day-of-month
    // refresh without needing a hard reload.
    const tickId = setInterval(() => setNow(new Date()), 60_000);
    return () => { clearInterval(reloadId); clearInterval(tickId); };
  }, []);

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
    const monthIdx = now.getMonth(); // 0-11
    const thisKey = `${y}-${String(monthIdx + 1).padStart(2, "0")}`;
    const thisMonthCount = monthCounts.get(thisKey) ?? 0;

    // Year-end projection — use completed-month pace where we have it.
    const yearStartMs = new Date(y, 0, 1).getTime();
    const yearEndMs   = new Date(y + 1, 0, 1).getTime();
    const daysInYear  = Math.round((yearEndMs - yearStartMs) / 86_400_000);
    const elapsedDays = Math.max(1, (now.getTime() - yearStartMs) / 86_400_000);

    let completedTotal = 0;
    let completedDays = 0;
    for (let i = 0; i < monthIdx; i++) {
      const key = `${y}-${String(i + 1).padStart(2, "0")}`;
      completedTotal += monthCounts.get(key) ?? 0;
      completedDays  += new Date(y, i + 1, 0).getDate();
    }
    const ytdTotal = completedTotal + thisMonthCount;
    let projected = 0;
    if (completedDays >= 14) {
      const ratePerDay = completedTotal / completedDays;
      const daysRemaining = daysInYear - elapsedDays;
      projected = Math.round(ytdTotal + ratePerDay * daysRemaining);
    } else if (ytdTotal > 0) {
      projected = Math.round(ytdTotal * (daysInYear / elapsedDays));
    }

    // Daily average — year-to-date calls divided by days elapsed in the
    // year. Same denominator the projection uses, so the three numbers
    // stay consistent. One decimal place.
    const avgPerDay = ytdTotal > 0 ? ytdTotal / elapsedDays : 0;

    const monthlyBreakdown: { month: string; count: number; isCurrent: boolean }[] = [];
    const dailyAvgByMonth: { month: string; avgPerDay: number; isCurrent: boolean; denominator: number }[] = [];
    for (let i = 0; i <= monthIdx; i++) {
      const key = `${y}-${String(i + 1).padStart(2, "0")}`;
      const count = monthCounts.get(key) ?? 0;
      const isCurrent = i === monthIdx;
      monthlyBreakdown.push({
        month: MONTH_NAMES[i],
        count,
        isCurrent,
      });
      // For completed months: denominator is the full days-in-month so
      // the row shows the actual finished average. For the current
      // month: denominator is today's day-of-month so the row shows the
      // month-to-date pace (which is what's actually informative while
      // the month is still running).
      const denominator = isCurrent
        ? Math.max(1, now.getDate())
        : new Date(y, i + 1, 0).getDate();
      dailyAvgByMonth.push({
        month: MONTH_NAMES[i],
        avgPerDay: count / denominator,
        isCurrent,
        denominator,
      });
    }
    return { thisMonthCount, projected, avgPerDay, monthlyBreakdown, dailyAvgByMonth, monthLabel: MONTH_NAMES[monthIdx] };
  }, [calls, now]);

  // SSR (and first client render) emit nothing — no hydration risk.
  if (!mounted || !stats) return null;
  if (stats.thisMonthCount === 0 && stats.projected === 0) return null;

  return (
    <div
      className="mt-5 flex items-center justify-center gap-5 flex-wrap text-center"
      style={{ fontFamily: "inherit" }}
    >
      {/* Monthly total — hover reveals per-month breakdown */}
      <div className="relative group">
        <button
          type="button"
          className="cursor-help text-white font-bold underline decoration-dotted decoration-[#f0b429]/40 underline-offset-4"
          style={{ fontSize: "0.95rem" }}
          aria-label={`Calls so far in ${stats.monthLabel}. Hover for monthly breakdown.`}
        >
          <span className="text-[#f0b429] font-black tabular-nums">{stats.thisMonthCount}</span>{" "}
          <span className="uppercase tracking-widest text-xs">this {stats.monthLabel}</span>
        </button>

        <div
          role="tooltip"
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block z-50 w-56 rounded-xl border border-white/10 bg-[#020912] shadow-2xl shadow-black/60 p-3 text-left"
        >
          <div className="text-[10px] font-black tracking-[0.2em] uppercase text-[#f0b429] mb-2">
            {now!.getFullYear()} by month
          </div>
          <ul className="space-y-1 m-0 p-0 list-none">
            {stats.monthlyBreakdown.map((m) => (
              <li
                key={m.month}
                className={`flex items-center justify-between text-xs ${m.isCurrent ? "text-white font-bold" : "text-slate-300"}`}
              >
                <span>{m.month}</span>
                <span className="tabular-nums">{m.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Daily average — YTD calls ÷ days elapsed. Hover reveals the
          per-month average (using each month's full days for completed
          months and month-to-date pace for the current month). */}
      {stats.avgPerDay > 0 && (
        <div className="relative group">
          <button
            type="button"
            className="cursor-help text-white font-bold underline decoration-dotted decoration-sky-300/40 underline-offset-4"
            style={{ fontSize: "0.95rem" }}
            aria-label="Year-to-date calls per day. Hover for the per-month average."
          >
            <span className="text-sky-300 font-black tabular-nums">{stats.avgPerDay.toFixed(1)}</span>{" "}
            <span className="uppercase tracking-widest text-xs">avg / day</span>
          </button>

          <div
            role="tooltip"
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block z-50 w-64 rounded-xl border border-white/10 bg-[#020912] shadow-2xl shadow-black/60 p-3 text-left"
          >
            <div className="text-[10px] font-black tracking-[0.2em] uppercase text-sky-300 mb-2">
              {now!.getFullYear()} avg / day by month
            </div>
            <ul className="space-y-1 m-0 p-0 list-none">
              {stats.dailyAvgByMonth.map((m) => (
                <li
                  key={m.month}
                  className={`flex items-center justify-between text-xs ${m.isCurrent ? "text-white font-bold" : "text-slate-300"}`}
                >
                  <span>
                    {m.month}
                    {m.isCurrent && (
                      <span className="ml-1 text-[9px] uppercase tracking-widest text-sky-300/80 font-bold">
                        MTD
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums">{m.avgPerDay.toFixed(1)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Projected year-end total */}
      {stats.projected > 0 && (
        <div
          className="text-white font-bold"
          style={{ fontSize: "0.95rem" }}
          title="Projected year-end total, based on the daily pace of completed months this year."
        >
          <span className="text-emerald-400 font-black tabular-nums">{stats.projected.toLocaleString()}</span>{" "}
          <span className="uppercase tracking-widest text-xs">projected</span>
        </div>
      )}
    </div>
  );
}
