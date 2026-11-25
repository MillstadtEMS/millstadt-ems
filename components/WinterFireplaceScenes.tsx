"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { gabbyDone, markGabbyDone, nextFireplaceTurn, reserveFireplace } from "@/lib/seasonal/fireplaceScenes";
import { allCrewDown, crewDownCount, subscribeCrewDown } from "./WinterRoofline";
import WinterGabbyGag, { preloadGag } from "./WinterGabbyGag";
import styles from "./WinterFireplaceScenes.module.css";

// The fireplace scenes in the living-room banner, on one shared clock and one arbiter
// (lib/seasonal/fireplaceScenes). The turkey heist is the reward for knocking every crew member off
// the Christmas lights: an officer peeks in around the right edge of the room, tiptoes to the old
// fridge beside the fireplace, raids it (the roast in his arms, a drumstick in his teeth), kicks
// the door shut and runs, and the angry paramedic turkey tears in from the far left of the screen
// and chases him out the right edge.
//
// It's drawn from the pose sheets: a few at-the-fridge key poses play in place, crisp and held
// (they share one fridge position, so it never jumps), and the sneaking and running poses step
// while the officer glides smoothly across the floor. The fridge stands at the room's own scale,
// a little taller than the fireplace, just past the presents with its feet on the floor at the
// back wall; with room to spare the stage reaches the banner's visible right edge, so he truly
// peeks in around it. It stays out where there's no wall for it (phones, the enlarged player).
// Between heists, and with reduced motion, the closed fridge simply stands there.

const ART = "/images/winter/kit/turkey-heist";
// Gabby's chimney gag (WinterGabbyGag: a live cut-out puppet show over the room, about 30 s): a big fat
// Santa wedges himself upside down in the chimney over his unfinished milk and cookies, Gabby hauls
// him out, drags him off the left edge, comes back in his hat, dozes in the armchair, gets paged and
// runs. Like the heist it's an easter egg: it plays once a visit, after every crew member has been
// knocked off the lights. The room video's own Santa (2.6-5.2 s of each 15 s loop) is skipped while
// it plays, so he never appears twice.
// Preview on demand (without knocking anyone down): ?preview=ve&gag-preview=now
const GAG = { santa: [2.5, 5.3] as const, previewDelay: 1500 } as const;
const gagPreview = () => {
  if (typeof window === "undefined") return false;
  const query = new URLSearchParams(window.location.search);
  return query.get("preview") === "ve" && query.get("gag-preview") === "now";
};
// Stage pixels (the pose sheets' own cell pixels): fridge, floor lines, and the files' scale.
const STAGE = { w: 1640, h: 560, fridgeLeft: 153, doorRight: 484, feet: 461, boots: 515, file: .75 } as const;
const AT = { x: 128, y: 60, w: 482, h: 472 } as const;                 // the at-the-fridge cells
const FRIDGE = { x: 151, y: 75, w: 200, h: 386 } as const;             // the standalone closed fridge
const POSES: Record<string, readonly [number, number]> = {
  "46-1": [309, 304], "46-2": [303, 322], "46-3": [262, 320], "46-4": [266, 337], "46-5": [236, 335],
  "52-1": [205, 303], "52-3": [281, 314], "52-4": [299, 278], "52-5": [309, 308], "52-6": [304, 312],
  "49-1": [266, 329], "49-2": [216, 330], "49-3": [242, 328], "49-4": [314, 286], "49-5": [225, 334], "49-6": [255, 336],
};
// The at-the-fridge key poses, each held long enough to read: back to us at the handle, a look over
// his shoulder, the door open, reaching in, the roast up with the drumstick in his teeth, the heel
// kick, the door swinging shut behind him.
const AT_FRAMES: ReadonlyArray<readonly [string, number]> = [
  ["47-1", 5000], ["47-3", 5850], ["47-5", 6700], ["51-1", 7600], ["51-4", 8700], ["50-3", 9900], ["50-5", 11000], ["50-6", 11750],
];
const AT_START = 5000, AT_END = 12_350, CLIP_MS = 15_000, HOP = 140;
const CREEP: ReadonlyArray<readonly [string, number]> = [
  ["46-1", 2350], ["46-2", 2650], ["46-3", 2950], ["46-4", 3250], ["46-5", 3700], ["52-4", 4100], ["52-5", 4400], ["52-6", 4700],
];
const RUN = ["49-1", "49-2", "49-3", "49-4", "49-5", "49-6"] as const;
// The room art (760 x 200): where the presents beside the fireplace end, the floor line at the back
// wall (from the bottom), and the fridge's height there (the fireplace is about 135).
const ROOM = { presentsRight: 748 / 760, floor: 30 / 200, fridge: 158 / 200 } as const;
const MIN_SCALE = .18;
const BIRD = { enter: 10_450, join: 12_700, end: 14_900, beak: [219, 102], size: [264, 230], width: 300, behind: 165, height: 285, beats: 3.6 } as const;
const FIRST_TURN = 2_500, BETWEEN_TURNS = 50_000;

