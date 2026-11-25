// The chimney gag's live-drawn props and effects: Santa's hat (which Gabby steals), the milk and
// cookies left on the hearth, dust puffs, the double take's "!", the dozing Zzz and the pager's
// flash. All in room px, with the painted art's warm colours and dark outlines.

import { el, f, show } from "./svg";

/** A Santa hat in head px: the fur band's centre at the origin, the cone flopping back (toward -x)
 *  over the crown, a white pompom at its tip. */
export function drawHat(into: Element, k: number) {
  const g = el("g", { transform: `scale(${k})`, "stroke-linejoin": "round", "stroke-linecap": "round" }, into);
  el("path", {
    d: "M14 1 C14 -9 6 -17 -4 -17 C-12 -17 -17 -12 -18.5 -5 C-14 -8.5 -9.5 -7.5 -7 -3 C-5.5 0 -9 1.5 -14 1 Z",
    fill: "#c4161f", stroke: "#2a0606", "stroke-width": 1.4,
  }, g);
  el("path", { d: "M9 -8 C5 -13 -2 -15 -8 -14", stroke: "#ff6a5e", "stroke-width": 1.7, fill: "none", opacity: .75 }, g);
  el("path", { d: "M4 -3 C2 -8 -3 -10 -8 -10", stroke: "#860b12", "stroke-width": 1.4, fill: "none", opacity: .55 }, g);
  el("path", { d: "M-15.5 -1 C-8 -4 7 -4 15.5 -1 C16.6 1.5 16.6 4 15.5 5.6 C7 3 -8 3 -15.5 5.6 C-16.6 3.5 -16.6 1 -15.5 -1 Z", fill: "#f7f1e6", stroke: "#3a2a22", "stroke-width": 1.1 }, g);
  el("path", { d: "M-12 2.2 q2 -1.3 4 0 q2 -1.3 4 0 q2 -1.3 4 0 q2 -1.3 4 0 q2 -1.3 4 0 q2 -1.3 4 0", stroke: "#d9cfbf", "stroke-width": .8, fill: "none" }, g);
  el("circle", { cx: -19.6, cy: -3.6, r: 4, fill: "#f7f1e6", stroke: "#3a2a22", "stroke-width": 1.1 }, g);
  el("path", { d: "M-21.4 -5 q1.4 -1.2 3 -.6", stroke: "#fff", "stroke-width": .9, fill: "none" }, g);
  return g;
}

/** A plate of cookies (one bitten) and a half-finished glass of milk on the hearth. */
export class MilkAndCookies {
  readonly root: SVGGElement;
  readonly plate: SVGGElement;
  readonly cookie: SVGGElement;
  readonly glass: SVGGElement;
  readonly splash: SVGPathElement;
  readonly puddle: SVGEllipseElement;
  constructor(parent: Element) {
    this.root = el("g", { class: "treats" }, parent);
    this.puddle = el("ellipse", { rx: 0, ry: 0, fill: "#fbfaf5", stroke: "#cfd3d6", "stroke-width": .5, opacity: 0 }, this.root);
    this.plate = el("g", {}, this.root);
    el("ellipse", { cx: 0, cy: 0, rx: 9, ry: 2.6, fill: "#f4f1ea", stroke: "#5b4a3c", "stroke-width": .9 }, this.plate);
    el("ellipse", { cx: 0, cy: -.3, rx: 6, ry: 1.5, fill: "none", stroke: "#c9b48e", "stroke-width": .6 }, this.plate);
    const cookieAt = (g: Element, x: number, y: number, bite: boolean) => {
      const c = el("g", { transform: `translate(${x} ${y})` }, g);
      el("path", { d: bite ? "M-3.4 0 A3.4 1.9 0 1 1 3 -.9 Q2 -.2 2.6 .9 A3.4 1.9 0 0 1 -3.4 0 Z" : "M-3.4 0 A3.4 1.9 0 1 1 3.4 0 A3.4 1.9 0 1 1 -3.4 0 Z", fill: "#c98a45", stroke: "#5a3414", "stroke-width": .7 }, c);
      for (const [dx, dy] of [[-1.4, -.4], [.6, .3], [1.2, -.7]]) el("circle", { cx: dx, cy: dy, r: .5, fill: "#3b1f0d" }, c);
      return c;
    };
    cookieAt(this.plate, -2.6, -1.6, false);
    cookieAt(this.plate, 2.6, -1.9, true);
    // the loose cookie that goes flying
    this.cookie = el("g", {}, this.root);
    const lone = el("g", {}, this.cookie);
    el("circle", { cx: 0, cy: 0, r: 3.3, fill: "#c98a45", stroke: "#5a3414", "stroke-width": .7 }, lone);
    for (const [dx, dy] of [[-1.2, -.8], [.9, .2], [-.2, 1.3], [1.1, -1.4]]) el("circle", { cx: dx, cy: dy, r: .55, fill: "#3b1f0d" }, lone);
    this.glass = el("g", {}, this.root);
    el("path", { d: "M-2.8 -9.5 L2.8 -9.5 L2.3 0 Q0 .9 -2.3 0 Z", fill: "#e9f2f6", "fill-opacity": .55, stroke: "#6d8794", "stroke-width": .7 }, this.glass);
    el("path", { d: "M-2.6 -5 L2.6 -5 L2.3 0 Q0 .9 -2.3 0 Z", fill: "#fdfdfb" }, this.glass);
    el("path", { d: "M-1.8 -8.6 L-1.6 -1", stroke: "#fff", "stroke-width": .6, opacity: .8 }, this.glass);
    this.splash = el("path", { d: "M0 0 q-3 -5 -6 -4 q2 1 1 3 q-4 -3 -5 0 q3 0 4 3 z", fill: "#fbfaf5", stroke: "#bfc6ca", "stroke-width": .5, opacity: 0 }, this.root);
  }
}

