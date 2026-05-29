/**
 * Atrial Fibrillation generator.
 *
 *  - Irregularly irregular R-R intervals (each next interval is base * (0.6..1.3),
 *    derived from a deterministic hash of beat index)
 *  - No organized P waves (P amplitude suppressed in the beat template)
 *  - Low-amplitude chaotic baseline (the "f-waves") between QRS complexes
 *
 * Visually distinct from Sinus Arrhythmia (smooth cyclic) and Atrial Flutter
 * (regular sawtooth).
 */

import type {
  ECGEvent,
  ECGSettings,
  GeneratedECGSignal,
} from '../types';
import { requireMorphologyProfile } from '../litflMorphologyProfiles';
import { evaluateAbsBeat, narrowBeatComponents, sampleTimes } from './gaussianBeat';

const AFIB_PROFILE = requireMorphologyProfile('atrial.fib');
const BASE_HR_BPM = AFIB_PROFILE.generator?.afBaseRateBpm ?? 90;
const RR_FRACTION = AFIB_PROFILE.generator?.afRrFraction ?? { min: 0.6, max: 1.3 };
const MIN_RR_FRACTION = RR_FRACTION.min;
const MAX_RR_FRACTION = RR_FRACTION.max;

/** Deterministic [0, 1) from an integer index. */
function hashUnit(i: number): number {
  let x = (i | 0) ^ 0x9e3779b1;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return ((x ^ (x >>> 16)) >>> 0) / 0xffffffff;
}

/** Build a P-suppressed narrow beat (atrial fib has no organized P waves). */
function buildAfibBeat() {
  const c = narrowBeatComponents(0.16);
  // Suppress the P-wave amplitude — leaves an isoelectric pre-QRS region.
  c.p = { ...c.p, amplitudeMv: 0 };
  return c;
}

const AFIB_BEAT = buildAfibBeat();

/** Beat starts integrated from t=0 forward to cover [tStart, tEnd). */
function computeBeatStarts(baseRr: number, tEnd: number): number[] {
  const out: number[] = [];
  let beatStart = 0;
  let i = 0;
  out.push(beatStart);
  while (beatStart < tEnd + 1.0) {
    const u = hashUnit(i++);
    const rr = baseRr * (MIN_RR_FRACTION + (MAX_RR_FRACTION - MIN_RR_FRACTION) * u);
    beatStart += rr;
    out.push(beatStart);
  }
  return out;
}

/** Low-amplitude chaotic baseline (sums of phase-shifted sinusoids). */
const AF_FREQS = AFIB_PROFILE.generator?.afBaselineFrequenciesHz ?? [6.5, 8.3, 9.7];
const AF_AMPS = AFIB_PROFILE.generator?.afBaselineAmplitudesMv ?? [0.04, 0.03, 0.025];
const F_WAVE_BANK = AF_FREQS.map((freq, i) => ({
  freq,
  amp: AF_AMPS[i] ?? AF_AMPS[AF_AMPS.length - 1] ?? 0.025,
  phase: 0.7 * (i + 1),
}));

function fWaveBaseline(t: number): number {
  let v = 0;
  for (const w of F_WAVE_BANK) {
    v += w.amp * Math.sin(2 * Math.PI * w.freq * t + w.phase);
  }
  // Fine deterministic "ragged" texture keeps the baseline visibly fibrillatory
  // instead of looking like a smooth sinusoidal tremor.
  const grainA = hashUnit(Math.floor(t * 37));
  const grainB = hashUnit(Math.floor(t * 53) + 900);
  v += (grainA - 0.5) * 0.025 + (grainB - 0.5) * 0.015;
  return v;
}

/**
 * Internal generator that produces AFib at a configurable ventricular base
 * rate. The published `atrialFibGenerator` locks at the AFib profile's base
 * rate (~ 90 bpm = controlled); `atrialFibRvrGenerator` locks higher
 * (~ 130 bpm = RVR). Both share f-waves, irregularly irregular timing,
 * and identical waveform morphology.
 */
function generateAfibAtRate(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
  baseHrBpm: number,
): GeneratedECGSignal {
  void settings.heartRate;
  const baseRr = 60 / baseHrBpm;
  const beatStarts = computeBeatStarts(baseRr, tEnd);
  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);

  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = fWaveBaseline(t);
    for (const beatStart of beatStarts) {
      if (Math.abs(t - beatStart) > 0.6) continue;
      mv += evaluateAbsBeat(t, beatStart, AFIB_BEAT);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (const beatStart of beatStarts) {
    const rT = beatStart + AFIB_BEAT.r.centerFraction;
    const tT = beatStart + AFIB_BEAT.t.centerFraction;
    if (rT >= tStart && rT < tEnd) events.push({ kind: 'qrs-narrow', tSec: rT, meta: { hrBpm: baseHrBpm } });
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

export function atrialFibGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  return generateAfibAtRate(settings, tStart, tEnd, BASE_HR_BPM);
}

/** Atrial fibrillation with rapid ventricular response — ~ 130 bpm avg. */
export function atrialFibRvrGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  return generateAfibAtRate(settings, tStart, tEnd, 130);
}
