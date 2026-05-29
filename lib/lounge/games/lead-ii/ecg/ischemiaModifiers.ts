/**
 * Ischemia / STEMI / Sgarbossa modifiers.
 *
 * Each modifier takes a base 12-lead ECG and returns a new 12-lead ECG with
 * ST-segment changes applied per territory:
 *
 *   - STEMI territories: elevation in affected leads, reciprocal depression
 *     in opposite leads.
 *   - ST depression (non-territorial): depression in lateral leads only.
 *   - Posterior STEMI: depression + tall R in V1–V3 (mirror image; we do
 *     not implement V7–V9 yet — see the 11-pattern catalog header).
 *   - Sgarbossa / Modified Sgarbossa: composes ON TOP of LBBB. Adds
 *     concordant or excessively-discordant ST changes that satisfy the
 *     criteria. Educational simulation — does not claim diagnostic accuracy.
 *
 * Implementation: ST elevation/depression is rendered as a constant offset
 * applied to the time window between QRS-end and T-wave onset in the
 * affected leads. This is a single-lead approximation — we don't model the
 * full ST segment morphology, just the elevation/depression magnitude.
 */

import type { GeneratedECGSignal } from './types';
import type { ECGLead } from './leadTypes';
import type { TwelveLeadECG } from './twelveLeadTypes';

/**
 * For each beat in `events`, find the ST window (from QRS-end ≈ R+40ms
 * to T-onset ≈ T-50ms) and add `elevationMv` to the signal.
 *
 * Negative `elevationMv` produces ST depression.
 */
function applyStShift(
  signal: GeneratedECGSignal,
  elevationMv: number,
): GeneratedECGSignal {
  if (Math.abs(elevationMv) < 1e-6) return signal;
  // ST window: 40ms after QRS-R to 50ms before T-wave center.
  // Sometimes events lack T markers (e.g., AFib has only QRS) — we still
  // shift a fixed 200ms window after each QRS as a fallback.
  const qrsEvents = signal.events.filter(
    (e) => e.kind === 'qrs-narrow' || e.kind === 'qrs-wide',
  );
  const tEvents = signal.events.filter((e) => e.kind === 't-wave');

  const points = signal.points.map((p) => {
    for (const qrs of qrsEvents) {
      const stStart = qrs.tSec + 0.040;
      // Find the next T after this QRS, fall back to qrs + 0.250 s.
      const nextT = tEvents.find((t) => t.tSec > qrs.tSec);
      const stEnd = nextT ? nextT.tSec - 0.050 : qrs.tSec + 0.240;
      if (p.t >= stStart && p.t <= stEnd) {
        return { t: p.t, mv: p.mv + elevationMv };
      }
    }
    return p;
  });
  return { ...signal, points };
}

/**
 * Add a "tall R" boost to V1–V3 — used for posterior STEMI's mirror picture.
 */
function applyTallR(
  signal: GeneratedECGSignal,
  boostMv: number,
): GeneratedECGSignal {
  if (Math.abs(boostMv) < 1e-6) return signal;
  const qrsEvents = signal.events.filter(
    (e) => e.kind === 'qrs-narrow' || e.kind === 'qrs-wide',
  );
  const points = signal.points.map((p) => {
    for (const qrs of qrsEvents) {
      const dist = Math.abs(p.t - qrs.tSec);
      if (dist < 0.020) {
        return { t: p.t, mv: p.mv + boostMv };
      }
    }
    return p;
  });
  return { ...signal, points };
}

interface StTerritory {
  patternId: 'ischemia.inferior-stemi' | 'ischemia.anterior-stemi'
    | 'ischemia.lateral-stemi' | 'ischemia.anterolateral-stemi'
    | 'ischemia.septal-stemi' | 'ischemia.posterior-stemi'
    | 'ischemia.st-depression';
  /** Leads where ST elevates (or depresses for non-STEMI / posterior). */
  affected: readonly ECGLead[];
  /** Reciprocal leads showing opposite ST shift. */
  reciprocal: readonly ECGLead[];
  /** ST elevation magnitude in mV (negative = depression). */
  primaryShiftMv: number;
  /** Reciprocal shift magnitude. */
  reciprocalShiftMv: number;
  category: 'stemi' | 'ischemia';
  hints: readonly string[];
  /** Posterior STEMI uses tall R in V1–V3. */
  tallRLeads?: readonly ECGLead[];
}

