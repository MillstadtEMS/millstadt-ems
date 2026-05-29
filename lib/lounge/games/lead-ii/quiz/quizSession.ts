/**
 * Quiz session model — lives entirely in local React state in Phase 2.
 *
 * The shape is deliberately CEU-future-ready: each `QuizAttemptResult`
 * already has the fields a future course/CEU module would need to record an
 * attempt (question ID, correct vs selected, timestamps, attempt number,
 * mode, optional module ID). Phase 2 does NOT persist any of this; the
 * session is forgotten when the user resets or leaves the quiz screen.
 *
 * Do NOT add persistence, accounts, certificates, or audit logs here — those
 * are explicitly out of scope until a CEU phase is greenlit.
 */

import type { RhythmId } from '../ecg/types';
import type { AnswerChoiceMode } from './quizTypes';

/** One submitted answer. Captures everything a CEU module would later need. */
export interface QuizAttemptResult {
  /** Stable question ID from `GeneratedQuizQuestion.id`. */
  questionId: string;
  /** The rhythm the user was supposed to identify. */
  correctRhythmId: RhythmId;
  /** What the user picked. Phase 2 does not allow skipping → always set. */
  selectedRhythmId: RhythmId;
  /** True iff `selectedRhythmId === correctRhythmId`. */
  isCorrect: boolean;
  /** Wall-clock submission time (ms since epoch). */
  submittedAtMs: number;
  /** ms between question presentation and submit. */
  timeSpentMs: number;
  /** 1-based attempt number within this session. */
  attemptNumber: number;
  /** Live vs reference mode. */
  quizMode: AnswerChoiceMode;
  /** Future-CEU pointer; null in Phase 2. */
  moduleId: string | null;
}

export interface QuizSessionState {
  /** ms since epoch when the session started. */
  startedAtMs: number;
  /** Append-only log of submitted answers. */
  results: QuizAttemptResult[];
}

export interface QuizScore {
  attempted: number;
  correct: number;
  /** Integer 0–100. */
  percent: number;
}

export const EMPTY_SESSION = (now = Date.now()): QuizSessionState => ({
  startedAtMs: now,
  results: [],
});

export function scoreSession(s: QuizSessionState): QuizScore {
  const attempted = s.results.length;
  const correct = s.results.reduce(
    (acc, r) => acc + (r.isCorrect ? 1 : 0),
    0,
  );
  const percent = attempted === 0 ? 0 : Math.round((correct / attempted) * 100);
  return { attempted, correct, percent };
}

export interface RecordAttemptArgs {
  session: QuizSessionState;
  questionId: string;
  correctRhythmId: RhythmId;
  selectedRhythmId: RhythmId;
  questionShownAtMs: number;
  submittedAtMs: number;
  quizMode: AnswerChoiceMode;
  moduleId?: string | null;
}

export function recordAttempt(args: RecordAttemptArgs): QuizSessionState {
  const result: QuizAttemptResult = {
    questionId: args.questionId,
    correctRhythmId: args.correctRhythmId,
    selectedRhythmId: args.selectedRhythmId,
    isCorrect: args.correctRhythmId === args.selectedRhythmId,
    submittedAtMs: args.submittedAtMs,
    timeSpentMs: Math.max(0, args.submittedAtMs - args.questionShownAtMs),
    attemptNumber: args.session.results.length + 1,
    quizMode: args.quizMode,
    moduleId: args.moduleId ?? null,
  };
  return {
    ...args.session,
    results: [...args.session.results, result],
  };
}
