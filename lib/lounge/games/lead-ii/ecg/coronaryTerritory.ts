/**
 * Coronary artery territory map + culprit-vessel identification rules.
 *
 * Real cardiac monitors don't compute this themselves — but a serious
 * teaching simulator needs to:
 *   1. Generate STEMIs that are anatomically correct (the right leads
 *      light up for the right occlusion).
 *   2. Quiz learners on "which vessel is occluded?" given an ECG pattern.
 *   3. Surface vessel-specific complications (RV infarction with proximal
 *      RCA, new LBBB with proximal LAD, etc.).
 *
 * This module is pure data + pure helpers. The 12-lead patterns in
 * `twelveLeadRegistry.ts` are the visual renderers; this module is the
 * clinical truth they should match.
 *
 * Source basis (paraphrased; original wording is the user's):
 *   - AHA / ACC STEMI guidelines
 *   - LITFL coronary territories
 *   - Bayés de Luna inferior-MI vessel rules
 *
 * Pure TypeScript. No React / RN / Skia imports.
 */

import type { ECGLead } from './leadTypes';
import type { RhythmId } from './types';

// ── Vessel + segment enums ────────────────────────────────────────────

export type CoronaryVessel = 'LAD' | 'RCA' | 'LCx' | 'LMCA';

export type LADSegment = 'proximal' | 'mid' | 'distal' | 'wrap-around';
export type RCASegment = 'proximal' | 'mid' | 'distal-pda';
export type LCxSegment = 'proximal' | 'om-branch' | 'left-dominant-inferior' | 'posterior';
export type LMCASegment = 'complete';

export type VesselSegment = LADSegment | RCASegment | LCxSegment | LMCASegment;

// ── Shape of a STEMI pattern ──────────────────────────────────────────

export type STMorphology = 'convex' | 'concave' | 'coved' | 'horizontal';

export interface STElevationSpec {
  /** Minimum ST elevation in mm at the J-point (10 mm/mV gain). */
  mmAtLeast: number;
  morphology: STMorphology;
}

export interface STDepressionSpec {
  /** Minimum ST depression in mm (negative direction). */
  mmAtLeast: number;
}

export interface STEMIPattern {
  vessel: CoronaryVessel;
  segment: VesselSegment;
  /** Catalog rhythm id that visually represents this STEMI. */
  rhythmId: RhythmId;
  description: string;
  severity: 'CATASTROPHIC' | 'CRITICAL' | 'HIGH' | 'MODERATE' | 'MODERATE-HIGH';
  /** Leads where the SIM should generate ≥ this much ST elevation. */
  stElevation: Partial<Record<ECGLead, STElevationSpec>>;
  /** Leads where reciprocal ST depression must appear. */
  reciprocalDepression: Partial<Record<ECGLead, STDepressionSpec>>;
  /** RV-infarction marker (V4R) when relevant. */
  rvInvolvement?: {
    v4RmmAtLeast: number;
    standardLeadHint?: 'V1';
    note: string;
  };
  /** Posterior wall reciprocal in V1–V3 + true V7–V9. */
  posteriorInvolvement?: {
    standardLeadDepression: Partial<Record<ECGLead, STDepressionSpec>>;
    posteriorLeads: Partial<Record<'V7' | 'V8' | 'V9', STElevationSpec>>;
    note: string;
  };
  /** Clinical complications that the scenario engine can branch on. */
  complications: readonly string[];
  /** RhythmIds that commonly co-occur with this occlusion. */
  associatedArrhythmias: readonly RhythmId[];
  /** One-line clinical pearl. */
  pearl?: string;
}

// ── Helper to build a pattern row tersely ─────────────────────────────

const ste = (mm: number, morphology: STMorphology = 'convex'): STElevationSpec => ({
  mmAtLeast: mm,
  morphology,
});
const std = (mm: number): STDepressionSpec => ({ mmAtLeast: mm });

// ── The territory map ─────────────────────────────────────────────────

