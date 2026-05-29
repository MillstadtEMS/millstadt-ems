/**
 * Lead-axis projection from a single-lead "lead-II semantic" base signal to
 * all 12 standard leads.
 *
 * For each lead we apply per-component multipliers — separate multipliers for
 * the P wave, QRS complex, and T wave — because real lead morphology can flip
 * polarity differently for atrial vs. ventricular activity. The multipliers
 * here are educational approximations, not full forward dipole modelling.
 *
 * Source (paraphrased, no copy): standard normal-sinus 12-lead morphology
 * patterns taught in EMS and nursing curricula. The numbers below are tuned
 * so a normal sinus rhythm projected through these factors produces
 * recognisable lead-by-lead morphology — V1 with its mostly-negative QRS,
 * V5/V6 dominantly positive R, aVR negative across the board, etc.
 */

import type { ECGEvent, GeneratedECGSignal } from './types';
import type { ECGLead } from './leadTypes';

/**
 * Per-component scaling factors for each lead.
 *
 *   p:    P-wave amplitude multiplier
 *   qrs:  net QRS deflection multiplier (signed — flips polarity if negative)
 *   t:    T-wave amplitude multiplier
 */
export interface LeadAxisFactors {
  p: number;
  qrs: number;
  t: number;
}

export const LEAD_PROJECTIONS: Record<ECGLead, LeadAxisFactors> = {
  // Frontal-plane limb leads. Lead II is our reference (factors all 1.0).
  I:   { p: 0.55, qrs: 0.65, t: 0.60 },
  II:  { p: 1.00, qrs: 1.00, t: 1.00 },
  III: { p: 0.45, qrs: 0.50, t: 0.45 },
  aVR: { p: -0.70, qrs: -0.85, t: -0.65 },
  aVL: { p: 0.35, qrs: 0.30, t: 0.40 },
  aVF: { p: 0.85, qrs: 0.95, t: 0.85 },
  // Precordial — V1 is septum-facing (mostly negative for ventricular forces).
  V1:  { p: 0.20, qrs: -0.50, t: 0.30 },
  V2:  { p: 0.30, qrs: 0.10, t: 0.50 },
  V3:  { p: 0.40, qrs: 0.55, t: 0.70 },
  V4:  { p: 0.50, qrs: 0.95, t: 0.90 },
  V5:  { p: 0.50, qrs: 1.05, t: 0.85 },
  V6:  { p: 0.45, qrs: 0.95, t: 0.75 },
};

/**
 * Identify the temporal "section" of a sample relative to the events list.
 * Returns the closest event kind among P, QRS, T — used so per-component
 * scaling can be applied to the right slice of the waveform.
 *
 * Cheap heuristic: each sample is scaled by a weighted blend of the 3 factors
 * based on temporal proximity to nearby events.
 */
function blendFactorsAtTime(
  t: number,
  events: readonly ECGEvent[],
  factors: LeadAxisFactors,
): number {
  // Find the nearest P, QRS, and T event before/after t.
  let weightP = 0;
  let weightQ = 0;
  let weightT = 0;
  const SIGMA = 0.12; // 120 ms blend halfwidth — covers P-QRS gap nicely
  for (const e of events) {
    const d = Math.abs(t - e.tSec);
    if (d > 0.30) continue; // outside any reasonable beat
    const w = Math.exp(-(d * d) / (2 * SIGMA * SIGMA));
    if (e.kind === 'p-wave') weightP += w;
    else if (e.kind === 'qrs-narrow' || e.kind === 'qrs-wide' || e.kind === 'pvc') weightQ += w;
    else if (e.kind === 't-wave') weightT += w;
  }
  const total = weightP + weightQ + weightT;
  if (total === 0) {
    // No nearby annotated event — use the QRS factor as a neutral default.
    return factors.qrs;
  }
  return (
    (weightP * factors.p + weightQ * factors.qrs + weightT * factors.t) / total
  );
}

/**
 * Project a single-lead base signal to a target lead by per-component scaling.
 *
 * The returned signal has the SAME `points.t` grid and the SAME event list
 * (events are temporal markers — they don't change between leads), but the
 * mV values are scaled per the lead's axis factors.
 */
export function projectToLead(
  base: GeneratedECGSignal,
  lead: ECGLead,
): GeneratedECGSignal {
  const factors = LEAD_PROJECTIONS[lead];
  const points = base.points.map((p) => ({
    t: p.t,
    mv: p.mv * blendFactorsAtTime(p.t, base.events, factors),
  }));
  return {
    rhythmId: base.rhythmId,
    windowStartSec: base.windowStartSec,
    windowEndSec: base.windowEndSec,
    sampleRateHz: base.sampleRateHz,
    points,
    events: base.events,
  };
}
