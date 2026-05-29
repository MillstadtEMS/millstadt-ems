/**
 * 12-lead ECG generator orchestrator.
 *
 *   1. Generate the base single-lead signal at the requested rhythm.
 *   2. Project the base into all 12 leads via per-lead axis factors.
 *   3. Apply zero-or-more pattern modifiers (RBBB → LBBB → STEMI → Sgarbossa).
 *   4. Return a `TwelveLeadECG` with metadata describing what was applied.
 *
 * Phase-6 scope: Sgarbossa requires LBBB upstream (its modifier composes on
 * an LBBB-shaped base). Other modifiers compose freely.
 */

import type {
  ECGSettings,
  GeneratedECGSignal,
  RhythmId,
} from './types';
import type { ECGLead } from './leadTypes';
import { ECG_LEADS } from './leadTypes';
import { LEAD_FLAT_ORDER, TWELVE_LEAD_WINDOW_SEC } from './twelveLeadConstants';
import type { TwelveLeadECG } from './twelveLeadTypes';
import { projectToLead } from './leadMorphology';
import { hasGenerator, WAVEFORM_GENERATORS } from './waveform';
import { TWELVE_LEAD_REGISTRY, hasTwelveLeadPattern } from './twelveLeadRegistry';
import { DEFAULT_SAMPLE_RATE_HZ } from './constants';
import { DEFAULT_ARTIFACT } from './artifacts';
import { resolveHrFor } from './rhythmRateControl';
import { RHYTHM_BY_ID } from './rhythmCatalog';
import { requireMorphologyProfile } from './litflMorphologyProfiles';

export interface GenerateTwelveLeadArgs {
  /** Base rhythm — must have a single-lead generator in WAVEFORM_GENERATORS. */
  baseRhythmId: RhythmId;
  /** 12-lead pattern IDs to apply, in order. */
  patternIds?: readonly RhythmId[];
  /** Optional HR override for current monitor captures. Defaults to rhythm policy. */
  heartRate?: number;
  /** Window length to render (defaults to TWELVE_LEAD_WINDOW_SEC). */
  windowSec?: number;
  /** Sample rate; defaults to DEFAULT_SAMPLE_RATE_HZ. */
  sampleRateHz?: number;
}

/**
 * Project a single-lead `GeneratedECGSignal` into a `TwelveLeadECG` baseline
 * (no modifiers applied).
 */
