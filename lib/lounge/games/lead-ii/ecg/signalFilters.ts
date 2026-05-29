/**
 * ECG signal filters — monitor mode, diagnostic mode, 60 Hz notch.
 *
 * Real cardiac monitors offer two filter bandwidths:
 *   - Monitor mode    : 0.5–40 Hz   (aggressive, kills artifact for continuous display)
 *   - Diagnostic mode : 0.05–150 Hz (preserves ST morphology for 12-lead)
 * Plus a switchable 60 Hz notch (50 Hz outside the US) to reject AC mains.
 *
 * We implement these as biquad cascades:
 *   - Each band-pass is a 2nd-order high-pass + 2nd-order low-pass
 *   - Notch is a single 2nd-order biquad
 * Single-pass forward filtering introduces a small phase shift; that's
 * acceptable for a live monitor and matches real-monitor behavior.
 *
 * Pure TypeScript. No React / RN / Skia imports. Pure math — tested in Node.
 */

import type { ECGPoint } from './types';

export type FilterMode = 'monitor' | 'diagnostic';
export type NotchMode = 'off' | '50hz' | '60hz';

interface BiquadCoefficients {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

interface BiquadState {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

function emptyState(): BiquadState {
  return { x1: 0, x2: 0, y1: 0, y2: 0 };
}

/**
 * 2nd-order Butterworth high-pass biquad. Cutoff in Hz, Fs the sample rate.
 * Reference: RBJ Audio EQ Cookbook.
 */
function highPassBiquad(cutoffHz: number, fsHz: number): BiquadCoefficients {
  const w0 = (2 * Math.PI * cutoffHz) / fsHz;
  const cosW = Math.cos(w0);
  const sinW = Math.sin(w0);
  const Q = Math.SQRT1_2; // 1 / sqrt(2) — Butterworth
  const alpha = sinW / (2 * Q);

  const b0 = (1 + cosW) / 2;
  const b1 = -(1 + cosW);
  const b2 = (1 + cosW) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosW;
  const a2 = 1 - alpha;

  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

/** 2nd-order Butterworth low-pass biquad. */
function lowPassBiquad(cutoffHz: number, fsHz: number): BiquadCoefficients {
  const w0 = (2 * Math.PI * cutoffHz) / fsHz;
  const cosW = Math.cos(w0);
  const sinW = Math.sin(w0);
  const Q = Math.SQRT1_2;
  const alpha = sinW / (2 * Q);

  const b0 = (1 - cosW) / 2;
  const b1 = 1 - cosW;
  const b2 = (1 - cosW) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosW;
  const a2 = 1 - alpha;

  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

/** 2nd-order notch biquad. Narrow Q so it rejects mains hum without flattening QRS. */
function notchBiquad(centerHz: number, fsHz: number): BiquadCoefficients {
  const w0 = (2 * Math.PI * centerHz) / fsHz;
  const cosW = Math.cos(w0);
  const sinW = Math.sin(w0);
  const Q = 8; // narrow notch — rejects mains without distorting QRS spectrum
  const alpha = sinW / (2 * Q);

  const b0 = 1;
  const b1 = -2 * cosW;
  const b2 = 1;
  const a0 = 1 + alpha;
  const a1 = -2 * cosW;
  const a2 = 1 - alpha;

  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

/**
 * Apply a biquad to a sample stream. Pure — does not mutate input.
 */
function applyBiquad(samples: readonly number[], coeffs: BiquadCoefficients): number[] {
  const state = emptyState();
  const out = new Array<number>(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i]!;
    const y =
      coeffs.b0 * x +
      coeffs.b1 * state.x1 +
      coeffs.b2 * state.x2 -
      coeffs.a1 * state.y1 -
      coeffs.a2 * state.y2;
    state.x2 = state.x1;
    state.x1 = x;
    state.y2 = state.y1;
    state.y1 = y;
    out[i] = y;
  }
  return out;
}

export interface FilterChainSpec {
  /** Bandwidth — monitor or diagnostic. */
  mode: FilterMode;
  /** Notch — off, 50 Hz, or 60 Hz. */
  notch: NotchMode;
}

/**
 * Filter a raw sample stream according to the current monitor settings.
 * For `mode: 'diagnostic'` with `notch: 'off'` this is essentially a no-op
 * (the wide passband barely attenuates anything that ECG generators emit).
 */
export function filterMvSamples(
  samples: readonly number[],
  spec: FilterChainSpec,
  sampleRateHz: number,
): number[] {
  if (samples.length === 0) return [];
  const cutoffs = spec.mode === 'monitor'
    ? { low: 0.5, high: 40 }
    : { low: 0.05, high: 150 };

  // 1) high-pass to kill baseline wander
  let out = applyBiquad(samples, highPassBiquad(cutoffs.low, sampleRateHz));
  // 2) low-pass to kill high-frequency noise
  out = applyBiquad(out, lowPassBiquad(Math.min(cutoffs.high, sampleRateHz / 2.1), sampleRateHz));
  // 3) optional mains notch
  if (spec.notch === '50hz') {
    out = applyBiquad(out, notchBiquad(50, sampleRateHz));
  } else if (spec.notch === '60hz') {
    out = applyBiquad(out, notchBiquad(60, sampleRateHz));
  }
  return out;
}

/** Filter an ECGPoint stream, preserving the time axis. */
export function filterEcgPoints(
  points: readonly ECGPoint[],
  spec: FilterChainSpec,
  sampleRateHz: number,
): ECGPoint[] {
  if (points.length === 0) return [];
  const mv = points.map((p) => p.mv);
  const filtered = filterMvSamples(mv, spec, sampleRateHz);
  const out = new Array<ECGPoint>(points.length);
  for (let i = 0; i < points.length; i++) {
    out[i] = { t: points[i]!.t, mv: filtered[i]! };
  }
  return out;
}

/**
 * Convenience: human-readable bandwidth label for the UI.
 * "0.5 – 40 Hz" / "0.05 – 150 Hz"
 */
export function bandwidthLabel(mode: FilterMode): string {
  return mode === 'monitor' ? '0.5 – 40 Hz' : '0.05 – 150 Hz';
}
