"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { isTesla } from "@/lib/device/profile";
import { claimPerson } from "@/lib/seasonal/cast";
import { isSnowballTimeout, snowballTimeoutEvent } from "@/lib/seasonal/snowballTimeout";
import { MYLIE_RIG as RIG } from "./WinterMylieRink.rig";
import { rinkDepthZ, rinkRescueEvent, type RinkRescueState } from "./WinterRinkRescue";
import styles from "./WinterMylieRink.module.css";

/* ---------------------------------------------------------------------------------------------
   Mylie's cocoa run on the Christmas rink. Every so often Mylie walks in from the left edge of the
   screen to the green Hot Cocoa stand, turns to the vendor, who lifts a coffee from behind her mugs
   and hands it over; Mylie takes it with a happy bounce, sips (steam, a little heart), turns, steps
   onto the ice and skates out with real strokes to Dylan, who has glided over to wait for her. They
   glide off side by side, Mylie raising her cup to him, and leave by the right edge of the screen.
   Mylie is a cut-out puppet of her own paintings (walking, standing, skating), posed by script:
   planted feet on the walk, push-and-glide strokes on the ice. Positions are fractions of the
   rink (x across, f = floor depth up from the front edge) so it scales with every screen. Purely
   decorative: it never takes a click, Time Out ends it, and reduced motion never starts it.
   Preview: ?preview=ve&mylie-preview=now (plays soon after the rink is in view, then repeats).
   --------------------------------------------------------------------------------------------- */

