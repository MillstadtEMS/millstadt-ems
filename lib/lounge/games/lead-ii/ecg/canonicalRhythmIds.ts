/**
 * Canonical list of stable rhythm IDs.
 *
 * **This is the source of truth for the `RhythmId` type.** Every ID in the
 * rhythm catalog must appear here, and every ID listed here must have a
 * matching catalog entry. The catalog test enforces both directions.
 *
 * Why a separate file:
 *   - Lets us derive a literal-union `RhythmId` type without losing it through
 *     the helper-function indirection in `rhythmCatalog.ts`.
 *   - Gives us a stable, append-only registry: once an ID is added here, it
 *     cannot be silently removed without a test failure surfacing the impact.
 *
 * Adding a new rhythm:
 *   1. Add the ID here (preserving the family grouping).
 *   2. Add the catalog row in `rhythmCatalog.ts`.
 *   3. Add a coverage manifest entry if the rhythm is a new teaching target.
 */

export const CANONICAL_RHYTHM_IDS = [
  // Sinus
  'sinus.normal',
  'sinus.bradycardia',
  'sinus.tachycardia',
  'sinus.arrhythmia',
  'sinus.arrest',
  'sinus.sa-exit-block',
  'sinus.sick-sinus-syndrome',

  // Atrial
  'atrial.fib',
  'atrial.fib-rvr',
  'atrial.flutter',
  'atrial.flutter-atypical',
  'atrial.svt',
  'atrial.avnrt',
  'atrial.avrt',
  'atrial.focal-atrial-tach',
  'atrial.ectopic-atrial-rhythm',
  'atrial.pac',
  'atrial.blocked-pac',
  'atrial.wandering-pacemaker',
  'atrial.mat',

  // Junctional
  'junctional.rhythm',
  'junctional.accelerated',
  'junctional.tachycardia',
  'junctional.pjc',

  // Ventricular
  'vent.pvc',
  'vent.pvc-multifocal',
  'vent.pvc-couplet',
  'vent.pvc-triplet',
  'vent.bigeminy',
  'vent.trigeminy',
  'vent.quadrigeminy',
  'vent.r-on-t',
  'vent.idioventricular',
  'vent.aivr',
  'vent.ventricular-escape',
  'vent.nsvt',
  'vent.vtach-stable',
  'vent.vtach-unstable',
  'vent.polymorphic-vt',
  'vent.torsades',
  'vent.bidirectional-vt',
  'vent.fascicular-vt',
  'vent.rvot-vt',
  'vent.flutter',
  'vent.vfib',
  'vent.vfib-fine',
  'vent.asystole',
  'vent.pea',

  // AV blocks
  'av-block.first-degree',
  'av-block.second-mobitz-i',
  'av-block.second-mobitz-ii',
  'av-block.2-1',
  'av-block.high-grade',
  'av-block.third-degree',
  'av-block.dissociation',

  // Pacemaker
  'pacer.atrial',
  'pacer.ventricular',
  'pacer.av',
  'pacer.failure-to-pace',
  'pacer.failure-to-capture',
  'pacer.failure-to-sense',
  'pacer.oversensing',
  'pacer.undersensing',
  'pacer.pmt',
  'pacer.runaway',

  // Conduction
  'conduction.rbbb',
  'conduction.incomplete-rbbb',
  'conduction.lbbb',
  'conduction.incomplete-lbbb',
  'conduction.lafb',
  'conduction.lpfb',
  'conduction.bifascicular',
  'conduction.trifascicular',
  'conduction.nicd',
  'conduction.wide-complex-tach',
  'conduction.irregular-wct',
  'conduction.wpw',
  'conduction.wpw-type-a',
  'conduction.wpw-type-b',
  'conduction.lgl',
  'conduction.long-qt',
  'conduction.short-qt',
  'conduction.brugada-pattern',

  // Ischemia / STEMI / 12-lead
  'ischemia.st-depression',
  'ischemia.t-wave-inversion',
  'ischemia.hyperacute-t',
  'ischemia.pathologic-q',
  'ischemia.inferior-stemi',
  'ischemia.anterior-stemi',
  'ischemia.lateral-stemi',
  'ischemia.high-lateral-stemi',
  'ischemia.anterolateral-stemi',
  'ischemia.inferolateral-stemi',
  'ischemia.septal-stemi',
  'ischemia.posterior-stemi',
  'ischemia.rv-stemi',
  'ischemia.left-main-occlusion',
  'ischemia.sgarbossa',
  'ischemia.modified-sgarbossa',
  'ischemia.wellens',
  'ischemia.wellens-type-a',
  'ischemia.wellens-type-b',
  'ischemia.de-winter',
  'ischemia.lv-aneurysm',
  'ischemia.early-repolarization',
  'ischemia.pericarditis-mimic',
  'ischemia.lvh-strain',
  'ischemia.aslanger',
  'ischemia.south-african-flag',

  // Electrolyte / toxicology
  'electrolyte.hyperk-peaked-t',
  'electrolyte.hyperk-progression',
  'electrolyte.hyperk-sine-wave',
  'electrolyte.hypok',
  'electrolyte.hyperca',
  'electrolyte.hypoca',
  'electrolyte.hypermg',
  'electrolyte.hypomg',
  'electrolyte.digoxin-effect',
  'electrolyte.digoxin-toxicity',
  'electrolyte.tca-toxicity',
  'electrolyte.na-channel-blocker',
  'electrolyte.cocaine-toxicity',
  'electrolyte.lithium-toxicity',
  'electrolyte.bb-ccb-toxicity',
  'electrolyte.bb-toxicity',
  'electrolyte.ccb-toxicity',
  'electrolyte.carbamazepine-toxicity',
  'electrolyte.quetiapine-toxicity',

  // Special / advanced patterns
  'special.brugada-type-1',
  'special.brugada-type-2',
  'special.arvc',
  'special.cpvt',
  'special.hcm',
  'special.hypothermia',
  'special.pe-pattern',
  'special.lvh',
  'special.rvh',
  'special.left-atrial-enlargement',
  'special.right-atrial-enlargement',
  'special.electrical-alternans',
  'special.dextrocardia',
  'special.lead-reversal',
  'special.takotsubo',
  'special.cerebral-t-waves',
  'special.athlete-heart',
] as const;

/** Stable rhythm identifier — derived literal union. */
export type RhythmId = (typeof CANONICAL_RHYTHM_IDS)[number];

const CANONICAL_ID_SET: ReadonlySet<string> = new Set(CANONICAL_RHYTHM_IDS);

/** Type guard: narrows a string to `RhythmId` if recognized. */
export function isValidRhythmId(id: string): id is RhythmId {
  return CANONICAL_ID_SET.has(id);
}

/** Throws a clear error if `id` is not a known rhythm. */
export function assertValidRhythmId(id: string): asserts id is RhythmId {
  if (!isValidRhythmId(id)) {
    throw new Error(
      `Invalid rhythm ID: ${JSON.stringify(id)}. ` +
        `Expected one of ${CANONICAL_RHYTHM_IDS.length} canonical IDs ` +
        `(see canonicalRhythmIds.ts).`,
    );
  }
}
