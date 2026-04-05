"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface Call {
  id: string;
  dispatchDate: string;
  dispatchTime: string;
  dispatchNature: string;
  dispatchDatetime: string;
  sourceYear: number;
  completedAt: string | null;
}

const ACTIVE_MINUTES = 120;
const POLL_INTERVAL  = 60_000;

function isActive(call: Call): boolean {
  if (call.completedAt) return false; // closeout received
  const dispatched = new Date(call.dispatchDatetime).getTime();
  return Date.now() - dispatched < ACTIVE_MINUTES * 60 * 1000;
}

function shortDate(date: string): string {
  return date.slice(0, 5);
}

// ── Moon phase ─────────────────────────────────────────────────────────────
// Reference new moon: January 6, 2000 18:14 UTC (Julian date 2451550.1)
const KNOWN_NEW_MOON = new Date("2000-01-06T18:14:00Z").getTime();
const CYCLE_MS = 29.53058867 * 24 * 60 * 60 * 1000;

const MOON_PHASES = [
  { name: "New Moon",        symbol: "🌑" },
  { name: "Waxing Crescent", symbol: "🌒" },
  { name: "First Quarter",   symbol: "🌓" },
  { name: "Waxing Gibbous",  symbol: "🌔" },
  { name: "Full Moon",       symbol: "🌕" },
  { name: "Waning Gibbous",  symbol: "🌖" },
  { name: "Last Quarter",    symbol: "🌗" },
  { name: "Waning Crescent", symbol: "🌘" },
];

function getMoonPhase(): { name: string; symbol: string } {
  const elapsed = ((Date.now() - KNOWN_NEW_MOON) % CYCLE_MS + CYCLE_MS) % CYCLE_MS;
  const fraction = elapsed / CYCLE_MS; // 0–1
  // Map to 8 phases with slightly wider windows for primary phases
  let idx: number;
  if (fraction < 0.025 || fraction >= 0.975) idx = 0; // New Moon
  else if (fraction < 0.235) idx = 1; // Waxing Crescent
  else if (fraction < 0.265) idx = 2; // First Quarter
  else if (fraction < 0.485) idx = 3; // Waxing Gibbous
  else if (fraction < 0.515) idx = 4; // Full Moon
  else if (fraction < 0.735) idx = 5; // Waning Gibbous
  else if (fraction < 0.765) idx = 6; // Last Quarter
  else idx = 7; // Waning Crescent
  return MOON_PHASES[idx];
}

