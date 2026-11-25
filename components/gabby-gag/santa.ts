// A big, fat Santa as a cut-out puppet: the owner's shocked Santa head on a round, live-drawn body
// (red coat with white fur, black belt and gold buckle, red sleeves and pants, white gloves, black
// boots). The body turns between a front view (stuck upside down in the chimney, belly wedged in the
// arch) and a side view (flying out, lying on his back being dragged) with `turn`, and the belly
// squashes and stretches on its own. His frame: the pelvis at the origin, y down, room px.

import { SANTA_HEAD, GAG_ART, type Pt } from "./art";
import { solve2 } from "./gabby";
import { drawHat } from "./props";
import { clamp, lerp } from "./math";
import { el, f, img, pin, show } from "./svg";

export type SantaArm = { to: Pt; bend?: 1 | -1 } | { a: number; e: number };
export type SantaLeg = { to: Pt; foot?: number; bend?: 1 | -1 } | { a: number; e: number; foot?: number };
export type SantaPose = {
  x: number;
  y: number;
  /** Body rotation (deg, clockwise; 180 = upside down). */
  rot: number;
  /** -1 side view facing left, 0 front, 1 side view facing right. */
  turn: number;
  /** Belly squash and stretch (1 = round). */
  bsx?: number;
  bsy?: number;
  /** Whole-body squash and stretch along his own axes (impacts, springing out). */
  sx?: number;
  sy?: number;
  /** The head: which way he looks (-1 left, 1 right), tilt (deg) and an offset along the neck. */
  look: 1 | -1;
  nod?: number;
  hat?: { on: boolean; lift?: number; tilt?: number };
  /** Arms and legs: targets in the world, or angles in his frame (deg from his "down", + toward his front). */
  armA: SantaArm;
  armB: SantaArm;
  legA: SantaLeg;
  legB: SantaLeg;
};

const RED = "#c81f29", RED_DARK = "#7e0d14", INK = "#2a0606", FUR = "#f8f2e7", FUR_INK = "#3c2a22";
const UPPER = 15, FORE = 14, THIGH = 18, SHIN = 17;
const HEAD_K = .82;

type Limb = { ink: SVGPathElement; fill: SVGPathElement; cuff: SVGPathElement; end: SVGGElement };

export class SantaRig {
  readonly root: SVGGElement;
  private body: SVGGElement;
  private bellyG: SVGGElement;
  private belly: SVGEllipseElement;
  private bellyShade: SVGEllipseElement;
  private fur: SVGPathElement;
  private belt: SVGPathElement;
  private buckle: SVGRectElement;
  private hem: SVGPathElement;
  private armA: Limb;
  private armB: Limb;
  private legA: Limb;
  private legB: Limb;
  private armBFront: SVGGElement;
  private armBBack: SVGGElement;
  private headG: SVGGElement;
  private headImg: SVGImageElement;
  private hatG: SVGGElement;

