/**
 * Ventricular escape rhythms.
 *
 *  - vent.idioventricular  (IVR):  20–40 bpm, wide QRS, no P
 *  - vent.aivr            (AIVR):  40–120 bpm, wide QRS, no P
 *
 * Same morphology — just different rate bands. AIVR is classically a
 * reperfusion-related rhythm; IVR is the slow ventricular escape that fires
 * when both SA and AV pacemakers fail. Distinguishable by rate alone in this
 * single-lead approximation.
 */

import type {
  ECGEvent,
  ECGSettings,
  GeneratedECGSignal,
  RhythmId,
} from '../types';
import { resolveHrFor } from '../rhythmRateControl';
import { evaluateAbsBeat, sampleTimes, wideBeatComponents } from './gaussianBeat';

const ESCAPE_BEAT = wideBeatComponents({ centerSec: 0.10, polarity: 1 });

function idioventricularGenFor(rhythmId: RhythmId, mechanismLabel: 'ivr' | 'aivr') {
  return function generate(
    settings: ECGSettings,
    tStart: number,
    tEnd: number,
  ): GeneratedECGSignal {
    const hr = resolveHrFor(rhythmId, settings.heartRate);
    const rr = 60 / hr;
    const firstSlot = Math.floor((tStart - 0.10) / rr);
    const lastSlot = Math.ceil((tEnd + 0.10) / rr);

    const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
    const points = new Array<{ t: number; mv: number }>(times.length);
    for (let i = 0; i < times.length; i++) {
      const t = times[i] as number;
      let mv = 0;
      for (let s = firstSlot; s <= lastSlot; s++) {
        const beatStart = s * rr;
        if (Math.abs(t - beatStart) > 0.7) continue;
        mv += evaluateAbsBeat(t, beatStart, ESCAPE_BEAT);
      }
      points[i] = { t, mv };
    }

    const events: ECGEvent[] = [];
    for (let s = firstSlot; s <= lastSlot; s++) {
      const beatStart = s * rr;
      const rT = beatStart + ESCAPE_BEAT.r.centerFraction;
      if (rT >= tStart && rT < tEnd) {
        events.push({
          kind: 'qrs-wide',
          tSec: rT,
          meta: { hrBpm: hr, mechanism: mechanismLabel },
        });
      }
    }

    return {
      rhythmId: settings.rhythmId,
      windowStartSec: tStart,
      windowEndSec: tEnd,
      sampleRateHz: settings.sampleRateHz,
      points,
      events,
    };
  };
}

export const idioventricularGenerator = idioventricularGenFor('vent.idioventricular', 'ivr');
export const aivrGenerator = idioventricularGenFor('vent.aivr', 'aivr');