export const STEMI_PATTERNS: readonly STEMIPattern[] = [
  // ── LAD ────────────────────────────────────────────────────────────
  {
    vessel: 'LAD',
    segment: 'proximal',
    rhythmId: 'ischemia.anterior-stemi',
    description: 'Proximal LAD occlusion before the first septal and first diagonal (the "widow maker").',
    severity: 'CRITICAL',
    stElevation: {
      V1: ste(2),
      V2: ste(4),
      V3: ste(4),
      V4: ste(3),
      V5: ste(1.5),
      V6: ste(1, 'concave'),
      I: ste(1),
      aVL: ste(1.5),
      aVR: ste(1, 'convex'),
    },
    reciprocalDepression: {
      II: std(1),
      III: std(2),
      aVF: std(1.5),
    },
    complications: [
      'Cardiogenic shock',
      'New LBBB',
      'Complete heart block with septal extension',
      'VT / VF',
      'LV apical thrombus',
    ],
    associatedArrhythmias: ['vent.vtach-stable', 'vent.vfib', 'av-block.third-degree', 'conduction.lbbb'],
    pearl: 'STE in aVR with anterior STEMI suggests proximal LAD or LMCA.',
  },
  {
    vessel: 'LAD',
    segment: 'mid',
    rhythmId: 'ischemia.anterior-stemi',
    description: 'Mid LAD occlusion after the first septal, before the second.',
    severity: 'HIGH',
    stElevation: {
      V2: ste(3),
      V3: ste(4),
      V4: ste(3),
      V5: ste(1, 'concave'),
    },
    reciprocalDepression: {
      III: std(1),
      aVF: std(0.5),
    },
    complications: ['LAFB', 'VT / VF', 'Anterior wall motion abnormality'],
    associatedArrhythmias: ['vent.vtach-stable', 'vent.vfib', 'conduction.lafb'],
    pearl: 'Mid LAD often produces LAFB because it supplies the left anterior fascicle.',
  },
  {
    vessel: 'LAD',
    segment: 'distal',
    rhythmId: 'ischemia.anterior-stemi',
    description: 'Distal LAD / apical occlusion.',
    severity: 'MODERATE',
    stElevation: {
      V3: ste(2),
      V4: ste(3),
      V5: ste(2),
    },
    reciprocalDepression: {},
    complications: ['Apical wall motion abnormality', 'LV apical thrombus'],
    associatedArrhythmias: ['vent.vtach-stable'],
  },
  {
    vessel: 'LAD',
    segment: 'wrap-around',
    rhythmId: 'ischemia.anterior-stemi',
    description: 'LAD wrap-around variant — LAD also supplies the inferior apex (~15% of patients).',
    severity: 'HIGH',
    stElevation: {
      V1: ste(1),
      V2: ste(3),
      V3: ste(4),
      V4: ste(3),
      V5: ste(2),
      II: ste(1),
      III: ste(1),
      aVF: ste(1),
    },
    reciprocalDepression: {
      aVL: std(0.5),
    },
    complications: ['Large territory at risk', 'Cardiogenic shock possible'],
    associatedArrhythmias: ['vent.vtach-stable', 'vent.vfib'],
    pearl: 'Anterior + inferior STE WITHOUT inferior reciprocal depression = LAD wrap-around.',
  },

  // ── RCA ────────────────────────────────────────────────────────────
  {
    vessel: 'RCA',
    segment: 'proximal',
    rhythmId: 'ischemia.inferior-stemi',
    description: 'Proximal RCA occlusion before the RV marginal branches.',
    severity: 'HIGH',
    stElevation: {
      II: ste(2),
      III: ste(3),
      aVF: ste(2.5),
    },
    reciprocalDepression: {
      I: std(1),
      aVL: std(2),
    },
    rvInvolvement: {
      v4RmmAtLeast: 1,
      standardLeadHint: 'V1',
      note: 'V4R ST elevation ≥1 mm diagnostic; V1 STE supports RV involvement.',
    },
    posteriorInvolvement: {
      standardLeadDepression: {
        V1: std(1.5),
        V2: std(2),
        V3: std(1),
      },
      posteriorLeads: {
        V7: ste(1),
        V8: ste(1),
        V9: ste(0.5),
      },
      note: 'Right-dominant circulation: PDA from RCA supplies the posterior wall.',
    },
    complications: [
      'RV infarction (hypotension, JVD, clear lungs)',
      'Sinus bradycardia (SA-node artery from RCA in ~60%)',
      'AV block (AV-nodal artery from RCA in ~85%)',
      'Posterior extension',
      'Papillary muscle rupture (posteromedial)',
    ],
    associatedArrhythmias: ['sinus.bradycardia', 'av-block.second-mobitz-i', 'av-block.third-degree', 'atrial.fib'],
    pearl: 'STE III > II + aVL depression > I depression = RCA culprit.',
  },
  {
    vessel: 'RCA',
    segment: 'mid',
    rhythmId: 'ischemia.inferior-stemi',
    description: 'Mid RCA occlusion after RV marginals, before the PDA.',
    severity: 'MODERATE-HIGH',
    stElevation: {
      II: ste(2),
      III: ste(3),
      aVF: ste(2),
    },
    reciprocalDepression: {
      I: std(0.5),
      aVL: std(1.5),
    },
    complications: ['AV block (AV-nodal artery from distal RCA)', 'Inferior wall motion abnormality'],
    associatedArrhythmias: ['av-block.second-mobitz-i', 'av-block.third-degree'],
    pearl: 'Mid RCA — RV branches already perfused, so no RV infarct.',
  },
  {
    vessel: 'RCA',
    segment: 'distal-pda',
    rhythmId: 'ischemia.inferior-stemi',
    description: 'Distal RCA / PDA occlusion.',
    severity: 'MODERATE',
    stElevation: {
      II: ste(1.5),
      III: ste(2),
      aVF: ste(1.5),
    },
    reciprocalDepression: {
      aVL: std(1),
    },
    complications: ['Inferior septal involvement', 'Possible posterior extension'],
    associatedArrhythmias: [],
  },

  // ── LCx ────────────────────────────────────────────────────────────
  {
    vessel: 'LCx',
    segment: 'proximal',
    rhythmId: 'ischemia.lateral-stemi',
    description: 'Proximal LCx occlusion before the first obtuse marginal.',
    severity: 'HIGH',
    stElevation: {
      I: ste(2),
      aVL: ste(3),
      V5: ste(2),
      V6: ste(2),
    },
    reciprocalDepression: {
      III: std(2),
      aVF: std(1),
      V1: std(1),
      V2: std(1),
      V3: std(0.5),
    },
    posteriorInvolvement: {
      standardLeadDepression: {
        V1: std(1),
        V2: std(1.5),
      },
      posteriorLeads: {
        V7: ste(1.5),
        V8: ste(1.5),
        V9: ste(1),
      },
      note: 'LCx supplies the posterolateral wall — check V7–V9 even when the 12-lead is subtle.',
    },
    complications: [
      'Posterolateral wall motion abnormality',
      'Mitral regurgitation (posterolateral papillary muscle)',
      'Frequently missed — standard 12-lead poorly covers the posterolateral wall',
    ],
    associatedArrhythmias: ['atrial.fib'],
    pearl: 'LCx occlusion is the most commonly missed STEMI. Check posterior leads when V1–V3 show depression.',
  },
  {
    vessel: 'LCx',
    segment: 'om-branch',
    rhythmId: 'ischemia.high-lateral-stemi',
    description: 'Obtuse marginal branch occlusion (high-lateral only).',
    severity: 'MODERATE',
    stElevation: {
      I: ste(1.5),
      aVL: ste(2),
      V5: ste(0.5, 'concave'),
      V6: ste(0.5, 'concave'),
    },
    reciprocalDepression: {
      III: std(1.5),
      aVF: std(0.5),
    },
    complications: ['Lateral wall motion abnormality'],
    associatedArrhythmias: [],
    pearl: 'High-lateral only (I, aVL) — easy to miss without targeted lead review.',
  },
  {
    vessel: 'LCx',
    segment: 'left-dominant-inferior',
    rhythmId: 'ischemia.inferolateral-stemi',
    description: 'LCx in left-dominant circulation (LCx gives rise to the PDA).',
    severity: 'HIGH',
    stElevation: {
      II: ste(2),
      III: ste(2),
      aVF: ste(2),
      I: ste(1),
      V5: ste(1.5),
      V6: ste(1.5),
    },
    reciprocalDepression: {
      aVL: std(0.5),
      V1: std(1),
      V2: std(1.5),
      V3: std(1),
    },
    posteriorInvolvement: {
      standardLeadDepression: {
        V1: std(1),
        V2: std(1.5),
      },
      posteriorLeads: {
        V7: ste(2),
        V8: ste(2),
        V9: ste(1.5),
      },
      note: 'Left-dominant LCx supplies inferior + posterior + lateral simultaneously.',
    },
    complications: ['Cardiogenic shock', 'AV block (LCx supplies AV node in left-dominant)', 'Large territory at risk'],
    associatedArrhythmias: ['av-block.third-degree', 'atrial.fib'],
    pearl: 'STE II ≥ III with concomitant lateral STE = LCx (not RCA).',
  },
  {
    vessel: 'LCx',
    segment: 'posterior',
    rhythmId: 'ischemia.posterior-stemi',
    description: 'Isolated posterior wall MI (LCx posterolateral branch — or RCA in right-dominant).',
    severity: 'HIGH',
    stElevation: {},
    reciprocalDepression: {
      V1: std(2),
      V2: std(2.5),
      V3: std(1.5),
    },
    posteriorInvolvement: {
      standardLeadDepression: {
        V1: std(2),
        V2: std(2.5),
        V3: std(1.5),
      },
      posteriorLeads: {
        V7: ste(1.5),
        V8: ste(2),
        V9: ste(1),
      },
      note: 'No STE on standard 12-lead — must check V7–V9.',
    },
    complications: ['Mitral regurgitation', 'Often missed → delayed reperfusion'],
    associatedArrhythmias: [],
    pearl: 'Tall R + upright T in V1–V3 with ST depression = mirror image of posterior STE.',
  },

  // ── LMCA ───────────────────────────────────────────────────────────
  {
    vessel: 'LMCA',
    segment: 'complete',
    rhythmId: 'ischemia.left-main-occlusion',
    description: 'Left main coronary artery occlusion — catastrophic.',
    severity: 'CATASTROPHIC',
    stElevation: {
      aVR: ste(2, 'convex'),
      V1: ste(1, 'convex'),
    },
    reciprocalDepression: {
      I: std(1.5),
      II: std(2),
      III: std(1),
      aVF: std(1.5),
      V3: std(2),
      V4: std(3),
      V5: std(3),
      V6: std(2),
    },
    complications: [
      'Cardiogenic shock',
      'Cardiac arrest (VF / VT)',
      'Complete heart block',
      'Massive territory at risk',
      'Mortality > 90% without immediate intervention',
    ],
    associatedArrhythmias: ['vent.vfib', 'vent.vtach-stable', 'av-block.third-degree'],
    pearl: 'STE in aVR > V1 with diffuse depression in ≥ 6 leads = LMCA. STE V1 > aVR favors proximal LAD instead.',
  },
];

