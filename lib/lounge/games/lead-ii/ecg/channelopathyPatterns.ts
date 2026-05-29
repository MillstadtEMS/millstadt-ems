/**
 * Channelopathy + cardiomyopathy ECG pattern refinements.
 *
 * Adds depth to patterns whose catalog rhythm ids already exist but need
 * richer clinical data for teaching and quiz purposes:
 *
 *   - ARVD epsilon-wave criteria (Task Force major + minor)
 *   - Brugada Type 1 (diagnostic / coved) vs Type 2 (saddleback / suggestive)
 *   - WPW accessory-pathway localization (4 standard pathway regions
 *     with per-lead delta polarity)
 *   - LQTS subtypes — LQT1 vs LQT2 vs LQT3 T-wave morphology + trigger
 *
 * Pure TypeScript. No React / RN / Skia imports.
 */

import type { ECGLead } from './leadTypes';
import type { RhythmId } from './types';

// ── ARVD / ARVC ───────────────────────────────────────────────────────

export interface ARVCSpec {
  rhythmId: RhythmId;
  displayName: string;
  description: string;
  /** Per-lead ECG findings — V1–V3 dominate the picture. */
  leadFindings: Partial<Record<ECGLead, { note: string; epsilon?: boolean; tInverted?: boolean }>>;
  /** 2010 Task Force Criteria — major. */
  majorCriteria: readonly string[];
  /** 2010 Task Force Criteria — minor. */
  minorCriteria: readonly string[];
  /** Characteristic VT morphology and significance. */
  vtSignature: {
    morphology: 'LBBB-superior-axis' | 'LBBB-inferior-axis' | 'variable';
    note: string;
  };
  pearls: readonly string[];
}

export const ARVC_SPEC: ARVCSpec = {
  rhythmId: 'special.arvc',
  displayName: 'Arrhythmogenic right ventricular cardiomyopathy (ARVC / ARVD)',
  description:
    'Genetic cardiomyopathy with fibrofatty replacement of RV myocardium. The ECG hallmarks are V1–V3 abnormalities: epsilon wave, T-wave inversion, prolonged S-wave upstroke, and localized QRS prolongation.',
  leadFindings: {
    V1: {
      note: 'Epsilon wave (small terminal deflection after QRS), T-wave inversion, S-wave upstroke prolonged > 55 ms.',
      epsilon: true,
      tInverted: true,
    },
    V2: { note: 'Same features as V1, slightly less prominent.', epsilon: true, tInverted: true },
    V3: { note: 'Continued T inversion. Epsilon wave amplitude diminishes here.', epsilon: true, tInverted: true },
    V4: { note: 'T-wave inversion typically ends by V4 in localized disease.' },
  },
  majorCriteria: [
    'Epsilon waves in V1–V3',
    'T-wave inversion in V1–V3 in the absence of RBBB (age > 14 years)',
    'Localized QRS prolongation in V1–V3 (> 110 ms) — RV-only conduction delay',
  ],
  minorCriteria: [
    'Late potentials on signal-averaged ECG (SAECG)',
    'T-wave inversion in V1–V2 only',
    '≥ 500 PVCs per 24 hours on Holter',
    'VT with LBBB morphology',
  ],
  vtSignature: {
    morphology: 'LBBB-superior-axis',
    note: 'LBBB-morphology VT in a young patient — especially with superior axis — should raise ARVC. The VT originates from the diseased RV.',
  },
  pearls: [
    'Epsilon wave sensitivity is low (~30 %) — its absence does NOT exclude ARVC.',
    'A leading cause of sudden cardiac death in young athletes in some regions (notably the Veneto region of Italy).',
    'Definitive diagnosis combines ECG, imaging, family history, and pathology — no single criterion is sufficient.',
  ],
};

// ── Brugada Type 1 (coved) vs Type 2 (saddleback) ─────────────────────

export interface BrugadaTypeSpec {
  type: 'type-1' | 'type-2';
  rhythmId: RhythmId;
  displayName: string;
  description: string;
  diagnostic: boolean;
  /** Per-lead V1/V2 findings. */
  leadFindings: Partial<Record<'V1' | 'V2', {
    stElevationMm: number;
    stMorphology: 'coved' | 'saddleback';
    tWavePolarity: 'inverted' | 'positive' | 'biphasic';
    note: string;
  }>>;
  /** Diagnostic criteria. */
  diagnosticCriteria: readonly string[];
  /** Triggers that can unmask or worsen. */
  triggers: readonly string[];
  pearls: readonly string[];
}