  constructor(parent: Element, defs: SVGDefsElement, id: string) {
    this.root = el("g", { class: "santa" }, parent);
    const grad = el("radialGradient", { id: `${id}-belly`, cx: .36, cy: .3, r: .78 }, defs);
    el("stop", { offset: 0, "stop-color": "#ef4f4c" }, grad);
    el("stop", { offset: .48, "stop-color": RED }, grad);
    el("stop", { offset: 1, "stop-color": RED_DARK }, grad);
    this.body = el("g", { "stroke-linecap": "round", "stroke-linejoin": "round" }, this.root);
    const limb = (into: Element, w: number, kind: "arm" | "leg"): Limb => {
      const g = el("g", {}, into);
      const ink = el("path", { fill: "none", stroke: INK, "stroke-width": w + 2.2 }, g);
      const fill = el("path", { fill: "none", stroke: kind === "arm" ? "#c41c26" : "#b81a23", "stroke-width": w }, g);
      const cuff = el("path", { fill: "none", stroke: FUR, "stroke-width": w + 2.6 }, g);
      const end = el("g", {}, g);
      if (kind === "arm") {
        // a white glove: palm and thumb
        el("ellipse", { cx: 0, cy: 3.6, rx: 3.9, ry: 4.4, fill: "#fbfbf7", stroke: "#3b3b3b", "stroke-width": 1 }, end);
        el("ellipse", { cx: 3.3, cy: 1.8, rx: 1.6, ry: 2.4, fill: "#fbfbf7", stroke: "#3b3b3b", "stroke-width": .9, transform: "rotate(-30 3.3 1.8)" }, end);
      } else {
        // a black boot with a fur cuff; the toe points along +x
        el("path", { d: "M-4.6 -4 L4 -4 L4.4 1.5 C9 1.5 13.5 2.6 13.8 5.4 L13.8 7.4 L-5.2 7.4 Z", fill: "#16120f", stroke: "#000", "stroke-width": 1 }, end);
        el("path", { d: "M-3.4 -2.6 L2.4 -2.6", stroke: "#3d342c", "stroke-width": 1.2 }, end);
        el("path", { d: "M-5.4 6.6 L13.8 6.6", stroke: "#3a312a", "stroke-width": 1.1 }, end);
      }
      return { ink, fill, cuff, end };
    };
    this.legA = limb(this.body, 12, "leg");
    this.legB = limb(this.body, 12, "leg");
    this.armBBack = el("g", {}, this.body);
    this.armA = limb(this.body, 9.6, "arm");
    this.bellyG = el("g", {}, this.body);
    this.belly = el("ellipse", { fill: `url(#${id}-belly)`, stroke: INK, "stroke-width": 1.3 }, this.bellyG);
    this.bellyShade = el("ellipse", { fill: "none", stroke: "#5c0a10", "stroke-width": 2.4, opacity: .35 }, this.bellyG);
    this.hem = el("path", { fill: FUR, stroke: FUR_INK, "stroke-width": 1 }, this.bellyG);
    this.fur = el("path", { fill: FUR, stroke: FUR_INK, "stroke-width": 1 }, this.bellyG);
    this.belt = el("path", { fill: "#141210", stroke: "#000", "stroke-width": .8 }, this.bellyG);
    this.buckle = el("rect", { width: 7.4, height: 6.6, rx: 1, fill: "none", stroke: "#e2b23a", "stroke-width": 1.7 }, this.bellyG);
    this.armBFront = el("g", {}, this.body);
    this.armB = limb(this.armBBack, 9.6, "arm");
    this.headG = el("g", {}, this.body);
    this.headImg = img(`${GAG_ART}/${SANTA_HEAD.src}`, SANTA_HEAD.w * HEAD_K, SANTA_HEAD.h * HEAD_K, this.headG);
    this.hatG = el("g", {}, this.headG);
    drawHat(this.hatG, .94);
  }

