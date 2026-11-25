"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { isSnowballTimeout, snowballTimeoutEvent } from "@/lib/seasonal/snowballTimeout";
import { isTesla, reachSamples, tapSlop, touchReach } from "@/lib/device/profile";
import { claimPeople, isPersonOut } from "@/lib/seasonal/cast";
import { throwSnowball, visitorThrow, type Point } from "@/lib/seasonal/snowballFlight";
import styles from "./WinterSnowballAmbush.module.css";

// Holiday pop-ups. Every 7-13 s someone who is free pops up from the bottom of the screen (or out
// of a snowdrift) for one of several acts: a classic snowball throw, a wave hello and then a throw,
// Braeden's mariachi serenade, Dylan's backflip, a peek with changing faces, a caroler, or the
// whole caroler trio. Nobody is in two acts at once (lib/seasonal/cast); the crew hanging on the
// Christmas lights stay up there until a visitor knocks them down. Visitors throw back by clicking the character (or Alt+Shift+S); some take two or three
// hits before giving up. Call Time Out and nothing appears or throws on its own.
// Preview one act: ?preview=ve&pop-preview=classic|wave|serenade|backflip|peek|caroler|trio|duet
// (optional: pop-edge=drift|floor|corner-left|corner-right, pop-tough=1-3, pop-person=<id>).

export type Crew = "kalista" | "braeden" | "dylan" | "medical-director";
// Audrey and Debbie join the peeks (they don't hang on the lights).
type Guest = "audrey" | "debbie";
type Person = Crew | Guest | "caroler-curly" | "caroler-straight" | "caroler-little";
type Kind = "classic" | "wave" | "serenade" | "backflip" | "peek" | "caroler" | "trio";
type Edge = "drift" | "floor" | "corner-left" | "corner-right";
export type XY = readonly [number, number];
type Box = { x: number; y: number; w: number; h: number };
/** One picture of a character: its pixel size and where it sits on the stage (top-left, scale). */
export type Frame = { src: string; w: number; h: number; x: number; y: number; s: number };
/** A character's stage (W x H units) with every pose placed on it, plus points in stage units. */
export type Rig = {
  W: number; H: number; frames: Record<string, Frame>;
  /** Share of the stage that shows above the floor (busts hide their cut-off bottom below it). */
  visible: number;
  /** Feet line, for figures standing in a snowbank on the bottom edge. */
  ground?: number;
  faces: XY[]; head: XY; ball?: XY; hand?: XY; mittens?: XY[]; mouth?: XY;
};

const art = (file: string) => `/images/winter/kit/${file}.webp`;
const frame = (file: string, w: number, h: number, x = 0, y = 0, s = 1): Frame => ({ src: art(file), w, h, x, y, s });

// The crew's kit poses. Snow poses are 560 px tall, standing poses 620 px; the standing throw poses
// are drawn 172% of the box tall so the head matches the snow pose (the drift hides the legs). The
// wave pose is lined up head-to-head with the windup (its width, scale, and offset in windup px).
// The truck medics in the village (WinterTruckMedics) use the same rig.
export const crewNames: Record<Crew, string> = { kalista: "Kalista", braeden: "Braeden", dylan: "Dylan", "medical-director": "Dr. Hsu" };
const crewArt: Record<Crew, { snow: number; mad: number; windup: number; release: number; wave: readonly [number, number, number, number]; hand: XY; face: XY; ball: XY }> = {
  kalista: { snow: 557, mad: 540, windup: 449, release: 434, wave: [238, 1.057, 31, 0], hand: [.89, .27], face: [.5, .25], ball: [.929, .225] },
  braeden: { snow: 626, mad: 567, windup: 404, release: 500, wave: [269, 1.061, 15, 2.5], hand: [.89, .28], face: [.47, .22], ball: [.931, .147] },
  dylan: { snow: 563, mad: 532, windup: 380, release: 449, wave: [265, 1.102, -12, 0], hand: [.9, .32], face: [.49, .22], ball: [.941, .212] },
  "medical-director": { snow: 530, mad: 508, windup: 330, release: 432, wave: [269, 1.02, -20.6, 0], hand: [.9, .35], face: [.46, .27], ball: [.923, .396] },
};
export function crewRig(person: Crew): Rig {
  const a = crewArt[person], W = a.snow, H = 560, k = 1.72 * H / 620, top = -.02 * H;
  const left = (width: number) => (W - width * k) / 2;
  const [waveW, waveScale, waveX, waveY] = a.wave;
  return {
    W, H, visible: .86,
    frames: {
      boo: frame(`crew/${person}-snow`, W, H),
      mad: frame(`crew/${person}-snow-mad`, a.mad, H, (W - a.mad) / 2),
      windup: frame(`crew/${person}-throw-windup`, a.windup, 620, left(a.windup), top, k),
      release: frame(`crew/${person}-throw-release`, a.release, 620, left(a.release), top, k),
      wave: frame(`pop/${person}-wave`, waveW, 619, left(a.windup) + waveX * k, top + waveY * k, k * waveScale),
    },
    faces: [[a.face[0] * W, a.face[1] * H]], head: [a.face[0] * W, 0],
    hand: [a.hand[0] * W, a.hand[1] * H],
    ball: [left(a.release) + a.ball[0] * a.release * k, top + a.ball[1] * 620 * k],
  };
}

// Folder 07 portraits for the peek: excited, scared and nauseous are lined up on the hat (width,
// height, scale, x, y against the excited picture). "Hello" (a wave from further back) is scaled so
// its head matches too, so the wave turns straight into the grin without the head jumping.
type Placed = readonly [number, number, number, number, number];
const peekArt: Record<Crew, { excited: XY; scared: Placed; nauseous: Placed; hello: Placed; face: XY }> = {
  kalista: { excited: [425, 627], scared: [425, 629, 1, -4.3, 0], nauseous: [427, 625, .975, 12.8, -4.3], hello: [393, 474, 1.4, -128.4, 1.2], face: [.4, .38] },
  braeden: { excited: [416, 500], scared: [416, 496, 1, 0, 0], nauseous: [415, 497, 1.002, 0, 0], hello: [550, 538, 1.12, -18.9, 6.8], face: [.55, .42] },
  dylan: { excited: [419, 585], scared: [420, 583, 1.018, -25.1, 0], nauseous: [422, 590, .993, 21, 0], hello: [487, 507, 1.53, -182.5, 4], face: [.54, .38] },
  "medical-director": { excited: [396, 634], scared: [395, 634, .993, 0, 0], nauseous: [402, 635, 1.005, 0, 0], hello: [428, 537, 1.74, -214.4, 9.5], face: [.52, .52] },
};
// Audrey and Debbie: busts cut from their pop-up videos (one smiling picture for every moment).
const guestNames: Record<Guest, string> = { audrey: "Audrey", debbie: "Debbie" };
const guestArt: Record<Guest, { size: XY; face: XY }> = {
  audrey: { size: [359, 498], face: [.5, .3] },
  debbie: { size: [407, 502], face: [.47, .3] },
};
const isGuest = (person: Person): person is Guest => person === "audrey" || person === "debbie";
function peekRig(person: Crew | Guest): Rig {
  if (isGuest(person)) {
    const { size: [W, H], face } = guestArt[person], bust = frame(`pop/${person}-excited`, W, H);
    return {
      W, H, visible: .72,
      frames: { hello: bust, excited: bust, scared: bust, nauseous: bust },
      faces: [[face[0] * W, face[1] * H]], head: [face[0] * W, H * .02],
    };
  }
  const p = peekArt[person], [W, H] = p.excited;
  const placed = (pose: string, [w, h, s, x, y]: Placed) => frame(`pop/${person}-${pose}`, w, h, x, y, s);
  return {
    W, H, visible: .68,
    frames: { hello: placed("hello", p.hello), excited: frame(`pop/${person}-excited`, W, H), scared: placed("scared", p.scared), nauseous: placed("nauseous", p.nauseous) },
    faces: [[p.face[0] * W, p.face[1] * H]], head: [p.face[0] * W, H * .04],
  };
}

