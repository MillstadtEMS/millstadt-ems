/**
 * Subtle ischemia / STEMI-equivalent pattern specs.
 *
 * Companion to `coronaryTerritory.ts` (which describes WHERE STEMIs come
 * from). This module describes the four "STEMI-equivalent" or
 * "must-not-miss" patterns that appear on a 12-lead WITHOUT classic
 * ST elevation:
 *
 *   - De Winter (proximal LAD occlusion equivalent)
 *   - Wellens Type A (biphasic T waves V2-V3)
 *   - Wellens Type B (deep symmetric T inversions V2-V3)
 *   - Aslanger (inferior OMI with concomitant multivessel disease)
 *   - South African Flag (high-lateral OMI from D1 occlusion)
 *
 * Each entry is the *clinical-truth* envelope the 12-lead pattern
 * renderer should produce, and the data layer that quiz authors,
 * teaching cards, and the validation engine can all reference.
 *
 * Pure TypeScript. No React / RN / Skia imports.
 */

import type { ECGLead } from './leadTypes';
import type { RhythmId } from './types';

export type IschemiaPatternKind = 'de-winter' | 'wellens-a' | 'wellens-b' | 'aslanger' | 'south-african-flag';

export interface LeadFinding {
  /** Required ST elevation in mm (J-point). 0 if not the salient feature. */
  stElevationMm?: number;
  /** Required ST depression in mm. */
  stDepressionMm?: number;
  /** ST morphology when an elevation is present. */
  stMorphology?: 'convex' | 'concave' | 'coved' | 'horizontal' | 'upsloping';
  /** T wave amplitude / shape requirements. */
  tWave?: {
    amplitudeMm?: number;
    polarity?: 'upright' | 'inverted' | 'biphasic';
    morphology?: 'symmetric-peaked' | 'broad-asymmetric' | 'symmetric-inverted' | 'biphasic-positive-then-negative';
  };
  /** Free-form note (rendered as a teaching tooltip). */
  note?: string;
}

export interface IschemiaPatternSpec {
  kind: IschemiaPatternKind;
  rhythmId: RhythmId;
  displayName: string;
  /** One-line description for chart and quiz contexts. */
  description: string;
  /** Whether this pattern is a STEMI-equivalent (cath-lab worthy). */
  isStemiEquivalent: boolean;
  /** Most likely culprit vessel (link back to coronaryTerritory module). */
  culpritVessel: 'LAD' | 'LAD-proximal' | 'LAD-diagonal' | 'LCx' | 'RCA-or-LCx' | 'multivessel';
  /** Lead-by-lead expected findings. */
  leadFindings: Partial<Record<ECGLead, LeadFinding>>;
  /** Diagnostic criteria — required for the pattern to "count." */
  diagnosticCriteria: readonly string[];
  /** Features that must NOT be present (i.e. would disprove the pattern). */
  mustNotHave?: readonly string[];
  /** Clinical pearls / tips for the learner. */
  pearls: readonly string[];
}

// ── De Winter ─────────────────────────────────────────────────────────

const deWinter: IschemiaPatternSpec = {
  kind: 'de-winter',
  rhythmId: 'ischemia.de-winter',
  displayName: 'De Winter T waves',
  description: 'Acute LAD occlusion WITHOUT classic ST elevation — upsloping ST depression at the J-point that flows into tall, symmetric peaked T waves across V1–V6, with ST elevation in aVR.',
  isStemiEquivalent: true,
  culpritVessel: 'LAD-proximal',
  leadFindings: {
    V1: {
      stDepressionMm: 1,
      stMorphology: 'upsloping',
      tWave: { amplitudeMm: 6, polarity: 'upright', morphology: 'symmetric-peaked' },
      note: 'Upsloping ST depression flowing into a tall peaked T wave.',
    },
    V2: {
      stDepressionMm: 2.5,
      stMorphology: 'upsloping',
      tWave: { amplitudeMm: 8, polarity: 'upright', morphology: 'symmetric-peaked' },
    },
    V3: {
      stDepressionMm: 2.5,
      stMorphology: 'upsloping',
      tWave: { amplitudeMm: 10, polarity: 'upright', morphology: 'symmetric-peaked' },
    },
    V4: {
      stDepressionMm: 2,
      stMorphology: 'upsloping',
      tWave: { amplitudeMm: 8, polarity: 'upright', morphology: 'symmetric-peaked' },
    },
    V5: {
      stDepressionMm: 1,
      stMorphology: 'upsloping',
      tWave: { amplitudeMm: 4, polarity: 'upright', morphology: 'symmetric-peaked' },
    },
    V6: {
      stDepressionMm: 0.5,
      stMorphology: 'upsloping',
      tWave: { amplitudeMm: 3, polarity: 'upright', morphology: 'symmetric-peaked' },
    },
    aVR: {
      stElevationMm: 1.5,
      stMorphology: 'convex',
      note: 'aVR ST elevation is part of the pattern.',
    },
  },
  diagnosticCriteria: [
    'Upsloping ST depression ≥ 1 mm at the J-point in V1–V6',
    'Tall, symmetric, peaked T waves across the precordial leads',
    'ST elevation ≥ 0.5 mm in aVR',
    'No classic ST elevation in V1–V6',
    'Preserved R-wave amplitude (no completed infarction)',
  ],
  mustNotHave: [
    'Convex ST elevation in V1–V6',
    'Pathologic Q waves',
    'Inverted T waves (would suggest Wellens instead)',
  ],
  pearls: [
    'De Winter pattern is STATIC — it does NOT evolve through classic STEMI stages. The treatment is immediate cath, not serial ECGs.',
    'Looks like hyperkalemia at first glance (tall peaked T waves), but the QRS is narrow and there is upsloping ST depression instead of widening.',
    'Reported in ~2 % of acute LAD occlusions.',
  ],
};

