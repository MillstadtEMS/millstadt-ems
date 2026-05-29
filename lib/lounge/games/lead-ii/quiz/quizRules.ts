/**
 * Constants and helpers for the answer-choice generator.
 * Kept separate from `answerChoices.ts` so future tuning lives in one place.
 */

import { MAX_QUIZ_ANSWER_CHOICES } from '../ecg/constants';
import type { QuizDifficultyMode } from './quizTypes';

export { MAX_QUIZ_ANSWER_CHOICES };

/** How many distractors to add by tier before falling back to broader catalog. */
export interface DistractorWeights {
  /** Choose from the rhythm's `confusableWith` list first. */
  confusables: number;
  /** Then same family. */
  sameFamily: number;
  /** Then same difficulty (cross-family). */
  sameDifficulty: number;
  /** Then anything else implemented (or anything if `includeUnimplemented`). */
  fallback: number;
}

/**
 * Difficulty-mode weighting:
 *  - beginner: lean on cross-family distractors so look-alikes don't dominate.
 *  - intermediate: favor same-family and confusable look-alikes.
 *  - expert: pack with the most confusable rhythms available.
 *
 * Weights are advisory — total target is still capped at MAX_QUIZ_ANSWER_CHOICES.
 */
export const DISTRACTOR_WEIGHTS_BY_MODE: Record<QuizDifficultyMode, DistractorWeights> = {
  beginner: { confusables: 1, sameFamily: 2, sameDifficulty: 2, fallback: 5 },
  intermediate: { confusables: 3, sameFamily: 2, sameDifficulty: 1, fallback: 5 },
  expert: { confusables: 5, sameFamily: 2, sameDifficulty: 0, fallback: 3 },
};