// ── Live clock ─────────────────────────────────────────────────────────────
function formatClock(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CallTicker() {
  const [latest, setLatest]   = useState<Call[]>([]);
  const [allCalls, setAllCalls] = useState<Call[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow]         = useState<Date>(new Date());
  const wrapperRef            = useRef<HTMLDivElement>(null);

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
    const pollId = setInterval(fetchLatest, POLL_INTERVAL);
    return () => clearInterval(pollId);
  }, [fetchLatest]);

  // Live clock — tick every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (expanded) fetchAll();
  }, [expanded, fetchAll]);

  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setExpanded(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expanded]);

  if (loading) return null;

  const moon = getMoonPhase();
  const currentYear = now.getFullYear();
  const onARun = latest.some(isActive);

  return (
    <div ref={wrapperRef} className="fixed top-0 left-0 right-0 z-[60]">

      {/* ── Expanded call log panel ── */}
      {expanded && (
        <div
          className="bg-[#020912]/98 backdrop-blur-md border-b border-white/10 shadow-2xl shadow-black/60"
          style={{ maxHeight: "60vh", overflowY: "auto" }}
        >
          <div className="px-4 md:px-6 py-4">
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

            {allCalls.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">No calls logged yet for this year.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {allCalls.map((call) => {
                  const active = isActive(call);
                  return (
                    <div key={call.id} className="flex items-center gap-3 py-3 px-1">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${active ? "bg-emerald-400" : "bg-red-500/70"}`} />
                      <span className="text-slate-500 text-xs tabular-nums w-20 shrink-0">{call.dispatchDate}</span>
                      <span className="text-slate-400 text-xs tabular-nums w-12 shrink-0 font-mono">{call.dispatchTime}</span>
                      <span className={`text-xs font-bold uppercase tracking-wide truncate ${active ? "text-emerald-300" : "text-slate-300"}`}>
                        {call.dispatchNature}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-slate-700 text-[10px] mt-4 pt-3 border-t border-white/5">
              Displaying dispatch nature only. Times in local time. Log resets January 1.
            </p>
          </div>
        </div>
      )}

      {/* ── Ticker strip ── */}
      <div className="bg-[#020912] border-b border-white/10 select-none" style={{ height: "40px" }}>
        <div className="wrap h-full flex items-center gap-3 px-4">

          {/* ── In Service / On A Run ── */}
          <div className="shrink-0 flex items-center gap-1.5">
            <span className="relative flex w-2 h-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${onARun ? "bg-red-400" : "bg-emerald-400"}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${onARun ? "bg-red-400" : "bg-emerald-400"}`} />
            </span>
            <span className={`text-[9px] font-black tracking-wider uppercase hidden sm:block ${onARun ? "text-red-400" : "text-emerald-400"}`}>
              {onARun ? "On A Run" : "In Service"}
            </span>
          </div>

          <span className="h-2.5 w-px bg-white/15 shrink-0" />

          {/* ── Date & Time ── */}
          <div className="shrink-0 items-center gap-1.5 hidden md:flex">
            <span className="text-slate-400 text-[10px] tabular-nums font-mono">{formatDate(now)}</span>
            <span className="text-white text-[10px] tabular-nums font-mono font-bold">{formatClock(now)}</span>
          </div>

          <span className="h-2.5 w-px bg-white/15 shrink-0 hidden md:block" />

          {/* ── Moon phase ── */}
          <div className="shrink-0 items-center gap-1 hidden lg:flex" title={moon.name}>
            <span className="text-sm leading-none">{moon.symbol}</span>
            <span className="text-slate-500 text-[9px] font-bold tracking-wider uppercase">{moon.name}</span>
          </div>

          <span className="h-2.5 w-px bg-white/15 shrink-0 hidden lg:block" />

          {/* ── Dispatch label ── */}
          <span className="text-[#f0b429] text-[9px] font-black tracking-[0.2em] uppercase shrink-0 hidden sm:block">Dispatch</span>
          <span className="h-2.5 w-px bg-white/15 shrink-0 hidden sm:block" />

          {/* ── Latest calls ── */}
          <div className="flex-1 flex items-center gap-3 overflow-hidden min-w-0">
            {latest.length === 0 ? (
              <span className="text-slate-600 text-[10px]">No calls logged yet for this year.</span>
            ) : (
              latest.map((call, i) => {
                const active = isActive(call);
                return (
                  <div key={call.id} className={`flex items-center gap-1.5 shrink-0 ${i > 0 && !active ? "hidden lg:flex" : ""}`}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? "bg-emerald-400" : "bg-red-500/70"}`} />
                    <span className={`text-[10px] tabular-nums shrink-0 font-mono ${active ? "text-emerald-300 font-bold" : "text-slate-500"}`}>
                      {shortDate(call.dispatchDate)} {call.dispatchTime}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wide truncate max-w-[160px] ${active ? "text-emerald-300" : "text-red-400"}`}>
                      {call.dispatchNature}
                    </span>
                    {i < latest.length - 1 && <span className="text-white/15 text-[10px] shrink-0 hidden lg:block">·</span>}
                  </div>
                );
              })
            )}
          </div>

          {/* ── Expand toggle ── */}
          <button
            onClick={() => setExpanded(v => !v)}
            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-colors text-[10px] font-bold tracking-wide"
            aria-label={expanded ? "Collapse call log" : "View full call log"}
          >
            <span className="hidden sm:inline">{expanded ? "Close" : "Log"}</span>
            <svg viewBox="0 0 24 24" className={`w-3 h-3 fill-current transition-transform ${expanded ? "rotate-180" : ""}`}>
              <path d="M7 14l5-5 5 5H7z" />
            </svg>
          </button>

        </div>
      </div>
    </div>
  );
}
