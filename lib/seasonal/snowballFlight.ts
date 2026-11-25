"use client";

// Snowball physics shared by every holiday snowball game: a real projectile path (steady sideways
// speed, a gravity arc), a spinning ball with a short motion trail, a thrower's wind-up and a
// target's flinch, and splats that burst in the air, puff on the ground or smack the viewer's
// screen. Everything lives in one fixed, click-through layer above the page.

export type Point = { x: number; y: number };
export type Splat = "powder" | "glass" | "ground" | "none";
export type ThrowOptions = {
  from: Point;
  to: Point;
  /** Ball diameter at release, CSS px. Defaults to ~1.25% of the screen width. */
  size?: number;
  /**
   * Diameter (CSS px) of the snowball the thrower was holding: the flight starts at exactly that size,
   * so the ball that leaves a hand is the one that was in it (no jump). Coming at the viewer it then
   * swells to at least its usual size at the glass.
   */
  fromSize?: number;
  /** Apex height above the straight line between the points. Defaults from the distance. */
  arc?: number;
  /** Sideways travel speed in px/s (real snowballs: a brisk, slightly lobbed toss). */
  speed?: number;
  /** "viewer": the ball comes at the screen and grows; "away": it flies into the scene. */
  toward?: "away" | "viewer";
  splat?: Splat;
  onImpact?: (at: Point) => void;
};

let sky: HTMLDivElement | null = null;

function layer() {
  if (sky?.isConnected) return sky;
  sky = document.createElement("div");
  sky.setAttribute("aria-hidden", "true");
  sky.dataset.snowballSky = "";
  Object.assign(sky.style, {
    position: "fixed", inset: "0", zIndex: "44", pointerEvents: "none", overflow: "hidden", contain: "strict",
  });
  document.body.appendChild(sky);
  return sky;
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const rand = (min: number, max: number) => min + Math.random() * (max - min);

function ball(size: number, opacity = 1) {
  const el = document.createElement("i");
  Object.assign(el.style, {
    position: "absolute", left: "0", top: "0", width: size + "px", height: size + "px", borderRadius: "50%",
    opacity: String(opacity), willChange: "transform",
    // The off-centre highlight makes the spin readable.
    background: "radial-gradient(circle at 33% 28%, #ffffff 0 20%, #f1f9ff 42%, #cfe3f4 72%, #9dbcd9 100%)",
    boxShadow: "inset -1.5px -2.5px 3px rgba(84, 116, 158, .38), 0 1.5px 2.5px rgba(18, 36, 64, .28)",
  });
  return el;
}

/** Launch a snowball along a realistic arc. Resolves after it lands. */
export function throwSnowball(options: ThrowOptions): Promise<void> {
  const { from, to, toward = "away", splat = "powder", onImpact } = options;
  if (typeof document === "undefined") return Promise.resolve();
  const vw = window.innerWidth;
  const size = options.size ?? Math.min(26, Math.max(10, vw * .0125));
  const dx = to.x - from.x, dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (reducedMotion()) {
    onImpact?.(to);
    if (splat !== "none") burst(to, splat, size);
    return Promise.resolve();
  }
  const viewer = toward === "viewer";
  const duration = viewer ? rand(520, 640) : Math.min(1050, Math.max(340, (dist / (options.speed ?? 1150)) * 1000));
  const arc = options.arc ?? (viewer ? Math.min(90, dist * .12) : Math.min(260, Math.max(26, dist * .27)));
  const spin = rand(420, 760) * (dx < 0 ? -1 : 1);
  const steps = 20;
  const frames: Keyframe[] = [];
  // Start scale: the held ball's size when known (viewer throws otherwise start small and far).
  const s0 = options.fromSize ? options.fromSize / size : viewer ? .38 : 1;
  const s1 = Math.max(3.28, s0 * 2.2);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Projectile motion: x moves at constant speed, y follows a gravity parabola.
    const x = from.x + dx * t;
    const y = from.y + dy * t - 4 * arc * t * (1 - t);
    // Coming at the screen it swells (perspective); into the scene it shrinks slightly with distance.
    const s = viewer ? s0 + (s1 - s0) * t * t : s0 * (1 - .22 * t + .06 * Math.sin(Math.PI * t));
    frames.push({ transform: `translate(${x - size / 2}px, ${y - size / 2}px) rotate(${spin * t}deg) scale(${s})`, offset: t });
  }
  const host = layer();
  const pieces = [ball(size), ball(size * .86, .32), ball(size * .7, .16)];
  pieces.forEach(p => host.appendChild(p));
  const flights = pieces.map((p, i) => p.animate(frames, { duration, delay: i * 26, easing: "linear", fill: "backwards" }));
  return flights[0].finished.then(() => {
    pieces.forEach(p => p.remove());
    onImpact?.(to);
    if (splat !== "none") burst(to, splat, size * (viewer ? 3.2 : 1));
  }).catch(() => { pieces.forEach(p => p.remove()); });
}