type Mat = readonly [number, number, number, number, number, number];
type Pt = readonly [number, number];
const mul = (A: Mat, B: Mat): Mat => [
  A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1],
  A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3],
  A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5],
];
const tr = (x: number, y: number): Mat => [1, 0, 0, 1, x, y];
const rot = (a: number): Mat => [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
const scl = (sx: number, sy = sx): Mat => [sx, 0, 0, sy, 0, 0];
const ap = (m: Mat, p: Pt): Pt => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
const about = (p: Pt, m: Mat) => mul(tr(p[0], p[1]), mul(m, tr(-p[0], -p[1])));
/** Stretch along a direction (a bone foreshortening or lengthening about its joint). */
const along = (p: Pt, angle: number, s: number) => about(p, mul(rot(angle), mul(scl(s, 1), rot(-angle))));
const ID: Mat = [1, 0, 0, 1, 0, 0];
const css = (m: Mat) => `matrix(${m.map((v, i) => v.toFixed(i < 4 ? 5 : 2)).join(",")})`;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => { const u = clamp(t, 0, 1); return u * u * (3 - 2 * u); };
const easeOut = (t: number) => 1 - (1 - clamp(t, 0, 1)) ** 2;
const span = (t: number, a: number, b: number) => clamp((t - a) / (b - a), 0, 1);
const lerpPt = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const depthScale = (f: number) => 1 - .85 * f; // the rink's perspective (WinterStreet)
const TAU = Math.PI * 2;
const ART = "/images/winter/kit/mylie-rink/";
const DYLAN = "/images/winter/rink/dylan.webp";

/* ------------------------------------------------------------------ the rigs */
// Walking and skating share the walking painting's pixels (she faces left there: the page mirrors
// the rig to send her right). The standing rig is in the standing painting's pixels.
const WALK = RIG.walk, SKATE = RIG.skate, STAND = RIG.stand, VENDOR = RIG.vendor;
const WJ = WALK.joints;
const PEL: Pt = [(WJ.farHip[0] + WJ.nearHip[0]) / 2, (WJ.farHip[1] + WJ.nearHip[1]) / 2];
const LEG = WALK.thigh + WALK.shin;
const HEAD_TOP = 6;                                   // top of her bun, walking painting px
const WALK_HEIGHT = PEL[1] + LEG + WALK.ankleH - HEAD_TOP; // standing tall, blades to bun
const STAND_SCALE = 1.02;                             // the standing painting is drawn 2% larger
const MYLIE_TALL = .58;                               // standing height at the front edge, rink heights

type LegTarget = { ankle: Pt; foot: number };
type LegPose = { root: Pt; lean: number; far: LegTarget; near: LegTarget; ground: number };

function ik(hip: Pt, target: Pt, l1: number, l2: number) {
  let dx = target[0] - hip[0], dy = target[1] - hip[1];
  let d = Math.hypot(dx, dy);
  const max = l1 + l2 - .01, min = Math.abs(l1 - l2) + 1;
  if (d > max) { dx *= max / d; dy *= max / d; d = max; }
  if (d < min) { dx *= min / d; dy *= min / d; d = min; }
  const base = Math.atan2(dy, dx);
  const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const thigh = base + a; // the knee bends toward -x, the way she faces in the painting
  const knee: Pt = [hip[0] + l1 * Math.cos(thigh), hip[1] + l1 * Math.sin(thigh)];
  const ankle: Pt = [hip[0] + dx, hip[1] + dy];
  return { thigh, shin: Math.atan2(ankle[1] - knee[1], ankle[0] - knee[0]), knee, ankle };
}
const bone = (at: Pt, rest: Pt, turn: number) => mul(tr(at[0], at[1]), mul(rot(turn), tr(-rest[0], -rest[1])));

/** Legs (walking painting): thighs, shins and skates for a body matrix and two ankle targets. */
function legMats(body: Mat, p: LegPose, out: Record<string, Mat>) {
  const blades: Pt[] = [];
  for (const side of ["far", "near"] as const) {
    const hipRest = side === "far" ? WJ.farHip : WJ.nearHip, kneeRest = side === "far" ? WJ.farKnee : WJ.nearKnee;
    const hip = ap(body, hipRest);
    const leg = ik(hip, p[side].ankle, WALK.thigh, WALK.shin);
    const restThigh = side === "far" ? WALK.rest.farThigh : WALK.rest.nearThigh;
    const restShin = side === "far" ? WALK.rest.farShin : WALK.rest.nearShin;
    out[side + "Thigh"] = bone(hip, hipRest, leg.thigh - restThigh);
    let shin = bone(leg.knee, kneeRest, leg.shin - restShin);
    // the near shin was painted foreshortened: stretch it along its bone to the shared length
    if (side === "near") shin = mul(shin, along(kneeRest, restShin, WALK.nearShinStretch));
    out[side + "Shin"] = shin;
    const skate = mul(tr(leg.ankle[0], leg.ankle[1]), rot(p[side].foot));
    out[side + "Skate"] = skate;
    blades.push(ap(skate, [(WALK.blade.toe[0] + WALK.blade.heel[0]) / 2, WALK.blade.toe[1]]));
  }
  return blades;
}

/** Her belt buckle (walking px): the skating upper body bends about it. */
const BELT: Pt = [195, 557];
const bodyMat = (root: Pt, lean: number) => mul(tr(PEL[0] + root[0], PEL[1] + root[1]), mul(rot(lean), tr(-PEL[0], -PEL[1])));

/* ---- the walk: two steps a cycle; feet planted where they strike while the body travels on ---- */
const WALK_STRIDE = 425, DUTY = .6, TOEOFF = -.55;
function walkPose(phase: number, stride: number, settle = 0): LegPose & { farArm: number; nearArm: number } {
  const ground = PEL[1] + .9 * LEG + WALK.ankleH; // knees a little bent: careful steps on her blades
  const bodyX = -stride * phase;
  const toe = WALK.blade.toe;
  const pivot = (fx: number, foot: number): Pt => {
    const tx = fx + toe[0], ty = ground - WALK.ankleH + toe[1];
    const ox = -toe[0], oy = -toe[1], c = Math.cos(foot), s = Math.sin(foot);
    return [tx + ox * c - oy * s, ty + ox * s + oy * c];
  };
  const legs = {} as Record<"far" | "near", LegTarget>;
  for (const side of ["far", "near"] as const) {
    const o = side === "far" ? 0 : .5, q = ((phase + o) % 1 + 1) % 1;
    const strike = -stride * (Math.floor(phase + o) - o);
    const sideX = PEL[0] + (side === "far" ? -16 : 16);
    const planted = strike + sideX - stride * DUTY / 2;
    let ankle: Pt, foot: number;
    if (q < DUTY) {
      const k = Math.max(0, (q - (DUTY - .2)) / .2);
      foot = TOEOFF * k * k;
      ankle = foot < 0 ? pivot(planted, foot) : [planted, ground - WALK.ankleH];
    } else {
      const s = (q - DUTY) / (1 - DUTY), e = smooth(s);
      const a0 = pivot(planted, TOEOFF), a1: Pt = [planted - stride, ground - WALK.ankleH];
      foot = TOEOFF * (1 - e) ** 1.6 + .1 * Math.sin(Math.PI * s) * s;
      ankle = [lerp(a0[0], a1[0], e), lerp(a0[1], a1[1], e) - 44 * Math.sin(Math.PI * s) ** 1.2];
    }
    legs[side] = { ankle: [ankle[0] - bodyX, ankle[1]], foot };
  }
  const swing = Math.sin(TAU * (phase - .05)) * (1 - settle);
  return {
    root: [0, -7 * Math.cos(4 * Math.PI * (phase - .3)) * (1 - settle)], lean: -.04 * (1 - settle), ground, ...legs,
    farArm: -.26 * (1 - settle) - .2 * swing, nearArm: .02 + .2 * swing,
  };
}

/** The stopping step: the trailing foot comes up beside the planted one as the body settles over both. */
function settlePose(endPhase: number, stride: number, u: number, advanceTo: number, trailTo: number): { pose: LegPose & { farArm: number; nearArm: number }; advance: number } {
  const start = walkPose(endPhase, stride);
  const e = smooth(u), advance = advanceTo * e;
  const lead: "far" | "near" = (((endPhase % 1) + 1) % 1) < .25 ? "far" : "near";
  const trail = lead === "far" ? "near" : "far";
  const ground = start.ground, foot0 = PEL[1] + .97 * LEG + WALK.ankleH; // she straightens up as she stops
  const g = lerp(ground, foot0, e);
  const leadStart = start[lead].ankle, trailStart = start[trail].ankle;
  // the body moves on over the planted lead foot (body-relative it slides back by the advance);
  // the trailing foot steps up to where her other foot stands in the standing pose
  const leadAnkle: Pt = [leadStart[0] + advance, lerp(leadStart[1], g - WALK.ankleH, e)];
  const trailEnd: Pt = [trailTo, g - WALK.ankleH];
  const trailAnkle: Pt = [lerp(trailStart[0], trailEnd[0], e), lerp(trailStart[1], trailEnd[1], e) - 30 * Math.sin(Math.PI * e)];
  const pose = {
    ...start, ground: g, root: [0, lerp(start.root[1], 0, e)] as Pt, lean: lerp(start.lean, 0, e),
    [lead]: { ankle: leadAnkle, foot: 0 }, [trail]: { ankle: trailAnkle, foot: lerp(start[trail].foot, 0, e) },
    farArm: lerp(start.farArm, 0, e), nearArm: lerp(start.nearArm, 0, e),
  } as LegPose & { farArm: number; nearArm: number };
  return { pose, advance };
}

/* ---- skating strokes (two a cycle): she glides on one bent leg under her while the other pushes
   back along the ice, rises behind her, extended, and swings back under; drive 0 glides on both ---- */
function strokePose(phase: number, drive: number, stance?: { far: number; near: number }): LegPose {
  const crouch = lerp(.95, .86, drive);
  const ground = PEL[1] + crouch * LEG + WALK.ankleH;
  const legs = {} as Record<"far" | "near", LegTarget>;
  for (const side of ["far", "near"] as const) {
    const q = ((phase + (side === "far" ? 0 : .5)) % 1 + 1) % 1;
    const sideX = PEL[0] + (side === "far" ? -14 : 14);
    let x: number, lift = 0, foot = 0;
    if (q < .42) x = sideX - 55 + 45 * (q / .42);                       // glide
    else if (q < .62) x = sideX - 10 + 175 * easeOut((q - .42) / .2);   // push back along the ice
    else if (q < .8) {                                                   // up behind her, leg straight
      const u = smooth((q - .62) / .18);
      x = sideX + 165 + 130 * u; lift = 100 * u; foot = -.3 * u;
    } else {                                                             // and back under her
      const u = smooth((q - .8) / .2);
      x = sideX + 295 - 350 * u; lift = 100 * (1 - u) + 10 * Math.sin(Math.PI * u); foot = -.3 * (1 - u);
    }
    legs[side] = { ankle: [lerp(stance ? stance[side] : sideX - 6, x, drive), ground - WALK.ankleH - lift * drive], foot: foot * drive };
  }
  // lowest through each push, rising into the glide; leaning into the strokes
  return { root: [0, drive * (7 + 7 * Math.cos(4 * Math.PI * (phase - .52)))], lean: -.26 * drive - .03, ground, ...legs };
}

/* ---- standing at the counter: the arm reaches, takes and sips; the cup stays upright ---- */
const SJ = STAND.joints;
const STAND_REF: Pt = [214, STAND.ground];
/** The standing skates' blade middles (x, standing px): far, near. */
const STAND_BLADES = [128.5, 254.6] as const;
type ArmKey = { elbow: Pt; wrist: Pt; cup: number; hand: "open" | "cup" };
const ARM_REST: ArmKey = { elbow: SJ.farElbow, wrist: STAND.wrist, cup: 0, hand: "open" };
const ARM_HOLD: ArmKey = { elbow: SJ.farElbow, wrist: STAND.cupWrist, cup: 0, hand: "cup" };
const ARM_SIP: ArmKey = { elbow: [104, 404], wrist: [102, 300], cup: .42, hand: "cup" };
const ARM_TURN: ArmKey = { elbow: [74, 468], wrist: [96, 386], cup: .04, hand: "cup" };
function armMats(B: Mat, a: ArmKey, out: Record<string, Mat>) {
  const S = SJ.farShoulder;
  const uAng = Math.atan2(a.elbow[1] - S[1], a.elbow[0] - S[0]), uLen = Math.hypot(a.elbow[0] - S[0], a.elbow[1] - S[1]);
  const fAng = Math.atan2(a.wrist[1] - a.elbow[1], a.wrist[0] - a.elbow[0]), fLen = Math.hypot(a.wrist[0] - a.elbow[0], a.wrist[1] - a.elbow[1]);
  // a bone pointing at the viewer looks shorter: foreshorten the painted bone along its own axis
  const fsU = clamp(uLen / STAND.len.farUpper, .4, 1.05), fsF = clamp(fLen / STAND.len.farFore, .4, 1.12);
  // the hanging arm was painted edge-on beside her body; raised, more of the sleeve faces us, so it
  // widens about the sleeve's own centre line (which runs 18px outside the bone line)
  const raise = smooth(Math.abs(uAng - STAND.rest.farUpper) / 1.1);
  const perp = STAND.rest.farUpper + Math.PI / 2;
  const widen = along([-18 * Math.cos(perp), -18 * Math.sin(perp)], perp, 1 + .5 * raise);
  out.farUpper = mul(B, mul(tr(S[0], S[1]), mul(rot(uAng - STAND.rest.farUpper), mul(along([0, 0], STAND.rest.farUpper, fsU), mul(widen, tr(-S[0], -S[1]))))));
  out.farSleeve = mul(B, mul(tr(a.elbow[0], a.elbow[1]), mul(rot(fAng - STAND.rest.farFore), mul(along([0, 0], STAND.rest.farFore, fsF), tr(-SJ.farElbow[0], -SJ.farElbow[1])))));
  if (a.hand === "open") out.openHand = mul(B, mul(tr(a.wrist[0], a.wrist[1]), mul(rot(fAng - STAND.rest.farFore), tr(-STAND.wrist[0], -STAND.wrist[1]))));
  else out.cupHand = mul(B, mul(tr(a.wrist[0], a.wrist[1]), mul(rot(a.cup), tr(-STAND.cupWrist[0], -STAND.cupWrist[1]))));
}
/** The elbow for a wrist target (two-bone reach, the elbow dropping below the line). */
function elbowFor(wrist: Pt, k: number): Pt {
  const S = SJ.farShoulder, l1 = STAND.len.farUpper * k, l2 = STAND.len.farFore * k;
  const dx = wrist[0] - S[0], dy = wrist[1] - S[1];
  const d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 1, l1 + l2 - .5);
  const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1)), base = Math.atan2(dy, dx);
  const e1: Pt = [S[0] + l1 * Math.cos(base + a), S[1] + l1 * Math.sin(base + a)];
  const e2: Pt = [S[0] + l1 * Math.cos(base - a), S[1] + l1 * Math.sin(base - a)];
  return e1[1] > e2[1] ? e1 : e2;
}
/** The open hand swinging up to a wrist target on an arc about the shoulder, the elbow by the reach. */
function reachArm(target: Pt, t: number): ArmKey {
  const S = SJ.farShoulder, from = STAND.wrist;
  const a0 = Math.atan2(from[1] - S[1], from[0] - S[0]);
  let a1 = Math.atan2(target[1] - S[1], target[0] - S[0]);
  if (a1 - a0 > Math.PI) a1 -= TAU; else if (a1 - a0 < -Math.PI) a1 += TAU; // the short way round
  const r0 = Math.hypot(from[0] - S[0], from[1] - S[1]), r1 = Math.hypot(target[0] - S[0], target[1] - S[1]);
  const ang = lerp(a0, a1, t), rad = lerp(r0, r1, t);
  const wrist: Pt = [S[0] + rad * Math.cos(ang), S[1] + rad * Math.sin(ang)];
  return { elbow: elbowFor(wrist, lerp(1, .9, t)), wrist, cup: 0, hand: "open" };
}
const mixArm = (a: ArmKey, b: ArmKey, t: number, hand: "open" | "cup"): ArmKey =>
  ({ elbow: lerpPt(a.elbow, b.elbow, t), wrist: lerpPt(a.wrist, b.wrist, t), cup: lerp(a.cup, b.cup, t), hand });
