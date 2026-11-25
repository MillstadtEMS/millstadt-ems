"use client";

import Image from "next/image";
import { useImperativeHandle, useRef, useState, type Ref } from "react";
import { chiefIsDown, restoreChief, type HangingChief } from "@/components/WinterRoofline";
import styles from "./StationLadder.module.css";

// The station TV's reset: Ladder 3919 drives in from the right edge (cab first, the way it faces),
// parks below the lights, raises its aerial ladder and runs the fly sections out until the tip
// touches the Christmas lights over the TV. Then the crew climb back up one by one, hand over hand up
// the ladder and along the light string to their own spots, the real hanging figures from the lights
// (WinterRoofline restoreChief), so each one simply arrives where it belongs. Then the ladder comes
// back in and the truck carries on out the left edge.
//
// The art is the kit's Ladder 3919 in two layers: the body (with its turntable) and the ladder, which
// pivots at the turntable; copies of the ladder's lattice nest inside it and slide out as the fly
// sections, so the stowed truck looks exactly like the painting.

const BODY = { w: 1154, h: 507, hingeX: 962, hingeY: 92 } as const;
// The lattice runs from x 225 to 605 (the tip's nozzle and flag sit left of it, the MILLSTADT FIRE
// banner right of it) and rises gently toward the tip (slope), so the fly sections slide along it.
const PIECE = { w: 1208, h: 245, hingeX: 1060, hingeY: 148, top: 0, bottom: 214, baseFrom: 225, tower: 1094, flyFrom: 225, flyTo: 605, tipX: 4, tipY: 96, slope: .055, scale: .9 } as const;
const FLIES = 5;
// The truck is 38% of the screen height long; the ladder leans in at about 72 degrees.
const TRUCK_SHARE = .38;
const LEAN = 72 * Math.PI / 180;

export type LadderHandle = { run: (climbers: readonly HangingChief[], fast: boolean, isCancelled: () => boolean) => Promise<void> };
type Geometry = { s: number; x: number; y: number; parkX: number; theta: number; extend: number; hinge: { x: number; y: number }; tip: { x: number; y: number } };

const sleep = (ms: number) => new Promise<void>(done => window.setTimeout(done, ms));
const ease = "cubic-bezier(.45,.05,.3,1)";

/** Where the ladder's tip goes: the lights just right of the living-room TV, so the ladder never
 *  crosses the music video. */
function lightsTarget(): { x: number; y: number } {
  const roof = document.querySelector<HTMLElement>("[data-winter-roof]");
  const gap = roof ? (Array.from(roof.children) as HTMLElement[]).find(el => !el.querySelector("[class*='anchor']") && el.getBoundingClientRect().width > 0) : null;
  if (gap) {
    const box = gap.getBoundingClientRect();
    return { x: box.left + box.width * .93, y: box.top + box.height * .72 };
  }
  const bar = document.querySelector<HTMLElement>("[data-station-hud]")?.getBoundingClientRect();
  return { x: window.innerWidth / 2, y: (bar?.bottom ?? 120) + 10 };
}

function solve(): Geometry {
  const vh = window.innerHeight;
  const s = vh * TRUCK_SHARE / BODY.w;
  const target = lightsTarget();
  const wheels = vh - vh * .012;
  const y = wheels - BODY.h * s;
  const hingeY = y + BODY.hingeY * s;
  const hingeX = target.x + (hingeY - target.y) / Math.tan(LEAN);
  const parkX = hingeX - BODY.hingeX * s;
  // The ladder's tip (piece coordinates) sits a little above its pivot line; solve the extension and
  // the angle so that, rotated and run out, it lands exactly on the target.
  const k = PIECE.scale * s;
  const dx = target.x - hingeX, dy = target.y - hingeY;
  const reach = Math.hypot(dx, dy) / k;
  // Run out by e along the lattice, the unrotated tip sits at (-(a + e), -(b + e m)) from the pivot.
  const a = PIECE.hingeX - PIECE.tipX, b = PIECE.hingeY - PIECE.tipY, m = PIECE.slope;
  const qa = 1 + m * m, qb = 2 * (a + b * m), qc = a * a + b * b - reach * reach;
  const extend = Math.max(0, (-qb + Math.sqrt(Math.max(0, qb * qb - 4 * qa * qc))) / (2 * qa));
  const theta = Math.atan2(dy, dx) - Math.atan2(-(b + extend * m), -(a + extend));
  return { s, x: window.innerWidth + 40, y, parkX, theta, extend, hinge: { x: hingeX, y: hingeY }, tip: target };
}