// Braeden's mariachi flip-book, lined up on the sombrero with his boots on the ground line.
const serenadeRig: Rig = {
  W: 410, H: 650, ground: 640, visible: 1,
  frames: {
    s1: frame("pop/braeden-serenade-1", 261, 632, 70, 11), s2: frame("pop/braeden-serenade-2", 365, 608, 4, 35),
    s3: frame("pop/braeden-serenade-3", 292, 635, 90.5, 8), s4: frame("pop/braeden-serenade-4", 317, 625, 83.5, 18),
  },
  faces: [[212, 132]], head: [215, 6], mouth: [208, 300],
};
// Dylan's backflip: a wave hello, then the flip-book. Standing frames sit on the ground line, the
// upside-down ones around his middle.
const flipRig: Rig = {
  W: 360, H: 650, ground: 640, visible: 1,
  frames: {
    f0: frame("pop/dylan-flip-wave", 274, 624, 55, 18),
    f1: frame("pop/dylan-flip-1", 284, 497, 32, 145), f2: frame("pop/dylan-flip-2", 254, 632, 53, 10),
    f3: frame("pop/dylan-flip-3", 206, 396, 77, 142), f4: frame("pop/dylan-flip-4", 323, 545, 18.5, 67.5),
    f5: frame("pop/dylan-flip-5", 317, 612, 21.5, 30),
  },
  faces: [[182, 150]], head: [180, 26],
};
// The caroler girls (cartoon cut-outs). Trio faces and mittens run left to right: little, curly, straight.
const carolerRigs: Record<"curlyFull" | "curlyHalf" | "straightHalf" | "trioFull" | "trioHalf", Rig> = {
  curlyFull: { W: 315, H: 760, ground: 757, visible: 1, frames: { sing: frame("pop/caroler-curly", 315, 760) }, faces: [[132, 57]], mittens: [[189, 205]], mouth: [140, 78], head: [138, 10] },
  curlyHalf: { W: 365, H: 640, visible: .8, frames: { sing: frame("pop/caroler-curly-half", 365, 640) }, faces: [[172, 115]], mittens: [[255, 403]], mouth: [175, 160], head: [166, 20] },
  straightHalf: { W: 389, H: 640, visible: .8, frames: { sing: frame("pop/caroler-straight-half", 389, 640) }, faces: [[214, 118]], mittens: [[311, 403]], mouth: [222, 166], head: [196, 20] },
  trioFull: { W: 689, H: 640, ground: 637, visible: 1, frames: { sing: frame("pop/carolers-trio", 689, 640) }, faces: [[110, 128], [324, 109], [524, 109]], mittens: [[21, 77], [324, 294], [524, 275]], mouth: [324, 130], head: [324, 30] },
  trioHalf: { W: 757, H: 600, visible: .9, frames: { sing: frame("pop/carolers-trio-half", 757, 600) }, faces: [[136, 186], [371, 138], [590, 120]], mittens: [[23, 96], [371, 330], [606, 318]], mouth: [371, 164], head: [371, 40] },
};

const crew: Crew[] = ["kalista", "braeden", "dylan", "medical-director"];
const trio: Person[] = ["caroler-little", "caroler-curly", "caroler-straight"];
// Who can do which act. Weights are per act (shared by everyone who can do it).
const castings: ReadonlyArray<{ kind: Kind; weight: number; casts: Person[][] }> = [
  { kind: "classic", weight: 1, casts: crew.map((person) => [person]) },
  { kind: "wave", weight: .85, casts: crew.map((person) => [person]) },
  { kind: "peek", weight: 1, casts: [...crew, "audrey", "debbie"].map((person) => [person as Person]) },
  { kind: "serenade", weight: .8, casts: [["braeden"]] },
  { kind: "backflip", weight: .8, casts: [["dylan"]] },
  { kind: "caroler", weight: .9, casts: [["caroler-curly"], ["caroler-straight"]] },
  { kind: "trio", weight: .8, casts: [trio] },
];
const soloSong = ["♪ Fa la la la la…", "♪ Deck the halls!", "♪ …la la la la ♪", "♪ Jingle bells!"];
const trioSong = ["♪ Deck the halls with boughs of holly…", "♪ Fa la la la la, la la la la!", "♪ Jingle bells, jingle bells…", "♪ We wish you a merry Christmas!"];

const controls = 'a,button,input,textarea,select,label,summary,form,iframe,video,audio,canvas,nav,[role="application"],[role="grid"],[role="button"],[role="tab"],[role="menuitem"],[role="switch"],[role="slider"],[role="link"],[tabindex="0"],[contenteditable="true"]';
const excluded = '[data-hunt-scene],[data-winter-rink],[data-hanging-chief] img:first-child,footer,[data-snow-chief],[data-winter-player]';
const offLimits = controls + ",[data-winter-rink],[data-hunt-scene],footer";
const drifts = [[.05,.13],[.43,.08],[.93,.20],[.23,.36],[.63,.41],[.03,.60],[.9,.62],[.39,.67],[.14,.92],[.73,.93]];
const samples = [[.5,.10],[.23,.35],[.78,.35],[.5,.42],[.37,.72],[.66,.73],[.5,.9]];
const between = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Art is decoded before anyone appears, and each picture keeps a small alpha map so only a hit on
// the character itself (not the transparent space around it) counts.
type Mask = { w: number; h: number; alpha: Uint8Array };
const loading = new Map<string, Promise<void>>();
const masks = new Map<string, Mask | null>();
export function loadArt(src: string) {
  let pending = loading.get(src);
  if (pending) return pending;
  pending = (async () => {
    const image = new window.Image();
    image.decoding = "async";
    image.src = src;
    await image.decode();
    const w = 96, h = Math.max(8, Math.min(220, Math.round(96 * image.naturalHeight / image.naturalWidth)));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const brush = canvas.getContext("2d", { willReadFrequently: true });
    let mask: Mask | null = null;
    try {
      if (brush) {
        brush.drawImage(image, 0, 0, w, h);
        const data = brush.getImageData(0, 0, w, h).data, alpha = new Uint8Array(w * h);
        for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
        mask = { w, h, alpha };
      }
    } catch { /* No canvas reads: the picture's box counts instead. */ }
    masks.set(src, mask);
  })().catch((error) => { loading.delete(src); throw error; });
  loading.set(src, pending);
  return pending;
}
/** Is a picture loaded with loadArt painted at (u, v), as fractions of its size? null when unknown. */
export function paintedAt(src: string, u: number, v: number) {
  const mask = masks.get(src);
  if (!mask) return null;
  if (u < 0 || v < 0 || u >= 1 || v >= 1) return false;
  return mask.alpha[Math.floor(v * mask.h) * mask.w + Math.floor(u * mask.w)] > 70;
}

