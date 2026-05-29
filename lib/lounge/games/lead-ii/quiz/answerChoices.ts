/**
 * Quiz answer-choice generator.
 *
 * Contract (enforced by tests):
 *  1. **Live-mode safety (correct rhythm):** when `quizMode: 'live'` (default),
 *     the function THROWS if the correct rhythm is `implemented: false`. To opt
 *     out, pass `quizMode: 'reference'` or `allowUnimplementedCorrect: true`.
 *  2. **Live-mode safety (distractors):** in live mode, `includeUnimplemented`
 *     MUST be false. Passing `includeUnimplemented: true` in live mode THROWS,
 *     because the live simulator must never offer a distractor it cannot
 *     actually render. Use `quizMode: 'reference'` for catalog/study screens.
 *  3. The correct answer is always included **when the call is valid**.
 *  4. Returns at most `MAX_QUIZ_ANSWER_CHOICES` choices (default 6).
 *  5. No duplicate rhythm IDs in the output.
 *  6. Distractor priority: confusableWith → same family → same difficulty
 *     → broader catalog. Per-tier counts are tuned by difficulty mode.
 *  7. Order is randomized.
 *  8. With a `seed`, output is fully deterministic.
 *  9. Unimplemented DISTRACTORS are excluded unless `quizMode: 'reference'`
 *     AND `includeUnimplemented: true`.
 * 10. Answer choices are referenced by stable RhythmId, never display name.
 */

import { MAX_QUIZ_ANSWER_CHOICES } from '../ecg/constants';
import type { RhythmDefinition, RhythmId } from '../ecg/types';
import { hasGenerator } from '../ecg/waveform';
import { hasTwelveLeadPattern } from '../ecg/twelveLeadRegistry';
import { canonicalGroupOf } from '../ecg/rhythmAliases';
import { DISTRACTOR_WEIGHTS_BY_MODE } from './quizRules';
import type { AnswerChoiceMode, QuizAnswerChoice, QuizDifficultyMode } from './quizTypes';
import { createRng, defaultSeed, shuffle } from './rng';
import { displayNameFor } from '../levels/rhythmDisplay';

export interface GenerateAnswerChoicesArgs {
  correctRhythmId: RhythmId;
  rhythmCatalog: readonly RhythmDefinition[];
  /** Defaults to `MAX_QUIZ_ANSWER_CHOICES` (6). */
  maxChoices?: number;
  difficultyMode: QuizDifficultyMode;
  /**
   * Engine mode for the answer-choice generator.
   *  - `'live'` (default): the live simulator quiz path. Throws if the
   *    correct rhythm is unimplemented.
   *  - `'reference'`: catalog/study path. Allows unimplemented correct answers.
   */
  quizMode?: AnswerChoiceMode;
  /**
   * Explicit override allowing an unimplemented correct rhythm regardless of
   * `quizMode`. Useful for instructor tools that intentionally quiz on
   * topics not yet generatable.
   */
  allowUnimplementedCorrect?: boolean;
  /** When false (default), only `implemented: true` rhythms are eligible as distractors. */
  includeUnimplemented?: boolean;
  /** Provide a seed for deterministic output (tests, replay). */
  seed?: number;
}

export interface GenerateAnswerChoicesResult {
  choices: QuizAnswerChoice[];
  /** Echo of the seed used — useful for storing alongside results. */
  seed: number;
}

