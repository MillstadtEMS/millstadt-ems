/**
 * Type contract for the "ECG Basics" beginner-education content.
 *
 * Distinct from the rhythm catalog. Rhythm questions are
 * "identify-this-strip" with distractors pulled from the catalog.
 * Basics questions are factual MCQ with explanations and key teaching points.
 */

import {
  type BasicsConceptId,
  isValidBasicsConceptId,
  assertValidBasicsConceptId,
} from './canonicalBasicsConceptIds';

export {
  type BasicsConceptId,
  isValidBasicsConceptId,
  assertValidBasicsConceptId,
};

export const BASICS_TOPICS = [
  'paper',
  'leads',
  'waves',
  'segments',
  'intervals',
  'rate',
  'axis',
  'approach',
] as const;
export type BasicsTopic = (typeof BASICS_TOPICS)[number];

export const BASICS_TOPIC_LABELS: Record<BasicsTopic, string> = {
  paper: 'ECG paper, time, and amplitude',
  leads: 'Leads and electrode placement',
  waves: 'Waves: P, Q, R, S, T, U, delta',
  segments: 'Segments and fiducial points',
  intervals: 'Intervals: PR, QRS, QT, RR, PP',
  rate: 'Rate calculation',
  axis: 'Cardiac axis',
  approach: 'Systematic approach',
};

export type BasicsDifficulty = 'beginner' | 'intermediate';

export interface BasicsConcept {
  /** Stable ID. Must be one of the canonical basics concept IDs. */
  id: BasicsConceptId;
  topic: BasicsTopic;
  title: string;
  /** One-paragraph plain-language summary. */
  summary: string;
  /** Concrete teaching cues a student can reproduce on a strip. */
  keyPoints: string[];
}

export interface BasicsAnswerChoice {
  /** Stable choice ID for analytics. */
  id: string;
  text: string;
}

export interface BasicsQuestion {
  /** Stable ID; never change after release. */
  id: string;
  /** Must reference a real basics concept. */
  conceptId: BasicsConceptId;
  topic: BasicsTopic;
  difficulty: BasicsDifficulty;
  prompt: string;
  /** 3–5 choices. The engine will randomize order at presentation time. */
  choices: BasicsAnswerChoice[];
  correctChoiceId: string;
  /** Plain-language explanation shown after the user answers. */
  explanation: string;
}