function guarded() {
  if (isSnowballTimeout() || document.hidden || document.activeElement?.matches('input:not([type="button"]):not([type="submit"]),textarea,select,[contenteditable="true"]')) return true;
  return [...document.querySelectorAll('dialog[open],[aria-modal="true"],[aria-controls="site-navigation-panel"][aria-expanded="true"]')]
    .some(el => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden");
}

/** The bottom of the usable screen: the top of a fixed bottom bar (the phone menu), else the screen edge. */
function floorLine(vw: number, vh: number) {
  let node = document.elementFromPoint(vw / 2, vh - 2);
  while (node && node !== document.body) {
    if (getComputedStyle(node).position === "fixed") {
      const box = node.getBoundingClientRect();
      return box.width >= vw * .6 && box.bottom >= vh - 3 && box.top > vh * .6 && box.height < 170 ? box.top : vh;
    }
    node = node.parentElement;
  }
  return vh;
}

type Preview = { kind: Kind | "duet" | null; edge: Edge | null; tough: number; person: Person | null };
function previewSettings(): Preview | null {
  try {
    const query = new URLSearchParams(window.location.search);
    if (query.get("preview") !== "ve") return null;
    const kind = query.get("pop-preview"), edge = query.get("pop-edge"), person = query.get("pop-person");
    return {
      kind: kind === "duet" || castings.some(c => c.kind === kind) ? kind as Kind | "duet" : null,
      edge: (["drift", "floor", "corner-left", "corner-right"] as const).find(e => e === edge) ?? null,
      tough: Math.min(3, Math.max(0, Math.round(Number(query.get("pop-tough")) || 0))),
      person: [...crew, ...trio].find(p => p === person) ?? null,
    };
  } catch { return null; }
}

type Wait = (ms: number) => Promise<void>;
type Run = { dead: boolean; timers: Set<number> };
type Actor = {
  id: number; kind: Kind; people: Person[]; name: string; rig: Rig;
  edge: Edge; box: Box; cut: number; tilt: number; hide: number; talk: "left" | "right" | "center";
  phase: string; frame: string; bubble: string; mood: string; notes: string; fast: boolean; slow: boolean;
  hits: number; toughness: number; hittable: boolean; incoming: boolean; girl: number;
  /** A duet: the companion leaves with its lead (not the other way round). */
  release: () => void; run: Run | null; lead: Actor | null; companion: Actor | null;
};
type View = Pick<Actor, "id" | "kind" | "people" | "name" | "rig" | "edge" | "box" | "cut" | "tilt" | "hide" | "talk" |
  "phase" | "frame" | "bubble" | "mood" | "notes" | "fast" | "slow" | "hits" | "hittable">;
const toView = (a: Actor): View => ({
  id: a.id, kind: a.kind, people: a.people, name: a.name, rig: a.rig, edge: a.edge, box: a.box, cut: a.cut, tilt: a.tilt, hide: a.hide,
  talk: a.talk, phase: a.phase, frame: a.frame, bubble: a.bubble, mood: a.mood, notes: a.notes, fast: a.fast, slow: a.slow, hits: a.hits, hittable: a.hittable,
});
type Casting = { kind: Kind; people: Person[]; release: () => void };
type Env = {
  host: () => HTMLDivElement | null; fx: () => HTMLDivElement | null;
  render: (views: View[]) => void; say: (text: string) => void; dismissed: (people: string) => void; history: (entry: string) => void;
};

function runCast(env: Env) {
  const preview = previewSettings();
  const forced = preview?.kind ?? null;
  const actors = new Map<number, Actor>();
  const gone = new Set<Person>();
  let disposed = false, loadingArt = false, stamp = 0, serial = 0;
  let lastPeople: Person[] = [], lastKind: Kind | null = null, lastDrift: Box | null = null;
  let waiting = forced ? 900 : between(6000, 10000), clock: number | null = null;
  let wake: number | undefined, scrollCheck: number | undefined;
  let startX = 0, startY = 0, startType = "mouse";
  const gap = () => forced ? 2600 : between(7000, 13000);
  const free = (person: Person) => !gone.has(person) && !isPersonOut(person);

  function commit() {
    if (disposed) return;
    env.render([...actors.values()].map(toView));
    aimSoon();
  }
  // Crosshair: while a mouse is over the painted character of someone who can be hit, their
  // snow target catches the pointer (showing the cursor); everywhere else the page works as usual.
  let aimX = -1, aimY = -1, aimType = "", aimFrame = 0;
  function aimSoon() { if (!aimFrame && !disposed) aimFrame = window.requestAnimationFrame(aim); }
  function aim() {
    aimFrame = 0;
    const mouse = (aimType === "mouse" || aimType === "pen") && !isSnowballTimeout();
    const over = mouse ? [...actors.values()].reverse().find(a => a.hittable && !a.incoming && inkAt(a, aimX, aimY)) : undefined;
    for (const actor of actors.values()) element(actor)?.querySelector("[data-snow-target]")?.toggleAttribute("data-aim", actor === over);
  }
  const hover = (event: PointerEvent) => { aimX = event.clientX; aimY = event.clientY; aimType = event.pointerType; if (actors.size) aimSoon(); };
  function set(actor: Actor, patch: Partial<Actor>) {
    Object.assign(actor, patch);
    if (actors.has(actor.id)) commit();
  }
  const element = (actor: Actor) => env.host()?.querySelector<HTMLElement>(`[data-actor="${actor.id}"]`) ?? null;

  // Each act is a little script; a hit (or leaving) cancels it mid-step and starts another.
  function play(actor: Actor, script: (wait: Wait) => Promise<void>) {
    halt(actor);
    const run: Run = { dead: false, timers: new Set() };
    actor.run = run;
    const wait: Wait = (ms) => new Promise(resolve => {
      const timer = window.setTimeout(() => { run.timers.delete(timer); if (!run.dead) resolve(); }, ms);
      run.timers.add(timer);
    });
    void script(wait).catch(() => {});
  }
  function halt(actor: Actor) {
    if (!actor.run) return;
    actor.run.dead = true;
    actor.run.timers.forEach(timer => window.clearTimeout(timer));
    actor.run = null;
  }

  function pause() {
    window.clearTimeout(wake);
    if (clock !== null) waiting = Math.max(0, waiting - (performance.now() - clock));
    clock = null;
  }
  function schedule(ms?: number) {
    pause();
    if (ms !== undefined) waiting = ms;
    if (disposed || loadingArt || actors.size || guarded()) return;
    clock = performance.now();
    wake = window.setTimeout(() => { clock = null; void appear(); }, waiting);
  }
  function remove(actor: Actor, nextDelay = gap()) {
    if (!actors.has(actor.id)) return;
    halt(actor);
    actor.release();
    actors.delete(actor.id);
    if (actor.lead) actor.lead.companion = null;
    const companion = actor.companion;
    if (companion && actors.has(companion.id) && companion.phase !== "retreat") {
      companion.lead = null;
      play(companion, wait => retreat(companion, wait));
    }
    commit();
    if (!actors.size) { stamp++; schedule(nextDelay); }
  }
  function clearAll(nextDelay: number) {
    for (const actor of actors.values()) { halt(actor); actor.release(); }
    actors.clear();
    commit();
    stamp++;
    schedule(nextDelay);
  }

  /** Choose an act and claim its people: never someone already out, never last time's face if avoidable. */
  function cast(allowed: readonly Kind[] | null, exclude: readonly Person[]): Casting | null {
    let pool: Array<{ kind: Kind; people: Person[]; weight: number }> = [];
    for (const c of castings) {
      if (allowed && !allowed.includes(c.kind)) continue;
      const casts = c.casts.filter(people => people.every(free));
      for (const people of casts) pool.push({ kind: c.kind, people, weight: c.weight / casts.length * (c.kind === lastKind && !forced ? .35 : 1) });
    }
    const wanted = preview?.person ? pool.filter(o => o.people.includes(preview.person!)) : [];
    if (wanted.length) pool = wanted;
    let options = pool.filter(o => !o.people.some(person => exclude.includes(person)));
    if (!options.length) options = pool;
    while (options.length) {
      let roll = Math.random() * options.reduce((sum, o) => sum + o.weight, 0);
      const choice = options.find(o => (roll -= o.weight) <= 0) ?? options[options.length - 1];
      const release = claimPeople(choice.people);
      if (release) return { kind: choice.kind, people: choice.people, release };
      options = options.filter(o => o !== choice);
    }
    return null;
  }

  function costume(c: Casting): { rig: Rig; edges: Edge[]; frame: string; name: string } {
    const narrow = document.documentElement.clientWidth < 700;
    const person = c.people[0] as Crew;
    switch (c.kind) {
      case "classic": return { rig: crewRig(person), edges: ["drift", "drift", "floor"], frame: "boo", name: crewNames[person] };
      case "wave": return { rig: crewRig(person), edges: ["drift", "floor"], frame: "wave", name: crewNames[person] };
      case "peek": {
        const who = c.people[0];
        const guest = isGuest(who);
        return { rig: peekRig(guest ? who : person), edges: ["floor", "floor", "corner-left", "corner-right"], frame: "excited", name: guest ? guestNames[who] : crewNames[person] };
      }
      case "serenade": return { rig: serenadeRig, edges: ["floor"], frame: "s1", name: "Braeden" };
      case "backflip": return { rig: flipRig, edges: ["floor"], frame: "f0", name: "Dylan" };
      case "caroler": {
        const rig = c.people[0] === "caroler-straight" ? carolerRigs.straightHalf : Math.random() < .5 ? carolerRigs.curlyFull : carolerRigs.curlyHalf;
        return { rig, edges: rig.ground ? ["floor"] : ["floor", "floor", "corner-left", "corner-right"], frame: "sing", name: "the caroler" };
      }
      case "trio": return { rig: narrow || Math.random() < .5 ? carolerRigs.trioHalf : carolerRigs.trioFull, edges: ["floor"], frame: "sing", name: "the carolers" };
    }
  }

  /** Size and place a character where nothing clickable or important sits under them. */
  function place(kind: Kind, rig: Rig, edges: Edge[], lead: Actor | null) {
    const vw = document.documentElement.clientWidth, vh = window.innerHeight, phone = vw < 768, car = isTesla();
    const nav = document.querySelector(".mems-nav-bar")?.getBoundingClientRect();
    const top = Math.max(16, (nav?.bottom ?? 5) + 13);
    const floor = floorLine(vw, vh);
    const ratio = rig.W / rig.H, thrower = kind === "classic" || kind === "wave";
    const edge = preview?.edge && edges.includes(preview.edge) ? preview.edge : pick(edges);
    let w: number, h: number;
    if (thrower) {
      // The same share of the screen on every device (13% of the width; 16% on a car screen), and
      // never smaller than a comfortable tap target.
      const bottom = edge === "drift" ? vh - (phone ? 87 : 31) : floor;
      w = Math.min(car ? 380 : 340, Math.max(car ? 120 : phone ? 100 : 84, vw * (car ? .16 : .13)) * between(.92, 1.1), (bottom - top - 12) * ratio);
      if (w < 72) return null;
      h = w / ratio;
    } else {
      // The carolers sing smaller and out of the way.
      const carol = kind === "caroler" || kind === "trio" ? .66 : 1;
      const zoom = (car ? 1.15 : 1) * between(.9, 1.1) * carol;
      h = rig.ground ? Math.min(400, Math.max(170, vh * (phone ? .3 : .35))) * zoom
        : Math.min(300, Math.max(120, vh * (phone ? .24 : .27))) * zoom / rig.visible;
      const widest = vw * (kind === "trio" ? (phone ? .56 : .26) : (phone ? .5 : .3)) * (kind === "caroler" ? .75 : 1);
      if (h * ratio > widest) h = widest / ratio;
      // What shows must fit under the header (the backflip needs headroom for the jump).
      const shown = rig.ground ? h * (rig.ground / rig.H) * (kind === "backflip" ? 1.5 : 1) : h * rig.visible;
      if (shown > floor - top - 8) h *= (floor - top - 8) / shown;
      if (h < (carol < 1 ? 64 : 90) || h * ratio < 48) return null;
      w = h * ratio;
    }
    const avoid = [...actors.values()].map(a => a.box);
    const shownBottom = (box: Box) => thrower ? box.y + box.h * .86 : Math.min(floor, box.y + box.h);
    const room = (box: Box, headroom = 0) => clear(box, shownBottom(box), top + headroom, avoid);

    if (edge === "drift") {
      const offset = Math.floor(Math.random() * drifts.length);
      const bottom = vh - (phone ? 87 : 31);
      for (let i = 0; i < drifts.length; i++) {
        const [rx, ry] = drifts[(i + offset) % drifts.length];
        const jitter = (v: number) => Math.max(0, Math.min(1, v + between(-.08, .08)));
        const box = { x: Math.round(10 + jitter(rx) * (vw - w - 20)), y: Math.round(top + jitter(ry) * (bottom - top - h)), w, h };
        if (lastDrift && Math.hypot((box.x - lastDrift.x) / vw, (box.y - lastDrift.y) / vh) < .18) continue;
        if (room(box)) { lastDrift = box; return { edge, box, cut: 0, tilt: 0, hide: 0 }; }
      }
      return null;
    }
    if (edge === "floor") {
      const leadLeft = lead ? lead.box.x + lead.box.w / 2 < vw / 2 : null;
      for (let i = 0; i < 12; i++) {
        const zone = leadLeft === null ? pick(["left", "left", "right", "right", "middle"]) : leadLeft ? "right" : "left";
        const spread = zone === "left" ? between(0, .3) : zone === "right" ? between(.7, 1) : between(.35, .65);
        const x = Math.round(8 + spread * Math.max(0, vw - w - 16));
        const y = thrower ? floor - h : rig.ground ? floor - h * rig.ground / rig.H + h * .012 : floor - h * rig.visible;
        const box = { x, y: Math.round(y), w, h };
        if (room(box, kind === "backflip" ? h * .52 : 0)) {
          return { edge, box, cut: thrower ? 0 : Math.max(0, box.y + h - floor), tilt: thrower ? 0 : between(-1.5, 1.5), hide: 0 };
        }
      }
      return null;
    }
    // Corner peeks lean in from a side edge, a third of them hidden past it.
    const hide = between(.24, .34), left = edge === "corner-left";
    const box = { x: Math.round(left ? -hide * w : vw - (1 - hide) * w), y: Math.round(floor - h * rig.visible * between(.92, 1)), w, h };
    if (!room(box)) return null;
    return { edge, box, cut: Math.max(0, box.y + h - floor), tilt: (left ? 1 : -1) * between(9, 13), hide };
  }

  function clear(box: Box, shownBottom: number, top: number, avoid: Box[]) {
    const vw = document.documentElement.clientWidth;
    const left = Math.max(0, box.x), right = Math.min(vw, box.x + box.w), upper = box.y, lower = Math.min(shownBottom, box.y + box.h);
    if (upper < top || right - left < 40 || lower - upper < 40) return false;
    const inset = { left: left + (right - left) * .12, right: right - (right - left) * .12, top: upper + (lower - upper) * .04, bottom: lower - (lower - upper) * .04 };
    const overlaps = (r: { left: number; right: number; top: number; bottom: number }) => r.right > inset.left && r.left < inset.right && r.bottom > inset.top && r.top < inset.bottom;
    if ([...document.querySelectorAll(excluded)].some(node => { const r = node.getBoundingClientRect(); return r.width && r.height && overlaps(r); })) return false;
    if (avoid.some(b => b.x < right + 24 && b.x + b.w > left - 24 && b.y < lower && b.y + b.h > upper)) return false;
    return samples.every(([px, py]) => !document.elementFromPoint(left + px * (right - left), upper + py * (lower - upper))?.closest(controls));
  }

  async function enter(c: Casting, token: number, lead: Actor | null): Promise<Actor | null> {
    const look = costume(c);
    try { await Promise.all(Object.values(look.rig.frames).map(f => loadArt(f.src))); } catch { return null; }
    if (disposed || token !== stamp || guarded() || (lead && !actors.has(lead.id))) return null;
    const spot = place(c.kind, look.rig, look.edges, lead);
    if (!spot) return null;
    const vw = document.documentElement.clientWidth, middle = spot.box.x + spot.box.w / 2;
    const tough = preview?.tough || ({ classic: pick([1, 2]), wave: pick([1, 2]), peek: pick([2, 3, 3]), serenade: 2, backflip: 1, caroler: 2, trio: pick([2, 3]) } satisfies Record<Kind, number>)[c.kind];
    const actor: Actor = {
      id: ++serial, kind: c.kind, people: c.people, name: look.name, rig: look.rig, ...spot,
      talk: spot.edge === "corner-left" || middle < vw * .38 ? "right" : spot.edge === "corner-right" || middle > vw * .62 ? "left" : "center",
      phase: "rise", frame: c.kind === "peek" && spot.edge !== "corner-left" && Math.random() < .6 ? "hello" : look.frame,
      bubble: "", mood: "", notes: "", fast: false, slow: false,
      hits: 0, toughness: tough, hittable: false, incoming: false, girl: 1,
      release: c.release, run: null, lead: null, companion: null,
    };
    actors.set(actor.id, actor);
    commit();
    return actor;
  }

  async function appear() {
    if (actors.size || disposed) return;
    if (guarded()) { schedule(850); return; }
    const allowed: Kind[] | null = forced === "duet" ? ["serenade"] : forced ? [forced] : null;
    const c = cast(allowed, lastPeople);
    if (!c) {
      if (castings.some(k => k.casts.some(people => people.every(p => !gone.has(p))))) schedule(forced ? 1000 : 4000);
      return;
    }
    const token = ++stamp;
    pause();
    loadingArt = true;
    const actor = await enter(c, token, null).finally(() => { loadingArt = false; });
    if (!actor) { c.release(); if (!disposed && token === stamp && !actors.size) schedule(guarded() ? 1200 : 1700); return; }
    lastPeople = actor.people;
    lastKind = actor.kind;
    begin(actor);
    void duet(actor, token);
  }

  /** Wide desktops only: now and then a second singer joins in (Braeden's guitar with the carolers). */
  async function duet(lead: Actor, token: number) {
    if (forced !== "duet" && (forced || window.innerWidth < 1280 || Math.random() > .35)) return;
    if (lead.kind !== "serenade" && lead.kind !== "caroler" && lead.kind !== "trio") return;
    await new Promise(resolve => window.setTimeout(resolve, 1100));
    if (disposed || token !== stamp || !actors.has(lead.id) || actors.size > 1 || lead.phase === "retreat" || guarded()) return;
    const c = cast(lead.kind === "serenade" ? ["trio", "caroler"] : ["serenade"], lead.people);
    if (!c) return;
    const companion = await enter(c, token, lead);
    if (!companion) { c.release(); return; }
    companion.lead = lead;
    lead.companion = companion;
    lastPeople = [...lead.people, ...companion.people];
    begin(companion);
  }

  function begin(actor: Actor) {
    if (preview) env.history(`${actor.kind}:${actor.people.join("+")}`);
    const intro: Record<Kind, string> = {
      classic: `${actor.name} pops out of the snow and winds up a snowball.`,
      wave: `${actor.name} pops up and waves hello, then winds up a snowball.`,
      serenade: "Braeden pops up in his sombrero and serenades you on guitar.",
      backflip: "Dylan pops up and tries a backflip.",
      peek: `${actor.name} peeks up from the bottom of the screen.`,
      caroler: "A caroler pops up singing Fa la la.",
      trio: "Three carolers pop up singing.",
    };
    env.say(`${intro[actor.kind]} Press Alt Shift S to throw a snowball at ${actor.name}.`);
    perform(actor);
  }

  // Positions on screen of a point on the character's stage, through every lean, bounce and jolt.
  function anchor(actor: Actor, [x, y]: XY): Point {
    const ref = element(actor)?.querySelector<SVGGraphicsElement>("[data-stage-ref]");
    const matrix = ref?.getScreenCTM();
    if (matrix) { const p = new DOMPoint(x, y).matrixTransform(matrix); return { x: p.x, y: p.y }; }
    return { x: actor.box.x + x / actor.rig.W * actor.box.w, y: actor.box.y + y / actor.rig.H * actor.box.h };
  }
  function stagePoint(actor: Actor, at: Point) {
    const matrix = element(actor)?.querySelector<SVGGraphicsElement>("[data-stage-ref]")?.getScreenCTM();
    if (!matrix) return null;
    return new DOMPoint(at.x, at.y).matrixTransform(matrix.inverse());
  }
  /** Is there painted character (not transparent space, not the snow or the floor) at this point? */
  function inkAt(actor: Actor, x: number, y: number) {
    if (x < 0 || x > window.innerWidth) return false;
    const bottom = actor.kind === "classic" || actor.kind === "wave" ? actor.box.y + actor.box.h * .86 : actor.box.y + actor.box.h - actor.cut;
    if (y > bottom) return false;
    const root = element(actor);
    if (!root) return false;
    for (const picture of root.querySelectorAll<SVGSVGElement>("svg[data-frame]")) {
      if (Number(getComputedStyle(picture).opacity) < .5) continue;
      const pose = actor.rig.frames[picture.dataset.frame ?? ""];
      const matrix = picture.querySelector("image")?.getScreenCTM();
      if (!pose || !matrix) continue;
      const p = new DOMPoint(x, y).matrixTransform(matrix.inverse());
      if (p.x < 0 || p.y < 0 || p.x >= pose.w || p.y >= pose.h) continue;
      const mask = masks.get(pose.src);
      if (!mask || mask.alpha[Math.floor(p.y / pose.h * mask.h) * mask.w + Math.floor(p.x / pose.w * mask.w)] > 70) return true;
    }
    return false;
  }

  /** A snowball from the character at the visitor's screen. */
  function pelt(from: Point, lob = false) {
    const to = { x: window.innerWidth * between(.3, .7), y: window.innerHeight * between(.3, .62) };
    void throwSnowball({ from, to, toward: "viewer", splat: "none", arc: lob ? between(150, 210) : undefined, onImpact: at => splash(at, "smack") });
  }
  /** Small and quick: a hit puff is gone in about a quarter of a second. */
  function splash(at: Point, kind: "puff" | "smack") {
    const layer = env.fx();
    if (!layer || disposed) return;
    const d = kind === "puff" ? Math.min(40, Math.max(24, window.innerWidth * .024)) : Math.min(84, Math.max(46, window.innerWidth * .05));
    const bits = [document.createElement("i")];
    bits[0].className = kind === "puff" ? styles.puff : styles.smack;
    bits[0].style.cssText = `left:${at.x}px;top:${at.y}px;--d:${d}px`;
    const flecks = reducedMotion() ? 0 : kind === "puff" ? 4 : 6;
    for (let i = 0; i < flecks; i++) {
      const fleck = document.createElement("i"), angle = i / flecks * Math.PI * 2 + Math.random() * .6, reach = d * between(.5, .85);
      fleck.className = styles.fleck;
      fleck.style.cssText = `left:${at.x}px;top:${at.y}px;--fx:${(Math.cos(angle) * reach).toFixed(1)}px;--fy:${(Math.sin(angle) * reach).toFixed(1)}px`;
      bits.push(fleck);
    }
    bits.forEach(bit => layer.appendChild(bit));
    window.setTimeout(() => bits.forEach(bit => bit.remove()), 280);
  }
  /** Ragdoll: knocked away from the hit, wobbling loosely back. */
  function ragdoll(actor: Actor, power: number, from?: Point) {
    const stage = element(actor)?.querySelector<HTMLElement>("[data-stage]");
    if (!stage || reducedMotion()) return;
    const away = from && from.x > actor.box.x + actor.box.w / 2 ? -1 : 1;
    const r = 10 * power * away, t = 7 * power * away;
    stage.animate([
      { rotate: "0deg", translate: "0 0", scale: "1 1" },
      { rotate: `${r}deg`, translate: `${t}px ${-3 * power}px`, scale: "1.04 .95", offset: .14 },
      { rotate: `${-r * .7}deg`, translate: `${-t * .55}px 0`, scale: ".97 1.03", offset: .34 },
      { rotate: `${r * .42}deg`, translate: `${t * .25}px 0`, scale: "1 1", offset: .56 },
      { rotate: `${-r * .18}deg`, offset: .78 },
      { rotate: "0deg", translate: "0 0", scale: "1 1" },
    ], { duration: 680 + 180 * power, easing: "cubic-bezier(.2,.7,.3,1)" });
  }

  async function volley(actor: Actor, wait: Wait) {
    set(actor, { phase: "throw", frame: "windup", hittable: false });
    await wait(280);
    set(actor, { frame: "release" });
    // The ball leaves the release pose's hand the moment that picture is up.
    window.requestAnimationFrame(() => { if (actors.has(actor.id) && actor.rig.ball) pelt(anchor(actor, actor.rig.ball)); });
    await wait(340);
  }
  function ready(actor: Actor, pose: string) {
    set(actor, { phase: "idle", frame: pose, hittable: true });
    env.say(`${actor.name} threw a snowball at you. Use the throw-back button or press Alt Shift S to return it.`);
  }
  /** Peek: a quick lift as a snowball comes up from the hand just out of frame (they stay up: one rise per visit). */
  async function toss(actor: Actor, wait: Wait) {
    set(actor, { phase: "toss", frame: "excited", hittable: false });
    await wait(140);
    const inward = actor.box.x + actor.box.w / 2 < window.innerWidth / 2;
    pelt(anchor(actor, [actor.rig.W * (inward ? .84 : .16), actor.rig.H * actor.rig.visible * .96]), true);
    env.say(`${actor.name} lobs a snowball at you. Press Alt Shift S to throw one back.`);
    await wait(300);
    set(actor, { phase: "idle", hittable: true });
  }
  async function sing(actor: Actor, wait: Wait, lines: number) {
    const song = actor.kind === "trio" ? trioSong : soloSong;
    let line = Math.floor(Math.random() * song.length);
    for (let i = 0; i < lines; i++) { set(actor, { bubble: song[line++ % song.length] }); await wait(1900); }
  }
  async function finale(actor: Actor, wait: Wait) {
    set(actor, { phase: "pose", frame: "s4", bubble: "¡Olé!", notes: "", fast: false });
    await wait(700);
    set(actor, { frame: "s1" });
    await wait(900);
  }
  async function retreat(actor: Actor, wait: Wait, slow = false) {
    // A keyboard user on the throw-back button keeps the character until they move on.
    while (actor.hittable && element(actor)?.contains(document.activeElement)) await wait(1200);
    set(actor, { phase: "retreat", hittable: false, bubble: "", notes: "", slow });
    await wait(slow ? 1080 : 520);
    remove(actor);
  }

  function perform(actor: Actor) {
    play(actor, async wait => {
      switch (actor.kind) {
        case "classic":
          await wait(720);
          await volley(actor, wait);
          ready(actor, Math.random() < .35 ? "wave" : "boo");
          await wait(8500);
          break;
        case "wave":
          await wait(720);
          set(actor, { phase: "wave", hittable: true });
          await wait(1720);
          await volley(actor, wait);
          ready(actor, "wave");
          await wait(8000);
          break;
        case "serenade":
          await wait(700);
          set(actor, { phase: "pose", hittable: true, bubble: "¡Feliz Navidad!" });
          await wait(1100);
          set(actor, { phase: "strum", frame: "", bubble: "", notes: "song" });
          await wait(1840 * 2);
          await finale(actor, wait);
          break;
        case "backflip":
          await wait(650);
          set(actor, { phase: "wave", hittable: true, bubble: "Watch this!" });
          await wait(1350);
          set(actor, { phase: "crouch", frame: "f1", bubble: "" });
          await wait(420);
          if (!reducedMotion()) { set(actor, { phase: "flip", frame: "", hittable: false }); await wait(1120); }
          set(actor, { phase: "land", frame: "f5", hittable: true, bubble: "Ta-da!" });
          await wait(1900);
          set(actor, { bubble: "" });
          await wait(1500);
          break;
        case "peek":
          await wait(720);
          if (actor.frame === "hello") { set(actor, { phase: "wave", hittable: true }); await wait(1600); }
          else { set(actor, { phase: "idle", hittable: true }); await wait(700); }
          await toss(actor, wait);
          await wait(7000);
          break;
        case "caroler":
        case "trio":
          await wait(700);
          set(actor, { phase: "sing", hittable: true, notes: "song" });
          await sing(actor, wait, actor.kind === "trio" ? 4 : 3);
          set(actor, { bubble: "♪ Merry Christmas! ♪" });
          await wait(1600);
          break;
      }
      await retreat(actor, wait);
    });
  }

  /** The visitor throws: scared faces while the ball is on its way, the reaction when it lands. */
  function counter(actor: Actor, at?: Point) {
    if (!actors.has(actor.id) || !actor.hittable || actor.incoming || guarded()) return;
    actor.incoming = true;
    set(actor, actor.rig.frames.scared ? { hittable: false, frame: "scared", phase: "idle" } : { hittable: false });
    const target = at ?? anchor(actor, actor.rig.faces[Math.min(actor.girl, actor.rig.faces.length - 1)]);
    // A ball that never lands counts as a miss, and they leave.
    play(actor, async wait => { await wait(2600); actor.incoming = false; await retreat(actor, wait); });
    void visitorThrow(target, { splat: "none", onImpact: () => impact(actor, target) });
  }
  function impact(actor: Actor, at: Point) {
    if (disposed || !actors.has(actor.id) || !actor.incoming) return;
    actor.incoming = false;
    actor.hits++;
    splash(at, "puff");
    if (actor.kind === "trio") {
      const p = stagePoint(actor, at);
      if (p) actor.girl = actor.rig.faces.reduce((best, face, i) => Math.abs(face[0] - p.x) < Math.abs(actor.rig.faces[best][0] - p.x) ? i : best, 0);
    }
    const done = actor.hits >= actor.toughness;
    if (done) { actor.people.forEach(person => gone.add(person)); env.dismissed([...gone].join(" ")); }
    ragdoll(actor, done ? 1.2 : .85, at);
    react(actor, done);
  }
  function react(actor: Actor, done: boolean) {
    play(actor, async wait => {
      switch (actor.kind) {
        case "classic":
        case "wave":
          set(actor, { phase: "hit", frame: "mad" });
          env.say(done ? `Direct hit! ${actor.name} dives back into the snow.` : `Direct hit! ${actor.name} brushes off the snow and reloads.`);
          if (done) { await wait(950); break; }
          await wait(1050);
          await volley(actor, wait);
          ready(actor, Math.random() < .5 ? "wave" : "boo");
          await wait(6500);
          break;
        case "peek":
          if (done && actor.hits >= 3) {
            // Three in a row: motion sick, green, and slowly sinking away.
            set(actor, { phase: "woozy", frame: "nauseous" });
            env.say(`Three direct hits! ${actor.name} turns a little green and sinks out of sight.`);
            await wait(1800);
            await retreat(actor, wait, true);
            return;
          }
          set(actor, { phase: "hit", frame: "scared" });
          env.say(done ? `Direct hit! ${actor.name} ducks out of sight.` : `Direct hit! ${actor.name} shakes it off.`);
          if (done) { await wait(700); break; }
          await wait(750);
          set(actor, { phase: "idle", frame: "excited" });
          await wait(700);
          await toss(actor, wait);
          await wait(6000);
          break;
        case "serenade":
          set(actor, { phase: "hit", frame: "s3", notes: "sour", bubble: done ? "¡Ay, ay, ay!" : "¡Ay!", mood: "cross" });
          env.say(done ? "Direct hit! Braeden's serenade is over." : "Direct hit! Braeden hits a sour note but keeps playing, faster.");
          await wait(900);
          if (done) break;
          set(actor, { phase: "strum", frame: "", fast: true, notes: "song", bubble: "", mood: "", hittable: true });
          await wait(1300 * 2);
          await finale(actor, wait);
          break;
        case "backflip":
          set(actor, { phase: "hit", frame: actor.frame || "f5", bubble: "Whoa!", mood: "cross" });
          env.say("Direct hit! Dylan backflips right out of sight.");
          await wait(480);
          if (reducedMotion()) break;
          set(actor, { phase: "bail", frame: "", bubble: "", mood: "" });
          await wait(840);
          remove(actor);
          return;
        case "caroler":
        case "trio": {
          const many = actor.kind === "trio";
          set(actor, { phase: "duck", bubble: done ? "Fiddlesticks!" : "Hey!", mood: "cross", notes: "" });
          env.say(done ? `Direct hit! ${many ? "The carolers give up and duck away." : "The caroler gives up and ducks away."}`
            : `Direct hit! ${many ? "The carolers duck, then one lobs a snowball back." : "The caroler ducks, then lobs a snowball back."}`);
          if (done) { await wait(800); break; }
          await wait(650);
          set(actor, { phase: "indignant", bubble: "Hmph!" });
          await wait(700);
          set(actor, { phase: "lob", bubble: "" });
          await wait(310);
          const mitten = actor.rig.mittens?.[Math.min(actor.girl, actor.rig.mittens.length - 1)];
          if (mitten) pelt(anchor(actor, mitten), true);
          await wait(420);
          set(actor, { phase: "sing", bubble: "♪ …fa la la!", mood: "", notes: "song", hittable: true });
          await wait(1900);
          await sing(actor, wait, 1);
          set(actor, { bubble: "" });
          await wait(1100);
          break;
        }
      }
      await retreat(actor, wait);
    });
  }
  /** Throw at a character by id (the throw-back button), or at the newest one that can be hit. */
  function shoot(id?: number) {
    const target = id !== undefined ? actors.get(id) : [...actors.values()].reverse().find(a => a.hittable && !a.incoming);
    if (target) counter(target);
  }

  function conditions() {
    if (guarded()) {
      if (actors.size) clearAll(2500);
      else { stamp++; pause(); }
    } else if (!actors.size) schedule();
  }
  function resize() { if (actors.size) clearAll(1600); else conditions(); }
  function afterScroll() {
    window.clearTimeout(scrollCheck);
    if (!actors.size) return;
    scrollCheck = window.setTimeout(() => {
      for (const actor of [...actors.values()]) {
        const { x, y, w, h } = actor.box;
        const beneath = document.elementFromPoint(Math.min(window.innerWidth - 2, Math.max(2, x + w * .5)), y + Math.min(h * .4, (h - actor.cut) * .6));
        if (beneath?.closest(offLimits)) remove(actor, 1800);
      }
    }, 160);
  }
  const pointer = (event: PointerEvent) => { startX = event.clientX; startY = event.clientY; startType = event.pointerType; };
  function click(event: MouseEvent) {
    if (!actors.size || !event.detail || event.button || event.defaultPrevented || !(event.target instanceof Element) ||
        event.target.closest(offLimits) || Math.hypot(event.clientX - startX, event.clientY - startY) > tapSlop(startType)) return;
    // A finger tap that lands just off the costume still counts.
    const reach = reachSamples(touchReach(startType));
    const hit = [...actors.values()].reverse().find(a => a.hittable && !a.incoming && reach.some(([dx, dy]) => inkAt(a, event.clientX + dx, event.clientY + dy)));
    if (!hit) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    counter(hit, { x: event.clientX, y: event.clientY });
  }
  // Caught by the site-wide snowball fight: a quick jolt, no score.
  function struck(event: Event) {
    if (!(event.target instanceof Element) || !env.host()?.contains(event.target)) return;
    const root = event.target.closest<HTMLElement>("[data-actor]");
    const actor = root ? actors.get(Number(root.dataset.actor)) : undefined;
    if (actor?.hittable && !actor.incoming) ragdoll(actor, .55, (event as CustomEvent<{ from?: Point }>).detail?.from);
  }

  const abort = new AbortController(), signal = abort.signal;
  const focusOut = () => queueMicrotask(() => { if (!disposed) conditions(); });
  document.addEventListener("visibilitychange", conditions, { signal });
  window.addEventListener(snowballTimeoutEvent, conditions, { signal });
  document.addEventListener("focusin", event => { if (!env.host()?.contains(event.target as Node)) conditions(); }, { signal });
  document.addEventListener("focusout", focusOut, { signal });
  document.addEventListener("keydown", event => {
    if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.repeat && event.code === "KeyS" && !guarded()) {
      const target = [...actors.values()].reverse().find(a => a.hittable && !a.incoming);
      if (!target) return;
      event.preventDefault();
      counter(target);
    }
  }, { signal });
  document.addEventListener("pointerdown", pointer, { signal, passive: true, capture: true });
  document.addEventListener("pointermove", hover, { signal, passive: true, capture: true });
  document.addEventListener("click", click, { signal, capture: true });
  document.addEventListener("scroll", afterScroll, { signal, passive: true, capture: true });
  document.addEventListener("mems:snow-hit", struck, { signal });
  window.addEventListener("resize", resize, { signal, passive: true });
  const dialogs = new MutationObserver(changes => {
    const changed = changes.some(change => change.type === "attributes" ||
      [...change.addedNodes, ...change.removedNodes].some(node => node instanceof Element &&
        (node.matches('dialog,[aria-modal="true"]') || node.querySelector('dialog,[aria-modal="true"]'))));
    if (changed) conditions();
  });
  dialogs.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["open", "aria-modal", "aria-expanded"] });
  schedule();

  return {
    shoot,
    stop() {
      disposed = true; stamp++; pause(); window.clearTimeout(scrollCheck); window.cancelAnimationFrame(aimFrame);
      abort.abort(); dialogs.disconnect();
      for (const actor of actors.values()) { halt(actor); actor.release(); }
      actors.clear();
    },
  };
}