const boomTransform = (degrees: number) =>
  `translate(${BODY.hingeX}px, ${BODY.hingeY}px) rotate(${degrees}deg) scale(${PIECE.scale}) translate(${-PIECE.hingeX}px, ${-PIECE.hingeY}px)`;

/** The figure's hands travel up the ladder and along the lights to its own spot, hand over hand. */
function climbPath(cradle: HTMLElement, g: Geometry, fast: boolean): Animation | null {
  const box = cradle.getBoundingClientRect();
  const home = { x: box.left, y: box.top };
  const below = { x: g.hinge.x + 12, y: window.innerHeight + box.width * 1.6 };
  const legs = [
    { from: below, to: g.hinge, speed: fast ? 900 : 640 },
    { from: g.hinge, to: g.tip, speed: fast ? 620 : 420 },
    { from: g.tip, to: home, speed: fast ? 760 : 520 },
  ];
  const lengths = legs.map(l => Math.hypot(l.to.x - l.from.x, l.to.y - l.from.y));
  const times = legs.map((l, i) => lengths[i] / l.speed);
  const total = times.reduce((a, b) => a + b, 0);
  if (!(total > 0)) return null;
  const frames: Keyframe[] = [];
  let elapsed = 0;
  legs.forEach((leg, i) => {
    // A reach every ~0.32 s: swing one way, then the other.
    const reaches = Math.max(1, Math.round(times[i] / (fast ? .24 : .32)));
    for (let r = 0; r < reaches; r++) {
      const t = r / reaches;
      const swing = i === 0 ? 0 : (r % 2 ? -1 : 1) * (i === 1 ? 6 : 8);
      frames.push({
        offset: (elapsed + times[i] * t) / total,
        transform: `translate3d(${(leg.from.x + (leg.to.x - leg.from.x) * t).toFixed(1)}px, ${(leg.from.y + (leg.to.y - leg.from.y) * t).toFixed(1)}px, 0) rotate(${swing}deg)`,
      });
    }
    elapsed += times[i];
  });
  frames.push({ offset: 1, transform: `translate3d(${home.x.toFixed(1)}px, ${home.y.toFixed(1)}px, 0) rotate(0deg)` });
  cradle.style.transformOrigin = "0 0";
  return cradle.animate(frames, { duration: total * 1000, easing: "linear" });
}

