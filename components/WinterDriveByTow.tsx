"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import styles from "./WinterDriveByTow.module.css";

// When visitors bury the holiday ambulance in snow, the Millstadt police pickup "250" pulls up with
// Santa at the wheel. Santa climbs out, walks the winch hook over, hooks the ambulance's front
// bumper and climbs back in; the truck reverses hard, rear tyres throwing snow, until the ambulance
// pops out of the drift, then backs away and lets the convoy drive on.
// Art: the owner's tow reference (the truck, Santa-driving and empty-cab versions) and the kit's
// walking Santa.

const ART = "/images/winter/kit/police-truck";
/** Truck art is 529 x 178: winch on the push bar, cab door, rear wheel and road line in art px. */
const TRUCK = { w: 529, h: 178, winch: [521, 136], door: [325, 118], rearWheel: [100, 134], beacon: [362, 26], grille: [512, 92], floor: 174, roof: 30 } as const;
/** The pickup's width on screen when its roof stands `height` px above the road. */
export const policeTruckWidth = (height: number) => height * TRUCK.w / (TRUCK.floor - TRUCK.roof);
/** Santa walk frames are 156 x 220 with the feet on the bottom edge. */
const SANTA = { w: 156, h: 220 } as const;

/** Everything in lane coordinates: x from the lane's left edge, y from its top. */
export type TowGeometry = {
  laneWidth: number; laneHeight: number; screenTop: number;
  /** The road line the vehicles stand on. */
  floor: number;
  /** The stuck vehicle's front bumper x, its front tow hook and its body length. */
  front: number; hook: { x: number; y: number }; length: number;
  /** The police pickup's width, sized like a real pickup beside this ambulance or fire truck. */
  truck: number;
  /** How far the stuck convoy first slides back on the ice so the truck and Santa fit on screen. */
  slide: number;
};

const ease = (t: number) => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeIn = (t: number) => t * t * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

// Timeline (ms). The wheels spin in the drift, the convoy slides back if it's too near the left
// edge, then (from the police start): drive in · climb out · walk the hook over · hook it · walk back
// · climb in · cable tightens · reverse hard (the ambulance pops free) · unhook · back away.
const CALL = 1500, SLIDE = 1100;
const DRIVE_IN = 1800, OUT = 2200, AT_HOOK = 3700, HOOKED = 4300, BACK = 5700, IN = 6100;
const TAUT = 6800, POP = 7050, PULLED = 9450, UNHOOK = 9750, GONE = 11550;
/** Each hit on the truck sets its lights going for this long (kept on while hits keep coming). */
const LIGHTS_MS = 3200, HO_MS = 1300;

type Props = {
  geometry: TowGeometry;
  /** Time Out: the whole tow holds still and carries on from the same moment. */
  paused: boolean;
  /** Snowballs that have hit the police truck or Santa: each sets the lights flashing. */
  hits: number;
  onSlide: (dx: number) => void;
  onPull: (dx: number) => void;
  onPopOut: () => void;
  onRelease: () => void;
  onDone: () => void;
};

