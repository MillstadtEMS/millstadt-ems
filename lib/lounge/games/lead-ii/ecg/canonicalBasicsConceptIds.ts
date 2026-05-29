/**
 * Canonical list of stable basics concept IDs.
 *
 * Same role as `canonicalRhythmIds.ts` but for the ECG Basics module:
 * gives us a literal-union `BasicsConceptId` so coverage references and
 * question links are checked at compile time.
 *
 * Adding a new basics concept:
 *   1. Add the ID here (preserving topic grouping).
 *   2. Add the concept row in `basics.ts`.
 *   3. Add a coverage manifest entry if the topic is a new teaching target.
 */

export const CANONICAL_BASICS_CONCEPT_IDS = [
  // Paper / time / amplitude
  'basics.paper.small-box',
  'basics.paper.large-box',

  // Leads
  'basics.leads.standard-12',
  'basics.leads.placement',

  // Waves
  'basics.waves.p-wave',
  'basics.waves.q-wave',
  'basics.waves.r-wave',
  'basics.waves.s-wave',
  'basics.waves.qrs',
  'basics.waves.t-wave',
  'basics.waves.u-wave',
  'basics.waves.delta-wave',

  // Segments / fiducial points
  'basics.segments.pr-segment',
  'basics.segments.st-segment',
  'basics.segments.tp-segment',
  'basics.segments.j-point',
  'basics.segments.baseline',
  'basics.segments.calibration',

  // Intervals
  'basics.intervals.pr',
  'basics.intervals.qrs-duration',
  'basics.intervals.qt',
  'basics.intervals.rr',
  'basics.intervals.pp',

  // Rate
  'basics.rate.300-method',
  'basics.rate.6-second',

  // Axis
  'basics.axis.quadrant',

  // Approach
  'basics.approach.systematic',
] as const;

export type BasicsConceptId = (typeof CANONICAL_BASICS_CONCEPT_IDS)[number];

const CANONICAL_BASICS_ID_SET: ReadonlySet<string> = new Set(
  CANONICAL_BASICS_CONCEPT_IDS,
);

export function isValidBasicsConceptId(id: string): id is BasicsConceptId {
  return CANONICAL_BASICS_ID_SET.has(id);
}

export function assertValidBasicsConceptId(
  id: string,
): asserts id is BasicsConceptId {
  if (!isValidBasicsConceptId(id)) {
    throw new Error(
      `Invalid basics concept ID: ${JSON.stringify(id)}. ` +
        `Expected one of ${CANONICAL_BASICS_CONCEPT_IDS.length} canonical IDs ` +
        `(see canonicalBasicsConceptIds.ts).`,
    );
  }
}
