"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface Call {
  id: string;
  dispatchDate: string;    // "04/04/2026"
  dispatchTime: string;    // "17:29"
  dispatchNature: string;  // "ACCIDENT W/ INJURIES"
  dispatchDatetime: string; // ISO-8601
  sourceYear: number;
}

const ACTIVE_MINUTES = 20;
const POLL_INTERVAL  = 60_000; // refresh every 60s

function isActive(call: Call): boolean {
  const dispatched = new Date(call.dispatchDatetime).getTime();
  return Date.now() - dispatched < ACTIVE_MINUTES * 60 * 1000;
}

function shortDate(date: string): string {
  // "04/04/2026" → "04/04"
  return date.slice(0, 5);
}

export default function CallTicker() {
  const [latest, setLatest]     = useState<Call[]>([]);
  const [allCalls, setAllCalls] = useState<Call[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading]   = useState(true);
  const expandRef               = useRef<HTMLDivElement>(null);

  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch("/api/cad/latest", { cache: "no-store" });
      if (res.ok) setLatest(await res.json());
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch("/api/cad/log", { cache: "no-store" });
      if (res.ok) setAllCalls(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchLatest();
    const id = setInterval(fetchLatest, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchLatest]);

  useEffect(() => {
    if (expanded) fetchAll();
  }, [expanded, fetchAll]);

  // Close expanded log on outside click
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (expandRef.current && !expandRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expanded]);

  // Don't render until initial fetch completes
  if (loading) return null;

  const currentYear = new Date().getFullYear();

  return (
    <>
      {/* ── Expanded call log panel (slides up from ticker) ── */}
      {expanded && (
        <div
          ref={expandRef}
          className="fixed bottom-[40px] md:bottom-[44px] left-0 right-0 z-[48]
                     bottom-mobile-ticker
                     bg-[#020912]/98 backdrop-blur-md border-t border-white/10
                     shadow-2xl shadow-black/60"
          style={{ maxHeight: "60vh", overflowY: "auto" }}
        >
          <div className="px-4 md:px-6 py-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="h-px w-5 bg-[#f0b429]" />
                <span className="text-[#f0b429] text-xs font-black tracking-[0.2em] uppercase">
                  {currentYear} Dispatch Log
                </span>
              </div>
              <span className="text-slate-600 text-xs">
                {allCalls.length} call{allCalls.length !== 1 ? "s" : ""} this year
              </span>
            </div>

            {/* Call rows */}
            {allCalls.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                No calls logged yet for this year.
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-white/5">
                {allCalls.map((call) => {
                  const active = isActive(call);
                  return (
                    <div
                      key={call.id}
                      className="flex items-center gap-3 py-2.5 px-1"
                    >
                      {/* Status dot */}
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          active ? "bg-emerald-400" : "bg-red-500/70"
                        }`}
                      />
                      {/* Date */}
                      <span className="text-slate-500 text-xs tabular-nums w-20 shrink-0">
                        {call.dispatchDate}
                      </span>
                      {/* Time */}
                      <span className="text-slate-400 text-xs tabular-nums w-12 shrink-0 font-mono">
                        {call.dispatchTime}
                      </span>
                      {/* Nature */}
                      <span className={`text-xs font-bold uppercase tracking-wide truncate ${
                        active ? "text-emerald-300" : "text-slate-300"
                      }`}>
                        {call.dispatchNature}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-slate-700 text-[10px] mt-4 pt-3 border-t border-white/5">
              Displaying dispatch nature only. Times shown in local time. Log resets January 1.
            </p>
          </div>
        </div>
      )}

      {/* ── Ticker strip ── */}
      {/* On mobile: bottom-16 (above tab bar). On desktop: bottom-0. */}
      <div
        className="fixed bottom-16 md:bottom-0 left-0 right-0 z-[48]
                   bg-[#020912]/95 backdrop-blur-sm border-t border-white/8
                   select-none"
        style={{ minHeight: "44px" }}
      >
        <div className="wrap h-full flex items-center gap-3 py-2">

          {/* Label */}
          <span className="text-[#f0b429] text-[10px] font-black tracking-[0.2em] uppercase shrink-0 hidden sm:block">
            Dispatch
          </span>
          <span className="h-3 w-px bg-white/15 shrink-0 hidden sm:block" />

          {/* Latest calls — scrollable on small screens */}
          <div className="flex-1 flex items-center gap-4 overflow-hidden min-w-0">
            {latest.length === 0 ? (
              <span className="text-slate-600 text-xs">No calls logged yet for this year.</span>
            ) : (
              latest.map((call, i) => {
                const active = isActive(call);
                return (
                  <div key={call.id} className={`flex items-center gap-2 shrink-0 ${i > 0 ? "hidden lg:flex" : ""}`}>
                    {/* Dot */}
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      active ? "bg-emerald-400" : "bg-red-500/70"
                    }`} />
                    {/* Date/time */}
                    <span className="text-slate-500 text-[11px] tabular-nums shrink-0 font-mono">
                      {shortDate(call.dispatchDate)} {call.dispatchTime}
                    </span>
                    {/* Nature */}
                    <span className={`text-[11px] font-bold uppercase tracking-wide truncate max-w-[180px] ${
                      active ? "text-emerald-300" : "text-red-400"
                    }`}>
                      {call.dispatchNature}
                    </span>
                    {/* Separator */}
                    {i < latest.length - 1 && (
                      <span className="text-white/15 text-xs shrink-0 hidden lg:block">·</span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(v => !v)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                       bg-white/5 hover:bg-white/10 border border-white/10
                       text-slate-400 hover:text-white transition-colors text-[11px] font-bold tracking-wide"
            aria-label={expanded ? "Collapse call log" : "View full call log"}
          >
            <span className="hidden sm:inline">{expanded ? "Close" : "View Log"}</span>
            <svg
              viewBox="0 0 24 24"
              className={`w-3.5 h-3.5 fill-current transition-transform ${expanded ? "rotate-180" : ""}`}
            >
              <path d="M7 14l5-5 5 5H7z" />
            </svg>
          </button>

        </div>
      </div>
    </>
  );
}