  pose(p: SantaPose) {
    const t = clamp(p.turn, -1, 1), a = Math.abs(t), s = t < 0 ? -1 : 1;
    const ssx = p.sx ?? 1, ssy = p.sy ?? 1;
    this.root.setAttribute("transform", `translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.rot)}) scale(${f(ssx)} ${f(ssy)})`);
    const inv = (w: Pt): Pt => {
      // world -> his frame
      const r = (-p.rot * Math.PI) / 180, c = Math.cos(r), sn = Math.sin(r);
      const dx = w[0] - p.x, dy = w[1] - p.y;
      return [(dx * c - dy * sn) / ssx, (dx * sn + dy * c) / ssy];
    };
    // the belly: round and huge, pushed forward in profile
    const bsx = p.bsx ?? 1, bsy = p.bsy ?? 1;
    const rx = (32 - 4 * a) * bsx, ry = 28 * bsy;
    const bx = 12 * t, by = -28 - (bsy - 1) * 10;
    for (const e of [this.belly, this.bellyShade]) {
      e.setAttribute("cx", f(bx)); e.setAttribute("cy", f(by));
      e.setAttribute("rx", f(e === this.belly ? rx : rx - 2.2)); e.setAttribute("ry", f(e === this.belly ? ry : ry - 2.2));
    }
    // fur placket down the front (in the middle face-on, at the front edge in profile)
    const off = t * .82, w = 6.4 * (1 - .45 * a);
    const curve = (u: number, k: number) => {
      const pts: string[] = [];
      for (let i = 0; i <= 8; i++) {
        const yy = by - ry * .86 + (ry * 1.72) * (i / 8);
        const half = Math.sqrt(Math.max(0, 1 - ((yy - by) / ry) ** 2));
        pts.push(`${f(bx + rx * half * (off + u) + k)} ${f(yy)}`);
      }
      return pts;
    };
    const left = curve(0, -w / 2), right = curve(0, w / 2).reverse();
    this.fur.setAttribute("d", `M${left.join("L")}L${right.join("L")}Z`);
    // belt: a band across the belly just under its middle, following the curve
    const beltY = by + ry * .2, bh = 5.2;
    const half = (yy: number) => rx * Math.sqrt(Math.max(0, 1 - ((yy - by) / ry) ** 2)) * .995;
    const y1 = beltY - bh / 2, y2 = beltY + bh / 2;
    this.belt.setAttribute("d", `M${f(bx - half(y1))} ${f(y1)}Q${f(bx)} ${f(y1 + 3)} ${f(bx + half(y1))} ${f(y1)}L${f(bx + half(y2))} ${f(y2)}Q${f(bx)} ${f(y2 + 3)} ${f(bx - half(y2))} ${f(y2)}Z`);
    const bkx = bx + rx * Math.sqrt(1 - .04) * off;
    this.buckle.setAttribute("x", f(bkx - 3.7)); this.buckle.setAttribute("y", f(beltY - 3.3 + 1.2));
    // the coat's fur hem along the bottom of the belly
    const hy = by + ry * .78, hh = half(hy), hy2 = by + ry * .97, hh2 = half(hy2);
    this.hem.setAttribute("d", `M${f(bx - hh)} ${f(hy)}Q${f(bx)} ${f(hy + 4)} ${f(bx + hh)} ${f(hy)}L${f(bx + hh2)} ${f(hy2)}Q${f(bx)} ${f(hy2 + 5)} ${f(bx - hh2)} ${f(hy2)}Z`);
    // limbs
    const shA: Pt = [lerp(-21, -6 * s, a), -48 - 2 * a], shB: Pt = [lerp(21, 5 * s, a), -47];
    const hipA: Pt = [lerp(-10, -3 * s, a), -2], hipB: Pt = [lerp(10, 3 * s, a), 0];
    this.limb(this.armA, shA, p.armA, UPPER, FORE, inv, "arm", s);
    this.limb(this.armB, shB, p.armB, UPPER, FORE, inv, "arm", s);
    this.limb(this.legA, hipA, p.legA, THIGH, SHIN, inv, "leg", s);
    this.limb(this.legB, hipB, p.legB, THIGH, SHIN, inv, "leg", s);
    // in profile the near arm swings in front of the belly
    const front = a > .5;
    const host = front ? this.armBFront : this.armBBack;
    const g = this.armB.ink.parentNode as SVGGElement;
    if (g.parentNode !== host) host.appendChild(g);
    // head on the neck, looking left or right; hat on the crown
    const neck: Pt = [2 * t, -53];
    const hk = HEAD_K;
    const look = p.look;
    this.headG.setAttribute("transform", `translate(${f(neck[0])} ${f(neck[1])}) rotate(${f(p.nod ?? 0)}) scale(${look} 1)`);
    this.headImg.setAttribute("x", f(-SANTA_HEAD.neck[0] * hk));
    this.headImg.setAttribute("y", f(-SANTA_HEAD.neck[1] * hk));
    show(this.hatG, Boolean(p.hat?.on));
    if (p.hat?.on) {
      const cx = (SANTA_HEAD.crown[0] - SANTA_HEAD.neck[0]) * hk, cy = (SANTA_HEAD.crown[1] - SANTA_HEAD.neck[1]) * hk;
      this.hatG.setAttribute("transform", `translate(${f(cx - 1.5)} ${f(cy + 3.2 - (p.hat.lift ?? 0))}) rotate(${f(-10 + (p.hat.tilt ?? 0))})`);
    }
  }

