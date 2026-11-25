"use client";

import { memo, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type RefObject } from "react";
import type * as Leaflet from "leaflet";
import { milesFromStation } from "@/lib/station/cad/geo";
import {
  CALL_PHASES, PHASE_LABELS, STATION_POINT, phaseRank,
  type CallPhase, type StationCall, type StationCallsResponse, type StationFeedHealth,
} from "@/lib/station/cad/types";
import styles from "./StationCalls.module.css";

// Live CAD calls on the station TV. Self-contained: it fills its parent (meant to sit over the village
// on the 16:9 station screen), polls /api/station/calls every ~10 seconds, and ticks its timers every
// second. With no calls it shows nothing at all (just a small chip if the feed is down). One call: a
// big dark map with the incident pinned next to the station, and a card with the call type, address,
// units, status times and a live timer. Several calls: numbered, colour-matched pins, a compact list
// and a timeline of every call from dispatch to now. Sized in --cu (1% of the panel height, or less on
// a narrow panel), so it reads the same from across the room on any TV.

type DemoMode = "demo" | "demo3";

export interface StationCallsProps {
  /** Told how many calls are active (not yet clear) and how many are on screen (active plus calls
   *  that cleared in the last few minutes) whenever either changes. */
  onActiveChange?: (active: number, shown: number) => void;
  /** Serve synthetic calls (development only; production ignores it). */
  demo?: DemoMode | boolean;
  className?: string;
}

const POLL_MS = 10_000;
const DEMO_POLL_MS = 4000;
const REQUEST_TIMEOUT_MS = 9000;
const OFFLINE_AFTER_FAILURES = 3;
const OFFLINE_AFTER_MS = 10 * 60_000;
/** Without a good answer for this long, calls are taken off the screen rather than shown stale. */
const DROP_AFTER_MS = 15 * 60_000;
const ALERT_MS = 6500;
const CALL_COLORS = ["#22d3ee", "#e879f9", "#a3e635", "#f8fafc", "#2dd4bf", "#facc15"];

// ── Small client stores (no effects that set state) ───────────────────────────────────────────────

let tickNow = 0;
let tickTimer: number | undefined;
const tickListeners = new Set<() => void>();
function tickLoop() {
  tickNow = Date.now();
  tickListeners.forEach((listener) => listener());
  tickTimer = window.setTimeout(tickLoop, 1000 - (Date.now() % 1000) + 8);
}
function subscribeTick(listener: () => void) {
  tickListeners.add(listener);
  if (tickListeners.size === 1) {
    tickNow = Date.now();
    tickTimer = window.setTimeout(tickLoop, 1000 - (Date.now() % 1000) + 8);
  }
  return () => {
    tickListeners.delete(listener);
    if (!tickListeners.size) window.clearTimeout(tickTimer);
  };
}
/** Wall-clock milliseconds, re-rendering once a second (0 on the server and the first paint). */
function useTick() {
  return useSyncExternalStore(subscribeTick, () => tickNow, () => 0);
}

const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeMotion(listener: () => void) {
  const query = typeof window.matchMedia === "function" ? window.matchMedia(MOTION_QUERY) : null;
  query?.addEventListener?.("change", listener);
  return () => query?.removeEventListener?.("change", listener);
}
function useReducedMotion() {
  return useSyncExternalStore(
    subscribeMotion,
    () => (typeof window.matchMedia === "function" ? window.matchMedia(MOTION_QUERY).matches : false),
    () => false,
  );
}

const noSubscribe = () => () => undefined;
function useSearch() {
  return useSyncExternalStore(noSubscribe, () => window.location.search, () => null);
}

// ── Time ──────────────────────────────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");

const centralFormat = (() => {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  } catch {
    return null;
  }
})();

/** US Central for TV browsers without time-zone data: CDT from the second Sunday in March to the
 *  first Sunday in November. */
