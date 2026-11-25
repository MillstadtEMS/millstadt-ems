// The chimney gag's script: one timeline (ms) that poses every puppet, prop, effect and speech bubble
// for any moment, so the scene can be played, paused or seeked frame-exactly. Distances adapt to the
// screen: "the edge" is the real visible left edge of the banner (`Stage.left`, in room px), so Gabby
// walks in from, drags Santa off and runs out past the true edge of a phone or a 1920 px desktop.
//
//  1. Santa's head peeks down out of the chimney, looks around, then slides down and wedges his belly in
//     the arch, upside down over his unfinished milk and cookies, and wriggles.
//  2. Gabby walks in from the far left (no hat), stops, looks back... double take: "!", then
//     "OH NO YOU DON'T!" and she charges.
//  3. She grabs his arm with both fists and hauls: HNNNGH! He's wedged (his arm stretches, his belly
//     squashes), her grip slips, she re-grips and heaves: POP! He tumbles out onto his back, she lands on
//     her rear in a puff of dust, the milk and cookies go flying.
//  4. She gets up, grabs his boot, turns to face left and drags him off the left edge, walking forward,
//     arm back on the boot every frame: "YOU'RE GONNA FINISH YOUR MILK AND COOKIES!" / "NOOOO!"
//  5. A beat, then she strolls back in wearing his hat, sits in the green armchair and dozes off (Zzz).
//  6. BEEP BEEP! She startles awake: "GOTTA RUN!", hops up and sprints off the left edge, hat nearly
//     flying off. The milk and cookies are tidied away.

import { ANKLE, FIREBOX, G, type HeadId, type Pt } from "./art";
import { handWorld, headTop, legKnee, pagerWorld, shoulderWorld, type Arm, type GabbyPose, type Leg } from "./gabby";
import { footAt, makeLoco, pelvisAt, type BootGeo, type Loco } from "./gait";
import { clamp, easeIn, easeInOut, easeOut, lerp, seg, smooth } from "./math";
import { santaHeadWorld, type SantaPose } from "./santa";

export type Stage = {
  /** The visible left and right edges of the banner, and its top, in room px. */
  left: number;
  right: number;
  top: number;
  /** CSS px per room px (1 on desktops, .62 on phones). */
  k: number;
};

export type Bubble = {
  id: string;
  text: string;
  kind: "say" | "sfx" | "beep" | "pop" | "noo";
  /** Anchor (room px): the bubble's tail points here; sound effects centre on it. */
  x: number;
  y: number;
  /** ms since it appeared and ms until it goes (it pops in and out). */
  age: number;
  rest: number;
  tilt?: number;
};
type Dust = { x: number; y: number; u: number; spread: number; dir: number };
export type Treats = { o: number; plate: [number, number, number]; cookie: [number, number, number]; glass: [number, number, number]; splash: number; puddle: number };
export type SceneState = {
  /** What Gabby is doing (for frame-sheet labels): walking, running and dragging are her travel. */
  act: string;
  gabby: GabbyPose | null;
  santa: SantaPose | null;
  /** Santa still in the chimney: drawn behind the arch and the stockings. */
  santaInside: boolean;
  chair: boolean;
  treats: Treats;
  dust: Dust[];
  bang: { x: number; y: number; s: number } | null;
  zzz: { x: number; y: number; u: number } | null;
  streak: { x: number; y: number; dir: 1 | -1; amount: number; height: number } | null;
  shadows: { x: number; w: number; o: number }[];
  bubbles: Bubble[];
};

export const FLOOR = 194;
const ANK = FLOOR - ANKLE;
const STAND = FLOOR - G.stand;
const GEO: BootGeo = {
  toe: [G.boot.toe[0] - G.boot.ankle[0], G.boot.toe[1] - G.boot.ankle[1]],
  heel: [G.boot.heel[0] - G.boot.ankle[0], G.boot.heel[1] - G.boot.ankle[1]],
  ankle: ANKLE,
};
const HIPS: readonly [number, number] = [5, -5];
const LEG_MAX = (G.thigh + G.shin) * .985;

const flat = (x: number): Leg => ({ x, y: ANK, a: 0 });
/** A boot rocked back onto its heel by a degrees (toe up), its heel staying where a flat boot's would be
 *  (facing right). */
function heelDig(x: number, a: number): Leg {
  const hx = GEO.heel[0], hy = GEO.heel[1];
  const th = (-a * Math.PI) / 180, c = Math.cos(th), sn = Math.sin(th);
  const vx = -hx, vy = -hy;
  return { x: x + hx + (vx * c - vy * sn), y: ANK + hy + (vx * sn + vy * c), a };
}
const fk = (a: number, e: number, hand: "open" | "fist" = "open"): Arm => ({ a, e, hand });
const wave = (t: number, ms: number) => Math.sin((t / ms) * 2 * Math.PI);

/** Ease through a list of [time, value] keys (smoothstep between neighbours). */
function keys(t: number, k: ReadonlyArray<readonly [number, number]>, ease: (u: number) => number = smooth) {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (t <= k[i][0]) return lerp(k[i - 1][1], k[i][1], ease(seg(t, k[i - 1][0], k[i][0])));
  return k[k.length - 1][1];
}

/** When every boot of a stopping walk has come to rest. */
function settled(l: Loco) {
  let t = l.t1;
  for (const p of l.plants) if (p.t1 === Infinity && Number.isFinite(p.t0)) t = Math.max(t, p.t0);
  return t + 60;
}

function lerpArm(a: Arm, b: Arm, u: number, pa: GabbyPose, pb: GabbyPose, near: boolean): Arm {
  if (!("to" in a) && !("to" in b)) return { a: lerp(a.a, b.a, u), e: lerp(a.e, b.e, u), hand: u < .5 ? a.hand : b.hand };
  const wa = "to" in a ? a.to : handWorld(pa, near), wb = "to" in b ? b.to : handWorld(pb, near);
  return { to: [lerp(wa[0], wb[0], u), lerp(wa[1], wb[1], u)], hand: u < .5 ? a.hand : b.hand, bend: ("to" in b ? b.bend : undefined) ?? ("to" in a ? a.bend : undefined) };
}

function lerpLeg(a: Leg, b: Leg, u: number): Leg {
  const out: Leg = { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), a: lerp(a.a, b.a, u) };
  if (a.knee && b.knee) out.knee = [lerp(a.knee[0], b.knee[0], u), lerp(a.knee[1], b.knee[1], u)];
  else if (b.knee && u > .999) out.knee = b.knee;
  else if (a.knee && u < .001) out.knee = a.knee;
  return out;
}

/** A leg of `p`, given an explicit knee whenever `other` has one (so blends between posed and solved
 *  knees never jump). */
function kneed(p: GabbyPose, other: GabbyPose, near: boolean): Leg {
  const leg = near ? p.legN : p.legF, o = near ? other.legN : other.legF;
  return o.knee && !leg.knee ? { ...leg, knee: legKnee(p, near) } : leg;
}

