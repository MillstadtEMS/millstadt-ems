"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { staticCalls, type StaticCall } from "@/lib/cad/static-calls";

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

// Format military time "1933" -> "19:33"
function fmtTime(t: string): string {
  return t.length === 4 ? `${t.slice(0, 2)}:${t.slice(2)}` : t;
}

// Format date "04/05/2026" -> "04/05"
function fmtDate(d: string): string {
  return d.slice(0, 5);
}

// ── Moon phase ─────────────────────────────────────────────────────────────
const KNOWN_NEW_MOON = new Date("2000-01-06T18:14:00Z").getTime();
const CYCLE_MS = 29.53058867 * 24 * 60 * 60 * 1000;

const MOON_PHASES = [
  { name: "New Moon",        symbol: "\u{1F311}" },
  { name: "Waxing Crescent", symbol: "\u{1F312}" },
  { name: "First Quarter",   symbol: "\u{1F313}" },
  { name: "Waxing Gibbous",  symbol: "\u{1F314}" },
  { name: "Full Moon",       symbol: "\u{1F315}" },
  { name: "Waning Gibbous",  symbol: "\u{1F316}" },
  { name: "Last Quarter",    symbol: "\u{1F317}" },
  { name: "Waning Crescent", symbol: "\u{1F318}" },
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

// ── Unit color coding ─────────────────────────────────────────────────────
function unitColor(unit: string): string {
  if (unit.includes("3935")) return "text-emerald-400";  // bright green
  if (unit.includes("3926")) return "text-blue-400";     // blue
  if (unit.includes("3925")) return "text-orange-400";   // orange
  return "text-white";
}

// ── Nature color coding (toggle COLOR_CODE_NATURES to enable) ─────────────
const COLOR_CODE_NATURES = false;

function natureColor(nature: string): string {
  if (!COLOR_CODE_NATURES) return "text-white";
  const n = nature.toLowerCase();
  if (n.includes("fire") || n.includes("brush")) return "text-orange-400";
  if (n.includes("accident")) return "text-yellow-400";
  if (n.includes("homicide") || n.includes("battery") || n.includes("domestic")) return "text-red-400";
  if (n.includes("mental") || n.includes("suspicious") || n.includes("reckless")) return "text-purple-400";
  if (n.includes("alarm")) return "text-cyan-400";
  return "text-white";
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CallTicker() {
  const [latest, setLatest]       = useState<Call[]>([]);
  const [allCalls, setAllCalls]   = useState<Call[]>([]);
  const [callCount, setCallCount] = useState<number | null>(null);
  const [expanded, setExpanded]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [now, setNow]           = useState<Date>(new Date());
  const wrapperRef              = useRef<HTMLDivElement>(null);
  const scrollRef               = useRef<HTMLDivElement>(null);
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
      if (res.ok) {
        const calls: Call[] = await res.json();
        setAllCalls(calls);
        setCallCount(calls.length);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchLatest();
    fetchAll();
    const pollId = setInterval(fetchLatest, POLL_INTERVAL);
    return () => clearInterval(pollId);
  }, [fetchLatest, fetchAll]);

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
  const lastRun     = latest.find(c => c.completedAt) ?? null;

  // Total count: API calls + static calls
  const totalCalls = (callCount ?? 0) + staticCalls.length;

  return (
    <div ref={wrapperRef} className="fixed top-0 left-0 right-0 z-[60]">

      {/* ── Expanded call log panel ── */}
      {expanded && (
        <div
          className="bg-[#020912]/98 backdrop-blur-md border-b border-white/10 shadow-2xl shadow-black/60"
          style={{ maxHeight: "45vh", minHeight: "25vh", display: "flex", flexDirection: "column" }}
        >
          <div className="wrap py-4 flex flex-col" style={{ flex: 1, minHeight: 0 }}>
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-3">
                <span className="h-px w-5 bg-[#f0b429]" />
                <span className="text-[#f0b429] text-xs font-black tracking-[0.2em] uppercase">
                  {currentYear} Dispatch Log
                </span>
              </div>
              <span className="text-red-500 text-sm font-black">
                {totalCalls} call{totalCalls !== 1 ? "s" : ""} this year
              </span>
            </div>

            {/* Scrollable call list with ambulance scrollbar */}
            <div ref={scrollRef} className="ticker-log-scroll flex-1 overflow-y-auto min-h-0">
              <div className="divide-y divide-white/5">
                {/* Live API calls */}
                {allCalls.map((call) => {
                  const active = isActive(call);
                  // Extract unit from dispatchNature if present, e.g. "[3935] Seizure"
                  const unitMatch = call.dispatchNature.match(/^\[([^\]]+)\]/);
                  const unitNum = unitMatch ? unitMatch[1] : "";
                  return (
                    <div key={call.id} className="flex items-center gap-3 py-2.5 px-1">
                      {active && <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-400 animate-pulse" />}
                      <span className="text-white/70 text-sm tabular-nums w-24 shrink-0">{call.dispatchDate}</span>
                      <span className="text-white/70 text-sm tabular-nums w-14 shrink-0 font-mono">{call.dispatchTime}</span>
                      <span className={`text-sm font-bold uppercase tracking-wide truncate ${active ? "text-emerald-300" : "text-white"}`}>
                        {unitNum ? (
                          <><span className={unitColor(unitNum)}>[{unitNum}]</span> {call.dispatchNature.replace(/^\[[^\]]+\]\s*/, "")}</>
                        ) : call.dispatchNature}
                      </span>
                    </div>
                  );
                })}

                {/* Static calls */}
                {staticCalls.map((call: StaticCall, i: number) => (
                  <div key={`static-${i}`} className="flex items-center gap-3 py-2.5 px-1">
                    <span className="text-white/70 text-sm tabular-nums w-24 shrink-0">{call.date}</span>
                    <span className="text-white/70 text-sm tabular-nums w-14 shrink-0 font-mono">{fmtTime(call.time)}</span>
                    <span className="text-sm font-bold uppercase tracking-wide truncate text-white">
                      <span className={unitColor(call.unit)}>[{call.unit}]</span> {call.nature}
                    </span>
                  </div>
                ))}
              </div>

              {allCalls.length === 0 && staticCalls.length === 0 && (
                <div className="py-8 text-center text-slate-500 text-sm">No calls logged yet for this year.</div>
              )}
            </div>

            <div className="shrink-0" />
          </div>
        </div>
      )}

      {/* ── Ticker strip ── */}
      <div className="bg-[#020912] border-b border-white/10 select-none" style={{ height: "46px" }}>
        <div className="h-full wrap flex items-center gap-2">

          {/* ── Status dot + label ── */}
          <div className="shrink-0 flex items-center gap-1.5">
            <span className="relative flex w-2 h-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${onARun ? "bg-red-400" : "bg-emerald-400"}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${onARun ? "bg-red-400" : "bg-emerald-400"}`} />
            </span>
            <span className={`text-[10px] font-black tracking-wider uppercase whitespace-nowrap ${onARun ? "text-red-400" : "text-emerald-400"}`}>
              {onARun ? "On A Run" : "In Service"}
            </span>
          </div>

          <span className="h-3 w-px bg-white/15 shrink-0" />

          {/* ── Call status info — hidden when log is expanded ── */}
          {!expanded && (
            <div className="flex-1 min-w-0 overflow-hidden">
              {onARun && activeCall ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-emerald-300 font-black text-[11px] tracking-widest uppercase whitespace-nowrap">Responding</span>
                  <span className="text-white/20 shrink-0">&middot;</span>
                  <span className="text-white font-bold text-[11px] truncate">{activeCall.dispatchNature}</span>
                </div>
              ) : lastRun ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-slate-500 text-[10px] whitespace-nowrap shrink-0">Last</span>
                  <span className="text-white font-bold tabular-nums font-mono text-[10px] whitespace-nowrap shrink-0">{shortDate(lastRun.dispatchDate)} {lastRun.dispatchTime}</span>
                  <span className="text-white/20 shrink-0">&middot;</span>
                  <span className="text-[#f0b429] font-bold text-[11px] truncate">{lastRun.dispatchNature}</span>
                </div>
              ) : (
                <span className="text-slate-600 text-[10px]">No active incidents.</span>
              )}
            </div>
          )}
          {expanded && <div className="flex-1" />}

          {/* ── Date & Time — desktop only ── */}
          <div className="shrink-0 items-center gap-1.5 hidden md:flex">
            <span className="text-white text-[11px] tabular-nums font-mono font-bold">{formatDate(now)}</span>
            <span className="text-white text-[11px] tabular-nums font-mono font-bold">{formatClock(now)}</span>
          </div>

          <span className="h-3 w-px bg-white/15 shrink-0 hidden md:block" />

          {/* ── Moon phase — desktop only ── */}
          <div className="shrink-0 items-center gap-1 hidden lg:flex" title={moon.name}>
            <span className="text-slate-500 text-[10px] font-bold tracking-wider uppercase">{moon.symbol} {moon.name}</span>
          </div>

          <span className="h-3 w-px bg-white/15 shrink-0 hidden lg:block" />

          {/* ── Expand toggle ── */}
          <button
            onClick={() => setExpanded(v => !v)}
            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-colors text-[10px] font-bold"
            aria-label={expanded ? "Collapse call log" : "View full call log"}
          >
            <span className="hidden sm:inline">{expanded ? "Close" : "Log"}</span>
            <svg viewBox="0 0 24 24" className={`w-3 h-3 fill-current transition-transform ${expanded ? "rotate-180" : ""}`}>
              <path d="M7 14l5-5 5 5H7z" />
            </svg>
          </button>

        </div>
      </div>

      {/* ── Disclaimer bar — only visible when log is expanded ── */}
      {expanded && (
        <div className="bg-[#010710] border-b border-white/5 py-2 text-center select-none">
          <span className="text-red-500 text-sm font-black tracking-wide block">
            {totalCalls} calls logged {currentYear} &nbsp;&middot;&nbsp; CENCOM 911 &nbsp;&middot;&nbsp; Complimentary of CHIEF 360 Public Safety Application
          </span>
          <span className="text-red-500/70 text-[10px] tracking-wide block mt-1">
            CENCOM 911 dispatch data may contain occasional errors. Actual call volume can vary but by minimal difference. Millstadt EMS makes every effort to monitor and correct the log to reflect accurate information.
          </span>
        </div>
      )}

    </div>
  );
}
