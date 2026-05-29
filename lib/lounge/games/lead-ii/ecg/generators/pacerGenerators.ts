/**
 * Pacemaker rhythms — paced AAI / VVI / DDD plus malfunctions.
 *
 *  Normal paced:
 *    - pacer.atrial:        spike → P → narrow QRS via intrinsic AV conduction
 *    - pacer.ventricular:   spike → wide QRS, no preceding P
 *    - pacer.av:            atrial spike → P → AV-delay → ventricular spike → wide QRS
 *
 *  Malfunctions:
 *    - pacer.failure-to-pace        expected spikes intermittently absent → pause
 *    - pacer.failure-to-capture     spike present but no resulting depolarization
 *    - pacer.failure-to-sense       pacer doesn't see intrinsic — fires inappropriately
 *    - pacer.oversensing            inhibits pacing inappropriately (looks like FTP, different cause)
 *    - pacer.undersensing           teaching variant of FTS — distinct catalog row + metadata
 *
 *  Inappropriate paced tachycardias:
 *    - pacer.pmt:           paced ventricular tachy at upper-rate-limit (~130 bpm)
 *    - pacer.runaway:       device malfunction firing pacing at very high rate (~200 bpm)
 *
 * Spikes are emitted exclusively as `paced-spike` events. They are NOT mixed
 * into the mV sample stream — the monitor-mode 0.5–40 Hz low-pass filter
 * would smear a one-sample needle into a QRS-shaped blob, which is exactly
 * the bug this design avoids. The Skia canvas draws spikes as a separate
 * overlay path keyed off these events.
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
  wideBeatComponents,
} from './gaussianBeat';

// Beat shapes
const A_PACED_BEAT = narrowBeatComponents(0.16); // spike → P → AV → narrow QRS
const V_PACED_BEAT = (() => {
  const c = wideBeatComponents({ centerSec: 0.08, polarity: 1 });
  // No P contribution
  c.p = { amplitudeMv: 0, centerFraction: 0, sigmaSec: 0.001 };
  return c;
})();

/** Sinus beat (intrinsic), used by FTS / undersensing demos. */
const INTRINSIC_SINUS_BEAT = narrowBeatComponents(0.16);

// ════════════════════════════════════════════════════════════════════
//  Atrial Paced (AAI)
// ════════════════════════════════════════════════════════════════════

export function atrialPacedGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('pacer.atrial', settings.heartRate);
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
      mv += evaluateAbsBeat(t, beatStart, A_PACED_BEAT);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let s = firstSlot; s <= lastSlot; s++) {
    const beatStart = s * rr;
    if (beatStart >= tStart && beatStart < tEnd) {
      events.push({ kind: 'paced-spike', tSec: beatStart, meta: { chamber: 'atrial' } });
    }
    const pT = beatStart + A_PACED_BEAT.p.centerFraction;
    const rT = beatStart + A_PACED_BEAT.r.centerFraction;
    const tT = beatStart + A_PACED_BEAT.t.centerFraction;
    if (pT >= tStart && pT < tEnd) events.push({ kind: 'p-wave', tSec: pT, meta: { paced: 'atrial' } });
    if (rT >= tStart && rT < tEnd) events.push({ kind: 'qrs-narrow', tSec: rT, meta: { hrBpm: hr, paced: 'atrial', conducted: true } });
    if (tT >= tStart && tT < tEnd) events.push({ kind: 't-wave', tSec: tT });
  }

  return baseSignal(settings, tStart, tEnd, points, events);
}

// ════════════════════════════════════════════════════════════════════
//  Ventricular Paced (VVI)
// ════════════════════════════════════════════════════════════════════

export function ventricularPacedGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('pacer.ventricular', settings.heartRate);
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
      mv += evaluateAbsBeat(t, beatStart, V_PACED_BEAT);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let s = firstSlot; s <= lastSlot; s++) {
    const beatStart = s * rr;
    if (beatStart >= tStart && beatStart < tEnd) {
      events.push({ kind: 'paced-spike', tSec: beatStart, meta: { chamber: 'ventricular' } });
    }
    const rT = beatStart + V_PACED_BEAT.r.centerFraction;
    if (rT >= tStart && rT < tEnd) {
      events.push({ kind: 'qrs-wide', tSec: rT, meta: { hrBpm: hr, paced: 'ventricular', captured: true } });
    }
  }

  return baseSignal(settings, tStart, tEnd, points, events);
}

// ════════════════════════════════════════════════════════════════════
//  AV Paced (DDD) — atrial spike + P + AV delay + ventricular spike + wide QRS
// ════════════════════════════════════════════════════════════════════

const AV_DELAY_SEC = 0.16;

