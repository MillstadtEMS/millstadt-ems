/**
 * Sinus Arrhythmia.
 *
 * Sinus rhythm (P before every QRS, narrow QRS, consistent P morphology) but
 * with respiratory R-R variation: cyclic ±~18 % around a base rate. Beats
 * speed up on inspiration and slow on expiration. Crucially this is NOT
 * irregularly irregular like AFib — the cycle is smooth and predictable, P
 * morphology stays consistent, and a P precedes every QRS.
 *
 * Determinism: beats are derived from the t=0 epoch by integrating a
 * respiratory phase, so the same window always produces the same samples.
 */

import type {
  ECGEvent,
  ECGSettings,
  GeneratedECGSignal,
} from '../types';
import { resolveHrFor } from '../rhythmRateControl';
import { evaluateBeat, sampleTimes } from './gaussianBeat';

const RESP_RATE_HZ = 14 / 60; // 14 breaths per minute
const VARIATION_FRACTION = 0.18; // R-R varies ±18 % around base

/** Compute beat starts from t=0 to (tEnd + slack), deterministically. */
function computeBeatStarts(baseRr: number, tEnd: number): number[] {
  const out: number[] = [];
  let beatStart = 0;
  out.push(0);
  // Integrate forward until we cover the requested window plus padding.
  while (beatStart < tEnd + 1.0) {
    const phase = 2 * Math.PI * RESP_RATE_HZ * beatStart;
    const nextRr = baseRr * (1 + VARIATION_FRACTION * Math.sin(phase));
    beatStart += nextRr;
    out.push(beatStart);
  }
  return out;
}

export function sinusArrhythmiaGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('sinus.arrhythmia', settings.heartRate);
  const baseRr = 60 / hr;
  const beatStarts = computeBeatStarts(baseRr, tEnd);
  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);

  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;
    for (const beatStart of beatStarts) {
      // Skip beats too far away to contribute.
      if (Math.abs(t - beatStart) > 0.6) continue;
      // Use the local R-R for the gaussian template fractions to scale.
      // Approximate with baseRr — the morphology stays plausible; the
      // teaching point is the cyclic R-R, not the exact T-wave width.
      mv += evaluateBeat(t, beatStart, baseRr);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (const beatStart of beatStarts) {
    const pT = beatStart + 0.16 * baseRr;
    const rT = beatStart + 0.30 * baseRr;
    const tT = beatStart + 0.55 * baseRr;
    if (pT >= tStart && pT < tEnd) events.push({ kind: 'p-wave', tSec: pT });
    if (rT >= tStart && rT < tEnd) events.push({ kind: 'qrs-narrow', tSec: rT });
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
