/**
 * STEMI temporal phases.
 *
 * A STEMI does not look the same on the ECG at 5 minutes, 5 hours, and
 * 5 weeks after coronary occlusion. The morphology evolves in a
 * predictable sequence:
 *
 *   1. HYPERACUTE  (minutes 0–30)  — tall, broad, symmetric T waves
 *      before clear ST elevation. Often missed because the ST may still
 *      look near-baseline.
 *   2. ACUTE       (~30 min – 12 h) — classic convex / "tombstone" ST
 *      elevation, R waves still preserved, reciprocal depression
 *      visible.
 *   3. EVOLVING    (12 h – days)    — ST returns toward baseline, T
 *      waves invert, Q waves form. Reciprocal changes resolve.
 *   4. CHRONIC     (weeks – years)  — ST back to baseline, persistent
 *      pathologic Q waves, T waves may stay inverted or normalize.
 *
 * Clinical importance: missing a hyperacute T wave is one of the most
 * common reasons to miss a STEMI. Mistaking an old infarct (chronic Q
 * waves) for a new one inflates the cath-lab activation rate.
 *
 * Pure TypeScript. No React / RN / Skia imports.
 */

import type { ECGLead } from './leadTypes';

export type STEMIPhase = 'hyperacute' | 'acute' | 'evolving' | 'chronic';

export interface STEMIPhaseLeadMorphology {
  /** ST-segment shift in mm at the J-point. Positive = elevation. */
  stShiftMm: number;
  /** Q wave depth in mm (0 if no pathologic Q). */
  qWaveMm: number;
  /** R wave amplitude in mm. */
  rWaveMm: number;
  /** T wave amplitude (mm) and polarity. */
  tWaveMm: number;
  tWavePolarity: 'upright' | 'inverted' | 'biphasic' | 'flat';
  /** Free-form lead-specific note. */
  note: string;
}

export interface STEMIPhaseSpec {
  phase: STEMIPhase;
  displayName: string;
  /** Time window since coronary occlusion. */
  timeWindow: string;
  /** Headline morphology rules. */
  rules: readonly string[];
  /** Per-affected-lead example morphology. */
  affectedLeadExample: STEMIPhaseLeadMorphology;
  /** Per-reciprocal-lead example morphology. */
  reciprocalLeadExample: STEMIPhaseLeadMorphology;
  /** Pitfalls a clinician must guard against in this phase. */
  pitfalls: readonly string[];
  /** Whether reperfusion (PCI / lysis) is still time-critical. */
  reperfusionStillCritical: boolean;
  /** Pearls. */
  pearls: readonly string[];
}

// ── Hyperacute (0–30 min) ─────────────────────────────────────────────

const hyperacute: STEMIPhaseSpec = {
  phase: 'hyperacute',
  displayName: 'Hyperacute (early ischemia)',
  timeWindow: '0 – 30 minutes',
  rules: [
    'Tall, broad, symmetric T waves that DWARF the R wave (the De Winter pattern is one variant)',
    'ST segment may still look near baseline — do NOT wait for elevation',
    'R wave still tall, NO Q wave yet',
    'Reciprocal changes can begin appearing',
    'Hyperacute T waves often precede frank ST elevation by minutes to hours',
  ],
  affectedLeadExample: {
    stShiftMm: 0.5,
    qWaveMm: 0,
    rWaveMm: 15,
    tWaveMm: 12,
    tWavePolarity: 'upright',
    note: 'Tall, broad-based, symmetric T wave that is BIGGER than the R wave. ST barely elevated.',
  },
  reciprocalLeadExample: {
    stShiftMm: -0.5,
    qWaveMm: 0,
    rWaveMm: 5,
    tWaveMm: -1,
    tWavePolarity: 'inverted',
    note: 'Subtle reciprocal ST depression and early T inversion.',
  },
  pitfalls: [
    'Mistaken for hyperkalemia (peaked Ts) — but hyperacute Ts are BROAD-based, hyperkalemia Ts are narrow-based and tented.',
    'Mistaken for "normal variant" / early repolarization in young patients.',
    'Discharging from the ED before serial ECGs evolve — this is the single biggest miss for hyperacute STEMI.',
  ],
  reperfusionStillCritical: true,
  pearls: [
    'A "normal-looking" ECG with chest pain + tall broad symmetric T waves is hyperacute STEMI until proven otherwise.',
    'Serial ECGs every 15 min while pain persists. The morphology will declare itself.',
    'De Winter ST/T pattern (upsloping ST depression at the J-point + tall symmetric T in precordials) is a hyperacute STEMI-equivalent — same treatment as STEMI.',
  ],
};

