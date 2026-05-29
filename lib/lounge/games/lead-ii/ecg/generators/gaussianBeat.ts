/**
 * Shared building block for sinus / atrial / junctional rhythm generators:
 * a P-QRS-T beat synthesized as a sum of Gaussian pulses.
 *
 * Each wave (P, Q, R, S, T) is described by:
 *  - amplitude (mV, signed)
 *  - center as a fraction of the R–R interval
 *  - sigma in seconds (controls width)
 *
 * The shape is intentionally simple — this is a teaching tool, not a forward
 * dipole-model simulator. The output is recognizable as PQRST in shape and
 * timing without claiming to be physiologically exact.
 *
 * Pure TypeScript. No RN / Skia imports.
 */

export interface BeatComponent {
  amplitudeMv: number;
  /** Center of the wave, expressed as a fraction of the R–R interval. */
  centerFraction: number;
  /** Half-width parameter in seconds. */
  sigmaSec: number;
}

/**
 * Default PQRST timing/amplitude. Calibrated against published lead-II values
 * for an adult at ~60–90 bpm. R is the dominant peak; Q and S are small
 * downward deflections flanking R; P is a small rounded bump preceding QRS;
 * T is broader, lower-amplitude, after the QRS.
 */
export const DEFAULT_PQRST: { p: BeatComponent; q: BeatComponent; r: BeatComponent; s: BeatComponent; t: BeatComponent } = {
  p: { amplitudeMv: 0.15, centerFraction: 0.16, sigmaSec: 0.025 },
  q: { amplitudeMv: -0.10, centerFraction: 0.27, sigmaSec: 0.010 },
  r: { amplitudeMv: 1.20, centerFraction: 0.30, sigmaSec: 0.012 },
  s: { amplitudeMv: -0.25, centerFraction: 0.33, sigmaSec: 0.012 },
  t: { amplitudeMv: 0.35, centerFraction: 0.55, sigmaSec: 0.060 },
};

/** Gaussian: amplitude * exp( -((t - mu)^2) / (2 * sigma^2) ). */
export function gaussian(t: number, mu: number, sigma: number, amplitude: number): number {
  const d = t - mu;
  return amplitude * Math.exp(-(d * d) / (2 * sigma * sigma));
}

/**
 * Evaluate the PQRST template at sample time `t` for a beat that starts at
 * `beatStart` with R–R interval `rr`. Returns mV.
 */
export function evaluateBeat(
  t: number,
  beatStart: number,
  rr: number,
  template = DEFAULT_PQRST,
): number {
  const local = t - beatStart;
  // Only contribute within a sensible window around the beat — beyond ~rr,
  // a Gaussian's tail is negligible and cumulative tails add baseline drift.
  if (local < -0.10 || local > rr + 0.10) return 0;

  let mv = 0;
  for (const wave of [template.p, template.q, template.r, template.s, template.t]) {
    mv += gaussian(local, wave.centerFraction * rr, wave.sigmaSec, wave.amplitudeMv);
  }
  return mv;
}

/**
 * Sample times within [tStart, tEnd) at the requested sample rate.
 * Returns the array of timestamps; callers map each to an mV value.
 */
export function sampleTimes(tStart: number, tEnd: number, sampleRateHz: number): number[] {
  if (tEnd <= tStart) return [];
  const dt = 1 / sampleRateHz;
  // Snap tStart up to the next sample grid line so sequential windows align.
  const firstIndex = Math.ceil(tStart * sampleRateHz);
  const lastIndex = Math.floor((tEnd - 1e-9) * sampleRateHz);
  if (lastIndex < firstIndex) return [];
  const out = new Array<number>(lastIndex - firstIndex + 1);
  for (let i = 0; i <= lastIndex - firstIndex; i++) {
    out[i] = (firstIndex + i) * dt;
  }
  return out;
}

/**
 * Absolute-time beat components — used by AV-block, PEA, and other generators
 * that need a fixed PR interval independent of heart rate.
 *
 * Offsets are SECONDS from the P-wave onset. Tweaking `prSec` shifts QRS+T
 * later without changing wave morphology — exactly what 1° AV block needs.
 */
export interface AbsBeatComponents {
  p: BeatComponent;
  q: BeatComponent;
  r: BeatComponent;
  s: BeatComponent;
  t: BeatComponent;
}

/** A standard narrow beat with a configurable PR interval (default 0.16 s). */
export function narrowBeatComponents(prSec = 0.16): AbsBeatComponents {
  return {
    p: { amplitudeMv: 0.15, centerFraction: 0.025, sigmaSec: 0.025 },
    q: { amplitudeMv: -0.10, centerFraction: prSec, sigmaSec: 0.010 },
    r: { amplitudeMv: 1.20, centerFraction: prSec + 0.030, sigmaSec: 0.012 },
    s: { amplitudeMv: -0.25, centerFraction: prSec + 0.060, sigmaSec: 0.012 },
    t: { amplitudeMv: 0.35, centerFraction: prSec + 0.260, sigmaSec: 0.060 },
  };
}

/**
 * A wide ventricular beat (PVC, VT, ventricular escape). No P-wave; QRS is
 * broad and bizarre with an opposite-direction T wave. Polarity flag flips
 * the dominant direction so consecutive beats can alternate (bidirectional /
 * polymorphic future use).
 */
export function wideBeatComponents(opts: {
  centerSec?: number;
  polarity?: 1 | -1;
} = {}): AbsBeatComponents {
  const c = opts.centerSec ?? 0.08;
  const p = opts.polarity ?? 1;
  return {
    // No real P; we still emit a tiny baseline-level "P slot" with zero amp
    // so the type stays consistent and `evaluateAbsBeat` can iterate uniformly.
    p: { amplitudeMv: 0, centerFraction: 0, sigmaSec: 0.001 },
    q: { amplitudeMv: -0.20 * p, centerFraction: c - 0.030, sigmaSec: 0.020 },
    r: { amplitudeMv: 1.40 * p, centerFraction: c, sigmaSec: 0.040 },
    s: { amplitudeMv: -0.50 * p, centerFraction: c + 0.040, sigmaSec: 0.025 },
    t: { amplitudeMv: -0.50 * p, centerFraction: c + 0.220, sigmaSec: 0.080 },
  };
}

/**
 * Evaluate a beat at absolute time `t`, given the beat starts at `beatStart`.
 * Component `centerFraction` is interpreted as an absolute SECOND offset from
 * `beatStart` (we keep the same field name for compatibility with the
 * fraction-of-RR template used by `evaluateBeat`).
 */
export function evaluateAbsBeat(
  t: number,
  beatStart: number,
  components: AbsBeatComponents,
): number {
  const local = t - beatStart;
  // 0.7 s covers QRS+T even in slow rhythms; 0.05 s lead-in for P.
  if (local < -0.05 || local > 0.7) return 0;
  let mv = 0;
  for (const w of [components.p, components.q, components.r, components.s, components.t]) {
    mv += gaussian(local, w.centerFraction, w.sigmaSec, w.amplitudeMv);
  }
  return mv;
}
