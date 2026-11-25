"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { isSnowballTimeout, snowballTimeoutEvent } from "@/lib/seasonal/snowballTimeout";
import { holdLane, laneClaimed, subscribeLane, type LaneSpan } from "@/lib/seasonal/driveLane";
import { finishRescue, hangingCrew, rescueChief, type CrewChief, type HangingCrewMember } from "./WinterRoofline";
import styles from "./WinterLadderRescue.module.css";

// Santa's ladder rescue, started by the living room's pull station (WinterPullStation). Ladder 3919
// drives in along the bottom of the screen with its lights going (the street, where the drive-bys
// run: the crew hang from the roofline above it), parks under the crew and raises its aerial ladder
// up to the roofline. Santa climbs it and, one by one, lowers each crew member down from the lights
// on a rope run over the ladder's tip, right to left; the truck creeps along the street (and swings
// its turntable round when it must) so Santa can reach each of them. Each one lands at the bottom of
// the screen (in the foreground, nearer than the truck), waves thanks and ducks off like the pop-ups.
// Then Santa climbs down, the ladder comes down and the truck drives off with him on the back.
//
// The truck is a puppet cut from the kit's Ladder 3919 art: body, Christmas lights, headlights and
// roof light bar, plus the ladder's base section and its fly section, which slides out of the base.
// Santa climbs with the kit's climbing poses, swapped crisply rung by rung. The crew are their own
// figures from the Christmas lights (WinterRoofline hands them over) until they land, where the kit
// crew and Gabby swap to their waving art; Kenny and Jen cheer with both fists up.
// Time Out freezes it where it is; reduced motion shows a short sequence of stills instead.

const ART = "/images/winter/kit/ladder-rescue";
const POP = "/images/winter/kit/pop";

// The truck body (1154 x 507 art px): the ladder's turntable pivot, Santa's spot on the rear deck and
// the front wheel's ground line.
const BODY = { w: 1154, h: 507, pivot: [957.5, 83.5], deck: [1093, 158], ground: 504 } as const;
// The ladder in its own art px: the turntable pivot, the base section's span, the top chord Santa
// stands on, the rope's point at the tip (on the fly section) and how far the fly slides out.
const LAD = { pivot: [981.15, 160.71], base: 462, chord: 85, tip: [96, 122], extend: 1850 } as const;
const LAD_A = LAD.pivot[0] - LAD.tip[0], LAD_B = LAD.pivot[1] - LAD.tip[1];
// Santa's poses (facing left, art px): their size, the foot he stands on and the raised hand.
const POSES = {
  climb1: { src: `${ART}/santa-climb-1.webp`, w: 168, h: 442, foot: [125, 440], hand: [16, 8] },
  climb2: { src: `${ART}/santa-climb-2.webp`, w: 189, h: 427, foot: [150, 425], hand: [15, 8] },
  stand: { src: `${ART}/santa-stand.webp`, w: 217, h: 403, foot: [183, 401], hand: [52, 210] },
} as const;
type SantaPose = keyof typeof POSES;
const SANTA_TALL = 403;
// The crew's thank-you art at the bottom edge, sized so each face matches its figure on the lights
// (k: art height in hanging-box heights; edge: the share of the art above the bottom of the screen).
const WAVES: Partial<Record<CrewChief, { src: string; w: number; h: number; k: number; edge: number }>> = {
  kalista: { src: `${POP}/kalista-wave.webp`, w: 238, h: 619, k: .87, edge: .5 },
  dylan: { src: `${POP}/dylan-wave.webp`, w: 265, h: 619, k: .97, edge: .5 },
  braeden: { src: `${POP}/braeden-wave.webp`, w: 269, h: 619, k: 1.145, edge: .5 },
  gabby: { src: `${POP}/gabby-happy.webp`, w: 380, h: 501, k: .44, edge: .99 },
};
// Kenny and Jen keep their own painted figures and cheer, fists up (their light strand stays behind).
const CHEERS: Partial<Record<CrewChief, string>> = {
  kenny: "/images/winter/kenny/hanging.webp",
  jen: "/images/winter/jen-tree/hanging.webp",
};
const THANKS: Record<CrewChief, string> = {
  jen: "Thank you, Santa!", gabby: "My hero!", dylan: "Thanks, big guy!", braeden: "¡Gracias, Santa!",
  kalista: "Best rescue ever!", kenny: "Thanks, Santa! Want some coal?", "medical-director": "Thank you, Santa!",
};
const SANTA_LINES = ["Ho ho ho! Grab the rope!", "Hold on tight!", "Easy does it…", "I've got you!", "Down you go!"];
const LAST_LINE = "Ho ho ho! Last one!";
const TRUCK_ART = ["truck-body", "ladder-base", "ladder-base-mirror", "ladder-fly", "truck-twinkle-0", "truck-twinkle-1", "truck-left", "truck-right", "truck-bar-a", "truck-bar-b"];

type Pt = { x: number; y: number };
type Ladder = { a: number; d: number; c: number };
type Layout = {
  vw: number; vh: number; top: number; edge: number; ground: number; S: number; truckW: number; truckH: number;
  pivotY: number; sigma: number; santaH: number; crewH: number; small: boolean;
};
type Plan = { member: HangingCrewMember; px: number; ladder: Ladder; tip: Pt; sx: number | null; cost: number };
type Bubble = { el: HTMLElement; anim: Animation; place: () => void };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t * t;
const deg = (r: number) => r * 180 / Math.PI;

