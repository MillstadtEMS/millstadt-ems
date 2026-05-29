/**
 * Core ECG / monitor type definitions.
 *
 * This file is pure TypeScript. Do NOT import from React, React Native, or Skia.
 * Anything in /lib must remain testable in a Node-only Jest environment.
 */

import type { RhythmFamily } from './rhythmFamilies';
import type { RhythmDifficulty } from './difficulty';
import {
  type RhythmId,
  isValidRhythmId,
  assertValidRhythmId,
} from './canonicalRhythmIds';

export {
  type RhythmId,
  isValidRhythmId,
  assertValidRhythmId,
};

/**
 * Where the rhythm sits in the catalog. `RhythmType` is kept as an alias of
 * `RhythmId` for clarity at call sites that expect a "type of rhythm".
 */
export type RhythmType = RhythmId;

export type SourceReferenceLabel =
  | 'LITFL ECG Library'
  | 'ACLS rhythm recognition standards'
  | 'EMS/nursing rhythm interpretation education'
  | 'AHA ECG fundamentals'
  | 'Internal paraphrased educational notes';

/**
 * The catalog row for a rhythm. Most rhythms ship with `implemented: false`
 * and a working generator is added later in a rhythm-pack PR.
 *
 * `id` and `confusableWith` are typed against the canonical-IDs union, so
 * misspellings like `'sinus.nromal'` fail at compile time.
 */
export interface RhythmDefinition {
  /** Stable ID. Must be one of the canonical IDs. Never change once shipped. */
  id: RhythmId;
  /** User-facing name. Localizable; may change. */
  displayName: string;
  family: RhythmFamily;
  difficulty: RhythmDifficulty;
  /** Other names students/instructors may use for the same rhythm. */
  aliases: string[];
  /** True only when a real waveform generator + test exist for this rhythm. */
  implemented: boolean;
  /** IDs of rhythms commonly confused with this one — used by the quiz engine. */
  confusableWith: RhythmId[];
  /** Free-form keywords for filtering (e.g. 'wide-complex', 'lethal'). */
  tags: string[];
  /** Short clinical description. Original/paraphrased text only. */
  description: string;
  /** Teaching cues — what to look for, common pitfalls. Original text only. */
  learningNotes: string;
  /** Pointer to the educational reference style. Not a copy of source text. */
  sourceReferenceLabel: SourceReferenceLabel;
}

/** A single sample of an ECG tracing. `t` is seconds since signal start. */
export interface ECGPoint {
  t: number;
  /** Amplitude in millivolts. */
  mv: number;
}

/**
 * Logical events emitted by a generator alongside its raw samples. They make
 * rhythm logic testable without fragile peak detection — a test can assert
 * "this 10-second window of Mobitz I has 3 dropped-qrs events" instead of
 * trying to spot dropped beats by inspecting voltages.
 *
 * Event kinds:
 *  - `p-wave`              an atrial depolarization wave
 *  - `qrs-narrow`          a normal-width ventricular complex
 *  - `qrs-wide`            a wide-complex ventricular beat (PVC, VT, paced)
 *  - `t-wave`              a ventricular repolarization wave
 *  - `pvc`                 marker on a PVC beat (also has its own `qrs-wide`)
 *  - `dropped-qrs`         a P wave fired but no QRS conducted (AV block)
 *  - `flutter-wave`        one tooth of a sawtooth atrial flutter pattern
 *  - `vf-chaos`            a chaotic-VF window marker (no organized beats)
 *  - `asystole-baseline`   marker for an asystolic window (electrical silence)
 *  - `paced-spike`         pacemaker stimulus marker (future use)
 *  - `shock-artifact`      defib/cardiovert spike + monitor blanking marker
 *  - `adenosine-block`     transient AV block / pause after adenosine
 *  - `cpr-artifact`        compression artifact contaminating the ECG
 *  - `motion-artifact`     patient movement / lead motion artifact
 */
export type ECGEventKind =
  | 'p-wave'
  | 'qrs-narrow'
  | 'qrs-wide'
  | 't-wave'
  | 'pvc'
  | 'dropped-qrs'
  | 'flutter-wave'
  | 'vf-chaos'
  | 'asystole-baseline'
  | 'paced-spike'
  | 'shock-artifact'
  | 'adenosine-block'
  | 'cpr-artifact'
  | 'motion-artifact';

export interface ECGEvent {
  kind: ECGEventKind;
  /** Time of the event center, in seconds (matches `ECGPoint.t`). */
  tSec: number;
  /** Optional structured metadata (e.g., `{ prSec: 0.24 }`). */
  meta?: Readonly<Record<string, number | string | boolean>>;
}

/**
 * The full output of a waveform generator over one window.
 *
 * `points` and `events` are both restricted to the requested window, so a
 * caller can stitch consecutive windows by appending without overlap.
 */
export interface GeneratedECGSignal {
  rhythmId: RhythmId;
  /** Window start (inclusive), seconds. */
  windowStartSec: number;
  /** Window end (exclusive), seconds. */
  windowEndSec: number;
  sampleRateHz: number;
  points: ECGPoint[];
  events: ECGEvent[];
}

/** Live monitor numerics. */
export interface VitalSigns {
  heartRate: number;
  spo2: number;
  /** mmHg */
  systolicBP: number;
  /** mmHg */
  diastolicBP: number;
  respiratoryRate: number;
  /** mmHg */
  etco2: number;
  /** °F (we'll convert at the boundary if needed) */
  temperatureF?: number;
}

/** Adjustable noise/artifact layer — kept independent of the base rhythm. */
export interface ArtifactSettings {
  /** 0..1 — overall noise mix. */
  level: number;
  /** Skeletal muscle tremor band. */
  muscleTremor: boolean;
  /** Mains hum (60 Hz US / 50 Hz EU). */
  mainsHum: boolean;
  mainsHz: 50 | 60;
  /** Slow respiration-driven baseline drift. */
  wanderingBaseline: boolean;
}

/** Settings describing the signal generator's current request. */
export interface ECGSettings {
  rhythmId: RhythmId;
  heartRate: number;
  /** Sample rate in Hz. Cardiac monitors typically use 250–500 Hz. */
  sampleRateHz: number;
  artifact: ArtifactSettings;
  /**
   * Optional deterministic morphology variant seed. Same rhythm + same seed
   * must produce the same variant; different seeds may alter shape inside the
   * rhythm's clinical profile envelope.
   */
  variantSeed?: number;
}

/** Top-level monitor UI / runtime configuration. */
export interface MonitorSettings {
  ecg: ECGSettings;
  vitals: VitalSigns;
  /** When true, hide the rhythm name (test/quiz mode). */
  hideRhythmName: boolean;
  paused: boolean;
}
