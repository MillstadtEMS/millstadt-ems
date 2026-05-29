/**
 * Curriculum-gap generators — Basic/Core rhythms taught in Kenneth James's
 * lecture decks that were not yet implemented.
 *
 * Generators in this file:
 *  - sinusArrestGenerator           Basic/Core
 *  - wanderingAtrialPacemakerGenerator  Basic/Core
 *  - focalAtrialTachGenerator       Basic/Core (Atrial Tachycardia)
 *  - multifocalPvcGenerator         Basic/Core
 *  - rOnTGenerator                  Basic/Core
 *  - quadrigeminyGenerator          Basic/Core
 *  - ventricularEscapeGenerator     Basic/Core (AKA IVR — same morphology
 *                                                family, treated separately
 *                                                because that's how it's taught)
 *  - ventricularFlutterGenerator    Nerd/Expert
 *
 * All generators share the established pattern: walk beat slots, emit
 * `qrs-narrow` / `qrs-wide` / `p-wave` / `t-wave` events with meaningful
 * meta where it helps the test layer.
 */

import type {
  ECGEvent,
  ECGSettings,
  GeneratedECGSignal,
} from '../types';
import { resolveHrFor } from '../rhythmRateControl';
import {
  type AbsBeatComponents,
  evaluateAbsBeat,
  narrowBeatComponents,
  sampleTimes,
  wideBeatComponents,
} from './gaussianBeat';

/** Deterministic [0, 1) from an integer index — same scheme as other generators. */
function hashUnit(i: number): number {
  let x = (i | 0) ^ 0x6c8e9cf3;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return ((x ^ (x >>> 16)) >>> 0) / 0xffffffff;
}

const SINUS_BEAT = narrowBeatComponents(0.16);

// ════════════════════════════════════════════════════════════════════
//  Sinus Arrest / Pause
// ════════════════════════════════════════════════════════════════════

/**
 * Sinus arrest: the SA node intermittently fails to fire, leaving a
 * pause. Pause length is NOT an integer multiple of the underlying P-P
 * (that's what separates it from SA exit block).
 */
export function sinusArrestGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('sinus.arrest', settings.heartRate);
  const rr = 60 / hr;

  // Plan: every 4th sinus beat is replaced by a long pause — the SA node
  // simply doesn't fire. The pause is ~2.5 × rr (well over 2 seconds at
  // typical HR), clearly NOT an integer multiple of the underlying P-P.
  // That long flatline is what students need to see and remember; shorter
  // pauses can be mistaken for a long R-R rather than a true arrest.
  const PAUSE_FACTOR = 2.5;
  type Beat = { tBeat: number };
  const beats: Beat[] = [];
  let nextT = 0;
  let i = 0;
  while (nextT < tEnd + 1.0) {
    if (i > 0 && i % 4 === 0) {
      nextT += PAUSE_FACTOR * rr;
    }
    beats.push({ tBeat: nextT });
    nextT += rr;
    i++;
  }

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);
  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;
    for (const b of beats) {
      if (Math.abs(t - b.tBeat) > 0.7) continue;
      mv += evaluateAbsBeat(t, b.tBeat, SINUS_BEAT);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (const b of beats) {
    const pT = b.tBeat + SINUS_BEAT.p.centerFraction;
    const rT = b.tBeat + SINUS_BEAT.r.centerFraction;
    const tT = b.tBeat + SINUS_BEAT.t.centerFraction;
    if (pT >= tStart && pT < tEnd) events.push({ kind: 'p-wave', tSec: pT });
    if (rT >= tStart && rT < tEnd) events.push({ kind: 'qrs-narrow', tSec: rT, meta: { hrBpm: hr } });
    if (tT >= tStart && tT < tEnd) events.push({ kind: 't-wave', tSec: tT });
  }

  return { rhythmId: settings.rhythmId, windowStartSec: tStart, windowEndSec: tEnd, sampleRateHz: settings.sampleRateHz, points, events };
}

// ════════════════════════════════════════════════════════════════════
//  Wandering Atrial Pacemaker
// ════════════════════════════════════════════════════════════════════

