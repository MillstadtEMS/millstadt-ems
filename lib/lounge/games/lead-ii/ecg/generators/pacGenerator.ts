/**
 * Premature Atrial Contractions on a sinus background.
 *
 * Slot model (sinus beats nominally at integer multiples of `rr`):
 *   - Slot s is a "PAC slot" → an early atrial beat fires at
 *     `(s · rr) − prematureOffset`. The PAC has an abnormal P-wave
 *     morphology (lower amplitude, slightly different shape) followed by a
 *     NARROW QRS (NOT wide — that's the key contrast with PVC).
 *   - Because the atrial impulse depolarizes (and resets) the SA node, the
 *     next sinus beat fires one full `rr` AFTER the PAC, not on the original
 *     sinus schedule. That gives a NON-COMPENSATORY pause:
 *
 *       pre-PAC  = rr − prematureOffset      (shorter than baseline)
 *       post-PAC = rr                         (same as baseline)
 *       sum      = 2·rr − prematureOffset    (LESS than 2·rr — the
 *                                              non-compensatory hallmark
 *                                              that distinguishes PACs from
 *                                              PVCs)
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

const PAC_INTERVAL_SLOTS = 7;
const PREMATURE_OFFSET_SEC = 0.18;

const SINUS_BEAT = narrowBeatComponents(0.16);

/** PAC: smaller, slightly abnormal P + narrow QRS. */
function buildPacBeat(): AbsBeatComponents {
  const c = narrowBeatComponents(0.14);
  // Abnormal P: lower amplitude than sinus P (a sinus P is 0.15 mV; here ~0.06).
  c.p = { amplitudeMv: 0.06, centerFraction: 0.020, sigmaSec: 0.025 };
  return c;
}

const PAC_BEAT = buildPacBeat();

function isPacSlot(slot: number): boolean {
  return slot > 0 && slot % PAC_INTERVAL_SLOTS === 0;
}

export function pacGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('atrial.pac', settings.heartRate);
  const rr = 60 / hr;

  // Walk slots forward from t=0 until we cover the window. Each PAC resets
  // the SA node, so the post-PAC slot fires `rr` after the PAC (not on the
  // original sinus grid). We accumulate beat starts deterministically.
  type BeatPlan = { kind: 'sinus' | 'pac'; tBeat: number };
  const plan: BeatPlan[] = [];
  let nextSinusT = 0;
  let slot = 0;
  while (nextSinusT < tEnd + 1.0) {
    if (isPacSlot(slot)) {
      const pacT = nextSinusT - PREMATURE_OFFSET_SEC;
      plan.push({ kind: 'pac', tBeat: pacT });
      // Non-compensatory: SA reset → next sinus fires rr after the PAC.
      nextSinusT = pacT + rr;
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
      mv += evaluateAbsBeat(t, b.tBeat, b.kind === 'pac' ? PAC_BEAT : SINUS_BEAT);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (const b of plan) {
    const beat = b.kind === 'pac' ? PAC_BEAT : SINUS_BEAT;
    const pT = b.tBeat + beat.p.centerFraction;
    const rT = b.tBeat + beat.r.centerFraction;
    const tT = b.tBeat + beat.t.centerFraction;
    if (b.kind === 'pac') {
      if (pT >= tStart && pT < tEnd) {
        events.push({
          kind: 'p-wave',
          tSec: pT,
          meta: { abnormal: true, prematureOffsetSec: PREMATURE_OFFSET_SEC },
        });
      }
      if (rT >= tStart && rT < tEnd) {
        events.push({ kind: 'qrs-narrow', tSec: rT, meta: { ectopy: 'pac' } });
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
