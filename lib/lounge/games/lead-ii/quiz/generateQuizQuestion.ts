/**
 * Quiz question generator.
 *
 * Wraps `generateAnswerChoices` with a question-level concern: which rhythm
 * is the *correct* answer for this question? The pool is filtered before the
 * pick so live mode never even considers an unimplemented rhythm.
 *
 * Live-mode safety contract:
 *  1. `quizMode: 'live'` requires `implementedOnly: true`. Asking for live mode
 *     with `implementedOnly: false` is a contradiction (we'd pick a rhythm we
 *     can't render) and THROWS.
 *  2. Live-mode pool is `r.implemented && hasGenerator(r.id)` and excludes
 *     12-lead pattern rows; those have their own teaching surface.
 *  3. After picking, we hand off to `generateAnswerChoices` which itself
 *     refuses to produce choices for an unimplemented correct in live mode
 *     and refuses `includeUnimplemented: true` in live mode.
 *  4. The empty-pool case throws with a clear message naming every filter.
 */

import { hasGenerator } from '../ecg/waveform';
import { hasTwelveLeadPattern } from '../ecg/twelveLeadRegistry';
import { MAX_QUIZ_ANSWER_CHOICES } from '../ecg/constants';
import type {
  RhythmDefinition,
  RhythmId,
} from '../ecg/types';
import type { RhythmFamily } from '../ecg/rhythmFamilies';
import type { RhythmDifficulty } from '../ecg/difficulty';
import { generateAnswerChoices } from './answerChoices';
import type {
  AnswerChoiceMode,
  QuizAnswerChoice,
  QuizDifficultyMode,
} from './quizTypes';
import { createRng, defaultSeed } from './rng';

export interface GenerateQuizQuestionArgs {
  rhythmCatalog: readonly RhythmDefinition[];
  /** Defaults to true when `quizMode: 'live'`, false otherwise. */
  implementedOnly?: boolean;
  /** Defaults to `'live'`. */
  quizMode?: AnswerChoiceMode;
  /** Restrict the correct rhythm AND the distractor mix to this difficulty. */
  difficultyMode?: QuizDifficultyMode;
  /** Restrict the correct rhythm to a single family. Distractors still follow normal rules. */
  family?: RhythmFamily;
  /** Hard cap on answer choices. Defaults to 6. */
  maxChoices?: number;
  /** Provide a seed for deterministic question + choice order. */
  seed?: number;
  /**
   * IDs to skip when picking the correct rhythm — typically the most recent
   * question(s), to avoid the same question twice in a row.
   */
  exclude?: ReadonlyArray<RhythmId>;
}

export interface GeneratedQuizQuestion {
  /** Stable per-question ID — combines correct rhythm + seed. */
  id: string;
  correctRhythmId: RhythmId;
  /** Final choices in presentation order (already shuffled). */
  answerChoices: QuizAnswerChoice[];
  difficulty: RhythmDifficulty;
  family: RhythmFamily;
  quizMode: AnswerChoiceMode;
  /** Echo of the seed used. Same seed → same question. */
  seed: number;
}

export function generateQuizQuestion(
  args: GenerateQuizQuestionArgs,
): GeneratedQuizQuestion {
  const quizMode: AnswerChoiceMode = args.quizMode ?? 'live';
  const implementedOnly = args.implementedOnly ?? quizMode === 'live';

  // Live + !implementedOnly is an unsafe contradiction.
  if (quizMode === 'live' && !implementedOnly) {
    throw new Error(
      `Live quiz mode requires implementedOnly: true. ` +
        `To quiz on unimplemented rhythms, pass { quizMode: 'reference' }.`,
    );
  }

  const usedSeed = args.seed ?? defaultSeed();
  const rng = createRng(usedSeed);

  // Build the candidate pool for the correct rhythm.
  let pool = args.rhythmCatalog.slice();
  if (args.family) pool = pool.filter((r) => r.family === args.family);
  if (args.difficultyMode) pool = pool.filter((r) => r.difficulty === args.difficultyMode);
  if (implementedOnly) {
    pool = pool.filter((r) => r.implemented && hasGenerator(r.id) && !hasTwelveLeadPattern(r.id));
  }
  if (args.exclude && args.exclude.length > 0) {
    const excl = new Set<RhythmId>(args.exclude);
    pool = pool.filter((r) => !excl.has(r.id));
  }

  if (pool.length === 0) {
    throw new Error(
      `Quiz pool is empty after filters ` +
        `(quizMode=${quizMode}, implementedOnly=${implementedOnly}, ` +
        `family=${args.family ?? 'any'}, difficulty=${args.difficultyMode ?? 'any'}, ` +
        `excluded=${(args.exclude ?? []).length}). ` +
        `Cannot generate a question.`,
    );
  }

  const correct = pool[rng.nextInt(pool.length)] as RhythmDefinition;

  // Hand off to the answer-choice engine. It enforces:
  //   - correct must be implemented in live mode
  //   - includeUnimplemented:true is rejected in live mode
  //   - distractor pool follows the same rules
  const includeUnimplemented = quizMode === 'reference' && !implementedOnly;
  const acResult = generateAnswerChoices({
    correctRhythmId: correct.id,
    rhythmCatalog: args.rhythmCatalog,
    maxChoices: args.maxChoices ?? MAX_QUIZ_ANSWER_CHOICES,
    difficultyMode: args.difficultyMode ?? correct.difficulty,
    quizMode,
    includeUnimplemented,
    seed: usedSeed,
  });

  return {
    id: `q.${correct.id}.${usedSeed}`,
    correctRhythmId: correct.id,
    answerChoices: acResult.choices,
    difficulty: correct.difficulty,
    family: correct.family,
    quizMode,
    seed: usedSeed,
  };
}
