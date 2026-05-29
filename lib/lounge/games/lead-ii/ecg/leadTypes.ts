/**
 * 12-lead types — lead identifiers and per-lead signal containers.
 *
 * Phase 6 introduces a true 12-lead layer on top of the single-lead Monitor.
 * Single-lead generators continue to operate against an implicit "lead-II
 * semantics" trace; the 12-lead engine projects that base signal into all
 * 12 standard leads and then applies pattern modifiers (RBBB / LBBB / STEMI
 * territories / Sgarbossa / etc.) per lead.
 */

import type { GeneratedECGSignal } from './types';

export const ECG_LEADS = [
  'I',
  'II',
  'III',
  'aVR',
  'aVL',
  'aVF',
  'V1',
  'V2',
  'V3',
  'V4',
  'V5',
  'V6',
] as const;

export type ECGLead = (typeof ECG_LEADS)[number];

/** A single lead's signal. */
export interface LeadSignal {
  lead: ECGLead;
  signal: GeneratedECGSignal;
}

/** Limb leads are the six classic frontal-plane leads. */
export const LIMB_LEADS: readonly ECGLead[] = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF'];

/** Precordial leads V1–V6. */
export const PRECORDIAL_LEADS: readonly ECGLead[] = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