const DDD_A_BEAT_PONLY: AbsBeatComponents = (() => {
  const c = narrowBeatComponents(0.16);
  c.q = { ...c.q, amplitudeMv: 0 };
  c.r = { ...c.r, amplitudeMv: 0 };
  c.s = { ...c.s, amplitudeMv: 0 };
  c.t = { ...c.t, amplitudeMv: 0 };
  return c;
})();
const DDD_V_BEAT = wideBeatComponents({ centerSec: 0.08, polarity: 1 });

export function avPacedGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('pacer.av', settings.heartRate);
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
      const aSpikeT = beatStart;
      const vSpikeT = beatStart + AV_DELAY_SEC;
      if (Math.abs(t - aSpikeT) <= 0.4) {
        mv += evaluateAbsBeat(t, aSpikeT, DDD_A_BEAT_PONLY);
      }
      if (Math.abs(t - vSpikeT) <= 0.4) {
        mv += evaluateAbsBeat(t, vSpikeT, DDD_V_BEAT);
      }
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let s = firstSlot; s <= lastSlot; s++) {
    const beatStart = s * rr;
    const aSpikeT = beatStart;
    const vSpikeT = beatStart + AV_DELAY_SEC;
    if (aSpikeT >= tStart && aSpikeT < tEnd) {
      events.push({ kind: 'paced-spike', tSec: aSpikeT, meta: { chamber: 'atrial' } });
    }
    const pT = aSpikeT + DDD_A_BEAT_PONLY.p.centerFraction;
    if (pT >= tStart && pT < tEnd) events.push({ kind: 'p-wave', tSec: pT, meta: { paced: 'atrial' } });
    if (vSpikeT >= tStart && vSpikeT < tEnd) {
      events.push({ kind: 'paced-spike', tSec: vSpikeT, meta: { chamber: 'ventricular' } });
    }
    const rT = vSpikeT + DDD_V_BEAT.r.centerFraction;
    if (rT >= tStart && rT < tEnd) {
      events.push({ kind: 'qrs-wide', tSec: rT, meta: { hrBpm: hr, paced: 'av-dual', captured: true } });
    }
  }

  return baseSignal(settings, tStart, tEnd, points, events);
}

// ════════════════════════════════════════════════════════════════════
//  Failure to Pace — every Nth slot, spike absent → pause
// ════════════════════════════════════════════════════════════════════

const FTP_SKIP_INTERVAL = 5;

export function failureToPaceGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('pacer.failure-to-pace', settings.heartRate);
  const rr = 60 / hr;
  const firstSlot = Math.floor((tStart - 0.10) / rr);
  const lastSlot = Math.ceil((tEnd + 0.10) / rr);
  const isMissing = (s: number) => s > 0 && s % FTP_SKIP_INTERVAL === 0;

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);
  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;
    for (let s = firstSlot; s <= lastSlot; s++) {
      const beatStart = s * rr;
      if (isMissing(s)) continue; // no spike, no beat at this slot
      if (Math.abs(t - beatStart) <= 0.7) {
        mv += evaluateAbsBeat(t, beatStart, V_PACED_BEAT);
      }
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let s = firstSlot; s <= lastSlot; s++) {
    const beatStart = s * rr;
    if (isMissing(s)) {
      if (beatStart >= tStart && beatStart < tEnd) {
        events.push({
          kind: 'dropped-qrs',
          tSec: beatStart,
          meta: {
            reason: 'failure-to-pace',
            expectedRrSec: rr,
            malfunction: 'failure-to-pace',
          },
        });
      }
      continue;
    }
    if (beatStart >= tStart && beatStart < tEnd) {
      events.push({ kind: 'paced-spike', tSec: beatStart, meta: { chamber: 'ventricular' } });
    }
    const rT = beatStart + V_PACED_BEAT.r.centerFraction;
    if (rT >= tStart && rT < tEnd) {
      events.push({ kind: 'qrs-wide', tSec: rT, meta: { paced: 'ventricular', captured: true } });
    }
  }

  return baseSignal(settings, tStart, tEnd, points, events);
}

// ════════════════════════════════════════════════════════════════════
//  Failure to Capture — spike fires but no QRS follows it
// ════════════════════════════════════════════════════════════════════

const FTC_NO_CAPTURE_INTERVAL = 4;