/** Plays the rescue from the moment the ambulance gets stuck. */
export default function PoliceTow({ geometry, paused, hits, onSlide, onPull, onPopOut, onRelease, onDone }: Props) {
  const truck = useRef<HTMLDivElement>(null);
  const santa = useRef<HTMLDivElement>(null);
  const cable = useRef<SVGPathElement>(null);
  const bubble = useRef<HTMLSpanElement>(null);
  const live = useRef({ paused, hits, onSlide, onPull, onPopOut, onRelease, onDone });
  useEffect(() => { live.current = { paused, hits, onSlide, onPull, onPopOut, onRelease, onDone }; });

  const { laneWidth, laneHeight, floor, length } = geometry;
  const pw = geometry.truck, k = pw / TRUCK.w;
  const sh = TRUCK.floor * k * .9, sw = sh * SANTA.w / SANTA.h;
  const road = laneHeight - floor;

  useEffect(() => {
    const { front: front0, hook: hook0, slide } = geometry;
    const front = front0 + slide, hook = { x: hook0.x + slide, y: hook0.y };
    const gap = Math.max(length * .45, 74);
    const stopX = front - gap - pw;
    const startX = -pw - 60;
    // The truck backs up a good way, dragging the ambulance out at the cable's length.
    const pullDist = Math.min(460, Math.max(150, laneWidth * .3));
    const start = CALL + (slide > 0 ? SLIDE : 0);
    const winch = (x: number) => ({ x: x + TRUCK.winch[0] * k, y: floor - (TRUCK.floor - TRUCK.winch[1]) * k });
    const door = stopX + TRUCK.door[0] * k - sw / 2;
    const toHook = hook.x - sw * .86;
    let clock = 0, last = performance.now(), raf = 0;
    let hitsSeen = live.current.hits, lightsUntil = 0, hoUntil = 0;
    const fired = { pop: false, release: false, done: false };

    function frame(now: number) {
      const dt = Math.min(100, now - last);
      last = now;
      if (!live.current.paused) clock += dt;
      const t = clock, r = t - start;
      if (slide > 0 && t >= CALL && t <= CALL + SLIDE + 50) live.current.onSlide(slide * easeOut(span(t, CALL, CALL + SLIDE)));

      // Snowballs on the truck (or Santa) set its lights flashing and get a "Ho ho ho!".
      if (live.current.hits !== hitsSeen) { hitsSeen = live.current.hits; lightsUntil = t + LIGHTS_MS; hoUntil = t + HO_MS; }

      // The truck: in from the left; takes up the slack; reverses hard dragging the ambulance out;
      // after unhooking it backs off screen.
      let x = startX + (stopX - startX) * ease(span(r, 0, DRIVE_IN));
      if (r >= TAUT) x = stopX - 6 * span(r, TAUT, POP);
      if (r >= POP) x = stopX - 6 - pullDist * ease(span(r, POP, PULLED));
      if (r >= UNHOOK) {
        const from = stopX - 6 - pullDist, to = Math.min(from, -pw - 120) - 60;
        x = from + (to - from) * easeIn(span(r, UNHOOK, GONE));
      }
      const reversing = r >= TAUT && r < GONE;
      if (truck.current) {
        truck.current.style.transform = `translateX(${x}px)`;
        truck.current.style.visibility = r > 0 ? "visible" : "hidden";
        truck.current.dataset.cab = r >= OUT && r < IN ? "empty" : "santa";
        truck.current.dataset.spray = String(reversing);
        truck.current.dataset.lights = String(t < lightsUntil);
      }

      // Santa climbs out by the cab, carries the hook over, crouches to hook it, walks back, climbs in.
      let sx = door, face = 1, show = 0, crouch = 0, walking = false;
      if (r >= OUT - 200 && r < IN) {
        show = clamp01((r - (OUT - 200)) / 300);
        if (r < OUT) sx = door;
        else if (r < AT_HOOK) { sx = door + (toHook - door) * ease(span(r, OUT, AT_HOOK)); walking = true; }
        else if (r < HOOKED) { sx = toHook; crouch = Math.sin(Math.PI * span(r, AT_HOOK, HOOKED)); }
        else if (r < BACK) { sx = toHook + (door - toHook) * ease(span(r, HOOKED, BACK)); face = -1; walking = true; }
        else { sx = door; show = 1 - span(r, BACK, IN); face = -1; }
      }
      if (santa.current) {
        santa.current.style.opacity = String(show);
        santa.current.style.transform = `translate(${sx}px, ${crouch * sh * .1}px) scaleX(${face})`;
        // Walk cycle 1-2-3-2 about eight steps a second; a lunge (frame 3) to hook the bumper.
        const cycle = [1, 2, 3, 2][Math.floor(r / 125) % 4];
        santa.current.dataset.step = String(walking ? cycle : crouch > 0 ? 3 : 1);
      }

      // Taut cable: the ambulance strains in the drift, lurches out at POP, then follows the truck
      // at the cable's length until it's unhooked and drives on.
      let pulled = 0;
      if (r >= TAUT) {
        const truckMoved = Math.min(0, x - stopX) ;
        const strain = r < POP ? Math.sin(r / 20) * 1.8 : 0;
        const lurch = r >= POP ? -14 * Math.sin(Math.PI * span(r, POP, POP + 320)) : 0;
        pulled = (r < UNHOOK ? truckMoved : -6 - pullDist) + strain + lurch;
        if (r < UNHOOK + 60) live.current.onPull(pulled);
      }
      if (r >= POP && !fired.pop) { fired.pop = true; live.current.onPopOut(); }

      // The winch cable runs to Santa's mitten while he carries it, then to the ambulance; it sags
      // until the winch takes up the slack, and reels back in once unhooked.
      const w = winch(x);
      let end: { x: number; y: number } | null = null;
      let sag = 0;
      if (r >= OUT && r < AT_HOOK) { end = { x: sx + sw * .82, y: floor - sh * .5 }; sag = 16; }
      else if (r >= AT_HOOK && r < UNHOOK) {
        end = { x: hook.x + pulled, y: hook.y };
        sag = r < IN ? 22 : 22 * (1 - span(r, IN, TAUT));
      } else if (r >= UNHOOK && r < UNHOOK + 400) {
        const q = span(r, UNHOOK, UNHOOK + 400);
        end = { x: hook.x + pulled + (w.x - hook.x - pulled) * q, y: hook.y + (w.y - hook.y) * q }; sag = 3;
      }
      cable.current?.setAttribute("d", end
        ? `M ${w.x.toFixed(1)} ${w.y.toFixed(1)} Q ${((w.x + end.x) / 2).toFixed(1)} ${((w.y + end.y) / 2 + sag).toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}` : "");

      // "Ho ho ho!" over Santa when he's out, or over the cab.
      if (bubble.current) {
        const out = show > .5;
        const bx = out ? sx + sw / 2 : x + TRUCK.door[0] * k;
        const by = out ? floor - sh * 1.04 : floor - TRUCK.floor * k * 1.02;
        bubble.current.style.transform = `translate(${bx}px, ${by}px)`;
        bubble.current.dataset.on = String(t < hoUntil);
      }

      if (r >= UNHOOK && !fired.release) { fired.release = true; live.current.onRelease(); }
      if (r >= GONE && !fired.done) { fired.done = true; live.current.onDone(); return; }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [geometry, floor, k, length, laneWidth, pw, sh, sw]);

  const rear = { left: `${(TRUCK.rearWheel[0] - 34) / TRUCK.w * 100}%`, bottom: "0%" };
  return (
    <div className={styles.tow} aria-hidden="true">
      <svg className={styles.cable} viewBox={`0 0 ${laneWidth} ${laneHeight}`} preserveAspectRatio="none">
        <path ref={cable} d="" fill="none" stroke="#1d1f24" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
      <div ref={truck} className={styles.police} data-police="" data-cab="santa" data-spray="false" data-lights="false"
        style={{ width: pw, height: TRUCK.h * k, bottom: road - (TRUCK.h - TRUCK.floor) * k, visibility: "hidden" }}>
        <Image className={styles.cabSanta} src={`${ART}/millstadt_police_truck_side_santa.webp`} alt="" fill unoptimized sizes="260px" draggable={false} />
        <Image className={styles.cabEmpty} src={`${ART}/millstadt_police_truck_side_empty.webp`} alt="" fill unoptimized sizes="260px" draggable={false} />
        {/* The dash light bar and the grille lights flash red and blue when the truck is hit. */}
        <span className={styles.beacon} style={{ left: `${TRUCK.beacon[0] / TRUCK.w * 100}%`, top: `${TRUCK.beacon[1] / TRUCK.h * 100}%` }} />
        <span className={`${styles.beacon} ${styles.grille}`} style={{ left: `${TRUCK.grille[0] / TRUCK.w * 100}%`, top: `${TRUCK.grille[1] / TRUCK.h * 100}%` }} />
        <span className={styles.spray} style={rear} />
        <span className={styles.hit} data-hit="police" data-drive-target="police" data-snow-target="" />
      </div>
      <div ref={santa} className={styles.santa} data-step="1" style={{ width: sw, height: sh, bottom: road, opacity: 0 }}>
        {[1, 2, 3].map(step => (
          <Image key={step} className={styles.santaFrame} data-frame={step} src={`${ART}/santa-walk-${step}.webp`} alt="" fill unoptimized sizes="60px" draggable={false} />
        ))}
        <span className={styles.hit} data-hit="police" data-drive-target="police" data-snow-target="" />
      </div>
      <span ref={bubble} className={styles.ho} data-on="false">Ho ho ho!</span>
    </div>
  );
}
