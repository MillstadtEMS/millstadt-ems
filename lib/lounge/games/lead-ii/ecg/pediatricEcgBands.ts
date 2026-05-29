/**
 * Pediatric ECG age-band reference.
 *
 * Pediatric ECG interpretation requires age-aware normal ranges — the
 * same QRS axis, R/S ratio, or T-wave polarity that is normal in a
 * neonate is pathologic in a 10-year-old. This module captures the
 * standard age-band envelopes a clinician applies before calling
 * anything abnormal in a child.
 *
 * Source basis (paraphrased): standard pediatric cardiology references
 * (Davignon normal-ranges study + Park's Pediatric Cardiology for
 * Practitioners).
 *
 * Pure TypeScript. No React / RN / Skia imports.
 */

export type PediatricAgeBand = 'neonate-0-7d' | 'infant-1w-1y' | 'child-1-8y' | 'adolescent-8-16y';

export interface AgeBandEnvelope {
  band: PediatricAgeBand;
  /** Human-readable age range. */
  ageRange: string;
  /** Heart rate, beats per minute. */
  rateBpm: { min: number; max: number };
  /** QRS axis in degrees. */
  axisDeg: { min: number; max: number };
  /** PR interval in ms. */
  prMs: { min: number; max: number };
  /** QRS duration in ms. */
  qrsMs: { min: number; max: number };
  /** Expected R-wave amplitude in V1 (mm). RV dominance shrinks with age. */
  rWaveV1Mm: { min: number; max: number };
  /** Expected R-wave amplitude in V6 (mm). LV dominance grows with age. */
  rWaveV6Mm: { min: number; max: number };
  /** Normal T-wave polarity in V1 — the most age-sensitive single finding. */
  tWaveV1Polarity: 'positive-first-week' | 'negative' | 'negative-or-transitioning';
  /** One-line description of the band's salient features. */
  summary: string;
  /** Pearls / common pitfalls for this age band. */
  pearls: readonly string[];
}

const neonate: AgeBandEnvelope = {
  band: 'neonate-0-7d',
  ageRange: '0–7 days',
  rateBpm: { min: 100, max: 180 },
  axisDeg: { min: 90, max: 180 },
  prMs: { min: 80, max: 160 },
  qrsMs: { min: 40, max: 80 },
  rWaveV1Mm: { min: 5, max: 26 },
  rWaveV6Mm: { min: 0, max: 12 },
  tWaveV1Polarity: 'positive-first-week',
  summary: 'RV dominance from in-utero physiology. Right axis deviation, tall R in V1, upright T in V1 — all normal.',
  pearls: [
    'T wave in V1 is POSITIVE for the first 7 days of life. After day 7 it inverts. An upright T in V1 after day 7 suggests RVH.',
    'Right axis deviation up to +180° is normal.',
    'Dominant R in V1 (R > S) is the expected pattern, not RVH.',
  ],
};

const infant: AgeBandEnvelope = {
  band: 'infant-1w-1y',
  ageRange: '1 week – 1 year',
  rateBpm: { min: 100, max: 160 },
  axisDeg: { min: 10, max: 125 },
  prMs: { min: 80, max: 160 },
  qrsMs: { min: 40, max: 80 },
  rWaveV1Mm: { min: 3, max: 20 },
  rWaveV6Mm: { min: 2, max: 16 },
  tWaveV1Polarity: 'negative',
  summary: 'Axis migrates leftward as LV becomes dominant. R in V1 still relatively tall but decreasing.',
  pearls: [
    'T wave in V1 MUST be negative after day 7. Upright T in V1 in an infant is RVH until proven otherwise.',
    'Axis can still be mildly right-deviated but no longer extreme.',
  ],
};

const child: AgeBandEnvelope = {
  band: 'child-1-8y',
  ageRange: '1 – 8 years',
  rateBpm: { min: 70, max: 130 },
  axisDeg: { min: 10, max: 110 },
  prMs: { min: 100, max: 180 },
  qrsMs: { min: 40, max: 90 },
  rWaveV1Mm: { min: 1, max: 15 },
  rWaveV6Mm: { min: 5, max: 25 },
  tWaveV1Polarity: 'negative',
  summary: 'LV dominance fully established. The juvenile T-wave pattern (T inverted V1–V3) is normal.',
  pearls: [
    'Juvenile T-wave pattern — inverted T in V1–V3 — is normal at this age and may persist into the teens.',
    'Sinus arrhythmia is more pronounced; do not call it pathology.',
    'Small Q waves in the inferior and lateral leads are normal.',
  ],
};

const adolescent: AgeBandEnvelope = {
  band: 'adolescent-8-16y',
  ageRange: '8 – 16 years',
  rateBpm: { min: 60, max: 110 },
  axisDeg: { min: 0, max: 105 },
  prMs: { min: 120, max: 200 },
  qrsMs: { min: 50, max: 100 },
  rWaveV1Mm: { min: 0, max: 12 },
  rWaveV6Mm: { min: 5, max: 25 },
  tWaveV1Polarity: 'negative-or-transitioning',
  summary: 'Approaching adult parameters. T in V1 may begin to become upright in late adolescence; persistent juvenile pattern is a normal variant into young adulthood.',
  pearls: [
    'Persistent juvenile T-wave pattern (inverted V1–V3) into the 20s is a benign variant — common in young Black athletes.',
    'Incomplete RBBB with QRS < 120 ms is a normal variant.',
    'Apply adult criteria with caution; many "abnormal" findings remain normal here.',
  ],
};

export const PEDIATRIC_AGE_BANDS: readonly AgeBandEnvelope[] = [neonate, infant, child, adolescent];

export const PEDIATRIC_AGE_BAND_BY_NAME: ReadonlyMap<PediatricAgeBand, AgeBandEnvelope> = new Map(
  PEDIATRIC_AGE_BANDS.map((b) => [b.band, b]),
);

/** Look up the appropriate envelope for a patient's age in days. */
export function envelopeForAgeDays(ageDays: number): AgeBandEnvelope {
  if (ageDays <= 7) return neonate;
  if (ageDays <= 365) return infant;
  if (ageDays <= 365 * 8) return child;
  return adolescent;
}

/** Look up by age in years (helper). */
export function envelopeForAgeYears(ageYears: number): AgeBandEnvelope {
  return envelopeForAgeDays(Math.round(ageYears * 365));
}

/** Universal pediatric ECG rules (apply across age bands). */
export const PEDIATRIC_GLOBAL_RULES: readonly string[] = [
  'Sinus arrhythmia is normal and expected in children — phasic with respiration.',
  'Higher heart rates are normal (age-dependent).',
  'Right axis deviation is normal in neonates (RV dominance in utero).',
  'Dominant R in V1 is normal in neonates and infants.',
  'T-wave inversion in V1–V3 is normal in children (juvenile T-wave pattern).',
  'Upright T in V1 after day 7 of life is abnormal — suspect RVH.',
  'QRS is narrower than adults; PR interval is shorter.',
  'Q waves in inferior and lateral leads are normal in children.',
  'Incomplete RBBB (rsR\' in V1 with QRS < 120 ms) is a normal variant.',
];
