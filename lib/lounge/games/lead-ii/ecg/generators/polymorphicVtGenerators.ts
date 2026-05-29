/**
 * Polymorphic VT family — torsades, generic polymorphic VT, bidirectional VT.
 *
 * All three are wide-complex tachycardias with NO P waves. They differ in
 * how the morphology changes beat to beat:
 *
 *   - vent.torsades:        amplitude+polarity twist around baseline driven
 *                            by a slow ~0.4 Hz envelope ("twisting around
 *                            the isoelectric line"). Rate fast.
 *   - vent.polymorphic-vt:  morphology rotates through several preset wide
 *                            shapes; no single twisting envelope. Rate fast.
 *   - vent.bidirectional-vt:STRICT polarity alternation beat-to-beat
 *                            (positive / negative / positive / …).
 *
 * Single-lead approximations — these morphologies are recognizable in lead
 * II without claiming a 12-lead axis interpretation (which is Phase 6+).
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
  sampleTimes,
  wideBeatComponents,
} from './gaussianBeat';

// ════════════════════════════════════════════════════════════════════
//  Torsades de Pointes
// ════════════════════════════════════════════════════════════════════

// 0.3 Hz envelope = one full twist every ~3.3 s. At 200 bpm that's roughly
// 10-12 beats per cycle, which gives the classic spindle/crescendo shape
// without looking choppy. The amplitude floor (0.15) makes the trough
// near-flat — that's the moment of polarity flip the eye reads as "twisting
// around the baseline."
const TORSADES_ENVELOPE_HZ = 0.3;
const TORSADES_AMP_FLOOR = 0.15;
const TORSADES_AMP_SWING = 0.95; // peak amplitude = floor + swing ≈ 1.10

export function torsadesGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('vent.torsades', settings.heartRate);
  const rr = 60 / hr;
  const firstSlot = Math.floor((tStart - 0.10) / rr);
  const lastSlot = Math.ceil((tEnd + 0.10) / rr);

  const envelopeAt = (beatStart: number) =>
    Math.sin(2 * Math.PI * TORSADES_ENVELOPE_HZ * beatStart);

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);

  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;
    for (let s = firstSlot; s <= lastSlot; s++) {
      const beatStart = s * rr;
      if (Math.abs(t - beatStart) > 0.5) continue;
      const env = envelopeAt(beatStart);
      const polarity: 1 | -1 = env >= 0 ? 1 : -1;
      const amp = TORSADES_AMP_FLOOR + TORSADES_AMP_SWING * Math.abs(env);
      const beat = wideBeatComponents({ centerSec: 0.10, polarity });
      mv += evaluateAbsBeat(t, beatStart, scaleBeat(beat, amp));
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let s = firstSlot; s <= lastSlot; s++) {
    const beatStart = s * rr;
    const env = envelopeAt(beatStart);
    const polarity = env >= 0 ? 1 : -1;
    const amp = TORSADES_AMP_FLOOR + TORSADES_AMP_SWING * Math.abs(env);
    const rT = beatStart + 0.10;
    if (rT >= tStart && rT < tEnd) {
      events.push({
        kind: 'qrs-wide',
        tSec: rT,
        meta: {
          hrBpm: hr,
          mechanism: 'torsades',
          twisting: true,
          polarity,
          ampScale: amp,
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

function scaleBeat(b: AbsBeatComponents, k: number): AbsBeatComponents {
  return {
    p: { ...b.p, amplitudeMv: b.p.amplitudeMv * k },
    q: { ...b.q, amplitudeMv: b.q.amplitudeMv * k },
    r: { ...b.r, amplitudeMv: b.r.amplitudeMv * k },
    s: { ...b.s, amplitudeMv: b.s.amplitudeMv * k },
    t: { ...b.t, amplitudeMv: b.t.amplitudeMv * k },
  };
}

// ════════════════════════════════════════════════════════════════════
//  Polymorphic VT (non-torsades)
// ════════════════════════════════════════════════════════════════════

/** A small library of distinct wide morphologies. */
const POLY_VARIANTS: AbsBeatComponents[] = [
  wideBeatComponents({ centerSec: 0.10, polarity: 1 }),
  wideBeatComponents({ centerSec: 0.08, polarity: -1 }),
  wideBeatComponents({ centerSec: 0.12, polarity: 1 }),
  wideBeatComponents({ centerSec: 0.09, polarity: -1 }),
];

export function polymorphicVtGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('vent.polymorphic-vt', settings.heartRate);
  const rr = 60 / hr;
  const firstSlot = Math.floor((tStart - 0.10) / rr);
  const lastSlot = Math.ceil((tEnd + 0.10) / rr);

  const variantFor = (slot: number) =>
    POLY_VARIANTS[((slot % POLY_VARIANTS.length) + POLY_VARIANTS.length) % POLY_VARIANTS.length] as AbsBeatComponents;

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);
  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;
    for (let s = firstSlot; s <= lastSlot; s++) {
      const beatStart = s * rr;
      if (Math.abs(t - beatStart) > 0.5) continue;
      mv += evaluateAbsBeat(t, beatStart, variantFor(s));
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let s = firstSlot; s <= lastSlot; s++) {
    const beatStart = s * rr;
    const variant = variantFor(s);
    const rT = beatStart + variant.r.centerFraction;
    if (rT >= tStart && rT < tEnd) {
      events.push({
        kind: 'qrs-wide',
        tSec: rT,
        meta: {
          hrBpm: hr,
          mechanism: 'polymorphic-vt',
          variantIndex: ((s % POLY_VARIANTS.length) + POLY_VARIANTS.length) % POLY_VARIANTS.length,
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

// ════════════════════════════════════════════════════════════════════
//  Bidirectional VT
// ════════════════════════════════════════════════════════════════════

const BIDI_BEAT_POS = wideBeatComponents({ centerSec: 0.10, polarity: 1 });
const BIDI_BEAT_NEG = wideBeatComponents({ centerSec: 0.10, polarity: -1 });

export function bidirectionalVtGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('vent.bidirectional-vt', settings.heartRate);
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
      const beat = s % 2 === 0 ? BIDI_BEAT_POS : BIDI_BEAT_NEG;
      mv += evaluateAbsBeat(t, beatStart, beat);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let s = firstSlot; s <= lastSlot; s++) {
    const beatStart = s * rr;
    const polarity: 1 | -1 = s % 2 === 0 ? 1 : -1;
    const rT = beatStart + 0.10;
    if (rT >= tStart && rT < tEnd) {
      events.push({
        kind: 'qrs-wide',
        tSec: rT,
        meta: {
          hrBpm: hr,
          mechanism: 'bidirectional-vt',
          polarity,
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