// ── Acute (~30 min – 12 h) ────────────────────────────────────────────

const acute: STEMIPhaseSpec = {
  phase: 'acute',
  displayName: 'Acute (classic STEMI)',
  timeWindow: '30 min – 12 hours',
  rules: [
    'Convex-upward ("tombstone") ST elevation ≥ 1 mm in 2 contiguous limb leads, or ≥ 2 mm in 2 contiguous precordials (V2–V3 cutoffs are sex- and age-adjusted)',
    'R wave still preserved (no Q yet, or early small Q)',
    'T wave usually still upright and merged into the elevated ST',
    'Reciprocal ST depression in opposite leads — its presence raises the positive predictive value substantially',
  ],
  affectedLeadExample: {
    stShiftMm: 3,
    qWaveMm: 0,
    rWaveMm: 12,
    tWaveMm: 4,
    tWavePolarity: 'upright',
    note: 'Convex / "tombstone" ST elevation. R wave still present. T wave fused into the elevated ST.',
  },
  reciprocalLeadExample: {
    stShiftMm: -2,
    qWaveMm: 0,
    rWaveMm: 6,
    tWaveMm: -1,
    tWavePolarity: 'inverted',
    note: 'Frank reciprocal ST depression. Confirms the diagnosis.',
  },
  pitfalls: [
    'LBBB / paced rhythms — use Sgarbossa or modified Sgarbossa criteria, not raw ST elevation.',
    'Early repolarization — concave-upward elevation, no reciprocal change, J-point notching.',
    'Pericarditis — diffuse, concave-upward elevation, PR depression, no reciprocal changes.',
  ],
  reperfusionStillCritical: true,
  pearls: [
    'Time = muscle. Door-to-balloon < 90 min, door-to-needle < 30 min.',
    'Even a small ST elevation with reciprocal depression beats a big ST elevation without — reciprocity confirms occlusion.',
    'aVR ST elevation > 1 mm with diffuse ST depression suggests LMCA or 3-vessel occlusion — treat as STEMI equivalent.',
  ],
};

// ── Evolving (12 h – days) ────────────────────────────────────────────

const evolving: STEMIPhaseSpec = {
  phase: 'evolving',
  displayName: 'Evolving (subacute)',
  timeWindow: '12 hours – several days',
  rules: [
    'ST segment returns TOWARD baseline (still elevated but less so)',
    'T wave begins to INVERT — terminal T inversion appears first',
    'Pathologic Q waves develop (≥ 40 ms wide or ≥ 1/3 the R-wave height)',
    'R-wave amplitude diminishes in the infarcted territory',
    'Reciprocal changes resolve in this phase',
  ],
  affectedLeadExample: {
    stShiftMm: 1.5,
    qWaveMm: 3,
    rWaveMm: 6,
    tWaveMm: -3,
    tWavePolarity: 'inverted',
    note: 'ST coming down toward baseline, deep T-wave inversion, pathologic Q wave forming, R-wave amplitude reduced.',
  },
  reciprocalLeadExample: {
    stShiftMm: -0.5,
    qWaveMm: 0,
    rWaveMm: 8,
    tWaveMm: 1,
    tWavePolarity: 'upright',
    note: 'Reciprocal changes resolving toward baseline.',
  },
  pitfalls: [
    'Mistaking T-wave inversion in this phase for new ischemia (it is the natural evolution after a STEMI, not a re-occlusion).',
    'Reciprocal-change normalization can mask a re-occlusion if it is interpreted as resolution of the original event.',
    'Q waves forming in this phase are RECENT — these are not "old" yet.',
  ],
  reperfusionStillCritical: false,
  pearls: [
    'Reperfusion benefit decays after ~12 h but is not zero; even late presenters with ongoing symptoms may benefit.',
    'A persistently elevated ST > 1 month after STEMI suggests a left ventricular aneurysm.',
    'Symmetric T-wave inversion in the evolving phase is the textbook morphology — be familiar with it.',
  ],
};

