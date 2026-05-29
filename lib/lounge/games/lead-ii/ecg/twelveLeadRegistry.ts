/**
 * Registry of 12-lead patterns — each entry maps a `RhythmId` to a modifier
 * function that takes a base `TwelveLeadECG` and returns a new one with the
 * pattern applied.
 *
 * This is the 12-lead analogue of `WAVEFORM_GENERATORS`. Every entry here is
 * for a pattern that DOES NOT have a single-lead morphology — it ONLY makes
 * sense layered on top of a base rhythm in the 12-lead context. So:
 *   - `WAVEFORM_GENERATORS` ↔ single-lead Monitor + Quiz
 *   - `TWELVE_LEAD_REGISTRY`  ↔ 12-Lead screen
 *
 * The catalog test asserts every `implemented: true` rhythm has at least
 * ONE of these registrations.
 */

import type { RhythmId } from './types';
import type { TwelveLeadECG } from './twelveLeadTypes';
import { applyRbbb, applyLbbb } from './conductionModifiers';
import {
  applyIschemiaTerritory,
  applySgarbossa,
  applyModifiedSgarbossa,
} from './ischemiaModifiers';
import {
  applyBrugadaPattern,
  applyBrugadaType1,
  applyBrugadaType2,
  applyHypothermia,
  applyWpw,
  applyWpwTypeA,
  applyWpwTypeB,
} from './specialPatternModifiers';

export interface TwelveLeadPattern {
  patternId: RhythmId;
  apply: (base: TwelveLeadECG) => TwelveLeadECG;
  /** IDs that MUST appear earlier in `patternIds` chain (e.g., Sgarbossa requires LBBB). */
  requires?: readonly RhythmId[];
}

export const TWELVE_LEAD_REGISTRY: Partial<Record<RhythmId, TwelveLeadPattern>> = {
  // Conduction
  'conduction.rbbb': { patternId: 'conduction.rbbb', apply: applyRbbb },
  'conduction.lbbb': { patternId: 'conduction.lbbb', apply: applyLbbb },
  'conduction.wpw': { patternId: 'conduction.wpw', apply: applyWpw },
  'conduction.wpw-type-a': { patternId: 'conduction.wpw-type-a', apply: applyWpwTypeA },
  'conduction.wpw-type-b': { patternId: 'conduction.wpw-type-b', apply: applyWpwTypeB },
  'conduction.brugada-pattern': { patternId: 'conduction.brugada-pattern', apply: applyBrugadaPattern },

  // STEMI territories
  'ischemia.inferior-stemi':     { patternId: 'ischemia.inferior-stemi',     apply: (b) => applyIschemiaTerritory(b, 'ischemia.inferior-stemi') },
  'ischemia.anterior-stemi':     { patternId: 'ischemia.anterior-stemi',     apply: (b) => applyIschemiaTerritory(b, 'ischemia.anterior-stemi') },
  'ischemia.lateral-stemi':      { patternId: 'ischemia.lateral-stemi',      apply: (b) => applyIschemiaTerritory(b, 'ischemia.lateral-stemi') },
  'ischemia.anterolateral-stemi':{ patternId: 'ischemia.anterolateral-stemi',apply: (b) => applyIschemiaTerritory(b, 'ischemia.anterolateral-stemi') },
  'ischemia.septal-stemi':       { patternId: 'ischemia.septal-stemi',       apply: (b) => applyIschemiaTerritory(b, 'ischemia.septal-stemi') },
  'ischemia.posterior-stemi':    { patternId: 'ischemia.posterior-stemi',    apply: (b) => applyIschemiaTerritory(b, 'ischemia.posterior-stemi') },

  // Non-territorial ischemia
  'ischemia.st-depression':      { patternId: 'ischemia.st-depression',      apply: (b) => applyIschemiaTerritory(b, 'ischemia.st-depression') },

  // Sgarbossa requires LBBB applied first
  'ischemia.sgarbossa':          { patternId: 'ischemia.sgarbossa',          apply: applySgarbossa,          requires: ['conduction.lbbb'] },
  'ischemia.modified-sgarbossa': { patternId: 'ischemia.modified-sgarbossa', apply: applyModifiedSgarbossa, requires: ['conduction.lbbb'] },

  // Special / advanced patterns
  'special.brugada-type-1': { patternId: 'special.brugada-type-1', apply: applyBrugadaType1 },
  'special.brugada-type-2': { patternId: 'special.brugada-type-2', apply: applyBrugadaType2 },
  'special.hypothermia': { patternId: 'special.hypothermia', apply: applyHypothermia },
};

export function hasTwelveLeadPattern(id: RhythmId): boolean {
  return TWELVE_LEAD_REGISTRY[id] !== undefined;
}

export function listTwelveLeadPatternIds(): readonly RhythmId[] {
  return Object.keys(TWELVE_LEAD_REGISTRY) as RhythmId[];
}

export function twelveLeadPatternChain(id: RhythmId): readonly RhythmId[] {
  const pattern = TWELVE_LEAD_REGISTRY[id];
  if (!pattern) return [];
  return [...(pattern.requires ?? []), id];
}
