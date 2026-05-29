/**
 * Waveform-generator registry.
 *
 * Each rhythm pack registers one or more generators here. A `WaveformGenerator`
 * takes an `ECGSettings` + a time window and returns a **`GeneratedECGSignal`**
 * — that's `points` (the renderer's input) PLUS event metadata (`p-wave`,
 * `qrs-narrow`, `qrs-wide`, `pvc`, `dropped-qrs`, `flutter-wave`, `vf-chaos`,
 * `asystole-baseline`, …). The events are what the test suite asserts on so
 * we don't depend on fragile pixel/voltage detection.
 *
 * Per-rhythm rate-control policy (HR-adjustable vs locked-fixed vs
 * locked-zero) lives in `rhythmRateControl.ts`. Generators that should honor
 * `settings.heartRate` call `resolveHrFor(rhythmId, settings.heartRate)` for
 * a single-source-of-truth clamp. Locked-rate generators ignore
 * `settings.heartRate` entirely; the monitor UI disables the HR stepper for
 * those rhythms so the displayed HR cannot disagree with the trace.
 *
 * Phase 3 ships 16 implemented rhythms (Phase 1's five plus the beginner
 * pack: sinus arrhythmia, AFib, AFlutter, SVT, isolated PVCs, stable VT,
 * PEA, 1° AVB, Wenckebach, Mobitz II, Complete Heart Block). Each has a
 * generator-level test in `/src/tests/*Generator*.test.ts`.
 *
 * Hard rule: do NOT add an entry to `WAVEFORM_GENERATORS` and flip
 * `implemented: true` in the catalog without a matching test. The catalog
 * test enforces the inverse: every `implemented: true` row must have a
 * registered generator (and the Phase-set sentinel catches the opposite
 * accident).
 */

import type { ECGSettings, GeneratedECGSignal, RhythmId } from './types';
import {
  sinusBradycardiaGenerator,
  sinusNormalGenerator,
  sinusTachycardiaGenerator,
} from './generators/sinusGenerator';
import { vfibGenerator } from './generators/vfibGenerator';
import { asystoleGenerator } from './generators/asystoleGenerator';
import { sinusArrhythmiaGenerator } from './generators/sinusArrhythmiaGenerator';
import { atrialFibGenerator } from './generators/atrialFibGenerator';
import { atrialFlutterGenerator } from './generators/atrialFlutterGenerator';
import { svtGenerator } from './generators/svtGenerator';
import { pvcGenerator } from './generators/pvcGenerator';
import { vtachGenerator } from './generators/vtachGenerator';
import { peaGenerator } from './generators/peaGenerator';
import {
  firstDegreeAvBlockGenerator,
  mobitzIGenerator,
  mobitzIIGenerator,
  thirdDegreeAvBlockGenerator,
  twoToOneAvBlockGenerator,
  highGradeAvBlockGenerator,
  avDissociationGenerator,
} from './generators/avBlockGenerators';
import {
  torsadesGenerator,
  polymorphicVtGenerator,
  bidirectionalVtGenerator,
} from './generators/polymorphicVtGenerators';
import {
  fascicularVtGenerator,
  rvotVtGenerator,
} from './generators/idiopathicVtGenerators';
import { atrialFibRvrGenerator } from './generators/atrialFibGenerator';
import {
  sinusArrestGenerator,
  wanderingAtrialPacemakerGenerator,
  focalAtrialTachGenerator,
  multifocalPvcGenerator,
  rOnTGenerator,
  quadrigeminyGenerator,
  ventricularEscapeGenerator,
  ventricularFlutterGenerator,
} from './generators/curriculumCoreGenerators';
import { atrialFlutterAtypicalGenerator } from './generators/atrialFlutterGenerator';
import { matGenerator } from './generators/matGenerator';
import { junctionalTachycardiaGenerator } from './generators/junctionalGenerators';
import { pjcGenerator } from './generators/pjcGenerator';
import {
  atrialPacedGenerator,
  ventricularPacedGenerator,
  avPacedGenerator,
  failureToPaceGenerator,
  failureToCaptureGenerator,
  failureToSenseGenerator,
  undersensingGenerator,
  oversensingGenerator,
  pmtGenerator,
  runawayPacemakerGenerator,
} from './generators/pacerGenerators';
import {
  hyperkalemiaPeakedTGenerator,
  hyperkalemiaProgressionGenerator,
  hyperkalemiaSineWaveGenerator,
} from './generators/hyperkalemiaGenerators';
import { pacGenerator } from './generators/pacGenerator';
import {
  avnrtGenerator,
  avrtGenerator,
} from './generators/svtMechanismsGenerator';
import {
  junctionalRhythmGenerator,
  acceleratedJunctionalGenerator,
} from './generators/junctionalGenerators';
import {
  pvcCoupletGenerator,
  pvcTripletGenerator,
  bigeminyGenerator,
  trigeminyGenerator,
} from './generators/pvcPatternGenerators';
import {
  idioventricularGenerator,
  aivrGenerator,
} from './generators/idioventricularGenerators';
import { nsvtGenerator } from './generators/nsvtGenerator';
import { vfibFineGenerator } from './generators/vfibFineGenerator';
import { TWELVE_LEAD_PATTERN_LIVE_GENERATORS } from './generators/twelveLeadPatternLiveGenerator';

