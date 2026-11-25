"use client";

import Image from "next/image";
import { useImperativeHandle, useRef, useState, type CSSProperties, type Ref } from "react";
import { chiefIsDown, restoreChief, type HangingChief } from "@/components/WinterRoofline";
import styles from "./StationLadder.module.css";

// The station TV's reset. Dr. Hsu, the medical director (the one crew member who isn't up on the
// lights), walks in from the left edge with the station's old wooden extension ladder on his
// shoulder, tips it up against the Christmas lights, runs the top section up to the string and holds
// it steady, waving everyone up. One by one the crew come up from below the frame, climb it hand over
// hand, swing onto the string and work their way along it to their own spots. They are the real
// hanging figures from the lights (WinterRoofline restoreChief), so each one simply arrives where it
// belongs. Then he brings the ladder down and carries it back out the way he came.

// His art: the raised (waving) hand, and where a ladder carried on his shoulder runs (its middle).
const ART = { src: "/images/winter/kit/station/medical-director-standing.webp", w: 495, h: 1137, hand: [60 / 495, 190 / 1137] as const, carry: .2 } as const;
const LEAN = 74 * Math.PI / 180;
const TILT = 90 - 74;   // a climber's body lies along the ladder

type Point = { x: number; y: number };
type Swag = { left: number; right: number; top: number; sag: number };
export type LadderPlan = {
  u: number; vw: number; vh: number;
  /** Dr. Hsu's box: size, the feet line (just below the frame), where he stands, where he comes from. */
  hsu: { w: number; h: number; feet: number; stand: number; start: number };
  /** The ladder: rail-to-rail width, its two sections, how far the top section runs out, its foot. */
  ladder: { width: number; base: number; fly: number; extend: number; foot: Point; reach: number; rung: number };
  /** Where it meets the lights (the clip between the first two swags). */
  top: Point;
  swags: Swag[];
};
export type LadderHandle = { run: (climbers: readonly HangingChief[], fast: boolean, isCancelled: () => boolean) => Promise<void> };

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
const wait = (ms: number) => new Promise<void>(done => window.setTimeout(done, ms));

/** The light string's height at x: each swag hangs as a half ellipse between its clips. */
function wireAt(swags: Swag[], x: number) {
  const s = swags.find(w => x >= w.left && x <= w.right) ?? (x < swags[0].left ? swags[0] : swags[swags.length - 1]);
  const t = clamp01((x - s.left) / Math.max(1, s.right - s.left));
  return s.top + s.sag * Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2));
}

/** Measure the screen as it is now: the lights, the frame and the TV's unit size. */
export function planLadder(): LadderPlan | null {
  const roof = document.querySelector<HTMLElement>("[data-winter-roof]");
  if (!roof) return null;
  const swags = (Array.from(roof.children) as HTMLElement[])
    .filter(el => el.style.getPropertyValue("--sag"))
    .map(el => ({ el, box: el.getBoundingClientRect() }))
    .filter(({ box }) => box.width > 1)
    .map(({ el, box }) => ({ left: box.left, right: box.right, top: box.top, sag: parseFloat(el.style.getPropertyValue("--sag")) || 0 }));
  if (swags.length < 2) return null;
  const vw = window.innerWidth, vh = window.innerHeight;
  const u = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--station-u")) || vh / 100;
  const top = { x: swags[0].right, y: swags[0].top + .3 * u };
  const footY = vh + 3 * u;
  const foot = { x: top.x - (footY - top.y) / Math.tan(LEAN), y: footY };
  // The top end pokes just past the string; the two sections overlap a little when run out.
  const reach = Math.hypot(top.x - foot.x, top.y - foot.y) + 1.4 * u;
  const base = reach * .56, fly = reach * .56;
  const width = 6.6 * u;
  const h = 30 * u, w = h * ART.w / ART.h, feet = vh + 2.6 * u;
  const handY = feet - h + ART.hand[1] * h;
  // Holding it: his raised hand on the ladder's near rail, at the height of his hand.
  const ladderX = foot.x + (foot.y - handY) / Math.tan(LEAN);
  const stand = ladderX + width * .42 * Math.sin(LEAN) - ART.hand[0] * w;
  // Carried balanced on his shoulders, it reaches half its length ahead of him: start that far out.
  const start = -(w / 2 + base / 2) - 3 * u;
  return {
    u, vw, vh, top, swags,
    hsu: { w, h, feet, stand, start },
    ladder: { width, base, fly, extend: reach - base, foot, reach, rung: width * .82 },
  };
}