function projectToTwelveLead(
  base: GeneratedECGSignal,
  rhythmId: RhythmId,
): TwelveLeadECG {
  const leads: Record<ECGLead, GeneratedECGSignal> = {} as Record<ECGLead, GeneratedECGSignal>;
  for (const lead of ECG_LEADS) {
    leads[lead] = projectToLead(base, lead);
  }
  return {
    rhythmId,
    patternIds: [],
    leads,
    interpretationHints: [],
    interpretationCharacteristics: buildInterpretationCharacteristics(rhythmId, []),
    metadata: {
      baseRhythmId: rhythmId,
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

function rangeLabel(range: { min: number; max: number } | undefined, unit: string): string | null {
  if (!range) return null;
  return `${range.min}-${range.max} ${unit}`;
}

function readableRegularity(value: string): string {
  return value.replace(/-/g, ' ');
}

function buildInterpretationCharacteristics(
  baseRhythmId: RhythmId,
  patternIds: readonly RhythmId[],
): readonly string[] {
  const out: string[] = [];
  const baseDef = RHYTHM_BY_ID.get(baseRhythmId);

  try {
    const profile = requireMorphologyProfile(baseRhythmId);
    const rate =
      rangeLabel(profile.rateBpm, 'bpm') ??
      rangeLabel(profile.ventricularRateBpm, 'bpm ventricular') ??
      rangeLabel(profile.atrialRateBpm, 'bpm atrial');
    out.push(`Base rhythm: ${baseDef?.displayName ?? baseRhythmId}.`);
    out.push(`Regularity/rate: ${readableRegularity(profile.regularity)}${rate ? `, ${rate}` : ''}.`);
    out.push(`P waves: ${profile.pWave}`);
    out.push(`QRS: ${profile.qrs}`);
    out.push(`ST/T: ${profile.stT}`);
  } catch {
    if (baseDef) {
      out.push(`Base rhythm: ${baseDef.displayName}.`);
      out.push(`Core clue: ${baseDef.description}`);
      out.push(`Teaching cue: ${baseDef.learningNotes}`);
    }
  }

  for (const patternId of patternIds) {
    const patternDef = RHYTHM_BY_ID.get(patternId);
    if (!patternDef) continue;
    out.push(`Pattern clue - ${patternDef.displayName}: ${patternDef.description}`);
    if (patternDef.learningNotes) out.push(`Pattern teaching: ${patternDef.learningNotes}`);
  }

  return out;
}

export function generateTwelveLead(
  args: GenerateTwelveLeadArgs,
): TwelveLeadECG {
  const baseRhythmId = args.baseRhythmId;
  if (hasTwelveLeadPattern(baseRhythmId)) {
    throw new Error(
      `Cannot generate 12-lead ECG: base rhythm ${JSON.stringify(baseRhythmId)} ` +
        `is a 12-lead pattern, not a base rhythm. Pick a rhythm from ` +
        `listSingleLeadRhythms() and apply this ID through patternIds.`,
    );
  }
  if (!hasGenerator(baseRhythmId)) {
    throw new Error(
      `Cannot generate 12-lead ECG: base rhythm ${JSON.stringify(baseRhythmId)} ` +
        `has no single-lead generator in WAVEFORM_GENERATORS. Pick a rhythm ` +
        `from listSingleLeadRhythms().`,
    );
  }
  const settings: ECGSettings = {
    rhythmId: baseRhythmId,
    heartRate: resolveHrFor(baseRhythmId, args.heartRate ?? NaN), // pull policy default when omitted
    sampleRateHz: args.sampleRateHz ?? DEFAULT_SAMPLE_RATE_HZ,
    artifact: DEFAULT_ARTIFACT,
  };
  const windowSec = args.windowSec ?? TWELVE_LEAD_WINDOW_SEC;
  const baseGen = WAVEFORM_GENERATORS[baseRhythmId]!;
  const baseSignal = baseGen(settings, 0, windowSec);

  let twelveLead = projectToTwelveLead(baseSignal, baseRhythmId);

  for (const patternId of args.patternIds ?? []) {
    const pattern = TWELVE_LEAD_REGISTRY[patternId];
    if (!pattern) {
      throw new Error(
        `Unknown 12-lead pattern: ${JSON.stringify(patternId)}. Patterns must ` +
          `be registered in TWELVE_LEAD_REGISTRY.`,
      );
    }
    if (pattern.requires) {
      for (const requiredId of pattern.requires) {
        if (!twelveLead.patternIds.includes(requiredId)) {
          throw new Error(
            `Pattern ${JSON.stringify(patternId)} requires ${JSON.stringify(requiredId)} ` +
              `to be applied first. Apply patterns in dependency order.`,
          );
        }
      }
    }
    twelveLead = pattern.apply(twelveLead);
  }
  return {
    ...twelveLead,
    interpretationCharacteristics: buildInterpretationCharacteristics(baseRhythmId, twelveLead.patternIds),
  };
}

export function generateTwelveLeadOrFallback(
  args: GenerateTwelveLeadArgs,
  fallbackRhythmId: RhythmId = 'sinus.normal',
): TwelveLeadECG {
  try {
    return generateTwelveLead(args);
  } catch {
    return generateTwelveLead({
      ...args,
      baseRhythmId: fallbackRhythmId,
      patternIds: [],
      heartRate: args.heartRate,
    });
  }
}

/** Re-export display ordering for UI convenience. */
export { LEAD_FLAT_ORDER };