/**
 * A pure function that produces a `GeneratedECGSignal` for a given time
 * window. The signal carries both raw samples (for the renderer) and
 * structured events (for tests and future analytics).
 */
export type WaveformGenerator = (
  settings: ECGSettings,
  /** Window start in seconds. */
  tStart: number,
  /** Window end in seconds (exclusive). */
  tEnd: number,
) => GeneratedECGSignal;

/** Registry of implemented generators. */
export const WAVEFORM_GENERATORS: Partial<Record<RhythmId, WaveformGenerator>> = {
  // Phase 1
  'sinus.normal': sinusNormalGenerator,
  'sinus.bradycardia': sinusBradycardiaGenerator,
  'sinus.tachycardia': sinusTachycardiaGenerator,
  'vent.vfib': vfibGenerator,
  'vent.asystole': asystoleGenerator,
  // Phase 3 — beginner pack
  'sinus.arrhythmia': sinusArrhythmiaGenerator,
  'atrial.fib': atrialFibGenerator,
  'atrial.flutter': atrialFlutterGenerator,
  'atrial.svt': svtGenerator,
  'vent.pvc': pvcGenerator,
  'vent.vtach-stable': vtachGenerator,
  'vent.pea': peaGenerator,
  'av-block.first-degree': firstDegreeAvBlockGenerator,
  'av-block.second-mobitz-i': mobitzIGenerator,
  'av-block.second-mobitz-ii': mobitzIIGenerator,
  'av-block.third-degree': thirdDegreeAvBlockGenerator,
  // Phase 4 — intermediate pack
  'atrial.pac': pacGenerator,
  'atrial.avnrt': avnrtGenerator,
  'atrial.avrt': avrtGenerator,
  'junctional.rhythm': junctionalRhythmGenerator,
  'junctional.accelerated': acceleratedJunctionalGenerator,
  'vent.pvc-couplet': pvcCoupletGenerator,
  'vent.pvc-triplet': pvcTripletGenerator,
  'vent.bigeminy': bigeminyGenerator,
  'vent.trigeminy': trigeminyGenerator,
  'vent.idioventricular': idioventricularGenerator,
  'vent.aivr': aivrGenerator,
  'vent.nsvt': nsvtGenerator,
  'vent.vfib-fine': vfibFineGenerator,
  'av-block.2-1': twoToOneAvBlockGenerator,
  // Phase 5 — expert pack
  'vent.torsades': torsadesGenerator,
  'vent.polymorphic-vt': polymorphicVtGenerator,
  'vent.bidirectional-vt': bidirectionalVtGenerator,
  'vent.fascicular-vt': fascicularVtGenerator,
  'vent.rvot-vt': rvotVtGenerator,
  'av-block.high-grade': highGradeAvBlockGenerator,
  'av-block.dissociation': avDissociationGenerator,
  'pacer.atrial': atrialPacedGenerator,
  'pacer.ventricular': ventricularPacedGenerator,
  'pacer.av': avPacedGenerator,
  'pacer.failure-to-pace': failureToPaceGenerator,
  'pacer.failure-to-capture': failureToCaptureGenerator,
  'pacer.failure-to-sense': failureToSenseGenerator,
  'pacer.oversensing': oversensingGenerator,
  'pacer.undersensing': undersensingGenerator,
  'pacer.pmt': pmtGenerator,
  'pacer.runaway': runawayPacemakerGenerator,
  'electrolyte.hyperk-peaked-t': hyperkalemiaPeakedTGenerator,
  'electrolyte.hyperk-progression': hyperkalemiaProgressionGenerator,
  'electrolyte.hyperk-sine-wave': hyperkalemiaSineWaveGenerator,
  // Phase 8 — paramedic-curriculum rhythms
  'atrial.fib-rvr': atrialFibRvrGenerator,
  'atrial.flutter-atypical': atrialFlutterAtypicalGenerator,
  'atrial.mat': matGenerator,
  'junctional.tachycardia': junctionalTachycardiaGenerator,
  'junctional.pjc': pjcGenerator,
  // Curriculum-classification Basic/Core additions
  'sinus.arrest': sinusArrestGenerator,
  'atrial.wandering-pacemaker': wanderingAtrialPacemakerGenerator,
  'atrial.focal-atrial-tach': focalAtrialTachGenerator,
  'vent.pvc-multifocal': multifocalPvcGenerator,
  'vent.r-on-t': rOnTGenerator,
  'vent.quadrigeminy': quadrigeminyGenerator,
  'vent.ventricular-escape': ventricularEscapeGenerator,
  // Nerd/Expert
  'vent.flutter': ventricularFlutterGenerator,

  // 12-lead morphology patterns exposed as diagnostic single-lead live views.
  ...TWELVE_LEAD_PATTERN_LIVE_GENERATORS,
};

export function hasGenerator(id: RhythmId): boolean {
  return WAVEFORM_GENERATORS[id] !== undefined;
}
