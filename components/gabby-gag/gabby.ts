// Gabby as a cut-out puppet. Her painted parts (head, torso, upper arms, forearms with open hands or
// fists, boots) hang on a skeleton; her navy cargo pants are drawn live so her knees bend smoothly. The
// rig works in her own frame (facing right, the pelvis at the origin, y down, room px); facing left
// mirrors the whole puppet, so she always faces the way she travels.

import { ANKLE, G, GAG_ART, HEADS, type HeadId, type Pt } from "./art";
import { clamp, deg } from "./math";
import { drawHat } from "./props";
import { el, f, img, pin, show } from "./svg";

export type Hand = "open" | "fist";
/** An arm by angles: a = the upper arm from straight down (deg, + swings it forward), e = the elbow
 *  bend (deg, + folds the forearm forward). Angles are in her own frame, not the torso's. */
export type ArmFK = { a: number; e: number; hand: Hand };
/** An arm reaching for a point in the world (room px). bend 1 drops the elbow below the reach, -1 lifts it. */
export type ArmIK = { to: Pt; hand: Hand; bend?: 1 | -1 };
export type Arm = ArmFK | ArmIK;
/** A boot: its ankle in the world (room px) and its angle (deg, toe up +). A posed leg may also place
 *  its knee (world), e.g. thighs pointing at us in the armchair. */
export type Leg = { x: number; y: number; a: number; knee?: Pt };
export type Hat = { on: boolean; lift?: number; tilt?: number; dx?: number };

export type GabbyPose = {
  /** Pelvis (world, room px). */
  x: number;
  y: number;
  dir: 1 | -1;
  /** Torso lean (deg, + forward). */
  lean: number;
  /** Squash and stretch about the floor point under the pelvis. */
  sx?: number;
  sy?: number;
  floor?: number;
  head: HeadId;
  /** Head tilt (deg, + forward / down). */
  nod?: number;
  headDy?: number;
  /** Looking back over her shoulder (the head turned the other way). */
  headBack?: boolean;
  hat?: Hat;
  armN: Arm;
  armF: Arm;
  legN: Leg;
  legF: Leg;
  /** The pager on her belt flashing (0 off .. 1 lit). */
  pager?: number;
  /** Shiver offset (room px) for effort trembles. */
  shake?: number;
};

const rot = (v: Pt, a: number): [number, number] => {
  const r = (a * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
};
const add = (a: Pt, b: Pt): [number, number] => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Pt, b: Pt): [number, number] => [a[0] - b[0], a[1] - b[1]];
/** The angle of a bone from straight down, + toward her front (+x), in degrees. */
const boneAngle = (from: Pt, to: Pt) => deg(Math.atan2(to[0] - from[0], to[1] - from[1]));
const along = (p: Pt, a: number, len: number): [number, number] => {
  const r = (a * Math.PI) / 180;
  return [p[0] + Math.sin(r) * len, p[1] + Math.cos(r) * len];
};

/** Two-bone IK in her frame: the joint bends toward +x (bend 1) or -x (-1) of the root->target line. */
export function solve2(root: Pt, target: Pt, l1: number, l2: number, bend: 1 | -1): { joint: [number, number]; end: [number, number]; a1: number; a2: number } {
  const dx = target[0] - root[0], dy = target[1] - root[1];
  const full = Math.hypot(dx, dy) || 1e-6;
  const d = clamp(full, Math.abs(l1 - l2) + .01, (l1 + l2) * .999);
  const base = Math.atan2(dx, dy); // from straight down, + toward +x
  const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const a1 = base + bend * Math.acos(cosA);
  const joint: [number, number] = [root[0] + Math.sin(a1) * l1, root[1] + Math.cos(a1) * l1];
  const ux = dx / full, uy = dy / full;
  const end: [number, number] = [root[0] + ux * d, root[1] + uy * d];
  const a2 = Math.atan2(end[0] - joint[0], end[1] - joint[1]);
  return { joint, end, a1: deg(a1), a2: deg(a2) };
}