/** One section of the ladder: two rails and the rungs between them, in its own pixels. */
function Section({ length, width, rung, offset = 0, bow = false }: { length: number; width: number; rung: number; offset?: number; bow?: boolean }) {
  const rail = Math.max(3, width * .15), stick = Math.max(2.5, width * .1);
  const count = Math.floor((length - rung * .5 - offset) / rung);
  return (
    <svg className={styles.section} width={length} height={width} viewBox={`0 0 ${length} ${width}`} aria-hidden="true" focusable="false">
      {Array.from({ length: count }, (_, i) => {
        const x = rung * .5 + offset + i * rung;
        return <rect key={i} x={x - stick / 2} y={rail * .5} width={stick} height={width - rail} rx={stick * .35} fill="url(#stationRung)" stroke="#3b2109" strokeWidth={Math.max(1, stick * .22)} />;
      })}
      {[0, width - rail].map(y => (
        <rect key={y} x={.5} y={y + .5} width={length - 1} height={rail - 1} rx={rail * .45} fill="url(#stationRail)" stroke="#3b2109" strokeWidth={Math.max(1, rail * .16)} />
      ))}
      {bow && (
        <g transform={`translate(${length - rung * .55} ${width / 2}) rotate(90)`}>
          <path d={`M0 0 C${-width * .32} ${-width * .3} ${-width * .52} ${width * .05} ${-width * .2} ${width * .16} Z M0 0 C${width * .32} ${-width * .3} ${width * .52} ${width * .05} ${width * .2} ${width * .16} Z`} fill="#d1182c" stroke="#5c0610" strokeWidth={Math.max(1, width * .025)} />
          <path d={`M0 0 L${-width * .16} ${width * .5} L${-width * .04} ${width * .44} Z M0 0 L${width * .16} ${width * .5} L${width * .04} ${width * .44} Z`} fill="#b3121f" stroke="#5c0610" strokeWidth={Math.max(1, width * .02)} />
          <circle r={width * .07} fill="#e8283c" stroke="#5c0610" strokeWidth={Math.max(1, width * .02)} />
        </g>
      )}
    </svg>
  );
}

/** A climber's hands, from below the frame up the ladder, onto the string and along it home. */
function climbFrames(plan: LadderPlan, home: Point, pace: number): { frames: Keyframe[]; total: number; offLadder: number } {
  const { u, vh, ladder, top, swags } = plan;
  const along = { x: Math.cos(LEAN), y: -Math.sin(LEAN) };
  const at = (s: number) => ({ x: ladder.foot.x + along.x * s, y: ladder.foot.y + along.y * s });
  const s0 = (ladder.foot.y - (vh + 1.5 * u)) / Math.sin(LEAN);
  const s1 = ladder.reach - 2.8 * u;
  const steps: Array<{ t: number; p: Point; r: number; ease?: string }> = [];
  let t = 0;
  const push = (p: Point, r: number, ease?: string) => steps.push({ t, p, r, ease });
  // Up the ladder, a rung at a time: a breath, then reach and pull; the body swings a little each reach.
  const climbStep = .27 * pace, rungs = Math.max(1, Math.ceil((s1 - s0) / ladder.rung));
  for (let i = 0; i <= rungs; i++) {
    const p = at(Math.min(s1, s0 + i * ladder.rung));
    const r = TILT + (i % 2 ? -2.5 : 2.5);
    push(p, r);
    if (i < rungs) {
      t += climbStep * .3;
      push(p, r, "cubic-bezier(.3,.7,.4,1)");
      t += climbStep * .7;
    }
  }
  // Onto the string, letting the ladder go.
  const dir = home.x >= top.x ? 1 : -1;
  const grabX = top.x + dir * 1.6 * u;
  t += .34 * pace;
  push({ x: grabX, y: wireAt(swags, grabX) - 1 }, dir * -4, "ease-out");
  const offLadder = t;
  // Hand over hand along the lights to their own spot.
  const span = Math.abs(home.x - grabX), reach = 4.4 * u, moves = Math.max(1, Math.ceil(span / reach));
  for (let i = 1; i <= moves; i++) {
    t += .17 * pace;
    const x = grabX + (home.x - grabX) * (i / moves);
    const last = i === moves;
    push(last ? home : { x, y: wireAt(swags, x) - 1 }, last ? 0 : (i % 2 ? 3 : -3) * dir, "ease-in-out");
  }
  t += .25 * pace;
  push(home, 0);
  const total = t;
  const frames = steps.map(step => ({
    offset: total ? step.t / total : 1,
    transform: `translate3d(${step.p.x.toFixed(1)}px, ${step.p.y.toFixed(1)}px, 0) rotate(${step.r.toFixed(2)}deg)`,
    ...(step.ease ? { easing: step.ease } : {}),
  }));
  return { frames, total, offLadder };
}