/** Where the cup hand's cup sits, relative to its wrist, for a given cup turn. */
const cupCentre = (wrist: Pt, turn: number): Pt => {
  const c: Pt = [(STAND.cupTop[0] + STAND.cupBottom[0]) / 2 - STAND.cupWrist[0], (STAND.cupTop[1] + STAND.cupBottom[1]) / 2 - STAND.cupWrist[1]];
  return [wrist[0] + c[0] * Math.cos(turn) - c[1] * Math.sin(turn), wrist[1] + c[0] * Math.sin(turn) + c[1] * Math.cos(turn)];
};
const cupLip = (wrist: Pt, turn: number): Pt => {
  const c: Pt = [STAND.cupTop[0] - STAND.cupWrist[0], STAND.cupTop[1] - STAND.cupWrist[1]];
  return [wrist[0] + c[0] * Math.cos(turn) - c[1] * Math.sin(turn), wrist[1] + c[0] * Math.sin(turn) + c[1] * Math.cos(turn)];
};

/* ------------------------------------------------------------------ the scene */
type Env = { W: number; R: number; left: number; right: number; stall: { x: number; y: number; w: number; h: number } };
type RigName = "walk" | "stand" | "skate";
type Frame = {
  rig: RigName; x: number; f: number; parts: Record<string, Mat>; ref: Pt; scale: number; squash: Pt; blades: Pt[]; lifts: number[];
  dylan: { on: boolean; x: number; f: number; sx: number; sy: number; rot: number };
  vendor: { mitten: Pt; cup: boolean; cupAt: Pt; on: boolean };
  steam: number; steamAt: Pt | null; heart: number; heartAt: Pt | null; sparkle: number; sparkleAt: Pt | null;
  sprays: { at: Pt; age: number; dir: number; size: number }[]; done: boolean;
};

const DY = { tall: 57, aspect: 236 / 367 };
// Depths (floor up from the front edge): Dylan glides nearer the front than Mylie, so the pair reads
// side by side with him a touch bigger, as he is.
const F_COUNTER = .215, F_ICE = .2, F_DYLAN = .12;
/** Window event: the rink's skaters clear the ice to the back boards while Mylie's run plays. */
export const rinkSceneEvent = "winter-rink-scene";
/** Where they look while they wait: the stall end of the rink (it also keeps them clear of the stall). */
const SCENE_WATCH = .25;

