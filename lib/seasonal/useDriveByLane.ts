"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { reserveLane, whenLaneClear, type LaneHandle, type LaneMover, type LanePlan } from "./driveLane";

// The winter drive-by's side of the shared lane (lib/seasonal/driveLane): every pass is announced
// LEAD_MS before the convoy enters, then kept up to date from the convoy itself (where it is, how
// fast the drive animation carries it, stopped while it's stuck, while Santa writes his list or
// while Time Out holds everything) until it has driven off. While it's stuck, the police pickup's
// road is claimed too: it comes in from the left edge to tow the convoy out, and a convoy stuck near
// that edge first slides back on the ice.

/** Announced this long before a convoy enters, so anyone standing where it comes in can land a move
 *  already in the air (Dylan's crouch and backflip take about 1.6 s) and still duck away in time. */
const LEAD_MS = 2800;
/** The drive animation carries a convoy from 16px past the right edge to 90px past the left. */
const ENTER_GAP = 16, EXIT_GAP = 90;
/** The snow wake trailing a convoy, as a share of its length. */
const WAKE = .09;
/** The police pickup sets off from just past the left edge about this long after the convoy is stuck
 *  (the tow's call takes 1.5 s), and never comes faster than this (px/ms). */
const POLICE_LEAD = 1400, POLICE_SPEED = 1;

type Tow = { front: number; slide: number } | null;

/** Faster than any convoy drives across this screen (px/ms), for the plan before one is on the page. */
function topSpeed(lane: DOMRect) {
  const vw = window.innerWidth;
  return (vw + ENTER_GAP + 2 * lane.height + EXIT_GAP) / (vw <= 767 ? 12_000 : 16_000);
}

/** Before the convoy is on the page: the whole lane, entering at `enterAt`. */
function announcement(lane: DOMRect, enterAt: number): LanePlan {
  return {
    top: lane.top, bottom: lane.bottom, pending: true,
    movers: [{ left: window.innerWidth + ENTER_GAP, right: Infinity, at: enterAt, speed: -topSpeed(lane) }],
  };
}

/** The drive animation's speed (px/ms), from the running CSS animation. */
function driveSpeed(convoy: HTMLElement) {
  const name = convoy.dataset.drive ?? "winterDrive";
  const run = convoy.getAnimations().find(a => a instanceof CSSAnimation && a.animationName.endsWith(name));
  const duration = Number(run?.effect?.getTiming().duration);
  if (!run || !(duration > 0)) return null;
  return (window.innerWidth + ENTER_GAP + convoy.offsetWidth + EXIT_GAP) / duration * Math.abs(run.playbackRate || 1);
}