/** Quick lookup table: rhythmId → first matching STEMIPattern. */
export const STEMI_PATTERNS_BY_RHYTHM_ID: ReadonlyMap<RhythmId, STEMIPattern> = (() => {
  const m = new Map<RhythmId, STEMIPattern>();
  for (const p of STEMI_PATTERNS) {
    if (!m.has(p.rhythmId)) m.set(p.rhythmId, p);
  }
  return m;
})();

/** Get a STEMIPattern by vessel + segment. */
export function getSTEMIPattern(vessel: CoronaryVessel, segment: VesselSegment): STEMIPattern | undefined {
  return STEMI_PATTERNS.find((p) => p.vessel === vessel && p.segment === segment);
}

// ── Culprit-vessel identification rules ───────────────────────────────

/** Numeric ST elevation per lead at the J-point. Negative = depression. */
export type STLeadMap = Partial<Record<ECGLead | 'V4R', number>>;

export interface CulpritResult {
  vessel: CoronaryVessel;
  segment?: VesselSegment;
  /** Differential confidence: how strong is this call vs the alternatives. */
  confidence: 'high' | 'moderate' | 'low';
  rationale: readonly string[];
}

/**
 * Inferior STEMI culprit identification: RCA vs LCx.
 *
 * Rules used (clinically standard):
 *   - STE III > II              → RCA (+3 RCA)
 *   - STE II ≥ III              → LCx (+3 LCx)
 *   - V4R STE ≥ 1 mm            → RCA (+5 RCA)
 *   - STE V1 > 0.5 mm           → RCA (RV involvement; +2 RCA)
 *   - aVL depression > 1 mm     → RCA (+2 RCA)
 *   - aVL elevation > 0.5 mm    → LCx (+3 LCx)
 *   - STE in I / V5 / V6        → LCx (+3 LCx)
 */