const UARM_LEN = Math.hypot(G.uarm.bot[0] - G.uarm.top[0], G.uarm.bot[1] - G.uarm.top[1]);
const UARM_INTRINSIC = boneAngle(G.uarm.top, G.uarm.bot);
const FARM = {
  open: { ...G.farm.open, len: Math.hypot(G.farm.open.hand[0] - G.farm.open.top[0], G.farm.open.hand[1] - G.farm.open.top[1]), intrinsic: boneAngle(G.farm.open.top, G.farm.open.hand) },
  fist: { ...G.farm.fist, len: Math.hypot(G.farm.fist.hand[0] - G.farm.fist.top[0], G.farm.fist.hand[1] - G.farm.fist.top[1]), intrinsic: boneAngle(G.farm.fist.top, G.farm.fist.hand) },
};
export const ARM_REACH = UARM_LEN + FARM.fist.len;

// Torso anchors relative to the pelvis.
const T = G.torso;
const rel = (p: Pt): Pt => [p[0] - T.pelvis[0], p[1] - T.pelvis[1]];
const NECK = rel(T.neck), SH_N = rel(T.shN), SH_F = rel(T.shF), HIP_N = rel(T.hipN), HIP_F = rel(T.hipF);
/** Where a hand sits relative to the pelvis for a given torso lean (for scripting reaches). */
export const shoulderAt = (near: boolean, lean: number) => rot(near ? SH_N : SH_F, lean);
export const neckAt = (lean: number) => rot(NECK, lean);
export const HIPS = { near: HIP_N, far: HIP_F };

const PANTS = {
  near: { fill: "#18213a", lite: "#283456", ink: "#070a13", pocket: "#1d2846" },
  far: { fill: "#0f1527", lite: "#18203a", ink: "#05070d", pocket: "#131a30" },
};
const THIGH_W = 11.2, SHIN_W = 9.4, INK = 1.1;

type LegEls = { inkT: SVGPathElement; inkS: SVGPathElement; fillT: SVGPathElement; fillS: SVGPathElement; lite: SVGPathElement; pocket: SVGPathElement; crease: SVGPathElement; boot: SVGImageElement };
type ArmEls = { upper: SVGImageElement; open: SVGImageElement; fist: SVGImageElement };

export class GabbyRig {
  readonly root: SVGGElement;
  private legs: { near: LegEls; far: LegEls };
  private arms: { near: ArmEls; far: ArmEls };
  private torso: SVGImageElement;
  private headG: SVGGElement;
  private heads = new Map<HeadId, SVGImageElement>();
  private hatG: SVGGElement;
  private pagerG: SVGGElement;
  private pagerLed: SVGCircleElement;
  private current: HeadId | null = null;