export function useDriveByLane({ lane, convoy, pass, halted, tow }: {
  lane: RefObject<HTMLElement | null>;
  convoy: RefObject<HTMLElement | null>;
  /** Non-null while a pass is on screen. */
  pass: object | null;
  /** Stuck in the snow, Santa writing his list, or Time Out: the convoy is standing still. */
  halted: boolean;
  /** The police rescue under way (lane x of the stuck vehicle's front, and how far it slides back). */
  tow: Tow;
}) {
  const handle = useRef<LaneHandle | null>(null);
  const enterAt = useRef(0);
  /** When the rescue began, and where the convoy's tail was then (before any slide). */
  const rescued = useRef<{ at: number; tail: number } | null>(null);
  const live = useRef({ halted, tow, on: false });
  useEffect(() => { live.current = { halted, tow, on: pass !== null }; });

  const api = useMemo(() => {
    function release() {
      handle.current?.release();
      handle.current = null;
      rescued.current = null;
    }
    /** Re-read the convoy and republish the plan (still pending until the drive animation runs). */
    function publish() {
      const laneBox = lane.current?.getBoundingClientRect(), el = convoy.current, reservation = handle.current;
      if (!laneBox || !el || !reservation) return;
      const box = el.getBoundingClientRect();
      const moving = el.dataset.moving === "true";
      const now = performance.now();
      const { halted: still, tow: rescue } = live.current;
      let tail = box.right + box.width * WAKE;
      if (!rescue) rescued.current = null;
      else {
        rescued.current ??= { at: now, tail };
        // Stuck near the left edge, it first slides back on the ice: claim where it slides to.
        tail = Math.max(tail, rescued.current.tail + rescue.slide);
      }
      const movers: LaneMover[] = [{
        left: box.left, right: tail,
        at: moving ? now : Math.max(now, enterAt.current),
        speed: still ? 0 : -(driveSpeed(el) ?? topSpeed(laneBox)),
      }];
      // The police pickup drives in from the left edge and pulls up just in front of the stuck
      // vehicle, where Santa walks the hook over to its bumper.
      if (rescue && rescued.current) movers.push({
        left: -Infinity, right: laneBox.left - 60, at: rescued.current.at + POLICE_LEAD, speed: POLICE_SPEED,
        stopAt: laneBox.left + rescue.front + rescue.slide + 12,
      });
      // A little headroom over the art for the chaos sleigh's flying hats and Santa's "Ho ho ho!".
      reservation.update({ top: box.top - (box.height * .12 + 8), bottom: Math.max(laneBox.bottom, box.bottom), movers, pending: !moving });
    }
    /**
     * Announces the next pass, then waits out the lead (and anything crossing the band that can't
     * step aside, or a pass announced before it) alongside `work`, the art loading. Resolves with
     * `work`'s result. The announcement is withdrawn if that fails, or if `cancelled()` turns true
     * before the pass starts.
     */
    async function clearRoad(work: Promise<boolean>, cancelled: () => boolean) {
      const laneBox = lane.current?.getBoundingClientRect();
      if (!laneBox) return work;
      enterAt.current = performance.now() + LEAD_MS;
      const plan = announcement(laneBox, enterAt.current);
      if (handle.current) handle.current.update(plan);
      else handle.current = reserveLane("driveby", plan);
      const mine = handle.current;
      const abort = new AbortController();
      const withdraw = () => {
        if (handle.current === mine && !live.current.on) release();
        abort.abort();
      };
      const poll = window.setInterval(() => { if (cancelled()) withdraw(); }, 250);
      const aborted = new Promise<void>(resolve => abort.signal.addEventListener("abort", () => resolve(), { once: true }));
      try {
        const [ok] = await Promise.all([work, Promise.race([whenLaneClear(plan, { after: enterAt.current, except: mine, signal: abort.signal }), aborted])]);
        if (!ok || cancelled()) withdraw();
        return ok;
      } finally {
        window.clearInterval(poll);
      }
    }
    return { release, publish, clearRoad };
  }, [lane, convoy]);

  // A pass on screen: follow the convoy (its start, stops and tow) until it drives off.
  useEffect(() => {
    if (pass === null) { api.release(); return; }
    const el = convoy.current, laneBox = lane.current?.getBoundingClientRect();
    if (!handle.current && laneBox) handle.current = reserveLane("driveby", announcement(laneBox, performance.now()));
    const follow = () => api.publish();
    // Its own drive starting (the riders' bounces and the twinkling lights start too: not those).
    const started = (event: AnimationEvent) => { if (event.target === el) follow(); };
    el?.addEventListener("animationstart", started);
    window.addEventListener("resize", follow, { passive: true });
    // Re-anchored every second, so the timetable never drifts from what's on screen.
    const timer = window.setInterval(follow, 1000);
    follow();
    return () => {
      el?.removeEventListener("animationstart", started);
      window.removeEventListener("resize", follow);
      window.clearInterval(timer);
    };
  }, [pass, api, convoy, lane]);

  useEffect(() => { if (pass !== null) api.publish(); }, [pass, halted, tow, api]);
  useEffect(() => () => api.release(), [api]);

  return api;
}