const pct = (n: number) => `${(n * 100).toFixed(3)}%`;

function Figure({ view, onShoot }: { view: View; onShoot: (id: number) => void }) {
  const { rig, box } = view;
  const shownAt = (box.h - view.cut) / box.h;
  const lean = view.tilt * Math.PI / 180;
  // Bubbles sit over the head's resting place (shifted along a corner lean) and open toward the page.
  const headX = rig.head[0] / rig.W * box.w + (box.h * shownAt - rig.head[1] / rig.H * box.h) * Math.sin(lean);
  const headY = rig.head[1] / rig.H * box.h + (view.edge === "drift" ? 4 : -4);
  const face = rig.faces[0];
  const style = {
    "--x": box.x + "px", "--y": box.y + "px", "--w": box.w + "px", "--h": box.h + "px",
    "--cut": view.cut + "px", "--tilt": view.tilt + "deg", "--side": view.edge === "corner-right" ? -1 : 1,
    "--pivot": view.edge === "corner-left" ? `${pct(view.hide)} ${pct(shownAt)}` : view.edge === "corner-right" ? `${pct(1 - view.hide)} ${pct(shownAt)}` : "50% 100%",
    "--floor-at": pct(shownAt), "--duck": pct(rig.ground ? .8 : rig.visible * .84),
    "--bx": headX + "px", "--by": headY + "px",
    // Song notes float up beside the singer, on the open side, never across the face.
    "--nx": (rig.mouth?.[0] ?? 0) / rig.W * box.w + (view.talk === "left" ? -1 : 1) * Math.min(box.w * .26, box.h * .16) + "px",
    "--ny": (rig.mouth?.[1] ?? 0) / rig.H * box.h + "px", "--dir": view.talk === "left" ? -1 : 1,
    "--cx": pct(face[0] / rig.W), "--cy": pct(face[1] / rig.H), "--cw": Math.max(44, box.w * .34) + "px",
  } as CSSProperties;
  const stand = rig.ground !== undefined;
  return (
    <div className={styles.actor} data-actor={view.id} data-snow-ambush={view.people.join(" ")} data-kind={view.kind} data-edge={view.edge}
      data-phase={view.phase} data-frame={view.frame || undefined} data-hits={view.hits} data-stand={stand || undefined}
      data-fast={view.fast || undefined} data-slow={view.slow || undefined} style={style}>
      {(view.edge === "drift" || stand || ((view.kind === "classic" || view.kind === "wave") && view.edge === "floor")) && <div className={styles.drift} />}
      <div className={styles.clip} aria-hidden="true"><div className={styles.lean}><div className={styles.rise}><div className={styles.motion}>
        <div className={styles.stage} data-stage="">
          {Object.entries(rig.frames).map(([key, pose]) => (
            <svg key={key} className={styles.frame} data-frame={key} data-on={view.frame === key || undefined} viewBox={`0 0 ${pose.w} ${pose.h}`}
              preserveAspectRatio="none" focusable="false"
              style={{ left: pct(pose.x / rig.W), top: pct(pose.y / rig.H), width: pct(pose.w * pose.s / rig.W), height: pct(pose.h * pose.s / rig.H) }}>
              <image href={pose.src} width={pose.w} height={pose.h} preserveAspectRatio="none" />
            </svg>
          ))}
          {view.kind === "classic" && rig.hand && <i className={styles.gloveBall} style={{ left: pct(rig.hand[0] / rig.W), top: pct(rig.hand[1] / rig.H) }} />}
          <svg className={styles.stageRef} viewBox={`0 0 ${rig.W} ${rig.H}`} preserveAspectRatio="none" focusable="false">
            <rect data-stage-ref="" width={rig.W} height={rig.H} fill="none" />
          </svg>
        </div>
      </div></div></div></div>
      <i className={styles.target} data-snow-fighter={view.people.join(" ")} data-snow-role="target" data-snow-own-click="" aria-hidden="true" />
      {view.notes && rig.mouth && <span className={styles.notes} data-sour={view.notes === "sour" || undefined} aria-hidden="true"><i>♪</i><i>♫</i><i>♪</i></span>}
      {view.bubble && <span key={view.bubble} className={styles.bubble} data-side={view.talk} data-mood={view.mood || undefined} aria-hidden="true">{view.bubble}</span>}
      {view.hittable && <i className={styles.aim} data-snow-target="" aria-hidden="true" />}
      {view.hittable && <button type="button" className={styles.counter} aria-keyshortcuts="Alt+Shift+S"
        aria-label={`Throw a snowball back at ${view.name}`} onClick={() => onShoot(view.id)} />}
    </div>
  );
}

