/**
 * Systemic / non-cardiac ECG patterns.
 *
 * Covers conditions where the ECG findings come from outside the heart's
 * own electrical disease: electrolytes, endocrine state, pulmonary
 * physiology, CNS catastrophe. These are the "look at the ECG, name the
 * extracardiac cause" patterns that come up in EMS / ED / ICU teaching.
 *
 *   - Hypomagnesemia
 *   - Hyperthyroidism
 *   - Hypothyroidism / myxedema
 *   - Acute intracranial hemorrhage / SAH (cerebral T waves)
 *   - Pulmonary embolism (submassive + massive)
 *   - COPD / emphysema
 *
 * Pure TypeScript. No React / RN / Skia imports.
 */

import type { ECGLead } from './leadTypes';
import type { RhythmId } from './types';

export type SystemicPatternKind =
  | 'hypomagnesemia'
  | 'hyperthyroidism'
  | 'hypothyroidism'
  | 'intracranial-hemorrhage'
  | 'pulmonary-embolism-submassive'
  | 'pulmonary-embolism-massive'
  | 'copd-emphysema';

export interface SystemicLeadFinding {
  /** Free-form lead-specific finding. */
  note: string;
  /** Quantitative ST shift in mm at the J-point, if relevant. */
  stShiftMm?: number;
  /** T-wave amplitude/polarity hint, if relevant. */
  tWave?: {
    amplitudeMm?: number;
    polarity?: 'upright' | 'inverted' | 'biphasic' | 'flat';
    morphology?: 'symmetric-peaked' | 'broad-asymmetric' | 'symmetric-inverted' | 'flat';
  };
}

export interface SystemicPatternSpec {
  kind: SystemicPatternKind;
  /** Linked catalog rhythm id if one exists; otherwise undefined. */
  rhythmId?: RhythmId;
  displayName: string;
  /** What's wrong physiologically — one paragraph. */
  pathophysiology: string;
  /** Ventricular rate the ECG typically runs at. */
  typicalRateBpm: number;
  /** Headline ECG findings in plain language (4–8 bullets). */
  findings: readonly string[];
  /** Specific lead-by-lead notes when one or two leads dominate the picture. */
  leadFindings?: Partial<Record<ECGLead, SystemicLeadFinding>>;
  /** Arrhythmias that commonly co-occur. */
  associatedArrhythmias: readonly RhythmId[];
  /** Mimics — patterns this can be confused with. */
  mimics: readonly string[];
  /** Clinical pearls. */
  pearls: readonly string[];
}

// ── Hypomagnesemia ────────────────────────────────────────────────────

const hypomagnesemia: SystemicPatternSpec = {
  kind: 'hypomagnesemia',
  rhythmId: 'electrolyte.hypomg',
  displayName: 'Hypomagnesemia',
  pathophysiology:
    'Low serum magnesium destabilizes the cardiac membrane (Mg²⁺ acts as a calcium-channel and Na/K-ATPase cofactor). The ECG mimics hypokalemia because both ions co-regulate ventricular repolarization.',
  typicalRateBpm: 75,
  findings: [
    'Flattened or inverted T waves',
    'Prominent U waves',
    'ST-segment depression',
    'QT prolongation (the most clinically relevant finding — torsades risk)',
    'PR prolongation in some patients',
    'QRS usually normal width',
  ],
  associatedArrhythmias: ['vent.torsades', 'atrial.fib', 'vent.pvc'],
  mimics: ['Hypokalemia (ECG indistinguishable; often coexist)', 'Digoxin effect (scooped ST + U waves)'],
  pearls: [
    'Refractory hypokalemia → check and replace magnesium first. Potassium will not correct until magnesium is replaced.',
    'Magnesium deficiency potentiates digoxin toxicity.',
    'Always check Mg in any torsades or refractory VF — empirical IV magnesium 2 g is reasonable.',
  ],
};

// ── Hyperthyroidism ───────────────────────────────────────────────────

const hyperthyroidism: SystemicPatternSpec = {
  kind: 'hyperthyroidism',
  displayName: 'Hyperthyroidism',
  pathophysiology:
    'Excess thyroid hormone raises β-adrenergic sensitivity and cardiac output. Manifests electrically as sinus tachycardia or atrial tachyarrhythmias, with high-voltage QRS from the high-output state.',
  typicalRateBpm: 110,
  findings: [
    'Sinus tachycardia (most common finding overall)',
    'Atrial fibrillation in 10–25 % — often with rapid ventricular response',
    'Tall, peaked P waves (increased sympathetic tone)',
    'Increased QRS voltage; LVH criteria can be transiently met',
    'Short QT interval possible',
    'Non-specific ST-T changes',
  ],
  associatedArrhythmias: ['atrial.fib', 'atrial.fib-rvr', 'sinus.tachycardia', 'atrial.flutter'],
  mimics: ['Sympathomimetic ingestion', 'Sepsis / fever sinus tachycardia'],
  pearls: [
    'AFib in hyperthyroidism is notoriously hard to rate-control until the patient is euthyroid.',
    'Beta-blockers are first-line for symptomatic rate control AND for masking peripheral hyperthyroid symptoms.',
    'Atrial fibrillation onset in a young patient with no obvious cardiac risk factors — check TSH.',
  ],
};

