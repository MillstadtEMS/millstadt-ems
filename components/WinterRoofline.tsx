"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState, useCallback, useSyncExternalStore, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";
import { isSnowballTimeout, useSnowballTimeout } from "@/lib/seasonal/snowballTimeout";
import { reachSamples, tapSlop, touchReach } from "@/lib/device/profile";
import styles from "./WinterRoofline.module.css";

const bulbs = ["#ff463e", "#ffca48", "#48ef94", "#69caff", "#ff6956", "#ffdf8f", "#57dfab", "#ee80c7"];
const sockets = [0.07, 0.26, 0.47, 0.69, 0.89];
const swags = [21, 11, 17, 13, 16, 21];
// Everyone hangs from the Christmas lights, one swag each. Jen and Kenny use their articulated
// rigs (legs kick separately); the crew from the Christmas kit swing whole, with a calm pose and a
// startled, legs-kicking pose swapped like a flip-book. ratio = the hanging art's width / height.
type Chief = "jen" | "kenny" | "kalista" | "braeden" | "dylan" | "medical-director" | "gabby";
// Holiday hats are painted into the art itself so they fit exactly: Jen's Santa hat is re-dyed
// as a Christmas-tree hat with a star, and Braeden wears his own sombrero from his mariachi art.
// legs: swing the painted legs in at the hips (calm pose) so they hang together, not spread.
type Officer = {
  name: string; folder?: string; calm?: string; startled?: string;
  ratio: number; fallback: number; tempo: number; phase: number;
  // size: shrinks or grows one figure against the others (his painting is drawn larger).
  size?: number;
  // split: the gap between the legs traced from the crotch down (percent points), so a shin that
  // swings under the other leg stays with its own leg.
  legs?: { splitX: number; splitY: number; hipLeft: string; hipRight: string; turn: number; split?: Array<[number, number]> };
  // anim: a painted animation that swings on its own (Gabby): the hang loop, its still, and her
  // furious face for the fall. A hit knocks her all the way off like everyone else.
  anim?: { hang: string; still: string; mad: string };
};
const kitCrew = (file: string) => `/images/winter/kit/crew/${file}.webp`;
const rigRatio = 477 / 716;
const officers: Record<Chief, Officer> = {
  jen: { name: "Jen", folder: "/images/winter/jen-tree/", ratio: rigRatio, fallback: .93, tempo: 5.5, phase: 0 },
  kenny: { name: "Kenny", folder: "/images/winter/kenny/", ratio: rigRatio, fallback: .07, tempo: 4.9, phase: 2.2 },
  kalista: { name: "Kalista", calm: kitCrew("kalista-hanging"), startled: kitCrew("kalista-hanging-scared"), ratio: 416 / 640, fallback: .3, tempo: 5.2, phase: 1.1,
    legs: { splitX: 55.5, splitY: 68.3, hipLeft: "46.5% 69.1%", hipRight: "66.8% 69.1%", turn: 0,
      split: [[55.5, 68.3], [56.7, 71.1], [56.4, 73.9], [55.3, 76.7], [53.5, 79.5], [51.4, 82.3], [48, 85.2], [45.1, 88], [44.8, 90.8], [44.4, 93.6], [44.4, 99.2]] } },
  braeden: { name: "Braeden", calm: kitCrew("braeden-hanging"), startled: kitCrew("braeden-hanging-scared"), ratio: 543 / 640, fallback: .43, tempo: 5.8, phase: 3, size: .8,
    legs: { splitX: 53.8, splitY: 68.75, hipLeft: "47% 69.5%", hipRight: "59.9% 69.5%", turn: 38 } },
  dylan: { name: "Dylan", calm: kitCrew("dylan-hanging"), startled: kitCrew("dylan-hanging-scared"), ratio: 466 / 640, fallback: .57, tempo: 5, phase: .6,
    legs: { splitX: 56.3, splitY: 67.3, hipLeft: "48.7% 68.1%", hipRight: "69.1% 68.1%", turn: 0,
      split: [[56.3, 67.3], [58.5, 70.2], [60, 73], [58.6, 75.8], [55.9, 78.6], [54.1, 81.4], [51.2, 84.2], [47.1, 87], [46.2, 89.8], [46.5, 92.7], [45.2, 95.5], [45.2, 99.2]] } },
  // Gabby hangs where the medical director used to on the Christmas lights (he still pops up and
  // waves from behind the trucks everywhere else).
  gabby: { name: "Gabby", ratio: 600 / 720, fallback: .7, tempo: 4.7, phase: 2.6, anim: {
    hang: "/images/winter/kit/gabby/gabby-hang.webp", still: "/images/winter/kit/gabby/gabby-hang-still.webp",
    mad: "/images/winter/kit/gabby/gabby-hang-mad.webp",
  } },
  "medical-director": { name: "Dr. Hsu", calm: kitCrew("medical-director-hanging"), startled: kitCrew("medical-director-hanging-scared"), ratio: 466 / 640, fallback: .7, tempo: 4.7, phase: 2.6,
    legs: { splitX: 54.2, splitY: 67.3, hipLeft: "47.7% 68.1%", hipRight: "66.3% 68.1%", turn: 0,
      split: [[54.2, 67.3], [56.3, 70.2], [58, 73], [57, 75.8], [55.2, 78.6], [53.9, 81.4], [51.5, 84.2], [48, 87], [46.8, 89.8], [47.5, 92.7], [46.6, 95.5], [45.8, 99.2]] } },
};
// This document's dismissals follow client navigation and reset on reload. Kept on the window so a
// module reload (a code update while the page is open) doesn't put everyone back on the lights.
const memory = globalThis as typeof globalThis & { __memsFallenChiefs?: Set<Chief>; __memsEveryoneDown?: boolean; __memsRescuedChiefs?: Set<Chief> };
const fallenChiefs: Set<Chief> = (memory.__memsFallenChiefs ??= new Set<Chief>());
// Santa's ladder rescue (WinterLadderRescue) takes people off the lights without the fall. They count
// as down once the truck has gone (finishRescue), so the living room's easter eggs (Gabby's chimney
// gag has its own Santa) wait until the rescue is over.
const rescuedChiefs: Set<Chief> = (memory.__memsRescuedChiefs ??= new Set<Chief>());
const offLights = (chief: Chief) => fallenChiefs.has(chief) || rescuedChiefs.has(chief);
// Knocking everyone off the lights unlocks the living room's turkey heist (WinterFireplaceScenes).
const crewListeners = new Set<() => void>();
export function subscribeCrewDown(listener: () => void) {
  crewListeners.add(listener);
  return () => { crewListeners.delete(listener); };
}
// Once everyone has been off the lights at the same moment, the heist stays unlocked for the visit
// (Gabby climbs back up after her chimney gag).
let everyoneDown = memory.__memsEveryoneDown ?? false;
const latchEveryoneDown = () => { everyoneDown = memory.__memsEveryoneDown = true; };
/** How many of the crew have been knocked off the lights on this visit. */
export const crewDownCount = () => fallenChiefs.size;
export const allCrewDown = () => everyoneDown || lineup.every(chief => fallenChiefs.has(chief));