/** The cradle's resting place on the lights (its own translate). */
function homeOf(cradle: HTMLElement): Point | null {
  const match = cradle.style.transform.match(/translate3d\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px/);
  return match ? { x: Number(match[1]), y: Number(match[2]) } : null;
}

type Pose = { x: number; bob: number; rock: number; angle: number; foot: Point; extend: number };

export default function StationLadder({ ref }: { ref?: Ref<LadderHandle> }) {
  const [plan, setPlan] = useState<LadderPlan | null>(null);
  const hsu = useRef<HTMLDivElement>(null);
  const ladder = useRef<HTMLDivElement>(null);
  const flySection = useRef<HTMLDivElement>(null);
  const ready = useRef<((value: void) => void) | null>(null);

  useImperativeHandle(ref, () => ({
    async run(climbers, fast, isCancelled) {
      const p = planLadder();
      if (!p) return;
      const pace = fast ? .55 : 1;
      const mounted = new Promise<void>(done => { ready.current = done; });
      setPlan(p);
      await Promise.race([mounted, wait(1500)]);
      const man = hsu.current, rig = ladder.current, fly = flySection.current;
      if (!man || !rig || !fly || isCancelled()) { setPlan(null); return; }
      await man.querySelector("img")?.decode().catch(() => {});

      const { hsu: H, ladder: L } = p;
      // On his shoulders, balanced at its middle, behind his head; his raised hand steadies it.
      const carried = (x: number, bob: number): Point => ({ x: x + H.w / 2 - L.base / 2, y: H.feet - H.h + ART.carry * H.h + bob });
      const draw = (pose: Pose) => {
        man.style.transform = `translate(${pose.x.toFixed(1)}px, ${(H.feet - H.h + pose.bob).toFixed(1)}px) rotate(${pose.rock.toFixed(2)}deg)`;
        rig.style.transform = `translate(${pose.foot.x.toFixed(1)}px, ${(pose.foot.y - L.width / 2).toFixed(1)}px) rotate(${(-pose.angle).toFixed(4)}rad)`;
        fly.style.transform = `translateX(${pose.extend.toFixed(1)}px)`;
      };
      // Walking: a step every ~0.46 s, a little bob and a rock from foot to foot.
      const stepPeriod = (fast ? .32 : .46) * 1000;
      const walking = (x: number, elapsed: number): Pose => {
        const phase = elapsed / stepPeriod * Math.PI;
        const bob = -Math.abs(Math.sin(phase)) * .75 * p.u, rock = Math.sin(phase) * 1.7;
        return { x, bob, rock, angle: 0, foot: carried(x, bob), extend: 0 };
      };
      const leaned = (extend: number, sway = 0): Pose => ({ x: H.stand, bob: 0, rock: sway, angle: LEAN, foot: L.foot, extend });

      let raf = 0;
      const animate = (ms: number, frame: (t: number, elapsed: number) => Pose) => new Promise<void>(done => {
        const start = performance.now();
        const tick = (now: number) => {
          if (isCancelled()) { done(); return; }
          const elapsed = now - start, t = clamp01(elapsed / ms);
          draw(frame(t, elapsed));
          if (t < 1) raf = requestAnimationFrame(tick); else done();
        };
        raf = requestAnimationFrame(tick);
      });
      const climbs: Animation[] = [];
      let holding = true;
      try {
        draw(walking(H.start, 0));
        rig.dataset.on = ""; man.dataset.on = "";
        // 1. In from the left edge, the ladder on his shoulder.
        const walkIn = 3200 * pace;
        await animate(walkIn, (t, e) => walking(lerp(H.start, H.stand, t < .85 ? t / .85 * .94 : .94 + smooth((t - .85) / .15) * .06), e));
        if (isCancelled()) return;
        await animate(260 * pace, () => ({ ...walking(H.stand, 0), bob: 0, rock: 0 }));
        // 2. Tip it up against the lights, foot planted below the frame.
        const from = carried(H.stand, 0);
        await animate(1300 * pace, t => {
          const k = smooth(t);
          return { x: H.stand, bob: -Math.sin(t * Math.PI) * .5 * p.u, rock: -Math.sin(t * Math.PI) * 2.5, angle: LEAN * k, foot: { x: lerp(from.x, L.foot.x, k), y: lerp(from.y, L.foot.y, k) }, extend: 0 };
        });
        if (isCancelled()) return;
        // 3. Run the top section up to the string: clack, clack, clack.
        await animate(1150 * pace, t => {
          const clacks = 4, n = t * clacks, i = Math.floor(n), f = n - i;
          const k = Math.min(1, (i + smooth(Math.min(1, f / .7))) / clacks);
          return leaned(L.extend * k);
        });
        if (isCancelled()) return;

        // 4. He holds it steady (a slow wave) while they climb, one by one.
        const hold = (async () => {
          const start = performance.now();
          while (holding && !isCancelled()) {
            const e = performance.now() - start;
            draw(leaned(L.extend, Math.sin(e / 900) * 1.2));
            await new Promise(done => { raf = requestAnimationFrame(done); });
          }
        })();
        const arrivals: Promise<void>[] = [];
        let lastOff = Promise.resolve();
        for (const chief of climbers) {
          if (isCancelled()) break;
          if (!chiefIsDown(chief)) continue;
          let leftLadder!: () => void;
          const off = new Promise<void>(done => { leftLadder = done; });
          const arrived = new Promise<void>(done => {
            let started = false;
            restoreChief(chief, cradle => {
              const home = homeOf(cradle);
              if (!home) { leftLadder(); done(); return; }
              started = true;
              const path = climbFrames(p, home, pace);
              cradle.style.transformOrigin = "0 0";
              cradle.dataset.stationClimb = "";
              const climb = cradle.animate(path.frames, { duration: path.total * 1000, easing: "linear" });
              climbs.push(climb);
              window.setTimeout(leftLadder, path.offLadder * 1000);
              const finish = () => { delete cradle.dataset.stationClimb; done(); };
              climb.finished.then(finish, finish);
            });
            // Already back on the lights (no entrance ran): nothing to wait for.
            window.setTimeout(() => { if (!started) { leftLadder(); done(); } }, 1200);
          });
          arrivals.push(arrived);
          lastOff = off;
          // The next one starts up as this one is about halfway.
          await wait(1900 * pace);
        }
        await lastOff;
        await wait(450 * pace);
        holding = false;
        await hold;
        if (isCancelled()) return;
        // 5. Top section down, ladder down onto his shoulder, and back out the way he came.
        await animate(900 * pace, t => leaned(L.extend * (1 - smooth(t))));
        const to = carried(H.stand, 0);
        await animate(1100 * pace, t => {
          const k = smooth(t);
          return { x: H.stand, bob: -Math.sin(t * Math.PI) * .4 * p.u, rock: Math.sin(t * Math.PI) * 2, angle: LEAN * (1 - k), foot: { x: lerp(L.foot.x, to.x, k), y: lerp(L.foot.y, to.y, k) }, extend: 0 };
        });
        await animate(3400 * pace, (t, e) => walking(lerp(H.stand, H.start, smooth(Math.min(1, t * 1.06)) * .3 + t * .7), e));
        await Promise.all(arrivals);
      } finally {
        holding = false;
        cancelAnimationFrame(raf);
        climbs.forEach(a => { try { a.cancel(); } catch { /* done */ } });
        setPlan(null);
      }
    },
  }), []);

  if (!plan) return null;
  const L = plan.ladder;
  return (<>
    {/* Pop-ups keep clear of the ladder while it's up (data-winter-player is their keep-clear marker). */}
    <div className={styles.keepClear} data-winter-player="" aria-hidden="true"
      style={{ top: plan.top.y, width: plan.top.x + L.width * 2, height: plan.vh - plan.top.y }} />
    <svg className={styles.defs} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="stationRail" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2a35c" /><stop offset=".45" stopColor="#b8742f" /><stop offset="1" stopColor="#7b4718" />
        </linearGradient>
        <linearGradient id="stationRung" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d79a55" /><stop offset=".5" stopColor="#c08040" /><stop offset="1" stopColor="#8d5521" />
        </linearGradient>
      </defs>
    </svg>
    <div ref={ladder} className={styles.ladder} aria-hidden="true"
      style={{ width: L.base, height: L.width, "--rail": `${L.width}px` } as CSSProperties}>
      {/* The top section rides behind the base section and runs out along it. */}
      <div ref={flySection} className={styles.fly} style={{ width: L.fly, height: L.width - plan.u * 1.2, top: plan.u * .6 }}>
        <Section length={L.fly} width={L.width - plan.u * 1.2} rung={L.rung} bow />
      </div>
      <div className={styles.base}><Section length={L.base} width={L.width} rung={L.rung} /></div>
    </div>
    <div ref={hsu} className={styles.hsu} aria-hidden="true" style={{ width: plan.hsu.w, height: plan.hsu.h }}>
      <Image src={ART.src} alt="" width={ART.w} height={ART.h} unoptimized loading="eager" draggable={false}
        onLoad={() => { ready.current?.(); ready.current = null; }} />
    </div>
  </>);
}
