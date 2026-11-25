// Footstep-planned locomotion: every footfall is a fixed point on the floor with its own stance
// window, so a planted boot never slides, whatever the speed or easing. The pelvis glides along its
// path; a foot swings from one plant to its next in an arc; heel strike and toe-off roll the boot.
// Times are ms, distances room px, speeds room px per second.

import { clamp, easeInOut, lerp, seg, smooth } from "./math";

export type Style = "walk" | "run";
export type Plant = { foot: 0 | 1; x: number; t0: number; t1: number };
export type Loco = {
  style: Style;
  dir: 1 | -1;
  t0: number;
  /** When the pelvis arrives at x1. */
  t1: number;
  x0: number;
  x1: number;
  /** Step duration (ms) at cruise speed. */
  T: number;
  step: number;
  lift: number;
  v: number;
  plants: Plant[];
  /** Pelvis x along the path (held before the start and after the end). */
  px: (t: number) => number;
};
/** A boot at time t: ankle x (world), ankle height above the floor, angle (toe up +). */
export type FootState = { x: number; up: number; a: number; stance: boolean };
/** Boot geometry in room px: toe and heel relative to the ankle with the boot flat (forward, down). */
export type BootGeo = { toe: readonly [number, number]; heel: readonly [number, number]; ankle: number };

type LocoOpts = {
  style: Style;
  dir: 1 | -1;
  t0: number;
  x0: number;
  x1: number;
  v: number;
  step: number;
  /** Stance length in steps (walk 1.2: both boots down a moment; run .64: a flight phase). */
  sigma?: number;
  lift?: number;
  easeStart?: boolean;
  easeEnd?: boolean;
  /** Where the boots stand before the first step (world x, [near, far]); omitted: already walking. */
  startFeet?: readonly [number, number];
  /** Final stance: each boot's offset from x1 (facing units, + forward), [near, far]. */
  endFeet?: readonly [number, number];
  /** Each hip's forward offset from the pelvis (room px), so a boot lands under its own hip. */
  hips?: readonly [number, number];
  /** The boot that steps first from a standing start. */
  lead?: 0 | 1;
};

function pathOf(o: LocoOpts) {
  const D = Math.abs(o.x1 - o.x0), vms = o.v / 1000, T = o.step / vms;
  let ta = o.easeStart ? T : 0, tb = o.easeEnd ? T : 0;
  let accel = vms * ta / 2, brake = vms * tb / 2;
  if (accel + brake > D) {
    const k = D / (accel + brake);
    ta *= k; tb *= k; accel *= k; brake *= k;
  }
  const tc = (D - accel - brake) / vms;
  const dur = ta + tc + tb;
  const u = (t: number) => {
    const s = clamp(t - o.t0, 0, dur);
    if (s < ta) return vms * s * s / (2 * ta);
    if (s < ta + tc) return accel + vms * (s - ta);
    const r = s - ta - tc;
    return accel + vms * tc + vms * r - (tb ? vms * r * r / (2 * tb) : 0);
  };
  return { D, T, dur, u };
}

export function makeLoco(o: LocoOpts): Loco {
  const sigma = o.sigma ?? (o.style === "run" ? .64 : 1.2);
  const { T, dur, u } = pathOf(o);
  const px = (t: number) => o.x0 + o.dir * u(t);
  const hips = o.hips ?? [0, 0];
  const half = sigma * T / 2;
  const tEnd = o.t0 + dur;
  const lead = o.lead ?? 0, other = (1 - lead) as 0 | 1;
  const plants: Plant[] = [];
  // footfall j (lead, other, lead, ...) is under its hip at tc(j)
  const footOf = (j: number) => ((((j % 2) + 2) % 2) === 0 ? lead : other);
  const phase = o.startFeet ? 1 : .5;
  const tcOf = (j: number) => o.t0 + (j + phase) * T;
  if (o.startFeet) {
    // standing start: the lead boot leaves first and lands at footfall 0; the other boot holds her up
    // until the lead one is down, then pushes off for footfall 1
    plants.push({ foot: lead, x: o.startFeet[lead], t0: -Infinity, t1: o.t0 + T * .06 });
    plants.push({ foot: other, x: o.startFeet[other], t0: -Infinity, t1: tcOf(0) - half + T * .15 });
  } else {
    // already on the move: footfalls laid out before t0 as if the gait had always been running
    for (let j = -3; j < 0; j++) {
      const tc = tcOf(j), f = footOf(j);
      plants.push({ foot: f, x: o.x0 + o.dir * ((o.v / 1000) * (tc - o.t0) + hips[f]), t0: tc - half, t1: tc + half });
    }
  }
  const endMargin = o.easeEnd ? .55 * T : 0;
  for (let j = 0; ; j++) {
    const tc = tcOf(j);
    if (tc > tEnd - endMargin) break;
    const f = footOf(j);
    plants.push({ foot: f, x: px(tc) + o.dir * hips[f], t0: tc - half, t1: tc + half });
  }
  const lastOf = (f: 0 | 1) => {
    for (let i = plants.length - 1; i >= 0; i--) if (plants[i].foot === f) return plants[i];
    return plants[0];
  };
  if (o.endFeet) {
    // braking into a stance: each boot lands on its final spot only once the hips have caught up with
    // it (so the last steps never overreach), the one that has been down longest first
    const final = (f: 0 | 1) => o.x1 + o.dir * o.endFeet![f];
    const tAt = (x: number) => {
      for (let t = o.t0; t < tEnd; t += 4) if ((px(t) - x) * o.dir >= 0) return t;
      return tEnd;
    };
    const a = lastOf(0), b = lastOf(1);
    const older = a.t0 < b.t0 ? a : b, newer = older === a ? b : a;
    const reach = (f: 0 | 1, k: number) => final(f) - o.dir * (hips[f] + k * o.step);
    const landOlder = Math.max(tAt(reach(older.foot, .3)), newer.t0 + T * .3, (Number.isFinite(older.t0) ? older.t0 : o.t0) + T * .9);
    older.t1 = Math.max(Number.isFinite(older.t0) ? older.t0 : -Infinity, Math.min(older.t1, landOlder - T * .62));
    plants.push({ foot: older.foot, x: final(older.foot), t0: landOlder, t1: Infinity });
    if (Math.abs(newer.x - final(newer.foot)) > 1.5) {
      newer.t1 = Math.max(newer.t0 + T * .25, landOlder + T * .12);
      const landNewer = Math.max(newer.t1 + T * .5, tAt(reach(newer.foot, .05)));
      plants.push({ foot: newer.foot, x: final(newer.foot), t0: landNewer, t1: Infinity });
    } else newer.t1 = Infinity;
  } else {
    // walking on past the end at cruise speed (exits off-screen)
    let j = Math.floor((tEnd - o.t0) / T - phase) + 1;
    while (plants.some(p => p.t0 >= tcOf(j) - half - 1)) j++;
    for (let n = 0; n < 6; n++, j++) {
      const tc = tcOf(j), f = footOf(j);
      plants.push({ foot: f, x: o.x1 + o.dir * ((o.v / 1000) * (tc - tEnd) + hips[f]), t0: tc - half, t1: tc + half });
    }
  }
  plants.sort((p, q) => p.t0 - q.t0);
  // a boot never stands in two places at once: each plant ends before that boot's next one begins
  for (const f of [0, 1] as const) {
    const mine = plants.filter(p => p.foot === f);
    for (let i = 0; i + 1 < mine.length; i++) {
      const gap = T * (o.style === "run" ? .3 : .22);
      if (mine[i].t1 > mine[i + 1].t0 - gap) mine[i].t1 = Math.max(Number.isFinite(mine[i].t0) ? mine[i].t0 : -Infinity, mine[i + 1].t0 - gap);
    }
  }
  return { style: o.style, dir: o.dir, t0: o.t0, t1: tEnd, x0: o.x0, x1: o.x1, T, step: o.step, v: o.v, lift: o.lift ?? (o.style === "run" ? 10 : 4.5), plants, px };
}