/** A pose between two poses (heads and facing swap crisply at `swap`). */
function blend(a: GabbyPose, b: GabbyPose, u: number, swap = .5): GabbyPose {
  const n = (x: number | undefined, y: number | undefined, d: number) => lerp(x ?? d, y ?? d, u);
  const hat = a.hat || b.hat ? { on: (u < swap ? a.hat?.on : b.hat?.on) ?? false, lift: n(a.hat?.lift, b.hat?.lift, 0), tilt: n(a.hat?.tilt, b.hat?.tilt, 0) } : undefined;
  return {
    x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), dir: u < swap ? a.dir : b.dir, lean: lerp(a.lean, b.lean, u),
    sx: n(a.sx, b.sx, 1), sy: n(a.sy, b.sy, 1), floor: FLOOR,
    head: u < swap ? a.head : b.head, nod: n(a.nod, b.nod, 0), headDy: n(a.headDy, b.headDy, 0),
    headBack: u < swap ? a.headBack : b.headBack, hat,
    armN: lerpArm(a.armN, b.armN, u, a, b, true), armF: lerpArm(a.armF, b.armF, u, a, b, false),
    legN: lerpLeg(kneed(a, b, true), kneed(b, a, true), u), legF: lerpLeg(kneed(a, b, false), kneed(b, a, false), u),
    pager: n(a.pager, b.pager, 0), shake: n(a.shake, b.shake, 0),
  };
}

/** Step through key poses [time, pose, ease?]. */
function track(t: number, k: ReadonlyArray<readonly [number, GabbyPose, ((u: number) => number)?]>): GabbyPose {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (t <= k[i][0]) {
    const e = k[i][2] ?? smooth;
    return blend(k[i - 1][1], k[i][1], e(seg(t, k[i - 1][0], k[i][0])));
  }
  return k[k.length - 1][1];
}

type WalkOpts = { head: HeadId; lean: number; amp: number; elbow?: number; hat?: GabbyPose["hat"]; keepGoing?: boolean; run?: boolean; bob?: number };

/** How deep a walk has to dip at each footfall for its stride (measured over the plan's cruise). */
const dips = new WeakMap<Loco, number>();
function needAt(l: Loco, t: number, keepGoing?: boolean) {
  const px = pelvisAt(l, t, keepGoing);
  let need = -Infinity;
  for (const [f, hip] of [[footAt(l, 0, t, GEO), HIPS[0]], [footAt(l, 1, t, GEO), HIPS[1]]] as const) {
    if (!f.stance) continue;
    const dx = px + hip * l.dir - f.x;
    need = Math.max(need, FLOOR - f.up - Math.sqrt(Math.max(0, LEG_MAX * LEG_MAX - dx * dx)));
  }
  return need;
}
function dipOf(l: Loco) {
  let d = dips.get(l);
  if (d === undefined) {
    d = 0;
    const a = l.t0 + (l.t1 - l.t0) * .3, b = l.t0 + (l.t1 - l.t0) * .7;
    for (let t = a; t <= b; t += 6) d = Math.max(d, needAt(l, t) - STAND);
    d = clamp(d + .6, 1.5, 8);
    dips.set(l, d);
  }
  return d;
}

/** Gabby on the move: planted boots from the footstep plan, a bob locked to her footfalls (as deep as
 *  her stride needs, so a planted boot never has to stretch), arms swinging against her legs. */
function walkPose(l: Loco, t: number, o: WalkOpts): GabbyPose {
  const px = pelvisAt(l, t, o.keepGoing);
  const fN = footAt(l, 0, t, GEO), fF = footAt(l, 1, t, GEO);
  const run = l.style === "run";
  // speed (for easing the bob and swing in and out of a standing start or stop)
  const v = Math.abs(pelvisAt(l, t + 8, o.keepGoing) - pelvisAt(l, t - 8, o.keepGoing)) / 16 * 1000;
  const k = clamp(v / l.v, 0, 1);
  // footfall phase: 0 at a touchdown, 1 at the next
  let td = -Infinity, tn = Infinity;
  for (const p of l.plants) {
    if (!Number.isFinite(p.t0)) continue;
    if (p.t0 <= t && p.t0 > td) td = p.t0;
    if (p.t0 > t && p.t0 < tn) tn = p.t0;
  }
  // (before the first footfall and after the last, the phase runs on as if the stride continued)
  if (!Number.isFinite(td) && Number.isFinite(tn)) td = tn - l.T;
  if (!Number.isFinite(tn) && Number.isFinite(td)) tn = td + l.T;
  const u = Number.isFinite(td) && Number.isFinite(tn) ? clamp((t - td) / (tn - td), 0, 1) : .5;
  let y: number;
  if (run) y = STAND + 4 + 4.2 * k * Math.cos(2 * Math.PI * (u - .3));
  else y = STAND + Math.max(o.bob ?? 0, dipOf(l)) * k * (.5 + .5 * Math.cos(2 * Math.PI * (u - .1)));
  // the stance boots must stay reachable (they never slide): the pelvis sinks ahead of any long reach,
  // along a smooth envelope of what the planted boots need over the next and last few frames
  let need = -Infinity;
  for (let d = -90; d <= 90; d += 10) {
    const n = needAt(l, t + d, o.keepGoing);
    if (n > -Infinity) need = Math.max(need, n - .0013 * d * d);
  }
  if (need > y) y = need;
  const offN = (fN.x - px) * l.dir, offF = (fF.x - px) * l.dir;
  const swing = clamp((offF - offN) / Math.max(20, l.step * 1.2), -1, 1) * k;
  const amp = o.amp, el = o.elbow ?? (run ? 82 : 14);
  const fist = run ? "fist" : "open";
  return {
    x: px, y, dir: l.dir, lean: o.lean * (run ? 1 : .5 + .5 * k) , floor: FLOOR, head: o.head, hat: o.hat,
    nod: run ? 0 : -1.5 * k * Math.cos(2 * Math.PI * (u - .1)),
    armN: fk(o.lean * .3 + swing * amp, el + Math.max(0, swing) * (run ? 10 : 16), fist),
    armF: fk(o.lean * .3 - swing * amp, el + Math.max(0, -swing) * (run ? 10 : 16), fist),
    legN: { x: fN.x, y: FLOOR - fN.up, a: fN.a }, legF: { x: fF.x, y: FLOOR - fF.up, a: fF.a },
  };
}

/** The moment a run or walk carries her past x (searching the timeline). */
function whenPast(l: Loco, x: number, from: number, keepGoing = true) {
  for (let t = from; t < from + 60_000; t += 10) if ((pelvisAt(l, t, keepGoing) - x) * l.dir >= 0) return t;
  return from + 60_000;
}