function measureLayout(): Layout {
  const vw = document.documentElement.clientWidth, vh = window.innerHeight;
  const crew = hangingCrew();
  const header = document.querySelector<HTMLElement>("header.mems-site-nav")?.getBoundingClientRect();
  const grips = crew.map(m => m.y);
  const top = header && header.height > 0 && header.bottom > 0 ? header.bottom : grips.length ? Math.min(...grips) + 6 : 0;
  const tabs = document.querySelector('[data-menu-opener="tabbar"]')?.closest<HTMLElement>(".fixed")?.getBoundingClientRect();
  const edge = tabs && tabs.height > 0 && tabs.top < vh ? tabs.top : vh;
  const crewH = crew.length ? Math.max(...crew.map(m => m.height)) : vh * .3;
  const small = vw < 701;
  const truckH = Math.max(40, Math.min(vh * .33, (small ? .92 : .62) * vw * BODY.h / BODY.w, crewH * 1.15));
  const S = truckH / BODY.h;
  const ground = edge - (small ? 4 : 8);
  const santaH = truckH * .64;
  return {
    vw, vh, top, edge, ground, S, truckW: BODY.w * S, truckH, pivotY: ground - (BODY.ground - BODY.pivot[1]) * S,
    sigma: santaH / SANTA_TALL, santaH, crewH, small,
  };
}

/** A point on the ladder (its own art px; on the fly section it slides out with the extension). */
function ladderPoint(L: Layout, px: number, lad: Ladder, lx: number, ly: number, fly: boolean): Pt {
  const x = (lx - (fly ? lad.d : 0) - LAD.pivot[0]) * L.S, y = (ly - LAD.pivot[1]) * L.S;
  const cos = Math.cos(lad.a), sin = Math.sin(lad.a);
  return { x: px + (x * cos - y * sin) * lad.c, y: L.pivotY + x * sin + y * cos };
}
const tipOf = (L: Layout, px: number, lad: Ladder) => ladderPoint(L, px, lad, LAD.tip[0], LAD.tip[1], true);

