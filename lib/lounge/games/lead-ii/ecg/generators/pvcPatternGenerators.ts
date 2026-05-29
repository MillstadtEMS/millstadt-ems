/**
 * Repeating-pattern PVC rhythms.
 *
 *   - vent.pvc-couplet:  every Nth beat, two consecutive PVCs
 *   - vent.pvc-triplet:  every Nth beat, three consecutive PVCs
 *   - vent.bigeminy:     every other beat is a PVC
 *   - vent.trigeminy:    every third beat is a PVC
 *
 * All four share the slot-based scheduler: the underlying sinus rhythm runs
 * normally except at "PVC slots", where one or more wide ventricular beats
 * fire premature and replace their natural sinus impulse(s). Each individual
 * PVC keeps the same compensatory-pause property as the isolated PVC
 * generator: the next post-PVC sinus impulse fires `rr` after the LAST PVC
 * in the run, matching the "SA-on-schedule, PVC-refractory-masks-the-next"
 * model.
 *
 * For couplet / triplet runs, this means the run has its own internal R-R
 * (chosen as `rr * 0.55` to feel "fast" — roughly 145 bpm at base 80) and
 * the post-run sinus resumes one full `rr` after the LAST PVC fires.
 */

import type {
  ECGEvent,
  ECGSettings,
  GeneratedECGSignal,
  RhythmId,
} from '../types';
import { resolveHrFor } from '../rhythmRateControl';
import {
  evaluateAbsBeat,
  narrowBeatComponents,
  sampleTimes,
  wideBeatComponents,
} from './gaussianBeat';

const SINUS_BEAT = narrowBeatComponents(0.16);
const PVC_BEAT = wideBeatComponents({ centerSec: 0.06, polarity: 1 });

/** Within a PVC run, R-R between consecutive PVCs (seconds). ~145 bpm. */
const RUN_INTERNAL_RR_SEC = 0.41;

/** PVC offset before its slot (premature). Same as the isolated PVC. */
const PREMATURE_OFFSET_SEC = 0.20;

interface PvcPatternConfig {
  rhythmId: RhythmId;
  /** How many consecutive PVCs fire at each "ectopy slot". */
  runLength: number;
  /** Slot-based predicate: which slots are PVC slots? */
  isEctopySlot: (slot: number) => boolean;
  patternLabel: 'couplet' | 'triplet' | 'bigeminy' | 'trigeminy';
}

function pvcPatternGenerator(cfg: PvcPatternConfig) {
  return function generate(
    settings: ECGSettings,
    tStart: number,
    tEnd: number,
  ): GeneratedECGSignal {
    const hr = resolveHrFor(cfg.rhythmId, settings.heartRate);
    const rr = 60 / hr;

    type Plan =
      | { kind: 'sinus'; tBeat: number; slot: number }
      | { kind: 'pvc'; tBeat: number; slot: number; runIndex: number; runLength: number };
    const plan: Plan[] = [];

    let nextNaturalT = 0;
    let slot = 0;
    while (nextNaturalT < tEnd + 1.0) {
      if (cfg.isEctopySlot(slot)) {
        // First PVC fires premature at the slot's natural sinus time.
        let pvcT = nextNaturalT - PREMATURE_OFFSET_SEC;
        for (let r = 0; r < cfg.runLength; r++) {
          plan.push({ kind: 'pvc', tBeat: pvcT, slot, runIndex: r, runLength: cfg.runLength });
          if (r < cfg.runLength - 1) pvcT += RUN_INTERNAL_RR_SEC;
        }
        // Next sinus fires `rr` after the LAST PVC of the run (full
        // compensatory-pause behavior at the end of the burst).
        nextNaturalT = pvcT + rr;
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
        mv += evaluateAbsBeat(t, b.tBeat, b.kind === 'pvc' ? PVC_BEAT : SINUS_BEAT);
      }
      points[i] = { t, mv };
    }

    const events: ECGEvent[] = [];
    for (const b of plan) {
      if (b.kind === 'pvc') {
        const rT = b.tBeat + PVC_BEAT.r.centerFraction;
        if (rT >= tStart && rT < tEnd) {
          events.push({
            kind: 'pvc',
            tSec: rT,
            meta: {
              pattern: cfg.patternLabel,
              runIndex: b.runIndex,
              runLength: b.runLength,
            },
          });
          events.push({ kind: 'qrs-wide', tSec: rT });
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
  };
}

// ── couplet: two PVCs every 8 sinus slots ────────────────────────────
export const pvcCoupletGenerator = pvcPatternGenerator({
  rhythmId: 'vent.pvc-couplet',
  runLength: 2,
  isEctopySlot: (slot) => slot > 0 && slot % 8 === 0,
  patternLabel: 'couplet',
});

// ── triplet: three PVCs every 8 sinus slots ──────────────────────────
export const pvcTripletGenerator = pvcPatternGenerator({
  rhythmId: 'vent.pvc-triplet',
  runLength: 3,
  isEctopySlot: (slot) => slot > 0 && slot % 8 === 0,
  patternLabel: 'triplet',
});

// ── bigeminy: every other slot is a PVC (slots 1, 3, 5, …) ───────────
export const bigeminyGenerator = pvcPatternGenerator({
  rhythmId: 'vent.bigeminy',
  runLength: 1,
  isEctopySlot: (slot) => slot > 0 && slot % 2 === 1,
  patternLabel: 'bigeminy',
});

// ── trigeminy: every third slot is a PVC (slots 2, 5, 8, …) ──────────
export const trigeminyGenerator = pvcPatternGenerator({
  rhythmId: 'vent.trigeminy',
  runLength: 1,
  isEctopySlot: (slot) => slot > 0 && slot % 3 === 2,
  patternLabel: 'trigeminy',
});