export function identifyInferiorCulprit(st: STLeadMap): CulpritResult {
  const II = st.II ?? 0;
  const III = st.III ?? 0;
  const V1 = st.V1 ?? 0;
  const I = st.I ?? 0;
  const aVL = st.aVL ?? 0;
  const V5 = st.V5 ?? 0;
  const V6 = st.V6 ?? 0;
  const V4R = st.V4R ?? 0;

  let rcaScore = 0;
  let lcxScore = 0;
  const rationale: string[] = [];

  if (III > II) {
    rcaScore += 3;
    rationale.push('STE III > II — favors RCA.');
  } else if (II >= III) {
    lcxScore += 3;
    rationale.push('STE II ≥ III — favors LCx.');
  }
  if (V4R >= 1) {
    rcaScore += 5;
    rationale.push('V4R STE ≥ 1 mm — RV infarction, RCA.');
  }
  if (V1 > 0.5) {
    rcaScore += 2;
    rationale.push('V1 STE > 0.5 mm — RV involvement, RCA.');
  }
  if (aVL < -1) {
    rcaScore += 2;
    rationale.push('aVL depression > 1 mm — RCA.');
  } else if (aVL > 0.5) {
    lcxScore += 3;
    rationale.push('aVL elevation > 0.5 mm — LCx.');
  }
  if (I > 0.5 || V5 > 0.5 || V6 > 0.5) {
    lcxScore += 3;
    rationale.push('Lateral STE (I / V5 / V6) — LCx.');
  }

  const winner: CoronaryVessel = rcaScore >= lcxScore ? 'RCA' : 'LCx';
  const margin = Math.abs(rcaScore - lcxScore);
  let confidence: CulpritResult['confidence'] = margin >= 5 ? 'high' : margin >= 2 ? 'moderate' : 'low';
  // V4R elevation is pathognomonic for RV infarction → high confidence
  // regardless of competing LCx signals.
  if (V4R >= 1 && winner === 'RCA') confidence = 'high';

  return { vessel: winner, confidence, rationale };
}

