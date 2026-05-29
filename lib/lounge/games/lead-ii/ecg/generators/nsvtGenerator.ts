/**
 * Non-Sustained Ventricular Tachycardia (NSVT).
 *
 *  - Underlying sinus rhythm at the user-controlled HR.
 *  - Periodically (every ~12 seconds), a finite RUN of wide ventricular
 *    beats fires at ~170 bpm (RR ≈ 0.35 s) for `RUN_LENGTH` beats. After
 *    the run, sinus resumes one full sinus-RR after the last wide beat.
 *
 * Distinct from sustained VT (which is wide all the time): NSVT here always
 * intermixes underlying sinus and finite VT runs.
 */

import type {
  ECGEvent,
  ECGSettings,
  GeneratedECGSignal,
} from '../types';
import { resolveHrFor } from '../rhythmRateControl';
import {
  evaluateAbsBeat,
  narrowBeatComponents,
  sampleTimes,
  wideBeatComponents,
} from './gaussianBeat';

/** Length of each VT run (beats). 5 keeps it clearly "non-sustained". */
const RUN_LENGTH = 5;

/** Spacing between RUN starts in beat-slots of the underlying sinus. */
const RUN_SLOT_INTERVAL = 16;

/** Internal R-R inside a VT run (~170 bpm). */
const RUN_INTERNAL_RR_SEC = 60 / 170;

const SINUS_BEAT = narrowBeatComponents(0.16);
const WIDE_BEAT = wideBeatComponents({ centerSec: 0.08, polarity: 1 });

function isRunStartSlot(slot: number): boolean {
  return slot > 0 && slot % RUN_SLOT_INTERVAL === 0;
}

export function nsvtGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('vent.nsvt', settings.heartRate);
  const rr = 60 / hr;

  type Plan =
    | { kind: 'sinus'; tBeat: number; slot: number }
    | { kind: 'wide'; tBeat: number; runIndex: number; runId: number };
  const plan: Plan[] = [];

  let nextNaturalT = 0;
  let slot = 0;
  let runId = 0;
  while (nextNaturalT < tEnd + 1.5) {
    if (isRunStartSlot(slot)) {
      let runT = nextNaturalT;
      const myRunId = runId++;
      for (let r = 0; r < RUN_LENGTH; r++) {
        plan.push({ kind: 'wide', tBeat: runT, runIndex: r, runId: myRunId });
        if (r < RUN_LENGTH - 1) runT += RUN_INTERNAL_RR_SEC;
      }
      // Sinus resumes one full sinus-RR after the last wide beat.
      nextNaturalT = runT + rr;
    } else {
      plan.push({ kind: 'sinus', tBeat: nextNaturalT, slot });
      nextNaturalT += rr;
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
      mv += evaluateAbsBeat(t, b.tBeat, b.kind === 'wide' ? WIDE_BEAT : SINUS_BEAT);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (const b of plan) {
    if (b.kind === 'wide') {
      const rT = b.tBeat + WIDE_BEAT.r.centerFraction;
      if (rT >= tStart && rT < tEnd) {
        events.push({
          kind: 'qrs-wide',
          tSec: rT,
          meta: {
            run: 'nsvt',
            runId: b.runId,
            runIndex: b.runIndex,
            runLength: RUN_LENGTH,
          },
        });
      }
    } else {
      const pT = b.tBeat + SINUS_BEAT.p.centerFraction;
      const rT = b.tBeat + SINUS_BEAT.r.centerFraction;
      const tT = b.tBeat + SINUS_BEAT.t.centerFraction;
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