/** Pelvis x at time t: along the path, holding before the start, carrying on at cruise speed after the end
 *  of a segment that doesn't stop (so a walk-off keeps walking off). */
export function pelvisAt(l: Loco, t: number, keepGoing = false) {
  if (t <= l.t1 || !keepGoing) return l.px(t);
  return l.x1 + l.dir * (l.v / 1000) * (t - l.t1);
}

/** One boot's state at time t. */
export function footAt(l: Loco, foot: 0 | 1, t: number, geo: BootGeo): FootState {
  const run = l.style === "run";
  const heelUp = run ? 6 : 14, toeOff = run ? -44 : -32;
  let prev: Plant | null = null, next: Plant | null = null;
  for (const p of l.plants) {
    if (p.foot !== foot) continue;
    if (t >= p.t0 && t <= p.t1) {
      // planted: heel strike rolls the sole down, toe-off peels the heel up over the toe
      if (Number.isFinite(p.t0) && !run && t - p.t0 < l.T * .16) {
        const a = heelUp * (1 - smooth(seg(t, p.t0, p.t0 + l.T * .16)));
        return { ...pivot(p.x, l.dir, a, geo.heel, geo), stance: true };
      }
      if (Number.isFinite(p.t1)) {
        const roll = seg(t, p.t1 - l.T * (run ? .3 : .42), p.t1);
        if (roll > 0) return { ...pivot(p.x, l.dir, toeOff * Math.pow(roll, 1.6), geo.toe, geo), stance: true };
      }
      return { x: p.x, up: geo.ankle, a: 0, stance: true };
    }
    if (p.t1 < t) prev = p;
    else if (p.t0 > t && !next) next = p;
  }
  if (!prev || !next) {
    const p = prev ?? next!;
    return { x: p.x, up: geo.ankle, a: 0, stance: true };
  }
  const q = seg(t, prev.t1, next.t0);
  const from = pivot(prev.x, l.dir, toeOff, geo.toe, geo);
  const toA = run ? heelUp : heelUp;
  const to = pivot(next.x, l.dir, toA, geo.heel, geo);
  // a run kicks the heel up behind before the knee drives the boot forward; a walk swings evenly
  const xq = run ? easeInOut(clamp((q - .1) / .9, 0, 1)) : easeInOut(q);
  const lift = l.lift * (run ? Math.sin(Math.PI * Math.pow(q, .75)) : Math.sin(Math.PI * q));
  const a = lerp(toeOff, toA, smooth(q)) + (run ? 14 * Math.sin(Math.PI * q) : 6 * Math.sin(Math.PI * q));
  return { x: lerp(from.x, to.x, xq), up: lerp(from.up, to.up, q) + lift, a, stance: false };
}

/** The ankle of a boot tipped by angle a (toe up +) about a contact point (toe or heel) that stays put,
 *  where the boot lies flat with its ankle at ankleX. */
function pivot(ankleX: number, dir: 1 | -1, a: number, contact: readonly [number, number], geo: BootGeo) {
  const [cx, cy] = contact;
  const r = (a * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  // ankle relative to the contact (right-facing frame, y down), turned counter-clockwise by a
  const vx = -cx, vy = -cy;
  const rx = vx * c + vy * s, ry = -vx * s + vy * c;
  return { x: ankleX + dir * (cx + rx), up: geo.ankle - cy - ry, a };
}