/** A snow burst at a point: powder in the air, a low puff on the ground, or a splat on the glass. */
export function burst(at: Point, kind: Exclude<Splat, "none">, size = 18) {
  const host = layer();
  if (kind === "glass") return glassSplat(at, size);
  const still = reducedMotion();
  // A quick, compact puff: it reads as a hit and is gone in about a fifth of a second.
  const puff = document.createElement("i");
  const puffSize = size * (kind === "ground" ? 1.6 : 1.35);
  Object.assign(puff.style, {
    position: "absolute", left: at.x - puffSize / 2 + "px", top: at.y - puffSize / 2 + "px",
    width: puffSize + "px", height: puffSize * (kind === "ground" ? .55 : 1) + "px", borderRadius: "50%",
    background: "radial-gradient(circle, #ffffffdd 0 30%, #e6f3ff88 50%, transparent 70%)",
  });
  host.appendChild(puff);
  puff.animate([{ transform: "scale(.4)", opacity: .95 }, { transform: "scale(1.15)", opacity: 0 }],
    { duration: still ? 160 : 210, easing: "ease-out" }).finished.then(() => puff.remove(), () => puff.remove());
  if (still) return;
  const count = kind === "ground" ? 5 : 6;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("i");
    const r = rand(1.8, 3.6) * Math.max(.8, size / 18);
    Object.assign(p.style, {
      position: "absolute", left: at.x - r / 2 + "px", top: at.y - r / 2 + "px", width: r + "px", height: r + "px",
      borderRadius: "50%", background: i % 3 ? "#ffffff" : "#d9ecfb",
    });
    host.appendChild(p);
    // Chunks flick outward and drop.
    const angle = kind === "ground" ? rand(-Math.PI * .95, -Math.PI * .05) : rand(0, Math.PI * 2);
    const v = rand(22, 60) * Math.max(.8, size / 18);
    const frames: Keyframe[] = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      const x = Math.cos(angle) * v * t;
      const y = Math.sin(angle) * v * t + 70 * t * t;
      frames.push({ transform: `translate(${x}px, ${y}px)`, opacity: 1 - t * t, offset: t });
    }
    p.animate(frames, { duration: rand(200, 300), easing: "linear" }).finished.then(() => p.remove(), () => p.remove());
  }
}

function glassSplat(at: Point, size: number) {
  const host = layer();
  // Kept small and brief so it never blocks the page: a smack on the glass, then it slides away.
  const d = Math.min(110, Math.max(54, size * .9));
  const el = document.createElement("div");
  const rot = rand(0, 360);
  // A lumpy splat with a bright core, as if the snowball hit the screen.
  const lumps = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2 + rand(-.2, .2);
    const r = rand(.3, .42);
    return `radial-gradient(circle at ${50 + Math.cos(a) * r * 100}% ${50 + Math.sin(a) * r * 100}%, #fbfdff 0 ${rand(9, 14)}%, transparent ${rand(15, 19)}%)`;
  }).join(",");
  Object.assign(el.style, {
    position: "absolute", left: at.x - d / 2 + "px", top: at.y - d / 2 + "px", width: d + "px", height: d + "px",
    background: `radial-gradient(circle at 50% 50%, #ffffff 0 24%, #eef7ff 34%, transparent 46%),${lumps}`,
    filter: "drop-shadow(0 2px 3px rgba(40, 70, 110, .35))", rotate: rot + "deg",
  });
  host.appendChild(el);
  const still = reducedMotion();
  el.animate(still
    ? [{ opacity: 0 }, { opacity: .9, offset: .15 }, { opacity: .9, offset: .5 }, { opacity: 0 }]
    : [
      { transform: "scale(.6)", opacity: 0 },
      { transform: "scale(1.06)", opacity: .92, offset: .1 },
      { transform: "scale(1) translateY(0)", opacity: .9, offset: .22 },
      { transform: "scale(.96) translateY(10px)", opacity: .55, offset: .62 },
      { transform: "scale(.9) translateY(22px)", opacity: 0 },
    ], { duration: still ? 420 : 620, easing: "ease-in" }).finished.then(() => el.remove(), () => el.remove());
}

