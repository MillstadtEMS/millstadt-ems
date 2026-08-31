"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { PLATFORM_ORIGIN_DISCLAIMER, DISPOSITION_DISCLAIMER } from "@/lib/cad/disclaimers";
import { DEFAULT_HOVER_SETTINGS, type HoverFieldSettings } from "@/lib/cad/hoverSettings";

interface Call {
  id: string;
  dispatchDate: string;
  dispatchTime: string;
  dispatchNature: string;
  dispatchDatetime: string;
  sourceYear: number;
  completedAt: string | null;
  // ── Structured fields for the hover info box (all optional). These do
  // NOT influence the scrolling ticker text, only the popup. ──
  units?: string[];
  category?: string | null;
  classification?: string | null;
  notes?: string | null;
  mutualAidReceived?: boolean;
  mutualAidReceivedAgency?: string | null;
  mutualAidGiven?: boolean;
  mutualAidGivenAgency?: string | null;
  fireResponded?: boolean;
  fireAgencies?: string[];
  policeResponded?: boolean;
  policeAgencies?: string[];
  emsMutualAid?: boolean;
  emsMutualAidAgencies?: string[];
  unitDispositions?: Record<string, string>;
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

function timeAgo(d: Date): string {
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  const days = Math.floor(sec / 86400);
  return `${days}d ago`;
}

// ── Hover info box helpers ──────────────────────────────────────────────────

/** Outline color for the info box, keyed to the responding unit and
 * matching the ticker's per-unit colors. 3935 green, 3925 orange,
 * 3926 blue; mutual-aid amber; otherwise neutral. */
function boxAccent(call: Call): string {
  const u = call.units ?? [];
  if (u.some((x) => x.includes("3935"))) return "#34d399";
  if (u.some((x) => x.includes("3925"))) return "#fb923c";
  if (u.some((x) => x.includes("3926"))) return "#60a5fa";
  if (call.mutualAidReceived) return "#f0b429";
  return "#64748b";
}

/** EMS / PD / Fire entries for the Units row, in that order, each with a
 * display color. */
function unitEntries(call: Call, showDisposition = true): { label: string; color: string }[] {
  const out: { label: string; color: string }[] = [];
  const dispos = call.unitDispositions ?? {};
  for (const u of call.units ?? []) {
    const color = u.includes("3935") ? "#34d399" : u.includes("3925") ? "#fb923c" : u.includes("3926") ? "#60a5fa" : "#e2e8f0";
    const d = showDisposition ? dispos[u] : undefined;
    out.push({ label: d ? `${u} · ${d}` : u, color });
  }
  if (call.mutualAidReceived && call.mutualAidReceivedAgency) {
    out.push({ label: call.mutualAidReceivedAgency, color: "#86efac" });
  }
  const pd = call.policeResponded ? (call.policeAgencies?.length ? call.policeAgencies : ["Police"]) : [];
  for (const a of pd) out.push({ label: a, color: "#93c5fd" });
  const fire = call.fireResponded ? (call.fireAgencies?.length ? call.fireAgencies : ["Fire Dept"]) : [];
  for (const a of fire) out.push({ label: a, color: "#fca5a5" });
  return out;
}

function classificationLabel(c: string | null | undefined): string | null {
  if (!c) return null;
  return c.charAt(0).toUpperCase() + c.slice(1);
}

/** The formatter appends "Mutual Aid Given to X" into the dispatch-nature
 * parenthetical, where it gets truncated off the end of long lines. We show
 * it instead as a dedicated badge, so strip the phrase from the inline text
 * to avoid showing it twice. Display-only — the stored nature is untouched. */
function stripMAGiven(nature: string): string {
  let s = nature;
  s = s.replace(/\s*;\s*Mutual Aid Given(?: to [^;)]+)?/gi, "");      // "; Mutual Aid Given to X" after other parts
  s = s.replace(/\s*\(\s*Mutual Aid Given(?: to [^)]+)?\s*\)/gi, ""); // "(Mutual Aid Given to X)" as the only part
  return s.trim();
}

