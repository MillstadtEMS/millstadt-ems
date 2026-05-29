/**
 * Lead-reversal + positional ECG transforms.
 *
 * Real cardiac monitors occasionally produce wrong-looking ECGs because
 * the electrodes are on the wrong limbs or the wrong intercostal
 * spaces. This module defines the canonical reversal patterns + their
 * recognition rules, and exposes pure-TS transform functions that take
 * a normal 12-lead set and produce the misplaced one.
 *
 * Covered:
 *   - Limb-lead reversals (LA/RA, LA/LL, RA/LL, RA/LL/LA "complete reversal")
 *   - V1/V2 misplacement (too high — produces South African Flag artifact)
 *   - Dextrocardia (true anatomic mirroring — distinct from reversal)
 *
 * Pure TypeScript. No React / RN / Skia imports.
 */

import type { ECGLead } from './leadTypes';

export type LimbReversalKind =
  | 'la-ra-reversal'
  | 'la-ll-reversal'
  | 'ra-ll-reversal'
  | 'complete-limb-reversal';

export type PositionalArtifact = 'v1-v2-too-high' | 'dextrocardia';

// ── Lead-amplitude shape used by the transform functions ──────────────

export interface LeadAmplitudes {
  p: number;
  q: number;
  r: number;
  s: number;
  t: number;
}

export type LeadSet = Partial<Record<ECGLead, LeadAmplitudes>>;

const invert = (a: LeadAmplitudes): LeadAmplitudes => ({
  p: -a.p,
  q: -a.q,
  r: -a.r,
  s: -a.s,
  t: -a.t,
});

const cloneAmps = (a: LeadAmplitudes): LeadAmplitudes => ({ ...a });

// ── Limb-lead reversals ───────────────────────────────────────────────

/**
 * LA / RA reversal — the most common limb-lead reversal in clinical
 * practice. Resulting ECG:
 *   - Lead I inverts entirely (P + QRS + T all flip)
 *   - Leads II and III swap
 *   - aVR and aVL swap
 *   - aVF unchanged
 *   - All precordial leads unchanged (key distinguisher from dextrocardia)
 */
export function applyLARAReversal(leads: LeadSet): LeadSet {
  const out: LeadSet = {};
  if (leads.I) out.I = invert(leads.I);
  if (leads.II && leads.III) {
    out.II = cloneAmps(leads.III);
    out.III = cloneAmps(leads.II);
  } else {
    if (leads.II) out.II = cloneAmps(leads.II);
    if (leads.III) out.III = cloneAmps(leads.III);
  }
  if (leads.aVR && leads.aVL) {
    out.aVR = cloneAmps(leads.aVL);
    out.aVL = cloneAmps(leads.aVR);
  } else {
    if (leads.aVR) out.aVR = cloneAmps(leads.aVR);
    if (leads.aVL) out.aVL = cloneAmps(leads.aVL);
  }
  if (leads.aVF) out.aVF = cloneAmps(leads.aVF);
  for (const v of ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) {
    if (leads[v]) out[v] = cloneAmps(leads[v]!);
  }
  return out;
}

/**
 * LA / LL reversal — left arm and left leg electrodes swapped.
 *   - Lead I unchanged
 *   - Lead II and Lead III swap
 *   - aVL and aVF swap
 *   - aVR unchanged
 *   - All precordials unchanged
 */
export function applyLALLReversal(leads: LeadSet): LeadSet {
  const out: LeadSet = {};
  if (leads.I) out.I = cloneAmps(leads.I);
  if (leads.II && leads.III) {
    out.II = cloneAmps(leads.III);
    out.III = cloneAmps(leads.II);
  }
  if (leads.aVL && leads.aVF) {
    out.aVL = cloneAmps(leads.aVF);
    out.aVF = cloneAmps(leads.aVL);
  }
  if (leads.aVR) out.aVR = cloneAmps(leads.aVR);
  for (const v of ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) {
    if (leads[v]) out[v] = cloneAmps(leads[v]!);
  }
  return out;
}