function buildScene(env: Env) {
  const A = env.W / env.R;
  const kAt = (f: number) => MYLIE_TALL * env.R * depthScale(f) / WALK_HEIGHT; // screen px per walking px
  // stall geometry (rink fractions); her spot is at the right end of the counter
  const st = env.stall;
  const xCounter = (st.x + st.w * .93) / env.W;
  const halfWidth = .2 * MYLIE_TALL * env.R / env.W;
  const x0 = env.left - halfWidth * 1.4;
  // walk: a whole number of steps that ends with a foot striking, then the stopping step
  const kc = kAt(F_COUNTER), ks = kc / STAND_SCALE;
  // Where her feet stand at the counter (rink px), and the walk that gets her there: an odd number
  // of steps, so her near foot strikes last, right on its standing spot, and the stopping step
  // brings the other foot up to its spot. The swap to the standing pose (turning to the vendor)
  // keeps both feet where they are.
  // (Her skates turn about their middles: the side-view walking and skating skates put their blade
  // middles where the standing skates' middles are, so a turn is a pivot in place.)
  const bladeMid = -(WALK.blade.toe[0] + WALK.blade.heel[0]) / 2 * kc; // ankle to blade middle, screen px
  const standFar = xCounter * env.W + (STAND_BLADES[0] - STAND_REF[0]) * ks - bladeMid;
  const standNear = xCounter * env.W + (STAND_BLADES[1] - STAND_REF[0]) * ks - bladeMid;
  const reachNear = standNear - x0 * env.W + 16 * kc; // pelvis travel + stride*DUTY/2, to the strike
  const steps = 2 * (reachNear / (WALK_STRIDE * kc) - DUTY / 2);
  let halfSteps = Math.max(3, 2 * Math.round((steps - 1) / 2) + 1); // the nearest odd count
  if (reachNear / ((halfSteps / 2 + DUTY / 2) * kc) > 470) halfSteps += 2; // never a stride her legs can't reach
  const stride = reachNear / ((halfSteps / 2 + DUTY / 2) * kc);
  const xStrike = x0 * env.W + halfSteps / 2 * stride * kc; // pelvis at the last strike
  const xEnd = (standNear + standFar) / 2 + bladeMid * .5;    // and once she has stopped: over her feet
  const settleAdvance = (xEnd - xStrike) / kc;
  const trailTo = PEL[0] + (xEnd - standFar) / kc;            // far ankle, body-relative
  const STEP = .24; // seconds a step: short careful steps on her blades, in a hurry for coffee
  const tWalk = halfSteps * STEP;
  const S0 = tWalk + .34; // the standing beats are timed from here
  const tSkate = S0 + 2.28;

  // The vendor's left hand (stall px). Mylie's coffee stands ready on the counter behind the stack
  // of mugs, out of sight. The vendor's mitten goes round behind the stack, grips the cup's lower
  // half, lifts it straight up from behind the mugs (the cup's top shows first, then her hand) and
  // holds it out above them to Mylie; empty, the hand goes back down behind the mugs to rest. The
  // forearm turns about her painted elbow and foreshortens as it reaches out toward us. Nothing
  // switches layers: the mugs and the counter cover the hand the whole time it is behind them.
  const vScale = st.w / VENDOR.stall[0];
  const cupH = VENDOR.cup.h * VENDOR.cupScale * kc / STAND_SCALE / vScale;
  const GRIP: Pt = [9, 10];                // her mitten to the cup's bottom centre (it grips the lower half)
  const CUP_WAITS: Pt = [271, 295.5];      // the cup's bottom centre, hidden behind the stack of mugs
  const VK = { rest: VENDOR.mitten as Pt, grip: [CUP_WAITS[0] - GRIP[0], CUP_WAITS[1] - GRIP[1]] as Pt, up: [264, 234] as Pt, offer: [279, 227] as Pt };
  const GRAB = .84; // seconds into the stand when Mylie's hand closes on the cup
  const vendorAt = (t: number) => {
    const r = t - S0;
    let mitten: Pt = VK.rest, held = false;
    if (r < 0 || r >= 1.2) return { mitten, cup: false, cupAt: CUP_WAITS, on: false };
    if (r < .2) mitten = lerpPt(VK.rest, VK.grip, smooth(r / .2));
    else if (r < .27) { mitten = VK.grip; held = r > .23; }
    else if (r < .46) { mitten = lerpPt(VK.grip, VK.up, smooth((r - .27) / .19)); held = true; }
    else if (r < .64) { mitten = lerpPt(VK.up, VK.offer, smooth((r - .46) / .18)); held = true; }
    else if (r < .9) { mitten = VK.offer; held = true; }
    else mitten = lerpPt(VK.offer, VK.rest, smooth((r - .9) / .3));
    // the cup's bottom centre: waiting behind the mugs, then in her grip until Mylie takes it
    const cupAt: Pt = held ? [mitten[0] + GRIP[0], mitten[1] + GRIP[1]] : CUP_WAITS;
    return { mitten, cup: r < GRAB, cupAt, on: true };
  };
  // the cup's centre (stall px) for its bottom centre
  const cupStall = (bottom: Pt): Pt => [bottom[0], bottom[1] - cupH * .5];
  const toScreen = (p: Pt): Pt => [st.x + p[0] * vScale, st.y + p[1] * vScale];
  // Mylie's standing rig: screen = (xCounter*W, R - F*R) + (p - STAND_REF) * ks
  const standOrigin: Pt = [xCounter * env.W, env.R - F_COUNTER * env.R];
  const toStand = (p: Pt): Pt => [STAND_REF[0] + (p[0] - standOrigin[0]) / ks, STAND_REF[1] + (p[1] - standOrigin[1]) / ks];
  const offer = vendorAt(S0 + GRAB);
  const grabCup = toStand(toScreen(cupStall(offer.cupAt)));
  const cupOff = cupCentre([0, 0], 0);
  const grabWrist: Pt = [grabCup[0] - cupOff[0], grabCup[1] - cupOff[1]];
  const ARM_REACH = reachArm(grabWrist, 1);
  const ARM_GRAB: ArmKey = { ...ARM_REACH, hand: "cup" };
  const lip = cupLip(ARM_SIP.wrist, ARM_SIP.cup);
  const heartAnchor: Pt = [standOrigin[0] + (lip[0] - STAND_REF[0]) * ks, standOrigin[1] + (lip[1] - STAND_REF[1]) * ks];

  // ---------------- the ice: Mylie skates out, Dylan glides over and waits, then they go together
  const dt = 1 / 120;
  const xWait = Math.max(xCounter + .2, .4);
  const dIn = { t0: S0 - 1.9, x0: env.right + .06, x1: xWait, t1: S0 + 1.05 };
  type Sample = { mx: number; mf: number; drive: number; phase: number; cup: number; dx: number; dface: number; dturn: number; dlean: number; dpace: number; dstride: number };
  const table: Sample[] = [];
  // She sets off pushing with her back foot (the far one) and gliding on her front foot, just as she
  // stood: the stroke cycle starts at the phase where its feet match her standing feet.
  let mx = xEnd / env.W, mv = 0, phase = .56, mf = F_COUNTER, drive = 0, cupRaise = 0;
  let dx = dIn.x1, dv = 0, dface = -1, dturn = 1, mode: "wait" | "turn" | "go" | "pair" | "exit" = "wait", modeT = 0, dstride = 0;
  let prevDv = 0, dlean = 0;
  let endT = Infinity;
  for (let t = tSkate; t < tSkate + 12; t += dt) {
    const tau = t - tSkate;
    // Mylie: a push off the snow onto the ice, strokes up to speed, glide beside Dylan, strokes away
    let target = tau < .3 ? .55 : 1.25;
    let driveTarget = tau < .12 ? .3 : 1;
    if (mode === "pair") { target = .85; driveTarget = 0; }
    if (mode === "exit") { target = 2.4; driveTarget = 1; }
    mv += clamp(target - mv, -1.4 * dt, (tau < .3 ? 2.4 : mode === "exit" ? 2.3 : 1.4) * dt);
    drive += clamp(driveTarget - drive, -2.2 * dt, 2.6 * dt);
    phase += dt / .9 * Math.max(.35, drive);
    mf += (F_ICE - mf) * Math.min(1, dt * 1.6);
    // Dylan
    const gap = (dx - mx) * A;
    if (mode === "wait" && gap < 1.05 && tau > .4) { mode = "turn"; modeT = tau; }
    if (mode === "turn") { dturn = clamp((tau - modeT) / .17, 0, 1); if (dturn >= 1) { dface = 1; mode = "go"; modeT = tau; } }
    if (mode === "go") { dv += clamp(.7 - dv, -1 * dt, 1.1 * dt); if (gap < .38) { mode = "pair"; modeT = tau; } }
    if (mode === "pair") {
      dv += clamp(.85 - dv, -1 * dt, 1 * dt);
      // she settles alongside him, a little behind his shoulder
      mv += clamp((gap - .3) * 2.2, -.6, .6) * dt * 4;
      cupRaise = smooth((tau - modeT - .08) / .22) * (1 - smooth((tau - modeT - .78) / .24));
      if (tau - modeT > 1.05) { mode = "exit"; modeT = tau; }
    }
    if (mode === "exit") dv += clamp(2.4 - dv, -1 * dt, 2.3 * dt);
    mx += mv * dt * depthScale(mf) / A;
    dx += dface * dv * dt * depthScale(F_DYLAN) / A;
    const acc = (dv - prevDv) / dt; prevDv = dv;
    const pace = clamp(dv / .9, 0, 1.2);
    dstride = (dstride + dt * pace) % 1;
    dlean += (clamp(dface * acc * .5 + dface * pace * 4, -12, 12) - dlean) * Math.min(1, dt * 7);
    table.push({ mx, mf, drive, phase, cup: cupRaise, dx, dface: mode === "turn" ? -1 : dface, dturn: mode === "turn" ? dturn : 1, dlean, dpace: pace, dstride });
    if (mode === "exit" && mx > env.right + halfWidth * 1.6 && dx > env.right + .05) { endT = t + .1; break; }
  }
  const sample = (t: number) => table[clamp(Math.round((t - tSkate) / dt), 0, table.length - 1)];

  // Dylan gliding in from the right edge and stopping to wait (a quick hockey stop)
  const dylanIn = (t: number) => {
    const total = dIn.t1 - dIn.t0, u = (t - dIn.t0) / total;
    const stop = .78; // the last stretch is the stop
    const vCruise = (dIn.x0 - dIn.x1) / (total * (stop + (1 - stop) / 2));
    let x: number, speed: number;
    if (u < stop) { x = dIn.x0 - vCruise * total * u; speed = vCruise; }
    else { const s = (u - stop) / (1 - stop); x = dIn.x0 - vCruise * total * (stop + (1 - stop) * (s - s * s / 2)); speed = vCruise * (1 - s); }
    return { x, speed: speed * A, decel: u > stop && u < 1 };
  };

  const sprays: { t: number; who: "mylie" | "dylan"; dir: number; size: number }[] = [
    { t: dIn.t0 + (dIn.t1 - dIn.t0) * .8, who: "dylan", dir: -1, size: 1.1 },
    { t: tSkate + .14, who: "mylie", dir: -1, size: .8 },
  ];

  function frameAt(t: number): Frame {
    const parts: Record<string, Mat> = {};
    let rig: RigName = "walk", x = x0, f = F_COUNTER, ref: Pt = [PEL[0], 0], scale = kc, squash: Pt = [1, 1];
    let blades: Pt[] = [], lifts: number[] = [0, 0];
    let steam = 0, steamAt: Pt | null = null, heart = -1, heartAt: Pt | null = null, sparkle = -1, sparkleAt: Pt | null = null;
    const toRink = (p: Pt): Pt => {
      // rig px -> rink px for the current rig placement
      const sx = rig === "stand" ? scale : -scale;
      return [x * env.W + (p[0] - ref[0]) * sx * squash[0], env.R - f * env.R + (p[1] - ref[1]) * scale * squash[1]];
    };
    if (t < tWalk + .34 && t < S0) {
      // ---- walking in, then the stopping step
      let pose: LegPose & { farArm: number; nearArm: number }, advance = 0;
      const phaseNow = Math.min(t, tWalk) / (2 * STEP);
      if (t <= tWalk) pose = walkPose(phaseNow, stride);
      else ({ pose, advance } = settlePose(tWalk / (2 * STEP), stride, (t - tWalk) / .34, settleAdvance, trailTo));
      const body = bodyMat(pose.root, pose.lean);
      parts.torso = body; parts.tag = body;
      parts.farArm = mul(body, about(WJ.farShoulder, rot(-pose.farArm)));
      parts.nearArm = mul(body, about(WJ.nearShoulder, rot(-pose.nearArm)));
      blades = legMats(body, pose, parts);
      lifts = (["far", "near"] as const).map(s => Math.max(0, pose.ground - WALK.ankleH - pose[s].ankle[1]));
      const travel = (phaseNow * stride + advance) * kc / env.W;
      x = x0 + travel; ref = [PEL[0], pose.ground];
      // a small dip as she arrives, before she turns to the stall
      if (t > tWalk + .22) squash = [1 + .02 * Math.sin(Math.PI * span(t, tWalk + .22, tWalk + .34)), 1 - .035 * Math.sin(Math.PI * span(t, tWalk + .22, tWalk + .34))];
    } else if (t < tSkate) {
      // ---- at the counter (standing rig: turned toward the vendor)
      rig = "stand"; x = xCounter; f = F_COUNTER; ref = STAND_REF; scale = ks;
      const r = t - S0;
      // the turn settles (a little rise), the happy bounce after she has the cup
      let lift = 0, sy = 1;
      if (r < .14) sy = 1 - .03 * (1 - r / .14);
      const b = r - .94; // the happy bounce, as soon as the cup is hers
      if (b > 0 && b < .4) {
        if (b < .08) sy = 1 - .06 * Math.sin(Math.PI / 2 * b / .08);
        else if (b < .24) { const u = (b - .08) / .16; lift = 34 * Math.sin(Math.PI * u); sy = 1 + .035 * Math.sin(Math.PI * u) - .06 * (1 - u) ** 6; }
        else { const u = (b - .24) / .16; sy = 1 - .045 * Math.sin(Math.PI * u); }
      }
      squash = [1 + (1 - sy) * .45, sy];
      const B = mul(tr(0, -lift), ID);
      parts.body = B;
      // the arm
      let arm: ArmKey;
      if (r < .4) arm = ARM_REST;
      else if (r < GRAB) arm = reachArm(grabWrist, smooth((r - .4) / (GRAB - .4)));
      else if (r < .9) arm = ARM_GRAB;
      else if (r < 1.14) arm = mixArm(ARM_GRAB, ARM_HOLD, smooth((r - .9) / .24), "cup");
      else if (r < 1.46) arm = ARM_HOLD;
      else if (r < 1.74) arm = mixArm(ARM_HOLD, ARM_SIP, smooth((r - 1.46) / .28), "cup");
      else if (r < 2.08) arm = ARM_SIP;
      else if (r < 2.26) arm = mixArm(ARM_SIP, ARM_TURN, smooth((r - 2.08) / .18), "cup");
      else arm = ARM_TURN;
      armMats(B, arm, parts);
      blades = [ap(B, [STAND_BLADES[0], 0]), ap(B, [STAND_BLADES[1], 0])].map(p => [p[0], STAND.ground - lift] as Pt);
      lifts = [lift, lift];
      if (arm.hand === "cup") {
        steam = r < 1.8 ? .7 + .3 * smooth((r - 1.4) / .4) : 1;
        steamAt = toRink(ap(B, cupLip(arm.wrist, arm.cup)));
      }
      if (r > 1.76) { heart = (r - 1.76) / 1.2; heartAt = heartAnchor; }
    } else {
      // ---- skating
      rig = "skate";
      const s = sample(t);
      x = s.mx; f = s.mf; scale = kAt(f);
      // She sets off from where she stood: her feet start where they were at the counter and her
      // upper body upright over them, then she leans into her first push.
      const tau = t - tSkate, settle = smooth(tau / .45);
      const stance = { far: lerp(PEL[0] + (xEnd - standFar) / kc, PEL[0] - 20, settle), near: lerp(PEL[0] - (standNear - xEnd) / kc, PEL[0] + 8, settle) };
      const pose = strokePose(s.phase, s.drive, stance);
      if (tau < .3) {
        // her first push: the back blade stays where it stood on the ice while she moves off it
        const planted = PEL[0] + (x * env.W - standFar) / scale, w = 1 - smooth((tau - .1) / .09);
        pose.far = { ankle: [lerp(pose.far.ankle[0], planted, w), pose.far.ankle[1]], foot: pose.far.foot * (1 - w) };
      }
      const body = bodyMat(pose.root, pose.lean);
      const upper = mul(body, about(BELT, rot(.1 * (1 - smooth(tau / .4)))));
      parts.hips = body; parts.torso = upper; parts.tag = upper;
      // the cheers: her cup goes up toward Dylan
      parts.cupArm = mul(upper, mul(tr(-10 * s.cup, -38 * s.cup), about(SKATE.farShoulder, rot(.12 * s.cup + .03 * Math.sin(4 * Math.PI * s.phase) * s.drive))));
      parts.logo = parts.cupArm;
      parts.freeArm = mul(upper, about(SKATE.nearShoulder, rot(-(.1 * Math.sin(TAU * (s.phase - .1)) * s.drive))));
      blades = legMats(body, pose, parts);
      lifts = (["far", "near"] as const).map(side => Math.max(0, pose.ground - WALK.ankleH - pose[side].ankle[1]));
      ref = [PEL[0], pose.ground];
      steam = 1; steamAt = toRink(ap(parts.cupArm, SKATE.cupTop));
      // the heart from her first sip drifts along with her as she pushes off
      const h = t - S0 - 1.76;
      if (h < 1.2) { heart = h / 1.2; heartAt = [heartAnchor[0] + x * env.W - standOrigin[0], heartAnchor[1]]; }
      if (s.cup > .02) { sparkle = s.cup; sparkleAt = toRink(ap(parts.cupArm, SKATE.cupTop)); }
    }
    // Dylan
    let dylan = { on: false, x: 0, f: F_DYLAN, sx: -1, sy: 1, rot: 0 };
    if (t >= dIn.t0 && t < tSkate) {
      const d = dylanIn(Math.min(t, dIn.t1));
      const pace = clamp(d.speed / .9, 0, 1.2), stride2 = (t - dIn.t0) * pace;
      const rotD = t < dIn.t1 ? (d.decel ? 9 : -4 * pace) : 2 * Math.sin((t - dIn.t1) * TAU / 2.4);
      dylan = { on: true, x: d.x, f: F_DYLAN, sx: -1, sy: 1 - .012 * pace * (1 - Math.cos(TAU * stride2)) / 2, rot: rotD };
    } else if (t >= tSkate) {
      const s = sample(t);
      const sx = s.dturn < 1 ? -Math.cos(Math.PI * s.dturn) : s.dface;
      dylan = { on: true, x: s.dx, f: F_DYLAN, sx, sy: 1 - .012 * s.dpace * (1 - Math.cos(TAU * s.dstride)) / 2, rot: s.dlean };
    }
    const vend = vendorAt(t);
    if (vend.cup && vend.cupAt[1] < 262 && !steamAt) {
      const c = toScreen(cupStall(vend.cupAt));
      steam = .8; steamAt = [c[0], c[1] - cupH * vScale * .5];
    }
    const live = sprays.filter(sp => t >= sp.t && t - sp.t < .3).map(sp => {
      const who = sp.who === "dylan" ? { x: dylanIn(sp.t).x, f: F_DYLAN } : { x: xCounter, f: F_COUNTER };
      return { at: [who.x * env.W, env.R - who.f * env.R] as Pt, age: (t - sp.t) / .3, dir: sp.dir, size: sp.size };
    });
    const screenBlades = blades.map(p => toRink(p));
    return {
      rig, x, f, parts, ref, scale, squash, blades: screenBlades, lifts: lifts.map(l => l * scale), dylan, vendor: vend,
      steam, steamAt, heart, heartAt, sparkle, sparkleAt, sprays: live, done: t >= endT,
    };
  }
  return { frameAt, length: endT, kc };
}