function isToday(call: Call): boolean {
  const d = new Date(call.dispatchDatetime);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

/** Does the call carry any structured detail worth showing? */
function hasInfo(call: Call): boolean {
  return !!(
    (call.units && call.units.length) ||
    call.category ||
    call.classification ||
    call.notes ||
    call.fireResponded ||
    call.policeResponded ||
    call.emsMutualAid ||
    call.mutualAidReceived
  );
}

function fmtDuration(ms: number): string {
  if (ms <= 0) return "—";
  const min = Math.round(ms / 60000);
  if (min < 1) return "<1 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function fmtClosed(iso: string): string {
  const d = new Date(iso);
  const t = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  const day = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${day} · ${t}`;
}

function StarOfLife({ size = 18 }: { size?: number }) {
  // Simplified Star of Life — six-spoke EMS emblem.
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <g fill="#38bdf8">
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <rect key={deg} x="44" y="8" width="12" height="84" rx="6" transform={`rotate(${deg} 50 50)`} />
        ))}
      </g>
    </svg>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(120px, max-content) 1fr", gap: 16, alignItems: "baseline" }}>
      <span style={{ color: "#7c899e", fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 600, lineHeight: 1.45 }}>{children}</span>
    </div>
  );
}

function CallInfoBox({ call, accent, cfg }: { call: Call; accent: string; cfg: HoverFieldSettings }) {
  const active = isActive(call);
  const pending = isToday(call) && !hasInfo(call);
  const entries = unitEntries(call, cfg.disposition);
  const cls = classificationLabel(call.classification);
  const completed = call.completedAt;
  const totalMs = completed ? new Date(completed).getTime() - new Date(call.dispatchDatetime).getTime() : 0;
  // A close time is only trustworthy if it's meaningfully AFTER dispatch.
  // Many legacy rows have completed_at == dispatch time (or earlier), which
  // would show a bogus "closed @" and a ~0 total — hide those entirely.
  const closedOk = !!completed && totalMs >= 120_000; // ≥ 2 min after dispatch

  return (
    <div
      style={{
        width: "100%", maxWidth: "100%", maxHeight: "70vh", overflowY: "auto",
        background: "linear-gradient(165deg, rgba(10,22,40,0.985) 0%, rgba(2,9,18,0.985) 60%)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.10)", borderTop: `3px solid ${accent}`,
        borderRadius: 14, padding: "0 0 13px",
        boxShadow: `0 20px 55px rgba(0,0,0,0.65), 0 0 0 1px ${accent}22`,
        fontFamily: "inherit",
      }}
    >
      {/* Header band */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        padding: "14px 20px 12px",
        background: `linear-gradient(90deg, ${accent}24 0%, transparent 78%)`,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {active ? (
            <>
              <span className="ct-sol-pulse" style={{ display: "inline-flex" }}><StarOfLife size={20} /></span>
              <span style={{ color: "#38bdf8", fontSize: 13.5, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>On A Run</span>
            </>
          ) : (
            <>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: accent, boxShadow: `0 0 8px ${accent}` }} />
              <span style={{ color: accent, fontSize: 13.5, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>Call Detail</span>
            </>
          )}
        </span>
        <span style={{ color: "#8b98ac", fontSize: 13, fontWeight: 700, letterSpacing: "0.03em", whiteSpace: "nowrap", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace" }}>
          {call.dispatchDate} · {call.dispatchTime}
        </span>
      </div>

      <div style={{ display: "grid", gap: 11, padding: "15px 20px 0" }}>
        {cfg.closed && closedOk && <InfoRow label="Closed">{fmtClosed(completed!)}</InfoRow>}
        {cfg.totalTime && closedOk && <InfoRow label="Total time">{fmtDuration(totalMs)}</InfoRow>}

        {pending ? (
          <div style={{ color: "#94a3b8", fontSize: 12.5, fontStyle: "italic", padding: "4px 0" }}>
            Call information pending.
          </div>
        ) : (
          <>
            {/* Complaint (the call's nature) leads the box, before Units. */}
            {cfg.complaint && call.category && <InfoRow label="Complaint">{call.category}</InfoRow>}
            {cfg.category && cls && <InfoRow label="Category">{cls}</InfoRow>}

            {cfg.units && entries.length > 0 && (
              <InfoRow label="Units">
                <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 5 }}>
                  {entries.map((e, i) => (
                    <span key={`${e.label}-${i}`} style={{
                      display: "inline-flex", padding: "3px 10px", borderRadius: 7,
                      background: "rgba(255,255,255,0.05)", border: `1px solid ${e.color}55`,
                      color: e.color, fontSize: 13.5, fontWeight: 700,
                    }}>{e.label}</span>
                  ))}
                </span>
              </InfoRow>
            )}

            {/* When another agency requests Millstadt EMS for help (we give
                mutual aid), show a pill: Millstadt EMS <our units> →
                <requesting agency>. */}
            {cfg.emsMutualAid && call.mutualAidGiven && (
              <InfoRow label="Mutual Aid">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 9, flexWrap: "wrap", padding: "5px 13px", borderRadius: 999, background: "rgba(240,180,41,0.12)", border: "1px solid rgba(240,180,41,0.42)", fontSize: 14, fontWeight: 700, lineHeight: 1.25 }}>
                  <span style={{ color: "#e2e8f0" }}>Millstadt EMS</span>
                  {(call.units?.length ?? 0) > 0 && <span style={{ color: "#f0b429", fontWeight: 800 }}>{call.units!.join(", ")}</span>}
                  <span aria-hidden style={{ color: "#94a3b8", fontWeight: 900, fontSize: 16 }}>→</span>
                  <span style={{ color: "#f0b429" }}>{call.mutualAidGivenAgency || "Requesting agency"}</span>
                </span>
              </InfoRow>
            )}

            {cfg.emsMutualAid && call.emsMutualAid && (call.emsMutualAidAgencies?.length ?? 0) > 0 && (
              <InfoRow label="EMS Mutual Aid">{call.emsMutualAidAgencies!.join(", ")}</InfoRow>
            )}

            {cfg.notes && call.notes && <InfoRow label="Notes">{call.notes}</InfoRow>}
          </>
        )}
      </div>

      {/* Total-time qualifier */}
      {cfg.totalTime && closedOk && (
        <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.5, margin: "12px 20px 0", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          Total time spans the first unit dispatched to the incident being cleared in CAD. It reflects all responding agencies
          (Fire, PD, EMS) — not EMS patient-care time.
        </div>
      )}

      {/* Disclaimers */}
      <div style={{ color: "#5b6675", fontSize: 11, lineHeight: 1.5, margin: "12px 20px 0", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        {PLATFORM_ORIGIN_DISCLAIMER}
        {cfg.disposition && Object.keys(call.unitDispositions ?? {}).length > 0 && <> {DISPOSITION_DISCLAIMER}</>}
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CallTicker() {
  const pathname                    = usePathname();
  const [latest, setLatest]       = useState<Call[]>([]);
  const [allCalls, setAllCalls]   = useState<Call[]>([]);
  const [callCount, setCallCount] = useState<number | null>(null);
  const [expanded, setExpanded]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [now, setNow]           = useState<Date>(new Date());
  const [popup, setPopup]       = useState<{ call: Call; rect: DOMRect } | null>(null);
  const [hoverCfg, setHoverCfg] = useState<HoverFieldSettings>(DEFAULT_HOVER_SETTINGS);
  const wrapperRef              = useRef<HTMLDivElement>(null);
  const scrollRef               = useRef<HTMLDivElement>(null);
  const prevIdsRef              = useRef<Set<string>>(new Set());

  // Open/close helpers for the hover info box.
  const hoverIn = useCallback((call: Call, el: HTMLElement) => {
    setPopup({ call, rect: el.getBoundingClientRect() });
  }, []);
  const closeInfo = useCallback(() => setPopup(null), []);

  // The ticker lives in the root layout, so clear transient overlays when a
  // login or any other navigation changes the page beneath it.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      closeInfo();
      setExpanded(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, closeInfo]);

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

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/cad/summary");
      if (res.ok) {
        const summary: { total?: unknown } = await res.json();
        if (typeof summary.total === "number") setCallCount(summary.total);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    // Re-read the admin hover-box visibility config on every poll so toggling
    // a field off in /admin (e.g. disposition) goes live within POLL_INTERVAL
    // — not only after a full page reload.
    const loadHoverCfg = () =>
      fetch("/api/cad/hover-settings", { cache: "no-store" })
        .then(r => (r.ok ? r.json() : null))
        .then(s => { if (s) setHoverCfg({ ...DEFAULT_HOVER_SETTINGS, ...s }); })
        .catch(() => { /* keep defaults */ });
    fetchLatest();
    fetchCount();
    loadHoverCfg();
    const pollId = setInterval(() => { fetchLatest(); fetchCount(); loadHoverCfg(); }, POLL_INTERVAL);
    return () => clearInterval(pollId);
  }, [fetchLatest, fetchCount]);

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

  const totalCalls = callCount ?? 0;

  return (
    <div ref={wrapperRef} className="fixed top-0 left-0 right-0 z-[60]">
      <style>{CALL_TICKER_CSS}</style>

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
              <div className="flex items-center gap-3">
                {allCalls[0]?.dispatchDatetime && (
                  <span className="text-slate-400 text-xs tabular-nums">
                    Last: {timeAgo(new Date(allCalls[0].dispatchDatetime))}
                  </span>
                )}
                <span className="text-red-500 text-sm font-black">
                  {totalCalls} call{totalCalls !== 1 ? "s" : ""} this year
                </span>
              </div>
            </div>

            {/* Scrollable call list with ambulance scrollbar */}
            <div ref={scrollRef} className="ticker-log-scroll flex-1 overflow-y-auto min-h-0" onScroll={closeInfo}>
              <div className="divide-y divide-white/5">
                {/* Live API calls */}
                {allCalls.map((call) => {
                  const active = isActive(call);
                  // Extract unit from dispatchNature if present, e.g. "[3935] Seizure"
                  const unitMatch = call.dispatchNature.match(/^\[([^\]]+)\]/);
                  const unitNum = unitMatch ? unitMatch[1] : "";
                  return (
                    <div
                      key={call.id}
                      className="flex items-center gap-3 py-2.5 px-1 cursor-pointer hover:bg-white/[0.03] rounded"
                      onMouseEnter={(e) => hoverIn(call, e.currentTarget)}
                      onMouseLeave={closeInfo}
                    >
                      {active && <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-400 animate-pulse" />}
                      <span className="text-white/70 text-sm tabular-nums w-24 shrink-0">{call.dispatchDate}</span>
                      <span className="text-white/70 text-sm tabular-nums w-14 shrink-0 font-mono">{call.dispatchTime}</span>
                      <span className={`text-sm font-bold uppercase tracking-wide truncate min-w-0 flex-1 ${active ? "text-emerald-300" : "text-white"}`}>
                        {unitNum ? (
                          <><span className={unitColor(unitNum)}>[{unitNum}]</span> {stripMAGiven(call.dispatchNature).replace(/^\[[^\]]+\]\s*/, "")}</>
                        ) : stripMAGiven(call.dispatchNature)}
                      </span>
                    </div>
                  );
                })}

              </div>

              {allCalls.length === 0 && (
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
            <div className="flex-1 min-w-0 overflow-hidden ct-callinfo">
              {onARun && activeCall ? (
                <div
                  className="flex items-center gap-1.5 min-w-0 cursor-pointer"
                  onMouseEnter={(e) => hoverIn(activeCall, e.currentTarget)}
                  onMouseLeave={closeInfo}
                >
                  <span className="text-emerald-300 font-black text-[11px] tracking-widest uppercase whitespace-nowrap">Responding</span>
                  <span className="text-white/20 shrink-0">&middot;</span>
                  <span className="text-white font-bold text-[11px] truncate min-w-0 flex-1">{stripMAGiven(activeCall.dispatchNature)}</span>
                </div>
              ) : lastRun ? (
                <div
                  className="flex items-center gap-1.5 min-w-0 cursor-pointer"
                  onMouseEnter={(e) => hoverIn(lastRun, e.currentTarget)}
                  onMouseLeave={closeInfo}
                >
                  <span className="text-slate-500 text-[10px] whitespace-nowrap shrink-0">Last</span>
                  <span className="text-white font-bold tabular-nums font-mono text-[10px] whitespace-nowrap shrink-0">{shortDate(lastRun.dispatchDate)} {lastRun.dispatchTime}</span>
                  <span className="text-white/20 shrink-0">&middot;</span>
                  <span className="text-[#f0b429] font-bold text-[11px] truncate min-w-0 flex-1">{stripMAGiven(lastRun.dispatchNature)}</span>
                </div>
              ) : (
                <span className="text-slate-600 text-[10px]">No active incidents.</span>
              )}
            </div>
          )}
          {expanded && <div className="flex-1" />}

          {/* ── Date & Time — landscape phones, tablets, desktop ── */}
          <div className="shrink-0 items-center gap-1.5 ct-dt">
            <span className="text-white text-[11px] tabular-nums font-mono font-bold">{formatDate(now)}</span>
            <span className="text-white text-[11px] tabular-nums font-mono font-bold">{formatClock(now)}</span>
          </div>

          <span className="h-3 w-px bg-white/15 shrink-0 ct-dt-sep" />

          {/* ── Moon phase — desktop ── */}
          <div className="shrink-0 items-center gap-1 ct-moon" title={moon.name}>
            <span className="text-slate-500 text-[10px] font-bold tracking-wider uppercase">{moon.symbol} {moon.name}</span>
          </div>

          <span className="h-3 w-px bg-white/15 shrink-0 ct-moon-sep" />

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

      {/* ── Hover / tap info box ── */}
      {popup && (() => {
        const margin = 12;
        const r = popup.rect;
        const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
        const vh = typeof window !== "undefined" ? window.innerHeight : 800;
        // As wide as the ticker bar itself (the 1200px content wrap), centered
        // on screen — so it reads big and easy, not a cramped little card.
        const boxW = Math.min(1200, vw - margin * 2);
        const left = Math.round((vw - boxW) / 2);
        const placeAbove = r.bottom > vh * 0.55;
        const pos: React.CSSProperties = placeAbove
          ? { position: "fixed", left, width: boxW, bottom: Math.max(margin, vh - r.top + 6), zIndex: 80 }
          : { position: "fixed", left, width: boxW, top: r.bottom + 6, zIndex: 80 };
        return (
          <div style={{ ...pos, pointerEvents: "none" }}>
            <CallInfoBox call={popup.call} accent={boxAccent(popup.call)} cfg={hoverCfg} />
          </div>
        );
      })()}

      {/* ── Disclaimer bar — only visible when log is expanded ── */}
      {expanded && (
        <div className="bg-[#010710] border-b border-white/5 py-2 text-center select-none">
          <span className="text-red-500 text-sm font-black tracking-wide block">
            {totalCalls} calls logged {currentYear} &nbsp;&middot;&nbsp; CENCOM 911 &nbsp;&middot;&nbsp; Complimentary of CHIEF 360 Public Safety Application
          </span>
          <span className="text-red-500/70 text-[10px] tracking-wide block mt-1">
            CENCOM 911 dispatch data may contain occasional errors. Actual call volume can vary but by minimal difference. Millstadt EMS makes every effort to monitor and correct the log to reflect accurate information.
          </span>
          <span className="text-slate-500 text-[9.5px] leading-snug block mt-1 max-w-3xl mx-auto px-3">
            {PLATFORM_ORIGIN_DISCLAIMER}
          </span>
        </div>
      )}

    </div>
  );
}

// ── Responsive rules (presentation only) ──────────────────────────────
// The 46px strip height is intentionally fixed — the site nav docks at
// `top-[46px]` directly beneath it — so we adapt the CONTENT to the
// device/orientation rather than the bar height. Phone portrait stays
// compact; landscape phones and tablets reveal the date/time; desktop
// adds the moon phase and nudges the type up for readability.
const CALL_TICKER_CSS = `
.ct-dt, .ct-dt-sep, .ct-moon, .ct-moon-sep { display: none; }

/* Pulsing Star of Life for an active ("On A Run") call in the info box. */
.ct-sol-pulse { animation: ct-sol-pulse 1.6s ease-in-out infinite; transform-origin: center; }
@keyframes ct-sol-pulse {
  0%, 100% { transform: scale(1);    opacity: 1;   filter: drop-shadow(0 0 0 rgba(56,189,248,0)); }
  50%      { transform: scale(1.15); opacity: 0.85; filter: drop-shadow(0 0 6px rgba(56,189,248,0.7)); }
}

/* Phone held sideways — bring in the date + time. */
@media (orientation: landscape) and (min-width: 560px) {
  .ct-dt { display: flex; }
  .ct-dt-sep { display: block; }
}
/* Tablets / iPads and up, either orientation. */
@media (min-width: 768px) {
  .ct-dt { display: flex; }
  .ct-dt-sep { display: block; }
  .ct-callinfo span { font-size: 12px; }
}
/* Desktop — add the moon phase and a touch more size. */
@media (min-width: 1024px) {
  .ct-moon { display: flex; }
  .ct-moon-sep { display: block; }
  .ct-callinfo span { font-size: 12.5px; }
}
`;