// Each figure on the lights registers here for the rescue: its grip on the wire (viewport px), its
// box, and a bounce for its string of lights when it lets go.
type Hanging = { element: HTMLDivElement; x: number; y: number; width: number; height: number; retire: () => void; bounce: () => void };
const hangingFigures = new Map<Chief, Hanging>();
const rescuing = new Set<Chief>();
const announce = () => crewListeners.forEach(listener => listener());
export type CrewChief = Chief;
/** Everyone is still on the lights (the living room's pull station lights up only then). */
export const allCrewHanging = () => lineup.every(chief => !offLights(chief) && hangingFigures.has(chief));
export type HangingCrewMember = { chief: Chief; name: string; x: number; y: number; width: number; height: number };
/** The crew still on the lights, left to right: each grip on the wire and the figure's box size (viewport px). */
export function hangingCrew(): HangingCrewMember[] {
  return lineup.flatMap(chief => {
    const figure = hangingFigures.get(chief);
    if (!figure || offLights(chief)) return [];
    return [{ chief, name: officers[chief].name, x: figure.x, y: figure.y, width: figure.width, height: figure.height }];
  });
}
/** Takes a crew member off the lights without the fall (their string of lights bounces as they let
 *  go). The caller moves their figure (a transform around the grip, `transform-origin: 0 0`) until it
 *  calls release(); they count as down at finishRescue(). */