/**
 * WAP: pacemaker site shifts among at least 3 atrial foci as the
 * dominant pacemaker drifts. Rate stays below 100. P-wave
 * morphology changes from beat to beat; R-R varies slightly.
 *
 * Distinguishes from MAT by RATE — WAP is < 100, MAT is > 100.
 */
const WAP_P_VARIANTS = [
  { amplitudeMv: 0.18, centerFraction: 0.025, sigmaSec: 0.024 },
  { amplitudeMv: 0.10, centerFraction: 0.030, sigmaSec: 0.030 },
  { amplitudeMv: -0.05, centerFraction: 0.020, sigmaSec: 0.022 },
];

function buildWapBeat(idx: number): AbsBeatComponents {
  const c = narrowBeatComponents(0.16);
  const v = WAP_P_VARIANTS[idx % WAP_P_VARIANTS.length]!;
  c.p = { ...v };
  return c;
}

const WAP_BEATS = WAP_P_VARIANTS.map((_, i) => buildWapBeat(i));

export function wanderingAtrialPacemakerGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('atrial.wandering-pacemaker', settings.heartRate);
  const baseRr = 60 / hr;

  type Beat = { tBeat: number; pIdx: number };
  const beats: Beat[] = [];
  let nextT = 0;
  let i = 0;
  beats.push({ tBeat: 0, pIdx: 0 });
  while (nextT < tEnd + 1.0) {
    const u = hashUnit(i);
    // Gentle R-R variation (smaller than MAT — this is supposed to look like
    // a normal-rate rhythm with a wandering focus).
    const rr = baseRr * (0.85 + 0.30 * u);
    nextT += rr;
    const pIdx = Math.floor(hashUnit(i + 700) * WAP_P_VARIANTS.length);
    beats.push({ tBeat: nextT, pIdx });
    i++;
  }

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);
  for (let k = 0; k < times.length; k++) {
    const t = times[k] as number;
    let mv = 0;
    for (const b of beats) {
      if (Math.abs(t - b.tBeat) > 0.7) continue;
      mv += evaluateAbsBeat(t, b.tBeat, WAP_BEATS[b.pIdx]!);
    }
    points[k] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (const b of beats) {
    const beat = WAP_BEATS[b.pIdx]!;
    const pT = b.tBeat + beat.p.centerFraction;
    const rT = b.tBeat + beat.r.centerFraction;
    const tT = b.tBeat + beat.t.centerFraction;
    if (pT >= tStart && pT < tEnd) events.push({ kind: 'p-wave', tSec: pT, meta: { variant: b.pIdx, multifocal: true } });
    if (rT >= tStart && rT < tEnd) events.push({ kind: 'qrs-narrow', tSec: rT, meta: { hrBpm: hr } });
    if (tT >= tStart && tT < tEnd) events.push({ kind: 't-wave', tSec: tT });
  }

  return { rhythmId: settings.rhythmId, windowStartSec: tStart, windowEndSec: tEnd, sampleRateHz: settings.sampleRateHz, points, events };
}

// ════════════════════════════════════════════════════════════════════
//  Focal Atrial Tachycardia
// ════════════════════════════════════════════════════════════════════

/**
 * Atrial Tachycardia: regular narrow tachycardia from a SINGLE ectopic
 * atrial focus. P-wave morphology is uniform but DIFFERENT from sinus
 * (often abnormal shape, sometimes buried in the preceding T).
 * Rate 100–250.
 */
function buildAtBeat(): AbsBeatComponents {
  const c = narrowBeatComponents(0.14);
  // Smaller, narrower P with slightly different shape than sinus.
  c.p = { amplitudeMv: 0.10, centerFraction: 0.022, sigmaSec: 0.020 };
  return c;
}
const AT_BEAT = buildAtBeat();