/**
 * Anterior STEMI level identification: proximal / mid / distal / wrap-around LAD.
 */
export function identifyAnteriorLADLevel(
  st: STLeadMap,
  flags: { newLBBB?: boolean } = {},
): CulpritResult {
  const V1 = st.V1 ?? 0;
  const V2 = st.V2 ?? 0;
  const V3 = st.V3 ?? 0;
  const V4 = st.V4 ?? 0;
  const V5 = st.V5 ?? 0;
  const aVL = st.aVL ?? 0;
  const aVR = st.aVR ?? 0;
  const II = st.II ?? 0;
  const III = st.III ?? 0;
  const aVF = st.aVF ?? 0;
  const inferiorSTE = II > 0.5 || III > 0.5 || aVF > 0.5;
  const rationale: string[] = [];

  // Wrap-around: anterior + inferior STE together.
  if ((V2 > 1 || V3 > 1) && inferiorSTE) {
    rationale.push('Anterior + inferior STE without reciprocal inferior depression — LAD wrap-around.');
    return { vessel: 'LAD', segment: 'wrap-around', confidence: 'high', rationale };
  }

  // Proximal: V1 lit up + I/aVL + (new LBBB OR aVR STE).
  if (V1 > 1 && aVL > 0.5 && (flags.newLBBB === true || aVR > 0.5)) {
    rationale.push('V1 + aVL elevation with new LBBB or aVR STE — proximal LAD ("widow maker").');
    return { vessel: 'LAD', segment: 'proximal', confidence: 'high', rationale };
  }

  // Distal: V3–V5 only, V1/V2 quiet, aVL quiet.
  if (V1 < 0.5 && V2 < 0.5 && V3 > 1 && V4 > 1 && aVL < 0.5) {
    rationale.push('V3–V5 only, V1/V2/I/aVL quiet — distal LAD.');
    return { vessel: 'LAD', segment: 'distal', confidence: 'moderate', rationale };
  }

  // Mid LAD default.
  rationale.push('V2–V5 STE without I/aVL involvement — mid LAD.');
  return { vessel: 'LAD', segment: 'mid', confidence: 'moderate', rationale };
}