function manualCentral(ms: number) {
  const date = new Date(ms);
  const year = date.getUTCFullYear();
  const sunday = (month: number, n: number) => 1 + ((7 - new Date(Date.UTC(year, month, 1)).getUTCDay()) % 7) + (n - 1) * 7;
  const daylight = ms >= Date.UTC(year, 2, sunday(2, 2), 8) && ms < Date.UTC(year, 10, sunday(10, 1), 7);
  const local = new Date(ms - (daylight ? 5 : 6) * 3600_000);
  return `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
}

/** 24-hour Central time, as the CAD prints it: "17:30". */
function clock(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "--:--";
  const ms = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(ms)) return "--:--";
  if (centralFormat) {
    try {
      const parts = centralFormat.formatToParts(new Date(ms));
      const hour = Number(parts.find((p) => p.type === "hour")?.value);
      const minute = Number(parts.find((p) => p.type === "minute")?.value);
      if (Number.isFinite(hour) && Number.isFinite(minute)) return `${pad(hour % 24)}:${pad(minute)}`;
    } catch { /* fall back */ }
  }
  return manualCentral(ms);
}

/** "4:07", or "1:02:33" past an hour. */
function duration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = s % 60;
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

const t = (iso: string | null | undefined) => (iso ? Date.parse(iso) : NaN);

function elapsedOf(call: StationCall, now: number) {
  const end = call.closedAt ? t(call.closedAt) : now;
  return Math.max(0, end - t(call.dispatchedAt));
}

// ── The feed ──────────────────────────────────────────────────────────────────────────────────────

interface FeedState {
  calls: StationCall[];
  available: boolean;
  reason: string | null;
  health: StationFeedHealth | null;
  /** Server clock minus this TV's clock, so timers are right even when the TV's clock is off. */
  offset: number;
  failures: number;
  lastOk: number;
  loaded: boolean;
  /** When each call first appeared (after the first answer), for the attention transition. */
  arrivals: Record<string, number>;
  /** When each call's status last changed, for the highlight. */
  changes: Record<string, number>;
}

const EMPTY_FEED: FeedState = {
  calls: [], available: true, reason: null, health: null, offset: 0, failures: 0, lastOk: 0, loaded: false, arrivals: {}, changes: {},
};

function prune(map: Record<string, number>, now: number, ids: Set<string>) {
  const out: Record<string, number> = {};
  for (const [id, at] of Object.entries(map)) if (now - at < 60_000 && ids.has(id)) out[id] = at;
  return out;
}

function useCallFeed(mode: DemoMode | null, review: boolean, enabled: boolean, skipSeconds: number): FeedState {
  const [state, setState] = useState<FeedState>(EMPTY_FEED);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let timer: number | undefined;
    let controller: AbortController | null = null;
    // Demo stories run from this moment (a dev-only skip jumps ahead to the later phases).
    const t0 = Date.now() - skipSeconds * 1000;
    const poll = async () => {
      controller = new AbortController();
      const params = new URLSearchParams();
      if (mode) { params.set("demo", mode); params.set("t0", String(t0)); }
      if (review) params.set("station-review", "1");
      const query = params.toString();
      const abort = window.setTimeout(() => controller?.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(`/api/station/calls${query ? `?${query}` : ""}`, {
          cache: "no-store", credentials: "same-origin", signal: controller.signal, headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error(`calls ${response.status}`);
        const data = (await response.json()) as StationCallsResponse;
        if (!alive) return;
        const received = Date.now();
        const offset = Date.parse(data.serverTime) - received;
        const calls = Array.isArray(data.calls) ? data.calls : [];
        setState((prev) => {
          const ids = new Set(calls.map((c) => c.id));
          const arrivals = prune(prev.arrivals, received, ids);
          const changes = prune(prev.changes, received, ids);
          if (prev.loaded) {
            const before = new Map(prev.calls.map((c) => [c.id, c]));
            for (const call of calls) {
              const old = before.get(call.id);
              if (!old) arrivals[call.id] = received;
              else if (old.phase !== call.phase) changes[call.id] = received;
            }
          }
          return {
            calls,
            available: data.available,
            reason: data.available ? null : data.reason,
            health: data.available ? data.feed : null,
            offset: Number.isFinite(offset) && Math.abs(offset) < 7 * 86400_000 ? offset : 0,
            failures: 0,
            lastOk: received,
            loaded: true,
            arrivals,
            changes,
          };
        });
      } catch {
        if (alive) setState((prev) => ({ ...prev, failures: prev.failures + 1 }));
      } finally {
        window.clearTimeout(abort);
        if (alive) timer = window.setTimeout(poll, mode ? DEMO_POLL_MS : POLL_MS);
      }
    };
    void poll();
    return () => {
      alive = false;
      window.clearTimeout(timer);
      controller?.abort();
    };
  }, [mode, review, enabled, skipSeconds]);
  return state;
}

// ── Panel size ────────────────────────────────────────────────────────────────────────────────────

function usePanelUnit(ref: RefObject<HTMLDivElement | null>) {
  const [unit, setUnit] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (w && h) setUnit(Math.max(3, Math.min(h / 70.5, w / 177.8)));
    };
    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      return () => observer.disconnect();
    }
    const frame = window.requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("resize", measure); };
  }, [ref]);
  return unit;
}

// ── The map ───────────────────────────────────────────────────────────────────────────────────────

interface MapPin {
  id: string;
  label: string;
  color: string;
  lat: number;
  lon: number;
  state: "active" | "clear";
}

// OpenStreetMap's standard tiles, darkened in CSS. (CARTO's dark tiles, which the weather radar uses,
// now answer every request without an API key with an "API KEY REQUIRED" watermark.)
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

function pinHtml(pin: MapPin, single: boolean) {
  const label = single ? "" : pin.label.replace(/[^0-9A-Z]/gi, "");
  return `<div class="${styles.pin}" data-single="${single ? "1" : "0"}" data-state="${pin.state}" style="--pin:${pin.color}"><i></i><i></i><b>${label}</b></div>`;
}

const CallsMap = memo(function CallsMap({ pins, single, reduced, tileScale }: { pins: MapPin[]; single: boolean; reduced: boolean; tileScale: 1 | 2 | 4 }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const libRef = useRef<typeof Leaflet | null>(null);
  const tilesRef = useRef<Leaflet.TileLayer | null>(null);
  const markersRef = useRef(new Map<string, Leaflet.Marker>());
  const fitRef = useRef("");
  const viewRef = useRef({ pins, single, reduced });
  const [ready, setReady] = useState(false);

  // Fit the incidents and the station, with room for the pins at the edges.
  const fit = (force: boolean) => {
    const L = libRef.current, map = mapRef.current;
    if (!L || !map) return;
    const { pins: current, single: one, reduced: still } = viewRef.current;
    const signature = `${one ? "1" : "n"}|${current.map((p) => `${p.id}:${p.lat.toFixed(5)},${p.lon.toFixed(5)}`).join("|")}`;
    if (!force && signature === fitRef.current) return;
    fitRef.current = signature;
    const size = map.getSize();
    if (!size.x || !size.y) return;
    const station: [number, number] = [STATION_POINT.lat, STATION_POINT.lon];
    if (!current.length) {
      map.setView(station, 14, { animate: false });
      return;
    }
    const bounds = L.latLngBounds([station, ...current.map((p) => [p.lat, p.lon] as [number, number])]);
    const padding = Math.round(Math.min(size.x, size.y) * 0.16);
    const options = { padding: [padding, padding] as [number, number], maxZoom: one ? 16 : 15 };
    if (still || force) map.fitBounds(bounds, { ...options, animate: false });
    else map.flyToBounds(bounds, { ...options, duration: 1.4 });
  };

  useEffect(() => {
    let alive = true;
    let observer: ResizeObserver | null = null;
    const markers = markersRef.current;
    void (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (!alive || !hostRef.current || mapRef.current) return;
      libRef.current = L;
      const map = L.map(hostRef.current, {
        zoomControl: false, attributionControl: true, dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
        boxZoom: false, keyboard: false, touchZoom: false, zoomSnap: 0.25, zoomDelta: 0.25, inertia: false,
      });
      map.attributionControl.setPrefix(false);
      map.setView([STATION_POINT.lat, STATION_POINT.lon], 14);
      L.marker([STATION_POINT.lat, STATION_POINT.lon], {
        icon: L.divIcon({ className: styles.markerHost, html: `<div class="${styles.station}"><b>EMS</b><span>Station</span></div>`, iconSize: [0, 0], iconAnchor: [0, 0] }),
        keyboard: false, interactive: false, zIndexOffset: -500,
      }).addTo(map);
      mapRef.current = map;
      if (typeof ResizeObserver === "function") {
        observer = new ResizeObserver(() => { map.invalidateSize({ animate: false }); fit(true); });
        observer.observe(hostRef.current);
      }
      setReady(true);
    })();
    return () => {
      alive = false;
      observer?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      tilesRef.current = null;
      markers.clear();
    };
    // The map is created once; fit reads refs only.
  }, []);

  useEffect(() => {
    const L = libRef.current, map = mapRef.current;
    if (!ready || !L || !map) return;
    tilesRef.current?.remove();
    // Tiles are drawn at 2x (4x on a 4K TV running at 1x) so street names read from across the room.
    tilesRef.current = L.tileLayer(TILE_URL, {
      attribution: "&copy; OpenStreetMap contributors", maxZoom: 19 + Math.log2(tileScale),
      tileSize: 256 * tileScale, zoomOffset: -Math.log2(tileScale),
    }).addTo(map);
  }, [ready, tileScale]);

  useEffect(() => {
    const L = libRef.current, map = mapRef.current;
    viewRef.current = { pins, single, reduced };
    if (!ready || !L || !map) return;
    const markers = markersRef.current;
    const ids = new Set(pins.map((p) => p.id));
    for (const [id, marker] of markers) if (!ids.has(id)) { marker.remove(); markers.delete(id); }
    for (const pin of pins) {
      const html = pinHtml(pin, single);
      const existing = markers.get(pin.id);
      if (existing) {
        existing.setLatLng([pin.lat, pin.lon]);
        if ((existing.options.icon?.options as Leaflet.DivIconOptions | undefined)?.html !== html) existing.setIcon(L.divIcon({ className: styles.markerHost, html, iconSize: [0, 0], iconAnchor: [0, 0] }));
      } else {
        markers.set(pin.id, L.marker([pin.lat, pin.lon], {
          icon: L.divIcon({ className: styles.markerHost, html, iconSize: [0, 0], iconAnchor: [0, 0] }),
          keyboard: false, interactive: false, zIndexOffset: 1000,
        }).addTo(map));
      }
    }
    fit(false);
  }, [ready, pins, single, reduced]);

  return <div ref={hostRef} className={styles.map} aria-hidden="true" />;
});

// ── Pieces ────────────────────────────────────────────────────────────────────────────────────────

const phaseStyle = (phase: CallPhase) => ({ "data-phase": phase });

function where(call: StationCall) {
  return [call.address ?? call.place ?? "Address not given", call.city].filter(Boolean).join(", ");
}

function PhaseChips({ call, flashKey }: { call: StationCall; flashKey: number | undefined }) {
  const reached = phaseRank(call.phase);
  return (
    <ol className={styles.chips} aria-label="Status times">
      {CALL_PHASES.map((phase) => {
        const rank = phaseRank(phase);
        const time = call.times[phase];
        const state = phase === call.phase ? "now" : rank < reached ? "done" : "next";
        return (
          <li key={phase === call.phase ? `${phase}-${flashKey ?? 0}` : phase} className={styles.chip} data-state={state} {...phaseStyle(phase)}
            data-flash={phase === call.phase && flashKey ? "" : undefined}>
            <span>{PHASE_LABELS[phase]}</span>
            <b>{time ? clock(time) : state === "done" ? "—" : "--:--"}</b>
          </li>
        );
      })}
    </ol>
  );
}

function MapOverlays({ calls, single }: { calls: StationCall[]; single: boolean }) {
  const locating = calls.filter((c) => !c.location && c.locating);
  const missing = calls.filter((c) => !c.location && !c.locating);
  const first = calls[0];
  const miles = single && first?.location ? milesFromStation(first.location) : null;
  return (
    <>
      {locating.length > 0 && (
        <div className={styles.locating} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          <span>Locating{single ? "" : ` ${locating.length === 1 ? "1 call" : `${locating.length} calls`}`}…</span>
        </div>
      )}
      {locating.length === 0 && missing.length > 0 && (
        <div className={styles.mapNote}>{single ? "Address not found on the map" : `${missing.length} not on the map`}</div>
      )}
      <div className={styles.mapTags}>
        {miles !== null && <span className={styles.mapTag}>{miles < 0.1 ? "At the station" : `${miles.toFixed(miles < 10 ? 1 : 0)} mi from station`}</span>}
        {calls.some((c) => c.location?.approximate) && <span className={styles.mapTag} data-warn="">Approximate location</span>}
      </div>
    </>
  );
}

function SingleCall({ call, now, flashKey }: { call: StationCall; now: number; flashKey: number | undefined }) {
  const clear = call.phase === "clear";
  const sincePhase = now ? Math.max(0, (call.closedAt ? t(call.closedAt) : now) - t(call.phaseAt)) : 0;
  return (
    <section className={styles.card} aria-label="Call details" {...phaseStyle(call.phase)}>
      <div className={styles.cardTop}>
        {call.units.map((unit) => <span key={unit} className={styles.unit}>{unit}</span>)}
        {call.eventNumber && <span className={styles.event}>#{call.eventNumber}</span>}
      </div>
      <div className={styles.what}>
        <h2 className={styles.nature}>{call.nature}</h2>
        {call.detail && <p className={styles.detail}>{call.detail}</p>}
      </div>
      <div className={styles.address}>
        {call.place && <span className={styles.place}>{call.place}</span>}
        <span className={styles.street}>{call.address ?? "Address not given"}</span>
        {call.city && <span className={styles.city}>{call.city}</span>}
        {call.crossStreets && <span className={styles.cross}><small>X-ST</small> {call.crossStreets}</span>}
      </div>
      <div className={styles.elapsed} key={`elapsed-${flashKey ?? 0}`} data-flash={flashKey ? "" : undefined}>
        <span className={styles.elapsedTime} role="timer" aria-label="Time since dispatch">{now ? duration(elapsedOf(call, now)) : "--:--"}</span>
        <span className={styles.elapsedLabel}>
          <b className={styles.phaseNow}>{call.cancelled ? "Cancelled" : PHASE_LABELS[call.phase]}{!clear && now ? ` · ${duration(sincePhase)}` : ""}</b>
          <span>{clear ? "Total call time" : `Since dispatch at ${clock(call.dispatchedAt)}`}</span>
        </span>
      </div>
      <PhaseChips call={call} flashKey={flashKey} />
    </section>
  );
}

interface Tick { at: number; label: string }

function timeTicks(start: number, end: number): Tick[] {
  const span = end - start;
  const steps = [1, 2, 5, 10, 15, 20, 30, 60, 120, 180].map((m) => m * 60_000);
  const step = steps.find((s) => span / s <= 7) ?? steps[steps.length - 1];
  const ticks: Tick[] = [];
  for (let at = Math.ceil(start / step) * step; at <= end; at += step) ticks.push({ at, label: clock(at) });
  return ticks;
}

function Timeline({ calls, now, colors }: { calls: StationCall[]; now: number; colors: Map<string, string> }) {
  const starts = calls.map((c) => t(c.dispatchedAt));
  const ends = calls.map((c) => (c.closedAt ? t(c.closedAt) : now));
  const first = Math.min(...starts);
  const allClear = calls.every((c) => c.closedAt);
  const last = Math.max(...ends, allClear ? 0 : now);
  const lead = Math.max(60_000, (last - first) * 0.04);
  const start = first - lead;
  const end = last + Math.max(30_000, (last - first) * 0.03);
  const span = Math.max(1, end - start);
  const x = (ms: number) => `${(((Math.min(Math.max(ms, start), end) - start) / span) * 100).toFixed(3)}%`;
  const total = last - first;
  const combined = calls.reduce((sum, c) => sum + elapsedOf(c, now), 0);
  return (
    <section className={styles.timeline} aria-label="Timeline" data-rows={Math.min(calls.length, 6)}>
      <div className={styles.tlHead}>
        <span className={styles.tlTitle}>Timeline</span>
        <span className={styles.tlTotals}>
          <span>Total elapsed <b>{duration(total)}</b></span>
          <span>Combined <b>{duration(combined)}</b></span>
        </span>
      </div>
      <div className={styles.tlRows}>
        {calls.map((call, index) => {
          const closeAt = call.closedAt ? t(call.closedAt) : now;
          const marks = CALL_PHASES.map((phase) => ({ phase, at: t(call.times[phase]) })).filter((m) => Number.isFinite(m.at));
          if (!marks.length || marks[0].phase !== "dispatched") marks.unshift({ phase: "dispatched", at: t(call.dispatchedAt) });
          marks.sort((a, b) => a.at - b.at);
          return (
            <div key={call.id} className={styles.tlRow} style={{ "--call": colors.get(call.id) } as CSSProperties}>
              <span className={styles.tlBadge}>{index + 1}</span>
              <div className={styles.track}>
                {marks.map((mark, i) => {
                  if (mark.phase === "clear") return null;
                  const to = Math.min(i + 1 < marks.length ? marks[i + 1].at : closeAt, closeAt);
                  if (to <= mark.at) return null;
                  const width = ((to - mark.at) / span) * 100;
                  return (
                    <span key={mark.phase} className={styles.seg} {...phaseStyle(mark.phase)} style={{ left: x(mark.at), width: `${width.toFixed(3)}%` }}
                      data-open={!call.closedAt && i === marks.length - 1 ? "" : undefined}>
                      {width > 9 ? PHASE_LABELS[mark.phase] : ""}
                    </span>
                  );
                })}
                {call.closedAt && <span className={styles.clearMark} style={{ left: x(closeAt) }} />}
                {!allClear && <span className={styles.nowMark} style={{ left: x(now) }} />}
              </div>
              <span className={styles.tlTime}>{duration(elapsedOf(call, now))}</span>
            </div>
          );
        })}
      </div>
      <div className={styles.axis}>
        {timeTicks(start, end)
          .filter((tick) => allClear || Math.abs(tick.at - now) > span * 0.07)
          .map((tick) => <span key={tick.at} className={styles.tick} style={{ left: x(tick.at) }}>{tick.label}</span>)}
        {!allClear && <span className={styles.tickNow} style={{ left: x(now) }}>Now</span>}
      </div>
    </section>
  );
}

function CallList({ calls, now, colors, changes }: { calls: StationCall[]; now: number; colors: Map<string, string>; changes: Record<string, number> }) {
  return (
    <ol className={styles.list} aria-label="Calls" data-count={Math.min(calls.length, 6)}>
      {calls.map((call, index) => (
        <li key={`${call.id}-${changes[call.id] ?? 0}`} className={styles.row} style={{ "--call": colors.get(call.id) } as CSSProperties}
          {...phaseStyle(call.phase)} data-flash={changes[call.id] ? "" : undefined} data-clear={call.closedAt ? "" : undefined}>
          <span className={styles.badge}>{index + 1}</span>
          <span className={styles.rowMain}>
            <span className={styles.rowNature}>{call.nature}{call.detail ? <small> · {call.detail}</small> : null}</span>
            <span className={styles.rowWhere}>{where(call)}{call.units.length ? <em> · {call.units.join(" ")}</em> : null}</span>
          </span>
          <span className={styles.pill}>{call.cancelled ? "Cancelled" : PHASE_LABELS[call.phase]}</span>
          <span className={styles.rowTime} role="timer">{now ? duration(elapsedOf(call, now)) : "--:--"}</span>
        </li>
      ))}
    </ol>
  );
}

// ── The panel ─────────────────────────────────────────────────────────────────────────────────────

export default function StationCalls({ onActiveChange, demo, className }: StationCallsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const search = useSearch();
  const flags = useMemo(() => {
    if (search === null) return null;
    const params = new URLSearchParams(search);
    const fromUrl = params.get("preview") === "ve" ? params.get("station-cad") : null;
    const mode: DemoMode | null = demo === true ? "demo" : demo ? demo : fromUrl === "demo" || fromUrl === "demo3" ? fromUrl : null;
    const skip = Number(params.get("station-cad-skip"));
    return { mode, review: params.get("station-review") === "1", skip: mode && Number.isFinite(skip) ? Math.min(Math.max(skip, 0), 3600) : 0 };
  }, [search, demo]);
  const feed = useCallFeed(flags?.mode ?? null, flags?.review ?? false, flags !== null, flags?.skip ?? 0);
  const reduced = useReducedMotion();
  const unit = usePanelUnit(rootRef);
  const wall = useTick();
  const now = wall ? wall + feed.offset : 0;

  const stale = feed.loaded && wall > 0 && wall - feed.lastOk > DROP_AFTER_MS;
  const calls = useMemo(() => (stale ? [] : feed.calls), [stale, feed.calls]);
  const active = calls.filter((c) => !c.closedAt).length;
  const shown = calls.length;

  const onChange = useRef(onActiveChange);
  useEffect(() => { onChange.current = onActiveChange; }, [onActiveChange]);
  useEffect(() => { onChange.current?.(active, shown); }, [active, shown]);

  const single = shown === 1;
  const colors = useMemo(() => new Map(calls.map((c, i) => [c.id, single ? "#ff3b47" : CALL_COLORS[i % CALL_COLORS.length]])), [calls, single]);
  const pinKey = calls.map((c) => `${c.id}:${c.location ? `${c.location.lat},${c.location.lon}` : "-"}:${c.closedAt ? 1 : 0}:${colors.get(c.id)}`).join("|");
  const pins = useMemo<MapPin[]>(() => calls.flatMap((c, i) => (c.location ? [{
    id: c.id, label: String(i + 1), color: colors.get(c.id) ?? "#ff3b47", lat: c.location.lat, lon: c.location.lon, state: c.closedAt ? "clear" as const : "active" as const,
  }] : [])),
  // pinKey captures everything the pins depend on.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [pinKey]);

  // Delayed: the server's last good sync is a few minutes old. Offline: no answer from the server,
  // a feed that never synced, or one that has been failing for ten minutes.
  const sinceOk = feed.health?.lastOkAt && now ? now - Date.parse(feed.health.lastOkAt) : null;
  const offline = !feed.available || feed.failures >= OFFLINE_AFTER_FAILURES || stale ||
    (feed.health !== null && (sinceOk === null ? Boolean(feed.health.error) : sinceOk > OFFLINE_AFTER_MS));
  const delayed = !offline && Boolean(feed.health?.delayed);
  const feedChip = offline ? "CAD feed offline" : delayed ? "CAD feed delayed" : null;

  const latestArrival = Object.entries(feed.arrivals).sort((a, b) => b[1] - a[1])[0];
  const alertCall = latestArrival && wall - latestArrival[1] < ALERT_MS ? calls.find((c) => c.id === latestArrival[0]) : undefined;
  const allClear = shown > 0 && active === 0;
  const demoBadge = feed.health?.demo ? "Demo" : null;

  const style = { ...(unit ? { "--cu": `${unit.toFixed(2)}px` } : {}) } as CSSProperties;

  return (
    <div ref={rootRef} className={[styles.root, className].filter(Boolean).join(" ")} style={style}
      data-live={shown ? "" : undefined} data-layout={shown ? (single ? "single" : "multi") : undefined} data-clear={allClear ? "" : undefined}
      data-reduced={reduced ? "" : undefined} aria-live="polite">
      {shown > 0 && (
        <>
          <header className={styles.bar}>
            <span className={styles.live}><span className={styles.liveDot} aria-hidden="true" />
              {allClear ? (shown === 1 ? "Call cleared" : "Calls cleared") : active === 1 ? "Active call" : `${active} active calls`}
              {!allClear && shown > active ? <small> · {shown - active} cleared</small> : null}
            </span>
            <span className={styles.barMeta}>
              {demoBadge && <span className={styles.demo}>{demoBadge}</span>}
              {feedChip ? <span className={styles.barWarn}>{feedChip}</span> : <span>Live from CAD{feed.lastOk && wall ? ` · updated ${Math.max(0, Math.round((wall - feed.lastOk) / 1000))}s ago` : ""}</span>}
            </span>
          </header>
          <div className={styles.body} data-layout={single ? "single" : "multi"}>
            <div className={styles.mapWrap}>
              <CallsMap pins={pins} single={single} reduced={reduced} tileScale={unit >= 16 ? 4 : unit >= 7 ? 2 : 1} />
              <MapOverlays calls={calls} single={single} />
            </div>
            {single ? (
              <SingleCall call={calls[0]} now={now} flashKey={feed.changes[calls[0].id]} />
            ) : (
              <div className={styles.side} data-count={Math.min(shown, 6)}>
                <CallList calls={calls} now={now} colors={colors} changes={feed.changes} />
                {now > 0 && <Timeline calls={calls} now={now} colors={colors} />}
              </div>
            )}
          </div>
          {alertCall && (
            <div key={`${alertCall.id}-${latestArrival?.[1]}`} className={styles.alert} role="alert">
              <div className={styles.alertCard}>
                <span className={styles.alertKicker}>New call</span>
                <span className={styles.alertNature}>{alertCall.nature}</span>
                <span className={styles.alertWhere}>{where(alertCall)}</span>
              </div>
            </div>
          )}
        </>
      )}
      {shown === 0 && feedChip && <div className={styles.feedChip} role="status">{feedChip}</div>}
    </div>
  );
}