/* ------------------------------------------------------------------ DOM */
type PartBox = { readonly src: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number };
const WALK_PARTS: [string, PartBox][] = [
  ["farArm", WALK.farArm], ["farSkate", WALK.skate], ["farShin", WALK.farShin], ["farThigh", WALK.farThigh],
  ["nearSkate", WALK.skate], ["nearShin", WALK.nearShin], ["nearThigh", WALK.nearThigh], ["torso", WALK.torso], ["tag", WALK.tag], ["nearArm", WALK.nearArm],
];
const SKATE_PARTS: [string, PartBox][] = [
  ["farSkate", WALK.skate], ["farShin", WALK.farShin], ["farThigh", WALK.farThigh], ["nearSkate", WALK.skate], ["nearShin", WALK.nearShin],
  ["nearThigh", WALK.nearThigh], ["hips", SKATE.hips], ["torso", SKATE.torso], ["tag", SKATE.tag], ["freeArm", SKATE.freeArm], ["cupArm", SKATE.cupArm], ["logo", SKATE.logo],
];
const STAND_PARTS: [string, PartBox][] = [
  ["body", STAND.body], ["farUpper", STAND.farUpper], ["farSleeve", STAND.farSleeve], ["openHand", STAND.openHand], ["cupHand", STAND.cupHand],
];
const RIGS: Record<RigName, { parts: [string, PartBox][]; size: readonly [number, number] }> = {
  walk: { parts: WALK_PARTS, size: WALK.size }, skate: { parts: SKATE_PARTS, size: WALK.size }, stand: { parts: STAND_PARTS, size: STAND.size },
};