/**
 * Lateral STEMI culprit identification: D1 (diagonal off LAD) vs LCx vs OM.
 */
export function identifyLateralCulprit(st: STLeadMap): CulpritResult {
  const I = st.I ?? 0;
  const aVL = st.aVL ?? 0;
  const V5 = st.V5 ?? 0;
  const V6 = st.V6 ?? 0;
  const V2 = st.V2 ?? 0;
  const V3 = st.V3 ?? 0;
  const rationale: string[] = [];

  if (aVL > 1 && V2 > 1 && V3 > 1) {
    rationale.push('High-lateral STE with anteroseptal STE — proximal LAD (D1 + septal).');
    return { vessel: 'LAD', segment: 'proximal', confidence: 'high', rationale };
  }
  if (aVL > 1 && V5 < 0.5 && V6 < 0.5) {
    rationale.push('I / aVL only, no V5–V6 — LAD diagonal branch.');
    return { vessel: 'LAD', segment: 'mid', confidence: 'moderate', rationale };
  }
  if (V5 > 0.5 || V6 > 0.5 || I > 0.5) {
    rationale.push('Lateral STE involving V5–V6 — LCx (proximal or OM).');
    return { vessel: 'LCx', segment: 'proximal', confidence: 'moderate', rationale };
  }
  rationale.push('Subtle high-lateral STE — likely LCx OM branch.');
  return { vessel: 'LCx', segment: 'om-branch', confidence: 'low', rationale };
}

/**
 * LMCA / 3-vessel disease identification.
 *
 * Looks for STE in aVR ≥ 1 mm + diffuse ST depression in 6 or more leads.
 * Distinguishes LMCA from proximal LAD by aVR vs V1 STE magnitude.
 */
export function identifyLMCAor3VD(st: STLeadMap): CulpritResult | null {
  const aVR = st.aVR ?? 0;
  const V1 = st.V1 ?? 0;
  if (aVR < 1) return null;
  const depressionLeads: (keyof STLeadMap)[] = ['I', 'II', 'III', 'aVF', 'V3', 'V4', 'V5', 'V6'];
  const depCount = depressionLeads.reduce((acc, lead) => ((st[lead] ?? 0) < -0.5 ? acc + 1 : acc), 0);
  if (depCount < 6) return null;

  if (aVR > V1) {
    return {
      vessel: 'LMCA',
      segment: 'complete',
      confidence: 'high',
      rationale: ['STE aVR > V1 with diffuse depression in ≥ 6 leads — LMCA.'],
    };
  }
  if (V1 > aVR) {
    return {
      vessel: 'LAD',
      segment: 'proximal',
      confidence: 'moderate',
      rationale: ['STE V1 > aVR with diffuse depression — proximal LAD (close to LMCA territory).'],
    };
  }
  return {
    vessel: 'LMCA',
    segment: 'complete',
    confidence: 'moderate',
    rationale: ['STE aVR ≈ V1 with diffuse depression — LMCA vs severe three-vessel disease.'],
  };
}