/**
 * RA / LL reversal — right arm and left leg electrodes swapped.
 *   - Lead I inverts
 *   - Lead II inverts
 *   - Lead III inverts
 *   - aVR becomes aVF (positive)
 *   - aVF becomes aVR (negative)
 *   - All precordials unchanged
 */
export function applyRALLReversal(leads: LeadSet): LeadSet {
  const out: LeadSet = {};
  if (leads.I) out.I = invert(leads.I);
  if (leads.II) out.II = invert(leads.II);
  if (leads.III) out.III = invert(leads.III);
  if (leads.aVR && leads.aVF) {
    // aVR <-> aVF with polarity adjustments
    out.aVR = invert(leads.aVF);
    out.aVF = invert(leads.aVR);
  }
  if (leads.aVL) out.aVL = invert(leads.aVL);
  for (const v of ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const) {
    if (leads[v]) out[v] = cloneAmps(leads[v]!);
  }
  return out;
}

// ── V1 / V2 misplacement (placed too high — 2nd ICS instead of 4th) ───

/**
 * When V1 and V2 are placed in the 2nd intercostal space instead of
 * the 4th, the recorded waveform develops:
 *   - rSr' pattern in V1–V2 (can mimic incomplete RBBB or Brugada Type 2)
 *   - Apparent poor R-wave progression
 *   - Negative P wave in V1 (the "South African Flag sign" signature)
 *
 * Repeat ECG with correct lead placement resolves the artifact.
 */
export function applyV1V2TooHigh(leads: LeadSet): LeadSet {
  const out: LeadSet = { ...leads };
  if (leads.V1) {
    out.V1 = {
      p: -Math.abs(leads.V1.p) * 0.8, // P becomes negative
      q: leads.V1.q,
      r: leads.V1.r * 0.6, // smaller R
      s: leads.V1.s * 1.1, // deeper S
      t: -Math.abs(leads.V1.t) * 0.5, // T flips toward inversion
    };
  }
  if (leads.V2) {
    out.V2 = {
      p: leads.V2.p * 0.2, // P flattens or becomes isoelectric/negative
      q: leads.V2.q,
      r: leads.V2.r * 0.7,
      s: leads.V2.s * 1.05,
      t: leads.V2.t,
    };
  }
  return out;
}

// ── Dextrocardia (true anatomic, not a reversal artifact) ─────────────

/**
 * Dextrocardia: the heart is anatomically right-sided. Resulting ECG:
 *   - Lead I: all three components (P, QRS, T) inverted
 *   - aVR and aVL appear swapped
 *   - REVERSE R-wave progression: R is tallest in V1 and gets SMALLER toward V6
 *   - Distinguishes from LA/RA reversal because precordials ARE abnormal
 *
 * Diagnostic clue: do a right-sided 12-lead. Precordials look normal.
 */
export function applyDextrocardia(leads: LeadSet): LeadSet {
  const out: LeadSet = {};
  if (leads.I) out.I = invert(leads.I);
  if (leads.II) out.II = cloneAmps(leads.II);
  if (leads.III) out.III = cloneAmps(leads.III);
  if (leads.aVR && leads.aVL) {
    out.aVR = cloneAmps(leads.aVL);
    out.aVL = cloneAmps(leads.aVR);
  }
  if (leads.aVF) out.aVF = cloneAmps(leads.aVF);
  // True precordial mirroring: V1↔V6, V2↔V5, V3↔V4. This reproduces
  // the textbook "reverse R-wave progression" — V1 inherits V6's tall
  // R, V6 inherits V1's small R / deep S.
  const mirrorPairs: ReadonlyArray<[ECGLead, ECGLead]> = [
    ['V1', 'V6'],
    ['V2', 'V5'],
    ['V3', 'V4'],
  ];
  for (const [a, b] of mirrorPairs) {
    const ampA = leads[a];
    const ampB = leads[b];
    if (ampA && ampB) {
      out[a] = cloneAmps(ampB);
      out[b] = cloneAmps(ampA);
    } else {
      if (ampA) out[a] = cloneAmps(ampA);
      if (ampB) out[b] = cloneAmps(ampB);
    }
  }
  return out;
}

// ── Recognition rules (clinical clues, not transforms) ────────────────

