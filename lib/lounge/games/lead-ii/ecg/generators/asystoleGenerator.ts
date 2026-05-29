/**
 * Asystole waveform generator.
 *
 * Asystole = absence of all electrical activity. The generator returns a
 * flat baseline. A real cardiac monitor never shows perfectly clean DC zero
 * because of micro-artifact from contact, breathing, etc.; we mix in a tiny
 * deterministic baseline drift so the trace looks realistic but is clearly
 * NOT a rhythm.
 */

import type { ECGEvent, ECGSettings, GeneratedECGSignal } from '../types';
import { sampleTimes } from './gaussianBeat';

/** Peak baseline amplitude in mV. Below detection threshold for "rhythm". */
const BASELINE_AMPLITUDE_MV = 0.012;

export function asystoleGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  void settings.heartRate;
  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);

  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    // Two slow sinusoids — looks like respiratory micro-drift, not a beat.
    const drift =
      BASELINE_AMPLITUDE_MV * 0.6 * Math.sin(2 * Math.PI * 0.25 * t) +
      BASELINE_AMPLITUDE_MV * 0.4 * Math.sin(2 * Math.PI * 0.13 * t + 1.7);
    points[i] = { t, mv: drift };
  }

  // One marker per integer second inside the window — analogous to vfib chaos
  // markers, but flagged as electrical silence.
  const events: ECGEvent[] = [];
  const firstSec = Math.ceil(tStart);
  const lastSec = Math.floor(tEnd - 1e-9);
  for (let s = firstSec; s <= lastSec; s++) {
    events.push({ kind: 'asystole-baseline', tSec: s });
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
