/**
 * Live-monitor adapters for 12-lead patterns.
 *
 * The underlying RBBB/LBBB/STEMI/Brugada/etc. code is authored as 12-lead
 * morphology modifiers. This adapter makes those implemented patterns usable
 * on the live monitor by rendering the most educational single lead from the
 * 12-lead output instead of hiding the pattern from the rhythm selector.
 */

import type { ECGLead } from '../leadTypes';
import { ECG_LEADS } from '../leadTypes';
import { projectToLead } from '../leadMorphology';
import { RHYTHM_BY_ID } from '../rhythmCatalog';
import { resolveHrFor } from '../rhythmRateControl';
import {
  TWELVE_LEAD_REGISTRY,
  listTwelveLeadPatternIds,
  twelveLeadPatternChain,
} from '../twelveLeadRegistry';
import type { TwelveLeadECG } from '../twelveLeadTypes';
import type { ECGSettings, GeneratedECGSignal, RhythmId } from '../types';
import { makeSinusGenerator } from './sinusGenerator';

type LiveWaveformGenerator = (
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
) => GeneratedECGSignal;

const patternBaseGenerator = makeSinusGenerator({ minBpm: 40, maxBpm: 160 });

const LIVE_PATTERN_DISPLAY_LEADS: Partial<Record<RhythmId, ECGLead>> = {
  'conduction.rbbb': 'V1',
  'conduction.lbbb': 'V6',
  'conduction.wpw': 'II',
  'conduction.wpw-type-a': 'V1',
  'conduction.wpw-type-b': 'V1',
  'conduction.brugada-pattern': 'V1',

  'ischemia.st-depression': 'II',
  'ischemia.inferior-stemi': 'II',
  'ischemia.anterior-stemi': 'V3',
  'ischemia.lateral-stemi': 'V5',
  'ischemia.anterolateral-stemi': 'V4',
  'ischemia.septal-stemi': 'V1',
  'ischemia.posterior-stemi': 'V2',
  'ischemia.sgarbossa': 'V5',
  'ischemia.modified-sgarbossa': 'V1',

  'special.brugada-type-1': 'V1',
  'special.brugada-type-2': 'V1',
  'special.hypothermia': 'II',
};

export function liveMonitorLeadForRhythm(id: RhythmId): ECGLead {
  return LIVE_PATTERN_DISPLAY_LEADS[id] ?? 'II';
}

export function baseSinusRhythmIdForPatternRate(heartRate: number): RhythmId {
  if (heartRate < 60) return 'sinus.bradycardia';
  if (heartRate > 100) return 'sinus.tachycardia';
  return 'sinus.normal';
}

function buildCharacteristics(
  baseRhythmId: RhythmId,
  patternIds: readonly RhythmId[],
): readonly string[] {
  const base = RHYTHM_BY_ID.get(baseRhythmId);
  const out = [`Base rhythm: ${base?.displayName ?? baseRhythmId}.`];
  for (const patternId of patternIds) {
    const pattern = RHYTHM_BY_ID.get(patternId);
    if (!pattern) continue;
    out.push(`${pattern.displayName}: ${pattern.description}`);
    out.push(`Teaching cue: ${pattern.learningNotes}`);
  }
  return out;
}

function projectToTwelveLead(
  base: GeneratedECGSignal,
  baseRhythmId: RhythmId,
): TwelveLeadECG {
  const leads: Record<ECGLead, GeneratedECGSignal> = {} as Record<ECGLead, GeneratedECGSignal>;
  for (const lead of ECG_LEADS) {
    leads[lead] = projectToLead(base, lead);
  }

  return {
    rhythmId: baseRhythmId,
    patternIds: [],
    leads,
    interpretationHints: [],
    interpretationCharacteristics: buildCharacteristics(baseRhythmId, []),
    metadata: {
      baseRhythmId,
      conductionPatternId: null,
      ischemiaPatternId: null,
      electrolytePatternId: null,
      specialPatternId: null,
      affectedLeads: [],
      reciprocalLeads: [],
      patternCategory: null,
      isTwelveLeadPattern: true,
    },
  };
}

function generateTwelveLeadPatternLiveSignal(
  settings: ECGSettings,
  tStart: number,
  tEnd: number,
): GeneratedECGSignal {
  const patternId = settings.rhythmId;
  const hr = resolveHrFor(patternId, settings.heartRate);
  const baseRhythmId = baseSinusRhythmIdForPatternRate(hr);
  const baseSignal = patternBaseGenerator(
    {
      ...settings,
      rhythmId: baseRhythmId,
      heartRate: hr,
    },
    tStart,
    tEnd,
  );

  let twelveLead = projectToTwelveLead(baseSignal, baseRhythmId);
  const patternIds = twelveLeadPatternChain(patternId);
  for (const id of patternIds) {
    const pattern = TWELVE_LEAD_REGISTRY[id];
    if (!pattern) continue;
    twelveLead = pattern.apply(twelveLead);
  }

  const lead = liveMonitorLeadForRhythm(patternId);
  const signal = twelveLead.leads[lead] ?? twelveLead.leads.II;
  return {
    ...signal,
    rhythmId: patternId,
  };
}

export const TWELVE_LEAD_PATTERN_LIVE_GENERATORS: Partial<Record<RhythmId, LiveWaveformGenerator>> =
  Object.fromEntries(
    listTwelveLeadPatternIds().map((id) => [id, generateTwelveLeadPatternLiveSignal]),
  ) as Partial<Record<RhythmId, LiveWaveformGenerator>>;