/** A snowball in a thrower's hand: where it is on screen and how big (CSS px diameter). */
export type Held = { at: Point; size: number };
export type WindUpOptions = {
  /**
   * Show the snowball in the thrower's hand (for art that isn't painted holding one): it is packed
   * in the hand (the element's data-snow-hand), carried up and back over the shoulder as they lean
   * back (or wherever data-snow-windup says the raised hand is), held up there a beat, then whipped
   * forward to where it leaves the hand. This wind-up runs longer so the raised snowball reads.
   */
  hold?: boolean;
};
export type WindUp = {
  /** Resolves at the moment the ball leaves the hand. */
  release: Promise<void>;
  done: Promise<void>;
  /** The held snowball as it leaves the hand (start the flight there, at that size); null when nothing was held or the thrower vanished. */
  held: () => Held | null;
  /** Called off mid-wind-up (a Time Out): the snowball drops out of the hand and is gone. */
  drop: () => void;
};

/** "x,y" fractions of a box, as the data-snow-* attributes write them. */
function fractions(value: string | undefined, fallback: readonly [number, number]): readonly [number, number] {
  const [x, y] = (value ?? "").split(",").map(Number);
  return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : fallback;
}

/** A throwing motion: lean back, snap forward, settle. Resolves `release` at the moment the ball leaves the hand. */
export function windUp(el: HTMLElement, facing: 1 | -1 = 1, scale = 1, options: WindUpOptions = {}): WindUp {
  const empty = { held: () => null, drop: () => {} };
  if (reducedMotion()) return { release: Promise.resolve(), done: Promise.resolve(), ...empty };
  if (options.hold) return windUpHolding(el, facing, scale);
  // (The rink recognises this lean on a skater the fight picks by its second keyframe at .42.)
  const lean = 8 * scale, snap = 11 * scale;
  const anim = el.animate([
    { rotate: "0deg", translate: "0 0" },
    { rotate: `${-lean * facing}deg`, translate: `${-3 * facing * scale}px 1px`, offset: .42 },
    { rotate: `${snap * facing}deg`, translate: `${5 * facing * scale}px -2px`, offset: .66 },
    { rotate: `${-2 * facing}deg`, translate: "0 0", offset: .84 },
    { rotate: "0deg", translate: "0 0" },
  ], { duration: 600, easing: "ease-in-out" });
  const release = new Promise<void>(resolve => window.setTimeout(resolve, 600 * .64));
  return { release, done: anim.finished.then(() => undefined, () => undefined), ...empty };
}

// The held wind-up's beats, as shares of HOLD_MS: pack the snowball in the hand, carry it up and back
// over the shoulder (leaning back), hold it up there with a little pump, whip it forward, let go.
const HOLD_MS = 1250;
const PACKED = .11, COCKED = .42, PUMPED = .64, LET_GO = .7;