  constructor(parent: Element) {
    this.root = el("g", { class: "gabby" }, parent);
    const r = this.root;
    const arm = (side: "near" | "far", into: Element): ArmEls => {
      const g = el("g", {}, into);
      // the forearm sits under the upper arm, whose sleeve and elbow cover the joint
      const open = img(`${GAG_ART}/g-farm-open-${side}.webp`, G.farm.open.w, G.farm.open.h, g);
      const fist = img(`${GAG_ART}/g-farm-fist-${side}.webp`, G.farm.fist.w, G.farm.fist.h, g);
      const upper = img(`${GAG_ART}/g-uarm-${side}.webp`, G.uarm.w, G.uarm.h, g);
      return { upper, open, fist };
    };
    const leg = (side: "near" | "far", into: Element): LegEls => {
      const g = el("g", { "stroke-linecap": "round", "stroke-linejoin": "round", fill: "none" }, into);
      const c = PANTS[side];
      const inkT = el("path", { stroke: c.ink, "stroke-width": THIGH_W + INK * 2 }, g);
      const inkS = el("path", { stroke: c.ink, "stroke-width": SHIN_W + INK * 2 }, g);
      const fillT = el("path", { stroke: c.fill, "stroke-width": THIGH_W }, g);
      const fillS = el("path", { stroke: c.fill, "stroke-width": SHIN_W }, g);
      const lite = el("path", { stroke: c.lite, "stroke-width": 2.4, opacity: .9 }, g);
      const pocket = el("path", { fill: c.pocket, stroke: c.ink, "stroke-width": .8 }, g);
      const crease = el("path", { stroke: c.ink, "stroke-width": .9, opacity: .8 }, g);
      const boot = img(`${GAG_ART}/g-boot-${side}.webp`, G.boot.w, G.boot.h, g);
      return { inkT, inkS, fillT, fillS, lite, pocket, crease, boot };
    };
    const farArm = arm("far", r);
    const farLeg = leg("far", r);
    const nearLeg = leg("near", r);
    this.torso = img(`${GAG_ART}/${T.src}`, T.w, T.h, r);
    // the pager clipped on her belt (it flashes when the call comes in)
    this.pagerG = el("g", {}, r);
    el("rect", { x: -2.6, y: -3.2, width: 5.2, height: 6.4, rx: 1.1, fill: "#15171c", stroke: "#000", "stroke-width": .5 }, this.pagerG);
    el("rect", { x: -1.7, y: -2.3, width: 3.4, height: 2.2, rx: .4, fill: "#6f8f78" }, this.pagerG);
    this.pagerLed = el("circle", { cx: 1.3, cy: 1.6, r: .9, fill: "#ff3b30" }, this.pagerG);
    this.headG = el("g", {}, r);
    for (const id of HEADS) {
      const h = img(`${GAG_ART}/g-head-${id}.webp`, G.head.w, G.head.h, this.headG);
      show(h, false);
      this.heads.set(id, h);
    }
    this.hatG = el("g", {}, this.headG);
    drawHat(this.hatG, 1);
    const nearArm = arm("near", r);
    this.legs = { near: nearLeg, far: farLeg };
    this.arms = { near: nearArm, far: farArm };
  }

  pose(p: GabbyPose) {
    const sx = p.sx ?? 1, sy = p.sy ?? 1, floor = p.floor ?? p.y + G.stand;
    const shake = p.shake ?? 0;
    this.root.setAttribute("transform", `translate(${f(p.x + shake)} ${f(floor)}) scale(${f(p.dir * sx)} ${f(sy)}) translate(0 ${f(p.y - floor)})`);
    // world -> her frame
    const local = (w: Pt): Pt => [(w[0] - p.x) * p.dir / sx, (w[1] - floor) / sy - (p.y - floor)];
    const lean = p.lean;
    this.torso.setAttribute("transform", pin(0, 0, lean, T.pelvis[0], T.pelvis[1]));
    // pager on the belt's front
    const pg = rot([8.6, -5.6], lean);
    this.pagerG.setAttribute("transform", `translate(${f(pg[0])} ${f(pg[1])}) rotate(${f(lean)})`);
    show(this.pagerG, true);
    this.pagerLed.setAttribute("opacity", f(.25 + .75 * (p.pager ?? 0)));
    this.pagerLed.setAttribute("r", f(.9 + (p.pager ?? 0) * .7));
    // head
    const neck = rot(NECK, lean);
    const headRot = lean * .45 + (p.nod ?? 0);
    this.headG.setAttribute("transform", `translate(${f(neck[0])} ${f(neck[1] + (p.headDy ?? 0))}) rotate(${f(headRot)}) scale(${p.headBack ? -1 : 1} 1) translate(${f(-G.head.neck[0])} ${f(-G.head.neck[1])})`);
    if (this.current !== p.head) {
      if (this.current) show(this.heads.get(this.current)!, false);
      show(this.heads.get(p.head)!, true);
      this.current = p.head;
    }
    const hat = p.hat;
    show(this.hatG, Boolean(hat?.on));
    if (hat?.on) {
      // the hat sits on her crown, tipped back; lift and tilt let it nearly fly off when she runs
      const [cx, cy] = G.head.crown;
      this.hatG.setAttribute("transform", `translate(${f(cx + (hat.dx ?? 0))} ${f(cy - (hat.lift ?? 0))}) rotate(${f(-14 + (hat.tilt ?? 0))}) scale(.93)`);
    }
    // arms
    this.arm(this.arms.near, rot(SH_N, lean), p.armN, local);
    this.arm(this.arms.far, rot(SH_F, lean), p.armF, local);
    // legs
    this.leg(this.legs.near, rot(HIP_N, lean * .35), p.legN, local);
    this.leg(this.legs.far, rot(HIP_F, lean * .35), p.legF, local);
  }

