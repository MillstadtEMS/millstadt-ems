/**
 * Level rhythm sets — which rhythm IDs belong to each difficulty tier in
 * Lead II's quiz/learn modes. Intermediate stacks Beginner; Expert stacks
 * both. IDs reference the shared rhythm catalog (`src/lib/ecg`).
 *
 * Only rhythms that have working generators are listed. Adding a rhythm
 * here without a generator would surface as a runtime hole in Timed mode,
 * so the test layer enforces "every level rhythm is implemented."
 */

import type { RhythmId } from '../ecg/types';

/** Foundation rhythms — the bread-and-butter recognition set. */
export const BEGINNER_RHYTHMS: readonly RhythmId[] = [
  'sinus.normal',
  'sinus.tachycardia',
  'sinus.bradycardia',
  'atrial.fib',
  'atrial.flutter',
  'vent.vtach-stable',
  'vent.vfib',
  'av-block.first-degree',
  'vent.asystole',
];

/** Additional intermediate-tier rhythms. Stacked on top of Beginner. */
export const INTERMEDIATE_ONLY_RHYTHMS: readonly RhythmId[] = [
  'atrial.pac',
  'vent.pvc',
  'atrial.svt',
  'junctional.rhythm',
  'junctional.accelerated',
  'vent.aivr',
  'atrial.mat',
  'vent.vfib-fine',
  'pacer.ventricular',
  'pacer.atrial',
];

/** Additional expert-tier rhythms. Stacked on Beginner + Intermediate. */
export const EXPERT_ONLY_RHYTHMS: readonly RhythmId[] = [
  'av-block.second-mobitz-i',
  'av-block.second-mobitz-ii',
  'av-block.third-degree',
  'av-block.2-1',
  'vent.torsades',
  'pacer.av',
  'sinus.arrest',
  'atrial.wandering-pacemaker',
  'vent.idioventricular',
  'av-block.dissociation',
];

export type LevelId = 'beginner' | 'intermediate' | 'expert';

export const LEVEL_LABEL: Record<LevelId, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  expert: 'Expert',
};

/** Returns the full rhythm pool for a given level (stacks lower tiers in). */
export function rhythmsForLevel(level: LevelId): readonly RhythmId[] {
  switch (level) {
    case 'beginner':
      return BEGINNER_RHYTHMS;
    case 'intermediate':
      return [...BEGINNER_RHYTHMS, ...INTERMEDIATE_ONLY_RHYTHMS];
    case 'expert':
      return [...BEGINNER_RHYTHMS, ...INTERMEDIATE_ONLY_RHYTHMS, ...EXPERT_ONLY_RHYTHMS];
  }
}

/** Which tier a rhythm belongs to — for scoring (Beginner = 10, Intermediate = 15, Expert = 25). */
export function tierForRhythm(id: RhythmId): LevelId | null {
  if (BEGINNER_RHYTHMS.includes(id)) return 'beginner';
  if (INTERMEDIATE_ONLY_RHYTHMS.includes(id)) return 'intermediate';
  if (EXPERT_ONLY_RHYTHMS.includes(id)) return 'expert';
  return null;
}
