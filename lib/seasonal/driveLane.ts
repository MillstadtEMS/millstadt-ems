"use client";

import { useEffect, useRef, useState } from "react";

// The drive-by lane: one shared timetable for anything that drives through, or parks in, a band
// across the screen: the winter drive-by convoys along the bottom (AmboScroll), and later anything
// else that needs the road, such as a ladder truck that pulls up and parks for a rescue.
//
// The owner announces each pass BEFORE it enters (reserveLane): the band (viewport px, top to
// bottom) and its movers, each an x-span that slides at a steady speed (the sign is the direction)
// from its entry time, may stop at a mark (a truck pulling up to park) or stays put (speed 0, while
// parked or stuck). It updates the plan whenever that changes (the convoy starts, stops, gets towed)
// and releases it once the road is clear. A new owner first waits its turn (whenLaneClear: passes
// already announced go first, so two owners never wait on each other). Everything else asks before
// stepping into the band and gets out of the way in time:
//   laneClaimed(span)             the band is announced or in use there: don't start anything in it
//   laneArrival(rect)             when the first mover reaches a box (performance.now() ms)
//   timeUntilConvoyReaches(rect)  the same as a delay from now (a number is an x position)
//   laneClearAt(rect)             when every mover has passed the box again (the exit time)
//   laneBusy(rect, at)            whether a mover overlaps the box at that moment
//   subscribeLane(listener)       told whenever a plan or a hold changes
//   trackLaneOccupants(...)       pop-ups: each one is asked to leave just before a mover reaches it
//   useLaneTuck(...)              fixed decorations: true while they should tuck themselves away
//   whenLaneFree(span, start)     starts something that would sit in the band once no pass claims it
//   holdLane(...)                 something already crossing that can't step aside (the turkey
//                                 flying low) asks new passes to wait; whenLaneClear() honours it
// Times are performance.now() milliseconds; positions are viewport CSS pixels.

export type LaneSpan = { top: number; bottom: number };
export type LaneRect = LaneSpan & { left: number; right: number };

/** Something moving through (or parked in) the band. */
export type LaneMover = {
  /** The x-span it covers at time `at`; before `at` it waits there (say, just off-screen). */
  left: number;
  right: number;
  at: number;
  /** px per ms, negative toward the left edge; 0 while parked or stopped. */
  speed: number;
  /** Its leading edge stops here (a truck pulling up to park). */
  stopAt?: number;
};

export type LanePlan = LaneSpan & {
  movers: readonly LaneMover[];
  /** Announced but not on screen yet (the band may still be an estimate). */
  pending?: boolean;
};
export type LaneReservation = LanePlan & { id: number; owner: string; pending: boolean };
export type LaneHandle = { readonly id: number; update(plan: Partial<LanePlan>): void; release(): void };

type Hold = LaneSpan & { id: number; owner: string; until: number };

const reservations = new Map<number, LaneReservation>();
const holds = new Map<number, Hold>();
const listeners = new Set<() => void>();
let serial = 0;

/** Overlap needs a couple of pixels, so boxes that merely touch the band don't count. */
const TOLERANCE = 2;
/** Clear road kept ahead of a mover's leading edge. */
const FRONT = 24;
/** Everyone is out of sight at least this long before a mover reaches them. */
const SAFETY = 200;
/** A hold never blocks the lane for longer than this. */
const HOLD_MAX = 20_000;

const overlaps = (a: LaneSpan, b: LaneSpan) => a.bottom > b.top + TOLERANCE && a.top < b.bottom - TOLERANCE;

function changed() {
  for (const listener of [...listeners]) listener();
}