export function rescueChief(chief: Chief): { element: HTMLDivElement; release: () => void } | null {
  const figure = hangingFigures.get(chief);
  if (!figure || offLights(chief) || rescuing.has(chief)) return null;
  rescuing.add(chief);
  rescuedChiefs.add(chief);
  figure.element.dataset.rescue = "";
  figure.bounce();
  announce();
  let released = false;
  return { element: figure.element, release: () => { if (released) return; released = true; figure.retire(); } };
}
/** The rescue is over: everyone Santa took off the lights counts as down (unlocking the living room's
 *  easter eggs once the whole crew is off). */
export function finishRescue() {
  if (!rescuedChiefs.size) return;
  rescuedChiefs.forEach(chief => fallenChiefs.add(chief));
  rescuedChiefs.clear();
  if (lineup.every(chief => fallenChiefs.has(chief))) latchEveryoneDown();
  announce();
}

/** Gabby's own painted swing, its still (reduced motion, Time Out), and her furious face as she falls. */
function AnimRig({ anim, onMask, hit }: { anim: NonNullable<Officer["anim"]>; onMask: (image: HTMLImageElement) => void; hit: boolean }) {
  const timeout = useSnowballTimeout();
  const [still, setStill] = useState(false);
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(motion.matches);
    sync();
    motion.addEventListener("change", sync);
    return () => motion.removeEventListener("change", sync);
  }, []);
  const quiet = still || timeout;
  return (
    <div className={styles.torso}>
      <Image src={hit ? anim.mad : quiet ? anim.still : anim.hang} alt="" width={450} height={540} unoptimized loading="eager" />
      {/* Ready for the moment she's hit. */}
      <link rel="preload" as="image" href={anim.mad} />
      {/* The still traces her outline for the snowball hit test. */}
      <Image className={styles.maskSource} src={anim.still} alt="" width={450} height={540} unoptimized loading="eager"
        onLoad={event => onMask(event.currentTarget)} />
      <HitMap />
    </div>
  );
}
// Crew members the mouse is currently aiming at (drives the snowball reticle).
const aimers = new Set<Chief>();
const controls = [
  "a", "button", "form", "input", "textarea", "select", "label", "summary", "iframe", "video", "audio",
  '[role="button"]', '[role="link"]', '[role="menuitem"]', '[role="switch"]', '[role="slider"]',
  '[role="tab"]', '[role="checkbox"]', '[role="radio"]', '[tabindex="0"]', '[contenteditable="true"]',
].join(",");
const maskWidth = 160, maskHeight = 240;

function HitMap() {
  return <svg className={styles.hitMap} viewBox="0 0 477 716" preserveAspectRatio="none" aria-hidden="true">
    <rect data-chief-ink="" width="477" height="716" fill="transparent" />
  </svg>;
}

// Legs and the coal sack are real <img> layers, like the torso. CSS background images on these
// clipped, constantly rotating pieces were dropped by Safari/iOS during momentum scrolling, which
// made the legs vanish mid-swing.
function Limb({ src }: { src: string }) {
  return <Image src={src} alt="" width={477} height={716} className={styles.limb} unoptimized loading="eager" />;
}

// The crew from the Christmas kit get the same kind of rig as Jen and Kenny: one painting cut at
// the hips, each leg kicking from its own hip as the page moves, and a still copy of the hips under
// the legs so a kick never opens a hole. The figure never changes size: only the face changes, to
// the freaked-out face painted onto the same body (…-hanging-scared.webp).
function KitRig({ officer, onMask }: { officer: Officer; onMask: (image: HTMLImageElement) => void }) {
  const { splitX, splitY, hipLeft, hipRight, turn, split = [[splitX, splitY], [splitX, 100]] } = officer.legs!;
  const seam = split.map(([x, y]) => `${x}% ${y}%`).join(",");
  const foot = split[split.length - 1][0];
  const leftLeg = `polygon(0 ${splitY}%,${seam},${foot}% 100%,0 100%)`;
  const rightLeg = `polygon(${seam},${foot}% 100%,100% 100%,100% ${splitY}%)`;
  const art = (src: string, mask = false) => (
    <Image src={src} alt="" width={Math.round(640 * officer.ratio)} height={640} unoptimized loading="eager"
      onLoad={mask ? event => onMask(event.currentTarget) : undefined} />
  );
  return (
    <div className={styles.torso}>
      {/* Legs that hang straight get still hips beneath them; turned-in legs (Braeden) don't, or the
          painted spread would show underneath. */}
      {!turn && <span className={styles.kitPiece} style={{ clipPath: `polygon(26% ${splitY - 2}%,78% ${splitY - 2}%,78% ${splitY + 4.5}%,26% ${splitY + 4.5}%)` }}>{art(officer.calm!)}</span>}
      <span className={`${styles.kitPiece} ${styles.kitLeg}`} style={{
        clipPath: leftLeg, transformOrigin: hipLeft, "--leg-turn": `${-turn}deg`,
      } as CSSProperties}>{art(officer.calm!)}</span>
      <span className={`${styles.kitPiece} ${styles.kitLeg} ${styles.kitLegRight}`} style={{
        clipPath: rightLeg, transformOrigin: hipRight, "--leg-turn": `${turn}deg`,
      } as CSSProperties}>{art(officer.calm!)}</span>
      <span className={styles.kitPiece} style={{ clipPath: `polygon(0 0,100% 0,100% ${splitY}%,0 ${splitY}%)` }}>
        {art(officer.calm!, true)}
        <span className={styles.scaredFace}>{art(officer.startled!)}</span>
      </span>
      {/* The painted belt and hips over the joins. */}
      <span className={styles.kitPiece} style={{ clipPath: `polygon(37% ${splitY - 6}%,66% ${splitY - 6}%,64% ${splitY + 3}%,39% ${splitY + 3}%)` }}>{art(officer.calm!)}</span>
      <HitMap />
    </div>
  );
}

