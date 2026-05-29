export const RHYTHM_DIFFICULTIES = ['beginner', 'intermediate', 'expert'] as const;
export type RhythmDifficulty = (typeof RHYTHM_DIFFICULTIES)[number];

export const DIFFICULTY_RANK: Record<RhythmDifficulty, number> = {
  beginner: 0,
  intermediate: 1,
  expert: 2,
};
