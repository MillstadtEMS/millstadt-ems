/**
 * Multifocal Atrial Tachycardia (MAT) generator.
 *
 *  - Atrial rate > 100 bpm
 *  - At least 3 distinct P-wave morphologies (by definition)
 *  - Irregularly irregular timing because the firing pacemaker shifts focus
 *    from beat to beat
 *  - Narrow QRS (impulse uses normal AV conduction)
 *
 * Visually distinct from atrial fibrillation: MAT has discrete, identifiable
 * P waves of varying shape preceding each QRS. AFib has no organized P at all.
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
} from './gaussianBeat';

/** Deterministic [0,1) from an integer index. */
function hashUnit(i: number): number {
  let x = (i | 0) ^ 0x9e3779b1;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return ((x ^ (x >>> 16)) >>> 0) / 0xffffffff;
}

// Three (and a fourth occasional) P-wave morphologies. Real MAT requires
// ≥ 3 different P shapes; we cycle through four to make the variation
// obvious on a teaching strip.
type PVariant = { amplitudeMv: number; centerFraction: number; sigmaSec: number };

const P_VARIANTS: readonly PVariant[] = [
  { amplitudeMv: 0.18, centerFraction: 0.025, sigmaSec: 0.024 }, // upright, mid-PRI
  { amplitudeMv: 0.10, centerFraction: 0.030, sigmaSec: 0.030 }, // shorter, broader
  { amplitudeMv: -0.06, centerFraction: 0.020, sigmaSec: 0.020 }, // shallow inverted (low atrial focus)
  { amplitudeMv: 0.22, centerFraction: 0.018, sigmaSec: 0.018 }, // tall, narrow
];

function buildMatBeat(pVariantIdx: number): AbsBeatComponents {
  const c = narrowBeatComponents(0.16);
  const v = P_VARIANTS[pVariantIdx % P_VARIANTS.length]!;
  c.p = { ...v };
  return c;
}

/** Pre-build the four beat variants so the per-sample loop is cheap. */
const MAT_BEATS: readonly AbsBeatComponents[] = P_VARIANTS.map((_, i) => buildMatBeat(i));

export function matGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('atrial.mat', settings.heartRate);
  const baseRr = 60 / hr;

  // Walk beat slots forward from t=0; each slot picks a slightly different
  // R-R interval AND a different P-wave variant. Variation in R-R is wider
  // than sinus arrhythmia but narrower than AFib.
  type Beat = { tBeat: number; pIdx: number };
  const beats: Beat[] = [];
  let nextT = 0;
  let i = 0;
  beats.push({ tBeat: 0, pIdx: 0 });
  while (nextT < tEnd + 1.0) {
    const u = hashUnit(i);
    // R-R fluctuates 0.75× to 1.25× the base (irregularly irregular).
    const rr = baseRr * (0.75 + 0.50 * u);
    nextT += rr;
    // Rotate through 4 P variants, but pick semi-randomly so the same
    // morphology doesn't always sit at slot 0.
    const pIdx = Math.floor(hashUnit(i + 1000) * P_VARIANTS.length);
    beats.push({ tBeat: nextT, pIdx });
    i++;
  }

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);
  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;
    for (const b of beats) {
      if (Math.abs(t - b.tBeat) > 0.7) continue;
      mv += evaluateAbsBeat(t, b.tBeat, MAT_BEATS[b.pIdx]!);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (const b of beats) {
    const beat = MAT_BEATS[b.pIdx]!;
    const pT = b.tBeat + beat.p.centerFraction;
    const rT = b.tBeat + beat.r.centerFraction;
    const tT = b.tBeat + beat.t.centerFraction;
    if (pT >= tStart && pT < tEnd) {
      events.push({
        kind: 'p-wave',
        tSec: pT,
        meta: { variant: b.pIdx, multifocal: true },
      });
    }
    if (rT >= tStart && rT < tEnd) events.push({ kind: 'qrs-narrow', tSec: rT, meta: { hrBpm: hr } });
    if (tT >= tStart && tT < tEnd) events.push({ kind: 't-wave', tSec: tT });
  }

  return {
    rhythmId: settings.rhythmId,
    windowStartSec: tStart,
    windowEndSec: tEnd,
    sampleRateHz: settings.sampleRateHz,
    points,
    events,
  };
}