const noSubscription = () => () => {};
const bodyOnClient = () => document.body;
const noBody = () => null;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function HangingCrew({ chief, anchor, menuOpen }: { chief: Chief; anchor: RefObject<HTMLSpanElement | null>; menuOpen: boolean }) {
  const body = useSyncExternalStore<HTMLElement | null>(noSubscription, bodyOnClient, noBody);
  const puppet = useRef<HTMLDivElement>(null);
  const target = useRef<HTMLButtonElement>(null);
  const alpha = useRef<Uint8ClampedArray | null>(null);
  const retire = useRef<number | undefined>(undefined);
  const [gone, setGone] = useState(() => offLights(chief));
  const [shot, setShot] = useState<{ x: number; y: number } | null>(null);
  const officer = officers[chief];
  const anim = officer.anim;



  function loadMask(image: HTMLImageElement) {
    const canvas = document.createElement("canvas");
    canvas.width = maskWidth; canvas.height = maskHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    try {
      context.drawImage(image, 0, 0, maskWidth, maskHeight);
      const data = context.getImageData(0, 0, maskWidth, maskHeight).data;
      let opaque = 0;
      for (let i = 3; i < data.length; i += 4) if (data[i] > 70) opaque++;
      // A privacy mode that blanks canvas reads would leave nothing tappable: use the body column below instead.
      alpha.current = opaque > maskWidth * maskHeight * .02 ? data : null;
    } catch { /* Browsers that restrict canvas reads use the body column below. */ }
  }

  const throwSnowball = useCallback((x: number, y: number) => {
    if (offLights(chief) || isSnowballTimeout()) return;
    fallenChiefs.add(chief);
    if (lineup.every(c => fallenChiefs.has(c))) latchEveryoneDown();
    crewListeners.forEach(listener => listener());
    setShot({ x, y });
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    retire.current = window.setTimeout(() => setGone(true), still ? 750 : 1460);
    if (!still) anchor.current?.parentElement?.animate([
      { transform: "translateY(0)" }, { transform: "translateY(-3px)" },
      { transform: "translateY(1px)" }, { transform: "translateY(0)" },
    ], { duration: 460, delay: 560, easing: "ease-out" });
  }, [anchor, chief]);

  useEffect(() => () => window.clearTimeout(retire.current), []);
  // Leaves the rescue registry when the figure leaves the lights for good.
  useEffect(() => {
    if (gone) return;
    return () => {
      hangingFigures.delete(chief);
      if (rescuing.delete(chief)) delete puppet.current?.dataset.rescue;
    };
  }, [chief, gone]);


  useEffect(() => {
    const figure = puppet.current;
    if (!body || !figure || shot || gone) return;
    let startX = 0, startY = 0, startType = "mouse";
    const start = (event: PointerEvent) => { startX = event.clientX; startY = event.clientY; startType = event.pointerType; };
    function inkAt(clientX: number, clientY: number, mask: Uint8ClampedArray | null) {
      for (const element of document.elementsFromPoint(clientX, clientY)) {
        if (!(element instanceof SVGRectElement) || !element.hasAttribute("data-chief-ink") || !figure!.contains(element)) continue;
        const matrix = element.getScreenCTM();
        if (!matrix) continue;
        const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
        if (point.y < 84) {
          // The light string across the top isn't a target (on the kit crew, nor their hands).
          if (!officer.folder) continue;
          const nearGrip = chief === "kenny" ? Math.abs(point.x - 238) < 25
            : Math.abs(point.x - 187) < 24 || Math.abs(point.x - 284) < 25;
          if (!nearGrip) continue;
        }
        const x = Math.floor(point.x * maskWidth / 477), y = Math.floor(point.y * maskHeight / 716);
        const shirtCenter = chief === "kenny" ? 94 : 81;
        const ink = mask ? mask[(y * maskWidth + x) * 4 + 3] > 70
          : Math.abs(x - shirtCenter) < maskWidth * .28 && y > 24;
        if (x >= 0 && x < maskWidth && y > 9 && y < maskHeight && ink) return true;
      }
      return false;
    }
    function hit(event: MouseEvent) {
      const mask = alpha.current;
      if (!figure || event.defaultPrevented || !event.detail || event.button !== 0 || isSnowballTimeout() ||
          offLights(chief) || Math.hypot(event.clientX - startX, event.clientY - startY) > tapSlop(startType)) return;
      if (!(event.target instanceof Element) || event.target.closest(controls)) return;
      // Ask the browser which rotated/clipped costume pieces are at this point (and, for a finger,
      // a small ring around it). The overlay only participates in hit-testing during this
      // synchronous lookup, so page links, form fields, text selection and touch scrolling retain priority.
      figure.dataset.sampling = "";
      let visibleInk = false;
      try {
        visibleInk = reachSamples(touchReach(startType)).some(([dx, dy]) => inkAt(event.clientX + dx, event.clientY + dy, mask));
      } finally { delete figure.dataset.sampling; }
      if (visibleInk) {
        event.preventDefault();
        event.stopImmediatePropagation();
        throwSnowball(event.clientX, event.clientY);
      }
    }
    // The snowball reticle shows over the crew too: a mouse resting on visible costume (not on a
    // page control underneath) marks html[data-snow-aim] (winter-snowball-play.css).
    let hoverFrame = 0, hoverAt: PointerEvent | null = null, aiming = false;
    function setAiming(on: boolean) {
      if (on === aiming) return;
      aiming = on;
      if (on) aimers.add(chief); else aimers.delete(chief);
      document.documentElement.toggleAttribute("data-snow-aim", aimers.size > 0);
    }
    function hoverCheck() {
      hoverFrame = 0;
      const event = hoverAt;
      let on = false;
      if (event && figure && !isSnowballTimeout() && !offLights(chief)) {
        const box = figure.querySelector("[data-snow-fighter]")?.getBoundingClientRect();
        if (box && event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom
            && !document.elementFromPoint(event.clientX, event.clientY)?.closest(controls)) {
          figure.dataset.sampling = "";
          try { on = inkAt(event.clientX, event.clientY, alpha.current); } finally { delete figure.dataset.sampling; }
        }
      }
      setAiming(on);
    }
    function hover(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      hoverAt = event;
      if (!hoverFrame) hoverFrame = requestAnimationFrame(hoverCheck);
    }
    document.addEventListener("pointerdown", start, { passive: true, capture: true });
    // On the window, so a tap on someone on the lights is theirs before the site-wide fight's
    // document listener can claim it as a plain throw, whichever was added first. A mouse marks its
    // aim by hovering, but a phone has no hover to mark it with.
    window.addEventListener("click", hit, true);
    document.addEventListener("pointermove", hover, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", start, true);
      window.removeEventListener("click", hit, true);
      document.removeEventListener("pointermove", hover);
      cancelAnimationFrame(hoverFrame);
      setAiming(false);
    };
  }, [body, chief, gone, officer.folder, shot, throwSnowball]);

  useLayoutEffect(() => {
    const figure = puppet.current;
    const pin = anchor.current;
    const header = pin?.closest("header") ?? pin?.closest<HTMLElement>("[data-winter-roof]");
    if (!body || !figure || !pin || !header || gone) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const scrollPositions = new WeakMap<Element, number>();
    let pageY = window.scrollY, lastInput = performance.now(), lastFrame = 0, raf = 0;
    let phase = officer.phase, energy = 0, expression = 0, sign = 1;
    const kit = !officer.folder;

    // These transforms move only composited layers. Geometry is cached at
    // resize/header changes so the scroll handler never requests layout.
    function paint() {
      if (!figure) return;
      figure.style.setProperty("--panic", reduced.matches ? "0" : Math.min(1, expression * 1.25).toFixed(3));
      // Kit crew: calm and startled are different poses, so they swap (never blend), with a little
      // hysteresis so the kick doesn't flicker.
      if (kit) {
        if (!reduced.matches && expression > .5) figure.dataset.startled = "";
        else if (expression < .3) delete figure.dataset.startled;
      }
      const swing = energy * (Math.sin(phase) * 9.8 + sign * 1.9);
      // Kicks stay within what the cut-out hips can follow without the legs looking detached.
      const kickLeft = energy * (Math.sin(phase * 1.31 + .5) * 11 + 7);
      const kickRight = energy * (Math.sin(phase * 1.57 + 2) * 10 - 6);
      figure.style.setProperty("--swing", swing.toFixed(2) + "deg");
      figure.style.setProperty("--kick-left", kickLeft.toFixed(2) + "deg");
      figure.style.setProperty("--kick-right", kickRight.toFixed(2) + "deg");
    }

    function measure() {
      // Santa's ladder rescue moves the figure now.
      if (!figure || !pin || !header || rescuing.has(chief)) return;
      const pos = pin.getBoundingClientRect();
      const view = document.documentElement.clientWidth;
      const hidden = !pos.width || pos.top < 5 || getComputedStyle(header).visibility === "hidden";
      const inset = figure.offsetWidth / 2 + 8;
      const x = hidden ? Math.min(view - inset, Math.max(inset, view * officer.fallback)) : pos.left + pos.width / 2;
      const y = hidden ? Math.max(24, figure.offsetWidth * .076) : pos.top;
      figure.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      figure.style.setProperty("--tie-opacity", hidden ? "1" : "0");
      pageY = window.scrollY;
      paint();
      figure.dataset.ready = "";
      const known = hangingFigures.has(chief);
      hangingFigures.set(chief, {
        element: figure, x, y, width: figure.offsetWidth, height: figure.offsetWidth / officer.ratio, retire: () => setGone(true),
        bounce: () => pin.parentElement?.animate([
          { transform: "translateY(0)" }, { transform: "translateY(-3px)" }, { transform: "translateY(1px)" }, { transform: "translateY(0)" },
        ], { duration: 460, easing: "ease-out" }),
      });
      if (!known) announce();
    }

    function frame(now: number) {
      raf = 0;
      if (document.hidden || reduced.matches) return;
      const dt = Math.min(.045, Math.max(.001, (now - (lastFrame || now - 16)) / 1000));
      lastFrame = now;
      energy *= Math.exp(-dt * 2.25);
      expression += (energy - expression) * (1 - Math.exp(-dt * (energy > expression ? 18 : 2.3)));
      phase += dt * (officer.tempo + 7.5 * energy);
      if (energy < .008 && expression < .009) {
        energy = expression = lastFrame = 0;
        paint(); return;
      }
      paint();
      raf = requestAnimationFrame(frame);
    }

    function scroll(event: Event) {
      const scroller = event.target instanceof Element && event.target !== document.scrollingElement ? event.target : null;
      const y = scroller ? scroller.scrollTop : window.scrollY;
      const dy = y - (scroller ? scrollPositions.get(scroller) ?? 0 : pageY);
      if (scroller) scrollPositions.set(scroller, y);
      else pageY = y;
      if (Math.abs(dy) <= .1 || reduced.matches || document.hidden || rescuing.has(chief)) return;
      const now = performance.now();
      const elapsed = Math.max(12, Math.min(65, now - lastInput));
      lastInput = now;
      sign = Math.sign(dy);
      const impulse = clamp01(.05 + Math.abs(dy) / elapsed * .60);
      energy = Math.max(energy, impulse);
      if (!raf) raf = requestAnimationFrame(frame);
    }
    function rest() {
      cancelAnimationFrame(raf); raf = energy = expression = lastFrame = 0;
      pageY = window.scrollY; paint();
    }
    // A snowball from the site-wide fight: a hard swing and the startled face.
    function struck(event: Event) {
      if (reduced.matches || document.hidden || rescuing.has(chief)) return;
      const from = (event as CustomEvent<{ from?: { x: number } }>).detail?.from;
      const box = figure!.getBoundingClientRect();
      sign = from && from.x > box.left + box.width / 2 ? -1 : 1;
      energy = Math.max(energy, .95);
      expression = 1;
      if (!raf) raf = requestAnimationFrame(frame);
    }
    const sizing = new ResizeObserver(measure);
    sizing.observe(header); sizing.observe(figure); sizing.observe(document.documentElement);
    // The swag itself: it narrows when the gap over the music video opens after the player loads.
    if (pin.parentElement) sizing.observe(pin.parentElement);
    const changing = new MutationObserver(measure);
    changing.observe(header, { attributes: true, attributeFilter: ["class", "style", "hidden", "aria-hidden"] });
    header.addEventListener("transitionend", measure);
    document.addEventListener("scroll", scroll, { passive: true, capture: true });
    window.addEventListener("resize", measure, { passive: true });
    document.addEventListener("visibilitychange", rest);
    reduced.addEventListener("change", rest);
    figure.addEventListener("mems:snow-hit", struck);
    measure();
    return () => {
      sizing.disconnect(); changing.disconnect();
      figure.removeEventListener("mems:snow-hit", struck);
      cancelAnimationFrame(raf);
      header.removeEventListener("transitionend", measure);
      document.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", rest);
      reduced.removeEventListener("change", rest);
    };
  }, [anchor, body, chief, gone, officer.fallback, officer.folder, officer.phase, officer.tempo]);

  if (!body) return null;
  if (gone) return shot ? createPortal(<span role="status" className={styles.announcement}>{officer.name} fell from the Christmas lights!</span>, body) : null;
  const kit = !officer.folder && !anim;
  return createPortal(<>
    <div ref={puppet} className={styles.cradle} data-hanging-chief={chief} data-phase={shot ? "hit" : "hanging"}
      data-menu-open={menuOpen} data-kit={kit || undefined} data-anim={anim ? "" : undefined}
      style={{ "--hang-ratio": String(officer.ratio), "--hang-scale": String((officer.ratio / rigRatio) * (officer.size ?? 1)) } as CSSProperties}>
      <svg className={styles.tether} viewBox="0 0 120 32" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 30C30 32 71 24 119 2" fill="none" stroke="#122a20" strokeWidth="3" />
        <path d="M0 29C30 31 71 23 119 1" fill="none" stroke="#9b9a65" strokeWidth=".75" />
        <path d="m31 29 1 4m39-13 2 4" stroke="#31452b" strokeWidth="2" />
        <ellipse cx="32" cy="33" rx="2.4" ry="3.7" fill="#ffbf65" />
        <ellipse cx="73" cy="25" rx="2.3" ry="3.4" fill="#ea7061" />
      </svg>
      <div className={styles.hanger}><div className={styles.drop}><div className={styles.idle}><div className={styles.figure} data-snow-fighter={chief} data-snow-role="target">
        {anim ? <AnimRig anim={anim} onMask={loadMask} hit={Boolean(shot)} /> : kit ? <KitRig officer={officer} onMask={loadMask} /> : <>
          {/* A still copy of the painted hips under the swinging legs: a big kick can't open a gap at the hip. */}
          <span className={styles.hips}><Limb src={officer.folder + "hanging.webp"} /></span>
          <span className={styles.legLeft}><Limb src={officer.folder + "hanging.webp"} /><HitMap /></span>
          <span className={styles.legRight}><Limb src={officer.folder + "hanging.webp"} /><HitMap /></span>
          {chief === "kenny" && <span className={styles.coal}><Limb src={officer.folder + "hanging.webp"} /><HitMap /></span>}
          <div className={styles.torso}>
            <Image src={officer.folder + "hanging.webp"} alt="" width={477} height={716} unoptimized
              loading="eager" onLoad={event => loadMask(event.currentTarget)} />
            <Image src={officer.folder + "hanging-startled.webp"} alt="" width={477} height={716} className={styles.alarmed} unoptimized loading="eager" />
            <HitMap />
          </div>
        </>}
        <button type="button" ref={target} className={styles.aim} aria-label={`Throw a snowball at ${officer.name}`}
          aria-disabled={Boolean(shot)} onClick={() => {
            const box = target.current?.getBoundingClientRect();
            if (box) throwSnowball(box.left + box.width / 2, box.top + box.height / 2);
          }} />
      </div></div></div></div>
    </div>
    {shot && <div className={styles.volley} data-roof-snowball={chief} aria-hidden="true" style={{
      left: shot.x, top: shot.y,
      "--launch-x": `${window.innerWidth / 2 - shot.x}px`,
      "--launch-y": `${Math.max(120, window.innerHeight * .87 - shot.y)}px`,
    } as CSSProperties}>
      <span className={styles.snowball} /><span className={styles.powder}>
        {Array.from({ length: 8 }, (_, i) => <i key={i} style={{ "--flake-angle": `${i * 45}deg` } as CSSProperties} />)}
      </span>
    </div>}
    <span role="status" className={styles.announcement}>{shot ? `Snowball hit! ${officer.name} is falling from the lights.` : ""}</span>
  </>, body,
  );
}