export function generateAnswerChoices({
  correctRhythmId,
  rhythmCatalog,
  maxChoices = MAX_QUIZ_ANSWER_CHOICES,
  difficultyMode,
  quizMode = 'live',
  allowUnimplementedCorrect = false,
  includeUnimplemented = false,
  seed,
}: GenerateAnswerChoicesArgs): GenerateAnswerChoicesResult {
  if (maxChoices < 1) {
    throw new Error('maxChoices must be at least 1');
  }
  const cap = Math.min(maxChoices, MAX_QUIZ_ANSWER_CHOICES);

  const byId = new Map(rhythmCatalog.map((r) => [r.id, r]));
  const correct = byId.get(correctRhythmId);
  if (!correct) {
    throw new Error(
      `Unknown correct rhythm ID: ${JSON.stringify(correctRhythmId)}. ` +
        `Did you forget to register it in canonicalRhythmIds.ts and the catalog?`,
    );
  }

  // ── Live-mode safety: refuse to quiz on a rhythm we can't actually render.
  if (
    !correct.implemented &&
    quizMode !== 'reference' &&
    !allowUnimplementedCorrect
  ) {
    throw new Error(
      `Cannot quiz on unimplemented rhythm ${JSON.stringify(correctRhythmId)} ` +
        `in live simulator mode. Either implement a waveform generator first, ` +
        `or pass { quizMode: 'reference' } / { allowUnimplementedCorrect: true } ` +
        `for catalog/study mode.`,
    );
  }

  // ── Live-mode safety: refuse to leak unimplemented DISTRACTORS into the
  // live answer pool. The live simulator must only offer choices it can
  // actually render. `includeUnimplemented` is meaningful only in reference mode.
  if (quizMode === 'live' && includeUnimplemented) {
    throw new Error(
      `Cannot pass { includeUnimplemented: true } in live simulator mode — ` +
        `live answer choices must only show rhythms the simulator can actually render. ` +
        `Use { quizMode: 'reference' } for catalog/study mode.`,
    );
  }

  const usedSeed = seed ?? defaultSeed();
  const rng = createRng(usedSeed);
  const weights = DISTRACTOR_WEIGHTS_BY_MODE[difficultyMode];

  const isEligible = (rid: RhythmId): boolean => {
    const r = byId.get(rid);
    if (!r) return false;
    if (r.id === correct.id) return false;
    if (!includeUnimplemented && !r.implemented) return false;
    // In live quiz mode, keep 12-lead morphology patterns on their dedicated
    // learning surface even though the monitor has diagnostic live adapters.
    if (!includeUnimplemented && !hasGenerator(r.id)) return false;
    if (!includeUnimplemented && hasTwelveLeadPattern(r.id)) return false;
    return true;
  };

  // The correct answer is always eligible regardless of `includeUnimplemented`.
  const picked = new Set<RhythmId>([correct.id]);

  // Alias / canonical-group guard. The correct answer's group is
  // reserved — no distractor may share that group, AND no two distractors
  // may share each others' groups. This is what prevents "Idioventricular"
  // and "Ventricular escape" from both appearing as choices.
  const usedGroups = new Set<string>([canonicalGroupOf(correct.id)]);

  const tryAddFrom = (pool: RhythmId[], howMany: number): void => {
    if (howMany <= 0) return;
    const candidates = pool.filter((rid) => {
      if (!isEligible(rid) || picked.has(rid)) return false;
      if (usedGroups.has(canonicalGroupOf(rid))) return false;
      return true;
    });
    const shuffled = shuffle(candidates, rng);
    for (const rid of shuffled) {
      if (picked.size - 1 >= cap - 1) return; // -1 to leave room for correct
      if (picked.size >= cap) return;
      const group = canonicalGroupOf(rid);
      if (usedGroups.has(group)) continue;
      picked.add(rid);
      usedGroups.add(group);
      if (--howMany <= 0) return;
    }
  };

  // Tier 1: confusableWith
  tryAddFrom(correct.confusableWith.slice(), weights.confusables);

  // Tier 2: same family (excluding already-picked / correct)
  if (picked.size < cap) {
    const sameFamily = rhythmCatalog
      .filter((r) => r.family === correct.family)
      .map((r) => r.id);
    tryAddFrom(sameFamily, weights.sameFamily);
  }

  // Tier 3: same difficulty, cross-family
  if (picked.size < cap) {
    const sameDifficulty = rhythmCatalog
      .filter((r) => r.difficulty === correct.difficulty && r.family !== correct.family)
      .map((r) => r.id);
    tryAddFrom(sameDifficulty, weights.sameDifficulty);
  }

  // Tier 4: anything else
  if (picked.size < cap) {
    const fallback = rhythmCatalog.map((r) => r.id);
    tryAddFrom(fallback, weights.fallback);
  }

  // Build, randomize final order, and return. Labels go through displayNameFor
  // so the Lead II override map (e.g. vent.vtach-stable → "Ventricular
  // Tachycardia") wins — the raw catalog displayName ("Stable Monomorphic VT")
  // must never reach an answer button.
  const choices: QuizAnswerChoice[] = Array.from(picked).map((rid) => {
    const def = byId.get(rid)!;
    return { rhythmId: def.id, label: displayNameFor(def.id) };
  });
  const ordered = shuffle(choices, rng);
  return { choices: ordered, seed: usedSeed };
}

/** Convenience helper: returns just the choice IDs in presentation order. */
export function answerChoiceIds(result: GenerateAnswerChoicesResult): RhythmId[] {
  return result.choices.map((c) => c.rhythmId);
}