export interface ReversalRecognitionRule {
  kind: LimbReversalKind | PositionalArtifact;
  displayName: string;
  /** Diagnostic clues a clinician sees on the strip. */
  clues: readonly string[];
  /** What distinguishes this from look-alikes. */
  distinguishingFrom: readonly string[];
  /** How to fix it. */
  fix: string;
}

export const REVERSAL_RECOGNITION_RULES: readonly ReversalRecognitionRule[] = [
  {
    kind: 'la-ra-reversal',
    displayName: 'LA / RA limb reversal',
    clues: [
      'Inverted P wave AND inverted QRS in lead I',
      'Negative P in lead I (the most reliable single clue)',
      'Lead II and lead III appear swapped',
      'aVR and aVL appear swapped',
      'Precordial leads (V1–V6) look NORMAL',
    ],
    distinguishingFrom: [
      'Dextrocardia: precordials are ABNORMAL (reverse R progression) in dextrocardia.',
      'Ectopic atrial rhythm with negative P in I: precordials look normal, but lead II would not "match" lead III.',
    ],
    fix: 'Re-record after swapping LA and RA electrodes.',
  },
  {
    kind: 'la-ll-reversal',
    displayName: 'LA / LL limb reversal',
    clues: [
      'Lead I unchanged',
      'Lead II and lead III appear swapped',
      'aVL and aVF appear swapped',
      'Precordials unchanged',
      'Often subtle — small differences in P-wave morphology between II and III give it away',
    ],
    distinguishingFrom: ['Inferior MI (true Q waves remain after correct placement)'],
    fix: 'Re-record after swapping LA and LL electrodes.',
  },
  {
    kind: 'ra-ll-reversal',
    displayName: 'RA / LL limb reversal',
    clues: [
      'Leads I, II, III all inverted',
      'aVR and aVF swap polarity',
      'aVL inverts',
      'Precordials unchanged',
      'Looks like global limb-lead artifact — uncommon but striking',
    ],
    distinguishingFrom: ['Dextrocardia (precordials would also be abnormal)'],
    fix: 'Re-record after swapping RA and LL electrodes.',
  },
  {
    kind: 'complete-limb-reversal',
    displayName: 'Complete limb-lead reversal (all three swapped)',
    clues: ['Highly unusual; multiple limb leads appear wrong simultaneously.'],
    distinguishingFrom: ['Multiple individual reversals — same fix.'],
    fix: 'Re-record with electrodes verified on the correct limbs.',
  },
  {
    kind: 'v1-v2-too-high',
    displayName: 'V1 / V2 placed too high (2nd ICS)',
    clues: [
      'rSr\' pattern appears in V1–V2 that was not there before',
      'Negative or biphasic P wave in V1 — the "South African Flag" giveaway',
      'Apparent Brugada Type 2 pattern that resolves with correct placement',
      'Poor R-wave progression that resolves with correct placement',
    ],
    distinguishingFrom: [
      'True incomplete RBBB (pattern persists with correct placement)',
      'True Brugada Type 2 (persists with correct placement)',
    ],
    fix: 'Re-record with V1–V2 at the 4th intercostal space at the right and left sternal borders.',
  },
  {
    kind: 'dextrocardia',
    displayName: 'Dextrocardia (true anatomic)',
    clues: [
      'Lead I: all three components (P + QRS + T) inverted',
      'aVR and aVL appear swapped',
      'REVERSE R-wave progression in precordials — R is tallest in V1 and shrinks toward V6',
      'Suspect when chest X-ray shows right-sided cardiac silhouette',
    ],
    distinguishingFrom: [
      'LA / RA reversal: precordials look NORMAL in reversal; they are ABNORMAL in dextrocardia.',
    ],
    fix: 'Record a right-sided 12-lead with the precordial leads mirrored across the sternum.',
  },
];

export const REVERSAL_RULE_BY_KIND: ReadonlyMap<
  LimbReversalKind | PositionalArtifact,
  ReversalRecognitionRule
> = new Map(REVERSAL_RECOGNITION_RULES.map((r) => [r.kind, r]));