export function focalAtrialTachGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('atrial.focal-atrial-tach', settings.heartRate);
  const rr = 60 / hr;
  const firstSlot = Math.floor((tStart - 0.10) / rr);
  const lastSlot = Math.ceil((tEnd + 0.10) / rr);

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);
  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;
    for (let s = firstSlot; s <= lastSlot; s++) {
      const beatStart = s * rr;
      if (Math.abs(t - beatStart) > 0.5) continue;
      mv += evaluateAbsBeat(t, beatStart, AT_BEAT);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let s = firstSlot; s <= lastSlot; s++) {
    const beatStart = s * rr;
    const pT = beatStart + AT_BEAT.p.centerFraction;
    const rT = beatStart + AT_BEAT.r.centerFraction;
    const tT = beatStart + AT_BEAT.t.centerFraction;
    if (pT >= tStart && pT < tEnd) events.push({ kind: 'p-wave', tSec: pT, meta: { ectopic: true } });
    if (rT >= tStart && rT < tEnd) events.push({ kind: 'qrs-narrow', tSec: rT, meta: { hrBpm: hr } });
    if (tT >= tStart && tT < tEnd) events.push({ kind: 't-wave', tSec: tT });
  }

  return { rhythmId: settings.rhythmId, windowStartSec: tStart, windowEndSec: tEnd, sampleRateHz: settings.sampleRateHz, points, events };
}

// ════════════════════════════════════════════════════════════════════
//  Multifocal PVCs
// ════════════════════════════════════════════════════════════════════

const PVC_VARIANT_A = wideBeatComponents({ centerSec: 0.06, polarity: 1 });
const PVC_VARIANT_B = wideBeatComponents({ centerSec: 0.06, polarity: -1 });

const MULTIFOCAL_PVC_INTERVAL = 5;
const MULTIFOCAL_PVC_OFFSET = 0.20;

export function multifocalPvcGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('vent.pvc-multifocal', settings.heartRate);
  const rr = 60 / hr;

  type BeatPlan = { kind: 'sinus' | 'pvc'; tBeat: number; pvcVariant?: number };
  const plan: BeatPlan[] = [];
  let nextSinusT = 0;
  let slot = 0;
  while (nextSinusT < tEnd + 1.0) {
    if (slot > 0 && slot % MULTIFOCAL_PVC_INTERVAL === 0) {
      const pvcT = nextSinusT - MULTIFOCAL_PVC_OFFSET;
      const variant = (slot / MULTIFOCAL_PVC_INTERVAL) % 2;
      plan.push({ kind: 'pvc', tBeat: pvcT, pvcVariant: variant });
      // Compensatory pause: next sinus on schedule at slot+1.
      nextSinusT += rr;
    } else {
      plan.push({ kind: 'sinus', tBeat: nextSinusT });
      nextSinusT += rr;
    }
    slot++;
  }

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);
  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;
    for (const b of plan) {
      if (Math.abs(t - b.tBeat) > 0.7) continue;
      let beat: AbsBeatComponents = SINUS_BEAT;
      if (b.kind === 'pvc') {
        beat = b.pvcVariant === 0 ? PVC_VARIANT_A : PVC_VARIANT_B;
      }
      mv += evaluateAbsBeat(t, b.tBeat, beat);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (const b of plan) {
    let beat: AbsBeatComponents = SINUS_BEAT;
    if (b.kind === 'pvc') beat = b.pvcVariant === 0 ? PVC_VARIANT_A : PVC_VARIANT_B;
    const pT = b.tBeat + beat.p.centerFraction;
    const rT = b.tBeat + beat.r.centerFraction;
    const tT = b.tBeat + beat.t.centerFraction;
    if (b.kind === 'pvc') {
      if (rT >= tStart && rT < tEnd) events.push({ kind: 'qrs-wide', tSec: rT, meta: { ectopy: 'pvc', variant: b.pvcVariant ?? 0, multifocal: true } });
      if (tT >= tStart && tT < tEnd) events.push({ kind: 't-wave', tSec: tT });
    } else {
      if (pT >= tStart && pT < tEnd) events.push({ kind: 'p-wave', tSec: pT });
      if (rT >= tStart && rT < tEnd) events.push({ kind: 'qrs-narrow', tSec: rT, meta: { hrBpm: hr } });
      if (tT >= tStart && tT < tEnd) events.push({ kind: 't-wave', tSec: tT });
    }
  }

  return { rhythmId: settings.rhythmId, windowStartSec: tStart, windowEndSec: tEnd, sampleRateHz: settings.sampleRateHz, points, events };
}

// ════════════════════════════════════════════════════════════════════
//  R-on-T phenomenon
// ════════════════════════════════════════════════════════════════════

