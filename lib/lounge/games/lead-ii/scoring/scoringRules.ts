/**
 * Point system for Lead II Timed mode.
 *
 *   Correct (no prior wrong on this question)
 *     Beginner rhythm        +10
 *     Intermediate rhythm    +15
 *     Expert rhythm          +25
 *     Speed bonus (≤5 s)     +5
 *     Speed bonus (≤10 s)    +3
 *     Streak (5 / 10 / 15)   +10 / +25 / +50
 *
 *   Correct AFTER one or more wrong attempts
 *     - base is halved (rounded down)
 *     - speed bonus is zeroed (you didn't actually recognize it fast)
 *     - streak bonus is zeroed (the wrong already reset streak to 0)
 *
 *   Incorrect
 *     First wrong            -5
 *     Second wrong (same Q)  -10
 *     Third wrong (auto-adv) -15
 *
 * Pure functions, no React/RN imports — testable in Node.
 */

import type { RhythmId } from '../ecg/types';
import { tierForRhythm, type LevelId } from '../levels/levelRhythms';

export interface ScoringEvent {
  /** Round-trip seconds the user took to lock in this answer. */
  timeToAnswerSec: number;
  /** Streak count BEFORE this answer (running total of consecutive corrects). */
  currentStreak: number;
  /**
   * Wrong picks the user already made on THIS question before landing the
   * correct answer. 0 means they got it first try.
   */
  wrongAttemptsOnThisQuestion: number;
}

export interface CorrectScore {
  base: number;
  speedBonus: number;
  streakBonus: number;
  total: number;
  /** True when the score was reduced because the user had to guess again. */
  reducedAfterWrong: boolean;
}

const TIER_BASE: Record<LevelId, number> = {
  beginner: 10,
  intermediate: 15,
  expert: 25,
};

const SPEED_BONUS_BANDS: Array<{ maxSec: number; bonus: number }> = [
  { maxSec: 5, bonus: 5 },
  { maxSec: 10, bonus: 3 },
];

const STREAK_BONUSES: Array<{ atStreak: number; bonus: number }> = [
  { atStreak: 15, bonus: 50 },
  { atStreak: 10, bonus: 25 },
  { atStreak: 5, bonus: 10 },
];

/**
 * Score a correct answer.
 *   `newStreak` is the streak count AFTER this answer (currentStreak + 1).
 *   The streak bonus fires only when crossing a milestone (5, 10, 15).
 *
 * When the user already missed this question (wrongAttemptsOnThisQuestion > 0),
 * the reward shrinks: half base, no speed bonus, no streak bonus. The point
 * of the game is to *recognize* the rhythm, not to brute-force the buttons.
 */
export function scoreCorrect(rhythmId: RhythmId, evt: ScoringEvent): CorrectScore {
  const tier = tierForRhythm(rhythmId) ?? 'beginner';
  const fullBase = TIER_BASE[tier];
  const reducedAfterWrong = evt.wrongAttemptsOnThisQuestion > 0;

  if (reducedAfterWrong) {
    const base = Math.floor(fullBase / 2);
    return {
      base,
      speedBonus: 0,
      streakBonus: 0,
      total: base,
      reducedAfterWrong: true,
    };
  }

  let speedBonus = 0;
  for (const band of SPEED_BONUS_BANDS) {
    if (evt.timeToAnswerSec <= band.maxSec) {
      speedBonus = band.bonus;
      break;
    }
  }

  const newStreak = evt.currentStreak + 1;
  let streakBonus = 0;
  for (const tier of STREAK_BONUSES) {
    if (newStreak === tier.atStreak) {
      streakBonus = tier.bonus;
      break;
    }
  }

  return {
    base: fullBase,
    speedBonus,
    streakBonus,
    total: fullBase + speedBonus + streakBonus,
    reducedAfterWrong: false,
  };
}

/**
 * Score a wrong answer.
 *   `wrongAttemptIndex` is 0 for the first wrong on this question, 1 for
 *   the second, 2 for the third. After three wrongs the caller should
 *   auto-advance to the next rhythm.
 */
export function scoreWrong(wrongAttemptIndex: number): number {
  if (wrongAttemptIndex <= 0) return -5;
  if (wrongAttemptIndex === 1) return -10;
  return -15;
}

/** Three wrongs ends the question — caller advances to the next rhythm. */
export const MAX_WRONGS_PER_QUESTION = 3;
