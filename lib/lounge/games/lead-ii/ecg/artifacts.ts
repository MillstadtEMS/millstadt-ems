/**
 * Artifact layer — independent of rhythm generation.
 *
 * Phase 0 ships the type contract and a no-op `applyArtifact`.
 * Phase 1+ adds: muscle tremor (broadband HF noise), mains hum
 * (50/60 Hz sinusoid), and wandering baseline (slow respiratory drift).
 *
 * Keeping artifacts separate lets us teach "is the abnormal-looking strip
 * a real arrhythmia or just artifact?" without touching the rhythm engine.
 */

import type { ArtifactSettings, ECGPoint } from './types';

/**
 * Apply artifact layers to a clean signal. Phase 0 returns the input
 * unchanged when `level <= 0` or no artifact flags are set.
 */
export function applyArtifact(
  samples: ECGPoint[],
  artifact: ArtifactSettings,
): ECGPoint[] {
  if (artifact.level <= 0) return samples;
  if (!artifact.muscleTremor && !artifact.mainsHum && !artifact.wanderingBaseline) {
    return samples;
  }
  // Phase 1 replaces this with real noise mixing.
  return samples;
}

export const DEFAULT_ARTIFACT: ArtifactSettings = {
  level: 0,
  muscleTremor: false,
  mainsHum: false,
  mainsHz: 60,
  wanderingBaseline: false,
};