/**
 * R-on-T: PVC fires while the preceding T wave is still going. Very
 * early premature beat with very short coupling interval. Can degenerate
 * to VT/VF — the teaching emphasis is recognition + risk.
 */
const R_ON_T_INTERVAL = 6;
const R_ON_T_COUPLING = 0.32; // PVC fires THIS late after sinus — overlaps T

export function rOnTGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('vent.r-on-t', settings.heartRate);
  const rr = 60 / hr;
  const PVC_BEAT = wideBeatComponents({ centerSec: 0.05, polarity: 1 });

  type BeatPlan = { kind: 'sinus' | 'pvc'; tBeat: number };
  const plan: BeatPlan[] = [];
  let nextSinusT = 0;
  let slot = 0;
  while (nextSinusT < tEnd + 1.0) {
    plan.push({ kind: 'sinus', tBeat: nextSinusT });
    // Inject an R-on-T PVC during the T wave of every Nth sinus beat.
    if (slot > 0 && slot % R_ON_T_INTERVAL === 0) {
      plan.push({ kind: 'pvc', tBeat: nextSinusT + R_ON_T_COUPLING });
      // Compensatory pause.
      nextSinusT += 2 * rr;
    } else {
      nextSinusT += rr;
    }
    slot++;
  }

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);
  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;
    for (const b of plan) {
      if (Math.abs(t - b.tBeat) > 0.7) continue;
      mv += evaluateAbsBeat(t, b.tBeat, b.kind === 'pvc' ? PVC_BEAT : SINUS_BEAT);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (const b of plan) {
    const beat = b.kind === 'pvc' ? PVC_BEAT : SINUS_BEAT;
    const pT = b.tBeat + beat.p.centerFraction;
    const rT = b.tBeat + beat.r.centerFraction;
    const tT = b.tBeat + beat.t.centerFraction;
    if (b.kind === 'pvc') {
      if (rT >= tStart && rT < tEnd) events.push({ kind: 'qrs-wide', tSec: rT, meta: { ectopy: 'pvc', rOnT: true, couplingSec: R_ON_T_COUPLING } });
    } else {
      if (pT >= tStart && pT < tEnd) events.push({ kind: 'p-wave', tSec: pT });
      if (rT >= tStart && rT < tEnd) events.push({ kind: 'qrs-narrow', tSec: rT, meta: { hrBpm: hr } });
      if (tT >= tStart && tT < tEnd) events.push({ kind: 't-wave', tSec: tT });
    }
  }

  return { rhythmId: settings.rhythmId, windowStartSec: tStart, windowEndSec: tEnd, sampleRateHz: settings.sampleRateHz, points, events };
}

// ════════════════════════════════════════════════════════════════════
//  Ventricular Quadrigeminy (PVC every 4th beat)
// ════════════════════════════════════════════════════════════════════

export function quadrigeminyGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('vent.quadrigeminy', settings.heartRate);
  const rr = 60 / hr;
  const PVC_BEAT = wideBeatComponents({ centerSec: 0.06, polarity: 1 });

  type BeatPlan = { kind: 'sinus' | 'pvc'; tBeat: number };
  const plan: BeatPlan[] = [];
  let nextT = 0;
  let slot = 0;
  while (nextT < tEnd + 1.0) {
    // Pattern: 3 sinus, 1 PVC, repeat.
    if ((slot % 4) === 3) {
      plan.push({ kind: 'pvc', tBeat: nextT });
    } else {
      plan.push({ kind: 'sinus', tBeat: nextT });
    }
    nextT += rr;
    slot++;
  }

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);
  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;
    for (const b of plan) {
      if (Math.abs(t - b.tBeat) > 0.7) continue;
      mv += evaluateAbsBeat(t, b.tBeat, b.kind === 'pvc' ? PVC_BEAT : SINUS_BEAT);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (const b of plan) {
    const beat = b.kind === 'pvc' ? PVC_BEAT : SINUS_BEAT;
    const rT = b.tBeat + beat.r.centerFraction;
    if (b.kind === 'pvc') {
      if (rT >= tStart && rT < tEnd) events.push({ kind: 'qrs-wide', tSec: rT, meta: { ectopy: 'pvc', pattern: 'quadrigeminy' } });
    } else {
      const pT = b.tBeat + beat.p.centerFraction;
      const tT = b.tBeat + beat.t.centerFraction;
      if (pT >= tStart && pT < tEnd) events.push({ kind: 'p-wave', tSec: pT });
      if (rT >= tStart && rT < tEnd) events.push({ kind: 'qrs-narrow', tSec: rT });
      if (tT >= tStart && tT < tEnd) events.push({ kind: 't-wave', tSec: tT });
    }
  }

  return { rhythmId: settings.rhythmId, windowStartSec: tStart, windowEndSec: tEnd, sampleRateHz: settings.sampleRateHz, points, events };
}

