/**
 * Hyperkalemia ECG patterns.
 *
 *   - electrolyte.hyperk-peaked-t      Sinus rhythm with TALL, NARROW,
 *                                       symmetric peaked T waves. P waves
 *                                       still present, QRS narrow. (Stage 1.)
 *   - electrolyte.hyperk-progression   STAGED strip across the window:
 *                                       cycles through Stage 1 (peaked T) →
 *                                       Stage 2 (P-wave flattening) →
 *                                       Stage 3 (PR/QRS widening) every
 *                                       ~15 seconds. The stage is a function
 *                                       of `t` so any rendered window shows
 *                                       which stage it's currently in.
 *   - electrolyte.hyperk-sine-wave     Severe pre-arrest sine-wave pattern
 *                                       — very wide QRS merging into the T
 *                                       wave. Slow sinusoidal morphology
 *                                       distinct from VT (slower, smoother)
 *                                       and from VFib (organized, not chaotic).
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

// ════════════════════════════════════════════════════════════════════
//  Hyperkalemia — peaked T (Stage 1)
// ════════════════════════════════════════════════════════════════════

/** Tall, narrow, symmetric T: obvious "tented" hyperkalemia morphology. */
function peakedTBeat(prSec = 0.16): AbsBeatComponents {
  const c = narrowBeatComponents(prSec);
  c.t = {
    amplitudeMv: 1.15,
    centerFraction: prSec + 0.260,
    sigmaSec: 0.022,
  };
  return c;
}

const PEAKED_T_BEAT = peakedTBeat(0.16);

export function hyperkalemiaPeakedTGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('electrolyte.hyperk-peaked-t', settings.heartRate);
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
      mv += evaluateAbsBeat(t, beatStart, PEAKED_T_BEAT);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let s = firstSlot; s <= lastSlot; s++) {
    const beatStart = s * rr;
    const pT = beatStart + PEAKED_T_BEAT.p.centerFraction;
    const rT = beatStart + PEAKED_T_BEAT.r.centerFraction;
    const tT = beatStart + PEAKED_T_BEAT.t.centerFraction;
    if (pT >= tStart && pT < tEnd) events.push({ kind: 'p-wave', tSec: pT });
    if (rT >= tStart && rT < tEnd) {
      events.push({
        kind: 'qrs-narrow',
        tSec: rT,
        meta: { hrBpm: hr, hyperkalemiaStage: 1, peakedT: true },
      });
    }
    if (tT >= tStart && tT < tEnd) {
      events.push({
        kind: 't-wave',
        tSec: tT,
        meta: { peakedT: true, amplitudeMv: PEAKED_T_BEAT.t.amplitudeMv },
      });
    }
  }

  return baseSignal(settings, tStart, tEnd, points, events);
}

// ════════════════════════════════════════════════════════════════════
//  Hyperkalemia — staged progression
// ════════════════════════════════════════════════════════════════════

const STAGE_DURATION_SEC = 15;

/** Stage 1 = peaked T; 2 = P flattening; 3 = QRS widening + PR long. */
function stageAtSec(t: number): 1 | 2 | 3 {
  const idx = Math.floor(t / STAGE_DURATION_SEC) % 3;
  return (idx + 1) as 1 | 2 | 3;
}

function stageBeat(stage: 1 | 2 | 3): AbsBeatComponents {
  if (stage === 1) {
    // Stage 1 — peaked T, normal P, narrow QRS, normal PR
    return peakedTBeat(0.16);
  }
  if (stage === 2) {
    // Stage 2 — P flattens / disappears, PR prolonged, QRS still narrow
    const c = peakedTBeat(0.22);
    c.p = { amplitudeMv: 0.04, centerFraction: 0.025, sigmaSec: 0.030 }; // tiny P
    return c;
  }
  // Stage 3 — QRS widens, P essentially gone
  const c = peakedTBeat(0.20);
  c.p = { amplitudeMv: 0, centerFraction: 0, sigmaSec: 0.001 };
  // Wide for real, not just a label: broad Q/R/S lobes visually stretch the
  // complex beyond 160 ms before the peaked T begins to merge in.
  c.q = { ...c.q, amplitudeMv: -0.28, sigmaSec: 0.052 };
  c.r = { ...c.r, amplitudeMv: 1.25, sigmaSec: 0.080 };
  c.s = { ...c.s, amplitudeMv: -0.45, sigmaSec: 0.058 };
  c.t = {
    ...c.t,
    amplitudeMv: 0.95,
    centerFraction: 0.50,
    sigmaSec: 0.050,
  };
  return c;
}

export function hyperkalemiaProgressionGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  void settings.heartRate;
  const rr = 60 / 60; // 60 bpm baseline (severe hyperK is bradycardic)
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
      const stage = stageAtSec(beatStart);
      mv += evaluateAbsBeat(t, beatStart, stageBeat(stage));
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let s = firstSlot; s <= lastSlot; s++) {
    const beatStart = s * rr;
    const stage = stageAtSec(beatStart);
    const beat = stageBeat(stage);
    const rT = beatStart + beat.r.centerFraction;
    const tT = beatStart + beat.t.centerFraction;
    // P-wave events emitted only if P amplitude is above visibility threshold.
    if (beat.p.amplitudeMv > 0.05) {
      const pT = beatStart + beat.p.centerFraction;
      if (pT >= tStart && pT < tEnd) {
        events.push({ kind: 'p-wave', tSec: pT, meta: { hyperkalemiaStage: stage } });
      }
    }
    if (rT >= tStart && rT < tEnd) {
      const isWide = beat.r.sigmaSec > 0.020;
      events.push({
        kind: isWide ? 'qrs-wide' : 'qrs-narrow',
        tSec: rT,
        meta: {
          hyperkalemiaStage: stage,
          qrsSigmaSec: beat.r.sigmaSec,
          qrsApproxMs: isWide ? 190 : 90,
        },
      });
    }
    if (tT >= tStart && tT < tEnd) {
      events.push({
        kind: 't-wave',
        tSec: tT,
        meta: { hyperkalemiaStage: stage, peakedT: true },
      });
    }
  }

  return baseSignal(settings, tStart, tEnd, points, events);
}

// ════════════════════════════════════════════════════════════════════
//  Hyperkalemia — sine-wave (terminal pattern)
// ════════════════════════════════════════════════════════════════════

const SINE_WAVE_FREQ_HZ = 0.8; // ~48 bpm sinusoidal cycles
const SINE_WAVE_AMP_MV = 1.0;

export function hyperkalemiaSineWaveGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  void settings.heartRate;
  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);
  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    // Slow sinusoidal "QRS-T merged" cycle. No discrete waves.
    const mv = SINE_WAVE_AMP_MV * Math.sin(2 * Math.PI * SINE_WAVE_FREQ_HZ * t);
    points[i] = { t, mv };
  }

  // Emit one "qrs-wide" event per sinusoid peak — these are not normal QRS
  // events; the metadata flags the merged-QRS-T sine character explicitly.
  const events: ECGEvent[] = [];
  const periodSec = 1 / SINE_WAVE_FREQ_HZ;
  // Peaks of sin(2π·f·t) occur at t = 0.25/f, 1.25/f, 2.25/f, …
  const firstK = Math.floor(tStart / periodSec);
  const lastK = Math.ceil(tEnd / periodSec) + 1;
  for (let k = firstK; k <= lastK; k++) {
    const peakT = (k + 0.25) * periodSec;
    if (peakT >= tStart && peakT < tEnd) {
      events.push({
        kind: 'qrs-wide',
        tSec: peakT,
        meta: {
          hyperkalemiaStage: 4,
          mergedQrsT: true,
          sineWave: true,
          frequencyHz: SINE_WAVE_FREQ_HZ,
        },
      });
    }
  }

  return baseSignal(settings, tStart, tEnd, points, events);
}

// ── Helper ──────────────────────────────────────────────────────────

function baseSignal(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
  points: { t: number; mv: number }[],
  events: ECGEvent[],
): GeneratedECGSignal {
  return {
    rhythmId: settings.rhythmId,
    windowStartSec: tStart,
    windowEndSec: tEnd,
    sampleRateHz: settings.sampleRateHz,
    points,
    events,
  };
}