const noSubscription = () => () => {};
const clientBody = () => document.body;
const serverBody = () => null;

export default function WinterSnowballAmbush({ pathname }: { pathname: string }) {
  const body = useSyncExternalStore<HTMLElement | null>(noSubscription, clientBody, serverBody);
  const [views, setViews] = useState<View[]>([]);
  const [notice, setNotice] = useState("");
  const [dismissed, setDismissed] = useState("");
  const [history, setHistory] = useState("");
  const host = useRef<HTMLDivElement>(null);
  const fx = useRef<HTMLDivElement>(null);
  const shoot = useRef<(id?: number) => void>(() => {});

  useEffect(() => {
    const show = runCast({
      host: () => host.current, fx: () => fx.current,
      render: setViews, say: setNotice, dismissed: setDismissed,
      history: entry => setHistory(list => (list ? list + " " : "") + entry),
    });
    shoot.current = show.shoot;
    return () => { shoot.current = () => {}; show.stop(); };
  }, []);

  if (!body) return null;
  return createPortal(
    <div ref={host} className={styles.overlay} data-snow-ambush-host="" data-route={pathname}
      data-dismissed={dismissed || undefined} data-history={history || undefined}>
      {views.map(view => <Figure key={view.id} view={view} onShoot={id => shoot.current(id)} />)}
      <div ref={fx} />
      <span role="status" className={styles.sr}>{notice}</span>
    </div>,
    body,
  );
}
