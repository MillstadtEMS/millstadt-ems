/**
 * Ventricular fibrillation waveform generator.
 *
 * VFib is chaotic, irregular ventricular activity with no identifiable QRS.
 * We model it as a sum of several sinusoids at frequencies in the 4–9 Hz
 * band (matching observed VF frequency content) with random phases and
 * slow amplitude modulation. It looks chaotic without being literal noise.
 *
 * The generator is deterministic for a given seed of (tStart). We derive
 * the "seed" from a hash of nearby integer time so the output is stable
 * across re-renders of the same window but varies as time advances.
 *
 * Phase 1 ships coarse VFib (~0.5 mV peak). Fine VFib will get its own
 * generator in a later pack.
 */

import type { ECGEvent, ECGSettings, GeneratedECGSignal } from '../types';
import { requireMorphologyProfile } from '../litflMorphologyProfiles';
import { vfMorphologyVariant } from '../rhythmVariants';
import { sampleTimes } from './gaussianBeat';

/** Cheap deterministic hash → [0, 1). */
function hashToUnit(n: number): number {
  // Bit-twiddle a 32-bit integer hash and normalize.
  let x = (n | 0) ^ 0x9e3779b1;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  x = x ^ (x >>> 16);
  return ((x >>> 0) % 100000) / 100000;
}

interface Sinusoid {
  frequencyHz: number;
  amplitudeMv: number;
  phaseRad: number;
}

/**
 * Build a small bank of sinusoids for the chaotic component. The phase /
 * frequency mix is deterministic per phase index but varies enough across
 * indexes that summed they look like fibrillation.
 */
function chaoticBank(seed?: number): Sinusoid[] {
  const out: Sinusoid[] = [];
  const profile = requireMorphologyProfile('vent.vfib');
  const baseFreqs = profile.generator?.vfFrequenciesHz ?? [4.5, 5.7, 6.3, 7.1, 8.4];
  const amps = profile.generator?.vfAmplitudesMv ?? [0.18, 0.165, 0.15, 0.135, 0.12];
  const variant = vfMorphologyVariant(seed);
  for (let i = 0; i < baseFreqs.length; i++) {
    const f = baseFreqs[i] as number;
    out.push({
      frequencyHz: f * variant.frequencyScale,
      amplitudeMv: (amps[i] ?? amps[amps.length - 1] ?? 0.12) * variant.amplitudeScale,
      phaseRad: hashToUnit(i * 1009 + 17) * Math.PI * 2 + variant.phaseOffset,
    });
  }
  return out;
}

export function vfibGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  void settings.heartRate; // VFib has no organized rate; ignore HR setting.
  const variant = vfMorphologyVariant(settings.variantSeed);
  const bank = chaoticBank(settings.variantSeed);
  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);

  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;
    for (const w of bank) {
      mv += w.amplitudeMv * Math.sin(2 * Math.PI * w.frequencyHz * t + w.phaseRad);
    }
    // Slow amplitude modulation (~0.7 Hz) so the chaos waxes and wanes.
    const envelope = 0.85 + 0.35 * Math.sin(2 * Math.PI * variant.envelopeHz * t + 0.5);
    mv *= envelope;

    points[i] = { t, mv };
  }

  // Emit one chaos marker per integer second inside the window — gives tests
  // a stable count to assert without relying on raw sample shape.
  const events: ECGEvent[] = [];
  const firstSec = Math.ceil(tStart);
  const lastSec = Math.floor(tEnd - 1e-9);
  for (let s = firstSec; s <= lastSec; s++) {
    events.push({
      kind: 'vf-chaos',
      tSec: s,
      meta: {
        frequencyScale: Number(variant.frequencyScale.toFixed(3)),
        amplitudeScale: Number(variant.amplitudeScale.toFixed(3)),
      },
    });
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
