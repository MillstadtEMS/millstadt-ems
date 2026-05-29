/**
 * Coverage manifest type contract.
 *
 * The manifest answers a different question than the catalog:
 *
 *   - Catalog: "what rhythms exist as objects in our model?"
 *   - Manifest: "what teaching topics does this app acknowledge, and how?"
 *
 * Every required teaching target (from the original product brief, from
 * LITFL-style ECG library taxonomies, and from our basics module) MUST appear
 * in the manifest with one of four statuses:
 *
 *   - `covered`     — the topic is realized as a catalog rhythm or basics concept.
 *   - `merged-into` — the topic is taught under another (linked) entry.
 *   - `out-of-scope`— intentionally not taught (with a reason).
 *   - `planned`     — scheduled for a later phase (with the phase number).
 *
 * `covered` does NOT imply `implemented: true`. A rhythm can be covered (the
 * topic is acknowledged in the catalog) but still not have a working waveform
 * generator. Implementation is tracked separately via `RhythmDefinition.implemented`.
 *
 * Coverage targets use a **tagged union** so TypeScript can statically prove
 * each link points at the right kind of entity:
 *
 *   { targetType: 'rhythm'; rhythmId: RhythmId }       // points at the catalog
 *   { targetType: 'basics'; conceptId: BasicsConceptId } // points at basics.ts
 */

import type { BasicsConceptId } from './canonicalBasicsConceptIds';
import type { RhythmId } from './canonicalRhythmIds';

/** What kind of teaching target this entry tracks. */
export const COVERAGE_CATEGORIES = [
  'rhythm',
  'pattern-12-lead',
  'channelopathy',
  'pacemaker-malfunction',
  'electrolyte-tox',
  'basics-concept',
  'special-topic',
  'pediatric',
  'other',
] as const;
export type CoverageCategory = (typeof COVERAGE_CATEGORIES)[number];

/** Where this teaching target came from (what we're answering to). */
export const COVERAGE_SOURCES = [
  'original-prompt',
  'litfl-extension',
  'litfl-basics',
  'project-derived',
] as const;
export type CoverageSource = (typeof COVERAGE_SOURCES)[number];

/**
 * Tagged-union pointer to whatever realizes (or absorbs) a teaching topic.
 * Tagging makes it statically obvious whether a target lives in the rhythm
 * catalog or the basics module, and gives the type system a job: each arm
 * carries the strict literal-union ID type for its target.
 */
export type CoverageTarget =
  | { targetType: 'rhythm'; rhythmId: RhythmId }
  | { targetType: 'basics'; conceptId: BasicsConceptId };

/** Coverage status — disjoint union, one shape per status. */
export type CoverageStatus =
  | {
      kind: 'covered';
      coveredBy: CoverageTarget;
    }
  | {
      kind: 'merged-into';
      mergedInto: CoverageTarget;
      /** One short sentence — why we merged. */
      rationale: string;
    }
  | {
      kind: 'out-of-scope';
      reason: string;
    }
  | {
      kind: 'planned';
      /** Phase number per CLAUDE.md (1..8). */
      phase: number;
      notes?: string;
    };

export interface CoverageEntry {
  /** Stable manifest ID, e.g. `'cov.brugada-pattern'`. */
  id: string;
  /** Display name as the user / educator would speak it. */
  displayName: string;
  category: CoverageCategory;
  source: CoverageSource;
  status: CoverageStatus;
  /** Optional aliases to make matching easier in tests / search. */
  aliases?: string[];
  /** Short editorial note for humans reading the manifest. */
  notes?: string;
}

// ───── Helpers to keep manifest entries readable ─────────────────────

/** Build a rhythm-target pointer for `coveredBy` / `mergedInto`. */
export const rhythmTarget = (rhythmId: RhythmId): CoverageTarget => ({
  targetType: 'rhythm',
  rhythmId,
});

/** Build a basics-concept-target pointer for `coveredBy` / `mergedInto`. */
export const basicsTarget = (conceptId: BasicsConceptId): CoverageTarget => ({
  targetType: 'basics',
  conceptId,
});