// ── Wellens Type A (biphasic T) ───────────────────────────────────────

const wellensA: IschemiaPatternSpec = {
  kind: 'wellens-a',
  rhythmId: 'ischemia.wellens-type-a',
  displayName: 'Wellens Type A (biphasic T)',
  description: 'Pain-free interval after recent ischemia — biphasic T waves in V2–V3 (positive then negative) indicating critical proximal LAD stenosis.',
  isStemiEquivalent: false,
  culpritVessel: 'LAD-proximal',
  leadFindings: {
    V1: {
      tWave: { polarity: 'biphasic', morphology: 'biphasic-positive-then-negative', amplitudeMm: 2 },
    },
    V2: {
      tWave: { polarity: 'biphasic', morphology: 'biphasic-positive-then-negative', amplitudeMm: 2 },
      stElevationMm: 0,
      note: 'Initial positive deflection then terminal inversion. Isoelectric ST.',
    },
    V3: {
      tWave: { polarity: 'biphasic', morphology: 'biphasic-positive-then-negative', amplitudeMm: 2 },
      stElevationMm: 0,
    },
  },
  diagnosticCriteria: [
    'History of recent angina (now pain-free)',
    'Biphasic T waves in V2 and V3 — initial positive deflection then terminal inversion',
    'Isoelectric or minimal ST elevation (< 1 mm)',
    'No pathologic Q waves',
    'Preserved R-wave progression',
    'Normal or minimally elevated troponin',
  ],
  pearls: [
    'Type A accounts for ~25 % of Wellens presentations. Type B (deep T inversion) is the more common 75 %.',
    'Patients are typically PAIN FREE when the Wellens pattern is seen. During pain the ECG often shows anterior STE.',
    'Do NOT stress test. Proceed directly to angiography.',
  ],
};

// ── Wellens Type B (deep inverted T) ──────────────────────────────────

const wellensB: IschemiaPatternSpec = {
  kind: 'wellens-b',
  rhythmId: 'ischemia.wellens-type-b',
  displayName: 'Wellens Type B (deep inverted T)',
  description: 'Deep, symmetric T-wave inversions in V2–V3 (often extending to V1, V4–V6) in a pain-free patient — critical proximal LAD stenosis.',
  isStemiEquivalent: false,
  culpritVessel: 'LAD-proximal',
  leadFindings: {
    V1: { tWave: { polarity: 'inverted', amplitudeMm: 4, morphology: 'symmetric-inverted' } },
    V2: {
      tWave: { polarity: 'inverted', amplitudeMm: 8, morphology: 'symmetric-inverted' },
      stElevationMm: 0,
      note: 'Deep, symmetric T inversion. Isoelectric ST.',
    },
    V3: {
      tWave: { polarity: 'inverted', amplitudeMm: 8, morphology: 'symmetric-inverted' },
      stElevationMm: 0,
    },
    V4: { tWave: { polarity: 'inverted', amplitudeMm: 6, morphology: 'symmetric-inverted' } },
    V5: { tWave: { polarity: 'inverted', amplitudeMm: 4, morphology: 'symmetric-inverted' } },
    V6: { tWave: { polarity: 'inverted', amplitudeMm: 2, morphology: 'symmetric-inverted' } },
  },
  diagnosticCriteria: [
    'History of recent angina (now pain-free)',
    'Deep symmetric T-wave inversions in V2–V3',
    'Frequently extends to V1, V4–V6',
    'Isoelectric or minimal ST elevation (< 1 mm)',
    'No pathologic Q waves',
    'Preserved R-wave progression',
  ],
  pearls: [
    'Type B is ~75 % of Wellens presentations — the more common form.',
    'T inversions can normalize transiently during chest pain, then re-deepen when pain resolves.',
    'Same disposition as Type A — straight to cath, no stress test.',
  ],
};

// ── Aslanger (inferior OMI in setting of multivessel disease) ─────────

