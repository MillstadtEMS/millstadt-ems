/**
 * Presentation helpers for 12-lead snapshots.
 *
 * Keep these pure so scenario/quiz UIs can hide teaching metadata before a
 * learner commits to an answer without touching waveform generation.
 */

import type { TwelveLeadECG } from './twelveLeadTypes';

export function concealTwelveLeadMetadata(twelveLead: TwelveLeadECG): TwelveLeadECG {
  return {
    ...twelveLead,
    interpretationHints: [],
    interpretationCharacteristics: [],
    metadata: {
      ...twelveLead.metadata,
      affectedLeads: [],
      reciprocalLeads: [],
      patternCategory: null,
    },
  };
}