/** The elevation and extension that put the rope point at the tip on target (c: 1 tip left, -1 tip right). */
function aimAt(L: Layout, px: number, c: 1 | -1, tip: Pt): Ladder | null {
  const rx = (tip.x - px) * c, ry = tip.y - L.pivotY;
  const r2 = (rx * rx + ry * ry) / (L.S * L.S) - LAD_B * LAD_B;
  if (r2 <= 0) return null;
  const d = Math.sqrt(r2) - LAD_A;
  if (d < -1 || d > LAD.extend) return null;
  const a = Math.atan2(ry, rx) - Math.atan2(-LAD_B, -(LAD_A + Math.max(0, d)));
  const na = ((a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return { a: na, d: Math.max(0, d), c };
}

/** Santa's box for a pose with his foot at F (facing left unless mirrored). */
function santaBox(L: Layout, pose: SantaPose, foot: Pt, mirrored: boolean) {
  const p = POSES[pose];
  const left = foot.x - (mirrored ? p.w - p.foot[0] : p.foot[0]) * L.sigma, top = foot.y - p.foot[1] * L.sigma;
  return { left, top, right: left + p.w * L.sigma, bottom: top + p.h * L.sigma };
}
const climbPose = (lad: Ladder): SantaPose => deg(lad.a) > 34 ? "climb1" : "stand";

/** Where Santa stands on the ladder for this rescue: as near the tip as he can while his head stays
 *  below the roofline, he stays on screen and he isn't hidden behind the person he's lowering. */
function santaSpot(L: Layout, px: number, lad: Ladder, m: HangingCrewMember): number | null {
  const body = { left: m.x - m.width * .24, right: m.x + m.width * .24, top: m.y, bottom: m.y + m.height * .93 };
  const pose = climbPose(lad);
  for (let sx = LAD.tip[0] - lad.d + 150; sx <= 925; sx += 8) {
    const foot = ladderPoint(L, px, lad, sx, LAD.chord, false);
    if (foot.y > L.pivotY - L.santaH * .12) break;
    const box = santaBox(L, pose, foot, lad.c < 0);
    if (box.top < L.top + 4 || box.left < 2 || box.right > L.vw - 2) continue;
    const ox = Math.max(0, Math.min(box.right, body.right) - Math.max(box.left, body.left));
    const oy = Math.max(0, Math.min(box.bottom, body.bottom) - Math.max(box.top, body.top));
    if (ox * oy > (box.right - box.left) * (box.bottom - box.top) * .1) continue;
    return sx;
  }
  return null;
}

/** How a rescue would look with the turntable at px and the ladder to that side (lower is better). */
function evaluate(L: Layout, m: HangingCrewMember, px: number, c: 1 | -1, prevPx: number): Plan | null {
  const h = (px - m.x) * c;
  if (h < -3) return null;
  const lMin = Math.hypot(LAD_A, LAD_B) * L.S;
  const reach = Math.hypot(h, L.pivotY - m.y);
  const tip = reach >= lMin ? { x: m.x, y: m.y - 1 } : { x: m.x, y: L.pivotY - Math.sqrt(Math.max(0, lMin * lMin - h * h)) - 1 };
  const ladder = aimAt(L, px, c, tip);
  if (!ladder) return null;
  const angle = deg(ladder.a);
  if (angle < 6 || angle > 93) return null;
  const sx = santaSpot(L, px, ladder, m);
  let cost = 0;
  if (sx === null) cost += 600;
  else {
    const foot = ladderPoint(L, px, ladder, sx, LAD.chord, false);
    const box = santaBox(L, climbPose(ladder), foot, c < 0);
    cost += Math.abs((box.left + box.right) / 2 - m.x) * .45 + Math.max(0, box.top - (m.y + m.height * .35)) * .25;
  }
  const left = px - BODY.pivot[0] * L.S, right = left + L.truckW;
  cost += Math.max(0, -left) * .5 + Math.max(0, right - L.vw) * .22;
  if (Number.isFinite(prevPx)) cost += Math.max(0, prevPx - px) * .06;
  if (angle < 24) cost += (24 - angle) * 6;
  if (angle > 86) cost += (angle - 86) * 12;
  if (tip.y < L.top) {
    const f = (L.pivotY - L.top) / (L.pivotY - tip.y);
    const offset = Math.abs(m.x - px) * (1 - f);
    cost += Math.max(0, offset - 48) * 4;
    if (tip.y < -L.vh * .25) cost += 120;
  }
  return { member: m, px, ladder, tip, sx, cost };
}

/** The best next rescue: plans the rest of the crew right to left (the truck only creeps forward,
 *  and the turntable may swing from the right side to the left once) and returns the first step. */
function planNext(L: Layout, crew: HangingCrewMember[], prevPx: number, prevC: 1 | -1): Plan | null {
  const order = [...crew].sort((a, b) => b.x - a.x);
  if (!order.length) return null;
  const lo = 14, hi = L.vw - 14, step = Math.max(5, L.vw / 180);
  let best: { cost: number; first: Plan } | null = null;
  const splits = prevC === 1 ? [0] : order.map((_, i) => i).concat(order.length);
  for (const split of splits) {
    let px = prevPx, c = prevC, total = 0, first: Plan | null = null, ok = true;
    for (let i = 0; i < order.length; i++) {
      const side: 1 | -1 = i < split ? -1 : 1;
      if (side !== c) total += 160;
      let pick: Plan | null = null;
      for (let x = Math.min(hi, px); x >= lo; x -= step) {
        const plan = evaluate(L, order[i], x, side, px);
        if (plan && (!pick || plan.cost < pick.cost)) pick = plan;
      }
      if (!pick) { ok = false; break; }
      total += pick.cost;
      first ??= pick;
      px = pick.px; c = side;
    }
    if (ok && first && (!best || total < best.cost)) best = { cost: total, first };
  }
  return best?.first ?? null;
}

const noBody = () => null;
const bodyOnClient = () => document.body;
const noSubscription = () => () => {};

/** The street along the bottom of the screen where the truck parks (the drive-by's lane), in viewport px. */
const streetBand = (): LaneSpan => ({ top: Math.round(window.innerHeight * .4), bottom: window.innerHeight });

export default function WinterLadderRescue({ still, onPhase }: { still: boolean; onPhase: (phase: "start" | "parked" | "done") => void }) {
  const body = useSyncExternalStore<HTMLElement | null>(noSubscription, bodyOnClient, noBody);
  const scene = useRef<HTMLDivElement>(null);
  const talk = useRef<HTMLDivElement>(null);
  const truck = useRef<HTMLDivElement>(null);
  const ladder = useRef<HTMLDivElement>(null);
  const fly = useRef<HTMLImageElement>(null);
  const santa = useRef<HTMLDivElement>(null);
  const ropes = useRef<SVGSVGElement>(null);
  const crewLayer = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(onPhase);
  useEffect(() => { phaseRef.current = onPhase; }, [onPhase]);
  const [ready, setReady] = useState(false);

  // Everything the rescue shows, decoded before the truck appears (the alarm covers the wait).
  useEffect(() => {
    let alive = true;
    const urls = [
      ...TRUCK_ART.map(name => `${ART}/${name}.webp`), ...Object.values(POSES).map(p => p.src),
      ...Object.values(WAVES).map(w => w!.src), ...Object.values(CHEERS),
    ];
    const one = (src: string) => new Promise<void>(done => {
      const img = new window.Image();
      img.decoding = "async";
      img.onload = () => { img.decode().then(() => done(), () => done()); };
      img.onerror = () => done();
      img.src = src;
    });
    const minimum = new Promise(done => window.setTimeout(done, still ? 400 : 1500));
    const cap = new Promise(done => window.setTimeout(done, 9000));
    // A drive-by already announced on the street (lib/seasonal/driveLane) goes by before the truck
    // pulls in, so the two never drive through each other (give up waiting after 25 s).
    const roadClear = () => new Promise<void>(done => {
      const street = streetBand();
      if (!laneClaimed(street)) { done(); return; }
      const finish = () => { window.clearTimeout(giveUp); stop(); done(); };
      const stop = subscribeLane(() => { if (!laneClaimed(street)) finish(); });
      const giveUp = window.setTimeout(finish, 25_000);
    });
    void Promise.race([Promise.all([Promise.all(urls.map(one)), minimum]), cap]).then(roadClear).then(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, [still]);

  // While Ladder 3919 is on the street, new drive-by passes wait for it (a hold lasts at most 20 s,
  // so it's renewed until the truck has gone).
  useEffect(() => {
    let release = holdLane("ladder-rescue", streetBand(), 20_000);
    const renew = window.setInterval(() => { release(); release = holdLane("ladder-rescue", streetBand(), 20_000); }, 15_000);
    return () => { window.clearInterval(renew); release(); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const sceneEl = scene.current, talkEl = talk.current, truckEl = truck.current, ladderEl = ladder.current;
    const flyEl = fly.current, santaEl = santa.current, ropeEl = ropes.current, crewEl = crewLayer.current;
    if (!sceneEl || !talkEl || !truckEl || !ladderEl || !flyEl || !santaEl || !ropeEl || !crewEl) return;
    const ropeMain = ropeEl.querySelector<SVGPathElement>("[data-rope=main]")!, ropeMainCore = ropeEl.querySelector<SVGPathElement>("[data-rope=main-core]")!;
    const ropeHand = ropeEl.querySelector<SVGPathElement>("[data-rope=hand]")!, ropeHandCore = ropeEl.querySelector<SVGPathElement>("[data-rope=hand-core]")!;
    const baseImg = ladderEl.querySelector<HTMLElement>("[data-base=plain]")!, baseMirror = ladderEl.querySelector<HTMLElement>("[data-base=mirror]")!;
    phaseRef.current("start");

    let layout = measureLayout();
    const sizeTo = (lay: Layout) => {
      sceneEl.style.setProperty("--s", lay.S.toFixed(5));
      sceneEl.style.setProperty("--sigma", lay.sigma.toFixed(5));
    };
    sizeTo(layout);

    // ---- The puppet's state ----
    let truckX = layout.vw + 30, bob = 0;
    let lad: Ladder = { a: 0, d: 0, c: 1 };
    const pivotX = () => truckX + BODY.pivot[0] * layout.S;
    let santaMode: "deck" | "ladder" = "deck";
    let santaSx = 925, santaPose: SantaPose = "climb1", santaHop = 0;
    let rope: { top: Pt; end: Pt; tail: number; swing: number; hand: boolean } | null = null;
    const bubbles: Bubble[] = [];
    type Actor = {
      chief: CrewChief; member: HangingCrewMember; handle: { element: HTMLDivElement; release: () => void } | null;
      landed: number; el: HTMLElement | null; x: number; top: number; height: number; width: number; leave: number; gone: boolean;
    };
    const actors: Actor[] = [];
    let rescued = 0;

    function say(text: string, anchor: () => Pt, side: "up" | "left" | "right", hold: number) {
      const el = document.createElement("span");
      el.className = styles.bubble;
      el.textContent = text;
      talkEl!.appendChild(el);
      const place = () => {
        const at = anchor(), w = el.offsetWidth, h = el.offsetHeight;
        let x = side === "up" ? at.x - w / 2 : side === "left" ? at.x - w - 10 : at.x + 10;
        let y = side === "up" ? at.y - h - 12 : at.y - h / 2;
        if (y < layout.top + 6) { y = layout.top + 6; }
        x = clamp(x, 8, layout.vw - w - 8);
        y = Math.min(y, layout.edge - h - 6);
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        el.dataset.tail = at.x < x + 16 ? "left" : at.x > x + w - 16 ? "right" : "mid";
      };
      place();
      const anim = el.animate(still ? [{ opacity: 1 }, { opacity: 1 }] : [
        { opacity: 0, scale: ".6" }, { opacity: 1, scale: "1.06", offset: .05 }, { opacity: 1, scale: "1", offset: .09 },
        { opacity: 1, scale: "1", offset: .92 }, { opacity: 0, scale: ".96" },
      ], { duration: hold, easing: "ease-out", fill: "both" });
      const entry: Bubble = { el, anim, place };
      bubbles.push(entry);
      const done = () => { el.remove(); const i = bubbles.indexOf(entry); if (i >= 0) bubbles.splice(i, 1); };
      anim.finished.then(done, done);
      return entry;
    }
    const santaHead = (): Pt => {
      const foot = santaFoot();
      const box = santaBox(layout, santaPose, foot, lad.c < 0 && santaMode === "ladder");
      return { x: (box.left + box.right) / 2, y: box.top + (box.bottom - box.top) * .14 };
    };

    function santaFoot(): Pt {
      const deck = { x: truckX + BODY.deck[0] * layout.S, y: layout.ground - (BODY.ground - BODY.deck[1]) * layout.S + bob };
      const onLadder = ladderPoint(layout, pivotX(), lad, santaSx, LAD.chord, false);
      onLadder.y += bob;
      if (santaMode === "deck") return santaHop > 0 ? { x: lerp(deck.x, onLadder.x, santaHop), y: lerp(deck.y, onLadder.y, santaHop) - Math.sin(santaHop * Math.PI) * layout.santaH * .12 } : deck;
      return onLadder;
    }

    // ---- Drawing ----
    function draw() {
      const S = layout.S;
      truckEl!.style.transform = `translate3d(${truckX.toFixed(2)}px, ${(layout.ground - BODY.ground * S + bob).toFixed(2)}px, 0)`;
      ladderEl!.style.transform = `scaleX(${lad.c.toFixed(4)}) rotate(${lad.a.toFixed(5)}rad)`;
      flyEl!.style.transform = `translate3d(${(-lad.d * S).toFixed(2)}px, 0, 0)`;
      const mirror = lad.c < 0;
      baseImg.style.visibility = mirror ? "hidden" : "visible";
      baseMirror.style.visibility = mirror ? "visible" : "hidden";
      // Santa: upright, facing up the ladder (left, or right once the turntable has swung round).
      const foot = santaFoot();
      const facingRight = santaMode === "ladder" && lad.c < 0;
      santaEl!.dataset.pose = santaPose;
      santaEl!.style.transform = `translate3d(${foot.x.toFixed(2)}px, ${foot.y.toFixed(2)}px, 0) scaleX(${facingRight ? -1 : 1})`;
      // The rope: from Santa's raised hand up to the tip, and from the tip down to whoever's on it.
      if (rope) {
        const p = POSES[santaPose];
        const hand = { x: foot.x + (facingRight ? -1 : 1) * (p.hand[0] - p.foot[0]) * layout.sigma, y: foot.y + (p.hand[1] - p.foot[1]) * layout.sigma };
        const tip = rope.top;
        const sag = Math.hypot(tip.x - hand.x, tip.y - hand.y) * .05;
        const handPath = rope.hand ? `M${hand.x.toFixed(1)} ${hand.y.toFixed(1)}Q${((hand.x + tip.x) / 2).toFixed(1)} ${((hand.y + tip.y) / 2 + sag).toFixed(1)} ${tip.x.toFixed(1)} ${tip.y.toFixed(1)}` : "";
        const end = rope.end, tail = rope.tail;
        const tx = end.x + Math.sin(rope.swing) * tail * .35;
        const mainPath = `M${tip.x.toFixed(1)} ${tip.y.toFixed(1)}L${end.x.toFixed(1)} ${end.y.toFixed(1)}Q${end.x.toFixed(1)} ${(end.y + tail * .6).toFixed(1)} ${tx.toFixed(1)} ${(end.y + tail).toFixed(1)}`;
        ropeHand.setAttribute("d", handPath); ropeHandCore.setAttribute("d", handPath);
        ropeMain.setAttribute("d", mainPath); ropeMainCore.setAttribute("d", mainPath);
      } else {
        for (const path of [ropeHand, ropeHandCore, ropeMain, ropeMainCore]) path.setAttribute("d", "");
      }
      bubbles.forEach(b => b.place());
    }

    // ---- The crew: from the lights to the bottom edge ----
    const landGrip = (m: HangingCrewMember) => layout.edge - m.height * .57;
    function hold(actor: Actor, x: number, y: number, angle: number) {
      const el = actor.handle?.element;
      if (el) el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${angle.toFixed(3)}deg)`;
    }
    function land(actor: Actor, now: number) {
      actor.landed = now;
      const m = actor.member;
      const wave = WAVES[actor.chief], cheer = CHEERS[actor.chief];
      const el = crewEl!.querySelector<HTMLElement>(`[data-crew="${actor.chief}"]`);
      if (el && (wave || cheer)) {
        const height = wave ? m.height * wave.k : m.height;
        const width = wave ? height * wave.w / wave.h : m.width;
        const top = wave ? layout.edge - height * wave.edge : landGrip(m) - m.height * .05;
        actor.el = el; actor.x = m.x; actor.top = top; actor.height = height; actor.width = width;
        el.style.width = `${width.toFixed(1)}px`; el.style.height = `${height.toFixed(1)}px`;
        el.style.visibility = "visible";
        placeActor(actor, 0, 0);
        actor.handle?.release();
        actor.handle = null;
      }
      const text = THANKS[actor.chief];
      say(text, () => ({ x: actor.x, y: actor.top + (actor.el ? actor.height * .02 : 0) }), "up", text.length > 20 ? 3200 : 2300);
      actor.leave = now + (text.length > 20 ? 3300 : 2600);
    }
    function placeActor(actor: Actor, lift: number, squash: number) {
      if (!actor.el) return;
      actor.el.style.transform = `translate3d(${(actor.x - actor.width / 2).toFixed(1)}px, ${(actor.top - lift).toFixed(1)}px, 0) scale(${(1 + squash * .5).toFixed(3)}, ${(1 - squash).toFixed(3)})`;
    }
    function updateActors(now: number) {
      for (const actor of actors) {
        if (actor.gone || !actor.landed) continue;
        const since = now - actor.landed;
        if (now >= actor.leave) {
          // Ducks off the bottom of the screen like the pop-ups: a little rise, then down and gone.
          const u = (now - actor.leave) / 520;
          const lift = u < .25 ? Math.sin(u / .25 * Math.PI / 2) * actor.height * .03 : -easeIn((u - .25) / .75) * actor.height * .75;
          placeActor(actor, lift, 0);
          if (u >= 1) { actor.gone = true; if (actor.el) actor.el.style.visibility = "hidden"; }
          continue;
        }
        // A landing squash, then a happy bounce (Kenny and Jen hop for joy, fists up).
        const squash = since < 180 ? Math.sin(since / 180 * Math.PI) * .06 : 0;
        const hop = CHEERS[actor.chief] && since > 200 ? Math.max(0, Math.sin((since - 200) / 430 * Math.PI)) * actor.height * .045 : 0;
        placeActor(actor, hop, squash);
      }
    }

    // ---- The timeline ----
    type Phase = { name: string; t0: number; run: (t: number) => boolean };
    let clock = 0, last = performance.now(), frame = 0, phase: Phase | null = null, finished = false;
    const queue: Array<() => Phase | null> = [];
    const begin = (name: string, run: (t: number) => boolean): Phase => ({ name, t0: clock, run });

    let current: Plan | null = null, currentActor: Actor | null = null;

    function arrive(): Phase {
      const plan = planNext(layout, hangingCrew(), Infinity, 1);
      current = plan;
      const parkX = plan ? plan.px - BODY.pivot[0] * layout.S : layout.vw * .4;
      const startX = layout.vw + 30;
      const dur = clamp((startX - parkX) / (layout.vw * .55) * 1000, 1700, 3000);
      truckX = startX;
      return begin("arrive", t => {
        const u = Math.min(1, t / dur);
        truckX = lerp(startX, parkX, easeOut(u));
        const speed = 1 - u;
        bob = Math.sin(t / 1000 * Math.PI * 2 * 2.3) * 1.3 * speed * layout.S * 2.4;
        if (u >= 1) {
          // Brakes on: a little dip and settle.
          const s = (t - dur) / 360;
          bob = Math.sin(Math.min(1, s) * Math.PI) * 2.2 * layout.S * 2;
          if (s >= 1) { bob = 0; phaseRef.current("parked"); return true; }
        }
        return false;
      });
    }
    function moveLadder(name: string, to: Ladder, toPx: number, minDur: number, santaTo: number | null): Phase {
      const from = { ...lad }, fromX = truckX, toX = toPx - BODY.pivot[0] * layout.S;
      const swing = Math.abs(deg(to.a - from.a)), reach = Math.abs(to.d - from.d) * layout.S, drive = Math.abs(toX - fromX);
      const dur = Math.max(minDur, swing / 55 * 1000, reach / (layout.vh * .9) * 1000, drive / (layout.vw * .3) * 1000, from.c !== to.c ? 1500 : 0);
      const steps = santaTo === null || santaMode !== "ladder" ? 0 : Math.round(Math.abs(santaTo - santaSx) / 48);
      const total = Math.max(dur, steps * 210);
      const sFrom = santaSx;
      return begin(name, t => {
        const u = Math.min(1, t / total), e = smooth(u);
        truckX = lerp(fromX, toX, e);
        bob = drive > 2 ? Math.sin(t / 1000 * Math.PI * 2 * 2.6) * .8 * Math.sin(u * Math.PI) * layout.S * 2.4 : 0;
        lad.a = lerp(from.a, to.a, e);
        lad.d = lerp(from.d, to.d, e);
        // The turntable swings round: the ladder's side-on length shrinks through zero and grows again.
        lad.c = from.c === to.c ? to.c : Math.cos(lerp(from.c > 0 ? 0 : Math.PI, to.c > 0 ? 0 : Math.PI, e));
        if (steps && santaTo !== null) {
          const k = Math.min(steps, Math.floor(t / 210));
          const within = clamp((t - k * 210) / 130, 0, 1);
          const at = Math.min(steps, k + (k < steps ? smooth(within) : 0));
          santaSx = lerp(sFrom, santaTo, at / steps);
          santaPose = deg(lad.a) > 34 ? (k % 2 ? "climb2" : "climb1") : "stand";
        } else if (santaMode === "ladder") santaPose = climbPose(lad);
        return u >= 1;
      });
    }
    function climbOn(sxTo: number): Phase {
      const steps = Math.max(1, Math.round(Math.abs(925 - sxTo) / 48));
      return begin("climb", t => {
        if (t < 340) { santaHop = smooth(t / 340); santaPose = "climb1"; return false; }
        santaMode = "ladder"; santaHop = 0;
        const s = t - 340, k = Math.min(steps, Math.floor(s / 220));
        const within = clamp((s - k * 220) / 140, 0, 1);
        santaSx = lerp(925, sxTo, Math.min(steps, k + (k < steps ? smooth(within) : 0)) / steps);
        santaPose = deg(lad.a) > 34 ? (k % 2 ? "climb2" : "climb1") : "stand";
        return k >= steps;
      });
    }
    function climbOff(): Phase {
      const from = santaSx, steps = Math.max(1, Math.round(Math.abs(925 - from) / 48));
      return begin("climb-down", t => {
        if (santaMode === "ladder") {
          const k = Math.min(steps, Math.floor(t / 200));
          const within = clamp((t - k * 200) / 130, 0, 1);
          santaSx = lerp(from, 925, Math.min(steps, k + (k < steps ? smooth(within) : 0)) / steps);
          santaPose = deg(lad.a) > 34 ? (k % 2 ? "climb2" : "climb1") : "stand";
          if (k >= steps) { santaMode = "deck"; santaHop = 1; }
          return false;
        }
        const u = clamp((t - steps * 200) / 320, 0, 1);
        santaHop = 1 - smooth(u);
        santaPose = "climb1";
        return u >= 1;
      });
    }
    function dropRope(plan: Plan): Phase {
      const m = plan.member;
      const line = rescued > 0 && hangingCrew().length === 1 ? LAST_LINE : SANTA_LINES[rescued % SANTA_LINES.length];
      say(line, santaHead, santaHead().x > m.x ? "right" : "left", 2100);
      const waist = m.y + m.height * .48;
      return begin("rope", t => {
        const tip = tipOf(layout, pivotX(), lad);
        const u = Math.min(1, t / 520);
        const fall = easeIn(u);
        const endY = lerp(tip.y, waist, fall) + (u >= 1 ? Math.sin((t - 520) / 90) * Math.exp(-(t - 520) / 160) * 6 : 0);
        rope = { top: tip, end: { x: tip.x, y: Math.max(tip.y, endY) }, tail: 0, swing: t / 300, hand: true };
        return t >= 760;
      });
    }
    function grab(plan: Plan): Phase {
      const m = plan.member;
      const handle = rescueChief(m.chief);
      const actor: Actor = { chief: m.chief, member: m, handle, landed: 0, el: null, x: m.x, top: 0, height: m.height, width: m.width, leave: Infinity, gone: false };
      actors.push(actor);
      currentActor = actor;
      if (handle) {
        if (WAVES[m.chief]) handle.element.dataset.startled = "";
        else handle.element.style.setProperty("--panic", "1");
      }
      return begin("grab", t => {
        const tip = tipOf(layout, pivotX(), lad);
        const u = Math.min(1, t / 420);
        // Hands off the lights and onto the rope: a short drop, caught with a jolt.
        const drop = u < .55 ? easeIn(u / .55) * 14 : 14 - Math.sin((u - .55) / .45 * Math.PI) * 4;
        hold(actor, m.x, m.y + drop, Math.sin(u * Math.PI) * 3);
        rope = { top: tip, end: { x: m.x, y: m.y + drop }, tail: m.height * .3 * (1 - u * .4), swing: t / 260, hand: true };
        return u >= 1;
      });
    }
    function lower(plan: Plan): Phase {
      const m = plan.member, actor = currentActor!;
      const from = m.y + 14, to = landGrip(m);
      const dur = clamp((to - from) / (layout.vh * .42) * 1000, 1100, 2300);
      const sign = m.x > layout.vw / 2 ? 1 : -1;
      return begin("lower", t => {
        const u = Math.min(1, t / dur), e = smooth(u);
        const y = lerp(from, to, e);
        const angle = sign * (Math.sin(t / 1000 * Math.PI * 2 / 1.35) * 3.4 * (1 - u * .55) + Math.sin(u * Math.PI) * 1.2);
        hold(actor, m.x, y, angle);
        const tip = tipOf(layout, pivotX(), lad);
        rope = { top: tip, end: { x: m.x, y }, tail: m.height * .18, swing: t / 240, hand: true };
        if (u >= 1) {
          hold(actor, m.x, to, 0);
          land(actor, clock);
          rescued++;
          reeling = { t0: clock, from: to };
          return true;
        }
        return false;
      });
    }
    // Once someone's down, the rope reels back up to the tip while the ladder moves on.
    let reeling: { t0: number; from: number } | null = null;
    function updateReel() {
      if (!reeling || !rope) { reeling = null; return; }
      const u = Math.min(1, (clock - reeling.t0) / 460);
      const tip = tipOf(layout, pivotX(), lad);
      rope = { top: tip, end: { x: tip.x, y: lerp(reeling.from, tip.y, easeOut(u)) }, tail: lerp(16, 0, u), swing: clock / 200, hand: true };
      if (u >= 1) { rope = null; reeling = null; }
    }
    function stow(): Phase {
      return moveLadder("stow", { a: 0, d: 0, c: 1 }, pivotX(), 1400, null);
    }
    function depart(): Phase {
      const fromX = truckX, toX = -(layout.truckW + 60);
      const dur = clamp((fromX - toX) / (layout.vw * .5) * 1000, 2000, 3600);
      return begin("depart", t => {
        const u = Math.min(1, t / dur);
        truckX = lerp(fromX, toX, easeIn(u));
        bob = Math.sin(t / 1000 * Math.PI * 2 * 2.4) * 1.2 * Math.min(1, u * 3) * layout.S * 2.4;
        return u >= 1;
      });
    }

    // The next rescue (or the wrap-up once nobody's left on the lights).
    function nextRescue(first: boolean) {
      const crew = hangingCrew();
      const plan = first && current ? current : planNext(layout, crew, pivotX(), lad.c < 0 ? -1 : 1);
      current = plan;
      if (!plan || !crew.some(m => m.chief === plan.member.chief)) {
        queue.push(() => santaMode === "ladder" ? climbOff() : null, stow, depart);
        return;
      }
      const sxTo = plan.sx ?? 925;
      if (first) {
        queue.push(() => moveLadder("raise", plan.ladder, plan.px, 1300, null));
        if (plan.sx !== null) queue.push(() => climbOn(sxTo));
      } else {
        if (santaMode === "deck" && plan.sx !== null) {
          queue.push(() => moveLadder("aim", plan.ladder, plan.px, 900, null), () => climbOn(sxTo));
        } else if (santaMode === "ladder" && plan.sx === null) {
          queue.push(climbOff, () => moveLadder("aim", plan.ladder, plan.px, 900, null));
        } else {
          queue.push(() => moveLadder("aim", plan.ladder, plan.px, 900, plan.sx));
        }
      }
      queue.push(
        () => dropRope(plan),
        () => hangingCrew().some(m => m.chief === plan.member.chief) ? grab(plan) : null,
        () => currentActor && currentActor.member.chief === plan.member.chief && !currentActor.landed ? lower(plan) : null,
        () => { nextRescue(false); return null; },
      );
    }

    // ---- The still sequence (reduced motion) ----
    function runStill() {
      const timers: number[] = [];
      const plan0 = planNext(layout, hangingCrew(), Infinity, 1);
      if (!plan0) { finishRescue(); phaseRef.current("done"); return () => {}; }
      truckX = plan0.px - BODY.pivot[0] * layout.S;
      phaseRef.current("parked");
      const show = (plan: Plan) => {
        lad = { ...plan.ladder };
        santaMode = plan.sx === null ? "deck" : "ladder";
        santaSx = plan.sx ?? 925;
        santaPose = santaMode === "ladder" ? climbPose(lad) : "climb1";
        rope = { top: tipOf(layout, pivotX(), lad), end: { x: plan.member.x, y: plan.member.y }, tail: 0, swing: 0, hand: true };
        draw();
      };
      const step = () => {
        const plan = planNext(layout, hangingCrew(), pivotX(), lad.c < 0 ? -1 : 1);
        if (!plan) {
          rope = null; lad = { a: 0, d: 0, c: 1 }; santaMode = "deck"; draw();
          timers.push(window.setTimeout(() => { finishRescue(); phaseRef.current("done"); }, 1400));
          return;
        }
        truckX = plan.px - BODY.pivot[0] * layout.S;
        show(plan);
        say(rescued ? SANTA_LINES[rescued % SANTA_LINES.length] : SANTA_LINES[0], santaHead, "left", 1300);
        timers.push(window.setTimeout(() => {
          const handle = rescueChief(plan.member.chief);
          const actor: Actor = { chief: plan.member.chief, member: plan.member, handle, landed: 0, el: null, x: plan.member.x, top: 0, height: plan.member.height, width: plan.member.width, leave: Infinity, gone: false };
          actors.push(actor);
          land(actor, 0);
          rescued++;
          rope = null; draw();
          timers.push(window.setTimeout(() => { if (actor.el) actor.el.style.visibility = "hidden"; actor.gone = true; step(); }, 1500));
        }, 1300));
      };
      draw();
      step();
      return () => timers.forEach(t => window.clearTimeout(t));
    }

    // ---- The clock ----
    function tick(now: number) {
      frame = requestAnimationFrame(tick);
      const paused = isSnowballTimeout();
      const dt = Math.min(50, now - last);
      last = now;
      if (paused || document.hidden) return;
      clock += dt;
      // The living room's own Santa stays out of the chimney while this Santa is out.
      const video = document.querySelector<HTMLVideoElement>("[data-living-room] video");
      if (video && !video.paused && video.currentTime > 2.35 && video.currentTime < 5.35) video.currentTime = 5.35;
      while (!phase && queue.length) phase = queue.shift()!();
      if (phase && phase.run(clock - phase.t0)) phase = null;
      while (!phase && queue.length) phase = queue.shift()!();
      updateReel();
      updateActors(clock);
      draw();
      if (!phase && !queue.length && !finished) {
        finished = true;
        actors.forEach(a => { a.handle?.release(); a.handle = null; });
        finishRescue();
        phaseRef.current("done");
      }
    }
    function syncPause() {
      const paused = isSnowballTimeout();
      sceneEl!.dataset.paused = paused ? "true" : "false";
      bubbles.forEach(b => { if (paused) b.anim.pause(); else b.anim.play(); });
    }
    function resize() {
      layout = measureLayout();
      sizeTo(layout);
      draw();
    }

    let stopStill: (() => void) | null = null;
    if (still) stopStill = runStill();
    else {
      queue.push(arrive, () => { nextRescue(true); return null; });
      frame = requestAnimationFrame(tick);
    }
    window.addEventListener(snowballTimeoutEvent, syncPause);
    window.addEventListener("resize", resize, { passive: true });
    syncPause();
    return () => {
      cancelAnimationFrame(frame);
      stopStill?.();
      window.removeEventListener(snowballTimeoutEvent, syncPause);
      window.removeEventListener("resize", resize);
      bubbles.forEach(b => b.el.remove());
      // Leaving early (a staff page, say): nobody is left dangling on a rope.
      actors.forEach(a => { a.handle?.release(); a.handle = null; });
      finishRescue();
    };
  }, [ready, still]);

  if (!body) return null;
  const px = (v: number) => `calc(${v}px * var(--s))`;
  const sx = (v: number) => `calc(${v}px * var(--sigma))`;
  return createPortal(<>
    <div ref={scene} className={styles.scene} data-ready={ready || undefined} aria-hidden="true">
      <div ref={truck} className={styles.truck} style={{ width: px(BODY.w), height: px(BODY.h) }}>
        <i className={styles.shadow} />
        <div ref={ladder} className={styles.ladder} style={{ left: px(BODY.pivot[0]), top: px(BODY.pivot[1]) }}>
          <span className={styles.flyClip} style={{ left: px(-4000), top: px(-LAD.pivot[1]), width: px(4000 + 1000 - LAD.pivot[0]), height: px(246) }}>
            <Image ref={fly} className={styles.layer} src={`${ART}/ladder-fly.webp`} alt="" width={2400} height={246} unoptimized draggable={false}
              style={{ left: px(4000 - LAD.pivot[0]), top: 0, width: px(2400), height: px(246) }} />
          </span>
          {(["plain", "mirror"] as const).map(kind => (
            <Image key={kind} data-base={kind} className={styles.layer} src={`${ART}/${kind === "plain" ? "ladder-base" : "ladder-base-mirror"}.webp`} alt=""
              width={538} height={246} unoptimized draggable={false}
              style={{ left: px(LAD.base - LAD.pivot[0]), top: px(-LAD.pivot[1]), width: px(538), height: px(246), visibility: kind === "plain" ? "visible" : "hidden" }} />
          ))}
        </div>
        <Image className={styles.layer} src={`${ART}/truck-body.webp`} alt="" width={BODY.w} height={BODY.h} unoptimized draggable={false}
          style={{ inset: 0, width: "100%", height: "100%" }} />
        {["twinkle-0", "twinkle-1", "left", "right", "bar-a", "bar-b"].map(glow => (
          <Image key={glow} data-glow={glow} className={`${styles.layer} ${styles.glow}`} src={`${ART}/truck-${glow}.webp`} alt="" width={BODY.w} height={BODY.h}
            unoptimized draggable={false} style={{ inset: 0, width: "100%", height: "100%" }} />
        ))}
      </div>
      <svg ref={ropes} className={styles.ropes} aria-hidden="true">
        <path data-rope="hand" className={styles.ropeEdge} />
        <path data-rope="hand-core" className={styles.ropeCore} />
        <path data-rope="main" className={styles.ropeEdge} />
        <path data-rope="main-core" className={styles.ropeCore} />
      </svg>
      <div ref={santa} className={styles.santa} data-pose="climb1">
        {(Object.keys(POSES) as SantaPose[]).map(pose => {
          const p = POSES[pose];
          return <Image key={pose} data-pose={pose} className={styles.layer} src={p.src} alt="" width={p.w} height={p.h} unoptimized draggable={false}
            style={{ left: sx(-p.foot[0]), top: sx(-p.foot[1]), width: sx(p.w), height: sx(p.h) }} />;
        })}
      </div>
      <div ref={crewLayer} className={styles.crew}>
        {(Object.entries(WAVES) as Array<[CrewChief, NonNullable<(typeof WAVES)[CrewChief]>]>).map(([chief, w]) => (
          <span key={chief} data-crew={chief} className={styles.waver}>
            <Image src={w.src} alt="" width={w.w} height={w.h} unoptimized draggable={false} />
          </span>
        ))}
        {(Object.entries(CHEERS) as Array<[CrewChief, string]>).map(([chief, src]) => (
          <span key={chief} data-crew={chief} data-cheer={chief} className={styles.waver}>
            <Image src={src} alt="" width={477} height={716} unoptimized draggable={false} />
          </span>
        ))}
      </div>
    </div>
    <div ref={talk} className={styles.talk} aria-hidden="true" />
  </>, body);
}