function windUpHolding(el: HTMLElement, facing: 1 | -1, scale: number): WindUp {
  const rect = el.getBoundingClientRect();
  const w = el.offsetWidth || rect.width, h = el.offsetHeight || rect.height;
  if (!w || !h) return windUp(el, facing, scale);
  const lean = 8 * scale, snap = 11 * scale, f = facing;
  // The same lean as a quick wind-up (second keyframe at .42), holding back a beat before the snap.
  const anim = el.animate([
    { rotate: "0deg", translate: "0 0", easing: "ease-in-out" },
    { rotate: `${-lean * f}deg`, translate: `${-3 * f * scale}px 1px`, offset: COCKED, easing: "ease-in-out" },
    { rotate: `${-(lean + 1.5) * f}deg`, translate: `${-3.6 * f * scale}px 1.5px`, offset: .62, easing: "ease-in" },
    { rotate: `${snap * f}deg`, translate: `${5 * f * scale}px -2px`, offset: .72, easing: "ease-out" },
    { rotate: `${-2 * f}deg`, translate: "0 0", offset: .86, easing: "ease-in-out" },
    { rotate: "0deg", translate: "0 0" },
  ], { duration: HOLD_MS, easing: "linear" });
  const done = anim.finished.then(() => undefined, () => undefined);

  // The path in the element's own box (CSS px, before the lean): hand, raised hand, release point.
  const [hx, hy] = fractions(el.dataset.snowHand, [.6, .3]);
  const hand = { x: hx * w, y: hy * h };
  // An arm's reach for this figure; the snowball is about a fist across.
  const arm = Math.min(64, Math.max(7, h * .26));
  const size = Math.min(Math.min(26, Math.max(10, window.innerWidth * .0125)), Math.max(7, h * .09));
  // Raised: up beside the head on the throwing hand's side (never across the face), and further
  // out when that side is also away from the target (back, then forward).
  const side = hand.x >= w / 2 ? 1 : -1;
  const out = Math.max(Math.abs(hand.x - w / 2) + arm * (side === -f ? .55 : .2), arm * .5);
  const raised = el.dataset.snowWindup
    ? (([x, y]) => ({ x: x * w, y: y * h }))(fractions(el.dataset.snowWindup, [hx, hy]))
    : { x: Math.min(w * 1.12, Math.max(-w * .12, w / 2 + side * out)), y: Math.max(-h * .1, hand.y - arm * .85) };
  // A raised hand that is already up (data-snow-windup at the hand) just pumps; otherwise the ball
  // swings out first, then up (a quadratic curve through `swing`).
  const travel = Math.hypot(raised.x - hand.x, raised.y - hand.y);
  const swing = { x: raised.x + side * travel * .2, y: hand.y - (hand.y - raised.y) * .2 };
  const letGo = { x: raised.x + f * Math.max(arm * .95, travel * .9), y: raised.y + arm * .3 };
  const ease = (t: number) => t < .5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
  /** Where the ball is (element px), its scale and opacity, at share `t` of the wind-up. */
  function pathAt(t: number) {
    if (t < PACKED) {
      const k = t / PACKED;
      return { x: hand.x, y: hand.y, s: k < .7 ? .35 + .8 * (k / .7) : 1.15 - .15 * ((k - .7) / .3), o: Math.min(1, k * 2.5) };
    }
    if (t < COCKED) {
      const k = ease((t - PACKED) / (COCKED - PACKED)), u = 1 - k;
      return { x: u * u * hand.x + 2 * u * k * swing.x + k * k * raised.x, y: u * u * hand.y + 2 * u * k * swing.y + k * k * raised.y, s: 1, o: 1 };
    }
    if (t < PUMPED) {
      // A pump: the hand dips back a little and comes up again.
      const k = Math.sin(Math.PI * (t - COCKED) / (PUMPED - COCKED));
      return { x: raised.x - f * arm * .06 * k, y: raised.y + arm * .1 * k, s: 1, o: 1 };
    }
    const k = Math.min(1, (t - PUMPED) / (LET_GO - PUMPED)), e = k * k;
    return { x: raised.x + (letGo.x - raised.x) * e, y: raised.y + (letGo.y - raised.y) * e, s: 1, o: 1 };
  }
  /** That point on screen, through the element's lean, wherever it has moved or scrolled to. */
  function onScreen(p: { x: number; y: number }): Point | null {
    if (!el.isConnected) return null;
    const box = el.getBoundingClientRect();
    if (!box.width && !box.height) return null;
    const a = (parseFloat(getComputedStyle(el).rotate) || 0) * Math.PI / 180;
    const dx = p.x - w / 2, dy = p.y - h / 2;
    return { x: box.left + box.width / 2 + dx * Math.cos(a) - dy * Math.sin(a), y: box.top + box.height / 2 + dx * Math.sin(a) + dy * Math.cos(a) };
  }

  const piece = ball(size, 0);
  // A fine dark rim keeps a small snowball readable against snow.
  piece.style.boxShadow += ", 0 0 0 1px rgba(40, 56, 74, .5)";
  layer().appendChild(piece);
  const start = performance.now();
  let frame = 0, last: Held | null = null, state: "held" | "thrown" | "dropped" = "held";
  const draw = (t: number) => {
    const p = pathAt(t), at = onScreen(p);
    if (!at) { last = null; piece.style.opacity = "0"; return; }
    piece.style.transform = `translate(${at.x - size / 2}px, ${at.y - size / 2}px) scale(${p.s})`;
    piece.style.opacity = String(p.o);
    last = { at, size: size * p.s };
  };
  const tick = () => {
    frame = 0;
    if (state !== "held") return;
    draw(Math.min(LET_GO, (performance.now() - start) / HOLD_MS));
    frame = requestAnimationFrame(tick);
  };
  draw(0);
  frame = requestAnimationFrame(tick);
  packFlecks(hand, onScreen, size);
  const release = new Promise<void>(resolve => window.setTimeout(() => {
    if (state === "held") {
      cancelAnimationFrame(frame);
      draw(LET_GO);
      state = "thrown";
      // The flight takes over from here at this size, in the same frame.
      piece.remove();
    }
    resolve();
  }, HOLD_MS * LET_GO));
  return {
    release, done,
    held: () => state === "dropped" ? null : last,
    drop() {
      if (state !== "held") return;
      state = "dropped";
      cancelAnimationFrame(frame);
      piece.animate([{ translate: "0 0", opacity: piece.style.opacity || "1" }, { translate: `${-f * 4}px ${Math.max(14, size * 1.4)}px`, opacity: 0 }],
        { duration: 240, easing: "ease-in" }).finished.then(() => piece.remove(), () => piece.remove());
    },
  };
}