/** Called whenever a reservation or hold changes. Returns the unsubscribe. */
export function subscribeLane(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function laneReservations(): readonly LaneReservation[] {
  return [...reservations.values()];
}

/** Announce a pass. Publish it before the movers enter, update it as they go, release it after. */
export function reserveLane(owner: string, plan: LanePlan): LaneHandle {
  const id = ++serial;
  reservations.set(id, { id, owner, top: plan.top, bottom: plan.bottom, movers: plan.movers, pending: plan.pending ?? false });
  changed();
  return {
    id,
    update(patch) {
      const current = reservations.get(id);
      if (!current) return;
      reservations.set(id, {
        ...current,
        top: patch.top ?? current.top, bottom: patch.bottom ?? current.bottom,
        movers: patch.movers ?? current.movers, pending: patch.pending ?? current.pending,
      });
      changed();
    },
    release() { if (reservations.delete(id)) changed(); },
  };
}

/** Is the band announced or in use anywhere across this vertical span? (Before starting an act there.) */
export function laneClaimed(span: LaneSpan) {
  for (const reservation of reservations.values()) if (overlaps(reservation, span)) return true;
  return false;
}

// ---- Mover arithmetic ------------------------------------------------------------------------

function spanAt(m: LaneMover, t: number): [number, number] {
  let shift = m.speed * Math.max(0, t - m.at);
  if (m.stopAt !== undefined) {
    if (m.speed < 0) shift = Math.max(shift, Math.min(0, m.stopAt - m.left));
    else if (m.speed > 0) shift = Math.min(shift, Math.max(0, m.stopAt - m.right));
  }
  return [m.left + shift, m.right + shift];
}

/** The first moment from `now` on that the mover covers any of [x0, x1]; Infinity if it never will. */
function moverArrival(m: LaneMover, x0: number, x1: number, now: number) {
  // Never before it sets off: a convoy still waiting just off-screen, already inside a box's margin
  // or the hidden part of someone leaning in from the edge, arrives when it enters.
  const start = Math.max(now, m.at);
  const [left, right] = spanAt(m, start);
  if (left < x1 && right > x0) return start;
  if (m.speed < 0 && left >= x1) {
    if (m.stopAt !== undefined && m.stopAt >= x1) return Infinity;
    return start + (left - x1) / -m.speed;
  }
  if (m.speed > 0 && right <= x0) {
    if (m.stopAt !== undefined && m.stopAt <= x0) return Infinity;
    return start + (x0 - right) / m.speed;
  }
  return Infinity;
}

/** When the mover will have left [x0, x1] for good; Infinity while it's parked over it (or its tail is unknown). */
function moverClear(m: LaneMover, x0: number, x1: number, now: number) {
  const [left, right] = spanAt(m, now);
  const start = Math.max(now, m.at);
  if (m.speed < 0) {
    if (right <= x0) return now;
    if (m.stopAt !== undefined && m.stopAt + (m.right - m.left) > x0) return Infinity;
    return start + (spanAt(m, start)[1] - x0) / -m.speed;
  }
  if (m.speed > 0) {
    if (left >= x1) return now;
    if (m.stopAt !== undefined && m.stopAt - (m.right - m.left) < x1) return Infinity;
    return start + (x1 - spanAt(m, start)[0]) / m.speed;
  }
  return left < x1 && right > x0 ? Infinity : now;
}

/** When the first mover in a band covering this box reaches it (now if one already has); Infinity if none will. */
export function laneArrival(rect: LaneRect, now = performance.now()) {
  let first = Infinity;
  for (const reservation of reservations.values()) {
    if (!overlaps(reservation, rect)) continue;
    for (const m of reservation.movers) first = Math.min(first, moverArrival(m, rect.left - FRONT, rect.right + FRONT, now));
  }
  return first;
}

/** Milliseconds until a convoy reaches this box, or this x position; Infinity if none is coming. */
export function timeUntilConvoyReaches(target: LaneRect | number, now = performance.now()) {
  const rect = typeof target === "number" ? { left: target, right: target, top: -Infinity, bottom: Infinity } : target;
  return Math.max(0, laneArrival(rect, now) - now);
}

/** When the box is clear again: every mover that will reach it has passed (Infinity while one stays parked over it). */
export function laneClearAt(rect: LaneRect, now = performance.now()) {
  let last = now;
  for (const reservation of reservations.values()) {
    if (!overlaps(reservation, rect)) continue;
    for (const m of reservation.movers) {
      const x0 = rect.left - FRONT, x1 = rect.right + FRONT;
      if (moverArrival(m, x0, x1, now) === Infinity) continue;
      last = Math.max(last, moverClear(m, x0, x1, now));
    }
  }
  return last;
}

/** Does a mover overlap the box at that moment (default now)? */
export function laneBusy(rect: LaneRect, at = performance.now()) {
  for (const reservation of reservations.values()) {
    if (!overlaps(reservation, rect)) continue;
    for (const m of reservation.movers) {
      const [left, right] = spanAt(m, at);
      if (left < rect.right && right > rect.left) return true;
    }
  }
  return false;
}

// ---- Holds: something already in the band that can't step aside ------------------------------

/** Asks new passes through this span to wait up to `ms` (capped) for something crossing it. Returns the release. */
export function holdLane(owner: string, span: LaneSpan, ms: number) {
  const id = ++serial;
  holds.set(id, { id, owner, top: span.top, bottom: span.bottom, until: performance.now() + Math.min(HOLD_MAX, Math.max(0, ms)) });
  changed();
  return () => { if (holds.delete(id)) changed(); };
}

/**
 * Resolves once the span is free to drive into: not before `after`, no hold across it, and no pass
 * announced before the caller's own (`except`) still in it. Stops waiting (unresolved) on abort.
 */
export function whenLaneClear(span: LaneSpan, options: { after?: number; except?: LaneHandle | null; signal?: AbortSignal } = {}) {
  return new Promise<void>((resolve) => {
    let timer = 0;
    const done = () => { window.clearTimeout(timer); unsubscribe(); options.signal?.removeEventListener("abort", done); };
    const check = () => {
      window.clearTimeout(timer);
      const now = performance.now();
      let wait = (options.after ?? 0) - now;
      for (const hold of [...holds.values()]) {
        if (hold.until <= now) holds.delete(hold.id);
        else if (overlaps(hold, span)) wait = Math.max(wait, hold.until - now);
      }
      // First come, first served: only passes announced earlier hold this one up.
      const mine = options.except?.id ?? Infinity;
      let blocked = false;
      for (const reservation of reservations.values()) {
        if (reservation.id < mine && overlaps(reservation, span)) blocked = true;
      }
      if (wait <= 0 && !blocked) { done(); resolve(); return; }
      if (wait > 0) timer = window.setTimeout(check, wait + 4);
    };
    const unsubscribe = subscribeLane(check);
    if (options.signal?.aborted) { done(); return; }
    options.signal?.addEventListener("abort", done, { once: true });
    check();
  });
}

/** Runs `start` now, or as soon as no pass claims the span. Returns a cancel. */
export function whenLaneFree(span: LaneSpan, start: () => void) {
  if (!laneClaimed(span)) { start(); return () => {}; }
  const unsubscribe = subscribeLane(() => {
    if (laneClaimed(span)) return;
    unsubscribe();
    start();
  });
  return unsubscribe;
}

// ---- Getting out of the way --------------------------------------------------------------------

export type LaneOccupant = {
  id: string | number;
  /** Where it stands now (viewport px, everything that shows: snowbank, lean and all). */
  rect: LaneRect;
  /** How long its usual exit takes to finish (ms). */
  exitMs: number;
  /** Already on its way out. */
  leaving?: boolean;
};

/**
 * Watches a set of occupants (pop-up characters, say) and asks each one to leave, through its own
 * usual exit, early enough that it's out of sight before a mover reaches it. First comes a polite
 * ask (`urgent` false: it may finish a move already in the air, such as a backflip, and is asked
 * again shortly), then, once its exit only just fits, an urgent one it must obey. Call refresh()
 * whenever the occupants change; lane changes refresh on their own.
 */
export function trackLaneOccupants({ list, leave, grace = 1200 }: {
  list: () => readonly LaneOccupant[];
  leave: (id: string | number, urgent: boolean) => void;
  /** How long before the last moment the polite asks begin. */
  grace?: number;
}) {
  const timers = new Map<string | number, { handle: number; at: number }>();
  const insisted = new Set<string | number>();
  let stopped = false;

  function deadline(o: LaneOccupant, now: number) {
    const arrival = laneArrival(o.rect, now);
    return arrival === Infinity ? Infinity : arrival - o.exitMs - SAFETY;
  }
  function arm(id: string | number, at: number, now: number) {
    const current = timers.get(id);
    if (current && Math.abs(current.at - at) < 20) return;
    if (current) window.clearTimeout(current.handle);
    timers.set(id, { at, handle: window.setTimeout(() => fire(id), Math.max(0, at - now)) });
  }
  function disarm(id: string | number) {
    const current = timers.get(id);
    if (current) window.clearTimeout(current.handle);
    timers.delete(id);
  }
  function fire(id: string | number) {
    timers.delete(id);
    if (stopped) return;
    const now = performance.now();
    const occupant = list().find(o => o.id === id);
    if (!occupant || occupant.leaving) { refresh(); return; }
    const last = deadline(occupant, now);
    if (now >= last - grace) {
      const urgent = now >= last - 30;
      if (urgent) insisted.add(id);
      leave(id, urgent);
    }
    refresh();
  }
  function refresh() {
    if (stopped) return;
    const now = performance.now(), present = new Set<string | number>();
    const claimed = reservations.size > 0;
    for (const o of list()) {
      present.add(o.id);
      if (o.leaving || !claimed) { disarm(o.id); insisted.delete(o.id); continue; }
      const last = deadline(o, now);
      if (last === Infinity) { disarm(o.id); insisted.delete(o.id); continue; }
      // Asked urgently and still there (it couldn't go): don't spin, wait for the next change.
      if (insisted.has(o.id) && now >= last - 30) { disarm(o.id); continue; }
      // Before the polite window: wake at its start. Inside it: ask again every 100ms, then insist.
      arm(o.id, now < last - grace ? last - grace : Math.min(last, now + 100), now);
    }
    for (const id of [...timers.keys()]) if (!present.has(id)) disarm(id);
    for (const id of [...insisted]) if (!present.has(id)) insisted.delete(id);
  }

  const unsubscribe = subscribeLane(refresh);
  return {
    refresh,
    stop() {
      stopped = true;
      unsubscribe();
      for (const id of [...timers.keys()]) disarm(id);
    },
  };
}

/**
 * For a fixed decoration that can't walk off (the trinket stocking in the corner): true from just
 * before a mover reaches it until the movers have passed, so it can tuck itself away (in `exitMs`)
 * and come back. `measure` returns its resting box, untouched by the tuck (null when it isn't
 * showing or must stay put); `recheck` is any value that changes when that box may have changed (it
 * appeared, say). A control that has keyboard focus should stay visible (:focus-visible in its CSS).
 */
export function useLaneTuck(measure: () => LaneRect | null, { exitMs = 420, recheck }: { exitMs?: number; recheck?: unknown } = {}) {
  const [away, setAway] = useState(false);
  const measureRef = useRef(measure);
  useEffect(() => { measureRef.current = measure; });

  useEffect(() => {
    let timer = 0;
    const check = () => {
      window.clearTimeout(timer);
      if (!reservations.size) { setAway(false); return; }
      const rect = measureRef.current();
      if (!rect) { setAway(false); return; }
      const now = performance.now();
      const arrival = laneArrival(rect, now);
      const leaveAt = arrival === Infinity ? Infinity : arrival - exitMs - SAFETY;
      const clearAt = laneClearAt(rect, now);
      const tucked = now >= leaveAt && now < clearAt;
      setAway(tucked);
      const next = tucked ? clearAt : leaveAt;
      if (next !== Infinity) timer = window.setTimeout(check, Math.min(60_000, Math.max(0, next - now) + 16));
    };
    const unsubscribe = subscribeLane(check);
    window.addEventListener("resize", check, { passive: true });
    check();
    return () => { window.clearTimeout(timer); unsubscribe(); window.removeEventListener("resize", check); };
  }, [exitMs, recheck]);

  return away;
}

// Development: window.__driveLane shows the timetable in the console.
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
  (window as typeof window & { __driveLane?: unknown }).__driveLane = {
    reservations: laneReservations,
    holds: () => [...holds.values()],
  };
}