export const BRUGADA_TYPE_1_SPEC: BrugadaTypeSpec = {
  type: 'type-1',
  rhythmId: 'special.brugada-type-1',
  displayName: 'Brugada Type 1 — Coved',
  description:
    'The DIAGNOSTIC Brugada pattern. Coved ≥ 2 mm ST elevation in V1–V2 with a descending ST that flows into an inverted T wave.',
  diagnostic: true,
  leadFindings: {
    V1: {
      stElevationMm: 2,
      stMorphology: 'coved',
      tWavePolarity: 'inverted',
      note: 'Coved-type ST elevation ≥ 2 mm with descending ST → inverted T wave. Diagnostic.',
    },
    V2: {
      stElevationMm: 2,
      stMorphology: 'coved',
      tWavePolarity: 'inverted',
      note: 'Same coved morphology as V1.',
    },
  },
  diagnosticCriteria: [
    'Coved ST elevation ≥ 2 mm in V1 and/or V2',
    'Descending ST segment that flows into an inverted T wave',
    'Pattern persistent or unmasked by sodium-channel-blocker challenge',
    'Must be present in ≥ 1 right precordial lead (V1 or V2)',
  ],
  triggers: [
    'Fever (always re-ECG every febrile Brugada patient)',
    'Sodium-channel blockers (ajmaline, flecainide, procainamide) — used for provocation testing',
    'Increased vagal tone (post-meal, sleep)',
  ],
  pearls: [
    'Type 1 is the ONLY diagnostic pattern. Type 2 needs provocation to convert to Type 1.',
    'Events (VF, sudden death) typically occur at REST or during SLEEP, not exercise.',
    'ICD is the only proven therapy for high-risk patients.',
  ],
};

export const BRUGADA_TYPE_2_SPEC: BrugadaTypeSpec = {
  type: 'type-2',
  rhythmId: 'special.brugada-type-2',
  displayName: 'Brugada Type 2 — Saddleback',
  description:
    'Suggestive (not diagnostic) Brugada pattern. Saddleback ≥ 2 mm ST elevation in V1–V2 with positive or biphasic T wave.',
  diagnostic: false,
  leadFindings: {
    V1: {
      stElevationMm: 2,
      stMorphology: 'saddleback',
      tWavePolarity: 'positive',
      note: 'r\'-like elevation ≥ 2 mm → descends to ≥ 1 mm → positive or biphasic T wave.',
    },
    V2: {
      stElevationMm: 2,
      stMorphology: 'saddleback',
      tWavePolarity: 'positive',
      note: 'Same saddleback morphology as V1.',
    },
  },
  diagnosticCriteria: [
    'Saddleback ST elevation ≥ 2 mm in V1 and/or V2',
    'Upright or biphasic T wave (NOT inverted like Type 1)',
    'Requires provocation testing to convert to Type 1 for diagnosis',
  ],
  triggers: ['Fever, sodium-channel blockers, vagal tone — same triggers as Type 1.'],
  pearls: [
    'Type 2 alone is NOT diagnostic. It is suggestive and warrants further evaluation.',
    'Can be mimicked by V1–V2 lead misplacement (placed too high), pectus excavatum, incomplete RBBB.',
    'Provocation testing with ajmaline / flecainide / procainamide converts Type 2 to Type 1 in true Brugada.',
  ],
};

export const BRUGADA_TYPE_SPECS: readonly BrugadaTypeSpec[] = [BRUGADA_TYPE_1_SPEC, BRUGADA_TYPE_2_SPEC];

// ── WPW pathway localization ──────────────────────────────────────────

export type WPWPathwayLocation =
  | 'left-lateral'
  | 'left-posteroseptal'
  | 'right-anteroseptal'
  | 'right-free-wall';

export type DeltaPolarity = 'positive' | 'negative' | 'isoelectric' | 'negative-or-isoelectric' | 'isoelectric-or-positive';

export interface WPWPathwaySpec {
  location: WPWPathwayLocation;
  displayName: string;
  description: string;
  /** Approximate prevalence among WPW patients. */
  prevalenceApprox: string;
  /** Delta-wave polarity expected in each lead. */
  deltaPolarity: Record<ECGLead, DeltaPolarity>;
  /** Resulting QRS axis. */
  expectedAxis: 'normal' | 'left-axis-deviation' | 'right-axis-deviation';
  /** Patterns that the location commonly mimics on ECG. */
  mimics: readonly string[];
  pearls: readonly string[];
}

