/**
 * Atrioventricular block generators.
 *
 *  - First-degree AV block: prolonged but constant PR, no dropped beats.
 *  - Mobitz I (Wenckebach): progressive PR prolongation → dropped QRS, repeat.
 *  - Mobitz II: constant PR + intermittent dropped QRS, no PR creep.
 *  - 2:1 AV block: every other P conducts; cannot classify Mobitz I/II from a 2:1 strip alone.
 *  - High-Grade AV block: multiple consecutive non-conducted P waves with only occasional capture.
 *  - Third-degree (CHB): atrial pacemaker and ventricular escape march at independent rates.
 *  - AV dissociation: atrial and ventricular activity at similar rates running independently
 *    (NOT necessarily complete block — distinguishable from CHB by the rate gap).
 *
 * All return event metadata that makes the dropped-QRS / dissociation
 * structure assertable in tests without peak detection.
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

// ════════════════════════════════════════════════════════════════════
//  First-degree AV block
// ════════════════════════════════════════════════════════════════════

// First-degree AV block: PR > 0.20 s. Used to be 0.24 (borderline). Bumped
// to 0.30 s so the prolonged PR is unmistakable on a teaching strip — well
// within physiologic range (clinical PRs up to ~0.5 s are seen) and reads
// cleanly at standard 25 mm/s paper speed (7.5 small boxes).
const FIRST_DEGREE_PR_SEC = 0.30;
const FIRST_DEGREE_BEAT = narrowBeatComponents(FIRST_DEGREE_PR_SEC);

export function firstDegreeAvBlockGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('av-block.first-degree', settings.heartRate);
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
      if (Math.abs(t - beatStart) > 0.7) continue;
      mv += evaluateAbsBeat(t, beatStart, FIRST_DEGREE_BEAT);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let b = firstBeatIdx; b <= lastBeatIdx; b++) {
    const beatStart = b * rr;
    const pT = beatStart + FIRST_DEGREE_BEAT.p.centerFraction;
    const rT = beatStart + FIRST_DEGREE_BEAT.r.centerFraction;
    const tT = beatStart + FIRST_DEGREE_BEAT.t.centerFraction;
    if (pT >= tStart && pT < tEnd) events.push({ kind: 'p-wave', tSec: pT });
    if (rT >= tStart && rT < tEnd) {
      events.push({
        kind: 'qrs-narrow',
        tSec: rT,
        meta: { prSec: FIRST_DEGREE_PR_SEC },
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
}

// ════════════════════════════════════════════════════════════════════
//  Second-degree AV block — Mobitz I (Wenckebach)
// ════════════════════════════════════════════════════════════════════

// Slowed from 75 → 60 so the R-R intervals on conducted beats are clearly
// wider on the grid (P-P ≈ 1.0 s = 5 big boxes). The progressive PR
// lengthening reads more clearly when there's room between QRSes.
const MOBITZ_I_ATRIAL_BPM = 60;
/** PR cycle: 3 beats conduct (with progressive PR) then 4th P drops. Repeat. */
const MOBITZ_I_PR_PROGRESSION_SEC = [0.16, 0.22, 0.30, /* dropped */ null] as const;