/** right: the stage's right edge from the banner's right edge (negative where it runs off it). */
type Layout = { scale: number; bottom: number; right: number; width: number; height: number };
type Run = { release: () => void; timers: number[]; frame: number; start: number };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);
const segment = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));

/** Where the officer is and which standalone pose he's in at time t (stage px; edge = visible right
 *  edge); bob lifts him a little with each step. */
function officerAt(t: number, edge: number): { pose: string; x: number; bob?: number } | null {
  const w = (id: string) => POSES[id][0];
  if (t >= 450 && t < 1250) return { pose: "52-1", x: edge + w("52-1") * .24 };          // fingers and one eye
  if (t >= 1650 && t < 2350) return { pose: "52-3", x: edge + w("52-3") * .2 };           // another look
  if (t >= 2350 && t < AT_START) {
    const pose = [...CREEP].reverse().find(([, at]) => t >= at)![0];
    // He ends up right where the at-the-fridge poses pick him up (about x 340, back to us).
    const mid = lerp(edge, 360, .55);
    const x = t < 3700 ? lerp(edge + 40, mid, ease(segment(t, 2350, 3700)))
      : t < 4100 ? mid                                                                     // checks behind him
        : lerp(mid, 360, ease(segment(t, 4100, AT_START)));
    const moving = t < 3700 || t >= 4100;
    return { pose, x, bob: moving ? Math.abs(Math.sin((t - 2350) / 300 * Math.PI)) * 6 : 0 };
  }
  if (t >= AT_END && t < CLIP_MS) {
    const u = segment(t, AT_END, BIRD.end);
    const step = (t - AT_END) / 110;
    return { pose: RUN[Math.floor(step) % RUN.length], x: lerp(500, edge + 420, Math.pow(u, 1.3)), bob: Math.abs(Math.sin(step * Math.PI / 3)) * 10 };
  }
  return null;
}