/** A few crumbs of snow fall from the hand as the snowball is packed. */
function packFlecks(hand: { x: number; y: number }, onScreen: (p: { x: number; y: number }) => Point | null, size: number) {
  const at = onScreen(hand);
  if (!at) return;
  const host = layer();
  for (let i = 0; i < 3; i++) {
    const r = Math.max(2, size * rand(.16, .24));
    const fleck = document.createElement("i");
    Object.assign(fleck.style, {
      position: "absolute", left: at.x - r / 2 + "px", top: at.y - r / 2 + "px", width: r + "px", height: r + "px",
      borderRadius: "50%", background: "#fbfdff", boxShadow: "0 0 0 .5px rgba(60, 80, 104, .45)",
    });
    host.appendChild(fleck);
    const dx = (i - 1) * size * .45 + rand(-2, 2), fall = size * rand(1.1, 1.8);
    fleck.animate([
      { transform: "translate(0, 0)", opacity: 1 },
      { transform: `translate(${dx}px, ${fall}px)`, opacity: 0 },
    ], { duration: rand(260, 380), delay: i * 40, easing: "cubic-bezier(.3,0,.8,.6)", fill: "backwards" })
      .finished.then(() => fleck.remove(), () => fleck.remove());
  }
}

/** Knocked back by a hit coming from `from`: a jolt away from the impact, a wobble, then still. */
export function flinch(el: HTMLElement, from: Point) {
  if (reducedMotion()) return;
  const box = el.getBoundingClientRect();
  const away = (box.left + box.width / 2) >= from.x ? 1 : -1;
  el.animate([
    { rotate: "0deg", translate: "0 0" },
    { rotate: `${9 * away}deg`, translate: `${6 * away}px -2px`, offset: .2 },
    { rotate: `${-5 * away}deg`, translate: `${-2 * away}px 0`, offset: .48 },
    { rotate: `${2 * away}deg`, translate: "0 0", offset: .74 },
    { rotate: "0deg", translate: "0 0" },
  ], { duration: 650, easing: "ease-out" });
}

