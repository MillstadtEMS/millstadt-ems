/**
 * Lead II display-name overrides.
 *
 * The shared catalog labels some rhythms with parenthetical qualifiers
 * ("Ventricular Tachycardia (stable)") or uses an internal-facing name
 * that doesn't match Lead II's teaching tone. This module is the ONE place
 * the standalone app reshapes those labels for buttons, tabs, and answer
 * choices — the underlying catalog stays untouched.
 *
 * Rules:
 *   1. Look up an explicit override in OVERRIDES first.
 *   2. Otherwise strip any trailing " (stable)" / " (unstable)" / similar
 *      parenthetical qualifier.
 *   3. Fall back to the catalog displayName.
 */

import type { RhythmId } from '../ecg/types';
import { RHYTHM_BY_ID } from '../ecg/rhythmCatalog';

const OVERRIDES: Partial<Record<RhythmId, string>> = {
  // We use the SVT generator for the visual but display it under the AVNRT
  // label — AVNRT is the specific narrow-complex SVT the learn card explains.
  'atrial.svt': 'AVNRT (AV Nodal Reentry Tachycardia)',
  'atrial.avnrt': 'AVNRT (AV Nodal Reentry Tachycardia)',
  'atrial.fib': 'Atrial Fibrillation',
  'atrial.flutter': 'Atrial Flutter',
  'atrial.mat': 'Multifocal Atrial Tachycardia',
  'atrial.pac': 'PACs',
  'atrial.wandering-pacemaker': 'Wandering Atrial Pacemaker',
  'av-block.first-degree': '1° AV Block',
  'av-block.second-mobitz-i': 'Mobitz I (Wenckebach)',
  'av-block.second-mobitz-ii': 'Mobitz II',
  'av-block.third-degree': '3° (Complete) Heart Block',
  'av-block.2-1': '2:1 AV Block',
  'av-block.dissociation': 'AV Dissociation',
  'junctional.rhythm': 'Junctional Rhythm',
  'junctional.accelerated': 'Accelerated Junctional',
  'pacer.atrial': 'Atrial Paced',
  'pacer.ventricular': 'Ventricular Paced',
  'pacer.av': 'Dual-Chamber Paced',
  'sinus.normal': 'Normal Sinus Rhythm',
  'sinus.tachycardia': 'Sinus Tachycardia',
  'sinus.bradycardia': 'Sinus Bradycardia',
  'sinus.arrest': 'Sinus Arrest',
  'vent.aivr': 'Accelerated Idioventricular (AIVR)',
  'vent.asystole': 'Asystole',
  'vent.idioventricular': 'Ventricular Escape',
  'vent.pvc': 'PVCs',
  'vent.torsades': 'Torsades de Pointes',
  'vent.vfib': 'Ventricular Fibrillation (Coarse)',
  'vent.vfib-fine': 'Fine Ventricular Fibrillation',
  'vent.vtach-stable': 'Ventricular Tachycardia',
};

const PARENTHETICAL = /\s*\([^)]*\)\s*$/;

export function displayNameFor(id: RhythmId): string {
  const override = OVERRIDES[id];
  if (override) return override;
  const fromCatalog = RHYTHM_BY_ID.get(id)?.displayName ?? id;
  return fromCatalog.replace(PARENTHETICAL, '').trim();
}