// One person per swag of lights, left to right.
const lineup: Chief[] = ["kenny", "kalista", "braeden", "dylan", "gabby", "jen"];

export default function WinterRoofline({ menuOpen = false, standalone = false }: { menuOpen?: boolean; standalone?: boolean }) {
  const roof = useRef<HTMLDivElement>(null);
  const pin0 = useRef<HTMLSpanElement>(null), pin1 = useRef<HTMLSpanElement>(null), pin2 = useRef<HTMLSpanElement>(null);
  const pin3 = useRef<HTMLSpanElement>(null), pin4 = useRef<HTMLSpanElement>(null), pin5 = useRef<HTMLSpanElement>(null);
  const pins = [pin0, pin1, pin2, pin3, pin4, pin5];

  useEffect(() => {
    const garland = roof.current;
    const header = garland?.closest("header");
    if (!garland || !header) return;

    let warm: HTMLElement | undefined;
    function illuminate(x: number) {
      const next = Array.from(garland!.children).find((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && x >= box.left && x <= box.right;
      }) as HTMLElement | undefined;
      if (warm === next) return;
      warm?.removeAttribute("data-warm");
      next?.setAttribute("data-warm", "");
      warm = next;
    }

    const onPointer = (event: PointerEvent) => illuminate(event.clientX);
    const onFocus = (event: FocusEvent) => {
      if (!(event.target instanceof HTMLElement)) return;
      const box = event.target.getBoundingClientRect();
      illuminate(box.left + box.width / 2);
    };
    const clear = () => { warm?.removeAttribute("data-warm"); warm = undefined; };

    header.addEventListener("pointermove", onPointer, { passive: true });
    header.addEventListener("pointerleave", clear);
    header.addEventListener("focusin", onFocus);
    header.addEventListener("focusout", clear);

    return () => {
      header.removeEventListener("pointermove", onPointer);
      header.removeEventListener("pointerleave", clear);
      header.removeEventListener("focusin", onFocus);
      header.removeEventListener("focusout", clear);
    };
  }, []);

  return (
    <div ref={roof} className={styles.roof} data-winter-roof="" data-standalone={standalone || undefined} aria-hidden="true">
      {[...swags.slice(0, 3), 15, ...swags.slice(3)].map((sag, slot) => {
        // Slot 3 is the gap over the music video: the lights run across it, nobody hangs there.
        const gap = slot === 3;
        const span = slot > 3 ? slot - 1 : slot;
        return (
        <div key={gap ? "gap" : span} className={gap ? `${styles.swag} ${styles.videoGap}` : styles.swag} style={{ "--sag": sag + "px" } as CSSProperties}>
          <span className={styles.wire} />
          {sockets.map((position, socket) => {
            const index = (gap ? 6 : span) * sockets.length + socket;
            const cableY = sag * Math.sqrt(1 - (2 * position - 1) ** 2);
            return (
              <span key={socket} className={styles.lamp} style={{
                left: position * 100 + "%",
                top: cableY - 2 + "px",
                "--bulb": bulbs[index % bulbs.length],
                "--angle": (position - 0.5) * -29 + (index % 3 - 1) * 4 + "deg",
                "--period": 2.8 + (index * 7 % 13) * 0.27 + "s",
                "--delay": -((index * 37 % 31) * 0.37) + "s",
              } as CSSProperties}>
                <span className={styles.bloom} />
                <span className={styles.socket} />
                <span className={styles.glass} />
              </span>
            );
          })}
          {!gap && <span ref={pins[span]} className={styles.anchor} />}
        </div>
        );
      })}
      {lineup.map((chief, span) => <HangingCrew key={chief} chief={chief} anchor={pins[span]} menuOpen={menuOpen} />)}
    </div>
  );
}