  private limb(L: Limb, root: Pt, spec: SantaArm | SantaLeg, l1: number, l2: number, inv: (w: Pt) => Pt, kind: "arm" | "leg", s: number) {
    let joint: Pt, end: Pt, a2: number;
    if ("to" in spec) {
      // rubber-hose limbs: an arm stretches up to 1.8x (a leg 1.25x) to keep hold of what it grips
      const target = inv(spec.to);
      const k = clamp(Math.hypot(target[0] - root[0], target[1] - root[1]) / ((l1 + l2) * .98), 1, kind === "arm" ? 1.8 : 1.25);
      const r = solve2(root, target, l1 * k, l2 * k, (spec.bend ?? (kind === "leg" ? 1 : -1)) as 1 | -1);
      joint = r.joint; end = r.end; a2 = r.a2;
    } else {
      // angles from his "down" (+y), + toward his front (s)
      const a1 = spec.a * s, aa2 = (spec.a + spec.e) * s;
      joint = [root[0] + Math.sin(a1 * Math.PI / 180) * l1, root[1] + Math.cos(a1 * Math.PI / 180) * l1];
      end = [joint[0] + Math.sin(aa2 * Math.PI / 180) * l2, joint[1] + Math.cos(aa2 * Math.PI / 180) * l2];
      a2 = aa2;
    }
    const d = `M${f(root[0])} ${f(root[1])}L${f(joint[0])} ${f(joint[1])}L${f(end[0])} ${f(end[1])}`;
    L.ink.setAttribute("d", d);
    L.fill.setAttribute("d", d);
    // the white fur cuff just before the glove / boot
    const ux = Math.sin(a2 * Math.PI / 180), uy = Math.cos(a2 * Math.PI / 180);
    const c0: Pt = [end[0] - ux * 3.6, end[1] - uy * 3.6], c1: Pt = [end[0] - ux * .6, end[1] - uy * .6];
    L.cuff.setAttribute("d", `M${f(c0[0])} ${f(c0[1])}L${f(c1[0])} ${f(c1[1])}`);
    if (kind === "arm") {
      L.end.setAttribute("transform", `translate(${f(end[0])} ${f(end[1])}) rotate(${f(-a2)})`);
    } else {
      const foot = ("foot" in spec ? spec.foot : undefined) ?? 0;
      // boots point toward his front; the sole sits square to the shin unless told otherwise
      L.end.setAttribute("transform", `translate(${f(end[0])} ${f(end[1])}) scale(${s} 1) rotate(${f(-a2 * s - foot)})`);
    }
  }
}

/** Santa's face in the world (for his NOOOO!), roughly the middle of his head. */
export function santaHeadWorld(p: SantaPose): [number, number] {
  const t = clamp(p.turn, -1, 1);
  const lx = 2 * t + 4 * p.look, ly = -53 - 15;
  const r = (p.rot * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return [p.x + lx * c - ly * s, p.y + lx * s + ly * c];
}

export const SANTA_DIMS = { reachArm: UPPER + FORE, reachLeg: THIGH + SHIN, headK: HEAD_K };

// Re-exported so the scene can draw Santa's spare parts with the same look.
export const SANTA_COLORS = { RED, INK, FUR, FUR_INK };
export { pin };
