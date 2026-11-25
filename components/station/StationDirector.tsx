"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { allCrewDown, chiefIsDown, crewLineup, dropChief, restoreCrew, type HangingChief } from "@/components/WinterRoofline";
import { claimPeople } from "@/lib/seasonal/cast";
import { fireplaceOwner, reserveFireplace, resetGabbyDone, setFireplaceProgram } from "@/lib/seasonal/fireplaceScenes";
import { stationFast } from "@/lib/station/flags";
import StationLadder, { type LadderHandle } from "./StationLadder";

// The station TV's attract loop, on the site's own pieces:
//   1. everyone hangs from the lights (the snowball fight, pop-ups and drive-by carry on all along);
//   2. they lose their grip at random, mad faces and all: a new order every time, random gaps,
//      sometimes two or three at once (WinterRoofline dropChief, the same fall as a snowball hit);
//   3. with everyone down, the living room plays the turkey heist first, then Gabby's chimney gag
//      (the shared arbiter, in the station's order: lib/seasonal/fireplaceScenes);
//   4. Ladder 3919 comes for them and they all climb back up, one by one (StationLadder);
//   ...and round again, forever. Reduced motion keeps everyone calmly on the lights.

export type StationPhase = "starting" | "hanging" | "falling" | "heist" | "gag" | "ladder" | "calm";

const pacing = {
  normal: { hang: [32_000, 55_000], fallGap: [3_500, 9_500], together: [120, 420], showGap: 4_000, heistWait: 9_000, gagWait: 14_000, rest: 2_500 },
  fast: { hang: [3_500, 5_500], fallGap: [900, 2_000], together: [90, 260], showGap: 2_000, heistWait: 8_000, gagWait: 10_000, rest: 1_200 },
} as const;

// A little store for the debug panel.
let state = { phase: "starting" as StationPhase, loop: 0, since: 0, order: [] as HangingChief[] };
const listeners = new Set<() => void>();
function announce(next: Partial<typeof state>) {
  state = { ...state, ...next, since: next.phase ? Date.now() : state.since };
  // Also on the page, for the debug panel and for tests (html[data-station-phase]).
  document.documentElement.dataset.stationPhase = state.phase;
  listeners.forEach(listener => listener());
}
export function useStationLoop() {
  return useSyncExternalStore(
    listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => state,
    () => state,
  );
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
function shuffle<T>(list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
/** Mostly one at a time; now and then two or three let go together. */
const groupSize = (left: number) => Math.min(left, ((roll) => roll < .62 ? 1 : roll < .9 ? 2 : 3)(Math.random()));

export default function StationDirector() {
  const ladder = useRef<LadderHandle>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fast = stationFast();
    const T = fast ? pacing.fast : pacing.normal;
    let cancelled = false;
    let held: (() => void) | null = null;
    const timers = new Set<number>();
    const isCancelled = () => cancelled;
    const sleep = (ms: number) => new Promise<void>(done => {
      const id = window.setTimeout(() => { timers.delete(id); done(); }, ms);
      timers.add(id);
    });
    /** Poll until a condition holds (true) or time runs out (false). */
    const until = async (test: () => boolean, ms: number) => {
      const end = Date.now() + ms;
      while (!cancelled && Date.now() < end) {
        if (test()) return true;
        await sleep(200);
      }
      return test();
    };

    if (reduced.matches) {
      restoreCrew();
      announce({ phase: "calm" });
      const onChange = () => { if (!reduced.matches) window.location.reload(); };
      reduced.addEventListener("change", onChange);
      return () => reduced.removeEventListener("change", onChange);
    }

    // The living room's shows in the station's order: the heist first, then Gabby's gag.
    setFireplaceProgram({ order: ["heist", "gabby"], gapMs: T.showGap });
    // Preview: ?preview=ve&station-fast=1&station-scene=ladder starts with everyone already down.
    const scene = fast ? new URLSearchParams(window.location.search).get("station-scene") : null;

    async function loop() {
      let first = true;
      while (!cancelled) {
        announce({ phase: "hanging", loop: state.loop + 1 });
        const skipToLadder = first && scene === "ladder";
        if (!skipToLadder) await sleep(first ? Math.min(rand(T.hang[0], T.hang[1]), fast ? 4_000 : 20_000) : rand(T.hang[0], T.hang[1]));
        first = false;
        if (cancelled) return;

        // 2. They let go at random.
        const order = shuffle(crewLineup().filter(chief => !chiefIsDown(chief)));
        announce({ phase: "falling", order });
        while (order.length && !cancelled) {
          const group = order.splice(0, skipToLadder ? order.length : groupSize(order.length));
          for (const chief of group) {
            dropChief(chief);
            if (group.length > 1) await sleep(rand(T.together[0], T.together[1]));
          }
          if (order.length) await sleep(skipToLadder ? 60 : rand(T.fallGap[0], T.fallGap[1]));
        }
        await until(allCrewDown, 6_000);
        if (cancelled) return;

        if (!skipToLadder) {
          // 3. The heist, then the gag (each waited for, but never forever).
          announce({ phase: "heist" });
          if (await until(() => fireplaceOwner() === "heist", T.heistWait)) await until(() => fireplaceOwner() !== "heist", 22_000);
          if (cancelled) return;
          announce({ phase: "gag" });
          if (await until(() => fireplaceOwner() === "gabby", T.showGap + T.gagWait)) await until(() => fireplaceOwner() !== "gabby", 34_000);
          if (cancelled) return;
        } else {
          await sleep(1_400);
        }

        // 4. Hold the stage (no more heists) while Ladder 3919 brings everyone back.
        await until(() => Boolean(held ??= reserveFireplace("ladder")), 30_000);
        announce({ phase: "ladder" });
        resetGabbyDone();
        // Nobody pops up as someone who is climbing the ladder.
        let cast = null as (() => void) | null;
        await until(() => Boolean(cast ??= claimPeople(["kalista", "braeden", "dylan", "gabby"])), 12_000);
        try {
          await ladder.current?.run(shuffle(crewLineup()), fast, isCancelled);
        } finally {
          cast?.();
        }
        if (cancelled) return;
        restoreCrew();
        held?.();
        held = null;
        await sleep(T.rest);
      }
    }
    void loop();

    return () => {
      cancelled = true;
      delete document.documentElement.dataset.stationPhase;
      timers.forEach(id => window.clearTimeout(id));
      held?.();
      setFireplaceProgram();
      restoreCrew();
    };
  }, []);

  return <StationLadder ref={ladder} />;
}
