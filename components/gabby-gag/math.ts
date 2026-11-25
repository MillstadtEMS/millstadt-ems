// Small math kit for the chimney gag's puppets (degrees, screen coordinates: y grows downward).

export type Vec = { x: number; y: number };

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0..1 progress of t through [a, b]. */
export const seg = (t: number, a: number, b: number) => (b === a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a), 0, 1));
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const easeIn = (t: number) => t * t;
export const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
export const easeInOut = (t: number) => (t < .5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));
/** Overshoots past 1 and settles (a springy landing). */
export const backOut = (t: number, s = 1.9) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
export const rad = (d: number) => (d * Math.PI) / 180;
export const deg = (r: number) => (r * 180) / Math.PI;
/** A damped wobble: starts at amplitude 1 and dies away over `decay` (0..1 of t). */
export const wobble = (t: number, cycles: number, decay = 1) => Math.sin(t * cycles * 2 * Math.PI) * Math.max(0, 1 - t / decay);

/** Rotate a vector by a screen angle (degrees, clockwise positive like SVG's rotate()). */
export function rot(v: Vec, a: number): Vec {
  const c = Math.cos(rad(a)), s = Math.sin(rad(a));
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

/**
 * Two-bone IK in a limb's local frame. The limb hangs from `root` toward `target`; the joint bends
 * toward +x (forward) when `bend` is 1, toward -x when -1. Returns screen angles (degrees, the SVG
 * rotate() of each bone whose rest direction is straight down) and whether the target was reached.
 */
export function ik2(root: Vec, target: Vec, l1: number, l2: number, bend: 1 | -1) {
  const dx = target.x - root.x, dy = target.y - root.y;
  const full = Math.hypot(dx, dy);
  const d = clamp(full, Math.abs(l1 - l2) + 1e-3, (l1 + l2) * .9999);
  const reach = full <= (l1 + l2) * .9999;
  // angle of the root->target line, measured from straight down (screen: down = +y)
  const base = Math.atan2(-dx, dy);
  const cosA = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const a = Math.acos(cosA);
  // bend forward: the first bone swings toward +x of the line, i.e. a smaller screen angle
  const upper = base - bend * a;
  const cosB = clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1);
  const b = Math.PI - Math.acos(cosB);
  const lower = upper + bend * b;
  return { upper: deg(upper), lower: deg(lower), reach };
}