// ── Chronic (weeks – years) ───────────────────────────────────────────

const chronic: STEMIPhaseSpec = {
  phase: 'chronic',
  displayName: 'Chronic (old infarct)',
  timeWindow: 'Weeks to indefinitely',
  rules: [
    'ST segment back to baseline',
    'Pathologic Q waves PERSIST — the permanent fingerprint of the prior infarct',
    'R-wave amplitude reduced or absent in the infarcted territory ("loss of R waves")',
    'T waves may remain inverted permanently OR normalize over months to years',
    'No active ischemia signal — distinguishes old from new',
  ],
  affectedLeadExample: {
    stShiftMm: 0,
    qWaveMm: 4,
    rWaveMm: 2,
    tWaveMm: -1,
    tWavePolarity: 'inverted',
    note: 'Pathologic Q wave, reduced R amplitude, ST back to baseline, T may remain shallowly inverted.',
  },
  reciprocalLeadExample: {
    stShiftMm: 0,
    qWaveMm: 0,
    rWaveMm: 8,
    tWaveMm: 1,
    tWavePolarity: 'upright',
    note: 'Reciprocal leads back to baseline.',
  },
  pitfalls: [
    'Persistent ST elevation > 2 mm in leads with Q waves > 4 weeks post-MI suggests LV aneurysm.',
    'New T-wave inversion superimposed on chronic Q waves can represent extension or new ischemia — compare with priors.',
    'Q waves alone do not date the infarct — always compare with prior ECGs to determine acuity.',
  ],
  reperfusionStillCritical: false,
  pearls: [
    'Q waves are the permanent fingerprint of a prior transmural infarct, but they can occasionally regress.',
    'The combination of persistent Q + persistent T-wave inversion in the same territory is a "remote MI" pattern.',
    'Always obtain prior ECGs before activating the cath lab for chest pain — chronic Q waves can be mistaken for an acute event.',
  ],
};

// ── Registry ──────────────────────────────────────────────────────────

export const STEMI_PHASE_SPECS: readonly STEMIPhaseSpec[] = [
  hyperacute,
  acute,
  evolving,
  chronic,
];

export const STEMI_PHASE_BY_NAME: ReadonlyMap<STEMIPhase, STEMIPhaseSpec> = new Map(
  STEMI_PHASE_SPECS.map((s) => [s.phase, s]),
);

/**
 * Look up the phase for a given time-since-occlusion in minutes.
 */
export function phaseForMinutes(minutesSinceOcclusion: number): STEMIPhase {
  if (minutesSinceOcclusion < 30) return 'hyperacute';
  if (minutesSinceOcclusion < 12 * 60) return 'acute';
  if (minutesSinceOcclusion < 7 * 24 * 60) return 'evolving';
  return 'chronic';
}

/**
 * Build a per-lead morphology projection for a given STEMI phase + a
 * set of affected and reciprocal leads. Useful for 12-lead synthesis.
 */
export function projectPhaseToLeads(
  phase: STEMIPhase,
  affectedLeads: readonly ECGLead[],
  reciprocalLeads: readonly ECGLead[],
): Partial<Record<ECGLead, STEMIPhaseLeadMorphology>> {
  const spec = STEMI_PHASE_BY_NAME.get(phase);
  if (!spec) return {};
  const out: Partial<Record<ECGLead, STEMIPhaseLeadMorphology>> = {};
  for (const lead of affectedLeads) {
    out[lead] = { ...spec.affectedLeadExample };
  }
  for (const lead of reciprocalLeads) {
    out[lead] = { ...spec.reciprocalLeadExample };
  }
  return out;
}
