/**
 * Public type contract for the quiz engine.
 */

import type { RhythmDifficulty } from '../ecg/difficulty';
import type { RhythmId } from '../ecg/types';

/**
 * Top-level quiz product modes the UI can present.
 *  - `rhythm-id`: live-simulator quiz; only quizzes on implemented rhythms.
 *  - `basics`: foundational MCQ over `BASICS_QUESTIONS`.
 *  - `reference`: catalog/study mode; may quiz on unimplemented rhythms.
 */
export const QUIZ_MODES = ['rhythm-id', 'basics', 'reference'] as const;
export type QuizMode = (typeof QUIZ_MODES)[number];

/**
 * Lower-level mode used by the answer-choice generator. Distinct from
 * `QuizMode` because rhythm-id and reference both use the rhythm engine but
 * with different safety rules around unimplemented correct answers.
 */
export const ANSWER_CHOICE_MODES = ['live', 'reference'] as const;
export type AnswerChoiceMode = (typeof ANSWER_CHOICE_MODES)[number];

/** Difficulty mode chosen by the user — drives distractor selection. */
export type QuizDifficultyMode = RhythmDifficulty;

export interface QuizAnswerChoice {
  /** Stable rhythm ID — answer comparison NEVER uses display name. */
  rhythmId: RhythmId;
  /** What we show to the user. May be the displayName or an alias. */
  label: string;
}

export interface QuizQuestion {
  /** Unique per-question ID for analytics/replay. */
  id: string;
  /** The rhythm the user must identify. */
  correctRhythmId: RhythmId;
  /** Final answer choices in presentation order. */
  choices: QuizAnswerChoice[];
  /** Seed used to build the choices (for deterministic replay). */
  seed?: number;
}