// ── Hypothyroidism / Myxedema ─────────────────────────────────────────

const hypothyroidism: SystemicPatternSpec = {
  kind: 'hypothyroidism',
  displayName: 'Hypothyroidism / Myxedema',
  pathophysiology:
    'Low thyroid hormone slows everything — sinus node, conduction, repolarization. Myxedema can also cause pericardial effusion, which adds low voltage and (rarely) electrical alternans.',
  typicalRateBpm: 50,
  findings: [
    'Sinus bradycardia',
    'Low voltage in all leads',
    'Flattened T waves (sometimes inverted)',
    'QT prolongation',
    'PR prolongation possible',
    'Pericardial effusion may add electrical alternans',
  ],
  associatedArrhythmias: ['sinus.bradycardia', 'av-block.first-degree'],
  mimics: ['Pericardial effusion (also low voltage)', 'Beta-blocker effect', 'Athlete heart (bradycardia only)'],
  pearls: [
    'Myxedema coma is a clinical diagnosis; ECG findings are corroborative, not diagnostic.',
    'Low voltage + flat Ts + bradycardia + history of fatigue/cold intolerance → check TSH.',
    'Treatment is IV levothyroxine + hydrocortisone (cover concurrent adrenal insufficiency).',
  ],
};

// ── Intracranial hemorrhage / SAH (cerebral T waves) ──────────────────

const intracranialHemorrhage: SystemicPatternSpec = {
  kind: 'intracranial-hemorrhage',
  displayName: 'Intracranial hemorrhage / SAH (cerebral T waves)',
  pathophysiology:
    'Massive sympathetic / catecholamine surge from the brain injury causes neurogenic stunned myocardium. The ECG shows striking ST-T abnormalities and prolonged QT, often with elevated troponin and regional wall-motion abnormalities — without coronary disease.',
  typicalRateBpm: 90,
  findings: [
    'Giant, deeply inverted, SYMMETRIC T waves — wider and deeper than ischemic T inversions',
    'Marked QT prolongation (QTc often > 500 ms)',
    'Prominent U waves',
    'ST elevation OR depression (variable)',
    'Sinus bradycardia or tachycardia',
    'Any arrhythmia possible from the catecholamine surge',
  ],
  leadFindings: {
    V3: {
      note: 'Cerebral T waves are widest and deepest here.',
      tWave: { amplitudeMm: 10, polarity: 'inverted', morphology: 'symmetric-inverted' },
    },
    V4: {
      note: 'Often the deepest single lead.',
      tWave: { amplitudeMm: 12, polarity: 'inverted', morphology: 'symmetric-inverted' },
    },
    V5: { note: 'Inversion continues laterally.', tWave: { amplitudeMm: 8, polarity: 'inverted', morphology: 'symmetric-inverted' } },
  },
  associatedArrhythmias: ['vent.torsades', 'vent.pvc', 'sinus.bradycardia', 'atrial.fib'],
  mimics: [
    'Anterior NSTEMI / Wellens (ischemic T inversions are usually narrower and less symmetric)',
    'Tako-Tsubo cardiomyopathy (same ST-T pattern in a different clinical context)',
    'Apical HCM (Yamaguchi) — but axis and voltage differ',
  ],
  pearls: [
    'Troponin can be elevated from neurogenic stunned myocardium — do not assume primary ACS in a patient with new neurologic deficits.',
    'Cerebral T waves are typically WIDER than ischemic T inversions and don\'t follow a coronary territory.',
    'QT prolongation can be severe — keep magnesium at the bedside, avoid QT-prolonging drugs.',
  ],
};

// ── Pulmonary embolism (submassive) ───────────────────────────────────

const peSubmassive: SystemicPatternSpec = {
  kind: 'pulmonary-embolism-submassive',
  displayName: 'Pulmonary embolism (submassive)',
  pathophysiology:
    'Clot lodged in pulmonary vasculature raises RV afterload. Sub-massive PE produces RV strain without overt hemodynamic collapse — the ECG findings are often subtle.',
  typicalRateBpm: 105,
  findings: [
    'Sinus tachycardia (most common — may be the ONLY finding)',
    'Non-specific ST-T changes',
    'S1Q3T3 pattern in only ~20 % of cases (not sensitive, not specific)',
    'New incomplete RBBB possible',
    'Normal ECG does NOT rule out PE',
  ],
  associatedArrhythmias: ['sinus.tachycardia', 'atrial.fib'],
  mimics: ['Sinus tach from any cause', 'Other RV strain etiologies (COPD exacerbation, pulmonary hypertension)'],
  pearls: [
    'A normal ECG with isolated sinus tachycardia is the MODAL presentation — don\'t exclude PE based on a "normal-looking" ECG.',
    'S1Q3T3 is taught classically but is neither sensitive nor specific.',
  ],
};

// ── Pulmonary embolism (massive) ──────────────────────────────────────

