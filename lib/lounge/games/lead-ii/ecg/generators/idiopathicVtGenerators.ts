/**
 * Idiopathic ventricular tachycardias.
 *
 *  - vent.fascicular-vt   Belhassen / posterior-fascicle VT — VT with
 *                         relatively NARROWER QRS than typical VT (RBBB-like
 *                         + LAD), but still ventricular. We model it as a
 *                         "narrower wide" beat (sigma between narrow and
 *                         wide). No P waves.
 *  - vent.rvot-vt         RVOT VT — regular wide tachycardia from the RV
 *                         outflow tract (LBBB-like with inferior axis).
 *                         Same wide-beat morphology as monomorphic VT but
 *                         tagged in metadata so a quiz can teach the
 *                         distinction.
 *
 * Phase-5 scope: morphology hints + metadata only. Full 12-lead axis
 * interpretation is deferred to Phase 6.
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

/**
 * Fascicular VT beat — narrower QRS than typical VT (sigma 0.022 vs 0.040)
 * but still wider than a sinus QRS (~0.012). Polarity 1.
 */
function buildFascicularBeat(): AbsBeatComponents {
  const c = wideBeatComponents({ centerSec: 0.08, polarity: 1 });
  // Narrow the QRS spikes a bit.
  c.q = { ...c.q, sigmaSec: 0.014 };
  c.r = { ...c.r, sigmaSec: 0.022 };
  c.s = { ...c.s, sigmaSec: 0.014 };
  return c;
}

const FASCICULAR_BEAT = buildFascicularBeat();

export function fascicularVtGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('vent.fascicular-vt', settings.heartRate);
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
      mv += evaluateAbsBeat(t, beatStart, FASCICULAR_BEAT);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let s = firstSlot; s <= lastSlot; s++) {
    const beatStart = s * rr;
    const rT = beatStart + FASCICULAR_BEAT.r.centerFraction;
    if (rT >= tStart && rT < tEnd) {
      events.push({
        kind: 'qrs-wide',
        tSec: rT,
        meta: {
          hrBpm: hr,
          mechanism: 'fascicular-vt',
          /** "Narrower-wide" relative to typical monomorphic VT. */
          qrsSigmaSec: FASCICULAR_BEAT.r.sigmaSec,
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

// ── RVOT VT ──────────────────────────────────────────────────────────

const RVOT_BEAT = wideBeatComponents({ centerSec: 0.10, polarity: 1 });

export function rvotVtGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('vent.rvot-vt', settings.heartRate);
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
      mv += evaluateAbsBeat(t, beatStart, RVOT_BEAT);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let s = firstSlot; s <= lastSlot; s++) {
    const beatStart = s * rr;
    const rT = beatStart + RVOT_BEAT.r.centerFraction;
    if (rT >= tStart && rT < tEnd) {
      events.push({
        kind: 'qrs-wide',
        tSec: rT,
        meta: {
          hrBpm: hr,
          mechanism: 'rvot-vt',
          morphologyHint: 'lbbb-inferior-axis',
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
