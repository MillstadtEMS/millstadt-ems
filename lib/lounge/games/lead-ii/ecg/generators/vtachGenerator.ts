/**
 * Monomorphic Ventricular Tachycardia.
 *
 *  - All beats are wide, regular, uniform (monomorphic) ventricular QRS
 *  - HR is user-adjustable; default ~170 bpm.
 *  - No P waves.
 *
 *  Morphology: classic "M-shape" / notched-R with deep wide S — the
 *  textbook fast monomorphic VT appearance:
 *
 *           R'  R''
 *            /\/\
 *           /    \
 *      ____/      \_
 *                  \  ← deep wide S
 *                   \____   ← brief return toward baseline
 *                       \__  ← small terminal bump (next beat coming)
 *
 *  Built as an explicit sum of gaussians rather than the shared 5-wave
 *  AbsBeatComponents template, because the notched-R needs a SIXTH peak.
 *  Polarity flips on the variant seed so distractor sets see both
 *  predominantly-positive and predominantly-negative VT morphologies.
 *
 * Catalog mapping (PHASE 3 DECISION — DO NOT CHANGE WITHOUT PROMPT):
 *  - `vent.vtach-stable`   → IMPLEMENTED. Beginner "VT" maps here.
 *  - `vent.vtach-unstable` → INTENTIONALLY NOT IMPLEMENTED. Hemodynamic
 *    distinction lives in the vitals layer, not the waveform.
 */

import type {
  ECGEvent,
  ECGSettings,
  GeneratedECGSignal,
} from '../types';
import { resolveHrFor } from '../rhythmRateControl';
import { requireMorphologyProfile } from '../litflMorphologyProfiles';
import { gaussian, sampleTimes } from './gaussianBeat';
import { vtMorphologyVariant } from '../rhythmVariants';

const VT_PROFILE = requireMorphologyProfile('vent.vtach-stable');

/**
 * Sum of 5 gaussians that produce the M-shaped VT complex described above.
 * All offsets are in seconds from the beat start. `pol` is +1 or -1
 * (predominant polarity). `aScale` and `wScale` are mild variant scalers.
 */
function evaluateVtBeat(
  local: number,
  pol: 1 | -1,
  aScale: number,
  wScale: number,
): number {
  // Outside the beat window, contribute nothing.
  if (local < -0.03 || local > 0.5) return 0;
  // Amplitudes calibrated so the net R peak sits near +0.85 mV and the
  // S nadir near -1.05 mV — peak-to-trough span ~1.9 mV, matching the
  // reference monomorphic VT strip the user shared rather than blowing
  // past the visible canvas range.
  let mv = 0;
  // R prime (first peak, sharp)
  mv += gaussian(local, 0.040, 0.016 * wScale, 0.75 * pol * aScale);
  // R double prime (second peak, slightly taller — the "rabbit ear")
  mv += gaussian(local, 0.080, 0.018 * wScale, 0.90 * pol * aScale);
  // Mild negative gaussian between the two peaks deepens the notch
  mv += gaussian(local, 0.060, 0.012 * wScale, -0.22 * pol * aScale);
  // Deep wide S — the dominant downward deflection after the M
  mv += gaussian(local, 0.140, 0.028 * wScale, -1.05 * pol * aScale);
  // Small terminal bump near baseline (partial T / recovery)
  mv += gaussian(local, 0.240, 0.045 * wScale, 0.18 * pol);
  return mv;
}

export function vtachGenerator(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const modelBand = VT_PROFILE.generator?.vtRateBpm;
  const resolved = resolveHrFor('vent.vtach-stable', settings.heartRate);
  const hr = modelBand ? Math.min(modelBand.max, Math.max(modelBand.min, resolved)) : resolved;
  const variant = vtMorphologyVariant(settings.variantSeed);
  const pol: 1 | -1 = variant.polarity;
  const aScale = variant.ampScale;
  const wScale = variant.widthScale;
  const rr = 60 / hr;
  const firstBeatIdx = Math.floor((tStart - 0.10) / rr);
  const lastBeatIdx = Math.ceil((tEnd + 0.10) / rr);

  const times = sampleTimes(tStart, tEnd, settings.sampleRateHz);
  const points = new Array<{ t: number; mv: number }>(times.length);
  for (let i = 0; i < times.length; i++) {
    const t = times[i] as number;
    let mv = 0;
    for (let b = firstBeatIdx; b <= lastBeatIdx; b++) {
      const beatStart = b * rr;
      const local = t - beatStart;
      if (local < -0.05 || local > 0.5) continue;
      mv += evaluateVtBeat(local, pol, aScale, wScale);
    }
    points[i] = { t, mv };
  }

  const events: ECGEvent[] = [];
  for (let b = firstBeatIdx; b <= lastBeatIdx; b++) {
    const beatStart = b * rr;
    // R event sits between the two peaks for stability across the strip.
    const rT = beatStart + 0.060;
    if (rT >= tStart && rT < tEnd) {
      events.push({
        kind: 'qrs-wide',
        tSec: rT,
        meta: {
          hrBpm: hr,
          variantPolarity: pol,
          widthScale: Number(wScale.toFixed(3)),
        },
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
}