export function mobitzIGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  void settings.heartRate;
  const pp = 60 / MOBITZ_I_ATRIAL_BPM;
  const firstPIdx = Math.floor((tStart - 0.10) / pp);
  const lastPIdx = Math.ceil((tEnd + 0.10) / pp);

  const cycleLen = MOBITZ_I_PR_PROGRESSION_SEC.length;

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);

  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;

    for (let p = firstPIdx; p <= lastPIdx; p++) {
      const pStart = p * pp;
      if (Math.abs(t - pStart) > 0.7) continue;
      const stage = ((p % cycleLen) + cycleLen) % cycleLen;
      const prSec = MOBITZ_I_PR_PROGRESSION_SEC[stage];
      const beat = narrowBeatComponents(prSec ?? 0.20);
      if (prSec === null) {
        // Dropped: only the P-wave fires; suppress QRS+T.
        mv += evaluateAbsBeat(t, pStart, {
          ...beat,
          q: { ...beat.q, amplitudeMv: 0 },
          r: { ...beat.r, amplitudeMv: 0 },
          s: { ...beat.s, amplitudeMv: 0 },
          t: { ...beat.t, amplitudeMv: 0 },
        });
      } else {
        mv += evaluateAbsBeat(t, pStart, beat);
      }
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let p = firstPIdx; p <= lastPIdx; p++) {
    const pStart = p * pp;
    const stage = ((p % cycleLen) + cycleLen) % cycleLen;
    const prSec = MOBITZ_I_PR_PROGRESSION_SEC[stage];
    const beat = narrowBeatComponents(prSec ?? 0.20);
    const pT = pStart + beat.p.centerFraction;
    if (pT >= tStart && pT < tEnd) events.push({ kind: 'p-wave', tSec: pT });
    if (prSec === null) {
      // P fired but no QRS conducted — emit a dropped-qrs marker at the
      // expected QRS slot.
      const droppedT = pStart + 0.20;
      if (droppedT >= tStart && droppedT < tEnd) {
        events.push({ kind: 'dropped-qrs', tSec: droppedT, meta: { reason: 'wenckebach' } });
      }
    } else {
      const rT = pStart + beat.r.centerFraction;
      const tT = pStart + beat.t.centerFraction;
      if (rT >= tStart && rT < tEnd) {
        events.push({ kind: 'qrs-narrow', tSec: rT, meta: { prSec: prSec as number, stage } });
      }
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

// ════════════════════════════════════════════════════════════════════
//  Second-degree AV block — Mobitz II
// ════════════════════════════════════════════════════════════════════

// Slowed from 70 → 55 so the R-R on conducted beats is ~1.1 s and the
// dropped-beat pause stands out clearly against the wider baseline.
const MOBITZ_II_ATRIAL_BPM = 55;
const MOBITZ_II_PR_SEC = 0.18;
/** 3:2 — every 3rd P doesn't conduct. */
const MOBITZ_II_CYCLE_LENGTH = 3;
/**
 * Mobitz II QRS is wide because the block sits infranodal (His-Purkinje),
 * which is almost always co-located with a bundle-branch block. A narrow
 * QRS suggests the block is nodal and points back to Mobitz I, so the wide
 * QRS is a real diagnostic clue students need to see.
 */
const MOBITZ_II_BEAT = (() => {
  const c = narrowBeatComponents(MOBITZ_II_PR_SEC);
  c.q = { ...c.q, sigmaSec: 0.022 };
  c.r = { ...c.r, sigmaSec: 0.028 };
  c.s = { ...c.s, sigmaSec: 0.024, centerFraction: c.s.centerFraction + 0.020 };
  return c;
})();

function isMobitzIIDroppedAt(pIdx: number): boolean {
  return ((pIdx % MOBITZ_II_CYCLE_LENGTH) + MOBITZ_II_CYCLE_LENGTH) % MOBITZ_II_CYCLE_LENGTH === MOBITZ_II_CYCLE_LENGTH - 1;
}

export function mobitzIIGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  void settings.heartRate;
  const pp = 60 / MOBITZ_II_ATRIAL_BPM;
  const firstPIdx = Math.floor((tStart - 0.10) / pp);
  const lastPIdx = Math.ceil((tEnd + 0.10) / pp);

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);

  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;
    for (let p = firstPIdx; p <= lastPIdx; p++) {
      const pStart = p * pp;
      if (Math.abs(t - pStart) > 0.7) continue;
      if (isMobitzIIDroppedAt(p)) {
        // Only the P-wave fires.
        mv += evaluateAbsBeat(t, pStart, {
          ...MOBITZ_II_BEAT,
          q: { ...MOBITZ_II_BEAT.q, amplitudeMv: 0 },
          r: { ...MOBITZ_II_BEAT.r, amplitudeMv: 0 },
          s: { ...MOBITZ_II_BEAT.s, amplitudeMv: 0 },
          t: { ...MOBITZ_II_BEAT.t, amplitudeMv: 0 },
        });
      } else {
        mv += evaluateAbsBeat(t, pStart, MOBITZ_II_BEAT);
      }
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let p = firstPIdx; p <= lastPIdx; p++) {
    const pStart = p * pp;
    const pT = pStart + MOBITZ_II_BEAT.p.centerFraction;
    if (pT >= tStart && pT < tEnd) events.push({ kind: 'p-wave', tSec: pT });
    if (isMobitzIIDroppedAt(p)) {
      const droppedT = pStart + 0.20;
      if (droppedT >= tStart && droppedT < tEnd) {
        events.push({ kind: 'dropped-qrs', tSec: droppedT, meta: { reason: 'mobitz-ii' } });
      }
    } else {
      const rT = pStart + MOBITZ_II_BEAT.r.centerFraction;
      const tT = pStart + MOBITZ_II_BEAT.t.centerFraction;
      if (rT >= tStart && rT < tEnd) {
        events.push({ kind: 'qrs-wide', tSec: rT, meta: { prSec: MOBITZ_II_PR_SEC, mechanism: 'mobitz-ii-infranodal' } });
      }
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

// ════════════════════════════════════════════════════════════════════
//  2:1 AV Block
// ════════════════════════════════════════════════════════════════════

// Slowed from 80 → 60 so ventricular response (every other P) is ~30 bpm
// with a 2-second R-R — the "every other beat dropped" pattern is then
// unmistakable on the grid (R-R = 10 big boxes between conducted beats).
const TWO_TO_ONE_ATRIAL_BPM = 60;
const TWO_TO_ONE_PR_SEC = 0.18;
const TWO_TO_ONE_BEAT = narrowBeatComponents(TWO_TO_ONE_PR_SEC);

/**
 * 2:1 AV Block — every other P wave conducts.
 *
 * Pattern: P–QRS, P–no-QRS, P–QRS, P–no-QRS, …
 * PR is constant on conducted beats. Whether this is Mobitz-I-like (nodal)
 * or Mobitz-II-like (infranodal) is intentionally ambiguous — strips with
 * 2:1 conduction can't be classified definitively without longer rhythm
 * analysis. The catalog learning notes already say so; this generator just
 * produces the recognizable alternating pattern.
 */
export function twoToOneAvBlockGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  void settings.heartRate;
  const pp = 60 / TWO_TO_ONE_ATRIAL_BPM;
  const firstPIdx = Math.floor((tStart - 0.10) / pp);
  const lastPIdx = Math.ceil((tEnd + 0.10) / pp);

  const isConducted = (pIdx: number) => pIdx % 2 === 0;

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);

  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;
    for (let p = firstPIdx; p <= lastPIdx; p++) {
      const pStart = p * pp;
      if (Math.abs(t - pStart) > 0.7) continue;
      if (isConducted(p)) {
        mv += evaluateAbsBeat(t, pStart, TWO_TO_ONE_BEAT);
      } else {
        // Only P fires; suppress QRS+T.
        mv += evaluateAbsBeat(t, pStart, {
          ...TWO_TO_ONE_BEAT,
          q: { ...TWO_TO_ONE_BEAT.q, amplitudeMv: 0 },
          r: { ...TWO_TO_ONE_BEAT.r, amplitudeMv: 0 },
          s: { ...TWO_TO_ONE_BEAT.s, amplitudeMv: 0 },
          t: { ...TWO_TO_ONE_BEAT.t, amplitudeMv: 0 },
        });
      }
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let p = firstPIdx; p <= lastPIdx; p++) {
    const pStart = p * pp;
    const pT = pStart + TWO_TO_ONE_BEAT.p.centerFraction;
    if (pT >= tStart && pT < tEnd) {
      events.push({
        kind: 'p-wave',
        tSec: pT,
        meta: { atrialRateBpm: TWO_TO_ONE_ATRIAL_BPM },
      });
    }
    if (isConducted(p)) {
      const rT = pStart + TWO_TO_ONE_BEAT.r.centerFraction;
      const tT = pStart + TWO_TO_ONE_BEAT.t.centerFraction;
      if (rT >= tStart && rT < tEnd) {
        events.push({
          kind: 'qrs-narrow',
          tSec: rT,
          meta: { prSec: TWO_TO_ONE_PR_SEC, conduction: '2-to-1' },
        });
      }
      if (tT >= tStart && tT < tEnd) events.push({ kind: 't-wave', tSec: tT });
    } else {
      const droppedT = pStart + 0.20;
      if (droppedT >= tStart && droppedT < tEnd) {
        events.push({
          kind: 'dropped-qrs',
          tSec: droppedT,
          meta: { reason: '2-to-1' },
        });
      }
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

// ════════════════════════════════════════════════════════════════════
//  Third-degree AV block (Complete Heart Block)
// ════════════════════════════════════════════════════════════════════

// 85 / 30 — atrial sinus pacemaker firing at its normal rate, ventricular
// escape pacemaker firing slowly. Ratio chosen (≈2.83) so the P-QRS overlap
// pattern doesn't reproduce cyclically over a short strip. The atrial Ps
// are offset by ~0.27 s so they don't always land at the very start of the
// trace — that earlier alignment let students perceive a fake "PR" sequence.
const CHB_ATRIAL_BPM = 85;
const CHB_VENTRICULAR_BPM = 30;
const CHB_P_PHASE_OFFSET_SEC = 0.27;

/** Atrial activity uses a P-only template (no QRS contribution from atria). */
function buildPOnlyBeat() {
  const c = narrowBeatComponents(0.16);
  c.p = { ...c.p, amplitudeMv: 0.22 };
  c.q = { ...c.q, amplitudeMv: 0 };
  c.r = { ...c.r, amplitudeMv: 0 };
  c.s = { ...c.s, amplitudeMv: 0 };
  c.t = { ...c.t, amplitudeMv: 0 };
  return c;
}

const CHB_P_BEAT = buildPOnlyBeat();
// Wide ventricular escape — broader than the default to make it visually
// unambiguous as a ventricular (not junctional) escape.
const CHB_VENT_BEAT = wideBeatComponents({ centerSec: 0.12, polarity: 1 });

export function thirdDegreeAvBlockGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  void settings.heartRate;
  const pp = 60 / CHB_ATRIAL_BPM;
  const vv = 60 / CHB_VENTRICULAR_BPM;
  const pOffset = CHB_P_PHASE_OFFSET_SEC;

  const firstPIdx = Math.floor((tStart - pOffset - 0.10) / pp);
  const lastPIdx = Math.ceil((tEnd - pOffset + 0.10) / pp);
  const firstVIdx = Math.floor((tStart - 0.10) / vv);
  const lastVIdx = Math.ceil((tEnd + 0.10) / vv);

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);

  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;
    // Atrial P waves — fired by an independent regular SA node.
    for (let p = firstPIdx; p <= lastPIdx; p++) {
      const pStart = p * pp + pOffset;
      if (Math.abs(t - pStart) > 0.4) continue;
      mv += evaluateAbsBeat(t, pStart, CHB_P_BEAT);
    }
    // Ventricular escape — wide QRS, independent slow rhythm. By design the
    // P waves can fall during, on, before, or after each QRS; that visible
    // dissociation is the diagnostic point of the rhythm.
    for (let v = firstVIdx; v <= lastVIdx; v++) {
      const vStart = v * vv;
      if (Math.abs(t - vStart) > 0.6) continue;
      mv += evaluateAbsBeat(t, vStart, CHB_VENT_BEAT);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let p = firstPIdx; p <= lastPIdx; p++) {
    const pStart = p * pp + pOffset;
    const pT = pStart + CHB_P_BEAT.p.centerFraction;
    if (pT >= tStart && pT < tEnd) {
      events.push({
        kind: 'p-wave',
        tSec: pT,
        meta: { atrialRateBpm: CHB_ATRIAL_BPM },
      });
    }
  }
  for (let v = firstVIdx; v <= lastVIdx; v++) {
    const vStart = v * vv;
    const rT = vStart + CHB_VENT_BEAT.r.centerFraction;
    if (rT >= tStart && rT < tEnd) {
      events.push({
        kind: 'qrs-wide',
        tSec: rT,
        meta: { ventricularRateBpm: CHB_VENTRICULAR_BPM, dissociated: true },
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
}

// ════════════════════════════════════════════════════════════════════
//  High-Grade AV Block (more drops than Mobitz II, but some conduction)
// ════════════════════════════════════════════════════════════════════

const HIGH_GRADE_ATRIAL_BPM = 80;
const HIGH_GRADE_PR_SEC = 0.18;
const HIGH_GRADE_BEAT = narrowBeatComponents(HIGH_GRADE_PR_SEC);
/** 4:1 ratio — only every 4th P conducts. */
const HIGH_GRADE_CYCLE = 4;

export function highGradeAvBlockGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  void settings.heartRate;
  const pp = 60 / HIGH_GRADE_ATRIAL_BPM;
  const firstPIdx = Math.floor((tStart - 0.10) / pp);
  const lastPIdx = Math.ceil((tEnd + 0.10) / pp);

  const isConducted = (p: number) =>
    ((p % HIGH_GRADE_CYCLE) + HIGH_GRADE_CYCLE) % HIGH_GRADE_CYCLE === 0;

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);
  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;
    for (let p = firstPIdx; p <= lastPIdx; p++) {
      const pStart = p * pp;
      if (Math.abs(t - pStart) > 0.7) continue;
      if (isConducted(p)) {
        mv += evaluateAbsBeat(t, pStart, HIGH_GRADE_BEAT);
      } else {
        mv += evaluateAbsBeat(t, pStart, {
          ...HIGH_GRADE_BEAT,
          q: { ...HIGH_GRADE_BEAT.q, amplitudeMv: 0 },
          r: { ...HIGH_GRADE_BEAT.r, amplitudeMv: 0 },
          s: { ...HIGH_GRADE_BEAT.s, amplitudeMv: 0 },
          t: { ...HIGH_GRADE_BEAT.t, amplitudeMv: 0 },
        });
      }
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let p = firstPIdx; p <= lastPIdx; p++) {
    const pStart = p * pp;
    const pT = pStart + HIGH_GRADE_BEAT.p.centerFraction;
    if (pT >= tStart && pT < tEnd) {
      events.push({
        kind: 'p-wave',
        tSec: pT,
        meta: { atrialRateBpm: HIGH_GRADE_ATRIAL_BPM },
      });
    }
    if (isConducted(p)) {
      const rT = pStart + HIGH_GRADE_BEAT.r.centerFraction;
      const tT = pStart + HIGH_GRADE_BEAT.t.centerFraction;
      if (rT >= tStart && rT < tEnd) {
        events.push({
          kind: 'qrs-narrow',
          tSec: rT,
          meta: { prSec: HIGH_GRADE_PR_SEC, conduction: 'high-grade', cycle: HIGH_GRADE_CYCLE },
        });
      }
      if (tT >= tStart && tT < tEnd) events.push({ kind: 't-wave', tSec: tT });
    } else {
      const droppedT = pStart + 0.20;
      if (droppedT >= tStart && droppedT < tEnd) {
        events.push({ kind: 'dropped-qrs', tSec: droppedT, meta: { reason: 'high-grade' } });
      }
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

// ════════════════════════════════════════════════════════════════════
//  AV Dissociation (similar atrial + ventricular rates, no relationship)
// ════════════════════════════════════════════════════════════════════
//
// IMPORTANT: NOT synonymous with complete heart block. Distinguished from
// `av-block.third-degree` by close (not disparate) atrial + ventricular rates.

const DISSOC_ATRIAL_BPM = 70;
const DISSOC_VENTRICULAR_BPM = 75;

function buildPOnlyBeatDissoc() {
  const c = narrowBeatComponents(0.16);
  c.q = { ...c.q, amplitudeMv: 0 };
  c.r = { ...c.r, amplitudeMv: 0 };
  c.s = { ...c.s, amplitudeMv: 0 };
  c.t = { ...c.t, amplitudeMv: 0 };
  return c;
}
const DISSOC_P_BEAT = buildPOnlyBeatDissoc();

function buildVentBeatDissoc() {
  const c = narrowBeatComponents(0.10);
  c.p = { amplitudeMv: 0, centerFraction: 0, sigmaSec: 0.001 };
  return c;
}
const DISSOC_V_BEAT = buildVentBeatDissoc();

export function avDissociationGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  void settings.heartRate;
  const pp = 60 / DISSOC_ATRIAL_BPM;
  const vv = 60 / DISSOC_VENTRICULAR_BPM;
  const firstPIdx = Math.floor((tStart - 0.10) / pp);
  const lastPIdx = Math.ceil((tEnd + 0.10) / pp);
  const firstVIdx = Math.floor((tStart - 0.10) / vv);
  const lastVIdx = Math.ceil((tEnd + 0.10) / vv);

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);
  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;
    for (let p = firstPIdx; p <= lastPIdx; p++) {
      const pStart = p * pp;
      if (Math.abs(t - pStart) > 0.4) continue;
      mv += evaluateAbsBeat(t, pStart, DISSOC_P_BEAT);
    }
    for (let v = firstVIdx; v <= lastVIdx; v++) {
      const vStart = v * vv;
      if (Math.abs(t - vStart) > 0.4) continue;
      mv += evaluateAbsBeat(t, vStart, DISSOC_V_BEAT);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let p = firstPIdx; p <= lastPIdx; p++) {
    const pStart = p * pp;
    const pT = pStart + DISSOC_P_BEAT.p.centerFraction;
    if (pT >= tStart && pT < tEnd) {
      events.push({
        kind: 'p-wave',
        tSec: pT,
        meta: { atrialRateBpm: DISSOC_ATRIAL_BPM, dissociated: true },
      });
    }
  }
  for (let v = firstVIdx; v <= lastVIdx; v++) {
    const vStart = v * vv;
    const rT = vStart + DISSOC_V_BEAT.r.centerFraction;
    if (rT >= tStart && rT < tEnd) {
      events.push({
        kind: 'qrs-narrow',
        tSec: rT,
        meta: {
          ventricularRateBpm: DISSOC_VENTRICULAR_BPM,
          mechanism: 'av-dissociation',
          dissociationKind: 'isorhythmic',
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
}
