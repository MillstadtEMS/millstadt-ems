/**
 * 12-lead ECG output type — produced by `twelveLeadGenerator`.
 *
 * IMPORTANT separation: a 12-lead pattern is NOT a rhythm. It's a layer that
 * composes ON TOP of a base rhythm (sinus, AFib, paced, etc.). For example:
 *
 *   baseRhythmId  = 'sinus.normal'
 *   patternIds    = ['ischemia.inferior-stemi']
 *   metadata.affectedLeads = ['II', 'III', 'aVF']
 *
 * `metadata.isTwelveLeadPattern: true` flags this output so any downstream
 * code can distinguish it from the single-lead `GeneratedECGSignal` shape.
 */

import type { GeneratedECGSignal, RhythmId } from './types';
import type { ECGLead } from './leadTypes';

/** What kind of 12-lead pattern this is — drives quiz/teaching grouping. */
export type PatternCategory =
  | 'conduction'   // RBBB, LBBB, fascicular blocks, …
  | 'stemi'        // ST elevation MI territories
  | 'ischemia'     // ST depression / non-territorial ischemia
  | 'sgarbossa'    // STEMI-equivalent criteria in LBBB/paced
  | 'special';     // Brugada, hypothermia, and other non-territorial special patterns

export interface TwelveLeadMetadata {
  /** The base rhythm rendered into the 12 leads (always present). */
  baseRhythmId: RhythmId;
  /** Conduction layer applied (e.g. RBBB / LBBB) — `null` if none. */
  conductionPatternId: RhythmId | null;
  /** Ischemia / STEMI layer applied — `null` if none. */
  ischemiaPatternId: RhythmId | null;
  /** Electrolyte/tox layer applied — reserved for future use, `null` for now. */
  electrolytePatternId: RhythmId | null;
  /** Special/environmental/channelopathy layer applied — `null` if none. */
  specialPatternId: RhythmId | null;
  /** Leads where the primary pattern is most visible. */
  affectedLeads: readonly ECGLead[];
  /** Reciprocal-change leads (often for STEMI). */
  reciprocalLeads: readonly ECGLead[];
  /** The pattern category that drives teaching/quiz grouping. */
  patternCategory: PatternCategory | null;
  /** Stable flag identifying this as a 12-lead-engine output. */
  isTwelveLeadPattern: true;
}

export interface TwelveLeadECG {
  rhythmId: RhythmId;
  /** Ordered list of pattern IDs applied (conduction first, then ischemia). */
  patternIds: readonly RhythmId[];
  /** All 12 leads keyed by `ECGLead`. */
  leads: Record<ECGLead, GeneratedECGSignal>;
  /** Short paraphrased teaching cues — read by the UI. */
  interpretationHints: readonly string[];
  /** Learner-facing criteria that explain why the displayed rhythm/pattern is called what it is. */
  interpretationCharacteristics: readonly string[];
  metadata: TwelveLeadMetadata;
}
