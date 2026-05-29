/**
 * Junctional rhythms — same morphology, different rate band.
 *
 *  - junctional.rhythm        (escape):     40–60 bpm
 *  - junctional.accelerated:                60–100 bpm
 *
 * Morphology is single-lead-II-approximate: NO upright sinus P, narrow QRS,
 * inverted/retrograde P (rendered as a small downward deflection just before
 * the QRS to represent retrograde atrial activation through the AV node).
 */

import type {
  ECGEvent,
  ECGSettings,
  GeneratedECGSignal,
  RhythmId,
} from '../types';
import { resolveHrFor } from '../rhythmRateControl';
import {
  type AbsBeatComponents,
  evaluateAbsBeat,
  narrowBeatComponents,
  sampleTimes,
} from './gaussianBeat';

/** Junctional beat: inverted P just before QRS, narrow QRS, normal T. */
function buildJunctionalBeat(): AbsBeatComponents {
  const c = narrowBeatComponents(0.10);
  // Inverted P (downward) — sits just before QRS in single-lead approx.
  c.p = { amplitudeMv: -0.10, centerFraction: 0.040, sigmaSec: 0.020 };
  return c;
}

const JUNCTIONAL_BEAT = buildJunctionalBeat();

function junctionalGeneratorFor(rhythmId: RhythmId, mechanismLabel: 'escape' | 'accelerated') {
  return function generate(
    settings: ECGSettings,
    tStart: number,
    tEnd: number,
  ): GeneratedECGSignal {
    const hr = resolveHrFor(rhythmId, settings.heartRate);
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
        mv += evaluateAbsBeat(t, beatStart, JUNCTIONAL_BEAT);
      }
      points[i] = { t, mv };
    }

    const events: ECGEvent[] = [];
    for (let s = firstSlot; s <= lastSlot; s++) {
      const beatStart = s * rr;
      const pT = beatStart + JUNCTIONAL_BEAT.p.centerFraction;
      const rT = beatStart + JUNCTIONAL_BEAT.r.centerFraction;
      const tT = beatStart + JUNCTIONAL_BEAT.t.centerFraction;
      if (pT >= tStart && pT < tEnd) {
        events.push({
          kind: 'p-wave',
          tSec: pT,
          meta: { junctional: true, polarity: 'inverted' },
        });
      }
      if (rT >= tStart && rT < tEnd) {
        events.push({
          kind: 'qrs-narrow',
          tSec: rT,
          meta: { hrBpm: hr, junctional: true, mechanism: mechanismLabel },
        });
      }
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
  };
}

export const junctionalRhythmGenerator = junctionalGeneratorFor('junctional.rhythm', 'escape');
export const acceleratedJunctionalGenerator = junctionalGeneratorFor('junctional.accelerated', 'accelerated');
// Junctional tachycardia: same morphology, 100–180 bpm rate band. The
// `resolveHrFor` call inside the factory honors the rhythm's RHYTHM_RATE_CONTROL
// entry so the displayed HR matches what we emit.
export const junctionalTachycardiaGenerator = junctionalGeneratorFor('junctional.tachycardia', 'accelerated');