export function failureToCaptureGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('pacer.failure-to-capture', settings.heartRate);
  const rr = 60 / hr;
  const firstSlot = Math.floor((tStart - 0.10) / rr);
  const lastSlot = Math.ceil((tEnd + 0.10) / rr);
  const isNoCapture = (s: number) => s > 0 && s % FTC_NO_CAPTURE_INTERVAL === 0;

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);
  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;
    for (let s = firstSlot; s <= lastSlot; s++) {
      const beatStart = s * rr;
      // Spike is emitted as an event (rendered as an overlay); FTC means
      // the spike fires but the ventricle never depolarizes — so only the
      // QRS sample contribution is gated by isNoCapture.
      if (isNoCapture(s)) continue;
      if (Math.abs(t - beatStart) <= 0.7) {
        mv += evaluateAbsBeat(t, beatStart, V_PACED_BEAT);
      }
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let s = firstSlot; s <= lastSlot; s++) {
    const beatStart = s * rr;
    if (beatStart >= tStart && beatStart < tEnd) {
      events.push({ kind: 'paced-spike', tSec: beatStart, meta: { chamber: 'ventricular' } });
    }
    if (isNoCapture(s)) {
      const droppedT = beatStart + V_PACED_BEAT.r.centerFraction;
      if (droppedT >= tStart && droppedT < tEnd) {
        events.push({
          kind: 'dropped-qrs',
          tSec: droppedT,
          meta: { reason: 'failure-to-capture', malfunction: 'failure-to-capture' },
        });
      }
    } else {
      const rT = beatStart + V_PACED_BEAT.r.centerFraction;
      if (rT >= tStart && rT < tEnd) {
        events.push({ kind: 'qrs-wide', tSec: rT, meta: { paced: 'ventricular', captured: true } });
      }
    }
  }

  return baseSignal(settings, tStart, tEnd, points, events);
}

// ════════════════════════════════════════════════════════════════════
//  Failure to Sense — pacer fires inappropriately during intrinsic activity
// ════════════════════════════════════════════════════════════════════
//
// Implementation: an underlying intrinsic sinus rhythm at 70 bpm and a paced
// "schedule" running independently at 65 bpm. Because the pacer doesn't see
// the intrinsic beats, paced spikes occasionally land in/near intrinsic QRS.
//
// `pacer.undersensing` reuses the same generator with different metadata —
// distinct catalog rows are kept first-class for educational clarity (per
// Phase-3 hardening decisions).

function failureToSenseLikeGenerator(
  rhythmId: 'pacer.failure-to-sense' | 'pacer.undersensing',
  malfunctionLabel: 'failure-to-sense' | 'undersensing',
) {
  void rhythmId; // identity is captured by the catalog; metadata uses malfunctionLabel
  const intrinsicRrSec = 60 / 70;
  const pacedRrSec = 60 / 65;
  return function generate(
    settings: ECGSettings,
    tStart: number,
    tEnd: number,
  ): GeneratedECGSignal {
    void settings.heartRate;
    const firstISlot = Math.floor((tStart - 0.10) / intrinsicRrSec);
    const lastISlot = Math.ceil((tEnd + 0.10) / intrinsicRrSec);
    const firstPSlot = Math.floor((tStart - 0.10) / pacedRrSec);
    const lastPSlot = Math.ceil((tEnd + 0.10) / pacedRrSec);

    const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
    const points = new Array<{ t: number; mv: number }>(times.length);
    for (let i = 0; i < times.length; i++) {
      const t = times[i] as number;
      let mv = 0;
      for (let s = firstISlot; s <= lastISlot; s++) {
        const beatStart = s * intrinsicRrSec;
        if (Math.abs(t - beatStart) > 0.7) continue;
        mv += evaluateAbsBeat(t, beatStart, INTRINSIC_SINUS_BEAT);
      }
      for (let s = firstPSlot; s <= lastPSlot; s++) {
        const spikeT = s * pacedRrSec;
        if (Math.abs(t - spikeT) <= 0.7) {
          mv += evaluateAbsBeat(t, spikeT, V_PACED_BEAT);
        }
      }
      points[i] = { t, mv };
    }

    const events: ECGEvent[] = [];
    for (let s = firstISlot; s <= lastISlot; s++) {
      const beatStart = s * intrinsicRrSec;
      const pT = beatStart + INTRINSIC_SINUS_BEAT.p.centerFraction;
      const rT = beatStart + INTRINSIC_SINUS_BEAT.r.centerFraction;
      const tT = beatStart + INTRINSIC_SINUS_BEAT.t.centerFraction;
      if (pT >= tStart && pT < tEnd) events.push({ kind: 'p-wave', tSec: pT, meta: { intrinsic: true } });
      if (rT >= tStart && rT < tEnd) events.push({ kind: 'qrs-narrow', tSec: rT, meta: { intrinsic: true } });
      if (tT >= tStart && tT < tEnd) events.push({ kind: 't-wave', tSec: tT });
    }
    for (let s = firstPSlot; s <= lastPSlot; s++) {
      const spikeT = s * pacedRrSec;
      if (spikeT >= tStart && spikeT < tEnd) {
        events.push({
          kind: 'paced-spike',
          tSec: spikeT,
          meta: { chamber: 'ventricular', malfunction: malfunctionLabel, inappropriate: true },
        });
      }
      const rT = spikeT + V_PACED_BEAT.r.centerFraction;
      if (rT >= tStart && rT < tEnd) {
        events.push({
          kind: 'qrs-wide',
          tSec: rT,
          meta: { paced: 'ventricular', malfunction: malfunctionLabel },
        });
      }
    }

    return baseSignal(settings, tStart, tEnd, points, events);
  };
}

