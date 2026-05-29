/**
 * Deterministic seeded PRNG for the quiz engine.
 *
 * Uses Mulberry32 — fast, sufficient for shuffling, and tiny.
 * Critical property: identical seeds always produce the same sequence,
 * which is what the quiz tests assert.
 */

export interface Rng {
  /** Next float in [0, 1). */
  next(): number;
  /** Pick a uniformly random integer in [0, max). */
  nextInt(max: number): number;
}

export function createRng(seed: number): Rng {
  let state = seed | 0;
  // Avoid degenerate state == 0; mulberry32 produces a non-trivial sequence
  // for any nonzero seed but a zero seed locks to a very short cycle.
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
    nextInt: (max: number) => Math.floor(next() * max),
  };
}

/** Fisher-Yates shuffle that consumes `rng`. Pure: returns a new array. */
export function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    const a = out[i] as T;
    const b = out[j] as T;
    out[i] = b;
    out[j] = a;
  }
  return out;
}

/**
 * Default seed source for the quiz when none is provided.
 * Wrapped so tests can provide an explicit seed for determinism.
 */
export function defaultSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) | 0;
}