/** A soft dust cloud: a few puffs that bloom and fade. */
export class Dust {
  readonly root: SVGGElement;
  private puffs: SVGCircleElement[] = [];
  constructor(parent: Element, n = 5) {
    this.root = el("g", { class: "dust" }, parent);
    for (let i = 0; i < n; i++) this.puffs.push(el("circle", { r: 0, fill: "#e9dfcf", stroke: "#a99b86", "stroke-width": .6 }, this.root));
  }
  /** u: 0..1 through the puff's life; spread: how far it billows; dir: the way it drifts. */
  draw(x: number, y: number, u: number, spread = 1, dir = 0) {
    const on = u > 0 && u < 1;
    show(this.root, on);
    if (!on) return;
    const grow = 1 - Math.pow(1 - u, 2.4);
    this.root.setAttribute("opacity", f(Math.min(1, (1 - u) * 1.6) * .9));
    this.puffs.forEach((c, i) => {
      const k = i / (this.puffs.length - 1) - .5;
      c.setAttribute("cx", f(x + (k * 22 + dir * 8) * spread * grow));
      c.setAttribute("cy", f(y - (2 + Math.abs(k) * -2 + (i % 2) * 3) * spread * grow));
      c.setAttribute("r", f((2.2 + (i % 3) * .9) * (.5 + grow) * spread));
    });
  }
}

/** The double take's red "!" (and the startle's). */
export function drawBang(into: Element) {
  const g = el("g", { class: "bang" }, into);
  el("path", { d: "M-2.6 -16 L2.6 -16 L1.5 -4.6 L-1.5 -4.6 Z", fill: "#e01b24", stroke: "#3a0508", "stroke-width": 1.1, "stroke-linejoin": "round" }, g);
  el("circle", { cx: 0, cy: -1, r: 2.1, fill: "#e01b24", stroke: "#3a0508", "stroke-width": 1.1 }, g);
  return g;
}

/** Speed lines trailing a fast move. */
export class Streaks {
  readonly root: SVGGElement;
  private lines: SVGPathElement[] = [];
  constructor(parent: Element, n = 4) {
    this.root = el("g", { class: "streaks", stroke: "#fff8e8", "stroke-linecap": "round", fill: "none" }, parent);
    for (let i = 0; i < n; i++) this.lines.push(el("path", { "stroke-width": 1.4 }, this.root));
  }
  draw(x: number, y: number, dir: 1 | -1, amount: number, height = 40) {
    show(this.root, amount > .02);
    if (amount <= .02) return;
    this.root.setAttribute("opacity", f(Math.min(1, amount) * .85));
    this.lines.forEach((l, i) => {
      const yy = y - height * (.15 + .7 * (i / (this.lines.length - 1)));
      const len = (10 + (i % 2) * 7) * amount;
      const x0 = x - dir * (6 + (i % 3) * 3);
      l.setAttribute("d", `M${f(x0)} ${f(yy)}L${f(x0 - dir * len)} ${f(yy)}`);
    });
  }
}