export default function StationLadder({ ref }: { ref?: Ref<LadderHandle> }) {
  const truck = useRef<HTMLDivElement>(null);
  const boom = useRef<HTMLDivElement>(null);
  const flies = useRef<Array<HTMLImageElement | null>>([]);
  const [shown, setShown] = useState(false);

  useImperativeHandle(ref, () => ({
    async run(climbers, fast, isCancelled) {
      const g = solve();
      setShown(true);
      await sleep(60);
      const body = truck.current, arm = boom.current;
      if (!body || !arm || isCancelled()) { setShown(false); return; }
      const place = (x: number) => `translate(${x.toFixed(1)}px, ${g.y.toFixed(1)}px) scale(${g.s.toFixed(4)})`;
      const pace = fast ? .62 : 1;
      const animations: Animation[] = [];
      const play = (el: Element, frames: Keyframe[], ms: number, easing = ease) => {
        const a = el.animate(frames, { duration: ms * pace, easing, fill: "forwards" });
        animations.push(a);
        return a.finished.catch(() => undefined);
      };
      try {
        // In from the right edge, cab first, easing to a stop with a little settle on the springs.
        await play(body, [{ transform: place(window.innerWidth + 30) }, { transform: place(g.parkX), offset: .92 }, { transform: place(g.parkX - 4), offset: .96 }, { transform: place(g.parkX) }], 3600, "cubic-bezier(.2,.6,.3,1)");
        if (isCancelled()) return;
        await sleep(350 * pace);
        const degrees = g.theta * 180 / Math.PI;
        await play(arm, [{ transform: boomTransform(0) }, { transform: boomTransform(degrees) }], 2600);
        if (isCancelled()) return;
        const step = g.extend / FLIES;
        const out = (i: number) => `translate(${(-step * (i + 1)).toFixed(1)}px, ${(-step * (i + 1) * PIECE.slope).toFixed(1)}px)`;
        await Promise.all(flies.current.map((fly, i) => fly && play(fly, [{ transform: "translate(0, 0)" }, { transform: out(i) }], 2200)));
        if (isCancelled()) return;
        await sleep(300 * pace);

        // One by one up the ladder; the next starts as the last is partway up.
        const arrivals: Promise<unknown>[] = [];
        for (const chief of climbers) {
          if (isCancelled()) return;
          if (!chiefIsDown(chief)) continue;
          arrivals.push(new Promise<void>(done => {
            restoreChief(chief, cradle => {
              const climb = climbPath(cradle, g, fast);
              if (!climb) { done(); return; }
              animations.push(climb);
              climb.finished.then(() => done(), () => done());
            });
            // Restored without an entrance (already on the lights): nothing to wait for.
            window.setTimeout(done, 15_000);
          }));
          await sleep((fast ? 900 : 1500));
        }
        await Promise.all(arrivals);
        if (isCancelled()) return;
        await sleep(600 * pace);

        // Fly sections in, ladder down, and on out the left edge.
        await Promise.all(flies.current.map((fly, i) => fly && play(fly, [{ transform: out(i) }, { transform: "translate(0, 0)" }], 1800)));
        await play(arm, [{ transform: boomTransform(degrees) }, { transform: boomTransform(0) }], 2200);
        await sleep(250 * pace);
        await play(body, [{ transform: place(g.parkX) }, { transform: place(-BODY.w * g.s - 40) }], 3400, "cubic-bezier(.45,0,.75,.6)");
      } finally {
        animations.forEach(a => { try { a.cancel(); } catch { /* finished */ } });
        setShown(false);
      }
    },
  }), []);

  if (!shown) return null;
  return (
    <div ref={truck} className={styles.truck} aria-hidden="true"
      style={{ width: BODY.w, height: BODY.h, transform: `translate(${window.innerWidth + 30}px, 0) scale(.3)` }}>
      <Image className={styles.body} src="/images/winter/kit/station/ladder-3919-body.webp" alt="" width={BODY.w} height={BODY.h} unoptimized priority />
      <div ref={boom} className={styles.boom} style={{ width: PIECE.w, height: PIECE.h, transform: boomTransform(0) }}>
        {/* The fly sections nest inside the base section (the outermost carries the tip) and slide out. */}
        {Array.from({ length: FLIES }, (_, i) => FLIES - 1 - i).map(i => (
          <Image key={i} ref={el => { flies.current[i] = el; }} className={styles.section} alt="" width={PIECE.w} height={PIECE.h} unoptimized
            src="/images/winter/kit/station/ladder-3919-ladder.webp"
            style={{ clipPath: `polygon(${i === FLIES - 1 ? 0 : PIECE.flyFrom}px ${PIECE.top}px, ${PIECE.flyTo}px ${PIECE.top}px, ${PIECE.flyTo}px ${PIECE.bottom}px, ${i === FLIES - 1 ? 0 : PIECE.flyFrom}px ${PIECE.bottom}px)` }} />
        ))}
        <Image className={styles.section} alt="" width={PIECE.w} height={PIECE.h} unoptimized src="/images/winter/kit/station/ladder-3919-ladder.webp"
          style={{ clipPath: `polygon(${PIECE.baseFrom}px ${PIECE.top}px, ${PIECE.tower}px ${PIECE.top}px, ${PIECE.tower}px ${PIECE.bottom}px, ${PIECE.baseFrom}px ${PIECE.bottom}px)` }} />
      </div>
    </div>
  );
}