  private arm(els: ArmEls, sh: Pt, arm: Arm, local: (w: Pt) => Pt) {
    const fa = FARM[arm.hand];
    let a1: number, a2: number, elbow: Pt;
    if ("to" in arm) {
      const s = solve2(sh, local(arm.to), UARM_LEN, fa.len, arm.bend === -1 ? 1 : -1);
      a1 = s.a1; a2 = s.a2; elbow = s.joint;
    } else {
      a1 = arm.a; a2 = arm.a + arm.e;
      elbow = along(sh, a1, UARM_LEN);
    }
    els.upper.setAttribute("transform", pin(sh[0], sh[1], UARM_INTRINSIC - a1, G.uarm.top[0], G.uarm.top[1]));
    const fore = arm.hand === "open" ? els.open : els.fist;
    const other = arm.hand === "open" ? els.fist : els.open;
    show(fore, true);
    show(other, false);
    fore.setAttribute("transform", pin(elbow[0], elbow[1], fa.intrinsic - a2, fa.top[0], fa.top[1]));
  }

  private leg(els: LegEls, hip: Pt, leg: Leg, local: (w: Pt) => Pt) {
    const ankle = local([leg.x, leg.y]);
    const ik = leg.knee ? null : solve2(hip, ankle, G.thigh, G.shin, 1);
    const knee = ik ? ik.joint : local(leg.knee!);
    // out of reach, the boot stays on the end of the leg rather than leaving a gap
    const end = ik ? ik.end : ankle;
    // start the thigh a little inside the torso so no gap opens at the hip
    const top = add(hip, [0, -3]);
    const dT = `M${f(top[0])} ${f(top[1])}L${f(knee[0])} ${f(knee[1])}`;
    const dS = `M${f(knee[0])} ${f(knee[1])}L${f(end[0])} ${f(end[1])}`;
    els.inkT.setAttribute("d", dT);
    els.fillT.setAttribute("d", dT);
    els.inkS.setAttribute("d", dS);
    els.fillS.setAttribute("d", dS);
    // a light seam down the front of the leg
    const nT = norm(sub(knee, top)), nS = norm(sub(end, knee));
    const off = (q: Pt, n: Pt, k: number): Pt => [q[0] + n[1] * -k, q[1] - n[0] * -k];
    const fT = off(top, nT, THIGH_W * .26), fK = off(knee, nT, THIGH_W * .22), fK2 = off(knee, nS, SHIN_W * .22), fA = off(end, nS, SHIN_W * .24);
    els.lite.setAttribute("d", `M${f(fT[0])} ${f(fT[1] + 4)}L${f(fK[0])} ${f(fK[1])}L${f(fK2[0])} ${f(fK2[1])}L${f(fA[0])} ${f(fA[1] - 2)}`);
    // the cargo pocket on the thigh's outside
    const pc = add(top, [(knee[0] - top[0]) * .58, (knee[1] - top[1]) * .58]);
    const ta = deg(Math.atan2(knee[1] - top[1], knee[0] - top[0])) - 90;
    els.pocket.setAttribute("d", "M-3.1 -3.6h6.2v6.6q0 1-1 1h-4.2q-1 0-1-1z M-3.1 -1.6h6.2");
    els.pocket.setAttribute("transform", `translate(${f(pc[0] - nT[1] * -1.2)} ${f(pc[1] + nT[0] * -1.2)}) rotate(${f(ta)})`);
    // a crease behind a bent knee
    const bendAmt = Math.abs(boneAngle(top, knee) - boneAngle(knee, end));
    els.crease.setAttribute("opacity", f(clamp((bendAmt - 25) / 40, 0, .85)));
    const back = off(knee, nT, -THIGH_W * .3);
    els.crease.setAttribute("d", `M${f(back[0] - 1.8)} ${f(back[1] - 1.6)}q1.6 1.4 3.6 .6`);
    els.boot.setAttribute("transform", pin(end[0], end[1], -leg.a, G.boot.ankle[0], G.boot.ankle[1]));
  }
}