// ════════════════════════════════════════════════════════════════════
//  Ventricular Escape Rhythm (AKA slow Idioventricular Rhythm)
// ════════════════════════════════════════════════════════════════════

/**
 * AKA Idioventricular Rhythm. Same wide-complex morphology and ventricular
 * origin; the term "ventricular escape" is used when the rhythm is slow
 * and emerges only because everything above the ventricle has failed.
 * Rate 20–40 bpm.
 */
const VENT_ESCAPE_BEAT = wideBeatComponents({ centerSec: 0.06, polarity: 1 });

export function ventricularEscapeGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('vent.ventricular-escape', settings.heartRate);
  const rr = 60 / hr;
  const firstSlot = Math.floor((tStart - 0.10) / rr);
  const lastSlot = Math.ceil((tEnd + 0.10) / rr);

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);
  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;
    for (let s = firstSlot; s <= lastSlot; s++) {
      const beatStart = s * rr;
      if (Math.abs(t - beatStart) > 0.7) continue;
      mv += evaluateAbsBeat(t, beatStart, VENT_ESCAPE_BEAT);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let s = firstSlot; s <= lastSlot; s++) {
    const beatStart = s * rr;
    const rT = beatStart + VENT_ESCAPE_BEAT.r.centerFraction;
    const tT = beatStart + VENT_ESCAPE_BEAT.t.centerFraction;
    if (rT >= tStart && rT < tEnd) {
      events.push({ kind: 'qrs-wide', tSec: rT, meta: { hrBpm: hr, mechanism: 'escape', akaIvr: true } });
    }
    if (tT >= tStart && tT < tEnd) events.push({ kind: 't-wave', tSec: tT });
  }

  return { rhythmId: settings.rhythmId, windowStartSec: tStart, windowEndSec: tEnd, sampleRateHz: settings.sampleRateHz, points, events };
}

// ════════════════════════════════════════════════════════════════════
//  Ventricular Flutter (Nerd/Expert)
// ════════════════════════════════════════════════════════════════════

/**
 * Ventricular Flutter: extremely rapid (~ 250–300 bpm) monomorphic wide-
 * complex tachycardia — looks like a regular sinusoidal wave with no
 * discernible QRS / ST / T. Transitional rhythm between VT and VF; usually
 * degenerates to VF within seconds.
 */
const V_FLUTTER_AMPLITUDE_MV = 1.0;
const V_FLUTTER_RATE_BPM = 280;

export function ventricularFlutterGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  void settings.heartRate;
  const periodSec = 60 / V_FLUTTER_RATE_BPM;

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);
  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    // Sinusoid only — that's the diagnostic look of V-flutter.
    const mv = V_FLUTTER_AMPLITUDE_MV * Math.sin(2 * Math.PI * (t / periodSec));
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  // Emit a qrs-wide event at each cycle peak so beep timing is reasonable.
  const peakOffset = periodSec / 4;
  const firstCycle = Math.floor((tStart - peakOffset) / periodSec);
  const lastCycle = Math.ceil((tEnd + peakOffset) / periodSec);
  for (let c = firstCycle; c <= lastCycle; c++) {
    const peakT = c * periodSec + peakOffset;
    if (peakT >= tStart && peakT < tEnd) {
      events.push({ kind: 'qrs-wide', tSec: peakT, meta: { mechanism: 'flutter', hrBpm: V_FLUTTER_RATE_BPM } });
    }
  }

  return { rhythmId: settings.rhythmId, windowStartSec: tStart, windowEndSec: tEnd, sampleRateHz: settings.sampleRateHz, points, events };
}