function Part({ id, box }: { id: string; box: PartBox }) {
  return (
    <Image data-part={id} src={ART + box.src + ".webp"} alt="" width={Math.round(box.w)} height={Math.round(box.h)} unoptimized
      loading="eager" draggable={false} style={{ width: box.w, height: box.h }} />
  );
}

function Rig({ name, mirror }: { name: RigName; mirror?: boolean }) {
  const rig = RIGS[name];
  return (
    <div className={mirror ? styles.reflection : styles.rig} data-layer={mirror ? "mirror" : "figure"} data-rig={name} data-on="false"
      style={{ width: rig.size[0], height: rig.size[1] }}>
      {rig.parts.map(([id, box]) => <Part key={id} id={id} box={box} />)}
    </div>
  );
}

const clipBehind = `polygon(${VENDOR.clip.map(([x, y]) => `${x}px ${y}px`).join(", ")})`;
/** The vendor's forearm placed so her mitten lands on a point: turned about the elbow, foreshortened toward us. */
const FOREARM = Math.hypot(VENDOR.mitten[0] - VENDOR.elbow[0], VENDOR.mitten[1] - VENDOR.elbow[1]);
const FOREARM_REST = Math.atan2(VENDOR.mitten[1] - VENDOR.elbow[1], VENDOR.mitten[0] - VENDOR.elbow[0]);
function vendorArm(mitten: Pt): Mat {
  const dx = mitten[0] - VENDOR.elbow[0], dy = mitten[1] - VENDOR.elbow[1];
  const fs = clamp(Math.hypot(dx, dy) / FOREARM, .35, 1.1);
  return mul(about(VENDOR.elbow, rot(Math.atan2(dy, dx) - FOREARM_REST)), along(VENDOR.elbow, FOREARM_REST, fs));
}

