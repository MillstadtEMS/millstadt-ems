/**
 * Sinus rhythm waveform generator.
 *
 * Covers Normal Sinus Rhythm, Sinus Bradycardia, and Sinus Tachycardia —
 * they differ only in heart rate. The catalog wires the three rhythm IDs
 * to this generator with a per-rhythm rate clamp.
 *
 * Wave timing is **absolute** for P and QRS (PR interval ~160 ms at every
 * HR) and weakly compressed for the T wave so it doesn't bleed across the
 * next beat at high HR. Earlier versions used fraction-of-RR offsets which
 * collapsed PR to ~56 ms at 150 bpm — that misrepresented sinus tach.
 */

import type { ECGEvent, ECGSettings, GeneratedECGSignal } from '../types';
import { requireMorphologyProfile } from '../litflMorphologyProfiles';
import { evaluateAbsBeat, narrowBeatComponents, sampleTimes } from './gaussianBeat';

export interface SinusBounds {
  minBpm: number;
  maxBpm: number;
}

function sinusBoundsFor(id: 'sinus.normal' | 'sinus.bradycardia' | 'sinus.tachycardia'): SinusBounds {
  const band = requireMorphologyProfile(id).generator?.sinusRateBpm;
  if (!band) throw new Error(`Missing sinus generator rate band for ${id}`);
  return { minBpm: band.min, maxBpm: band.max };
}

export const SINUS_NORMAL_BOUNDS: SinusBounds = sinusBoundsFor('sinus.normal');
export const SINUS_BRADY_BOUNDS: SinusBounds = sinusBoundsFor('sinus.bradycardia');
export const SINUS_TACHY_BOUNDS: SinusBounds = sinusBoundsFor('sinus.tachycardia');

function clamp(n: number, lo: number, hi: number): number {
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

// Physiologic PR interval for a normally-conducted sinus beat. Kept fixed at
// every HR — only the QT (driven by T-wave center) compresses with rate.
const SINUS_PR_SEC = 0.16;

/**
 * Build a sinus-family generator constrained to the given rate bounds.
 *
 * Deterministic: given the same `(rhythmId, heartRate, sample rate,
 * [tStart, tEnd))` it produces the same samples.
 */
export function makeSinusGenerator(
  bounds: SinusBounds,
): (settings: ECGSettings, tStart: number, tEnd: number) => GeneratedECGSignal {
  return (settings, tStart, tEnd) => {
    const hr = clamp(settings.heartRate, bounds.minBpm, bounds.maxBpm);
    const rr = 60 / hr;

    // T-wave compression: at HR 60 → RR 1.0 s, T center stays at 0.42 s.
    // At HR 150 → RR 0.4 s, T center compresses to ~0.27 s so it doesn't
    // overrun the next P. Compression follows roughly Bazett's QT scaling.
    const compression = Math.min(1, Math.sqrt(rr / 1.0));
    const beat = narrowBeatComponents(SINUS_PR_SEC);
    const tCenterAbs = (SINUS_PR_SEC + 0.260) * compression;
    beat.t = { ...beat.t, centerFraction: tCenterAbs };

    const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
    const points = new Array<{ t: number; mv: number }>(times.length);

    const firstBeatIdx = Math.floor((tStart - 0.10) / rr);
    const lastBeatIdx = Math.ceil((tEnd + 0.10) / rr);

    for (let i = 0; i < times.length; i++) {
      const t = times[i] as number;
      let mv = 0;
      for (let b = firstBeatIdx; b <= lastBeatIdx; b++) {
        const beatStart = b * rr;
        if (t - beatStart < -0.05 || t - beatStart > 0.7) continue;
        mv += evaluateAbsBeat(t, beatStart, beat);
      }
      points[i] = { t, mv };
    }

    const events: ECGEvent[] = [];
    for (let b = firstBeatIdx; b <= lastBeatIdx; b++) {
      const beatStart = b * rr;
      const pT = beatStart + beat.p.centerFraction;
      const rT = beatStart + beat.r.centerFraction;
      const tT = beatStart + beat.t.centerFraction;
      if (pT >= tStart && pT < tEnd) events.push({ kind: 'p-wave', tSec: pT });
      if (rT >= tStart && rT < tEnd) events.push({ kind: 'qrs-narrow', tSec: rT, meta: { hrBpm: hr } });
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
  };
}

export const sinusNormalGenerator: (
  s: ECGSettings,
  a: number,
  b: number,
) => GeneratedECGSignal = makeSinusGenerator(SINUS_NORMAL_BOUNDS);
export const sinusBradycardiaGenerator: (
  s: ECGSettings,
  a: number,
  b: number,
) => GeneratedECGSignal = makeSinusGenerator(SINUS_BRADY_BOUNDS);
export const sinusTachycardiaGenerator: (
  s: ECGSettings,
  a: number,
  b: number,
) => GeneratedECGSignal = makeSinusGenerator(SINUS_TACHY_BOUNDS);