const peMassive: SystemicPatternSpec = {
  kind: 'pulmonary-embolism-massive',
  displayName: 'Pulmonary embolism (massive)',
  pathophysiology:
    'Large clot causes acute RV failure. The ECG reflects severe acute RV strain.',
  typicalRateBpm: 130,
  findings: [
    'Sinus tachycardia',
    'Classic S1Q3T3 — deep S in I, Q wave in III, inverted T in III',
    'Right axis deviation',
    'New RBBB (acute RV dilation)',
    'T-wave inversions V1–V4 (RV strain pattern — the most useful single finding)',
    'P pulmonale (tall peaked P in II / III / aVF — acute RAE)',
    'ST elevation in aVR',
    'Clockwise rotation: dominant S waves persist into V5–V6',
  ],
  leadFindings: {
    I: { note: 'Deep S wave (S1 of S1Q3T3).' },
    III: {
      note: 'Q wave + inverted T (Q3T3 of the triad).',
      tWave: { polarity: 'inverted' },
    },
    V1: {
      note: 'Tall R from acute RVH, then T inversion as strain develops.',
      stShiftMm: 1,
      tWave: { polarity: 'inverted' },
    },
    V2: { note: 'T inversion progressing across anterior leads.', tWave: { polarity: 'inverted', morphology: 'symmetric-inverted' } },
    V3: { note: 'Deepest T inversion in RV strain pattern.', tWave: { polarity: 'inverted', morphology: 'symmetric-inverted' } },
    V4: { note: 'T inversion often extends here.', tWave: { polarity: 'inverted' } },
    aVR: { note: 'ST elevation in aVR is part of the RV strain picture.', stShiftMm: 1 },
  },
  associatedArrhythmias: ['sinus.tachycardia', 'atrial.fib', 'atrial.fib-rvr'],
  mimics: ['Acute coronary syndrome (especially RV STEMI)', 'Anterior STEMI (V1–V4 T inversion overlaps with Wellens / ACS)'],
  pearls: [
    'T-wave inversions in V1–V4 are the SINGLE most useful PE ECG finding — more sensitive than S1Q3T3.',
    'New RBBB in a tachycardic hypotensive patient → think massive PE.',
    'TPA / thrombolysis is reasonable in massive PE with shock and contraindication-screening completed.',
  ],
};

// ── COPD / emphysema ──────────────────────────────────────────────────

const copd: SystemicPatternSpec = {
  kind: 'copd-emphysema',
  displayName: 'COPD / Emphysema',
  pathophysiology:
    'Hyperinflation pushes the heart down and rotates it. The lungs insulate the chest wall electrically, lowering voltage. Chronic hypoxic vasoconstriction can cause cor pulmonale → RVH.',
  typicalRateBpm: 90,
  findings: [
    'Low voltage in all leads (hyperinflated lungs insulate the chest)',
    'Right axis deviation',
    'P pulmonale: tall peaked P waves (≥ 2.5 mm) in II, III, aVF',
    'Poor R-wave progression — delayed precordial transition',
    'Persistent S waves through V5–V6 (clockwise rotation)',
    'Vertical heart axis (S1S2S3 pattern possible)',
    'Multifocal atrial tachycardia is the classic associated arrhythmia',
    'RVH criteria if cor pulmonale has developed',
  ],
  leadFindings: {
    II: { note: 'Tall peaked P wave — P pulmonale.' },
    aVL: { note: 'Low voltage prominent here.' },
    V1: { note: 'Low R amplitude; poor R-wave progression begins.' },
    V5: { note: 'S waves still prominent (clockwise rotation).' },
    V6: { note: 'S waves should be absent; their persistence is the giveaway.' },
  },
  associatedArrhythmias: ['atrial.mat', 'atrial.fib', 'sinus.tachycardia'],
  mimics: [
    'Anterior MI (poor R-wave progression can mimic old anterior infarct)',
    'Pericardial effusion (low voltage)',
    'Obesity (low voltage from chest wall)',
  ],
  pearls: [
    'MAT is the classic COPD arrhythmia. Three or more P-wave morphologies + rate > 100 + irregular = MAT.',
    'Low voltage + RAD + P pulmonale + poor R progression + clockwise rotation = "the COPD ECG."',
    'Adding RVH criteria suggests cor pulmonale — escalates monitoring intensity.',
  ],
};

// ── Registry + helpers ────────────────────────────────────────────────

export const SYSTEMIC_PATTERN_SPECS: readonly SystemicPatternSpec[] = [
  hypomagnesemia,
  hyperthyroidism,
  hypothyroidism,
  intracranialHemorrhage,
  peSubmassive,
  peMassive,
  copd,
];

export const SYSTEMIC_PATTERN_BY_KIND: ReadonlyMap<SystemicPatternKind, SystemicPatternSpec> = new Map(
  SYSTEMIC_PATTERN_SPECS.map((s) => [s.kind, s]),
);

export function systemicPatternFor(kind: SystemicPatternKind): SystemicPatternSpec | undefined {
  return SYSTEMIC_PATTERN_BY_KIND.get(kind);
}