export function buildGag(stage: Stage) {
  const L = stage.left;
  const OFF = L - 36;                       // her pelvis this far out: just wholly past the edge
  // ---------------------------------------------------------------- 2. walk in
  const tWalk = 650;
  const SPOT = 436;
  const vIn = clamp((SPOT - OFF) / 4.7, 92, 200);
  const walkIn = makeLoco({ style: "walk", dir: 1, t0: tWalk, x0: OFF, x1: SPOT, v: vIn, step: clamp(vIn * .36, 30, 50), easeEnd: true, endFeet: [5, -6], hips: HIPS });
  const tSpot = settled(walkIn);
  const tLook = tSpot + 140, tSnap = tLook + 430, tShout = tSnap + 640, tSay1 = tShout + 120, tRun = tSay1 + 1500, tSay1End = tSay1 + 1850;
  // ---------------------------------------------------------------- 3. the yank
  const YANK = 548, FRONT = 571, BACK = 524;
  const RUN_END: readonly [number, number] = [YANK + 8, YANK - 8];
  const run1 = makeLoco({ style: "run", dir: 1, t0: tRun, x0: SPOT, x1: YANK, v: 250, step: 38, easeStart: true, easeEnd: true, startFeet: [SPOT + 5, SPOT - 6], endFeet: [RUN_END[0] - YANK, RUN_END[1] - YANK], hips: HIPS, lead: 1, sigma: .7 });
  const tYank = settled(run1);
  const tHn1 = tYank + 330, tSlip = tHn1 + 1400, tRegrip = tSlip + 300, tHn2 = tRegrip + 220, tPop = tHn2 + 1050;
  const tImpact = tPop + 270, tLand = tPop + 480, tGetUp = tImpact + 1000, tStood = tGetUp + 620;
  const tReach = tStood + 140, tGripBoot = tReach + 460, tTurn = tGripBoot + 560, tDrag = tTurn + 240;
  // ---------------------------------------------------------------- 4. the drag
  const SANTA_LAND: Pt = [602, 176];
  // dazed, one of his legs sticks up in the air (that's the boot she grabs); she pulls it in close to
  // HOLD, turns, and her far arm keeps it there, behind her, for the whole drag
  const BOOT_UP: Pt = [566, 151];
  const DRAG_X = 541;
  const DRAG_END = L - 190;
  const vDrag = clamp((DRAG_X - DRAG_END) / 5.8, 96, 215);
  const drag = makeLoco({ style: "walk", dir: -1, t0: tDrag, x0: DRAG_X, x1: DRAG_END, v: vDrag, step: clamp(vDrag * .3, 26, 44), sigma: 1.3, easeStart: true, startFeet: [DRAG_X - 6, DRAG_X + 6], hips: HIPS, lead: 0, lift: 3.5 });
  const dragPose = (t: number): GabbyPose => {
    const w = walkPose(drag, t, { head: "grit", lean: 15, amp: 24, keepGoing: true, bob: 3.6 });
    // her far arm stays back on his boot, every frame (it's the arm behind her); the near arm pumps
    w.armF = fk(-30 + Math.sin((t - tDrag) / 300) * 1.5, 0, "fist");
    w.armN = fk(10 + (w.armN as { a: number }).a * .8, 70, "fist");
    w.head = t < tDrag + 3500 ? "yell" : "grit";
    return w;
  };
  const HOLD = handWorld(dragPose(tDrag), false);
  const santaDrag = (t: number, g: GabbyPose): SantaPose => {
    const hand = handWorld(g, false);
    const tug = Math.max(0, Math.sin(((t - tDrag) / (drag.T * 2)) * 2 * Math.PI));
    const px = hand[0] + 31 + tug * 1.5, py = 171 - tug * 1.2;
    return {
      x: px, y: py, rot: 99, turn: -1, look: -1, nod: -12 + wave(t, 520) * 7,
      bsx: 1 + tug * .03, bsy: 1 - tug * .04, hat: { on: true, tilt: 10 + wave(t, 700) * 6 },
      legB: { to: hand, foot: 20 },
      legA: { a: 28 + wave(t, 610) * 18, e: -50 + wave(t, 610) * 20, foot: 10 },
      armA: { a: 150 + wave(t, 300) * 30, e: 20 + wave(t, 300) * 30 },
      armB: { a: 170 + wave(t + 150, 340) * 28, e: -10 + wave(t, 340) * 25 },
    };
  };
  let tGone = tDrag;
  for (let t = tDrag; t < tDrag + 30_000; t += 20) {
    const g = dragPose(t);
    if (santaHeadWorld(santaDrag(t, g))[0] < L - 30) { tGone = t; break; }
  }
  // ---------------------------------------------------------------- 5. stroll back, sit, doze
  // a beat with the room empty (about half a second once she's off the edge), then she strolls back in
  const tStroll = tGone + 260;
  // she stops in front of the chair with her boots on the two spots she'll sit and stand up on
  // her seat in the armchair (deeper in on phones, where the screen's edge cuts through the chair), and
  // the two spots her boots stand on in front of it (she stops on them, sits over them, stands up off them)
  const SEAT: Pt = [clamp(stage.left + 30, 87, 97), 157];
  const FEET_L = SEAT[0] - 18, FEET_R = SEAT[0] - 10, CHAIR = SEAT[0] - 14;
  const vSt = clamp((CHAIR - OFF) / 3.0, 78, 185);
  const stroll = makeLoco({ style: "walk", dir: 1, t0: tStroll, x0: OFF, x1: CHAIR, v: vSt, step: clamp(vSt * .37, 28, 46), easeEnd: true, endFeet: [FEET_R - CHAIR, FEET_L - CHAIR], hips: HIPS });
  const tAtChair = settled(stroll);
  const tTurn2 = tAtChair + 90, tSit = tTurn2 + 200, tSat = tSit + 540, tDoze = tSat + 950, tZ = tDoze + 650;
  // ---------------------------------------------------------------- 6. the pager, run off
  // BEEP BEEP: she jolts awake, springs up out of the chair (turning to face the room in the air), lands
  // beside it: GOTTA RUN! Then she turns LEFT, winds up, and sprints off the far left edge.
  const tBeep = tDoze + 2150, tStartle = tBeep + 340, tHop = tStartle + 470, tApex = tHop + 200, tLanded = tApex + 210;
  const tSay3 = tLanded + 70, tSay3End = tSay3 + 1900, tTurnL = tSay3 + 1080, tCrouch = tTurnL + 240, tRun2 = tCrouch + 360;
  const RUN_FROM = Math.max(SEAT[0] + 26, stage.left + 36);
  const vRun = clamp((RUN_FROM - OFF) / 1.3, 250, 470);
  const run2 = makeLoco({ style: "run", dir: -1, t0: tRun2, x0: RUN_FROM, x1: OFF - 40, v: vRun, step: clamp(vRun * .2, 46, 70), easeStart: true, startFeet: [RUN_FROM - 6, RUN_FROM + 5], hips: HIPS, lead: 0, sigma: .62 });
  const tOff = whenPast(run2, OFF - 6, tRun2);
  // the milk and cookies are tidied away (they fade out) as she dashes off
  const tTidy = Math.max(tRun2 + 60, tOff - 520);
  const END = Math.max(tTidy + 560, tOff + 150);

  // ---------------------------------------------------------------- key poses
  const standR = (x: number, o: Partial<GabbyPose> = {}): GabbyPose => ({
    x, y: STAND, dir: 1, lean: 2, floor: FLOOR, head: "neutral", armN: fk(5, 14), armF: fk(-4, 12), legN: flat(x + 5), legF: flat(x - 6), ...o,
  });
  // the double take
  const spotStand = standR(SPOT);
  const lookBack = standR(SPOT, { headBack: true, head: "neutral", lean: 1, nod: -2 });
  const shocked = standR(SPOT, { head: "shock", lean: -6, y: STAND - 5, sy: 1.06, sx: .95, armN: fk(28, 118), armF: fk(14, 112) });
  const shockedSettle = standR(SPOT, { head: "shock", lean: -4, armN: fk(24, 105), armF: fk(10, 100) });
  const grit = standR(SPOT, { head: "grit", lean: 4, armN: fk(4, 40, "fist"), armF: fk(-8, 44, "fist") });
  const shout = standR(SPOT, { head: "yell", lean: 11, y: STAND + 1, armN: fk(76, 8), armF: fk(-14, 78, "fist"), legN: flat(SPOT + 5), legF: flat(SPOT - 6) });
  // the yank: she leans back on his arm with both fists, front boot braced on the hearth
  /** Her back heel digs in harder the harder she pulls (rocked back onto it, toe up). */
  const dig = (t: number) => keys(t, [[tYank + 120, 0], [tYank + 420, 12], [tHn1 + 400, 19], [tSlip, 20], [tSlip + 130, 5], [tRegrip, 5], [tHn2, 17], [tHn2 + 420, 28], [tPop, 30]]);
  const grip = (t: number, lean: number, py: number, dx = 0): { pose: GabbyPose; nearFist: Pt; farFist: Pt } => {
    const pose: GabbyPose = { x: YANK + dx, y: py, dir: 1, lean, floor: FLOOR, head: "grit", armN: fk(0, 0), armF: fk(0, 0), legN: heelDig(FRONT, 10), legF: heelDig(BACK, dig(t)) };
    // hands out in front at chest height, as far as they comfortably reach
    const sN: Pt = shoulderWorld(pose, true), sF: Pt = shoulderWorld(pose, false);
    // two fists in a row on his forearm, like hauling on a rope (the far one in front of her belly)
    const nearFist: Pt = [sN[0] + 31, sN[1] + 22], farFist: Pt = [sF[0] + 38, sF[1] + 21];
    pose.armN = { to: nearFist, hand: "fist", bend: 1 };
    pose.armF = { to: farFist, hand: "fist", bend: 1 };
    return { pose, nearFist, farFist };
  };
  const pullLean = (t: number) => keys(t, [[tYank, -4], [tYank + 260, -16], [tHn1 + 500, -20], [tSlip, -21], [tSlip + 120, -8], [tRegrip, -10], [tHn2, -18], [tHn2 + 400, -27], [tPop, -29]]);
  const pullY = (t: number) => keys(t, [[tYank, STAND + 2], [tYank + 260, STAND + 6], [tSlip, STAND + 7], [tSlip + 120, STAND + 3], [tHn2 + 400, STAND + 10], [tPop, STAND + 11]]);
  const pullDx = (t: number) => keys(t, [[tYank, 0], [tYank + 260, -2], [tSlip, -3], [tSlip + 120, 2], [tRegrip, 1], [tHn2 + 400, -4], [tPop, -5]]);
  /** How hard she's pulling (0..1): drives Santa's stretch. */
  const pull = (t: number) => keys(t, [[tYank, 0], [tYank + 260, .25], [tHn1 + 300, .55], [tSlip, .62], [tSlip + 110, .05], [tRegrip, .1], [tHn2, .4], [tHn2 + 500, .85], [tPop, 1]]);
  const yankPose = (t: number) => {
    const g = grip(t, pullLean(t), pullY(t), pullDx(t));
    const effort = t > tHn1 && t < tSlip ? .6 : t > tHn2 && t < tPop ? 1 : 0;
    g.pose.shake = effort * Math.sin(t / 19) * .55;
    g.pose.sy = 1 - effort * .02;
    if (t > tSlip && t < tRegrip) g.pose.head = "shock";
    // the slip: her fists slide off his wrist, she re-grips further up his arm
    if (t > tSlip && t < tRegrip + 60) {
      const u = seg(t, tSlip, tRegrip + 60);
      const slide = Math.sin(u * Math.PI) * 6;
      g.pose.armN = { to: [g.nearFist[0] - slide, g.nearFist[1] - slide * .3], hand: u < .5 ? "open" : "fist", bend: 1 };
      g.pose.armF = { to: [g.farFist[0] - slide * .8, g.farFist[1] - slide * .2], hand: u < .55 ? "open" : "fist", bend: 1 };
    }
    return g;
  };
  // the fall: flung back onto her rear, boots in the air
  const popStart = yankPose(tPop).pose;
  const airborne: GabbyPose = { ...popStart, x: YANK - 18, y: STAND + 22, lean: -52, head: "shock", shake: 0, armN: fk(150, 12, "open"), armF: fk(135, 20, "open"), legN: { x: FRONT - 6, y: 160, a: 55 }, legF: { x: BACK + 12, y: 174, a: 35 } };
  const SIT_X = 516;
  const onRear: GabbyPose = { x: SIT_X, y: FLOOR - 10, dir: 1, lean: -58, floor: FLOOR, head: "shock", sx: 1.08, sy: .9, armN: fk(162, 8, "open"), armF: fk(150, 10, "open"), legN: { x: SIT_X + 38, y: 150, a: 72 }, legF: { x: SIT_X + 31, y: 160, a: 62 } };
  const sitting: GabbyPose = { x: SIT_X, y: FLOOR - 10, dir: 1, lean: -16, floor: FLOOR, head: "shock", armN: { to: [SIT_X - 9, FLOOR - 3], hand: "open", bend: -1 }, armF: { to: [SIT_X - 15, FLOOR - 3], hand: "open", bend: -1 }, legN: { x: SIT_X + 44, y: FLOOR - 6.5, a: 64 }, legF: { x: SIT_X + 37, y: FLOOR - 6.5, a: 58 } };
  // her boots end up on the two spots the drag starts from (they just swap sides when she turns)
  const B_FWD = DRAG_X + 6, B_BACK = DRAG_X - 6;
  const kneel: GabbyPose = { x: SIT_X + 9, y: FLOOR - 15, dir: 1, lean: 38, floor: FLOOR, head: "neutral", armN: { to: [SIT_X + 30, FLOOR - 3], hand: "open", bend: -1 }, armF: { to: [SIT_X + 24, FLOOR - 3], hand: "open", bend: -1 }, legN: flat(B_FWD), legF: flat(B_BACK) };
  const stood = standR(DRAG_X, { head: "grit", lean: 3, legN: flat(B_FWD), legF: flat(B_BACK) });
  // the boot: she steps in, bends, grabs it, straightens with it, turns to face left
  const bend: GabbyPose = { ...standR(DRAG_X, { head: "grit" }), lean: 17, y: STAND + 4, legN: flat(B_FWD), legF: flat(B_BACK), armN: { to: BOOT_UP, hand: "open", bend: 1 }, armF: fk(-20, 30) };
  const lifted: GabbyPose = { ...bend, lean: 3, y: STAND + 1, head: "grit", armN: { to: HOLD, hand: "fist", bend: 1 }, armF: fk(-10, 40, "fist") };
  // turned: now facing left; the boot she holds is behind her (her near arm reaches back to it)
  const turned: GabbyPose = { ...dragPose(tDrag), y: STAND + 2 };
  // the armchair: facing left (like the chair), sunk into the seat, boots on the rug in front
  // seated: facing the way the chair faces (left), sunk into the seat, her head turned toward the room
  // (smugly eyeing the fireplace she just cleared); thighs out toward us, shins down in front of the seat
  const seated = (o: Partial<GabbyPose> = {}): GabbyPose => ({
    x: SEAT[0], y: SEAT[1], dir: -1, lean: -8, floor: FLOOR, head: "sly", headBack: true, hat: { on: true },
    armN: fk(14, 98), armF: fk(6, 106),
    legN: { x: FEET_L, y: ANK, a: 4, knee: [FEET_L - 3, 158.5] }, legF: { x: FEET_R, y: ANK, a: 4, knee: [FEET_R - 3, 160] },
    ...o,
  });
  const atChair = (dir: 1 | -1, o: Partial<GabbyPose> = {}): GabbyPose => ({
    x: CHAIR, y: STAND, dir, lean: dir === 1 ? -2 : 0, floor: FLOOR, head: "sly", hat: { on: true },
    armN: fk(4, 16), armF: fk(-3, 14),
    legN: flat(dir === 1 ? FEET_R : FEET_L), legF: flat(dir === 1 ? FEET_L : FEET_R), ...o,
  });
  // landed beside the chair, facing the room: alarmed, flapping
  const landed = (o: Partial<GabbyPose> = {}): GabbyPose => ({
    x: RUN_FROM, y: STAND, dir: 1, lean: -3, floor: FLOOR, head: "yell", hat: { on: true },
    armN: fk(150, 30), armF: fk(120, 40), legN: flat(RUN_FROM + 5), legF: flat(RUN_FROM - 6), ...o,
  });
  // turned left on the same two spots, then winding up for the sprint (sinking, leaning back, arms back)
  const turnedL = (o: Partial<GabbyPose> = {}): GabbyPose => ({
    x: RUN_FROM, y: STAND + 1, dir: -1, lean: 4, floor: FLOOR, head: "grit", hat: { on: true },
    armN: fk(30, 70, "fist"), armF: fk(-20, 70, "fist"), legN: flat(RUN_FROM - 6), legF: flat(RUN_FROM + 5), ...o,
  });
  const crouch = (c: number): GabbyPose => turnedL({ y: STAND + 1 + 5 * c, lean: lerp(4, -9, c), armN: fk(lerp(30, -48, c), 62, "fist"), armF: fk(lerp(-20, 44, c), 72, "fist") });
  const runAnchor = headTop(landed());

  // ---------------------------------------------------------------- Santa
  const SX = 617;
  const santaChimney = (t: number): SantaPose => {
    // pelvis height (world): his body hangs head-down; only what's below the arch shows
    let y = keys(t, [[250, 22], [1150, 58], [2650, 58], [3350, 88]], easeInOut);
    if (t < 1150) y += Math.sin(seg(t, 250, 1150) * Math.PI) * 1.5;
    const wedge = seg(t, 3300, 3750);
    let bsx = 1, bsy = 1;
    if (wedge > 0 && wedge < 1) { bsy = 1 - .2 * Math.sin(wedge * Math.PI) * (1 - wedge); bsx = 1 + .12 * Math.sin(wedge * Math.PI) * (1 - wedge); }
    // looks around: right (at the cookies), left, right
    let lookW: 1 | -1 = t < 1500 ? 1 : t < 2100 ? -1 : t < 2650 ? 1 : -1;
    let armA: SantaPose["armA"] = { to: [SX + 15, y + 85] }, armB: SantaPose["armB"] = { to: [SX - 15, y + 85] };
    let nod = Math.sin(t / 260) * 3;
    if (t > 3750) {
      // stuck: he shoves at the firebox floor to push himself back up the chimney, and can't
      const w = (t - 3750) / 820;
      const push = Math.max(0, Math.sin(w * Math.PI * 2));
      y -= push * 3.5;
      bsy *= 1 - push * .06; bsx *= 1 + push * .04;
      armA = { to: [SX + 19, FIREBOX.floor - 1 + push * 2] };
      armB = { to: [SX - 19, FIREBOX.floor - 1 + push * 2] };
      nod = Math.sin(t / 140) * 4;
      lookW = Math.floor(w) % 2 ? 1 : -1;
    }
    if (t > tSnap) {
      // he sees her coming: stares at her, then wriggles harder
      lookW = -1;
      const panic = (t - tSnap) / 260;
      armA = { to: [SX + 22 + Math.sin(panic * 5) * 4, FIREBOX.floor - 6 + Math.cos(panic * 5) * 4] };
    }
    return { x: SX, y, rot: 180, turn: 0, look: (-lookW) as 1 | -1, nod, bsx, bsy, hat: { on: true }, armA, armB, legA: { a: 4, e: -6 }, legB: { a: -4, e: 6 } };
  };
  const santaYank = (t: number, g: ReturnType<typeof yankPose>): SantaPose => {
    const p = pull(t);
    const y = 88 + p * 10;
    return {
      x: SX - p * 4, y, rot: 180 + p * 4, turn: 0, look: 1, nod: -8 + Math.sin(t / 90) * 2 * p,
      bsx: 1 - p * .1, bsy: 1 + p * .2, hat: { on: true },
      // his near arm in her fists (his glove just past her back fist), the other flailing
      armB: { to: [g.farFist[0] - 3, g.farFist[1] + 1] },
      armA: { a: 160 + Math.sin(t / 110) * 25, e: 30 + Math.sin(t / 90) * 25 },
      legA: { a: 4, e: -6 }, legB: { a: -4, e: 6 },
    };
  };
  /** The pop: his belly snaps through the arch and he slams down into the firebox, squashed flat with
   *  his legs tucked (all of him inside the opening), then springs out in front of the fireplace,
   *  tumbling from face-on and upside down to his back in profile, and slams down: head toward the
   *  fireplace, boots toward Gabby. */
  const santaPop = (t: number): { pose: SantaPose; inside: boolean } => {
    const u = t - tPop;
    let x: number, y: number, rot: number, turn = 0, bsx = 1, bsy = 1, sx = 1, sy = 1;
    let legA: SantaPose["legA"], legB: SantaPose["legB"];
    const tuck = (k: number): [SantaPose["legA"], SantaPose["legB"]] => [{ a: lerp(4, 70, k), e: lerp(-6, -120, k) }, { a: lerp(-4, -70, k), e: lerp(6, 120, k) }];
    if (u < 80) {
      const s = easeIn(u / 80);
      x = lerp(SX - 4, SX - 2, s); y = lerp(98, 131, s); rot = 184 - 4 * s;
      sy = lerp(1, .64, s); sx = lerp(1, 1.16, s); bsy = lerp(1.3, .8, s); bsx = lerp(.86, 1.2, s);
      [legA, legB] = tuck(s);
    } else if (u < 170) {
      // springing out of the firebox, stretched, toward the room
      const s = easeOut((u - 80) / 90);
      x = lerp(SX - 2, SX - 9, s); y = lerp(131, 120, s); rot = lerp(180, 160, s);
      sy = lerp(.64, 1.1, s); sx = lerp(1.16, .94, s); bsy = lerp(.8, 1.06, s); bsx = lerp(1.2, .96, s);
      [legA, legB] = tuck(1 - s * .7);
    } else if (u < 480) {
      const s = (u - 170) / 310;
      x = lerp(SX - 9, SANTA_LAND[0], smooth(s)) - Math.sin(s * Math.PI) * 5;
      y = lerp(120, SANTA_LAND[1], easeIn(s)) - Math.sin(s * Math.PI) * 16;
      rot = lerp(160, 99, easeInOut(s)); turn = -smooth(clamp(s * 1.5, 0, 1));
      sy = lerp(1.1, 1, s); sx = lerp(.94, 1, s);
      legA = { a: 20 + wave(u, 130) * 35, e: -40 + wave(u, 130) * 25 };
      legB = { a: -10 + wave(u + 60, 140) * 35, e: -30 + wave(u + 40, 150) * 20 };
    } else {
      // landing squash, one bounce, settle
      const s = (u - 480) / 520;
      x = SANTA_LAND[0]; rot = 99; turn = -1;
      const bounce = s < 1 ? Math.abs(Math.sin(s * Math.PI * 1.6)) * (1 - s) * 6 : 0;
      y = SANTA_LAND[1] - bounce;
      const sq = s < 1 ? Math.max(0, 1 - s * 3) : 0;
      bsy = 1 - .18 * sq; bsx = 1 + .14 * sq; sy = 1 - .06 * sq;
      legA = { a: 26, e: -44, foot: 8 };
      // one leg flops up and stays there, twitching
      const up = smooth(clamp(s * 1.4, 0, 1));
      legB = { to: [lerp(560, BOOT_UP[0], up) + wave(u, 700) * .8, lerp(186, BOOT_UP[1], up) + wave(u, 520) * 1.2], foot: 16 };
    }
    const flail = Math.min(1, u / 150);
    const lying = u >= 480;
    const pose: SantaPose = {
      x, y, rot, turn, sx, sy, bsx, bsy, look: u < 300 ? 1 : -1,
      nod: lying ? wave(u, 400) * 6 * Math.max(0, 1 - (u - 480) / 1500) : 0,
      hat: { on: true, tilt: lying ? 10 : 0 },
      armA: lying ? { a: 120 + wave(u, 900) * 6, e: 30 } : { a: 150 + wave(u, 160) * 40 * flail, e: 40 },
      armB: lying ? { a: 160, e: -20 + wave(u, 1100) * 5 } : { a: 170 + wave(u + 80, 170) * 40 * flail, e: -20 },
      legA, legB,
    };
    return { pose, inside: u < 80 };
  };
  // ---------------------------------------------------------------- treats
  const PLATE: Pt = [613, FIREBOX.hearth], GLASS: Pt = [627, FIREBOX.hearth];
  const treats = (t: number): Treats => {
    const o = Math.min(seg(t, 0, 380), 1 - seg(t, tTidy, tTidy + 520));
    const j = t - (tPop + 90);
    if (j < 0) return { o, plate: [PLATE[0], PLATE[1], 0], cookie: [PLATE[0] + 1, PLATE[1] - 3.2, 0], glass: [GLASS[0], GLASS[1], 0], splash: 0, puddle: 0 };
    // the plate hops and rattles; the loose cookie flies off over Gabby; the milk tips and spills
    // (the plate and the glass sail past where his head lands, to the rug in front of the presents)
    const ph = seg(j, 0, 520);
    const plate: [number, number, number] = [lerp(PLATE[0], 707, easeOut(ph)), lerp(PLATE[1], FIREBOX.hearth, ph) - Math.sin(ph * Math.PI) * 30, ph < 1 ? ph * 340 : 360 + Math.sin((j - 520) / 45) * 14 * Math.max(0, 1 - (j - 520) / 500)];
    const cj = seg(j, 0, 700);
    const roll = seg(j, 700, 1150);
    const cx = lerp(PLATE[0] + 1, 506, easeOut(cj)) - roll * 9, cy = lerp(PLATE[1] - 3.2, FLOOR - 3.3, cj) - Math.sin(cj * Math.PI) * 46 + (cj >= 1 ? -Math.abs(Math.sin(roll * Math.PI * 2)) * 2 * (1 - roll) : 0);
    const cookie: [number, number, number] = [cx, cy, -cj * 900 - roll * 160];
    const gj = seg(j, 0, 420);
    const glass: [number, number, number] = [lerp(GLASS[0], 722, easeOut(gj)), lerp(GLASS[1], FLOOR - 1, gj) - Math.sin(gj * Math.PI) * 38, gj * 270];
    return { o, plate, cookie, glass, splash: seg(j, 380, 520) * (1 - seg(j, 700, 1000)), puddle: seg(j, 420, 1100) };
  };

  // ---------------------------------------------------------------- the frame
  const sample = (t: number): SceneState => {
    const s: SceneState = { act: "", gabby: null, santa: null, santaInside: true, chair: false, treats: treats(t), dust: [], bang: null, zzz: null, streak: null, shadows: [], bubbles: [] };
    let g: GabbyPose | null = null;
    // ---- Gabby
    if (t < tWalk) { g = null; s.act = "offstage"; }
    else if (t < tSpot) { g = walkPose(walkIn, t, { head: "neutral", lean: 4, amp: 22 }); s.act = "walk"; }
    else if (t < tSnap) {
      s.act = t < tLook ? "stop" : "look away";
      const w = walkPose(walkIn, tSpot, { head: "neutral", lean: 4, amp: 22 });
      g = t < tLook ? blend(w, spotStand, smooth(seg(t, tSpot, tLook))) : blend(spotStand, lookBack, smooth(seg(t, tLook, tLook + 160)), .2);
    } else if (t < tRun) {
      s.act = t < tShout ? "double take" : "shout";
      const u = t - tSnap;
      g = u < 90 ? blend(lookBack, shocked, easeOut(u / 90), 0) : u < 330 ? blend(shocked, shockedSettle, smooth((u - 90) / 240)) : t < tShout ? blend(shockedSettle, grit, smooth(seg(t, tSnap + 330, tShout - 120)), .3) : blend(grit, shout, easeOut(seg(t, tShout, tShout + 180)), .1);
      // jabbing her finger at him while she yells
      if (t > tShout + 180) g.armN = fk(76 + wave(t - tShout, 330) * 6, 8 + Math.max(0, wave(t - tShout, 330)) * 10);
      if (u < 650) s.bang = { ...offsetPt(headTop(g), 8, -9), s: u < 140 ? easeOut(u / 140) * 1.2 : u < 260 ? lerp(1.2, 1, (u - 140) / 120) : u > 560 ? 1 - (u - 560) / 90 : 1 };
    } else if (t < tYank) {
      s.act = "run";
      g = walkPose(run1, t, { head: t < tSay1End ? "yell" : "grit", lean: 14, amp: 48 });
      if (t < tRun + 120) g = blend(shout, g, smooth((t - tRun) / 120));
    } else if (t < tPop) {
      s.act = t < tYank + 260 ? "brace" : "pull";
      const y = yankPose(t);
      g = t < tYank + 260 ? blend(walkPose(run1, tYank, { head: "grit", lean: 14, amp: 48 }), y.pose, smooth(seg(t, tYank, tYank + 200))) : y.pose;
      if (t < tYank + 260) {
        // bracing: the front boot steps up onto the hearth's edge, then the back boot steps back and digs in
        const s1 = smooth(seg(t, tYank, tYank + 170)), s2 = smooth(seg(t, tYank + 90, tYank + 260));
        const fN = y.pose.legN, fF = y.pose.legF;
        g.legN = { x: lerp(RUN_END[0], fN.x, s1), y: lerp(ANK, fN.y, s1) - Math.sin(s1 * Math.PI) * 5, a: lerp(0, fN.a, s1) + Math.sin(s1 * Math.PI) * 10 };
        g.legF = { x: lerp(RUN_END[1], fF.x, s2), y: lerp(ANK, fF.y, s2) - Math.sin(s2 * Math.PI) * 3.5, a: lerp(0, fF.a, s2) + Math.sin(s2 * Math.PI) * 8 };
      }
    } else if (t < tGetUp) {
      s.act = t < tImpact + 300 ? "flung back" : "dazed";
      g = track(t, [[tPop, popStart], [tPop + 130, airborne, easeOut], [tImpact, onRear, easeIn], [tImpact + 300, sitting, easeOut]]);
      if (t > tImpact + 300) {
        // dazed: a wobbly head
        const d = t - tImpact - 300;
        g.nod = Math.sin(d / 95) * 9 * Math.max(0, 1 - d / 650);
        if (d > 380) g.head = "grit";
      }
    } else if (t < tReach) {
      s.act = "get up";
      g = track(t, [[tGetUp, { ...sitting, head: "grit" }], [tGetUp + 320, kneel], [tStood, stood]]);
    } else if (t < tTurn) {
      s.act = "grab boot";
      g = track(t, [[tReach, stood], [tGripBoot, bend], [tGripBoot + 160, { ...bend, armN: { to: BOOT_UP, hand: "fist", bend: 1 } }], [tTurn - 40, lifted]]);
      if (t >= tGripBoot) (g.armN as { hand: string }).hand = "fist";
    } else if (t < tDrag) {
      s.act = "turn";
      // the turn: crisp, with a little hop, her fist never leaving the boot
      const u = seg(t, tTurn, tDrag);
      g = { ...turned, y: turned.y - Math.sin(u * Math.PI) * 3, sy: 1 + Math.sin(u * Math.PI) * .03 };
    } else if (t < tStroll) {
      g = t < tGone + 1500 ? dragPose(t) : null;
      s.act = g ? "drag" : "offstage";
    } else if (t < tTurn2) {
      s.act = "walk";
      g = walkPose(stroll, t, { head: "sly", lean: -2, amp: 26, hat: { on: true } });
    } else if (t < tBeep) {
      s.act = t < tSit ? "turn" : t < tSat + 260 ? "sit down" : t < tDoze ? "seated" : "doze";
      const sit0 = atChair(-1);
      if (t < tSit) {
        const u = seg(t, tTurn2, tSit);
        g = { ...sit0, y: STAND - Math.sin(u * Math.PI) * 2.5 };
      } else if (t < tSat) g = blend(sit0, seated(), easeInOut(seg(t, tSit, tSat)));
      else {
        const d = t - tSat;
        const settle = d < 260 ? Math.sin((d / 260) * Math.PI) : 0;
        const breath = Math.sin(d / 520) * .5;
        g = seated({ sy: 1 - settle * .035, sx: 1 + settle * .02, y: SEAT[1] - breath });
        // smug, getting comfy... then the eyelids droop and her head lolls back against the chair's wing
        if (t < tDoze) g.nod = Math.sin(d / 210) * 3 * Math.min(1, d / 300);
        else {
          const z = seg(t, tDoze, tDoze + 1100);
          g.head = "sleep";
          g.nod = -15 * smooth(z) + Math.sin((t - tDoze) / 420) * 1.2 * z;
          g.headDy = 1.5 * z;
          g.lean = -8 - 3 * z;
          g.armN = fk(14 - 4 * z, 98 - z * 12);
        }
      }
      if (t >= tSit) s.chair = true;
    } else if (t < tRun2) {
      s.act = t < tStartle ? "doze" : t < tHop ? "startle" : t < tLanded ? "spring up" : t < tTurnL ? "shout" : t < tCrouch ? "turn" : "wind-up";
      const pagerOn = Math.floor((t - tBeep) / 85) % 2 ? 1 : 0;
      const base = seated({ head: "sleep", nod: -15, headDy: 1.5, lean: -11, armN: fk(10, 86) });
      if (t < tStartle) {
        g = { ...base, pager: pagerOn };
      } else if (t < tHop) {
        const u = t - tStartle;
        const jolt = u < 100 ? easeOut(u / 100) : 1 - smooth(clamp((u - 100) / 250, 0, 1));
        // her head snaps up and her hands fly up off her lap (quick, but not a jump cut)
        const fling = easeOut(clamp(u / 80, 0, 1));
        g = seated({ head: "shock", nod: lerp(-15, 5, easeOut(clamp(u / 90, 0, 1))), lean: lerp(-11, -2, fling), y: SEAT[1] - jolt * 7, sy: 1 + jolt * .07, sx: 1 - jolt * .04, armN: fk(lerp(10, 40, fling) - jolt * 10, lerp(86, 70, fling) + jolt * 30), armF: fk(lerp(6, -18, fling), lerp(106, 60, fling)), pager: pagerOn, hat: { on: true, lift: 8 * Math.sin(clamp(u / 330, 0, 1) * Math.PI), tilt: -10 * Math.sin(clamp(u / 330, 0, 1) * Math.PI) } });
        s.bang = { ...offsetPt(headTop(g), 6, -10), s: u < 140 ? easeOut(u / 140) * 1.2 : u < 260 ? lerp(1.2, 1, (u - 140) / 120) : 1 };
      } else if (t < tLanded) {
        // the spring: straight up out of the seat, knees tucked; at the top she turns to face the room
        // and drops beside the chair (moving the way she now faces)
        const rise = t < tApex;
        const u = rise ? easeOut(seg(t, tHop, tApex)) : easeIn(seg(t, tApex, tLanded));
        const apexY = STAND - 20;
        // (knees tucked, boots right under her, so the turn at the top is clean)
        const tuck = (x: number, dir: 1 | -1): Partial<GabbyPose> => ({ legN: { x: x + dir * 2, y: apexY + 41, a: 24 }, legF: { x: x - dir * 2, y: apexY + 43, a: 18 } });
        if (rise) {
          const from = seated({ head: "shock", nod: 5, lean: -2, armN: fk(30, 100), armF: fk(-18, 60) });
          const top: GabbyPose = { ...from, y: apexY, lean: 2, sy: 1.06, sx: .95, armN: fk(165, 10, "open"), armF: fk(150, 20, "open"), ...tuck(SEAT[0], -1) };
          g = blend(from, top, u, 1);
        } else {
          const top: GabbyPose = { ...landed({ head: "shock", armN: fk(165, 10, "open"), armF: fk(150, 20, "open") }), x: SEAT[0], y: apexY, ...tuck(SEAT[0], 1) };
          g = blend(top, landed({ y: STAND + 5, sy: .94, sx: 1.05, head: "shock" }), u, 1);
        }
        g.hat = { on: true, lift: 4 + 6 * Math.sin(seg(t, tHop, tLanded) * Math.PI), tilt: -16 * Math.sin(seg(t, tHop, tLanded) * Math.PI) };
        s.chair = rise;
        if (t < tStartle + 650) s.bang = { ...offsetPt(headTop(g), 6, -10), s: 1 - seg(t, tStartle + 560, tStartle + 650) };
      } else if (t < tTurnL) {
        // GOTTA RUN!: landing squash, then frantic flapping
        const d = t - tLanded;
        const settle = d < 160 ? 1 - smooth(d / 160) : 0;
        const flap = wave(d, 230);
        g = landed({ y: STAND + 5 * settle, sy: 1 - .06 * settle, sx: 1 + .05 * settle, armN: fk(150 + flap * 22, 30 - flap * 15), armF: fk(120 - flap * 22, 40 + flap * 15), nod: wave(d, 460) * 3 });
      } else if (t < tCrouch) {
        // the turn: crisp, a little hop on the spot, her boots landing back on the same two spots
        const u = seg(t, tTurnL, tCrouch);
        g = turnedL({ y: STAND + 1 - Math.sin(u * Math.PI) * 3 });
      } else {
        // anticipation: a crouch and a wind-up before the sprint
        g = crouch(easeOut(seg(t, tCrouch, tRun2)));
      }
      if (t < tHop) s.chair = true;
    } else if (t < tOff + 200) {
      s.act = "run";
      g = walkPose(run2, t, { head: "grit", lean: 15, amp: 52, keepGoing: true, hat: { on: true } });
      const u = seg(t, tRun2, tRun2 + 520);
      g.hat = { on: true, lift: 9 * Math.sin(u * Math.PI), tilt: -32 * Math.sin(u * Math.PI) };
      if (t < tRun2 + 90) g = blend(crouch(1), g, easeIn((t - tRun2) / 90));
      s.streak = { x: g.x + 10, y: FLOOR - 30, dir: -1, amount: seg(t, tRun2, tRun2 + 200) * (1 - seg(t, tRun2 + 600, tRun2 + 900)), height: 60 };
    } else s.act = "offstage";
    s.gabby = g;

    // ---- Santa
    if (t < tYank) s.santa = santaChimney(t);
    else if (t < tPop) s.santa = santaYank(t, yankPose(t));
    else if (t < tReach) {
      const p = santaPop(t);
      s.santa = p.pose; s.santaInside = p.inside;
    } else if (t < tDrag) {
      // lying dazed; she grabs his boot and lifts it
      const base = santaPop(tReach).pose;
      s.santaInside = false;
      if (t >= tGripBoot && g) {
        // once she has it, his boot goes wherever her fist goes (near fist before the turn, far fist after)
        const hand = handWorld(g, t < tTurn);
        const lift = seg(t, tGripBoot, tTurn);
        base.legB = { to: hand, foot: lerp(16, 20, lift) };
        base.x = lerp(SANTA_LAND[0], HOLD[0] + 31, smooth(seg(t, tGripBoot + 100, tDrag)));
        base.y = lerp(SANTA_LAND[1], 171, smooth(seg(t, tGripBoot + 100, tDrag)));
        base.look = -1;
        base.nod = -12 * lift;
      }
      s.santa = base;
    } else if (t < tGone + 40 && g) {
      s.santa = santaDrag(t, g);
      s.santaInside = false;
    }

    // ---- effects
    if (t >= tImpact && t < tImpact + 700) s.dust.push({ x: SIT_X - 2, y: FLOOR - 1, u: (t - tImpact) / 700, spread: 1.1, dir: -1 });
    if (t >= tLand && t < tLand + 700) s.dust.push({ x: SANTA_LAND[0] + 6, y: FLOOR - 1, u: (t - tLand) / 700, spread: 1.4, dir: 1 });
    if (t >= tLanded && t < tLanded + 600) s.dust.push({ x: RUN_FROM, y: FLOOR - 1, u: (t - tLanded) / 600, spread: .8, dir: 0 });
    if (t >= tRun2 && t < tRun2 + 650) s.dust.push({ x: RUN_FROM + 4, y: FLOOR - 1, u: (t - tRun2) / 650, spread: .9, dir: 1 });
    if (t >= tDrag && t < tGone && g) {
      // dust kicked up where Santa scrapes along the floor
      const ph = ((t - tDrag) % 900) / 900;
      const sp = s.santa;
      if (sp) s.dust.push({ x: sp.x + 4, y: FLOOR - 1, u: ph, spread: .55, dir: 1 });
    }
    if (t > tZ && t < tBeep + 200 && g) {
      const h = headTop(g);
      s.zzz = { x: h[0] - 2, y: h[1] + 4, u: ((t - tZ) % 1500) / 1500 };
    }

    // ---- shadows
    if (g && !s.chair) {
      const lift = Math.max(0, Math.min(g.legN.y, g.legF.y) < ANK - 2 ? (ANK - Math.min(g.legN.y, g.legF.y)) / 20 : 0);
      const sittingOnFloor = g.y > FLOOR - 24;
      s.shadows.push({ x: sittingOnFloor ? g.x + 18 : g.x, w: sittingOnFloor ? 34 : 17 * (1 - Math.min(.4, lift * .4)), o: .34 * (1 - Math.min(.5, lift * .5)) });
    }
    if (s.santa && !s.santaInside) {
      const lying = Math.abs(((s.santa.rot % 360) + 360) % 360 - 99) < 30;
      const air = Math.max(0, (SANTA_LAND[1] - s.santa.y) / 30);
      s.shadows.push({ x: s.santa.x + (lying ? 20 : 0), w: (lying ? 48 : 30) * (1 - Math.min(.5, air * .5)), o: .32 * (1 - Math.min(.6, air * .6)) });
    }

    // ---- speech bubbles and sound effects
    const life = (from: number, to: number) => ({ age: t - from, rest: to - t });
    if (g && t >= tSay1 && t < tSay1End) s.bubbles.push({ id: "nope", text: "OH NO YOU DON'T!", kind: "say", ...xy(headTop(g)), ...life(tSay1, tSay1End) });
    if (g && t >= tHn1 && t < tSlip) s.bubbles.push({ id: "hn1", text: "HNNNGH!", kind: "sfx", ...xy(offsetPt(headTop(g), -16, -2)), ...life(tHn1, tSlip), tilt: -7 });
    if (g && t >= tHn2 && t < tPop + 60) s.bubbles.push({ id: "hn2", text: "HNNNNGH!!", kind: "sfx", ...xy(offsetPt(headTop(g), -18, -3)), ...life(tHn2, tPop + 60), tilt: -9 });
    if (t >= tPop && t < tPop + 650) s.bubbles.push({ id: "pop", text: "POP!", kind: "pop", x: SX + 2, y: 104, ...life(tPop, tPop + 650), tilt: 8 });
    if (g && t >= tDrag + 300 && t < tDrag + 3700) s.bubbles.push({ id: "milk", text: "YOU'RE GONNA FINISH YOUR MILK AND COOKIES!", kind: "say", ...xy(headTop(g)), ...life(tDrag + 300, tDrag + 3700) });
    if (s.santa && t >= tTurn && t < tGone) {
      const h = santaHeadWorld(s.santa);
      s.bubbles.push({ id: "noo", text: "NOOOO!", kind: "noo", x: h[0] + 16, y: h[1] - 34, ...life(tTurn, tGone), tilt: 5 });
    }
    if (g && t >= tBeep && t < tBeep + 1100) {
      const pg = pagerWorld(g);
      const front = pg[0] - 104 > stage.left;
      s.bubbles.push({ id: "beep", text: "BEEP BEEP!", kind: "beep", ...xy(offsetPt(pg, front ? -50 : 54, front ? -4 : -16)), ...life(tBeep, tBeep + 1100), tilt: front ? 6 : -6 });
    }
    if (t >= tSay3 && t < tSay3End) {
      // (held steady over the spot where she landed and turns; she sprints out from under it)
      s.bubbles.push({ id: "run", text: "GOTTA RUN!", kind: "say", ...xy(runAnchor), ...life(tSay3, tSay3End) });
    }
    return s;
  };
  return { duration: END, sample, marks: { tSpot, tSnap, tShout, tRun, tYank, tPop, tGetUp, tTurn, tDrag, tGone, tStroll, tAtChair, tSit, tDoze, tBeep, tStartle, tRun2, tOff, END } };
}

const offsetPt = (p: Pt, dx: number, dy: number) => ({ x: p[0] + dx, y: p[1] + dy });
const xy = (p: Pt | { x: number; y: number }) => ("x" in p ? p : { x: p[0], y: p[1] });