export default function WinterFireplaceScenes({ expanded, timeout }: { expanded: boolean; timeout: boolean }) {
  const pathname = usePathname();
  const host = useRef<HTMLDivElement>(null);
  const fridge = useRef<HTMLImageElement>(null);
  const officer = useRef<HTMLSpanElement>(null);
  const bird = useRef<HTMLSpanElement>(null);
  const run = useRef<Run | null>(null);
  const played = useRef(false);
  const [layout, setLayout] = useState<Layout | null>(null);
  const layoutRef = useRef<Layout | null>(null);
  useEffect(() => { layoutRef.current = layout; }, [layout]);
  const [playing, setPlaying] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [visible, setVisible] = useState(true);
  const [onScreen, setOnScreen] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [gagOn, setGagOn] = useState(false);
  const [aside, setAside] = useState<HTMLElement | null>(null);
  const [roomEl, setRoomEl] = useState<HTMLElement | null>(null);
  const gagParts = useRef<Promise<void> | null>(null);
  const gagRun = useRef<{ release: () => void; frame: number; onEnd: () => void } | null>(null);
  const [preview] = useState(gagPreview);
  const crewDown = useSyncExternalStore(subscribeCrewDown, allCrewDown, () => false);
  // The poses load once most of the crew are down, so they're ready when the last one falls.
  const almost = useSyncExternalStore(subscribeCrewDown, () => crewDownCount() >= 4, () => false);
  const armed = almost || crewDown;

  // The lane: from just past the presents to the banner's visible right edge.
  useEffect(() => {
    const el = host.current, stage = el?.parentElement;
    if (!el || !stage) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const room = stage.querySelector<HTMLElement>("[data-living-room]");
      const s = stage.getBoundingClientRect(), r = room?.getBoundingClientRect();
      if (!r || !r.width || getComputedStyle(room!).display === "none") { setLayout(null); return; }
      const presents = r.left + r.width * ROOM.presentsRight;
      const lane = s.right - presents;
      // Room scale (the fridge a little taller than the fireplace), unless its open door won't fit.
      const scale = Math.min(r.height * ROOM.fridge / FRIDGE.h, lane / (STAGE.doorRight - STAGE.fridgeLeft + 40));
      if (!(scale >= MIN_SCALE)) { setLayout(null); return; }
      const stageRight = presents + 8 - STAGE.fridgeLeft * scale + STAGE.w * scale;
      const right = Math.min(0, s.right - stageRight);
      const floor = s.bottom - r.bottom + r.height * ROOM.floor;
      const next = {
        scale: +scale.toFixed(4), bottom: +(floor - (STAGE.h - STAGE.feet) * scale).toFixed(1), right: +right.toFixed(1),
        width: Math.round(s.width), height: Math.round(s.height),
      };
      setLayout(prev => prev && prev.scale === next.scale && prev.bottom === next.bottom && prev.right === next.right
        && prev.width === next.width && prev.height === next.height ? prev : next);
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    const sizes = new ResizeObserver(queue);
    sizes.observe(stage);
    window.addEventListener("resize", queue, { passive: true });
    const sight = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: .35 });
    sight.observe(stage);
    return () => { cancelAnimationFrame(frame); sizes.disconnect(); sight.disconnect(); window.removeEventListener("resize", queue); };
  }, [expanded]);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { setReduced(motion.matches); setVisible(!document.hidden); };
    sync();
    motion.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => { motion.removeEventListener("change", sync); document.removeEventListener("visibilitychange", sync); };
  }, []);

  /** Every pose decoded (they're on the page once armed). */
  const ready = useCallback(async () => {
    const images = [...(host.current?.querySelectorAll("img") ?? []), ...(bird.current?.querySelectorAll("img") ?? [])];
    await Promise.all(images.map(img => img.complete && img.naturalWidth ? img.decode().catch(() => {}) : new Promise<void>(done => {
      img.addEventListener("load", () => void img.decode().catch(() => {}).finally(done), { once: true });
      img.addEventListener("error", () => done(), { once: true });
    })));
  }, []);

  const paint = useCallback((t: number | null) => {
    const el = host.current, L = layoutRef.current;
    if (!el || !L) return;
    const left = L.width - L.right - STAGE.w * L.scale, top = L.height - L.bottom - STAGE.h * L.scale;
    const edge = (L.width - left) / L.scale;
    // At the fridge: crisp key poses, swapped instantly (no blending), each landing with a tiny hop.
    let index = -1;
    if (t !== null && t >= AT_START && t < AT_END) for (let i = 0; i < AT_FRAMES.length; i++) if (t >= AT_FRAMES[i][1]) index = i;
    const current = index >= 0 ? AT_FRAMES[index][0] : null;
    const since = index >= 0 && t !== null ? t - AT_FRAMES[index][1] : HOP;
    const hop = index > 0 && since < HOP ? Math.sin(Math.PI * since / HOP) * 5 : 0;
    el.querySelectorAll<HTMLImageElement>("[data-at]").forEach(img => {
      const on = img.dataset.at === current;
      img.style.opacity = on ? "1" : "0";
      img.style.transform = on && hop ? `translateY(${(-hop).toFixed(1)}px)` : "";
    });
    if (fridge.current) fridge.current.style.opacity = current ? "0" : "1";
    const who = t === null ? null : officerAt(t, edge);
    if (officer.current) {
      officer.current.style.transform = who ? `translate(${who.x.toFixed(1)}px, ${(STAGE.boots - (who.bob ?? 0)).toFixed(1)}px)` : "";
      officer.current.querySelectorAll<HTMLImageElement>("[data-pose]").forEach(img => { img.style.visibility = img.dataset.pose === who?.pose ? "visible" : "hidden"; });
    }
    const b = bird.current;
    if (!b) return;
    if (t === null || t < BIRD.enter || t > BIRD.end) { b.style.visibility = "hidden"; return; }
    // Banner pixels: the stage's bottom-right corner sits at (width - right, height - bottom).
    const k = BIRD.width / BIRD.size[0] * L.scale, w = BIRD.size[0] * k;
    const flap = Math.sin((t / 1000) * BIRD.beats * 2 * Math.PI) * 8 * L.scale;
    const chase = (time: number) => {
      const o = officerAt(Math.max(AT_END, time), edge);
      return { x: left + ((o?.x ?? 500) - BIRD.behind) * L.scale, y: top + BIRD.height * L.scale };
    };
    let bx: number, by: number;
    if (t < BIRD.join) {
      // In from beyond the far left edge, high over the room, swooping down onto his trail.
      const j = chase(BIRD.join), u = segment(t, BIRD.enter, BIRD.join), e = ease(u) * .35 + u * .65;
      bx = lerp(-w * .4, j.x, e);
      by = lerp(L.height * .28, j.y, e) + flap;
    } else {
      const c = chase(t);
      bx = c.x; by = c.y + flap;
    }
    b.style.width = `${w.toFixed(1)}px`;
    b.style.transform = `translate(${(bx - BIRD.beak[0] * k).toFixed(1)}px, ${(by - BIRD.beak[1] * k).toFixed(1)}px)`;
    b.style.visibility = "visible";
  }, []);

  const stop = useCallback(() => {
    const current = run.current;
    if (!current) return;
    run.current = null;
    current.timers.forEach(t => window.clearTimeout(t));
    cancelAnimationFrame(current.frame);
    paint(null);
    setPlaying(false);
    current.release();
  }, [paint]);

  // ---- Gabby's chimney gag ----------------------------------------------------------------------
  const room = useCallback(() => host.current?.parentElement?.querySelector<HTMLElement>("[data-living-room]") ?? null, []);
  const loadGag = useCallback(() => (gagParts.current ??= preloadGag()), []);
  const gagAllowed = useCallback(() => {
    const r = room();
    return (preview || !gabbyDone()) && !reduced && !timeout && !expanded && visible && Boolean(r) && getComputedStyle(r!).display !== "none";
  }, [room, reduced, timeout, expanded, visible, preview]);
  // The puppets (small cut-outs, about 0.2 MB) load once most of the crew are down.
  useEffect(() => { if ((almost || preview) && !reduced) void loadGag(); }, [almost, preview, reduced, loadGag]);

  const endGag = useCallback(() => {
    const current = gagRun.current;
    if (!current) return;
    gagRun.current = null;
    cancelAnimationFrame(current.frame);
    setGagOn(false);
    current.release();
    // She doesn't climb back on the lights (a refresh does that); she pops up from the sides now.
    markGabbyDone();
    current.onEnd();
  }, []);

  /** Play the gag once on the fireplace stage; onEnd hands the stage to the next show. */
  const startGag = useCallback(async (onEnd: () => void) => {
    if (gagRun.current || !gagAllowed()) return false;
    await loadGag();
    if (gagRun.current || !gagAllowed()) return false;
    const release = reserveFireplace("gabby");
    if (!release) return false;
    const run = { release, frame: 0, onEnd };
    gagRun.current = run;
    setGagOn(true);
    // Keep the room video out of its own Santa peek while the gag's Santa is on.
    const video = room()?.querySelector("video");
    const skip = () => {
      if (gagRun.current !== run) return;
      if (video && video.currentTime >= GAG.santa[0] && video.currentTime < GAG.santa[1]) video.currentTime = GAG.santa[1];
      run.frame = requestAnimationFrame(skip);
    };
    run.frame = requestAnimationFrame(skip);
    return true;
  }, [gagAllowed, loadGag, room]);

  // ?preview=ve&gag-preview=now plays the gag shortly after the page loads, crew or no crew.
  useEffect(() => {
    if (!preview || reduced || timeout || expanded || !visible || !aside) return;
    const timer = window.setTimeout(() => void startGag(() => {}), GAG.previewDelay);
    return () => window.clearTimeout(timer);
  }, [preview, reduced, timeout, expanded, visible, aside, startGag]);

  // The shared clock. Both shows are easter eggs: nothing happens until every crew member has been
  // knocked off the lights. Then Gabby's gag goes first (once a visit), the heist follows, and the
  // heist comes back every so often. One scene at a time, never overlapping.
  const clockOn = crewDown && !timeout && !expanded && !reduced && visible && onScreen;
  const nextDelay = useRef<number>(FIRST_TURN);
  useEffect(() => {
    if (!clockOn) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const canHeist = Boolean(layoutRef.current) && armed;
      const scene = nextFireplaceTurn(s => s === "gabby" ? gagAllowed() : canHeist);
      if (scene === "gabby") {
        const started = await startGag(() => { nextDelay.current = FIRST_TURN; setCycle(c => c + 1); });
        if (!started && !cancelled) { nextDelay.current = FIRST_TURN; setCycle(c => c + 1); }
        return;
      }
      if (scene !== "heist") return;
      await ready();
      if (cancelled) return;
      const release = reserveFireplace("heist");
      if (!release) { nextDelay.current = FIRST_TURN; setCycle(c => c + 1); return; }
      played.current = true;
      const current: Run = { release, timers: [], frame: 0, start: performance.now() };
      run.current = current;
      setPlaying(true);
      const tick = () => {
        if (run.current !== current) return;
        const t = performance.now() - current.start;
        paint(t);
        if (t < CLIP_MS) current.frame = requestAnimationFrame(tick);
      };
      current.frame = requestAnimationFrame(tick);
      current.timers.push(window.setTimeout(() => {
        if (run.current !== current) return;
        stop();
        nextDelay.current = BETWEEN_TURNS;
        setCycle(c => c + 1);
      }, CLIP_MS));
    }, nextDelay.current);
    // Losing the turn (Time Out, enlarging, scrolling away, a background tab, a new page) ends any
    // heist in progress and frees the stage; the clock starts a fresh cycle when it comes back.
    return () => { cancelled = true; window.clearTimeout(timer); stop(); };
  }, [clockOn, cycle, pathname, armed, ready, paint, stop, gagAllowed, startGag]);

  useEffect(() => stop, [stop]);

  // Time Out, enlarging, a background tab or a new page ends the gag.
  useEffect(() => {
    if (gagRun.current && (timeout || expanded || !visible || reduced)) endGag();
  }, [timeout, expanded, visible, reduced, endGag]);
  useEffect(() => endGag, [pathname, endGag]);

  // The gag draws in the TV's own layer (so its speech bubbles can sit in front of the TV), over the room.
  useEffect(() => {
    setAside(host.current?.parentElement?.querySelector<HTMLElement>("[data-winter-video]") ?? null);
    setRoomEl(host.current?.parentElement?.querySelector<HTMLElement>("[data-living-room]") ?? null);
  }, [expanded, layout]);

  const px = (v: number) => `${v}px`;
  return (<>
    <div ref={host} className={styles.heist} aria-hidden="true" data-off={!layout || expanded || undefined}
      data-playing={playing || undefined}
      style={layout ? { "--heist-scale": layout.scale, bottom: px(layout.bottom), right: px(layout.right) } as CSSProperties : undefined}>
      {layout && <>
        <Image ref={fridge} className={styles.layer} src={`${ART}/fridge.webp`} alt="" width={Math.round(FRIDGE.w * STAGE.file)} height={Math.round(FRIDGE.h * STAGE.file)}
          unoptimized draggable={false} style={{ left: px(FRIDGE.x), top: px(FRIDGE.y), width: px(FRIDGE.w), height: px(FRIDGE.h) }} />
        {armed && AT_FRAMES.map(([id]) => (
          <Image key={id} data-at={id} className={`${styles.layer} ${styles.at}`} src={`${ART}/at-${id}.webp`} alt=""
            width={Math.round(AT.w * STAGE.file)} height={Math.round(AT.h * STAGE.file)} unoptimized draggable={false} loading="eager"
            style={{ left: px(AT.x), top: px(AT.y), width: px(AT.w), height: px(AT.h) }} />
        ))}
        {armed && <span ref={officer} className={styles.officer}>
          {Object.entries(POSES).map(([id, [w, h]]) => (
            <Image key={id} data-pose={id} className={styles.pose} src={`${ART}/pose-${id}.webp`} alt=""
              width={Math.round(w * STAGE.file)} height={Math.round(h * STAGE.file)} unoptimized draggable={false} loading="eager"
              style={{ left: px(-w / 2), top: px(-h), width: px(w), height: px(h) }} />
          ))}
        </span>}
      </>}
    </div>
    {gagOn && aside && roomEl && <WinterGabbyGag aside={aside} room={roomEl} onDone={endGag} preview={preview} />}
    {/* The chase crosses the whole room, so the turkey flies in the banner's own layer. */}
    {armed && layout && !expanded && <div className={styles.chase} aria-hidden="true">
      <span ref={bird} className={styles.bird}>
        <Image src={`${ART}/angry-turkey.webp`} alt="" width={264} height={230} unoptimized draggable={false} loading="eager" />
      </span>
    </div>}
  </>);
}
