/**
 * Basics quiz session helpers.
 *
 * The Basics module ships pre-authored questions with their own choices
 * (factual MCQ, not rhythm-vs-distractor). We only need to:
 *  - Filter by topic / difficulty
 *  - Shuffle the question order and the choice order
 *  - Stay deterministic when a `seed` is provided
 */

import {
  BASICS_QUESTIONS,
  BASICS_QUESTION_BY_ID,
} from '../ecg/basics';
import type {
  BasicsAnswerChoice,
  BasicsDifficulty,
  BasicsQuestion,
  BasicsTopic,
} from '../ecg/basicsTypes';
import { createRng, defaultSeed, shuffle } from './rng';

export interface BuildBasicsQuizArgs {
  /** Restrict to a topic (e.g., only `'rate'`). */
  topic?: BasicsTopic;
  /** Restrict to a difficulty (e.g., true beginners). */
  difficulty?: BasicsDifficulty;
  /** Cap the number of questions. Defaults to all matching. */
  limit?: number;
  /** Seed for deterministic order. */
  seed?: number;
}

export interface BuiltBasicsQuestion {
  question: BasicsQuestion;
  /** Choices in the (potentially shuffled) presentation order. */
  presentedChoices: BasicsAnswerChoice[];
}

export interface BuiltBasicsQuiz {
  questions: BuiltBasicsQuestion[];
  seed: number;
}

export function buildBasicsQuiz(args: BuildBasicsQuizArgs = {}): BuiltBasicsQuiz {
  const usedSeed = args.seed ?? defaultSeed();
  const rng = createRng(usedSeed);

  const filtered = BASICS_QUESTIONS.filter((q) => {
    if (args.topic && q.topic !== args.topic) return false;
    if (args.difficulty && q.difficulty !== args.difficulty) return false;
    return true;
  });

  const ordered = shuffle(filtered, rng);
  const limited = args.limit !== undefined ? ordered.slice(0, args.limit) : ordered;

  const questions: BuiltBasicsQuestion[] = limited.map((q) => ({
    question: q,
    presentedChoices: shuffle(q.choices, rng),
  }));

  return { questions, seed: usedSeed };
}

/** Validate that a chosen answer ID matches the question's correct choice. */
export function isBasicsAnswerCorrect(
  questionId: string,
  chosenChoiceId: string,
): boolean {
  const q = BASICS_QUESTION_BY_ID.get(questionId);
  if (!q) return false;
  return q.correctChoiceId === chosenChoiceId;
}