const ST_TERRITORIES: Record<StTerritory['patternId'], StTerritory> = {
  'ischemia.inferior-stemi': {
    patternId: 'ischemia.inferior-stemi',
    affected: ['II', 'III', 'aVF'],
    reciprocal: ['I', 'aVL'],
    primaryShiftMv: 0.30,
    reciprocalShiftMv: -0.15,
    category: 'stemi',
    hints: [
      'ST elevation in II, III, aVF (inferior wall)',
      'Reciprocal ST depression in I and aVL',
      'Get a right-sided ECG to look for RV involvement',
    ],
  },
  'ischemia.anterior-stemi': {
    patternId: 'ischemia.anterior-stemi',
    affected: ['V2', 'V3', 'V4'],
    reciprocal: ['II', 'III', 'aVF'],
    primaryShiftMv: 0.35,
    reciprocalShiftMv: -0.10,
    category: 'stemi',
    hints: [
      'ST elevation across the anterior precordial leads (V2–V4)',
      'LAD territory — large infarct risk; watch for cardiogenic shock',
    ],
  },
  'ischemia.lateral-stemi': {
    patternId: 'ischemia.lateral-stemi',
    affected: ['I', 'aVL', 'V5', 'V6'],
    reciprocal: ['III', 'aVF'],
    primaryShiftMv: 0.25,
    reciprocalShiftMv: -0.10,
    category: 'stemi',
    hints: [
      'ST elevation in I, aVL, V5, V6 (lateral wall)',
      'Reciprocal depression inferiorly',
    ],
  },
  'ischemia.anterolateral-stemi': {
    patternId: 'ischemia.anterolateral-stemi',
    affected: ['V3', 'V4', 'V5', 'V6', 'I', 'aVL'],
    reciprocal: ['III', 'aVF'],
    primaryShiftMv: 0.30,
    reciprocalShiftMv: -0.10,
    category: 'stemi',
    hints: [
      'ST elevation across anterior + lateral leads',
      'Combined LAD territory — anticipate hemodynamic compromise',
    ],
  },
  'ischemia.septal-stemi': {
    patternId: 'ischemia.septal-stemi',
    affected: ['V1', 'V2'],
    reciprocal: [],
    primaryShiftMv: 0.30,
    reciprocalShiftMv: 0,
    category: 'stemi',
    hints: [
      'ST elevation localized to V1–V2 (septal)',
      'Often combined with anterior STEMI as anteroseptal',
    ],
  },
  'ischemia.posterior-stemi': {
    patternId: 'ischemia.posterior-stemi',
    affected: ['V1', 'V2', 'V3'],
    reciprocal: [],
    // Negative shift = depression in V1–V3 (mirror image of posterior elevation)
    primaryShiftMv: -0.25,
    reciprocalShiftMv: 0,
    category: 'stemi',
    hints: [
      'ST DEPRESSION in V1–V3 with tall R waves — mirror image of posterior wall STEMI',
      '"STEMI equivalent" — get posterior leads (V7–V9) to confirm',
    ],
    tallRLeads: ['V1', 'V2', 'V3'],
  },
  'ischemia.st-depression': {
    patternId: 'ischemia.st-depression',
    affected: ['V4', 'V5', 'V6', 'I', 'II'],
    reciprocal: [],
    primaryShiftMv: -0.20,
    reciprocalShiftMv: 0,
    category: 'ischemia',
    hints: [
      'Diffuse ST depression — subendocardial ischemia',
      'Always check the opposite wall for primary STEMI',
    ],
  },
};

/**
 * Apply a STEMI / ischemia territory to a base 12-lead ECG.
 */
