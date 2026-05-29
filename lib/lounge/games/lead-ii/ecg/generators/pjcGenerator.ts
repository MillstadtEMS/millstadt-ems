/**
 * Premature Junctional Complex (PJC) on a sinus background.
 *
 * Same model as PAC except the premature beat is JUNCTIONAL:
 *   - Inverted P wave (or no visible P at all)
 *   - Narrow QRS (less than 0.12 s)
 *   - PRI of the premature beat, if measurable, is < 0.12 s
 *
 * Like a PAC, the PJC depolarizes (and resets) the SA node, so the post-PJC
 * sinus beat fires one full `rr` after the PJC — a non-compensatory pause.
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

const PJC_INTERVAL_SLOTS = 7;
const PREMATURE_OFFSET_SEC = 0.20;

const SINUS_BEAT = narrowBeatComponents(0.16);

/** PJC beat: small inverted P just before QRS, narrow QRS, normal T. */
function buildPjcBeat(): AbsBeatComponents {
  const c = narrowBeatComponents(0.10);
  c.p = { amplitudeMv: -0.08, centerFraction: 0.040, sigmaSec: 0.020 };
  return c;
}

const PJC_BEAT = buildPjcBeat();

function isPjcSlot(slot: number): boolean {
  return slot > 0 && slot % PJC_INTERVAL_SLOTS === 0;
}

export function pjcGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('junctional.pjc', settings.heartRate);
  const rr = 60 / hr;

  type BeatPlan = { kind: 'sinus' | 'pjc'; tBeat: number };
  const plan: BeatPlan[] = [];
  let nextSinusT = 0;
  let slot = 0;
  while (nextSinusT < tEnd + 1.0) {
    if (isPjcSlot(slot)) {
      const pjcT = nextSinusT - PREMATURE_OFFSET_SEC;
      plan.push({ kind: 'pjc', tBeat: pjcT });
      // Non-compensatory: SA reset → next sinus fires rr after the PJC.
      nextSinusT = pjcT + rr;
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
      mv += evaluateAbsBeat(t, b.tBeat, b.kind === 'pjc' ? PJC_BEAT : SINUS_BEAT);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (const b of plan) {
    const beat = b.kind === 'pjc' ? PJC_BEAT : SINUS_BEAT;
    const pT = b.tBeat + beat.p.centerFraction;
    const rT = b.tBeat + beat.r.centerFraction;
    const tT = b.tBeat + beat.t.centerFraction;
    if (b.kind === 'pjc') {
      if (pT >= tStart && pT < tEnd) {
        events.push({
          kind: 'p-wave',
          tSec: pT,
          meta: { junctional: true, polarity: 'inverted', premature: true },
        });
      }
      if (rT >= tStart && rT < tEnd) {
        events.push({ kind: 'qrs-narrow', tSec: rT, meta: { ectopy: 'pjc' } });
      }
      if (tT >= tStart && tT < tEnd) events.push({ kind: 't-wave', tSec: tT });
    } else {
      if (pT >= tStart && pT < tEnd) events.push({ kind: 'p-wave', tSec: pT });
      if (rT >= tStart && rT < tEnd) events.push({ kind: 'qrs-narrow', tSec: rT, meta: { hrBpm: hr } });
      if (tT >= tStart && tT < tEnd) events.push({ kind: 't-wave', tSec: tT });
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