const wpwLeftLateral: WPWPathwaySpec = {
  location: 'left-lateral',
  displayName: 'Left lateral free wall',
  description: 'Most common WPW accessory pathway location. Pathway runs across the left lateral mitral annulus.',
  prevalenceApprox: '~50 %',
  deltaPolarity: {
    I: 'positive',
    II: 'positive',
    III: 'positive',
    aVR: 'negative',
    aVL: 'positive',
    aVF: 'positive',
    V1: 'negative',
    V2: 'isoelectric',
    V3: 'positive',
    V4: 'positive',
    V5: 'positive',
    V6: 'positive',
  },
  expectedAxis: 'normal',
  mimics: ['LBBB (negative delta in V1 + positive in V6)'],
  pearls: [
    'Most common location overall (~50 % of WPW pathways).',
    'Negative delta in V1 can mimic LBBB at first glance.',
  ],
};

const wpwLeftPosteroseptal: WPWPathwaySpec = {
  location: 'left-posteroseptal',
  displayName: 'Left posteroseptal',
  description: 'Pathway sits at the posterior-septal mitral annulus near the coronary sinus os.',
  prevalenceApprox: '~25 %',
  deltaPolarity: {
    I: 'positive',
    II: 'negative',
    III: 'negative',
    aVR: 'negative',
    aVL: 'positive',
    aVF: 'negative',
    V1: 'negative',
    V2: 'isoelectric',
    V3: 'positive',
    V4: 'positive',
    V5: 'positive',
    V6: 'positive',
  },
  expectedAxis: 'left-axis-deviation',
  mimics: ['Inferior MI (pseudo-Q waves in II, III, aVF from negative delta)'],
  pearls: [
    'Negative delta in inferior leads produces pseudo-inferior Q waves — can be mistaken for old inferior MI.',
    'Ablation often via the coronary sinus.',
  ],
};

const wpwRightAnteroseptal: WPWPathwaySpec = {
  location: 'right-anteroseptal',
  displayName: 'Right anteroseptal',
  description: 'Pathway near the AV node on the tricuspid annulus. Higher procedural risk of AV block during ablation.',
  prevalenceApprox: '~15 %',
  deltaPolarity: {
    I: 'isoelectric',
    II: 'positive',
    III: 'positive',
    aVR: 'negative',
    aVL: 'negative',
    aVF: 'positive',
    V1: 'positive',
    V2: 'positive',
    V3: 'positive',
    V4: 'positive',
    V5: 'positive',
    V6: 'positive',
  },
  expectedAxis: 'right-axis-deviation',
  mimics: ['RBBB / RVH (tall R in V1)'],
  pearls: [
    'Positive delta in V1 = mimics RBBB or RVH.',
    'Highest AV-block risk during ablation — proximity to the His bundle.',
  ],
};

const wpwRightFreeWall: WPWPathwaySpec = {
  location: 'right-free-wall',
  displayName: 'Right free wall',
  description: 'Pathway across the right lateral tricuspid annulus.',
  prevalenceApprox: '~10 %',
  deltaPolarity: {
    I: 'negative-or-isoelectric',
    II: 'positive',
    III: 'positive',
    aVR: 'negative',
    aVL: 'negative',
    aVF: 'positive',
    V1: 'positive',
    V2: 'positive',
    V3: 'positive',
    V4: 'positive',
    V5: 'positive',
    V6: 'isoelectric-or-positive',
  },
  expectedAxis: 'left-axis-deviation',
  mimics: ['Right-sided pathology generally'],
  pearls: [
    'Negative or isoelectric delta in lead I distinguishes from left-sided pathways.',
    'Ablation via the right atrium / tricuspid annulus.',
  ],
};

export const WPW_PATHWAY_SPECS: readonly WPWPathwaySpec[] = [
  wpwLeftLateral,
  wpwLeftPosteroseptal,
  wpwRightAnteroseptal,
  wpwRightFreeWall,
];

export const WPW_PATHWAY_BY_LOCATION: ReadonlyMap<WPWPathwayLocation, WPWPathwaySpec> = new Map(
  WPW_PATHWAY_SPECS.map((s) => [s.location, s]),
);

// ── LQTS subtypes ─────────────────────────────────────────────────────

export type LQTSubtype = 'LQT1' | 'LQT2' | 'LQT3' | 'JLNS' | 'Romano-Ward';

export interface LQTSSpec {
  subtype: LQTSubtype;
  rhythmId?: RhythmId;
  displayName: string;
  /** Causative gene. */
  gene: string;
  /** Affected ion current. */
  channel: string;
  /** Inheritance pattern. */
  inheritance: 'autosomal-dominant' | 'autosomal-recessive' | 'variable';
  /** Typical QTc at rest. */
  typicalQtcMs: number;
  /** T-wave morphology hallmark. */
  tWaveMorphology: 'broad-based' | 'low-amplitude-notched' | 'late-onset-peaked' | 'variable';
  /** Trigger for torsades. */
  triggerForTorsades: string;
  /** Distinguishing clinical features. */
  distinguishingFeatures: readonly string[];
  pearls: readonly string[];
}

