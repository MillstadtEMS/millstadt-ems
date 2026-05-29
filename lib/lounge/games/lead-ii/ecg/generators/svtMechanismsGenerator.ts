/**
 * AV-Nodal Reentrant Tachycardia (AVNRT) and Orthodromic AV Reentrant
 * Tachycardia (AVRT). Both are fast regular narrow-complex tachycardias and
 * both are distinct from generic SVT in the catalog so quizzes can teach the
 * mechanism difference.
 *
 * Phase-4 morphology distinction (single-lead approximation):
 *  - AVNRT: P is BURIED in or immediately after the QRS (very short RP).
 *           We render a tiny retrograde-P deflection ~30 ms after R, so the
 *           Q-wave region looks slightly notched. Metadata: pseudo-R'.
 *  - AVRT (orthodromic): P fires later in the cycle (longer RP) due to
 *           atrial activation via the accessory pathway. We render a small
 *           retrograde-P bump ~120 ms after R.
 *
 * Both share the bulk of their generator code; the helpers parameterize the
 * retrograde-P offset and amplitude.
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

interface SvtVariant {
  rhythmId: 'atrial.avnrt' | 'atrial.avrt';
  /** ms from R to retrograde P. Short = AVNRT, longer = AVRT. */
  retrogradePOffsetSec: number;
  /** Amplitude of the retrograde P (negative — downward in lead II). */
  retrogradePAmpMv: number;
  mechanismLabel: 'avnrt' | 'avrt';
}

function buildBeat(variant: SvtVariant): AbsBeatComponents {
  const c = narrowBeatComponents(0.10);
  // Suppress sinus P
  c.p = { amplitudeMv: 0, centerFraction: 0, sigmaSec: 0.001 };
  // Repurpose the T-component slot as a small retrograde P after R.
  // (T wave amplitude reduced because at high rates T is small/buried; this
  // is a single-lead approximation — see header.)
  c.t = {
    amplitudeMv: variant.retrogradePAmpMv,
    centerFraction: c.r.centerFraction + variant.retrogradePOffsetSec,
    sigmaSec: 0.020,
  };
  return c;
}

function svtMechanismGenerator(variant: SvtVariant) {
  const beat = buildBeat(variant);

  return function generate(
    settings: ECGSettings,
    tStart: number,
    tEnd: number,
  ): GeneratedECGSignal {
    const hr = resolveHrFor(variant.rhythmId, settings.heartRate);
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
        mv += evaluateAbsBeat(t, beatStart, beat);
      }
      points[i] = { t, mv };
    }

    const events: ECGEvent[] = [];
    for (let s = firstSlot; s <= lastSlot; s++) {
      const beatStart = s * rr;
      const rT = beatStart + beat.r.centerFraction;
      const retroPT = beatStart + beat.t.centerFraction;
      if (rT >= tStart && rT < tEnd) {
        events.push({
          kind: 'qrs-narrow',
          tSec: rT,
          meta: { hrBpm: hr, mechanism: variant.mechanismLabel },
        });
      }
      if (retroPT >= tStart && retroPT < tEnd) {
        events.push({
          kind: 'p-wave',
          tSec: retroPT,
          meta: {
            retrograde: true,
            mechanism: variant.mechanismLabel,
            rpIntervalSec: variant.retrogradePOffsetSec,
          },
        });
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
  };
}

export const avnrtGenerator = svtMechanismGenerator({
  rhythmId: 'atrial.avnrt',
  retrogradePOffsetSec: 0.030, // very short RP — buried/pseudo-R'
  retrogradePAmpMv: -0.08,
  mechanismLabel: 'avnrt',
});

export const avrtGenerator = svtMechanismGenerator({
  rhythmId: 'atrial.avrt',
  retrogradePOffsetSec: 0.120, // longer RP — visible after QRS
  retrogradePAmpMv: -0.10,
  mechanismLabel: 'avrt',
});
