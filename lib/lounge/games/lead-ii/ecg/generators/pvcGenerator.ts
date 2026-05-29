/**
 * Premature Ventricular Contractions on a sinus background — with realistic
 * timing (Phase 3 hardening: full compensatory pause).
 *
 * Slot model (sinus beats nominally at integer multiples of `rr`):
 *
 *   beat slot:  …   8         9         10   …
 *   t (rr=0.75): …  6.00      6.75      7.50 …
 *
 *   - Slot 9 is a "PVC slot": the wide ventricular beat fires PREMATURELY
 *     at (slot * rr − prematureOffset). The natural sinus impulse that would
 *     have fired at slot * rr is masked by the PVC's refractory period — the
 *     PVC slot REPLACES its own sinus.
 *   - Slot 10 resumes regular sinus cadence on schedule. The post-PVC
 *     interval is therefore (rr + prematureOffset) — longer than baseline —
 *     which is the classical compensatory pause.
 *
 * Timing properties (provable in tests):
 *   - pre-PVC interval  = rr − prematureOffset  (shorter than baseline)
 *   - post-PVC interval = rr + prematureOffset  (longer than baseline — the pause)
 *   - sum (pre + post)  = 2·rr  ("full compensatory pause" by definition)
 *
 * Phase 3 ships ISOLATED PVCs only. Couplets, triplets, bigeminy, trigeminy,
 * R-on-T are catalog entries that stay `implemented: false` until later.
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

/** Every Nth beat slot fires a PVC. */
const PVC_INTERVAL_SLOTS = 9;

/**
 * How far before the scheduled sinus beat the PVC fires.
 * 0.20 s gives a recognizably "early" beat at HR 60–110.
 */
const PREMATURE_OFFSET_SEC = 0.20;

const SINUS_BEAT = narrowBeatComponents(0.16);
const PVC_BEAT = wideBeatComponents({ centerSec: 0.06, polarity: 1 });

function isPvcSlot(slot: number): boolean {
  return slot > 0 && slot % PVC_INTERVAL_SLOTS === 0;
}

export function pvcGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('vent.pvc', settings.heartRate);
  const rr = 60 / hr;
  const firstSlot = Math.floor((tStart - 0.10) / rr) - 1;
  const lastSlot = Math.ceil((tEnd + 0.10) / rr) + 1;

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);

  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;
    for (let s = firstSlot; s <= lastSlot; s++) {
      if (isPvcSlot(s)) {
        // PVC fires before slot s's natural sinus time AND replaces it.
        const pvcStart = s * rr - PREMATURE_OFFSET_SEC;
        if (Math.abs(t - pvcStart) <= 0.7) {
          mv += evaluateAbsBeat(t, pvcStart, PVC_BEAT);
        }
      } else {
        const beatStart = s * rr;
        if (Math.abs(t - beatStart) <= 0.7) {
          mv += evaluateAbsBeat(t, beatStart, SINUS_BEAT);
        }
      }
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let s = firstSlot; s <= lastSlot; s++) {
    if (isPvcSlot(s)) {
      const pvcStart = s * rr - PREMATURE_OFFSET_SEC;
      const rT = pvcStart + PVC_BEAT.r.centerFraction;
      if (rT >= tStart && rT < tEnd) {
        events.push({
          kind: 'pvc',
          tSec: rT,
          meta: {
            slotIndex: s,
            prematureOffsetSec: PREMATURE_OFFSET_SEC,
            baselineRrSec: rr,
          },
        });
        events.push({ kind: 'qrs-wide', tSec: rT });
      }
    } else {
      const beatStart = s * rr;
      const pT = beatStart + SINUS_BEAT.p.centerFraction;
      const rT = beatStart + SINUS_BEAT.r.centerFraction;
      const tT = beatStart + SINUS_BEAT.t.centerFraction;
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