const lqt1: LQTSSpec = {
  subtype: 'LQT1',
  displayName: 'LQT1',
  gene: 'KCNQ1',
  channel: 'IKs (slow delayed rectifier K⁺)',
  inheritance: 'autosomal-dominant',
  typicalQtcMs: 480,
  tWaveMorphology: 'broad-based',
  triggerForTorsades: 'Exercise — especially swimming',
  distinguishingFeatures: [
    'Broad-based T waves — wide and rounded',
    'QT does NOT shorten appropriately with exercise',
    'Most common subtype (~40 % of LQTS)',
  ],
  pearls: [
    'Swimming-triggered syncope or cardiac arrest in a young person → think LQT1.',
    'β-blockers are highly effective in LQT1; less so in LQT3.',
  ],
};

const lqt2: LQTSSpec = {
  subtype: 'LQT2',
  displayName: 'LQT2',
  gene: 'KCNH2 (HERG)',
  channel: 'IKr (rapid delayed rectifier K⁺)',
  inheritance: 'autosomal-dominant',
  typicalQtcMs: 500,
  tWaveMorphology: 'low-amplitude-notched',
  triggerForTorsades: 'Auditory stimuli (alarm clocks), emotional stress',
  distinguishingFeatures: [
    'Low-amplitude, bifid or notched T waves',
    'Sudden auditory stimuli or postpartum period are classic triggers',
    'Most common acquired (drug-induced) LQTS phenocopy',
  ],
  pearls: [
    'A young woman who collapses after the alarm clock goes off → LQT2.',
    'Avoid all QT-prolonging drugs in known LQT2 (huge list — check before any new prescription).',
  ],
};

const lqt3: LQTSSpec = {
  subtype: 'LQT3',
  displayName: 'LQT3',
  gene: 'SCN5A',
  channel: 'INa (Na channel — gain-of-function)',
  inheritance: 'autosomal-dominant',
  typicalQtcMs: 520,
  tWaveMorphology: 'late-onset-peaked',
  triggerForTorsades: 'Rest / sleep (bradycardia-dependent)',
  distinguishingFeatures: [
    'Long isoelectric ST segment followed by a narrow peaked T wave',
    'QT SHORTENS appropriately with exercise (unlike LQT1 / 2)',
    'Highest sudden-death risk per event — fewer events but more fatal',
  ],
  pearls: [
    'Events occur during rest or sleep — opposite trigger profile from LQT1.',
    'Mexiletine (sodium-channel blocker) can shorten the QT in LQT3 — opposite of what you would do in LQT2.',
    'β-blockers are LESS effective in LQT3 than LQT1 / 2.',
  ],
};

const jlns: LQTSSpec = {
  subtype: 'JLNS',
  displayName: 'Jervell and Lange-Nielsen syndrome',
  gene: 'KCNQ1 (homozygous) or KCNE1',
  channel: 'IKs — same as LQT1',
  inheritance: 'autosomal-recessive',
  typicalQtcMs: 550,
  tWaveMorphology: 'broad-based',
  triggerForTorsades: 'Exercise',
  distinguishingFeatures: [
    'Same ECG as LQT1 but more severe (QTc often > 550 ms)',
    'Associated with congenital sensorineural deafness',
    'Autosomal recessive — both parents are carriers',
  ],
  pearls: [
    'Congenitally deaf child with syncope or seizure → check QTc immediately.',
    'Higher sudden-death risk than autosomal-dominant LQTS — ICD threshold is lower.',
  ],
};

const romanoWard: LQTSSpec = {
  subtype: 'Romano-Ward',
  displayName: 'Romano-Ward syndrome',
  gene: 'Any LQTS gene',
  channel: 'Varies',
  inheritance: 'autosomal-dominant',
  typicalQtcMs: 480,
  tWaveMorphology: 'variable',
  triggerForTorsades: 'Subtype-dependent',
  distinguishingFeatures: [
    'Catch-all term for autosomal-dominant LQTS (can be LQT1, 2, 3, etc.)',
    'No deafness (distinguishes from JLNS)',
    'Clinical phenotype depends on the underlying subtype',
  ],
  pearls: [
    'Genotyping is required to distinguish from JLNS and to guide subtype-specific therapy.',
  ],
};

export const LQTS_SUBTYPE_SPECS: readonly LQTSSpec[] = [lqt1, lqt2, lqt3, jlns, romanoWard];

export const LQTS_BY_SUBTYPE: ReadonlyMap<LQTSubtype, LQTSSpec> = new Map(
  LQTS_SUBTYPE_SPECS.map((s) => [s.subtype, s]),
);
