/**
 * Fine Ventricular Fibrillation generator.
 *
 * Same chaotic structure as coarse VFib but at much lower amplitude.
 * Visually distinct from:
 *   - coarse VFib (peaks ~0.5 mV here vs ~0.1 mV)
 *   - asystole   (which sits below ~0.05 mV; fine VFib peaks ~0.10–0.18 mV)
 *
 * Same "no organized QRS" property as coarse VFib — emits `vf-chaos` events,
 * never `qrs-narrow` or `qrs-wide`.
 */

import type {
  ECGEvent,
  ECGSettings,
  GeneratedECGSignal,
} from '../types';
import { sampleTimes } from './gaussianBeat';

/** Cheap deterministic hash → [0, 1). Same as coarse VFib's bank seeder. */
function hashToUnit(n: number): number {
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

function chaoticBank(): Sinusoid[] {
  const out: Sinusoid[] = [];
  // Slightly different freqs than coarse — fine VF tends to look "faster /
  // higher freq" with smaller amplitude.
  const baseFreqs = [5.5, 6.7, 7.6, 8.5, 9.4];
  for (let i = 0; i < baseFreqs.length; i++) {
    const f = baseFreqs[i] as number;
    out.push({
      frequencyHz: f,
      amplitudeMv: 0.045 - i * 0.005, // ~1/4 of coarse VF
      phaseRad: hashToUnit(i * 1009 + 71) * Math.PI * 2,
    });
  }
  return out;
}

const BANK = chaoticBank();

export function vfibFineGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  void settings.heartRate; // No organized rate.
  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);

  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;
    for (const w of BANK) {
      mv += w.amplitudeMv * Math.sin(2 * Math.PI * w.frequencyHz * t + w.phaseRad);
    }
    const envelope = 0.85 + 0.35 * Math.sin(2 * Math.PI * 0.7 * t + 0.5);
    mv *= envelope;
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  const firstSec = Math.ceil(tStart);
  const lastSec = Math.floor(tEnd - 1e-9);
  for (let s = firstSec; s <= lastSec; s++) {
    events.push({ kind: 'vf-chaos', tSec: s, meta: { variant: 'fine' } });
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
