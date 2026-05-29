/**
 * Pulseless Electrical Activity (PEA) generator.
 *
 * IMPORTANT — clinical accuracy note:
 *   PEA is a CLINICAL DIAGNOSIS, not a unique ECG morphology. It means
 *   organized electrical activity is present on the monitor while the
 *   patient has NO palpable pulse. Any organized rhythm can be PEA at the
 *   bedside.
 *
 * For Phase 3, we represent PEA as a slow, organized narrow-complex rhythm
 * (~30 bpm — at the slow end of an idioventricular-like escape) and the
 * monitor screen pairs that signal with pulseless vitals (BP unobtainable,
 * SpO2 absent, EtCO2 low). The catalog `learningNotes` already explains the
 * clinical concept; the events emitted here let tests assert "the trace is
 * organized" while the vitals layer asserts pulselessness.
 */

import type {
  ECGEvent,
  ECGSettings,
  GeneratedECGSignal,
} from '../types';
import { evaluateAbsBeat, narrowBeatComponents, sampleTimes } from './gaussianBeat';

const PEA_HR_BPM = 30;

const PEA_BEAT = narrowBeatComponents(0.18);

export function peaGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  void settings.heartRate;
  const rr = 60 / PEA_HR_BPM;
  const firstBeatIdx = Math.floor((tStart - 0.10) / rr);
  const lastBeatIdx = Math.ceil((tEnd + 0.10) / rr);

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);
  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;
    for (let b = firstBeatIdx; b <= lastBeatIdx; b++) {
      const beatStart = b * rr;
      if (Math.abs(t - beatStart) > 0.7) continue;
      mv += evaluateAbsBeat(t, beatStart, PEA_BEAT);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let b = firstBeatIdx; b <= lastBeatIdx; b++) {
    const beatStart = b * rr;
    const pT = beatStart + PEA_BEAT.p.centerFraction;
    const rT = beatStart + PEA_BEAT.r.centerFraction;
    const tT = beatStart + PEA_BEAT.t.centerFraction;
    if (pT >= tStart && pT < tEnd) events.push({ kind: 'p-wave', tSec: pT });
    if (rT >= tStart && rT < tEnd) {
      events.push({
        kind: 'qrs-narrow',
        tSec: rT,
        meta: { electricalRateBpm: PEA_HR_BPM, pulseless: true },
      });
    }
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