// The visitor's own hand: a red knit mitten that flicks up from the bottom edge of the screen, so
// every snowball visibly leaves someone's hand.
const MITTEN = `<svg viewBox="0 0 64 88" width="100%" height="100%" aria-hidden="true" focusable="false">
<path d="M13 56 Q6 30 15 14 Q24 1 37 4 Q51 8 51 26 L52 56 Z" fill="#c8202b" stroke="#561016" stroke-width="2.2" stroke-linejoin="round"/>
<path d="M49 36 Q61 31 62 43 Q62 55 51 58 Z" fill="#b41b25" stroke="#561016" stroke-width="2.2" stroke-linejoin="round"/>
<path d="M18 20 Q25 13 33 15 M16 31 Q27 25 40 28 M15 43 Q28 37 46 40" fill="none" stroke="#e44a52" stroke-width="2" stroke-linecap="round" opacity=".7"/>
<path d="M22 33 l2.6 2.6 l2.6 -2.6 l-2.6 -2.6 z M34 22 l2.2 2.2 l2.2 -2.2 l-2.2 -2.2 z" fill="#fbe9e9"/>
<rect x="9" y="55" width="47" height="19" rx="6" fill="#fbf7ee" stroke="#8a7d6a" stroke-width="1.8"/>
<path d="M14 59 v11 M20 59 v11 M26 59 v11 M32 59 v11 M38 59 v11 M44 59 v11 M50 59 v11" stroke="#e2d9c8" stroke-width="2"/>
</svg>`;
let mitt: HTMLDivElement | null = null;
/** When the mitten lets go of the ball, after the throw starts (seconds). */
export const MITTEN_RELEASE = .14;

function mittenWidth() { return Math.min(92, Math.max(46, window.innerWidth * .058)); }

/** Where the visitor's ball leaves the mitten for a throw at `to`. */
export function visitorStart(to: Point): Point {
  const vw = window.innerWidth, vh = window.innerHeight, w = mittenWidth();
  return { x: vw / 2 + (to.x - vw / 2) * .3, y: vh - w * 1.05 };
}

/** Seconds a thrown ball takes between two points (matches throwSnowball). */
export function flightTime(from: Point, to: Point, speed = 1150) {
  return Math.min(1050, Math.max(340, (Math.hypot(to.x - from.x, to.y - from.y) / speed) * 1000)) / 1000;
}

function showMitten(start: Point, to: Point) {
  const host = layer();
  const w = mittenWidth(), h = w * 88 / 64;
  if (!mitt?.isConnected) {
    mitt = document.createElement("div");
    mitt.innerHTML = MITTEN;
    Object.assign(mitt.style, {
      position: "absolute", left: "0", top: "0", transformOrigin: "50% 92%", willChange: "transform", opacity: "0",
      filter: "drop-shadow(0 4px 6px rgba(10, 20, 40, .35))",
    });
    host.appendChild(mitt);
  }
  mitt.style.width = w + "px";
  mitt.style.height = h + "px";
  const tilt = Math.max(-40, Math.min(40, Math.atan2(to.x - start.x, start.y - to.y) * 180 / Math.PI));
  const x = start.x - w / 2, y = window.innerHeight - h * .84;
  mitt.getAnimations().forEach(a => a.cancel());
  // Rise, cock back, snap forward (the ball leaves at ~MITTEN_RELEASE), drop away.
  mitt.animate([
    { transform: `translate(${x}px, ${y + h * .55}px) rotate(${tilt - 14}deg)`, opacity: 0 },
    { transform: `translate(${x}px, ${y + h * .12}px) rotate(${tilt - 26}deg)`, opacity: 1, offset: .25 },
    { transform: `translate(${x}px, ${y - h * .05}px) rotate(${tilt + 16}deg)`, opacity: 1, offset: .42 },
    { transform: `translate(${x}px, ${y + h * .02}px) rotate(${tilt + 9}deg)`, opacity: 1, offset: .62 },
    { transform: `translate(${x}px, ${y + h * .62}px) rotate(${tilt + 4}deg)`, opacity: 0 },
  ], { duration: 340, easing: "ease-out", fill: "forwards" });
}

/** The visitor's own throw: from the mitten at the bottom of the screen up to a point in the scene. */
export function visitorThrow(to: Point, options: Omit<ThrowOptions, "from" | "to"> = {}) {
  const start = visitorStart(to);
  const size = Math.min(30, Math.max(14, window.innerWidth * .018));
  if (reducedMotion()) return throwSnowball({ from: start, to, toward: "away", size, ...options });
  showMitten(start, to);
  return new Promise<void>(resolve => window.setTimeout(resolve, MITTEN_RELEASE * 1000))
    .then(() => throwSnowball({ from: start, to, toward: "away", size, ...options }));
}