function Scene({ onDone, seek }: { onDone: () => void; seek: boolean }) {
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = stage.current, rink = host?.parentElement;
    if (!host || !rink) return;
    let disposed = false, frameId = 0, clock = 0, last = 0, playing = false, finished = false;
    const tesla = isTesla();
    const q = <T extends Element>(sel: string) => host.querySelector<T>(sel);
    const rigs = (["walk", "stand", "skate"] as const).map(name => ({
      name,
      figure: q<HTMLElement>(`[data-layer="figure"][data-rig="${name}"]`)!,
      mirror: q<HTMLElement>(`[data-layer="mirror"][data-rig="${name}"]`)!,
    }));
    const partEls = new Map<string, HTMLElement[]>();
    for (const r of rigs) for (const box of [r.figure, r.mirror]) for (const el of box.querySelectorAll<HTMLElement>("[data-part]")) {
      const key = r.name + ":" + el.dataset.part;
      partEls.set(key, [...(partEls.get(key) ?? []), el]);
    }
    const shadows = [q<HTMLElement>('[data-fx="shadow-far"]')!, q<HTMLElement>('[data-fx="shadow-near"]')!];
    const steams = [...host.querySelectorAll<HTMLElement>('[data-fx="steam"]')];
    const heartEl = q<HTMLElement>('[data-fx="heart"]')!, sparkleEl = q<HTMLElement>('[data-fx="sparkle"]')!;
    const chips = [...host.querySelectorAll<HTMLElement>('[data-fx="chip"]')];
    const dylanLane = q<HTMLElement>('[data-fx="dylan"]')!, dylanFigure = q<HTMLElement>('[data-fx="dylan-figure"]')!, dylanMirror = q<HTMLElement>('[data-fx="dylan-mirror"]')!;
    const vendor = q<HTMLElement>('[data-fx="vendor"]')!;
    const vArm = q<HTMLElement>('[data-fx="vendor-arm"]')!, vCup = q<HTMLElement>('[data-fx="vendor-cup"]')!;

    const stallImg = rink.querySelector<HTMLImageElement>('img[src*="cocoa-stall"]');
    const stallBox = stallImg?.parentElement;
    let scene: ReturnType<typeof buildScene> | null = null;
    let lastRig = "";
    function measure() {
      const box = rink!.getBoundingClientRect();
      if (!box.width || !box.height) return null;
      const s = stallBox?.getBoundingClientRect();
      const stall = s ? { x: s.left - box.left, y: s.top - box.top, w: s.width, h: s.height }
        : { x: box.width * .042, y: box.height * .75 - box.width * .114 * 500 / 398, w: box.width * .114, h: box.width * .114 * 500 / 398 };
      const picture = rink!.closest("#winter-village-picture")?.getBoundingClientRect();
      const viewLeft = Math.max(0, picture?.left ?? 0), viewRight = Math.min(window.innerWidth, picture?.right ?? window.innerWidth);
      return {
        W: box.width, R: box.height, stall,
        left: clamp((viewLeft - box.left) / box.width, 0, 1), right: clamp((viewRight - box.left) / box.width, 0, 1),
      } satisfies Env;
    }
    let env = measure();
    if (!env) { onDone(); return; }
    // Lay the scene out for this rink (positions are fractions of it, so a resize or a phone turned
    // mid-run lays it out again and carries on at the same moment).
    function layout(next: Env) {
      env = next;
      scene = buildScene(next);
      const vScale = next.stall.w / VENDOR.stall[0];
      Object.assign(vendor.style, { left: `${next.stall.x}px`, top: `${next.stall.y}px`, transform: `scale(${vScale.toFixed(5)})` });
      // the cup in the vendor's mitten is drawn the size it will be in Mylie's hand
      const cupScale = VENDOR.cupScale * scene.kc / STAND_SCALE / vScale;
      Object.assign(vCup.style, { width: `${VENDOR.cup.w * cupScale}px`, height: `${VENDOR.cup.h * cupScale}px` });
    }
    layout(env);
    let lastSize = `${env.W}x${env.R}`;
    const resize = new ResizeObserver(() => {
      const next = measure();
      if (!next || disposed || `${next.W}x${next.R}` === lastSize) return;
      lastSize = `${next.W}x${next.R}`;
      layout(next);
      render(shown);
    });
    resize.observe(rink);

    let shown = 0;
    function render(t: number) {
      if (!scene) return;
      shown = t;
      const fr = scene.frameAt(t);
      const z = rinkDepthZ(fr.f);
      for (const r of rigs) {
        const on = r.name === fr.rig;
        if (on && lastRig !== r.name) { r.figure.dataset.on = "true"; r.mirror.dataset.on = "true"; }
        else if (!on && r.figure.dataset.on === "true") { r.figure.dataset.on = "false"; r.mirror.dataset.on = "false"; }
      }
      lastRig = fr.rig;
      const r = rigs.find(rr => rr.name === fr.rig)!;
      const sx = (fr.rig === "stand" ? 1 : -1) * fr.scale * fr.squash[0], sy = fr.scale * fr.squash[1];
      const X = fr.x * env!.W, Y = env!.R - fr.f * env!.R;
      r.figure.style.transform = `translate(${X.toFixed(2)}px, ${Y.toFixed(2)}px) scale(${sx.toFixed(5)}, ${sy.toFixed(5)}) translate(${-fr.ref[0]}px, ${-fr.ref[1]}px)`;
      r.figure.style.zIndex = String(z);
      r.mirror.style.transform = `translate(${X.toFixed(2)}px, ${Y.toFixed(2)}px) scale(${sx.toFixed(5)}, ${(-sy * .55).toFixed(5)}) translate(${-fr.ref[0]}px, ${-fr.ref[1]}px)`;
      r.mirror.style.zIndex = String(z - 1);
      for (const [id, box] of RIGS[fr.rig].parts) {
        const els = partEls.get(fr.rig + ":" + id);
        if (!els) continue;
        const m = fr.parts[id];
        for (const el of els) {
          if (!m) { if (el.dataset.on !== "false") el.dataset.on = "false"; continue; }
          if (el.dataset.on !== "true") el.dataset.on = "true";
          el.style.transform = css(mul(m, tr(box.x, box.y)));
        }
      }
      // contact shadows under her blades
      fr.blades.forEach((p, i) => {
        const el = shadows[i]; if (!el) return;
        const air = clamp(fr.lifts[i] / (env!.R * .08), 0, 1);
        const w = fr.scale * 150 * (1 - air * .35);
        el.style.transform = `translate(${p[0].toFixed(1)}px, ${(Y + 1).toFixed(1)}px) scale(${(w / 100).toFixed(3)}, ${(fr.scale * 16 / 14 * (1 - air * .3)).toFixed(3)})`;
        el.style.opacity = String((1 - air * .6).toFixed(3));
        el.style.zIndex = String(z - 1);
      });
      // Dylan
      const d = fr.dylan;
      if (d.on) {
        const shrink = depthScale(d.f), height = DY.tall / 100 * env!.R, width = height * DY.aspect;
        dylanLane.dataset.on = "true";
        dylanLane.style.transform = `translate3d(${(d.x * env!.W - width / 2).toFixed(1)}px, ${(-d.f * env!.R).toFixed(1)}px, 0) scale(${shrink.toFixed(4)})`;
        dylanLane.style.zIndex = String(rinkDepthZ(d.f));
        dylanFigure.style.transform = `rotate(${d.rot.toFixed(2)}deg) scale(${d.sx.toFixed(3)}, ${d.sy.toFixed(3)})`;
        dylanMirror.style.transform = `rotate(${(-d.rot).toFixed(2)}deg) scaleX(${d.sx.toFixed(3)})`;
      } else dylanLane.dataset.on = "false";
      // the vendor's arm and the cup she hands over
      const v = fr.vendor;
      vendor.dataset.on = String(v.on);
      if (v.on) {
        vArm.style.transform = css(mul(vendorArm(v.mitten), tr(VENDOR.arm.x, VENDOR.arm.y)));
        vCup.dataset.on = String(v.cup);
        vCup.style.transform = `translate(${v.cupAt[0].toFixed(2)}px, ${v.cupAt[1].toFixed(2)}px) translate(-50%, -100%)`;
      }
      // steam, the heart, the sparkle
      steams.forEach((el, i) => {
        if (!fr.steamAt || fr.steam <= 0) { el.style.opacity = "0"; return; }
        const p = ((t * .9 + i / steams.length) % 1);
        const s = Math.max(.5, fr.scale / .12); // never too small to see on a phone
        el.style.transform = `translate(${(fr.steamAt[0] + (i - 1) * 3 * s + Math.sin((t + i) * 3) * 1.5 * s).toFixed(1)}px, ${(fr.steamAt[1] - p * 14 * s).toFixed(1)}px) scale(${(.5 + p * .7) * s}) rotate(${(-12 + 24 * Math.sin(p * Math.PI + i)).toFixed(1)}deg)`;
        el.style.opacity = String((fr.steam * Math.sin(Math.PI * p) * .75).toFixed(3));
        el.style.zIndex = String(z + 1);
      });
      if (fr.heart >= 0 && fr.heart < 1 && fr.heartAt) {
        const u = fr.heart, pop = u < .18 ? easeOut(u / .18) * 1.18 : 1.18 - .18 * smooth((u - .18) / .2);
        const s = Math.max(.62, fr.scale / .12);
        heartEl.style.transform = `translate(${(fr.heartAt[0] - 6 * s).toFixed(1)}px, ${(fr.heartAt[1] - (8 + 22 * easeOut(u)) * s).toFixed(1)}px) scale(${(pop * s).toFixed(3)})`;
        heartEl.style.opacity = String((u < .7 ? 1 : 1 - (u - .7) / .3).toFixed(3));
        heartEl.style.zIndex = String(z + 2);
      } else heartEl.style.opacity = "0";
      if (fr.sparkle > 0 && fr.sparkleAt) {
        const s = Math.max(.6, fr.scale / .12);
        sparkleEl.style.transform = `translate(${fr.sparkleAt[0].toFixed(1)}px, ${(fr.sparkleAt[1] - 6 * s).toFixed(1)}px) scale(${(fr.sparkle * s).toFixed(3)}) rotate(${(t * 160).toFixed(1)}deg)`;
        sparkleEl.style.opacity = String(fr.sparkle.toFixed(3));
        sparkleEl.style.zIndex = String(z + 2);
      } else sparkleEl.style.opacity = "0";
      // ice chips
      let c = 0;
      if (!tesla) for (const sp of fr.sprays) for (let i = 0; i < 4 && c < chips.length; i++, c++) {
        const el = chips[c], a = (i / 4) * Math.PI * .8 + .2, reach = (10 + i * 5) * sp.size * fr.scale / .12;
        el.style.transform = `translate(${(sp.at[0] + sp.dir * Math.cos(a) * reach * sp.age).toFixed(1)}px, ${(sp.at[1] - Math.sin(a) * reach * .6 * Math.sin(Math.PI * sp.age)).toFixed(1)}px)`;
        el.style.opacity = String((1 - sp.age).toFixed(3));
        el.style.zIndex = String(z + 1);
      }
      for (; c < chips.length; c++) chips[c].style.opacity = "0";
      if (fr.done && !finished && !seek) { finished = true; onDone(); }
    }

    let frames = 0;
    function tick(now: number) {
      frameId = 0;
      if (disposed || !playing) return;
      const dt = Math.min(.1, Math.max(0, (now - last) / 1000));
      last = now;
      if (!document.hidden) clock += dt;
      // the car's browser draws the scene at half rate, as it does the rink
      if (!tesla || ++frames % 2 === 0 || clock >= (scene?.length ?? 0)) render(clock);
      if (!finished) frameId = requestAnimationFrame(tick);
    }
    const stop = () => { if (!finished) { finished = true; onDone(); } };
    const onTimeout = () => { if (isSnowballTimeout()) stop(); };
    window.addEventListener(snowballTimeoutEvent, onTimeout);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => { if (motion.matches) stop(); };
    motion.addEventListener("change", onMotion);

    // Everything decodes before the first frame, so no part pops in late.
    const imgs = [...host.querySelectorAll<HTMLImageElement>("img")];
    const ready = Promise.all(imgs.map(img => img.decode().catch(() => undefined)));
    const timeout = new Promise(resolve => window.setTimeout(resolve, 6000));
    void Promise.race([ready, timeout]).then(() => {
      if (disposed) return;
      host.dataset.ready = "true";
      if (seek) {
        // preview frame stepping: window.__mylieRinkSeek(t) draws the scene at t seconds
        (window as Window & { __mylieRinkSeek?: (t: number) => number }).__mylieRinkSeek = (t: number) => { render(t); return scene?.length ?? 0; };
        render(0);
        return;
      }
      playing = true; last = performance.now(); frameId = requestAnimationFrame(tick);
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener(snowballTimeoutEvent, onTimeout);
      motion.removeEventListener("change", onMotion);
      resize.disconnect();
      delete (window as Window & { __mylieRinkSeek?: unknown }).__mylieRinkSeek;
    };
  }, [onDone, seek]);

  return (
    <div ref={stage} className={styles.stage} aria-hidden="true" data-ready="false">
      <div className={styles.dylanLane} data-fx="dylan" data-on="false">
        <span className={styles.dylanShadow} />
        <div className={styles.dylanMirror} data-fx="dylan-mirror">
          <Image src={DYLAN} alt="" width={236} height={367} unoptimized loading="eager" draggable={false} />
        </div>
        <div className={styles.dylanFigure} data-fx="dylan-figure">
          <Image src={DYLAN} alt="" width={236} height={367} unoptimized loading="eager" draggable={false} />
        </div>
      </div>
      <i className={styles.shadow} data-fx="shadow-far" />
      <i className={styles.shadow} data-fx="shadow-near" />
      {(["walk", "stand", "skate"] as const).map(name => <Rig key={"m" + name} name={name} mirror />)}
      {(["walk", "stand", "skate"] as const).map(name => <Rig key={name} name={name} />)}
      <div className={styles.vendor} data-fx="vendor" data-on="false" style={{ width: VENDOR.stall[0], height: VENDOR.stall[1] }}>
        {/* her painted forearm is covered (never over the mugs) while the cut-out one moves */}
        <div className={styles.vendorLayer} style={{ clipPath: clipBehind }}>
          <Image src={ART + VENDOR.patch.src + ".webp"} alt="" width={VENDOR.patch.w * 2} height={VENDOR.patch.h * 2} unoptimized loading="eager"
            draggable={false} style={{ left: VENDOR.patch.x, top: VENDOR.patch.y, width: VENDOR.patch.w, height: VENDOR.patch.h }} />
        </div>
        <div className={styles.vendorLayer} style={{ clipPath: clipBehind }}>
          <Image src={ART + VENDOR.cup.src + ".webp"} alt="" width={Math.round(VENDOR.cup.w * .4)} height={Math.round(VENDOR.cup.h * .4)} unoptimized
            loading="eager" draggable={false} data-fx="vendor-cup" data-on="false" className={styles.vendorCup} />
          <Image src={ART + VENDOR.arm.src + ".webp"} alt="" width={VENDOR.arm.w * 2} height={VENDOR.arm.h * 2} unoptimized loading="eager"
            draggable={false} data-fx="vendor-arm" style={{ width: VENDOR.arm.w, height: VENDOR.arm.h }} />
        </div>
      </div>
      {[0, 1, 2].map(i => <i key={i} className={styles.steam} data-fx="steam" />)}
      <span className={styles.heart} data-fx="heart">
        <svg viewBox="0 0 24 22" aria-hidden="true" focusable="false">
          <path d="M12 21 C4.5 15.2 1 11.4 1 7.1 1 3.7 3.6 1 6.8 1 9.1 1 10.9 2.3 12 4.3 13.1 2.3 14.9 1 17.2 1 20.4 1 23 3.7 23 7.1 23 11.4 19.5 15.2 12 21Z"
            fill="#e8424f" stroke="#7a1420" strokeWidth="1.3" />
          <path d="M6.2 4.6 C4.7 5 3.9 6.3 4 7.7" fill="none" stroke="#ffd2d6" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
      <span className={styles.sparkle} data-fx="sparkle">
        <svg viewBox="-12 -12 24 24" aria-hidden="true" focusable="false">
          <path d="M0 -11 L2.2 -2.2 L11 0 L2.2 2.2 L0 11 L-2.2 2.2 L-11 0 L-2.2 -2.2Z" fill="#fff6c8" stroke="#e9b949" strokeWidth=".8" />
        </svg>
      </span>
      {Array.from({ length: 8 }, (_, i) => <i key={i} className={styles.chip} data-fx="chip" />)}
    </div>
  );
}