/** Her frame -> the world, for a pose. */
function toWorld(p: GabbyPose, l: Pt): [number, number] {
  const sx = p.sx ?? 1, sy = p.sy ?? 1, floor = p.floor ?? p.y + G.stand;
  return [p.x + (p.shake ?? 0) + p.dir * sx * l[0], floor + sy * (l[1] + p.y - floor)];
}

/** Where a hand is in the world for a pose (an angled arm, or a reach clamped to the arm's length). */
export function handWorld(p: GabbyPose, near: boolean): [number, number] {
  const arm = near ? p.armN : p.armF;
  const sh = rot(near ? SH_N : SH_F, p.lean);
  const fa = FARM[arm.hand];
  if ("to" in arm) {
    const sx = p.sx ?? 1, sy = p.sy ?? 1, floor = p.floor ?? p.y + G.stand;
    const lt: Pt = [(arm.to[0] - p.x) * p.dir / sx, (arm.to[1] - floor) / sy - (p.y - floor)];
    return toWorld(p, solve2(sh, lt, UARM_LEN, fa.len, arm.bend === -1 ? 1 : -1).end);
  }
  const elbow = along(sh, arm.a, UARM_LEN);
  return toWorld(p, along(elbow, arm.a + arm.e, fa.len));
}

/** A shoulder in the world. */
export function shoulderWorld(p: GabbyPose, near: boolean): [number, number] {
  return toWorld(p, rot(near ? SH_N : SH_F, p.lean));
}

/** Where a knee is in the world for a pose (posed, or solved from the hip and the boot). */
export function legKnee(p: GabbyPose, near: boolean): [number, number] {
  const leg = near ? p.legN : p.legF;
  if (leg.knee) return [leg.knee[0], leg.knee[1]];
  const sx = p.sx ?? 1, sy = p.sy ?? 1, floor = p.floor ?? p.y + G.stand;
  const hip = rot(near ? HIP_N : HIP_F, p.lean * .35);
  const ankle: Pt = [(leg.x - p.x) * p.dir / sx, (leg.y - floor) / sy - (p.y - floor)];
  return toWorld(p, solve2(hip, ankle, G.thigh, G.shin, 1).joint);
}

/** The top of her hair in the world (for speech bubbles and the "!"). */
export function headTop(p: GabbyPose): [number, number] {
  const neck = rot(NECK, p.lean);
  const r = p.lean * .45 + (p.nod ?? 0);
  const top = add([neck[0], neck[1] + (p.headDy ?? 0)], rot([p.headBack ? -2 : 2, -31], r));
  return toWorld(p, top);
}

/** Her pager in the world. */
export function pagerWorld(p: GabbyPose): [number, number] {
  return toWorld(p, rot([8.6, -5.6], p.lean));
}

const norm = (v: Pt): [number, number] => {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
};

/** The ankle height above the floor for a flat boot (re-exported for scripting). */
export const ANKLE_UP = ANKLE;
