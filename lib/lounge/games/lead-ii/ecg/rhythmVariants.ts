/**
 * Deterministic bounded morphology variants.
 *
 * This is how the simulator avoids "same strip every time" without turning
 * into made-up noise. Variant knobs are intentionally small and constrained:
 * they change amplitude, polarity, rate target, or fibrillation texture while
 * preserving the rhythm's clinical criteria.
 */

import type { RhythmId } from './types';

export interface RhythmVariantRng {
  next(): number;
  between(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
}

function hashStringToInt(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}

export function variantSeedFor(rhythmId: RhythmId, seed?: number): number {
  return (seed ?? 0) ^ hashStringToInt(rhythmId);
}

export function createRhythmVariantRng(rhythmId: RhythmId, seed?: number): RhythmVariantRng {
  let state = variantSeedFor(rhythmId, seed);
  if (state === 0) state = 0x9e3779b1;

  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    between: (min, max) => min + (max - min) * next(),
    pick: (items) => items[Math.floor(next() * items.length)] as (typeof items)[number],
  };
}

export interface SvtMorphologyVariant {
  prSec: number;
  qrsAmpScale: number;
  tAmpScale: number;
}

export function svtMorphologyVariant(seed?: number): SvtMorphologyVariant {
  const rng = createRhythmVariantRng('atrial.svt', seed);
  return {
    // Still a short-RP/narrow tachy pattern with P hidden.
    prSec: rng.between(0.105, 0.135),
    qrsAmpScale: rng.between(0.9, 1.12),
    tAmpScale: rng.between(0.85, 1.15),
  };
}

export interface VtMorphologyVariant {
  centerSec: number;
  polarity: 1 | -1;
  ampScale: number;
  widthScale: number;
}

export function vtMorphologyVariant(seed?: number): VtMorphologyVariant {
  const rng = createRhythmVariantRng('vent.vtach-stable', seed);
  return {
    centerSec: rng.between(0.085, 0.12),
    polarity: rng.next() < 0.28 ? -1 : 1,
    ampScale: rng.between(0.82, 1.18),
    widthScale: rng.between(0.9, 1.18),
  };
}

export interface VfMorphologyVariant {
  frequencyScale: number;
  amplitudeScale: number;
  envelopeHz: number;
  phaseOffset: number;
}

export function vfMorphologyVariant(seed?: number): VfMorphologyVariant {
  const rng = createRhythmVariantRng('vent.vfib', seed);
  return {
    frequencyScale: rng.between(0.88, 1.18),
    amplitudeScale: rng.between(0.78, 1.22),
    envelopeHz: rng.between(0.45, 0.95),
    phaseOffset: rng.between(0, Math.PI * 2),
  };
}
