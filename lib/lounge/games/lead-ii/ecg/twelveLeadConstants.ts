/**
 * 12-lead constants — display order, labels, default sample window.
 */

import type { ECGLead } from './leadTypes';

/**
 * Standard clinical display order: 4 columns × 3 rows.
 *
 *   I    aVR   V1   V4
 *   II   aVL   V2   V5
 *   III  aVF   V3   V6
 */
export const LEAD_GRID_ORDER: readonly (readonly ECGLead[])[] = [
  ['I',   'aVR', 'V1', 'V4'],
  ['II',  'aVL', 'V2', 'V5'],
  ['III', 'aVF', 'V3', 'V6'],
];

/** Flat ordering (limb leads first, then precordial). */
export const LEAD_FLAT_ORDER: readonly ECGLead[] = [
  'I', 'II', 'III', 'aVR', 'aVL', 'aVF',
  'V1', 'V2', 'V3', 'V4', 'V5', 'V6',
];

/** Default 12-lead capture window for snapshot rendering. */
export const TWELVE_LEAD_WINDOW_SEC = 5;