/* ------------------------------------------------------------------ when it plays */
/** The rink's own skaters drift to the back boards and watch (as for Dylan's axel), or go back to their laps. */
const clearIce = (active: boolean) => window.dispatchEvent(new CustomEvent(rinkSceneEvent, { detail: { active, x: SCENE_WATCH } }));

export default function WinterMylieRink({ active }: { active: boolean }) {
  const [scene, setScene] = useState(0);
  // Mylie and Dylan are claimed for the run (no other act can use them meanwhile); Dylan stays
  // claimed a little while after they skate off, so he doesn't come straight back for his axel.
  const release = useRef<{ mylie: (() => void) | null; dylan: (() => void) | null }>({ mylie: null, dylan: null });
  const dylanRest = useRef(0);
  const seq = useRef(0);
  const [config] = useState(() => {
    if (typeof window === "undefined") return { preview: false, seek: false };
    const params = new URLSearchParams(window.location.search);
    const preview = params.get("preview") === "ve" ? params.get("mylie-preview") : null;
    return { preview: preview === "now" || preview === "seek", seek: preview === "seek" };
  });
  const rescue = useRef(false);
  const nextAt = useRef(0);

  const done = useCallback(() => {
    clearIce(false);
    release.current.mylie?.();
    release.current.mylie = null;
    window.clearTimeout(dylanRest.current);
    dylanRest.current = window.setTimeout(() => { release.current.dylan?.(); release.current.dylan = null; }, 15000);
    nextAt.current = performance.now() + (config.preview ? 5000 : (75 + Math.random() * 65) * 1000);
    setScene(0);
  }, [config.preview]);

  useEffect(() => {
    const onRescue = (event: Event) => { rescue.current = Boolean((event as CustomEvent<RinkRescueState>).detail?.active); };
    window.addEventListener(rinkRescueEvent, onRescue);
    return () => window.removeEventListener(rinkRescueEvent, onRescue);
  }, []);

  useEffect(() => {
    if (!active || scene) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!nextAt.current) nextAt.current = performance.now() + (config.preview ? 1200 : (22 + Math.random() * 25) * 1000);
    let timer = 0;
    const attempt = () => {
      const wait = nextAt.current - performance.now();
      if (wait > 0) { timer = window.setTimeout(attempt, Math.min(wait, 4000)); return; }
      const ice = document.querySelector("[data-winter-rink]");
      const busy = !ice || document.hidden || motion.matches || isSnowballTimeout() || rescue.current
        || ice.querySelector('[data-skater="dylan"][data-on="true"], [data-skater="redwings"][data-on="true"], [data-skater="blues"][data-on="true"], [data-serving="true"]');
      if (busy) { timer = window.setTimeout(attempt, 4000); return; }
      const held = release.current.dylan; // still ours from the last run, perhaps
      const mylie = claimPerson("mylie"), dylan = held ?? claimPerson("dylan");
      if (!mylie || !dylan) {
        mylie?.();
        if (dylan && !held) dylan();
        timer = window.setTimeout(attempt, 4000);
        return;
      }
      window.clearTimeout(dylanRest.current);
      release.current = { mylie, dylan };
      // the rink's skaters start for the back boards now, while Mylie's art loads and she walks in
      clearIce(true);
      setScene(++seq.current);
    };
    timer = window.setTimeout(attempt, 300);
    return () => window.clearTimeout(timer);
  }, [active, scene, config.preview]);

  // Unmounting lets Mylie and Dylan go.
  useEffect(() => () => {
    if (release.current.mylie) clearIce(false);
    window.clearTimeout(dylanRest.current);
    release.current.mylie?.(); release.current.dylan?.();
    release.current = { mylie: null, dylan: null };
  }, []);

  return scene ? <Scene key={scene} onDone={done} seek={config.seek} /> : null;
}