export const failureToSenseGenerator = failureToSenseLikeGenerator('pacer.failure-to-sense', 'failure-to-sense');
export const undersensingGenerator = failureToSenseLikeGenerator('pacer.undersensing', 'undersensing');

// ════════════════════════════════════════════════════════════════════
//  Oversensing — pacing inhibited at slots where noise was sensed
// ════════════════════════════════════════════════════════════════════

const OVERSENSE_INHIBIT_INTERVAL = 4;

export function oversensingGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('pacer.oversensing', settings.heartRate);
  const rr = 60 / hr;
  const firstSlot = Math.floor((tStart - 0.10) / rr);
  const lastSlot = Math.ceil((tEnd + 0.10) / rr);
  const isInhibited = (s: number) => s > 0 && s % OVERSENSE_INHIBIT_INTERVAL === 0;

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);
  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;
    for (let s = firstSlot; s <= lastSlot; s++) {
      const beatStart = s * rr;
      if (isInhibited(s)) continue;
      if (Math.abs(t - beatStart) <= 0.7) {
        mv += evaluateAbsBeat(t, beatStart, V_PACED_BEAT);
      }
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let s = firstSlot; s <= lastSlot; s++) {
    const beatStart = s * rr;
    if (isInhibited(s)) {
      if (beatStart >= tStart && beatStart < tEnd) {
        events.push({
          kind: 'dropped-qrs',
          tSec: beatStart,
          meta: { reason: 'oversensing', malfunction: 'oversensing', expectedRrSec: rr },
        });
      }
      continue;
    }
    if (beatStart >= tStart && beatStart < tEnd) {
      events.push({ kind: 'paced-spike', tSec: beatStart, meta: { chamber: 'ventricular' } });
    }
    const rT = beatStart + V_PACED_BEAT.r.centerFraction;
    if (rT >= tStart && rT < tEnd) {
      events.push({ kind: 'qrs-wide', tSec: rT, meta: { paced: 'ventricular', captured: true } });
    }
  }

  return baseSignal(settings, tStart, tEnd, points, events);
}

// ════════════════════════════════════════════════════════════════════
//  Pacemaker-Mediated Tachycardia — paced V tachy at upper-rate-limit
// ════════════════════════════════════════════════════════════════════

export function pmtGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('pacer.pmt', settings.heartRate);
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
      if (Math.abs(t - beatStart) <= 0.5) {
        mv += evaluateAbsBeat(t, beatStart, V_PACED_BEAT);
      }
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let s = firstSlot; s <= lastSlot; s++) {
    const beatStart = s * rr;
    if (beatStart >= tStart && beatStart < tEnd) {
      events.push({ kind: 'paced-spike', tSec: beatStart, meta: { chamber: 'ventricular', malfunction: 'pmt' } });
    }
    const rT = beatStart + V_PACED_BEAT.r.centerFraction;
    if (rT >= tStart && rT < tEnd) {
      events.push({
        kind: 'qrs-wide',
        tSec: rT,
        meta: { hrBpm: hr, paced: 'ventricular', mechanism: 'pmt', endlessLoop: true },
      });
    }
  }

  return baseSignal(settings, tStart, tEnd, points, events);
}

// ════════════════════════════════════════════════════════════════════
//  Runaway Pacemaker — device firing at dangerously high rate
// ════════════════════════════════════════════════════════════════════

export function runawayPacemakerGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const hr = resolveHrFor('pacer.runaway', settings.heartRate);
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
      if (Math.abs(t - beatStart) <= 0.4) {
        mv += evaluateAbsBeat(t, beatStart, V_PACED_BEAT);
      }
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let s = firstSlot; s <= lastSlot; s++) {
    const beatStart = s * rr;
    if (beatStart >= tStart && beatStart < tEnd) {
      events.push({
        kind: 'paced-spike',
        tSec: beatStart,
        meta: { chamber: 'ventricular', malfunction: 'runaway' },
      });
    }
    const rT = beatStart + V_PACED_BEAT.r.centerFraction;
    if (rT >= tStart && rT < tEnd) {
      events.push({
        kind: 'qrs-wide',
        tSec: rT,
        meta: { hrBpm: hr, paced: 'ventricular', mechanism: 'runaway' },
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