const aslanger: IschemiaPatternSpec = {
  kind: 'aslanger',
  rhythmId: 'ischemia.aslanger',
  displayName: 'Aslanger pattern (inferior OMI)',
  description: 'Subtle inferior OMI masked by concomitant multivessel ischemia — STE only in lead III, reciprocal STD in aVL, plus diffuse subendocardial ischemia changes.',
  isStemiEquivalent: true,
  culpritVessel: 'multivessel',
  leadFindings: {
    III: {
      stElevationMm: 1.5,
      stMorphology: 'convex',
      tWave: { polarity: 'upright' },
      note: 'STE in III is the only lead with elevation — easy to miss.',
    },
    II: {
      stElevationMm: 0,
      note: 'NO ST elevation in II (key feature — distinguishes from a typical inferior STEMI).',
    },
    aVL: {
      stDepressionMm: 1,
      tWave: { polarity: 'inverted' },
      note: 'Reciprocal depression confirms inferior involvement.',
    },
    aVF: { stElevationMm: 0, note: 'Minimal or no STE in aVF.' },
    V1: { stElevationMm: 0.5, note: 'STE ≤ 1 mm in V1.' },
    V2: { stDepressionMm: 0.5 },
    V3: { stDepressionMm: 0.5 },
    V4: { stDepressionMm: 1, tWave: { polarity: 'upright' }, note: 'STD with a POSITIVE T wave — subendocardial ischemia from concomitant disease.' },
    V5: { stDepressionMm: 1, tWave: { polarity: 'upright' } },
    V6: { stDepressionMm: 0.5, tWave: { polarity: 'upright' } },
  },
  diagnosticCriteria: [
    'ST elevation in lead III BUT NOT in lead II',
    'Reciprocal ST depression in aVL',
    'ST depression with positive/isoelectric T wave in at least one of V1–V6',
    'ST elevation in V1 ≤ 1 mm',
  ],
  pearls: [
    'Aslanger is the textbook example of "OMI without STEMI criteria" — activate cath lab anyway.',
    'The diffuse subendocardial ischemia "cancels out" the expected STE in II and aVF.',
    'Highly specific for acute coronary occlusion with concomitant multivessel disease.',
  ],
};

// ── South African Flag (high-lateral OMI from D1 occlusion) ───────────

const southAfricanFlag: IschemiaPatternSpec = {
  kind: 'south-african-flag',
  rhythmId: 'ischemia.south-african-flag',
  displayName: 'South African Flag sign',
  description: 'High-lateral OMI: ST elevation in lead I + aVL + V2 with reciprocal depression in lead III — pattern resembles the South African flag when leads are arranged in 12-lead grid order.',
  isStemiEquivalent: true,
  culpritVessel: 'LAD-diagonal',
  leadFindings: {
    I: {
      stElevationMm: 1,
      stMorphology: 'convex',
      tWave: { polarity: 'upright' },
      note: 'High-lateral STE — part of the "flag" pattern.',
    },
    aVL: {
      stElevationMm: 1.5,
      stMorphology: 'convex',
      tWave: { polarity: 'upright' },
    },
    V2: {
      stElevationMm: 1,
      stMorphology: 'convex',
      tWave: { polarity: 'upright' },
      note: 'V2 elevation completes the flag.',
    },
    III: {
      stDepressionMm: 1,
      tWave: { polarity: 'inverted' },
      note: 'Reciprocal depression in III (the green stripe of the flag).',
    },
    aVF: { stElevationMm: 0, note: 'Quiet aVF — distinguishes from inferior STEMI.' },
    II: { stElevationMm: 0 },
  },
  diagnosticCriteria: [
    'ST elevation in lead I',
    'ST elevation in aVL',
    'ST elevation in V2',
    'Reciprocal ST depression in lead III',
    'Inferior leads (II, aVF) quiet',
  ],
  pearls: [
    'Indicates occlusion of the first diagonal branch (D1) of the LAD.',
    'Treat as STEMI — activate cath lab.',
    'When V1–V2 are placed too high (2nd ICS instead of 4th), an apparent SAF pattern can be artifactual; repeat with correct lead placement before activating.',
  ],
};

// ── Registry + helpers ────────────────────────────────────────────────

export const ISCHEMIA_PATTERN_SPECS: readonly IschemiaPatternSpec[] = [
  deWinter,
  wellensA,
  wellensB,
  aslanger,
  southAfricanFlag,
];

export const ISCHEMIA_PATTERN_BY_KIND: ReadonlyMap<IschemiaPatternKind, IschemiaPatternSpec> = new Map(
  ISCHEMIA_PATTERN_SPECS.map((p) => [p.kind, p]),
);

export const ISCHEMIA_PATTERN_BY_RHYTHM_ID: ReadonlyMap<RhythmId, IschemiaPatternSpec> = new Map(
  ISCHEMIA_PATTERN_SPECS.map((p) => [p.rhythmId, p]),
);

/** Lookup. */
export function ischemiaPatternFor(id: RhythmId): IschemiaPatternSpec | undefined {
  return ISCHEMIA_PATTERN_BY_RHYTHM_ID.get(id);
}

/**
 * STEMI-equivalents that demand immediate cath — used by teaching cards
 * and the alarm/decision engines.
 */
export function stemiEquivalents(): readonly IschemiaPatternSpec[] {
  return ISCHEMIA_PATTERN_SPECS.filter((p) => p.isStemiEquivalent);
}
