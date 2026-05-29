/**
 * Supraventricular Tachycardia (SVT) generator.
 *
 *  - Narrow QRS (no different morphology from sinus QRS)
 *  - Fast and regular: 180 bpm by default
 *  - P waves absent / buried (commonly buried in the preceding T)
 *
 * Visually distinct from sinus tachycardia by the lack of clear P waves and
 * faster rate; from atrial flutter by no sawtooth baseline.
 */

import type {
  ECGEvent,
  ECGSettings,
  GeneratedECGSignal,
} from '../types';
import { resolveHrFor } from '../rhythmRateControl';
import { evaluateAbsBeat, narrowBeatComponents, sampleTimes } from './gaussianBeat';
import { svtMorphologyVariant } from '../rhythmVariants';

/** Narrow QRS+T but no P (P amplitude → 0). */
function buildSvtBeat(seed?: number) {
  const variant = svtMorphologyVariant(seed);
  const c = narrowBeatComponents(variant.prSec);
  c.p = { ...c.p, amplitudeMv: 0 };
  c.r = { ...c.r, amplitudeMv: c.r.amplitudeMv * variant.qrsAmpScale };
  c.q = { ...c.q, amplitudeMv: c.q.amplitudeMv * variant.qrsAmpScale };
  c.s = { ...c.s, amplitudeMv: c.s.amplitudeMv * variant.qrsAmpScale };
  c.t = { ...c.t, amplitudeMv: c.t.amplitudeMv * variant.tAmpScale };
  return c;
}

export function svtGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('atrial.svt', settings.heartRate);
  const beat = buildSvtBeat(settings.variantSeed);
  const rr = 60 / hr;

  const firstBeatIdx = Math.floor((tStart - 0.10) / rr);
  const lastBeatIdx = Math.ceil((tEnd + 0.10) / rr);

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);
  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;
    for (let b = firstBeatIdx; b <= lastBeatIdx; b++) {
      const beatStart = b * rr;
      if (Math.abs(t - beatStart) > 0.5) continue;
      mv += evaluateAbsBeat(t, beatStart, beat);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let b = firstBeatIdx; b <= lastBeatIdx; b++) {
    const beatStart = b * rr;
    const rT = beatStart + beat.r.centerFraction;
    if (rT >= tStart && rT < tEnd) {
      events.push({ kind: 'qrs-narrow', tSec: rT, meta: { hrBpm: hr } });
    }
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