export function applyIschemiaTerritory(
  base: TwelveLeadECG,
  territoryId: StTerritory['patternId'],
): TwelveLeadECG {
  const t = ST_TERRITORIES[territoryId];
  const newLeads = { ...base.leads };

  for (const lead of t.affected) {
    let s = applyStShift(newLeads[lead], t.primaryShiftMv);
    if (t.tallRLeads?.includes(lead)) {
      s = applyTallR(s, 0.50);
    }
    newLeads[lead] = s;
  }
  for (const lead of t.reciprocal) {
    newLeads[lead] = applyStShift(newLeads[lead], t.reciprocalShiftMv);
  }

  return {
    ...base,
    patternIds: [...base.patternIds, territoryId],
    leads: newLeads,
    interpretationHints: [...base.interpretationHints, ...t.hints],
    metadata: {
      ...base.metadata,
      ischemiaPatternId: territoryId,
      affectedLeads: t.affected,
      reciprocalLeads: t.reciprocal,
      patternCategory: t.category,
    },
  };
}

// ════════════════════════════════════════════════════════════════════
//  Sgarbossa / Modified Sgarbossa (compose on LBBB)
// ════════════════════════════════════════════════════════════════════

/**
 * Sgarbossa criteria are diagnostic for MI in the setting of LBBB or
 * ventricular paced rhythms. We compose on a base that already had LBBB
 * applied:
 *
 *   1. Concordant ST elevation ≥ 1 mm in any lead with positive QRS.
 *   2. Concordant ST depression ≥ 1 mm in V1–V3.
 *   3. Discordant ST elevation > 5 mm (classic) or ST/S ratio ≤ −0.25 (modified).
 *
 * For Phase 6 we model criterion 1 (concordant ST elevation in I, V5, V6 —
 * leads where LBBB makes QRS dominantly positive) for both classic and
 * modified Sgarbossa, with metadata distinguishing them. The visual is
 * recognizable; full criterion modelling can come with a future pass.
 */
export function applySgarbossa(base: TwelveLeadECG): TwelveLeadECG {
  const newLeads = { ...base.leads };
  const concordantLeads: ECGLead[] = ['I', 'V5', 'V6'];
  for (const lead of concordantLeads) {
    newLeads[lead] = applyStShift(newLeads[lead], 0.20); // ≥ 1 mm concordant STE
  }
  return {
    ...base,
    patternIds: [...base.patternIds, 'ischemia.sgarbossa'],
    leads: newLeads,
    interpretationHints: [
      ...base.interpretationHints,
      'Concordant ST elevation ≥ 1 mm in lead with positive QRS — Sgarbossa criterion (+5 pts)',
      'Suggests STEMI in the setting of LBBB',
    ],
    metadata: {
      ...base.metadata,
      ischemiaPatternId: 'ischemia.sgarbossa',
      affectedLeads: concordantLeads,
      reciprocalLeads: [],
      patternCategory: 'sgarbossa',
    },
  };
}

export function applyModifiedSgarbossa(base: TwelveLeadECG): TwelveLeadECG {
  const newLeads = { ...base.leads };
  // For modified Sgarbossa we add a smaller concordant STE plus a
  // proportional-discordance hint via metadata (the "ST/S ≤ −0.25 ratio").
  const concordantLeads: ECGLead[] = ['I', 'V5', 'V6'];
  for (const lead of concordantLeads) {
    newLeads[lead] = applyStShift(newLeads[lead], 0.15);
  }
  // Add proportional-discordance shift in V1 (where LBBB QRS is deeply negative).
  newLeads['V1'] = applyStShift(newLeads['V1'], 0.30); // discordant STE proportional to S
  return {
    ...base,
    patternIds: [...base.patternIds, 'ischemia.modified-sgarbossa'],
    leads: newLeads,
    interpretationHints: [
      ...base.interpretationHints,
      'Modified Sgarbossa — proportional-discordance criterion (ST/S ≤ −0.25)',
      'More sensitive than classic Sgarbossa for occlusion MI in LBBB / V-paced',
    ],
    metadata: {
      ...base.metadata,
      ischemiaPatternId: 'ischemia.modified-sgarbossa',
      affectedLeads: [...concordantLeads, 'V1'],
      reciprocalLeads: [],
      patternCategory: 'sgarbossa',
    },
  };
}
