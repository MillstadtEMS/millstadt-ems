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
const POLL_INTERVAL  = 30_000;

function isActive(call: Call): boolean {
  if (call.completedAt) return false;
  const dispatched = new Date(call.dispatchDatetime).getTime();
  return Date.now() - dispatched < ACTIVE_MINUTES * 60 * 1000;
}

function shortDate(date: string): string {
  return date.slice(0, 5); // "04/04"
}

// ── Moon phase ─────────────────────────────────────────────────────────────
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
  const fraction = elapsed / CYCLE_MS;
  let idx: number;
  if (fraction < 0.025 || fraction >= 0.975) idx = 0;
  else if (fraction < 0.235) idx = 1;
  else if (fraction < 0.265) idx = 2;
  else if (fraction < 0.485) idx = 3;
  else if (fraction < 0.515) idx = 4;
  else if (fraction < 0.735) idx = 5;
  else if (fraction < 0.765) idx = 6;
  else idx = 7;
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
  const [latest, setLatest]     = useState<Call[]>([]);
  const [allCalls, setAllCalls] = useState<Call[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [now, setNow]           = useState<Date>(new Date());
  const wrapperRef              = useRef<HTMLDivElement>(null);
  const prevIdsRef              = useRef<Set<string>>(new Set());

  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch("/api/cad/latest", { cache: "no-store" });
      if (res.ok) {
        const calls: Call[] = await res.json();
        const newIds = calls.map(c => c.id);
        const isFirstLoad = prevIdsRef.current.size === 0 && calls.length > 0;
        if (!isFirstLoad) {
          const hasNew = newIds.some(id => !prevIdsRef.current.has(id));
          if (hasNew) window.dispatchEvent(new CustomEvent("new-dispatch"));
        }
        prevIdsRef.current = new Set(newIds);
        setLatest(calls);
      }
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

  const moon        = getMoonPhase();
  const currentYear = now.getFullYear();
  const activeCall  = latest.find(isActive) ?? null;
  const onARun      = activeCall !== null;
  // Most recently completed call — shown as "Last Run"
  const lastRun     = latest.find(c => c.completedAt) ?? null;

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
      <div className="bg-[#020912] border-b border-white/10 select-none" style={{ height: "46px" }}>
        <div className="wrap h-full flex items-center gap-3 px-4">

          {/* ── Status indicator ── */}
          <div className="shrink-0 flex items-center gap-1.5">
            <span className="relative flex w-2.5 h-2.5">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${onARun ? "bg-red-400" : "bg-emerald-400"}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${onARun ? "bg-red-400" : "bg-emerald-400"}`} />
            </span>
            <span className={`text-[11px] font-black tracking-wider uppercase ${onARun ? "text-red-400" : "text-emerald-400"}`}>
              {onARun ? "On A Run" : "In Service"}
            </span>
          </div>

          <span className="h-3 w-px bg-white/15 shrink-0" />

          {/* ── Call status info ── */}
          <div className="flex-1 min-w-0 flex items-center">
            {onARun && activeCall ? (
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-emerald-300 font-black text-[13px] tracking-widest uppercase">
                  Responding
                </span>
                <span className="text-white/20">·</span>
                <span className="text-white font-bold text-[12px] truncate">
                  {activeCall.dispatchNature}
                </span>
              </span>
            ) : lastRun ? (
              <span className="flex items-center gap-2 min-w-0 truncate">
                <span className="text-slate-400 text-[11px]">Last Run</span>
                <span className="text-white font-bold tabular-nums font-mono text-[12px]">{lastRun.dispatchDate} @ {lastRun.dispatchTime}</span>
                <span className="text-white/20">—</span>
                <span className="text-[#f0b429] font-bold text-[12px] truncate">{lastRun.dispatchNature}</span>
              </span>
            ) : (
              <span className="text-slate-600 text-[11px]">No calls logged yet this year.</span>
            )}
          </div>

          {/* ── Date & Time ── */}
          <div className="shrink-0 items-center gap-1.5 hidden md:flex">
            <span className="text-white text-[12px] tabular-nums font-mono font-bold">{formatDate(now)}</span>
            <span className="text-white text-[12px] tabular-nums font-mono font-bold">{formatClock(now)}</span>
          </div>

          <span className="h-3 w-px bg-white/15 shrink-0 hidden md:block" />

          {/* ── Moon phase ── */}
          <div className="shrink-0 items-center gap-1 hidden lg:flex" title={moon.name}>
            <span className="text-base leading-none">{moon.symbol}</span>
            <span className="text-slate-500 text-[10px] font-bold tracking-wider uppercase">{moon.name}</span>
          </div>

          <span className="h-3 w-px bg-white/15 shrink-0 hidden lg:block" />

          {/* ── Expand toggle ── */}
          <button
            onClick={() => setExpanded(v => !v)}
            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-colors text-[11px] font-bold tracking-wide"
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
