"use client";

import Image from "next/image";
import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { isTesla, tapSlop } from "@/lib/device/profile";
import { claimPerson } from "@/lib/seasonal/cast";
import { flightTime, MITTEN_RELEASE, throwSnowball, visitorStart, visitorThrow, windUp, type Point } from "@/lib/seasonal/snowballFlight";
import { isSnowballTimeout, useSnowballTimeout } from "@/lib/seasonal/snowballTimeout";
import styles from "./WinterStreet.module.css";
import WinterRinkRescue, { rinkDepthZ, rinkKnockdownEvent, rinkRescueEvent, type RinkKnockdown, type RinkRescueState } from "./WinterRinkRescue";
import { snowHit } from "./WinterSnowballFight";
import EmergencyLights from "./EmergencyLights";

type StreetProps = { active: boolean };

const CocoaContext = createContext<{
  pour: () => void;
  serving: number;
  stallButton: RefObject<HTMLButtonElement | null>;
} | null>(null);

export function WinterCocoaProvider({ children }: { children: ReactNode }) {
  const stallButton = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const pours = useRef(0);
  const [serving, setServing] = useState(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function pour() {
    const stand = stallButton.current;
    if (!stand) return;
    const viewport = stand.closest("#winter-village-picture");
    if (viewport instanceof HTMLElement) {
      const screen = viewport.getBoundingClientRect();
      const booth = stand.getBoundingClientRect();
      if (booth.left < screen.left || booth.right > screen.right) {
        const prefersStill = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        viewport.scrollBy({ left: booth.left - screen.left - screen.width * .15, behavior: prefersStill ? "instant" : "smooth" });
      }
    }
    window.clearTimeout(timer.current);
    setServing(++pours.current);
    timer.current = window.setTimeout(() => setServing(0), 4200);
  }

  return (
    <CocoaContext.Provider value={{ pour, serving, stallButton }}>
      {children}
      <span className={styles.announcement} role="status">
        {serving ? <span key={serving}>Enjoy your hot cocoa!</span> : null}
      </span>
    </CocoaContext.Provider>
  );
}

function CocoaStall() {
  const cocoa = useContext(CocoaContext);
  return (
    <div className={styles.stall} data-serving={Boolean(cocoa?.serving)}>
      <Image src="/images/winter/street/cocoa-stall.webp" alt=""
        width={398} height={500} sizes="(max-width: 720px) 100px, 13vw" unoptimized />
      <span className={styles.steam} aria-hidden="true"><i /><i /></span>
      {/* An easter egg, unmarked: click the mug she's holding out and it's yours. */}
      <button type="button" ref={cocoa?.stallButton} className={styles.mugButton} disabled={!cocoa}
        aria-label="Take the mug of hot cocoa from the village stand" onClick={cocoa?.pour} />
      {cocoa?.serving ? (
        <div key={cocoa.serving} className={styles.delivery} aria-hidden="true">
          <span className={styles.cup}><i /></span>
          <span className={styles.speech}>Enjoy your hot cocoa!</span>
        </div>
      ) : null}
    </div>
  );
}

export default function WinterStreet({ active }: StreetProps) {
  return (
    <div className={styles.street} data-active={active}>
      <StreetCarolers />
      <OldNumberFive />
    </div>
  );
}

// Three carolers sing outside the corner store: the woman with her hymnal, the grandfather with the
// lantern (standing a step behind) and the boy. Each sways on their own beat and joins the snowball fight.
const carolers = [
  { id: "lantern", src: "/images/winter/street/caroler-lantern.webp", width: 163, height: 420, hand: "0.16,0.55",
    alt: "A white-bearded caroler in a camel overcoat holds a glowing lantern." },
  { id: "woman", src: "/images/winter/street/caroler-woman.webp", width: 150, height: 410, hand: "0.38,0.34",
    alt: "A caroler in a burgundy coat sings from an open hymnal." },
  { id: "boy", src: "/images/winter/street/caroler-boy.webp", width: 122, height: 380, hand: "0.1,0.57",
    alt: "A boy in a green coat and striped scarf sings along." },
] as const;

function StreetCarolers() {
  return (
    <div className={styles.carolers} role="group" aria-label="Carolers singing outside the corner store">
      {carolers.map(singer => (
        <div key={singer.id} className={styles.singer} data-singer={singer.id} data-snow-target=""
          data-snow-fighter={`caroler-${singer.id}`} data-snow-hand={singer.hand}>
          <div className={styles.voice}>
            <Image src={singer.src} alt={singer.alt} width={singer.width} height={singer.height}
              sizes="(max-width: 720px) 30px, 3vw" unoptimized draggable={false} />
            {singer.id === "lantern" && <i className={styles.lantern} aria-hidden="true" />}
          </div>
        </div>
      ))}
    </div>
  );
}

// Old No. 5's roof beacon runs red and blue when clicked.
function OldNumberFive() {
  const [lit, setLit] = useState(false);
  return (
    <button type="button" className={styles.fireEngine} data-lit={lit} aria-pressed={lit}
      aria-label="Emergency light on Millstadt’s Old No. 5 parade fire engine, decorated with garland and Christmas lights"
      onClick={() => setLit(on => !on)}>
      <Image src="/images/winter/street/fire-engine.webp" alt=""
        width={720} height={362} sizes="(max-width: 720px) 165px, 22vw" unoptimized />
      <span className={styles.lamps} aria-hidden="true"><i /><i /><i /><i /></span>
      <EmergencyLights unit="fire-engine" on={lit} />
    </button>
  );
}

/* ---------------------------------------------------------------------------------------------
   The Christmas rink. Painted skaters glide laps on their own lines: stride pushes, a lean into
   the turns, a quick turn-around at the ends, a shadow and a reflection on the ice. The speed
   skater hops cracks, the skater in red spins and the green-jacket skater stops to throw snowballs
   (flip-book swaps between his skating and throwing poses). Visitors tap any skater to throw:
   three hits in a couple of seconds knock them flat and the Millstadt medics haul them off. Dylan
   skates out for a triple axel every half minute or so, and every few minutes a Red Wings player and a Blues player burst in and collide.
   Positions are fractions of the rink: x across, f (floor) up from the bottom edge, which is depth.
   --------------------------------------------------------------------------------------------- */

type SkaterId = "speed" | "girl" | "green" | "redwings" | "blues" | "dylan";
type Box = readonly [number, number, number, number];
type SkaterArt = {
  id: SkaterId;
  name: string;
  alt: string;
  /** Shared canvas of every frame, px. Frames are centred on the skater's body axis. */
  width: number;
  height: number;
  /** Canvas height on the ice at the front edge, percent of the rink's height. */
  tall: number;
  /** 0: the skating pose, 1: the alternate (throwing pose, or a second glide pose). */
  frames: readonly { src: string; body: Box }[];
  chest: readonly [number, number];
  /** The skating pose turned (about 90 degrees, more for skaters leaning hard into a stride) until
      the body lies flat, head to the left; offsets are from the canvas centre in canvas heights. */
  down: { src: string; angle: number; width: number; height: number; ox: number; oy: number; rest: number };
  /** The posed fall: the skater lying on their side, propped on an elbow (painted, head to the left,
      resting on its bottom edge). They settle into it once they're down, and ride the cot in it. */
  lie: { src: string; width: number; height: number };
};

const rinkArt = "/images/winter/rink/";
const skaterArt: readonly SkaterArt[] = [
  { id: "speed", name: "the speed skater", alt: "A speed skater in a red and navy puffer jacket races around the rink.",
    width: 382, height: 383, tall: 62, frames: [{ src: rinkArt + "speed.webp", body: [.14, .008, .69, .987] }], chest: [.61, .324],
    down: { src: rinkArt + "speed-down.webp", angle: -114, width: 410, height: 297, ox: -.0274, oy: -.0078, rest: .86 },
    lie: { src: rinkArt + "speed-lie.webp", width: 400, height: 154 } },
  { id: "girl", name: "the skater in the red coat", alt: "A skater in a red coat and white knit hat glides with her arms out.",
    width: 358, height: 373, tall: 58, chest: [.456, .32],
    frames: [{ src: rinkArt + "girl-a.webp", body: [.14, .003, .55, .992] }, { src: rinkArt + "girl-b.webp", body: [.14, .051, .55, .941] }],
    down: { src: rinkArt + "girl-down.webp", angle: -101, width: 365, height: 269, ox: -.0013, oy: .0858, rest: .747 },
    lie: { src: rinkArt + "girl-lie.webp", width: 400, height: 152 } },
  { id: "green", name: "the skater in the green jacket", alt: "A skater in a green jacket and plaid scarf, never without a snowball.",
    width: 348, height: 373, tall: 60, chest: [.519, .349],
    frames: [{ src: rinkArt + "green-skate.webp", body: [.16, .046, .58, .949] }, { src: rinkArt + "green-throw.webp", body: [.141, .003, .701, .992] }],
    down: { src: rinkArt + "green-down.webp", angle: -107, width: 356, height: 232, ox: 0, oy: .0295, rest: .88 },
    lie: { src: rinkArt + "green-lie.webp", width: 398, height: 144 } },
  { id: "redwings", name: "the Red Wings player", alt: "A Detroit Red Wings hockey player rushes up the ice with the puck.",
    width: 450, height: 386, tall: 59, frames: [{ src: rinkArt + "redwings.webp", body: [.25, .003, .45, .992] }], chest: [.519, .32],
    down: { src: rinkArt + "redwings-down.webp", angle: -94, width: 397, height: 388, ox: .0065, oy: -.0959, rest: .845 },
    lie: { src: rinkArt + "redwings-lie.webp", width: 400, height: 129 } },
  { id: "blues", name: "the Blues player", alt: "A St. Louis Blues hockey player charges in to check him.",
    width: 446, height: 386, tall: 59, frames: [{ src: rinkArt + "blues.webp", body: [.22, .003, .45, .992] }], chest: [.477, .32],
    down: { src: rinkArt + "blues-down.webp", angle: -90, width: 384, height: 393, ox: 0, oy: -.0609, rest: .758 },
    lie: { src: rinkArt + "blues-lie.webp", width: 400, height: 129 } },
  { id: "dylan", name: "Dylan", alt: "Dylan from Millstadt EMS, in uniform and a Santa hat, skates out for a triple axel.",
    width: 236, height: 367, tall: 57, frames: [{ src: rinkArt + "dylan.webp", body: [.12, .003, .72, .989] }], chest: [.509, .319],
    down: { src: rinkArt + "dylan-down.webp", angle: -88, width: 364, height: 228, ox: -.0014, oy: .0204, rest: .82 },
    lie: { src: rinkArt + "dylan-lie.webp", width: 398, height: 148 } },
];
const snowballInHand = [.134, .107] as const; // the green-jacket skater's throwing pose
const puckAtBlade = [.965, .985] as const;   // in front of the Red Wings player's stick

type Loop = { cx: number; cf: number; ax: number; af: number; n: number; dir: 1 | -1 };
type Route = { loop?: Loop; cruise: number; accel: number; period: number; start?: number };
// Laps are rounded rectangles seen in perspective (n is the squareness); the public skate runs
// counter-clockwise. Speeds are rink heights a second. The hockey players have no laps: they only
// burst in for their rare collision.
const routes: Record<Exclude<SkaterId, "dylan">, Route> = {
  speed: { loop: { cx: .48, cf: .2, ax: .3, af: .15, n: 2.6, dir: 1 }, cruise: .95, accel: 2.3, period: .9, start: -1.9 },
  girl: { loop: { cx: .34, cf: .2, ax: .13, af: .075, n: 2.2, dir: 1 }, cruise: .48, accel: 1.3, period: 1.25, start: 1.9 },
  green: { loop: { cx: .63, cf: .13, ax: .13, af: .07, n: 2.4, dir: 1 }, cruise: .52, accel: 1.6, period: 1.1, start: -.6 },
  redwings: { cruise: 1.02, accel: 2.8, period: .74 },
  blues: { cruise: 1.02, accel: 2.8, period: .76 },
};
// Where the everyday skaters stand when motion is reduced.
const stillSpots: Partial<Record<SkaterId, readonly [number, number, 1 | -1]>> = {
  speed: [.68, .08, -1], girl: [.3, .2, 1], green: [.49, .1, 1], dylan: [.38, .14, 1],
};

type Mode = "loop" | "hold" | "brake" | "aim" | "throw" | "spin" | "rush" | "charge" | "fall" | "down" | "getup" | "rest" | "exit" | "gone" | "show";
type Sim = {
  id: SkaterId; art: SkaterArt; route?: Route;
  x: number; f: number; ux: number; uz: number;
  facing: 1 | -1; flipFrom: 1 | -1; turn: number;
  lean: number; ax: number; stride: number;
  wob: number; wobV: number; stun: number; bump: number; hop: number;
  mode: Mode; t0: number; until: number; next: Mode | null; spinTurns: number;
  holdX: number; holdF: number; lookX: number; rival: SkaterId | null;
  frame: number; flail: number; pendingFall: boolean; hits: number[]; nextEvent: number;
};
type World = { aspect: number; sims: Map<SkaterId, Sim> };
type Lane = {
  lane: HTMLElement; figure: HTMLElement; reflection: HTMLElement; shadow: HTMLElement; button: HTMLButtonElement;
  leadLane: HTMLElement; lead: HTMLElement; lie: HTMLElement;
  on: boolean; z: number; facing: number; frame: number; blur: boolean; leadOn: boolean; leadFacing: number; lying: boolean;
};

const TAU = Math.PI * 2;
const K = 3;              // a step in depth covers K times the ground of the same step across
const LOOK = .45;         // pursuit lookahead along the lap, radians
const FLIP = .17;         // seconds to turn around
const FALL = .95, GETUP = .75;
const LIE_LENGTH = 1.06;  // a posed fall's length, in the skater's standing heights
const CREW = .9;          // the painted medics stand a little taller than the skaters' scale
const LEAD = .95;         // the fight's target box sits where each skater will be this many seconds ahead
const SHOW = [2.5, .24, .8, .28, 3.4].reduce<number[]>((ends, part) => [...ends, (ends.at(-1) ?? 0) + part], []);
const depthScale = (f: number) => 1 - .85 * f;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
const rand = (low: number, high: number) => low + Math.random() * (high - low);
const loopAngle = (l: Loop, x: number, f: number) => Math.atan2((f - l.cf) / l.af, (x - l.cx) / l.ax);
function loopPoint(l: Loop, phi: number) {
  const c = Math.cos(phi), s = Math.sin(phi), e = 2 / l.n;
  return [l.cx + l.ax * Math.sign(c) * Math.abs(c) ** e, l.cf + l.af * Math.sign(s) * Math.abs(s) ** e] as const;
}

// Where the lying-down art lands when a skater facing right falls backward (canvas px, the figure
// turning about its blades): the back on the ice line, the feet a short slide past where they stood.
function lyingPose(art: SkaterArt) {
  const H = art.height, d = art.down, a = d.angle * Math.PI / 180, slide = .06 * H;
  const cx = slide - d.ox * H - d.width / 2, cy = H * (.5 - d.oy) + d.height * (.5 - d.rest);
  return { tx: cx - H / 2 * Math.sin(a), ty: cy - H / 2 * (1 - Math.cos(a)), centre: slide - d.width / 2 };
}

// Dylan's routine on the clock: glide in, dip, a triple axel (3.5 turns in the air), a backward
// landing on one foot and a glide out with his arms out.
function dylanShow(t: number, H: number) {
  const [enter, prep, air, land, out] = SHOW;
  let x = 1.2, f = .12, facing: 1 | -1 = 1, sx = 1, sy = 1, lift = 0, rot = 0, blur = false;
  if (t < enter) {
    const p = t / enter;
    x = lerp(-.09, .33, p); f = lerp(.11, .15, p); rot = 5 + 2.4 * Math.sin(t * TAU / .72);
    sy = 1 - .012 * (1 - Math.cos(t * TAU / .72));
  } else if (t < prep) {
    const p = (t - enter) / (prep - enter);
    x = lerp(.33, .37, p); f = .15; rot = 7 * (1 - p); sy = 1 - .085 * Math.sin(Math.PI * p);
  } else if (t < air) {
    const p = (t - prep) / (air - prep), turn = clamp((p - .06) / .86, 0, 1);
    x = lerp(.37, .5, p); f = .15; lift = .34 * H * 4 * p * (1 - p);
    sx = Math.cos(7 * Math.PI * turn); sy = 1 + .03 * Math.sin(Math.PI * p); blur = p > .07 && p < .93;
  } else if (t < land) {
    const p = (t - air) / (land - air);
    x = lerp(.5, .54, p); f = .15; facing = -1; sx = -1; sy = 1 - .1 * Math.sin(Math.PI * p); rot = -8 * Math.sin(Math.PI * p);
  } else if (t < out) {
    const p = (t - land) / (out - land);
    x = .54 + .59 * (.81 * p + .19 * p * p); f = lerp(.15, .1, p); facing = -1; sx = -1; rot = -3 + 2 * Math.sin(t * TAU / 1.6);
  }
  return { x, f, facing, sx, sy, lift, rot, blur };
}

function newSim(art: SkaterArt): Sim {
  const route = art.id === "dylan" ? undefined : routes[art.id];
  const loop = route?.loop;
  const [x, f] = loop ? loopPoint(loop, route.start ?? 0) : [-.2, .12];
  return {
    id: art.id, art, route, x, f, ux: loop ? route.cruise * loop.dir : 0, uz: 0,
    facing: loop?.dir ?? 1, flipFrom: loop?.dir ?? 1, turn: 1,
    lean: 0, ax: 0, stride: Math.random(), wob: 0, wobV: 0, stun: 0, bump: -1, hop: -1,
    mode: loop ? "loop" : "gone", t0: 0, until: 0, next: null, spinTurns: 2,
    holdX: .5, holdF: .4, lookX: .5, rival: null, frame: 0, flail: 0, pendingFall: false, hits: [], nextEvent: rand(5, 11),
  };
}

function startFlip(s: Sim, to: 1 | -1) {
  if (s.facing === to) return;
  s.flipFrom = s.facing; s.facing = to; s.turn = 0;
}

// One step of a skater's travel. Pure apart from the skater itself, so it also runs on copies to
// predict where they'll be (to lead a throw, or to place the fight's target box).
function step(s: Sim, dt: number, now: number, world: World) {
  if (s.wob || s.wobV) {
    s.wobV += (-120 * s.wob - 7 * s.wobV) * dt;
    s.wob = clamp(s.wob + s.wobV * dt, -28, 28);
    if (Math.abs(s.wob) < .05 && Math.abs(s.wobV) < .4) s.wob = s.wobV = 0;
  }
  if (s.turn < 1) s.turn = Math.min(1, s.turn + dt / FLIP);
  if (s.mode === "show") {
    const at = dylanShow(now - s.t0, s.art.height);
    s.x = at.x; s.f = at.f; s.facing = s.flipFrom = at.facing;
    return;
  }
  if (s.mode === "fall" || s.mode === "down" || s.mode === "getup" || s.mode === "rest" || s.mode === "gone") return;
  const A = world.aspect, route = s.route;
  const cruise = route?.cruise ?? .8;
  let accel = route?.accel ?? 2, dx = s.ux, dz = s.uz, want = 0;
  if (s.mode === "hold") {
    dx = (s.holdX - s.x) * A; dz = (s.holdF - s.f) * K;
    const distance = Math.hypot(dx, dz);
    want = distance < .05 ? 0 : Math.min(cruise * .6, distance * 1.4);
  } else if (s.mode === "exit") {
    dx = (s.x < .5 ? -.3 - s.x : 1.3 - s.x) * A; dz = 0; want = cruise;
  } else if (s.mode === "rush") {
    // The puck carrier drives straight up the ice.
    dx = (s.holdX - s.x) * A; dz = (s.holdF - s.f) * K; want = cruise * (1 + .1 * Math.sin(TAU * s.stride));
  } else if (s.mode === "charge") {
    // The checker lines up the puck carrier and comes in hard.
    const target = s.rival ? world.sims.get(s.rival) : undefined;
    if (target) { dx = (target.x - s.x) * A; dz = (target.f - s.f) * K; }
    want = cruise * 1.15; accel *= 1.4;
  } else if (s.mode === "loop" && route?.loop) {
    const l = route.loop;
    const [px, pf] = loopPoint(l, loopAngle(l, s.x, s.f) + l.dir * LOOK);
    dx = (px - s.x) * A; dz = (pf - s.f) * K;
    want = cruise * (1 + .16 * Math.sin(TAU * s.stride));
    if (now < s.stun) want *= .45;
  } else accel *= 2.2; // brake, aim, throw, spin: stop on the edges
  const length = Math.hypot(dx, dz) || 1;
  let ex = dx / length * want - s.ux, ez = dz / length * want - s.uz;
  const change = Math.hypot(ex, ez), most = accel * dt;
  if (change > most) { ex *= most / change; ez *= most / change; }
  const before = s.ux;
  s.ux += ex; s.uz += ez;
  const shrink = depthScale(s.f);
  s.x += s.ux * dt * shrink / A;
  s.f = clamp(s.f + s.uz * dt * shrink / K, .015, .46);
  s.ax += ((s.ux - before) / dt - s.ax) * Math.min(1, dt * 8);
  const speed = Math.hypot(s.ux, s.uz);
  if (s.turn >= 1 && s.mode !== "brake") {
    if (s.ux * s.facing < -.08) startFlip(s, s.ux > 0 ? 1 : -1);
    else if (speed < .06 && (s.mode === "hold" || s.mode === "aim")) {
      const face = s.lookX >= s.x ? 1 : -1;
      if (face !== s.facing) startFlip(s, face);
    }
  }
  const pace = clamp(speed / cruise, 0, 1.3);
  s.stride = (s.stride + dt / (route?.period ?? 1) * pace) % 1;
  const lean = clamp(s.ax * 4.5 + s.facing * Math.min(1, pace) * 4, -12, 12);
  s.lean += (lean - s.lean) * Math.min(1, dt * 7);
}

function predict(s: Sim, ahead: number, now: number, world: World) {
  if (s.mode === "show") return { ...dylanShow(now + ahead - s.t0, s.art.height) };
  const copy = { ...s };
  const steps = Math.max(1, Math.ceil(ahead * 40)), dt = ahead / steps;
  for (let i = 0; i < steps; i++) step(copy, dt, now + i * dt, world);
  return { x: copy.x, f: copy.f, facing: copy.facing, lift: 0 };
}

// The figure's own motion on top of the skater's travel: stride, lean, balance, hops, spins,
// turning around, falls and Dylan's jump. Canvas px and degrees; the pivot is the blades.
function figurePose(s: Sim, now: number) {
  const H = s.art.height;
  let sx: number = s.turn < 1 ? s.flipFrom * Math.cos(Math.PI * s.turn) : s.facing;
  let tx = 0, ty = 0, rot = s.lean + s.wob, sy = 1, lift = 0, blur = false, lying = 0;
  const pace = clamp(Math.hypot(s.ux, s.uz) / (s.route?.cruise ?? 1), 0, 1);
  sy -= .012 * pace * (1 - Math.cos(TAU * s.stride)) / 2;
  if (s.hop >= 0 && now - s.hop < .46) {
    const p = (now - s.hop) / .46;
    lift = .12 * H * 4 * p * (1 - p); rot += 3 * s.facing * Math.sin(Math.PI * p);
    sy *= 1 - .05 * Math.sin(TAU * p) ** 2;
  }
  if (s.bump >= 0 && now - s.bump < .3) lift += .035 * H * Math.sin(Math.PI * (now - s.bump) / .3);
  if (s.mode === "spin") {
    const p = clamp((now - s.t0) / Math.max(.01, s.until - s.t0), 0, 1);
    sx = s.facing * Math.cos(s.spinTurns * TAU * smooth(p));
    lift += .018 * H * Math.sin(Math.PI * p); rot = s.wob; blur = p > .14 && p < .86;
  } else if (s.mode === "show") {
    const at = dylanShow(now - s.t0, H);
    sx = at.sx; sy *= at.sy; lift += at.lift; rot = at.rot + s.wob; blur = at.blur;
  } else if (s.mode === "fall" || s.mode === "down" || s.mode === "getup") {
    // Feet out, a quick pitch back, then the topple speeds up until the back hits the ice with a
    // small bounce, ending exactly on the lying-down art the medics pick up.
    const end = lyingPose(s.art), dir = s.facing, angle = s.art.down.angle;
    let r = 1, slide = 1;
    sx = s.facing; sy = 1;
    if (s.mode === "fall") {
      const p = clamp((now - s.t0) / FALL, 0, 1);
      if (p < .3) {
        const a = p / .3;
        rot = s.wob * (1 - a) + angle * dir * .14 * smooth(a); tx = end.tx * dir * .05 * a; ty = -.035 * H * Math.sin(Math.PI * a);
        lying = .14 * a;
        return { tx, ty, rot, sx, sy, lift, blur, lying };
      }
      if (p < .66) { const a = (p - .3) / .36; r = .14 + .86 * a * a; slide = r * r; }
      else {
        const a = (p - .66) / .34, bounce = Math.sin(a * Math.PI * 2.2) * Math.exp(-4 * a);
        rot = angle * dir * (1 + .05 * bounce); tx = end.tx * dir; ty = end.ty - .02 * H * Math.abs(bounce);
        return { tx, ty, rot, sx, sy, lift, blur, lying: 1 };
      }
    } else if (s.mode === "getup") {
      const p = clamp((now - s.t0) / GETUP, 0, 1);
      r = 1 - smooth(p); slide = r ** 1.5; lift = .03 * H * Math.sin(Math.PI * clamp((p - .7) / .3, 0, 1));
    }
    rot = angle * dir * r; tx = end.tx * dir * slide; ty = end.ty * slide; lying = r;
  }
  if (now < s.flail && s.mode !== "spin") rot += 2.5 * Math.sin(now * 46);
  return { tx, ty: ty - lift, rot, sx, sy, lift, blur, lying };
}

const hittable = (s: Sim) => s.mode !== "fall" && s.mode !== "down" && s.mode !== "getup" && s.mode !== "rest" && s.mode !== "gone";

function SkaterLane({ art, timeout, onShoot }: { art: SkaterArt; timeout: boolean; onShoot: (id: SkaterId) => void }) {
  const box = art.frames[0].body;
  const drag = useRef({ x: 0, y: 0, moved: false });
  const style = {
    "--tall": art.tall, "--aspect": `${art.width} / ${art.height}`,
    "--bx": box[0] * 100 + "%", "--by": box[1] * 100 + "%", "--bw": box[2] * 100 + "%", "--bh": box[3] * 100 + "%",
  } as CSSProperties;
  return <>
    <div className={styles.lane} data-skater={art.id} data-on="false" data-facing="1" data-pose="0" style={style}>
      <span className={styles.skateShadow} data-part="shadow" aria-hidden="true" />
      <div className={styles.reflection} data-part="reflection" aria-hidden="true">
        {art.frames.map((frame, i) => <Image key={frame.src} data-frame={i} src={frame.src} alt="" width={art.width} height={art.height}
          sizes="10vw" unoptimized draggable={false} />)}
      </div>
      <div className={styles.figure} data-part="figure">
        {art.frames.map((frame, i) => <Image key={frame.src} data-frame={i} src={frame.src} alt={i ? "" : art.alt}
          width={art.width} height={art.height} sizes="(max-width: 720px) 90px, 14vw" unoptimized draggable={false} />)}
      </div>
      {/* Knocked down: they settle onto their side, propped on an elbow, until the medics come. */}
      <span className={styles.lie} data-part="lie" aria-hidden="true">
        <Image src={art.lie.src} alt="" width={art.lie.width} height={art.lie.height} sizes="(max-width: 720px) 110px, 16vw"
          unoptimized draggable={false} loading="eager" />
      </span>
      <button type="button" className={styles.skateTarget} data-snow-target="" aria-disabled={timeout || undefined}
        aria-label={`Throw a snowball at ${art.name}`} aria-describedby="rink-snowball-instructions"
        onPointerDown={e => { drag.current = { x: e.clientX, y: e.clientY, moved: false }; }}
        onPointerMove={e => { if (e.buttons && Math.hypot(e.clientX - drag.current.x, e.clientY - drag.current.y) > tapSlop(e.pointerType)) drag.current.moved = true; }}
        onPointerCancel={() => { drag.current.moved = true; }}
        onClick={e => { if (!e.detail || !drag.current.moved) onShoot(art.id); }} />
    </div>
    {/* The snowball fight aims at this box, which runs a moment ahead of the skater so balls land on them. */}
    <div className={styles.leadLane} data-lead={art.id} data-snow-off="true" data-facing="1" style={style} aria-hidden="true">
      <i className={styles.lead} data-snow-fighter={`skater-${art.id}`} data-snow-role="target" data-snow-hand="0.5,0.3" />
    </div>
  </>;
}

function RinkSkaters({ active }: StreetProps) {
  const ice = useRef<HTMLDivElement>(null);
  const shoot = useRef<((id: SkaterId) => void) | null>(null);
  const [status, setStatus] = useState("");
  const timeout = useSnowballTimeout();

  useEffect(() => {
    const layer = ice.current, rink = layer?.parentElement;
    if (!layer || !rink) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tesla = isTesla();
    const params = new URLSearchParams(window.location.search);
    const preview = params.get("preview") === "ve";
    const dylanPreview = preview && params.get("dylan-preview") === "now";
    const hockeyPreview = preview && params.get("hockey-preview") === "now";
    const sims = new Map(skaterArt.map(art => [art.id, newSim(art)] as const));
    const world: World = { aspect: 4.9, sims };
    const lanes = new Map<SkaterId, Lane>();
    for (const art of skaterArt) {
      const lane = layer.querySelector<HTMLElement>(`[data-skater="${art.id}"]`);
      const leadLane = layer.querySelector<HTMLElement>(`[data-lead="${art.id}"]`);
      const part = (name: string) => lane?.querySelector<HTMLElement>(`[data-part="${name}"]`) ?? null;
      const figure = part("figure"), reflection = part("reflection"), shadow = part("shadow"), lie = part("lie");
      const button = lane?.querySelector("button"), lead = leadLane?.querySelector<HTMLElement>("[data-snow-fighter]");
      // Every part is rendered with the rink; if any is missing (a stale hot reload), leave the ice still.
      if (!lane || !leadLane || !figure || !reflection || !shadow || !button || !lead || !lie) return;
      // A fresh start (the rink scrolled back into view, Time Out ended): nobody is lying on the ice.
      lane.dataset.lying = "false";
      lie.style.transform = "";
      figure.style.opacity = "";
      lanes.set(art.id, {
        lane, leadLane, figure, reflection, shadow, button, lead, lie,
        on: false, z: -1, facing: 1, frame: 0, blur: false, leadOn: false, leadFacing: 1, lying: false,
      });
    }
    const puckPart = layer.querySelector<HTMLElement>("[data-part='puck']");
    if (!puckPart) return;
    const puck: HTMLElement = puckPart;
    let W = 0, R = 0, running = false, disposed = false, frameId = 0, timerId = 0, last = 0, clock = 0, frames = 0;
    let rescue: RinkRescueState | null = null;
    // The hockey pair is a surprise every few minutes the rink is on screen (the first within a
    // minute or two of seeing it).
    let hockeyClock = 0, hockeyLive = false;
    let hockeyNext = hockeyPreview ? 3 : rand(40, 90);
    let loosePuck: { x: number; f: number; vx: number; t0: number } | null = null;
    let dylanTry = dylanPreview ? 1 : 4, dylanRelease: (() => void) | null = null;
    const ownAnimations = new WeakSet<Animation>();
    const reduced = () => motion.matches;

    if (reduced()) placeStill();

    function placeStill() {
      for (const s of sims.values()) {
        const spot = stillSpots[s.id];
        if (!spot || !s.route?.loop) continue;
        const [x, f, facing] = spot;
        s.x = x; s.f = f; s.facing = s.flipFrom = facing; s.turn = 1; s.ux = s.uz = 0; s.lean = 0;
      }
    }

    function screenOf(s: Sim, at: { x: number; f: number; facing: number; lift?: number }, fx: number, fy: number): Point {
      const box = rink!.getBoundingClientRect(), shrink = depthScale(at.f);
      const height = s.art.tall / 100 * R * shrink, width = height * s.art.width / s.art.height;
      const across = (at.facing > 0 ? fx : 1 - fx) - .5;
      return { x: box.left + at.x * W + across * width, y: box.top + R - at.f * R - (1 - fy) * height - (at.lift ?? 0) * height / s.art.height };
    }

    // Lead a moving skater: aim where they'll be when the visitor's ball arrives.
    function interceptFor(s: Sim, from: Point | null) {
      const now = { x: s.x, f: s.f, facing: s.facing, lift: figurePose(s, clock).lift };
      let to = screenOf(s, now, s.art.chest[0], s.art.chest[1]);
      if (reduced()) return to;
      for (let i = 0; i < 3; i++) {
        const start = from ?? visitorStart(to);
        const ahead = (from ? 0 : MITTEN_RELEASE) + flightTime(start, to);
        to = screenOf(s, predict(s, ahead, clock, world), s.art.chest[0], s.art.chest[1]);
      }
      return to;
    }

    function puff(host: HTMLElement, x: number, y: number, size: number, fixed = false) {
      const blob = document.createElement("i");
      blob.className = styles.puff;
      Object.assign(blob.style, { left: x + "px", top: y + "px", width: size + "px", height: size + "px", position: fixed ? "fixed" : "absolute" });
      host.appendChild(blob);
      const gone = () => blob.remove();
      blob.animate([{ transform: "translate(-50%, -50%) scale(.35)", opacity: 1 }, { transform: "translate(-50%, -50%) scale(1.25)", opacity: 0 }],
        { duration: 210, easing: "ease-out" }).finished.then(gone, gone);
      if (tesla || reduced()) return;
      for (let i = 0; i < 5; i++) {
        const chip = document.createElement("i");
        chip.className = styles.chip;
        const r = size * rand(.12, .2), angle = rand(-Math.PI, 0) + (i % 2 ? Math.PI * .1 : -Math.PI * .1), reach = size * rand(.55, .95);
        Object.assign(chip.style, { left: x + "px", top: y + "px", width: r + "px", height: r + "px", position: fixed ? "fixed" : "absolute" });
        host.appendChild(chip);
        const done = () => chip.remove();
        chip.animate([
          { transform: "translate(-50%, -50%)", opacity: 1 },
          { transform: `translate(calc(-50% + ${Math.cos(angle) * reach}px), calc(-50% + ${Math.sin(angle) * reach + size * .35}px))`, opacity: 0 },
        ], { duration: rand(190, 245), easing: "cubic-bezier(.2,.6,.4,1)" }).finished.then(done, done);
      }
    }

    // Ice chips kicked up by a hard stop, a landing or a fall.
    function spray(s: Sim, along: number, size = 1) {
      if (tesla || reduced() || !W) return;
      const shrink = depthScale(s.f), x = s.x * W, y = R - s.f * R, scale = s.art.tall / 100 * R * shrink / 60;
      for (let i = 0; i < 6; i++) {
        const chip = document.createElement("i");
        chip.className = styles.iceChip;
        const r = rand(1.4, 2.8) * scale * size;
        Object.assign(chip.style, { left: x + "px", top: y + "px", width: r + "px", height: r + "px", zIndex: String(rinkDepthZ(s.f) + 1) });
        layer!.appendChild(chip);
        const done = () => chip.remove();
        const reach = rand(10, 26) * scale * size, rise = rand(4, 13) * scale * size;
        chip.animate([
          { transform: "translate(-50%, -50%)", opacity: .95 },
          { transform: `translate(calc(-50% + ${along * reach * .6}px), calc(-50% - ${rise}px))`, opacity: .9, offset: .45 },
          { transform: `translate(calc(-50% + ${along * reach}px), calc(-50% + ${rise * .2}px))`, opacity: 0 },
        ], { duration: rand(200, 250), easing: "ease-out" }).finished.then(done, done);
      }
    }

    function wobble(s: Sim, fromX: number, strength: number) {
      if (reduced()) return;
      const me = screenOf(s, s, .5, .5);
      const away = me.x >= fromX ? 1 : -1;
      s.wobV += away * strength;
      s.stun = clock + .55;
      s.bump = clock;
      s.flail = clock + .38;
      if (s.art.frames.length > 1 && s.id === "girl") s.frame = 1;
    }

    function say(message: string) { setStatus(message); }
    const capital = (name: string) => name[0].toUpperCase() + name.slice(1);

    function land(s: Sim, to: Point, from: Point, visitor: boolean) {
      const lane = lanes.get(s.id)!;
      const box = rink!.getBoundingClientRect();
      if (!hittable(s) || !lane.on) {
        puff(layer!, to.x - box.left, to.y - box.top, 16);
        return;
      }
      const chest = screenOf(s, { x: s.x, f: s.f, facing: s.facing, lift: figurePose(s, clock).lift }, s.art.chest[0], s.art.chest[1]);
      const reach = s.art.tall / 100 * R * depthScale(s.f) * .34 + 8;
      if (Math.hypot(chest.x - to.x, chest.y - to.y) > reach) {
        puff(layer!, to.x - box.left, to.y - box.top, 14);
        return;
      }
      puff(layer!, to.x - box.left, to.y - box.top, clamp(reach * .4, 10, 24));
      wobble(s, from.x, visitor ? 150 : 120);
      if (!visitor) return;
      const now = performance.now();
      s.hits = s.hits.filter(time => now - time <= 2500);
      s.hits.push(now);
      if (s.hits.length >= 3) {
        s.hits = [];
        knockDown(s);
        say(`${capital(s.art.name)} is down! Calling the Millstadt medics.`);
      } else say(`Snowball hit ${s.hits.length} on ${s.art.name}.`);
    }

    // Time out stops snowballs on the ice too, the same as clicks on characters anywhere else.
    function visitorShot(id: SkaterId) {
      const s = sims.get(id);
      if (!s || isSnowballTimeout() || !hittable(s) || !lanes.get(id)!.on) return;
      const to = interceptFor(s, null);
      void visitorThrow(to, { splat: "none", onImpact: () => { if (!disposed) land(s, to, { x: window.innerWidth / 2, y: window.innerHeight }, true); } });
    }
    shoot.current = visitorShot;

    function knockDown(s: Sim) {
      if (!hittable(s)) return;
      if (s.mode === "show" && clock - s.t0 > SHOW[1] && clock - s.t0 < SHOW[2]) { s.pendingFall = true; return; }
      if (s.mode === "show") s.facing = s.flipFrom = dylanShow(clock - s.t0, s.art.height).facing;
      s.turn = 1; s.ux = s.uz = 0; s.frame = 0; s.pendingFall = false;
      s.mode = "fall"; s.t0 = clock;
      if (reduced()) { s.mode = "down"; s.t0 = clock; callMedics(s); }
    }

    // Keyboard players keep their place when a skater goes down; a mouse or finger tap leaves focus
    // alone, so no focus ring jumps onto another skater.
    function focusElsewhere(s: Sim) {
      const lane = lanes.get(s.id)!;
      if (document.activeElement !== lane.button || !lane.button.matches(":focus-visible")) return;
      const other = [...sims.values()].find(o => o !== s && hittable(o) && lanes.get(o.id)!.on);
      if (other) lanes.get(other.id)!.button.focus({ preventScroll: true });
    }

    // Hand the fallen skater to the medics, exactly where they lie.
    function callMedics(s: Sim) {
      const end = lyingPose(s.art), shrink = depthScale(s.f);
      const unit = s.art.tall * shrink / s.art.height; // rink-height percent per canvas px
      let started = false;
      const detail: RinkKnockdown = {
        person: s.id, name: s.art.name, ambulance: true,
        x: s.x + s.facing * end.centre * unit / 100 * R / W,
        floor: s.f, scale: shrink * CREW, width: s.art.height * LIE_LENGTH * unit, flip: s.facing,
        patient: { src: s.art.lie.src, width: s.art.lie.width, height: s.art.lie.height, rest: .97 },
        onStart: () => {
          if (disposed) return;
          started = true;
          focusElsewhere(s);
          s.mode = "rest"; s.until = Infinity;
          render(s);
        },
        onComplete: () => {
          if (disposed) return;
          if (!started) { s.mode = "down"; s.until = clock + .4; return; }
          // Everyday skaters lace up again and come back; Dylan and the hockey players are done for now.
          if (!s.route?.loop) { s.mode = "gone"; if (s.id === "dylan") releaseDylan(); return; }
          s.mode = "rest"; s.until = clock + rand(3, 6);
        },
      };
      const accepted = !window.dispatchEvent(new CustomEvent(rinkKnockdownEvent, { cancelable: true, detail }));
      s.until = accepted ? Infinity : clock + 1.3;
    }

    // A rescued skater laces up again and skates back in from the side (or simply reappears in
    // their spot when motion is reduced).
    function comeBack(s: Sim) {
      const route = s.route!, l = route.loop!, spot = stillSpots[s.id];
      s.x = l.dir > 0 ? -.1 : 1.1; s.f = l.cf - l.af * .6;
      s.ux = route.cruise * .8 * l.dir; s.uz = 0; s.facing = s.flipFrom = l.dir; s.turn = 1;
      s.wob = s.wobV = 0; s.lean = 0;
      if (reduced() && spot) { [s.x, s.f, s.facing] = spot; s.flipFrom = s.facing; s.ux = 0; }
      s.mode = "loop"; s.nextEvent = clock + rand(6, 12);
      if (rescue || spotlight()) hold(s, rescue?.x ?? .45);
    }

    function releaseDylan() {
      dylanRelease?.();
      dylanRelease = null;
      // Back up to the lights or off on another antic for a while before the next show.
      dylanTry = clock + (dylanPreview ? 6 : rand(25, 40));
      releaseHolds();
    }

    // Dylan's axel and the hockey surprise get the ice to themselves.
    function spotlight() {
      const dylan = sims.get("dylan")!;
      return !reduced() && (hockeyLive || dylan.mode === "show" || dylan.mode === "exit");
    }

    function clearIce(x: number) {
      for (const s of sims.values()) if (s.route?.loop && ["loop", "brake", "aim", "throw", "spin"].includes(s.mode)) hold(s, x);
    }

    function releaseHolds() {
      if (rescue || spotlight()) return;
      for (const s of sims.values()) if (s.mode === "hold" && s.route?.loop) resume(s);
    }

    // While the medics work (or a show is on), everyone else drifts to the back boards and watches.
    function hold(s: Sim, x: number) {
      const taken = [...sims.values()].filter(o => o !== s && o.mode === "hold").map(o => o.holdX);
      const slots = [.2, .29, .38, .6, .68, .75].filter(slot => Math.abs(slot - x) > .14 && !taken.includes(slot));
      if (!slots.length) return;
      s.holdX = slots.reduce((best, slot) => Math.abs(slot - s.x) < Math.abs(best - s.x) ? slot : best);
      s.holdF = rand(.36, .43); s.lookX = x; s.mode = "hold"; s.frame = 0;
      eligible(s, false);
    }

    function onRescue(event: Event) {
      if (!(event instanceof CustomEvent)) return;
      const state = event.detail as RinkRescueState;
      rescue = state.active ? state : null;
      for (const s of sims.values()) {
        if (s.id === "dylan") continue;
        if (state.active && s.id !== state.person && ["loop", "brake", "aim", "throw", "spin"].includes(s.mode)) hold(s, state.x);
        else if (!state.active && s.mode === "hold") resume(s);
      }
    }

    // Back to the laps; a hockey player who watched his teammate get carried off skates away.
    function resume(s: Sim) {
      if (!s.route?.loop) { s.mode = "exit"; return; }
      if (spotlight() && !rescue) return;
      s.mode = "loop"; s.nextEvent = Math.max(s.nextEvent, clock + rand(3, 6));
    }

    // The green-jacket skater can be picked as a thrower by the site-wide fight only while he
    // stands with a snowball cocked; the rest of the time he's just a target.
    function eligible(s: Sim, on: boolean) {
      const lead = lanes.get(s.id)!.lead;
      if (on) {
        lead.removeAttribute("data-snow-role");
        const box = s.art.frames[0].body, hx = s.facing > 0 ? snowballInHand[0] : 1 - snowballInHand[0];
        const left = s.facing > 0 ? box[0] : 1 - box[0] - box[2];
        lead.dataset.snowHand = `${((hx - left) / box[2]).toFixed(3)},${((snowballInHand[1] - box[1]) / box[3]).toFixed(3)}`;
      } else lead.dataset.snowRole = "target";
    }

    function canThrow() {
      if (isSnowballTimeout() || reduced() || document.hidden || rescue || !running) return false;
      const typing = document.activeElement?.matches('input:not([type="button"]):not([type="submit"]),textarea,select,[contenteditable="true"]');
      return !typing && !document.querySelector('dialog[open],[aria-modal="true"]');
    }

    function pickTarget(s: Sim): HTMLElement | null {
      const me = lanes.get(s.id)!.lead;
      const vw = window.innerWidth, vh = window.innerHeight, origin = screenOf(s, s, .5, .4);
      const choices = [...document.querySelectorAll<HTMLElement>("[data-snow-fighter]")].filter(el => {
        if (el === me || el.closest('[data-snow-off="true"]')) return false;
        const r = el.getBoundingClientRect();
        if (r.width < 10 || r.bottom < 70 || r.top > vh - 24 || r.right < 0 || r.left > vw) return false;
        return Math.hypot(r.left + r.width / 2 - origin.x, r.top + r.height / 2 - origin.y) < Math.max(320, vw * .6);
      });
      const skaters = choices.filter(el => el.closest("[data-lead]"));
      const pool = skaters.length && Math.random() < .65 ? skaters : choices;
      return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    }

    function aimAt(target: HTMLElement, from: Point): { to: Point; skater: Sim | null } {
      const id = target.closest<HTMLElement>("[data-lead]")?.dataset.lead as SkaterId | undefined;
      const skater = id ? sims.get(id) ?? null : null;
      if (skater && hittable(skater)) return { to: interceptFor(skater, from), skater };
      const r = target.getBoundingClientRect();
      return { to: { x: r.left + r.width * rand(.4, .6), y: r.top + r.height * rand(.25, .45) }, skater: null };
    }

    function ownThrow(s: Sim, target: HTMLElement | null) {
      eligible(s, false);
      s.mode = "throw"; s.until = clock + .62;
      if (!target || !target.isConnected || !canThrow()) { s.frame = 0; return; }
      const figure = lanes.get(s.id)!.figure;
      const motion = windUp(figure, s.facing, .8);
      void motion.release.then(() => {
        if (disposed) return;
        const from = screenOf(s, { x: s.x, f: s.f, facing: s.facing, lift: 0 }, snowballInHand[0], snowballInHand[1]);
        s.frame = 0;
        const { to, skater } = aimAt(target, from);
        void throwSnowball({ from, to, splat: "none", onImpact: () => {
          if (disposed) return;
          if (skater) land(skater, to, from, false);
          else if (target.isConnected) { snowHit(target, from); puff(document.body, to.x, to.y, 15, true); }
          else puff(document.body, to.x, to.y, 12, true);
        } });
      });
    }

    let throwTarget: HTMLElement | null = null, frameDt = 0;
    // True on the one frame when a timeline passes a moment (for one-off effects like ice spray).
    const crossed = (t: number, moment: number) => t >= moment && t - frameDt < moment;
    function behave(s: Sim) {
      const lane = lanes.get(s.id)!;
      if (s.frame && s.id === "girl" && clock > s.flail && s.mode !== "spin") s.frame = 0;
      switch (s.mode) {
        case "loop":
          if (clock < s.nextEvent || reduced()) break;
          if (s.id === "speed") { s.hop = clock; s.nextEvent = clock + rand(6, 11); }
          else if (s.id === "girl" && !rescue) { s.mode = "brake"; s.next = "spin"; s.until = clock + .7; }
          else if (s.id === "green") {
            throwTarget = canThrow() ? pickTarget(s) : null;
            if (throwTarget) { s.mode = "brake"; s.next = "aim"; s.until = clock + .75; spray(s, s.facing, .7); }
            else s.nextEvent = clock + 3;
          } else s.nextEvent = clock + 30;
          break;
        case "brake":
          // A stop before a spin or a throw ends once they've stopped; a hockey stop holds its ground.
          if (clock < s.until && (!s.next || Math.hypot(s.ux, s.uz) > .05)) break;
          if (s.next === "spin") { s.mode = "spin"; s.t0 = clock; s.until = clock + 1.3; s.spinTurns = [2, 2.5, 3][Math.floor(Math.random() * 3)]; }
          else if (s.next === "aim") {
            s.mode = "aim"; s.frame = 1; s.until = clock + rand(.75, 1.25);
            const r = throwTarget?.getBoundingClientRect(), me = screenOf(s, s, .5, .5);
            s.lookX = r ? s.x + (r.left + r.width / 2 - me.x) / Math.max(1, W) : s.x + s.facing;
            eligible(s, true);
          } else if (s.next === "hold") { hold(s, s.lookX); s.until = clock + 3; }
          else s.mode = s.route?.loop ? "loop" : "exit";
          s.next = null;
          break;
        case "spin":
          if (clock < s.until) break;
          if (s.spinTurns % 1) s.facing = s.flipFrom = s.facing > 0 ? -1 : 1;
          s.turn = 1; s.mode = "loop"; s.nextEvent = clock + rand(10, 17);
          break;
        case "aim": {
          // Picked by the site-wide fight: wind up for real and let the ball go from his hand.
          const picked = lane.lead.getAnimations().find(a => !ownAnimations.has(a) && a.playState === "running" &&
            (a.effect as KeyframeEffect | null)?.getKeyframes?.()[1]?.offset === .42);
          if (picked) {
            ownAnimations.add(picked);
            eligible(s, false);
            const motion = windUp(lane.figure, s.facing, .8);
            void motion.release.then(() => { s.frame = 0; });
            s.mode = "throw"; s.until = clock + .62;
          } else if (clock >= s.until) ownThrow(s, throwTarget);
          break;
        }
        case "throw":
          if (clock < s.until) break;
          s.frame = 0; s.mode = "loop"; s.nextEvent = clock + rand(8, 14); throwTarget = null;
          break;
        case "rush":
          if (s.x > 1.25 || s.x < -.25) s.mode = "gone";
          break;
        case "charge": {
          const rival = s.rival ? sims.get(s.rival) : undefined;
          const live = rival?.mode === "rush" || rival?.mode === "charge";
          if (rival && live && Math.hypot((rival.x - s.x) * world.aspect, (rival.f - s.f) * K) < .42) collide(s, rival);
          else if (!live || clock > s.until) s.mode = "exit";
          break;
        }
        case "fall":
          if (crossed(clock - s.t0, FALL * .66)) spray(s, -s.facing, 1.1);
          if (clock - s.t0 < FALL) break;
          s.mode = "down"; s.t0 = clock;
          callMedics(s);
          break;
        case "down":
          if (clock >= s.until) { s.mode = "getup"; s.t0 = clock; }
          break;
        case "getup":
          if (clock - s.t0 < GETUP) break;
          s.wob = s.wobV = 0;
          if (!s.route?.loop) s.mode = "exit";
          else { s.mode = "loop"; if (rescue || spotlight()) hold(s, rescue?.x ?? s.x); }
          break;
        case "rest":
          if (clock >= s.until && s.route?.loop) comeBack(s);
          break;
        case "exit":
          if (s.x < -.2 || s.x > 1.2) { s.mode = "gone"; if (s.id === "dylan") releaseDylan(); }
          break;
        case "show": {
          const t = clock - s.t0;
          if (s.pendingFall && t >= SHOW[2]) knockDown(s);
          else if (crossed(t, SHOW[1])) spray(s, 1, .8);
          else if (crossed(t, SHOW[2])) spray(s, 1, 1.2);
          if (s.mode === "show" && t >= SHOW[4]) { s.mode = "gone"; releaseDylan(); }
          break;
        }
        case "gone":
          if (s.id !== "dylan" || clock < dylanTry) break;
          dylanTry = clock + 4;
          if (rescue || hockeyLive || isSnowballTimeout() || !running) break;
          dylanRelease = dylanPreview ? () => {} : claimPerson("dylan");
          if (!dylanRelease) break;
          s.mode = "show"; s.t0 = clock; s.wob = s.wobV = 0; s.hits = []; s.pendingFall = false;
          if (reduced()) {
            const [x, f] = stillSpots.dylan!;
            s.x = x; s.f = f; s.facing = 1; s.mode = "hold"; s.holdX = x; s.holdF = f; s.until = clock + 7;
          } else clearIce(.44);
          say("Dylan from Millstadt EMS just skated onto the rink.");
          break;
        case "hold":
          if (s.id === "dylan" && clock >= s.until && !rescue) { s.mode = "gone"; releaseDylan(); }
          else if (!s.route?.loop && s.id !== "dylan" && !rescue && clock >= s.until) s.mode = "exit";
          break;
      }
    }

    // The rare hockey surprise: the Red Wings player rushes in with the puck, the Blues player
    // charges from the other side, they meet with a real check and one of them goes down for the
    // medics. Everyone else clears to the back boards and watches; the other player skates off after.
    function hockeyTick(dt: number) {
      const red = sims.get("redwings")!, blue = sims.get("blues")!;
      if (hockeyLive && red.mode === "gone" && blue.mode === "gone") {
        hockeyLive = false;
        releaseHolds();
      }
      if (hockeyLive || rescue || reduced() || isSnowballTimeout() || sims.get("dylan")!.mode !== "gone") return;
      hockeyClock += dt;
      if (hockeyClock < hockeyNext) return;
      hockeyClock = 0;
      hockeyNext = hockeyPreview ? 25 : rand(150, 240);
      const meetX = rand(.42, .58), meetF = rand(.12, .2);
      hockeyLive = true;
      clearIce(meetX);
      Object.assign(red, { x: -.12, f: meetF + .025, ux: red.route!.cruise, uz: 0, facing: 1, flipFrom: 1, turn: 1, mode: "rush",
        holdX: 1.4, holdF: meetF, rival: "blues", wob: 0, wobV: 0, hits: [], lean: 4 } satisfies Partial<Sim>);
      Object.assign(blue, { x: 1.12, f: meetF - .02, ux: -blue.route!.cruise, uz: 0, facing: -1, flipFrom: -1, turn: 1, mode: "charge",
        until: clock + 6, rival: "redwings", wob: 0, wobV: 0, hits: [], lean: -4 } satisfies Partial<Sim>);
      loosePuck = null;
      say("Hockey on the rink! A Red Wings player and a Blues player are racing for the puck.");
    }

    function collide(a: Sim, b: Sim) {
      const loser = Math.random() < .5 ? a : b, winner = loser === a ? b : a;
      const red = sims.get("redwings")!;
      loosePuck = { x: red.x + red.facing * .035, f: red.f, vx: red.ux * 1.25 / world.aspect, t0: clock };
      spray(a, a.facing, 1.5); spray(b, b.facing, 1.5);
      // Both bounce off the hit; the loser's feet go out from under him.
      winner.ux *= -.3; winner.uz = 0;
      winner.mode = "brake"; winner.next = "hold"; winner.until = clock + .9; winner.lookX = loser.x;
      wobble(winner, screenOf(loser, loser, .5, .5).x, 260);
      loser.wob = 0; loser.wobV = 0;
      knockDown(loser);
      say(`Big hit! ${capital(loser.art.name)} is down on the ice.`);
    }

    function render(s: Sim) {
      const lane = lanes.get(s.id)!;
      const on = s.mode !== "gone" && s.mode !== "rest";
      if (on !== lane.on) { lane.on = on; lane.lane.dataset.on = String(on); lane.button.disabled = !on; }
      if (!on || !W) return;
      const shrink = depthScale(s.f), height = s.art.tall / 100 * R, width = height * s.art.width / s.art.height;
      lane.lane.style.transform = `translate3d(${(s.x * W - width / 2).toFixed(1)}px, ${(-s.f * R).toFixed(1)}px, 0) scale(${shrink.toFixed(4)})`;
      const z = rinkDepthZ(s.f);
      if (z !== lane.z) { lane.z = z; lane.lane.style.zIndex = String(z); }
      if (s.facing !== lane.facing) { lane.facing = s.facing; lane.lane.dataset.facing = String(s.facing); }
      if (s.frame !== lane.frame) { lane.frame = s.frame; lane.lane.dataset.pose = String(s.frame); }
      const pose = figurePose(s, clock), k = height / s.art.height;
      // Down on the ice: the toppled skater settles into their posed fall, where the medics find them.
      const lying = s.mode === "down";
      if (lying !== lane.lying) {
        lane.lying = lying;
        lane.lane.dataset.lying = String(lying);
        if (lying) {
          const end = lyingPose(s.art), w = s.art.height * LIE_LENGTH * k;
          lane.lie.style.width = `${w.toFixed(1)}px`;
          lane.lie.style.transform = `translateX(${(s.facing * end.centre * k - w / 2).toFixed(1)}px) scaleX(${s.facing})`;
        }
      }
      lane.figure.style.transform = `translate(${(pose.tx * k).toFixed(2)}px, ${(pose.ty * k).toFixed(2)}px) rotate(${pose.rot.toFixed(2)}deg) scale(${pose.sx.toFixed(3)}, ${pose.sy.toFixed(3)})`;
      const air = clamp(pose.lift / (s.art.height * .3), 0, 1);
      lane.reflection.style.transform = `translateY(${(pose.lift * k * .5).toFixed(2)}px) rotate(${(-pose.rot).toFixed(2)}deg) scaleX(${pose.sx.toFixed(3)})`;
      lane.reflection.style.opacity = String(Math.max(0, 1 - pose.lying * 3) * (1 - air * .7));
      lane.shadow.style.transform = `translateX(${(pose.tx * k * .55 - s.facing * pose.lying * width * .18).toFixed(2)}px) scale(${(1 + pose.lying * .9 - air * .4).toFixed(3)}, ${(1 - air * .3).toFixed(3)})`;
      lane.shadow.style.opacity = String(1 - air * .55);
      const blur = pose.blur && !tesla;
      if (blur !== lane.blur) { lane.blur = blur; lane.figure.style.filter = blur ? "url(#winter-rink-spin)" : ""; }
    }

    function placeLead(s: Sim) {
      const lane = lanes.get(s.id)!;
      const on = lane.on && hittable(s) && !reduced();
      if (on !== lane.leadOn) { lane.leadOn = on; lane.leadLane.dataset.snowOff = String(!on); }
      if (!on) return;
      const at = predict(s, LEAD, clock, world);
      const shrink = depthScale(at.f), height = s.art.tall / 100 * R, width = height * s.art.width / s.art.height;
      lane.leadLane.style.transform = `translate3d(${(at.x * W - width / 2).toFixed(1)}px, ${(-at.f * R - (at.lift ?? 0) * height * shrink / s.art.height).toFixed(1)}px, 0) scale(${shrink.toFixed(4)})`;
      if (at.facing !== lane.leadFacing) { lane.leadFacing = at.facing; lane.leadLane.dataset.facing = String(at.facing); }
    }

    // The puck rides the Red Wings player's blade on the ice; after the hit it slides loose and stops.
    function renderPuck(dt: number) {
      const red = sims.get("redwings")!;
      let x = 0, f = 0, scale = 1, show = !!W && red.mode === "rush" && lanes.get("redwings")!.on;
      if (show) {
        const shrink = depthScale(red.f), height = red.art.tall / 100 * R * shrink, width = height * red.art.width / red.art.height;
        const pose = figurePose(red, clock), angle = pose.rot * Math.PI / 180;
        x = (red.x * W + (puckAtBlade[0] - .5) * width * pose.sx * Math.cos(angle) + Math.sin(TAU * red.stride) * height * .025 * red.facing) / W;
        f = red.f + (1 - puckAtBlade[1]) * height / R; scale = shrink;
      } else if (loosePuck && W && clock - loosePuck.t0 < 2.2) {
        loosePuck.x += loosePuck.vx * dt * depthScale(loosePuck.f);
        loosePuck.vx *= Math.exp(-dt * 1.6);
        x = loosePuck.x; f = loosePuck.f; scale = depthScale(f); show = x > -.05 && x < 1.05;
      }
      puck.dataset.on = String(show);
      if (!show) return;
      puck.style.transform = `translate3d(${(x * W).toFixed(1)}px, ${(R - f * R).toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
      puck.style.zIndex = String(rinkDepthZ(f) + 1);
      puck.style.opacity = loosePuck && red.mode !== "rush" ? String(clamp(2.2 - (clock - loosePuck.t0), 0, 1)) : "1";
    }

    function frame(time: number) {
      frameId = timerId = 0;
      if (!running || disposed) return;
      const still = reduced();
      frames++;
      // The car's browser runs the rink at half rate.
      if (tesla && !still && frames % 2) { schedule(); return; }
      const dt = Math.min(still ? .4 : .05, Math.max(0, (time - last) / 1000));
      last = time;
      clock += dt; frameDt = dt;
      for (const s of sims.values()) behave(s);
      if (!still) {
        hockeyTick(dt);
        for (const s of sims.values()) step(s, dt, clock, world);
      }
      for (const s of sims.values()) render(s);
      renderPuck(dt);
      if (still || frames % (tesla ? 6 : 3) === 0) for (const s of sims.values()) placeLead(s);
      schedule();
    }

    function schedule() {
      if (frameId || timerId || !running || disposed) return;
      if (reduced()) timerId = window.setTimeout(() => frame(performance.now()), 250);
      else frameId = requestAnimationFrame(frame);
    }

    function setRunning(next: boolean) {
      if (next === running) return;
      running = next;
      if (running) { last = performance.now(); schedule(); }
      else { cancelAnimationFrame(frameId); window.clearTimeout(timerId); frameId = timerId = 0; }
    }

    const size = new ResizeObserver(([entry]) => {
      if (disposed) return;
      W = entry.contentRect.width; R = entry.contentRect.height;
      if (R) world.aspect = W / R;
      for (const s of sims.values()) render(s);
    });
    size.observe(layer);
    let inView = false;
    const sight = new IntersectionObserver(([entry]) => {
      if (disposed) return;
      inView = entry.isIntersecting;
      setRunning(inView && !document.hidden);
    });
    sight.observe(rink);
    const onVisibility = () => setRunning(inView && !document.hidden);
    const onMotion = () => { if (reduced()) placeStill(); last = performance.now(); };
    document.addEventListener("visibilitychange", onVisibility);
    motion.addEventListener("change", onMotion);
    window.addEventListener(rinkRescueEvent, onRescue);
    // Snowballs from anyone else in the fight knock skaters off balance.
    const onHit = (event: Event) => {
      const id = (event.currentTarget as HTMLElement).closest<HTMLElement>("[data-lead]")?.dataset.lead as SkaterId | undefined;
      const s = id && sims.get(id);
      const from = (event as CustomEvent<{ from?: Point }>).detail?.from;
      if (s && hittable(s)) wobble(s, from?.x ?? window.innerWidth / 2, 125);
    };
    for (const lane of lanes.values()) lane.lead.addEventListener("mems:snow-hit", onHit);
    return () => {
      disposed = true;
      running = false;
      cancelAnimationFrame(frameId); window.clearTimeout(timerId); frameId = timerId = 0;
      size.disconnect(); sight.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      motion.removeEventListener("change", onMotion);
      window.removeEventListener(rinkRescueEvent, onRescue);
      for (const lane of lanes.values()) lane.lead.removeEventListener("mems:snow-hit", onHit);
      dylanRelease?.();
      shoot.current = null;
    };
  }, []);

  return (
    <div className={styles.ice} ref={ice} data-active={active}>
      <svg className={styles.filters} aria-hidden="true" focusable="false">
        <filter id="winter-rink-spin" x="-25%" y="0" width="150%" height="100%"><feGaussianBlur stdDeviation="3.2 0" /></filter>
      </svg>
      {skaterArt.map(art => <SkaterLane key={art.id} art={art} timeout={timeout} onShoot={id => shoot.current?.(id)} />)}
      <i className={styles.puck} data-part="puck" data-on="false" aria-hidden="true" />
      <span role="status" className={styles.announcement}>{status}</span>
    </div>
  );
}

export function WinterStreetForeground({ active }: StreetProps) {
  return (
    <div className={styles.rink} data-winter-rink="" data-active={active} role="group" aria-label="The Christmas skating rink">
      <div className={styles.rinkLights} aria-hidden="true"><i /><i /><i /></div>
      <CocoaStall />
      <div className={styles.neighbors} data-snow-fighter="neighbors" data-snow-target="" data-snow-hand="0.35,0.32">
        <Image src="/images/winter/street/neighbors.webp" alt="Five neighbors with cocoa, wrapped presents and a lantern watch from the snowy edge of the rink."
          width={600} height={469} sizes="(max-width: 720px) 130px, 16vw" unoptimized />
      </div>
      <span id="rink-snowball-instructions" className={styles.announcement}>Land three snowballs on the same skater within a couple of seconds for a visit from the Millstadt medics.</span>
      <RinkSkaters active={active} />
      <WinterRinkRescue />
    </div>
  );
}
