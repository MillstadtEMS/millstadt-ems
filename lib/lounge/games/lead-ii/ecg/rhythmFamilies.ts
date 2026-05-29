/**
 * Rhythm families. Catalog rows map 1:1 to one of these.
 *
 * Note: 12-lead patterns (ischemia, STEMI, conduction blocks, etc.) are kept
 * as their own families even though clinically they layer on top of a base
 * rhythm. Phase 6 introduces the layering engine; the catalog already models
 * them separately so we don't paint ourselves into a corner.
 */
export const RHYTHM_FAMILIES = [
  'sinus',
  'atrial',
  'junctional',
  'ventricular',
  'av-block',
  'pacemaker',
  'conduction',
  'ischemia-stemi',
  'electrolyte-tox',
  'special',
] as const;

export type RhythmFamily = (typeof RHYTHM_FAMILIES)[number];

export const RHYTHM_FAMILY_LABELS: Record<RhythmFamily, string> = {
  sinus: 'Sinus rhythms',
  atrial: 'Atrial rhythms',
  junctional: 'Junctional rhythms',
  ventricular: 'Ventricular rhythms',
  'av-block': 'AV blocks',
  pacemaker: 'Pacemaker rhythms',
  conduction: 'Conduction abnormalities',
  'ischemia-stemi': 'Ischemia / STEMI patterns',
  'electrolyte-tox': 'Electrolyte / toxicologic patterns',
  special: 'Special / advanced patterns',
};
