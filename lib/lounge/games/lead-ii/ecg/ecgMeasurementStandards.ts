/**
 * ECG measurement standards for grid rendering, teaching overlays, and future
 * morphology tuning.
 *
 * Units are intentionally explicit. The app renders ECG paper at 25 mm/sec and
 * 10 mm/mV by default, so every interval and voltage below can be translated
 * directly to small boxes on the simulator grid.
 *
 * Source basis, paraphrased:
 * - AHA/ACCF/HRS ECG standardization statements: technology, conduction
 *   disturbances, ST/T/U/QT interpretation, chamber enlargement.
 * - Fourth Universal Definition of MI for STEMI thresholds.
 * - Large adult normal ECG interval studies for typical PR/QRS/QTc values.
 *
 * These are educational simulator envelopes, not a diagnostic engine.
 */

import type { RhythmId } from './types';

export type MeasurementUnit = 'bpm' | 'ms' | 'mV' | 'deg' | 'percent';

export interface MeasurementBand {
  min: number;
  max: number;
  typical?: number;
  unit: MeasurementUnit;
  note?: string;
}

export interface ThresholdBand {
  value: number;
  unit: MeasurementUnit;
  comparator: '<' | '<=' | '>' | '>=' | '=';
  note?: string;
}

export interface ECGGridSpec {
  paperSpeedMmPerSec: number;
  voltageGainMmPerMv: number;
  smallBoxMm: number;
  largeBoxMm: number;
  smallBoxTimeSec: number;
  largeBoxTimeSec: number;
  smallBoxVoltageMv: number;
  largeBoxVoltageMv: number;
  calibrationPulseMv: number;
  calibrationPulseHeightMm: number;
  calibrationPulseWidthMs: number;
}

export const ECG_GRID_STANDARD: ECGGridSpec = {
  paperSpeedMmPerSec: 25,
  voltageGainMmPerMv: 10,
  smallBoxMm: 1,
  largeBoxMm: 5,
  smallBoxTimeSec: 0.04,
  largeBoxTimeSec: 0.2,
  smallBoxVoltageMv: 0.1,
  largeBoxVoltageMv: 0.5,
  calibrationPulseMv: 1,
  calibrationPulseHeightMm: 10,
  calibrationPulseWidthMs: 200,
} as const;

export function secondsToMm(seconds: number, paperSpeedMmPerSec = ECG_GRID_STANDARD.paperSpeedMmPerSec): number {
  return seconds * paperSpeedMmPerSec;
}

export function msToMm(ms: number, paperSpeedMmPerSec = ECG_GRID_STANDARD.paperSpeedMmPerSec): number {
  return secondsToMm(ms / 1000, paperSpeedMmPerSec);
}

export function mmToSeconds(mm: number, paperSpeedMmPerSec = ECG_GRID_STANDARD.paperSpeedMmPerSec): number {
  return mm / paperSpeedMmPerSec;
}

export function mvToMm(mv: number, voltageGainMmPerMv = ECG_GRID_STANDARD.voltageGainMmPerMv): number {
  return mv * voltageGainMmPerMv;
}

export function mmToMv(mm: number, voltageGainMmPerMv = ECG_GRID_STANDARD.voltageGainMmPerMv): number {
  return mm / voltageGainMmPerMv;
}

export function msToSmallBoxes(ms: number): number {
  return msToMm(ms) / ECG_GRID_STANDARD.smallBoxMm;
}

export function mvToSmallBoxes(mv: number): number {
  return mvToMm(mv) / ECG_GRID_STANDARD.smallBoxMm;
}

export function bpmToRrMs(bpm: number): number {
  return 60000 / bpm;
}

export function rrMsToBpm(rrMs: number): number {
  return 60000 / rrMs;
}

export function heartRateFromLargeBoxes(largeBoxesBetweenR: number): number {
  return 300 / largeBoxesBetweenR;
}

export function heartRateFromSmallBoxes(smallBoxesBetweenR: number): number {
  return 1500 / smallBoxesBetweenR;
}

export function bandToSmallBoxes(band: MeasurementBand): MeasurementBand {
  if (band.unit === 'ms') {
    return {
      min: msToSmallBoxes(band.min),
      max: msToSmallBoxes(band.max),
      typical: band.typical === undefined ? undefined : msToSmallBoxes(band.typical),
      unit: 'ms',
      note: 'small-box span on 25 mm/sec paper',
    };
  }
  if (band.unit === 'mV') {
    return {
      min: mvToSmallBoxes(band.min),
      max: mvToSmallBoxes(band.max),
      typical: band.typical === undefined ? undefined : mvToSmallBoxes(band.typical),
      unit: 'mV',
      note: 'small-box height at 10 mm/mV gain',
    };
  }
  return band;
}

const bpm = (min: number, max: number, typical?: number, note?: string): MeasurementBand => ({
  min,
  max,
  typical,
  unit: 'bpm',
  note,
});

const ms = (min: number, max: number, typical?: number, note?: string): MeasurementBand => ({
  min,
  max,
  typical,
  unit: 'ms',
  note,
});

const mv = (min: number, max: number, typical?: number, note?: string): MeasurementBand => ({
  min,
  max,
  typical,
  unit: 'mV',
  note,
});

const deg = (min: number, max: number, typical?: number, note?: string): MeasurementBand => ({
  min,
  max,
  typical,
  unit: 'deg',
  note,
});

const threshold = (
  comparator: ThresholdBand['comparator'],
  value: number,
  unit: MeasurementUnit,
  note?: string,
): ThresholdBand => ({ comparator, value, unit, note });

export interface ECGNormalMeasurementStandards {
  pWave: {
    durationMs: MeasurementBand;
    leadIiAmplitudeMv: MeasurementBand;
    v1PositiveAmplitudeMv: ThresholdBand;
    v1TerminalNegative: {
      depthMv: ThresholdBand;
      widthMs: ThresholdBand;
    };
    axisDeg: MeasurementBand;
  };
  prIntervalMs: MeasurementBand;
  qrsDurationMs: {
    normal: MeasurementBand;
    borderline: MeasurementBand;
    incompleteBundleBranchBlock: MeasurementBand;
    completeBundleBranchBlock: ThresholdBand;
    veryWide: ThresholdBand;
  };
  qrsAxisDeg: {
    normal: MeasurementBand;
    leftAxisDeviation: ThresholdBand;
    rightAxisDeviation: ThresholdBand;
    extremeAxis: MeasurementBand;
  };
  stSegment: {
    normalElevationMostLeadsMv: ThresholdBand;
    normalDepressionMv: ThresholdBand;
    stemiThresholdsMv: {
      v2V3MenUnder40: ThresholdBand;
      v2V3Men40OrOlder: ThresholdBand;
      v2V3Women: ThresholdBand;
      allOtherContiguousLeads: ThresholdBand;
    };
  };
  tWave: {
    limbAmplitudeMv: MeasurementBand;
    precordialAmplitudeMv: MeasurementBand;
    upperV2V3YoungMenMv: ThresholdBand;
    flatMv: MeasurementBand;
  };
  qtInterval: {
    rawAtHr60Ms: MeasurementBand;
    rawAtHr80Ms: MeasurementBand;
    qtcMenMs: ThresholdBand;
    qtcWomenMs: ThresholdBand;
    qtcHighRiskMs: ThresholdBand;
    shortQtcMs: ThresholdBand;
  };
  uWave: {
    amplitudeMv: MeasurementBand;
    abnormalAmplitudeMv: ThresholdBand;
    relativeToTWave: ThresholdBand;
  };
}

export const ECG_NORMAL_MEASUREMENTS: ECGNormalMeasurementStandards = {
  pWave: {
    durationMs: ms(80, 120, 100, '2 to 3 small boxes'),
    leadIiAmplitudeMv: mv(0.1, 0.25, 0.15, '1 to 2.5 small boxes high'),
    v1PositiveAmplitudeMv: threshold('<=', 0.15, 'mV', 'initial positive component'),
    v1TerminalNegative: {
      depthMv: threshold('<=', 0.1, 'mV', 'normally <=1 mm deep'),
      widthMs: threshold('<=', 40, 'ms', 'normally <=1 small box wide'),
    },
    axisDeg: deg(0, 75, 55, 'upright in I, II, aVF; inverted in aVR'),
  },
  prIntervalMs: ms(120, 200, 160, '3 to 5 small boxes'),
  qrsDurationMs: {
    normal: ms(60, 100, 85, '1.5 to 2.5 small boxes'),
    borderline: ms(100, 110, 105),
    incompleteBundleBranchBlock: ms(100, 119, 110),
    completeBundleBranchBlock: threshold('>=', 120, 'ms', '3 or more small boxes'),
    veryWide: threshold('>', 160, 'ms', 'think VT, hyperkalemia, paced rhythm, or sodium-channel blockade'),
  },
  qrsAxisDeg: {
    normal: deg(-30, 90, 60),
    leftAxisDeviation: threshold('<', -30, 'deg'),
    rightAxisDeviation: threshold('>', 90, 'deg'),
    extremeAxis: deg(-180, -90, -120, 'northwest/extreme axis'),
  },
  stSegment: {
    normalElevationMostLeadsMv: threshold('<', 0.1, 'mV', '<1 mm in most leads'),
    normalDepressionMv: threshold('<', 0.05, 'mV', '<0.5 mm'),
    stemiThresholdsMv: {
      v2V3MenUnder40: threshold('>=', 0.25, 'mV', '>=2.5 mm in V2-V3'),
      v2V3Men40OrOlder: threshold('>=', 0.2, 'mV', '>=2.0 mm in V2-V3'),
      v2V3Women: threshold('>=', 0.15, 'mV', '>=1.5 mm in V2-V3'),
      allOtherContiguousLeads: threshold('>=', 0.1, 'mV', '>=1.0 mm in at least two contiguous leads'),
    },
  },
  tWave: {
    limbAmplitudeMv: mv(0.1, 0.5, 0.25, 'usually 1 to 5 mm'),
    precordialAmplitudeMv: mv(0.2, 1, 0.5, 'usually 2 to 10 mm'),
    upperV2V3YoungMenMv: threshold('<=', 1.6, 'mV', 'young men can have tall normal anterior T waves'),
    flatMv: mv(-0.1, 0.1, 0, 'near-isoelectric T wave'),
  },
  qtInterval: {
    rawAtHr60Ms: ms(380, 440, 410),
    rawAtHr80Ms: ms(320, 380, 350),
    qtcMenMs: threshold('<=', 440, 'ms'),
    qtcWomenMs: threshold('<=', 460, 'ms'),
    qtcHighRiskMs: threshold('>', 500, 'ms', 'higher torsades risk'),
    shortQtcMs: threshold('<', 340, 'ms'),
  },
  uWave: {
    amplitudeMv: mv(0, 0.2, 0.1, 'best seen in V2-V3'),
    abnormalAmplitudeMv: threshold('>', 0.2, 'mV', '>2 mm'),
    relativeToTWave: threshold('<', 25, 'percent', 'percent of T-wave height'),
  },
} as const;

export interface LeadQrsMorphologyStandard {
  lead: 'I' | 'II' | 'III' | 'aVR' | 'aVL' | 'aVF' | 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6';
  expectedPolarity: 'positive' | 'negative' | 'variable' | 'transitional';
  rWaveMv?: MeasurementBand;
  sWaveMv?: MeasurementBand;
  qWaveNormal?: string;
  notes: string;
}

export const NORMAL_QRS_MORPHOLOGY_BY_LEAD: readonly LeadQrsMorphologyStandard[] = [
  { lead: 'I', expectedPolarity: 'positive', rWaveMv: mv(0.5, 1.5, 1), qWaveNormal: 'small septal q can be normal', notes: 'Usually upright with small or absent S.' },
  { lead: 'II', expectedPolarity: 'positive', rWaveMv: mv(0.5, 2, 1.2), qWaveNormal: 'small q can be normal', notes: 'Often tallest limb-lead R wave.' },
  { lead: 'III', expectedPolarity: 'variable', rWaveMv: mv(0, 1.5, 0.6), qWaveNormal: 'isolated Q in III can be normal', notes: 'Highly axis-dependent.' },
  { lead: 'aVR', expectedPolarity: 'negative', rWaveMv: mv(0, 0.5, 0.2), notes: 'Predominantly negative; QS is normal.' },
  { lead: 'aVL', expectedPolarity: 'variable', rWaveMv: mv(0, 1.2, 0.4), qWaveNormal: 'small q can be normal', notes: 'Depends on horizontal/vertical heart position.' },
  { lead: 'aVF', expectedPolarity: 'positive', rWaveMv: mv(0.4, 1.5, 0.9), qWaveNormal: 'small q can be normal', notes: 'Usually upright.' },
  { lead: 'V1', expectedPolarity: 'negative', rWaveMv: mv(0.1, 0.4, 0.2), sWaveMv: mv(0.8, 2, 1.2), notes: 'Typical rS pattern; S wave dominant.' },
  { lead: 'V2', expectedPolarity: 'negative', rWaveMv: mv(0.2, 0.8, 0.4), sWaveMv: mv(1, 2.5, 1.5), notes: 'Deepest S is commonly V2.' },
  { lead: 'V3', expectedPolarity: 'transitional', rWaveMv: mv(0.5, 1.5, 0.9), sWaveMv: mv(0.5, 1.5, 0.9), notes: 'Transition zone often V3-V4.' },
  { lead: 'V4', expectedPolarity: 'positive', rWaveMv: mv(1, 2.5, 1.5), sWaveMv: mv(0.3, 0.8, 0.4), notes: 'R wave becomes dominant.' },
  { lead: 'V5', expectedPolarity: 'positive', rWaveMv: mv(1, 2.5, 1.6), sWaveMv: mv(0, 0.5, 0.2), qWaveNormal: 'small septal q can be normal', notes: 'Often tallest precordial R wave.' },
  { lead: 'V6', expectedPolarity: 'positive', rWaveMv: mv(0.8, 2, 1.2), sWaveMv: mv(0, 0.3, 0.1), qWaveNormal: 'small septal q can be normal', notes: 'Tall R with small or absent S.' },
] as const;

export type RhythmMeasurementCategory =
  | 'sinus'
  | 'atrial'
  | 'junctional'
  | 'ventricular'
  | 'av-block'
  | 'pacer'
  | 'conduction'
  | 'ischemia'
  | 'electrolyte'
  | 'special';

export interface WavePresenceSpec {
  status: 'present' | 'absent' | 'variable' | 'chaotic' | 'paced';
  durationMs?: MeasurementBand;
  amplitudeMv?: MeasurementBand;
  morphology: string;
}

export interface RhythmProgressionStage {
  id: string;
  label: string;
  trigger: string;
  ecgChanges: readonly string[];
  parameters: readonly string[];
}

export interface RhythmSimulationRule {
  id: string;
  display: string;
  learnerMust: string;
  danger?: string;
  treatment?: readonly string[];
}

export interface RhythmMeasurementSpec {
  rhythmId: RhythmId;
  displayName: string;
  category: RhythmMeasurementCategory;
  renderingStatus?: 'rendered' | 'measurement-only';
  rateBpm: MeasurementBand | null;
  atrialRateBpm?: MeasurementBand;
  ventricularRateBpm?: MeasurementBand;
  regularity: 'regular' | 'regular-with-pauses' | 'irregular' | 'irregularly-irregular' | 'chaotic' | 'organized-no-pulse';
  pWave: WavePresenceSpec;
  prMs: MeasurementBand | null;
  qrsMs: MeasurementBand | null;
  qt: string;
  stSegment: string;
  tWave: string;
  gridNotes: readonly string[];
  extremeVariants: readonly string[];
  generatorHints: readonly string[];
  progressionStages?: readonly RhythmProgressionStage[];
  simulationRules?: readonly RhythmSimulationRule[];
  criticalTeachingPoints?: readonly string[];
}

const normalP: WavePresenceSpec = {
  status: 'present',
  durationMs: ECG_NORMAL_MEASUREMENTS.pWave.durationMs,
  amplitudeMv: ECG_NORMAL_MEASUREMENTS.pWave.leadIiAmplitudeMv,
  morphology: 'uniform sinus P; upright in lead II, inverted in aVR',
};

const noP = (morphology: string): WavePresenceSpec => ({
  status: 'absent',
  morphology,
});

const variableP = (morphology: string): WavePresenceSpec => ({
  status: 'variable',
  durationMs: ECG_NORMAL_MEASUREMENTS.pWave.durationMs,
  amplitudeMv: ECG_NORMAL_MEASUREMENTS.pWave.leadIiAmplitudeMv,
  morphology,
});

const pacedP = (morphology: string): WavePresenceSpec => ({
  status: 'paced',
  morphology,
});

const normalPr = ECG_NORMAL_MEASUREMENTS.prIntervalMs;
const normalQrs = ECG_NORMAL_MEASUREMENTS.qrsDurationMs.normal;
const narrowQrs = ms(60, 110, 85, 'narrow or borderline narrow');
const wideQrs = ms(120, 200, 160, '3 to 5 small boxes; use wide-complex rendering');

export const RHYTHM_MEASUREMENT_SPECS: readonly RhythmMeasurementSpec[] = [
  {
    rhythmId: 'sinus.normal',
    displayName: 'Normal sinus rhythm',
    category: 'sinus',
    rateBpm: bpm(60, 100, 75),
    regularity: 'regular',
    pWave: normalP,
    prMs: normalPr,
    qrsMs: normalQrs,
    qt: 'QT varies with rate; QTc should remain within normal sex-adjusted range.',
    stSegment: 'Isoelectric ST segment; <1 mm normal J-point elevation in most leads.',
    tWave: 'Upright in I, II, V3-V6; asymmetric with gradual upstroke and steeper downstroke.',
    gridNotes: ['RR at 75 bpm is 800 ms, about 20 small boxes.', 'PR typical 160 ms is 4 small boxes.', 'QRS typical 85 ms is just over 2 small boxes.'],
    extremeVariants: ['Athletic/vagal variant can have slower sinus rate with otherwise normal intervals.', 'Tall normal anterior T waves can be seen in young men.'],
    generatorHints: ['Use normal PQRST template with mild beat-to-beat RR variability.'],
  },
  {
    rhythmId: 'sinus.bradycardia',
    displayName: 'Sinus bradycardia',
    category: 'sinus',
    rateBpm: bpm(30, 59, 50),
    regularity: 'regular',
    pWave: normalP,
    prMs: normalPr,
    qrsMs: normalQrs,
    qt: 'Raw QT lengthens as heart rate slows; QTc should be corrected.',
    stSegment: 'Usually isoelectric unless ischemia/electrolyte modifier is layered in.',
    tWave: 'Normal polarity; U waves may become easier to see at slow rates.',
    gridNotes: ['At 50 bpm, RR is 1200 ms or 30 small boxes.', 'Keep P before every QRS.'],
    extremeVariants: ['Severe symptomatic sinus bradycardia can be 20-35 bpm.', 'Long pauses suggest sinus arrest or sick sinus rather than simple bradycardia.'],
    generatorHints: ['Stretch RR interval; keep PR/QRS morphology normal.'],
  },
  {
    rhythmId: 'sinus.tachycardia',
    displayName: 'Sinus tachycardia',
    category: 'sinus',
    rateBpm: bpm(101, 180, 120),
    regularity: 'regular',
    pWave: { ...normalP, morphology: 'sinus P before every QRS; may partially merge into preceding T wave at high rates' },
    prMs: ms(120, 180, 145, 'PR can shorten with sympathetic tone'),
    qrsMs: normalQrs,
    qt: 'Raw QT shortens as rate rises; use QTc for interpretation.',
    stSegment: 'Rate-related upsloping ST depression can be simulated as a benign variant.',
    tWave: 'P-on-T overlap is common at higher rates.',
    gridNotes: ['At 150 bpm, RR is 400 ms or 10 small boxes.', 'Gradual onset/offset separates it from most re-entrant SVT.'],
    extremeVariants: ['Rates above 180 in adults should prompt SVT consideration unless physiologic cause is explicit.'],
    generatorHints: ['Use smooth ramp for onset if scenario shows fever, pain, or hypovolemia.'],
  },
  {
    rhythmId: 'sinus.arrhythmia',
    displayName: 'Sinus arrhythmia',
    category: 'sinus',
    rateBpm: bpm(50, 100, 75),
    regularity: 'irregular',
    pWave: normalP,
    prMs: normalPr,
    qrsMs: normalQrs,
    qt: 'Normal QTc.',
    stSegment: 'Isoelectric.',
    tWave: 'Normal polarity.',
    gridNotes: ['Longest minus shortest PP/RR should exceed 160 ms, about 4 small boxes.', 'P-wave shape remains constant despite RR variability.'],
    extremeVariants: ['Marked respiratory sinus arrhythmia is common in young or athletic learners.'],
    generatorHints: ['Modulate RR with a slow respiratory sine wave; keep P morphology fixed.'],
  },
  {
    rhythmId: 'sinus.arrest',
    displayName: 'Sinus arrest / sinus pause',
    category: 'sinus',
    rateBpm: bpm(40, 90, 60, 'underlying sinus rate between pauses'),
    regularity: 'regular-with-pauses',
    pWave: { ...normalP, morphology: 'normal sinus P waves except absent during pause' },
    prMs: normalPr,
    qrsMs: normalQrs,
    qt: 'Normal QTc on conducted beats.',
    stSegment: 'Isoelectric on conducted beats.',
    tWave: 'Normal on conducted beats.',
    gridNotes: ['Pause is not an exact multiple of the baseline PP interval.', 'Pause >2 seconds should be visually obvious on grid paper.'],
    extremeVariants: ['Escape junctional or ventricular beat can terminate a long pause.'],
    generatorHints: ['Suppress P and QRS during pause; optionally add escape beat after 2-4 seconds.'],
  },
  {
    rhythmId: 'atrial.pac',
    displayName: 'Premature atrial complex',
    category: 'atrial',
    rateBpm: bpm(50, 110, 75, 'underlying rhythm'),
    regularity: 'irregular',
    pWave: variableP('early ectopic P wave with a shape different from sinus P; may hide in preceding T wave'),
    prMs: ms(120, 220, 160, 'can be shorter or longer than sinus PR'),
    qrsMs: narrowQrs,
    qt: 'Normal on conducted beats.',
    stSegment: 'No primary ST change unless aberrancy/ischemia is layered in.',
    tWave: 'PAC P wave may deform the preceding T wave.',
    gridNotes: ['Premature P arrives early; following pause is usually incomplete.', 'Aberrant PAC can have RBBB-like wide QRS.'],
    extremeVariants: ['Blocked PAC has a premature P not followed by QRS and can mimic AV block.'],
    generatorHints: ['Insert early atrial event; reset sinus node with incomplete compensatory pause.'],
  },
  {
    rhythmId: 'atrial.wandering-pacemaker',
    displayName: 'Wandering atrial pacemaker',
    category: 'atrial',
    rateBpm: bpm(50, 99, 75),
    regularity: 'irregular',
    pWave: variableP('at least three P-wave morphologies with shifting atrial focus'),
    prMs: ms(120, 220, 160, 'varies beat to beat'),
    qrsMs: normalQrs,
    qt: 'Normal QTc.',
    stSegment: 'Isoelectric.',
    tWave: 'Normal unless P wave overlaps.',
    gridNotes: ['Require three visibly different P shapes in the strip.', 'Rate below 100 separates this from MAT.'],
    extremeVariants: ['Can transition into MAT when rate exceeds 100 bpm.'],
    generatorHints: ['Cycle through three atrial P morphologies and slightly different PR intervals.'],
  },
  {
    rhythmId: 'atrial.mat',
    displayName: 'Multifocal atrial tachycardia',
    category: 'atrial',
    rateBpm: bpm(100, 180, 120),
    regularity: 'irregularly-irregular',
    pWave: variableP('at least three P-wave morphologies; each conducted P is discrete'),
    prMs: ms(100, 240, 160, 'varies beat to beat'),
    qrsMs: normalQrs,
    qt: 'Usually normal QTc.',
    stSegment: 'May show rate-related nonspecific ST/T changes.',
    tWave: 'Variable P-on-T overlap.',
    gridNotes: ['Unlike AF, identifiable P waves are present.', 'Irregular RR plus three P morphologies is the core visual rule.'],
    extremeVariants: ['Hypoxic/COPD scenario can add baseline artifact and lower SpO2.'],
    generatorHints: ['Generate irregular atrial timings with three or more P templates.'],
  },
  {
    rhythmId: 'atrial.focal-atrial-tach',
    displayName: 'Focal atrial tachycardia',
    category: 'atrial',
    rateBpm: bpm(100, 250, 150),
    regularity: 'regular',
    pWave: variableP('ectopic non-sinus P waves with an isoelectric baseline between P waves'),
    prMs: ms(120, 220, 160),
    qrsMs: normalQrs,
    qt: 'Rate-dependent raw QT shortening.',
    stSegment: 'Usually no primary ST elevation.',
    tWave: 'P waves can overlap T waves at fast rates.',
    gridNotes: ['Warm-up/cool-down favors automatic atrial tachycardia over AVNRT.', 'Isoelectric baseline separates it from flutter.'],
    extremeVariants: ['2:1 AV conduction can make atrial activity easy to miss.'],
    generatorHints: ['Use non-sinus P axis and optional gradual rate ramp.'],
  },
  {
    rhythmId: 'atrial.fib',
    displayName: 'Atrial fibrillation',
    category: 'atrial',
    rateBpm: bpm(60, 110, 80, 'controlled ventricular response'),
    atrialRateBpm: bpm(350, 600, 450, 'chaotic atrial activity'),
    ventricularRateBpm: bpm(60, 110, 80),
    regularity: 'irregularly-irregular',
    pWave: noP('no discrete P waves; fibrillatory baseline may be coarse or fine'),
    prMs: null,
    qrsMs: narrowQrs,
    qt: 'QT measurement is harder because RR intervals vary; use representative beats.',
    stSegment: 'Baseline wander/fibrillatory activity can make ST assessment less reliable.',
    tWave: 'Usually visible but timing varies with irregular RR.',
    gridNotes: ['No repeating RR pattern.', 'No consistent P before QRS.'],
    extremeVariants: ['Slow AF can be <60 bpm; pre-excited AF should render irregular wide complexes.'],
    generatorHints: ['Randomize RR intervals; remove P waves; add fine/coarse fibrillatory baseline.'],
  },
  {
    rhythmId: 'atrial.fib-rvr',
    displayName: 'Atrial fibrillation with rapid ventricular response',
    category: 'atrial',
    rateBpm: bpm(111, 190, 150),
    atrialRateBpm: bpm(350, 600, 450),
    ventricularRateBpm: bpm(111, 190, 150),
    regularity: 'irregularly-irregular',
    pWave: noP('no discrete P waves; chaotic atrial baseline'),
    prMs: null,
    qrsMs: narrowQrs,
    qt: 'Rate-related raw QT shortening.',
    stSegment: 'Can show rate-related ST depression if demand ischemia is part of scenario.',
    tWave: 'Often hard to inspect at fast irregular rates.',
    gridNotes: ['Fast and irregular with no P waves.', 'At 150 bpm average RR is about 10 small boxes but intervals vary.'],
    extremeVariants: ['Unstable AF with RVR should route to synchronized cardioversion workflow.'],
    generatorHints: ['Use broader RR variability than MAT and omit P-wave events.'],
  },
  {
    rhythmId: 'atrial.flutter',
    displayName: 'Typical atrial flutter',
    category: 'atrial',
    rateBpm: bpm(75, 150, 150, 'ventricular response commonly 2:1 at about 150'),
    atrialRateBpm: bpm(250, 350, 300),
    ventricularRateBpm: bpm(75, 150, 150),
    regularity: 'regular',
    pWave: noP('sawtooth flutter waves replace P waves, often best in II, III, aVF'),
    prMs: null,
    qrsMs: narrowQrs,
    qt: 'Often difficult to measure because flutter waves overlay ST/T.',
    stSegment: 'Flutter waves distort the baseline.',
    tWave: 'T waves can be hidden by flutter waves.',
    gridNotes: ['Flutter wave cycle at 300 bpm is 200 ms, exactly one large box.', '2:1 conduction gives ventricular RR about 400 ms or 10 small boxes.'],
    extremeVariants: ['Variable block makes ventricular rhythm irregular; 1:1 flutter can exceed 250 bpm and become unstable.'],
    generatorHints: ['Draw continuous atrial sawtooth at 250-350 bpm with selected conduction ratio.'],
  },
  {
    rhythmId: 'atrial.flutter-atypical',
    displayName: 'Atypical atrial flutter',
    category: 'atrial',
    rateBpm: bpm(70, 170, 120),
    atrialRateBpm: bpm(200, 350, 250),
    ventricularRateBpm: bpm(70, 170, 120),
    regularity: 'irregular',
    pWave: noP('flutter waves present but morphology is less classic than inferior-lead sawtooth'),
    prMs: null,
    qrsMs: narrowQrs,
    qt: 'Difficult to measure when flutter activity overlays T waves.',
    stSegment: 'Atrial activity distorts baseline.',
    tWave: 'Often partly obscured.',
    gridNotes: ['Use variable conduction ratios when teaching flutter vs AF.', 'Atrial activity should still be more organized than AF.'],
    extremeVariants: ['Can be confused with coarse AF; rhythm regularity and flutter wave repetition should decide.'],
    generatorHints: ['Use less uniform sawtooth and optional variable AV block.'],
  },
  {
    rhythmId: 'atrial.svt',
    displayName: 'Regular narrow-complex SVT',
    category: 'atrial',
    rateBpm: bpm(150, 250, 180),
    regularity: 'regular',
    pWave: variableP('P waves absent, retrograde, or buried in QRS/T depending on mechanism'),
    prMs: null,
    qrsMs: narrowQrs,
    qt: 'Raw QT shortens with rate.',
    stSegment: 'Rate-related ST depression may appear.',
    tWave: 'Retrograde P can deform terminal QRS or early ST/T.',
    gridNotes: ['Regular RR with narrow QRS; at 180 bpm RR is 333 ms or about 8.3 small boxes.', 'Sudden onset/offset favors re-entry.'],
    extremeVariants: ['Wide SVT with aberrancy should be treated cautiously as wide-complex tachycardia in scenarios.'],
    generatorHints: ['Lock RR regularity; hide or invert P waves.'],
  },
  {
    rhythmId: 'atrial.avnrt',
    displayName: 'AV nodal re-entrant tachycardia',
    category: 'atrial',
    rateBpm: bpm(150, 250, 180),
    regularity: 'regular',
    pWave: variableP('retrograde P often hidden in QRS or visible as pseudo R prime in V1 / pseudo S in inferior leads'),
    prMs: null,
    qrsMs: narrowQrs,
    qt: 'Rate-dependent shortening.',
    stSegment: 'Can show rate-related depression.',
    tWave: 'May hide retrograde P wave.',
    gridNotes: ['Very regular narrow tachycardia.', 'No clear antegrade P before QRS.'],
    extremeVariants: ['Adenosine should cause transient AV block and usually terminate.'],
    generatorHints: ['Use no visible P or tiny retrograde deflection after QRS.'],
  },
  {
    rhythmId: 'atrial.avrt',
    displayName: 'AV re-entrant tachycardia',
    category: 'atrial',
    rateBpm: bpm(150, 250, 190),
    regularity: 'regular',
    pWave: variableP('retrograde P wave may appear after QRS with short RP interval'),
    prMs: null,
    qrsMs: narrowQrs,
    qt: 'Rate-dependent shortening.',
    stSegment: 'Usually no primary ST elevation.',
    tWave: 'Retrograde P may sit on ST/T segment.',
    gridNotes: ['Orthodromic AVRT is narrow; antidromic AVRT is wide and less common.', 'Accessory pathway scenarios should warn against AV nodal blockers in pre-excited AF.'],
    extremeVariants: ['Pre-excited AF variant should be irregular wide-complex and unsafe for adenosine/diltiazem.'],
    generatorHints: ['Show retrograde P shortly after QRS when visible.'],
  },
  {
    rhythmId: 'junctional.rhythm',
    displayName: 'Junctional rhythm',
    category: 'junctional',
    rateBpm: bpm(40, 60, 50),
    regularity: 'regular',
    pWave: variableP('P waves absent, inverted before QRS, hidden in QRS, or inverted after QRS'),
    prMs: ms(0, 120, 80, 'short PR when retrograde P precedes QRS'),
    qrsMs: normalQrs,
    qt: 'Usually normal QTc.',
    stSegment: 'Isoelectric unless ischemia/toxicity is layered in.',
    tWave: 'Normal polarity unless retrograde P follows QRS and deforms ST/T.',
    gridNotes: ['Narrow QRS with absent/inverted P and rate 40-60.', 'Look for inverted P in II, III, aVF.'],
    extremeVariants: ['Can serve as escape after sinus arrest or high AV block.'],
    generatorHints: ['Use narrow QRS and optional retrograde P before/after QRS.'],
  },
  {
    rhythmId: 'junctional.accelerated',
    displayName: 'Accelerated junctional rhythm',
    category: 'junctional',
    rateBpm: bpm(61, 100, 75),
    regularity: 'regular',
    pWave: variableP('absent or retrograde inverted P waves'),
    prMs: ms(0, 120, 80),
    qrsMs: normalQrs,
    qt: 'Usually normal QTc.',
    stSegment: 'Isoelectric.',
    tWave: 'Normal unless retrograde P overlaps.',
    gridNotes: ['Same junctional P rules, faster than 60 but not tachycardic >100.'],
    extremeVariants: ['Digoxin toxicity and post-op states can be scenario modifiers.'],
    generatorHints: ['Increase junctional escape rate while preserving narrow QRS.'],
  },
  {
    rhythmId: 'junctional.tachycardia',
    displayName: 'Junctional tachycardia',
    category: 'junctional',
    rateBpm: bpm(101, 180, 130),
    regularity: 'regular',
    pWave: variableP('absent or retrograde inverted P; AV dissociation can occur in some cases'),
    prMs: ms(0, 120, 80),
    qrsMs: normalQrs,
    qt: 'Rate-dependent shortening.',
    stSegment: 'Rate-related changes possible.',
    tWave: 'Retrograde P can deform ST/T.',
    gridNotes: ['Regular narrow tachycardia with junctional P behavior.', 'Differentiate from AVNRT by context and P timing.'],
    extremeVariants: ['May become unstable if very fast or in structural heart disease.'],
    generatorHints: ['Regular narrow QRS; use inverted retrograde P markers variably.'],
  },
  {
    rhythmId: 'junctional.pjc',
    displayName: 'Premature junctional complex',
    category: 'junctional',
    rateBpm: bpm(50, 100, 70, 'underlying rhythm'),
    regularity: 'irregular',
    pWave: variableP('early absent or retrograde P wave associated with a premature narrow QRS'),
    prMs: ms(0, 120, 80),
    qrsMs: normalQrs,
    qt: 'Normal on conducted beats.',
    stSegment: 'No primary ST change.',
    tWave: 'Retrograde P may alter ST/T after premature beat.',
    gridNotes: ['Premature narrow QRS without a preceding sinus P.', 'Pause may be noncompensatory.'],
    extremeVariants: ['Aberrant conduction can make a PJC wide, but typical teaching case is narrow.'],
    generatorHints: ['Insert early junctional beat without sinus P before it.'],
  },
  {
    rhythmId: 'av-block.first-degree',
    displayName: 'First-degree AV block',
    category: 'av-block',
    rateBpm: bpm(50, 100, 70),
    regularity: 'regular',
    pWave: normalP,
    prMs: ms(201, 400, 240, 'PR >5 small boxes and constant'),
    qrsMs: normalQrs,
    qt: 'Usually normal QTc.',
    stSegment: 'Isoelectric unless another condition is layered in.',
    tWave: 'Normal polarity.',
    gridNotes: ['Every P conducts to a QRS.', 'PR is prolonged but fixed from beat to beat.'],
    extremeVariants: ['Marked first-degree AV block can exceed 300 ms.'],
    generatorHints: ['Shift QRS later after each P; keep PR constant.'],
  },
  {
    rhythmId: 'av-block.second-mobitz-i',
    displayName: 'Second-degree AV block type I (Wenckebach)',
    category: 'av-block',
    rateBpm: bpm(35, 90, 60),
    regularity: 'regular-with-pauses',
    pWave: normalP,
    prMs: ms(120, 400, 220, 'progressively lengthens before dropped QRS'),
    qrsMs: normalQrs,
    qt: 'Normal on conducted beats.',
    stSegment: 'Isoelectric.',
    tWave: 'Normal on conducted beats.',
    gridNotes: ['PR gets longer, then a P wave is not followed by QRS.', 'RR intervals shorten before the dropped beat in classic Wenckebach.'],
    extremeVariants: ['Longer conduction ratios such as 4:3 or 5:4 can be subtle.'],
    generatorHints: ['Use grouped beating; increment PR until dropped QRS, then reset.'],
  },
  {
    rhythmId: 'av-block.second-mobitz-ii',
    displayName: 'Second-degree AV block type II',
    category: 'av-block',
    rateBpm: bpm(30, 90, 55),
    regularity: 'regular-with-pauses',
    pWave: normalP,
    prMs: ms(120, 220, 180, 'constant PR on conducted beats'),
    qrsMs: ms(80, 160, 120, 'often wide if infranodal conduction disease'),
    qt: 'Normal on conducted beats unless bradycardic or drug/electrolyte modifier.',
    stSegment: 'Isoelectric unless ischemia/electrolyte modifier.',
    tWave: 'May show bundle-branch discordance when QRS is wide.',
    gridNotes: ['Sudden dropped QRS without prior PR lengthening.', 'Fixed PR separates it from Wenckebach.'],
    extremeVariants: ['Can deteriorate into high-grade or complete heart block.'],
    generatorHints: ['Drop QRS unpredictably or in fixed pattern; do not progressively lengthen PR.'],
  },
  {
    rhythmId: 'av-block.2-1',
    displayName: '2:1 AV block',
    category: 'av-block',
    rateBpm: bpm(30, 75, 45),
    atrialRateBpm: bpm(60, 150, 90),
    ventricularRateBpm: bpm(30, 75, 45),
    regularity: 'regular',
    pWave: normalP,
    prMs: ms(120, 240, 180, 'PR fixed on conducted beats'),
    qrsMs: ms(80, 160, 110, 'narrow suggests nodal; wide suggests infranodal'),
    qt: 'Normal on conducted beats.',
    stSegment: 'Isoelectric unless another modifier is present.',
    tWave: 'A nonconducted P may hide in the T wave.',
    gridNotes: ['Every other P wave conducts.', 'Cannot reliably call Mobitz I vs II from 2:1 pattern alone.'],
    extremeVariants: ['Wide QRS plus 2:1 block should be treated as higher risk.'],
    generatorHints: ['Alternate conducted P-QRS and nonconducted P.'],
  },
  {
    rhythmId: 'av-block.high-grade',
    displayName: 'High-grade AV block',
    category: 'av-block',
    rateBpm: bpm(20, 60, 35),
    atrialRateBpm: bpm(60, 120, 80),
    ventricularRateBpm: bpm(20, 60, 35),
    regularity: 'regular-with-pauses',
    pWave: normalP,
    prMs: ms(120, 240, 180, 'PR fixed if conducted beats appear'),
    qrsMs: ms(80, 180, 130, 'escape or infranodal disease may be wide'),
    qt: 'Can be prolonged by bradycardia.',
    stSegment: 'Assess for MI or drug/toxin context.',
    tWave: 'May be discordant if QRS is wide.',
    gridNotes: ['Two or more consecutive P waves fail to conduct.', 'Ventricular escape rate may be dangerously slow.'],
    extremeVariants: ['Can progress to complete heart block or asystolic pauses.'],
    generatorHints: ['Use repeated dropped QRS events with sparse escape beats.'],
  },
  {
    rhythmId: 'av-block.third-degree',
    displayName: 'Third-degree AV block',
    category: 'av-block',
    rateBpm: bpm(20, 60, 35, 'escape rhythm rate'),
    atrialRateBpm: bpm(60, 120, 80),
    ventricularRateBpm: bpm(20, 60, 35),
    regularity: 'regular',
    pWave: normalP,
    prMs: null,
    qrsMs: ms(80, 180, 140, 'junctional escape narrow; ventricular escape wide'),
    qt: 'May be prolonged because ventricular rate is slow.',
    stSegment: 'Evaluate for inferior/anterior MI modifier.',
    tWave: 'Can be normal or discordant if escape QRS is wide.',
    gridNotes: ['P-P and R-R intervals are each regular, but unrelated.', 'P waves march through QRS/T complexes.'],
    extremeVariants: ['Anterior MI complete block with wide escape is high risk.'],
    generatorHints: ['Run atrial and ventricular oscillators independently.'],
  },
  {
    rhythmId: 'vent.pvc',
    displayName: 'Premature ventricular complex',
    category: 'ventricular',
    rateBpm: bpm(50, 100, 75, 'underlying rhythm'),
    regularity: 'irregular',
    pWave: { ...normalP, morphology: 'sinus P waves continue; PVC itself has no preceding P wave' },
    prMs: normalPr,
    qrsMs: wideQrs,
    qt: 'PVC repolarization is discordant; do not use PVC beat for QT measurement.',
    stSegment: 'ST segment usually discordant to the wide QRS.',
    tWave: 'Large discordant T wave after PVC.',
    gridNotes: ['Premature wide QRS >=120 ms, often >3 small boxes.', 'Full compensatory pause is common.'],
    extremeVariants: ['R-on-T PVC lands on preceding T wave and can trigger VT/VF in scenarios.'],
    generatorHints: ['Insert early wide beat without preceding P, followed by compensatory pause.'],
  },
  {
    rhythmId: 'vent.pvc-multifocal',
    displayName: 'Multifocal PVCs',
    category: 'ventricular',
    rateBpm: bpm(50, 120, 80, 'underlying rhythm'),
    regularity: 'irregular',
    pWave: { ...normalP, morphology: 'sinus P waves with PVCs of different ventricular morphologies' },
    prMs: normalPr,
    qrsMs: wideQrs,
    qt: 'Measure QT on sinus beats, not PVCs.',
    stSegment: 'Discordant ST/T after PVCs.',
    tWave: 'PVC T waves vary with PVC morphology.',
    gridNotes: ['PVCs have at least two distinct wide QRS shapes.', 'Coupling intervals may vary.'],
    extremeVariants: ['Frequent multifocal PVCs can precede polymorphic VT in a deterioration branch.'],
    generatorHints: ['Alternate or randomize multiple wide QRS templates.'],
  },
  {
    rhythmId: 'vent.bigeminy',
    displayName: 'Ventricular bigeminy',
    category: 'ventricular',
    rateBpm: bpm(40, 120, 70, 'effective pulse may be lower than electrical rate'),
    regularity: 'irregular',
    pWave: { ...normalP, morphology: 'sinus beat followed by PVC repeatedly' },
    prMs: normalPr,
    qrsMs: wideQrs,
    qt: 'Measure on sinus beats.',
    stSegment: 'PVC ST/T discordance every other beat.',
    tWave: 'Alternating normal T and PVC discordant T.',
    gridNotes: ['Every other beat is a PVC.', 'Pulse deficit can be simulated if PVCs are nonperfusing.'],
    extremeVariants: ['Can degrade into VT if PVCs become runs.'],
    generatorHints: ['Repeat normal beat, PVC beat, compensatory pause pattern.'],
  },
  {
    rhythmId: 'vent.trigeminy',
    displayName: 'Ventricular trigeminy',
    category: 'ventricular',
    rateBpm: bpm(50, 120, 80),
    regularity: 'irregular',
    pWave: { ...normalP, morphology: 'two sinus beats followed by PVC repeatedly' },
    prMs: normalPr,
    qrsMs: wideQrs,
    qt: 'Measure on sinus beats.',
    stSegment: 'PVC ST/T discordance every third beat.',
    tWave: 'Two normal T waves then discordant PVC T wave.',
    gridNotes: ['Every third beat is PVC.', 'Pattern recognition should be visually rhythmic.'],
    extremeVariants: ['Can become more frequent with hypoxia, ischemia, or electrolyte modifier.'],
    generatorHints: ['Repeat two conducted beats then one wide PVC.'],
  },
  {
    rhythmId: 'vent.quadrigeminy',
    displayName: 'Ventricular quadrigeminy',
    category: 'ventricular',
    rateBpm: bpm(50, 120, 80),
    regularity: 'irregular',
    pWave: { ...normalP, morphology: 'three sinus beats followed by PVC repeatedly' },
    prMs: normalPr,
    qrsMs: wideQrs,
    qt: 'Measure on sinus beats.',
    stSegment: 'PVC ST/T discordance every fourth beat.',
    tWave: 'Three normal T waves then discordant PVC T wave.',
    gridNotes: ['Every fourth beat is PVC.', 'Use this as a lower-intensity ectopy pattern.'],
    extremeVariants: ['May convert to bigeminy or couplets under stress.'],
    generatorHints: ['Repeat three conducted beats then one wide PVC.'],
  },
  {
    rhythmId: 'vent.r-on-t',
    displayName: 'R-on-T PVC',
    category: 'ventricular',
    rateBpm: bpm(50, 110, 75, 'underlying rhythm'),
    regularity: 'irregular',
    pWave: { ...normalP, morphology: 'sinus P waves; premature ventricular beat falls on prior T wave' },
    prMs: normalPr,
    qrsMs: wideQrs,
    qt: 'R-on-T event occurs during vulnerable repolarization period.',
    stSegment: 'PVC merges into preceding ST/T region.',
    tWave: 'PVC R wave interrupts T wave before it returns to baseline.',
    gridNotes: ['PVC onset should be drawn on the downslope or peak/downslope of prior T wave.', 'This is a visual timing concept more than a rate concept.'],
    extremeVariants: ['Can branch into polymorphic VT or VF.'],
    generatorHints: ['Place wide PVC at 60-90 percent of preceding QT interval.'],
  },
  {
    rhythmId: 'vent.idioventricular',
    displayName: 'Idioventricular rhythm',
    category: 'ventricular',
    rateBpm: bpm(20, 40, 30),
    regularity: 'regular',
    pWave: noP('P waves absent or dissociated; ventricular focus controls rhythm'),
    prMs: null,
    qrsMs: wideQrs,
    qt: 'Often prolonged raw QT due to slow rate.',
    stSegment: 'Discordant ST/T expected with wide ventricular complexes.',
    tWave: 'Discordant to QRS.',
    gridNotes: ['Slow wide-complex escape rhythm.', 'At 30 bpm, RR is 2000 ms or 50 small boxes.'],
    extremeVariants: ['If no pulse, scenario should classify clinically as PEA rather than perfusing rhythm.'],
    generatorHints: ['Wide QRS at slow fixed ventricular escape rate.'],
  },
  {
    rhythmId: 'vent.ventricular-escape',
    displayName: 'Ventricular escape rhythm',
    category: 'ventricular',
    rateBpm: bpm(20, 40, 30),
    regularity: 'regular',
    pWave: noP('no conducted atrial trigger; escape occurs after pause or block'),
    prMs: null,
    qrsMs: wideQrs,
    qt: 'Slow-rate raw QT lengthening.',
    stSegment: 'Discordant ST/T.',
    tWave: 'Discordant T waves.',
    gridNotes: ['Ventricular escape protects from asystole after a pause/block.', 'Wide QRS and slow rate separate it from junctional escape.'],
    extremeVariants: ['May fail, producing long asystolic pauses.'],
    generatorHints: ['Trigger wide escape after missed sinus/junctional activity.'],
  },
  {
    rhythmId: 'vent.aivr',
    displayName: 'Accelerated idioventricular rhythm',
    category: 'ventricular',
    rateBpm: bpm(40, 120, 70),
    regularity: 'regular',
    pWave: variableP('P waves may be absent, dissociated, or captured/fusion beats may appear'),
    prMs: null,
    qrsMs: wideQrs,
    qt: 'Wide-complex repolarization; use sinus beats if present for QT.',
    stSegment: 'Discordant ST/T with ventricular complexes.',
    tWave: 'Discordant T waves.',
    gridNotes: ['Wide rhythm faster than ventricular escape but usually slower than VT.', 'Common reperfusion teaching rhythm.'],
    extremeVariants: ['Fusion/capture beats can be added for advanced learners.'],
    generatorHints: ['Wide QRS at 40-120 bpm with optional AV dissociation.'],
  },
  {
    rhythmId: 'vent.vtach-stable',
    displayName: 'Monomorphic ventricular tachycardia',
    category: 'ventricular',
    rateBpm: bpm(120, 250, 160),
    regularity: 'regular',
    pWave: variableP('P waves usually absent or dissociated; capture/fusion beats may appear'),
    prMs: null,
    qrsMs: ms(120, 220, 160, 'wide and uniform beat to beat'),
    qt: 'Do not measure QT during sustained VT for routine QTc teaching.',
    stSegment: 'ST/T discordant to QRS morphology.',
    tWave: 'Discordant and uniform after each wide QRS.',
    gridNotes: ['Regular wide-complex tachycardia is VT until proven otherwise.', 'QRS often >160 ms in structural heart disease VT.'],
    extremeVariants: ['Unstable VT uses same morphology but lower BP/altered mentation and cardioversion workflow.'],
    generatorHints: ['Use uniform wide QRS template with fixed RR.'],
  },
  {
    rhythmId: 'vent.nsvt',
    displayName: 'Nonsustained ventricular tachycardia',
    category: 'ventricular',
    rateBpm: bpm(120, 250, 170),
    regularity: 'regular-with-pauses',
    pWave: { ...normalP, morphology: 'sinus rhythm interrupted by a run of at least three ventricular beats' },
    prMs: normalPr,
    qrsMs: ms(120, 220, 160),
    qt: 'Measure QT on sinus beats outside the run.',
    stSegment: 'Discordant ST/T during VT run.',
    tWave: 'Discordant T waves during run.',
    gridNotes: ['Three or more consecutive PVC-like beats.', 'Run terminates before 30 seconds by definition.'],
    extremeVariants: ['Can degenerate into sustained VT or VF in scenario branching.'],
    generatorHints: ['Insert short run of wide regular complexes into sinus baseline.'],
  },
  {
    rhythmId: 'vent.bidirectional-vt',
    displayName: 'Bidirectional ventricular tachycardia',
    category: 'ventricular',
    rateBpm: bpm(120, 250, 150),
    regularity: 'regular',
    pWave: noP('P waves are usually not visible or are dissociated from the ventricular rhythm'),
    prMs: null,
    qrsMs: ms(120, 220, 160, 'wide complexes alternate axis or polarity beat to beat'),
    qt: 'Do not measure QT during bidirectional VT.',
    stSegment: 'Not reliably measurable during tachycardia.',
    tWave: 'Repolarization alternates with the changing ventricular activation pattern.',
    gridNotes: ['QRS direction alternates beat to beat, classically producing an alternating frontal-plane axis.', 'Keep the rhythm regular; the alternating morphology is the diagnostic teaching cue.'],
    extremeVariants: ['Classic associations include digoxin toxicity and catecholaminergic polymorphic VT contexts.'],
    generatorHints: ['Alternate positive and negative wide QRS templates on every ventricular beat.'],
  },
  {
    rhythmId: 'vent.fascicular-vt',
    displayName: 'Fascicular ventricular tachycardia',
    category: 'ventricular',
    rateBpm: bpm(120, 250, 150),
    regularity: 'regular',
    pWave: variableP('P waves may be absent or dissociated; capture/fusion beats can appear in advanced examples'),
    prMs: null,
    qrsMs: ms(110, 160, 130, 'often narrower than scar-mediated VT but still a ventricular tachycardia'),
    qt: 'Do not use the tachycardia complex for routine QTc teaching.',
    stSegment: 'Secondary ST/T discordance follows the ventricular activation pattern.',
    tWave: 'Usually discordant to QRS.',
    gridNotes: ['Regular WCT that can look only moderately wide.', 'Posterior fascicular VT commonly has RBBB-like morphology with left axis on 12-lead views.'],
    extremeVariants: ['Can be mistaken for SVT with aberrancy because the QRS is not as wide as typical structural-heart VT.'],
    generatorHints: ['Use a narrower-wide QRS template and tag the morphology as fascicular VT.'],
  },
  {
    rhythmId: 'vent.rvot-vt',
    displayName: 'Right ventricular outflow tract VT',
    category: 'ventricular',
    rateBpm: bpm(120, 250, 150),
    regularity: 'regular',
    pWave: variableP('P waves usually absent or dissociated during the tachycardia'),
    prMs: null,
    qrsMs: ms(120, 200, 150, 'wide monomorphic complexes'),
    qt: 'Do not use tachycardia complexes for QTc teaching.',
    stSegment: 'Secondary ST/T discordance expected.',
    tWave: 'Usually discordant to dominant QRS.',
    gridNotes: ['Teaching 12-lead morphology: LBBB-like pattern with inferior axis.', 'Single-lead rendering should remain regular, wide, and monomorphic.'],
    extremeVariants: ['Can be exercise/catecholamine triggered and may be confused with other idiopathic VT patterns.'],
    generatorHints: ['Use regular wide QRS complexes and metadata for LBBB/inferior-axis teaching in 12-lead contexts.'],
  },
  {
    rhythmId: 'vent.polymorphic-vt',
    displayName: 'Polymorphic ventricular tachycardia',
    category: 'ventricular',
    rateBpm: bpm(150, 300, 220),
    regularity: 'irregular',
    pWave: noP('no organized atrial relationship visible during tachycardia'),
    prMs: null,
    qrsMs: ms(120, 240, 170, 'QRS width and axis vary beat to beat'),
    qt: 'If baseline QT is normal, teach ischemia/catecholamine trigger; if prolonged, teach torsades branch.',
    stSegment: 'Not reliably measurable during tachycardia.',
    tWave: 'Merged with wide polymorphic complexes.',
    gridNotes: ['Wide complexes change amplitude and axis beat to beat.', 'Avoid a repeating monomorphic template.'],
    extremeVariants: ['Can deteriorate into VF or self-terminate.'],
    generatorHints: ['Vary QRS amplitude, axis, and width continuously.'],
  },
  {
    rhythmId: 'vent.torsades',
    displayName: 'Torsades de pointes',
    category: 'ventricular',
    rateBpm: bpm(150, 300, 220),
    regularity: 'irregular',
    pWave: noP('no visible organized P waves during torsades'),
    prMs: null,
    qrsMs: ms(120, 240, 170, 'polymorphic wide complexes twist around baseline'),
    qt: 'Baseline QTc is prolonged, commonly >500 ms before onset.',
    stSegment: 'Not measurable during run.',
    tWave: 'Before onset, T/U abnormalities or prolonged QT should be visible.',
    gridNotes: ['Amplitude appears to wax/wane and rotate around baseline.', 'Add long QT context before the run for teaching.'],
    extremeVariants: ['Pause-dependent torsades can begin after short-long-short sequence.'],
    generatorHints: ['Use sinusoidal amplitude modulation of wide-complex axis.'],
  },
  {
    rhythmId: 'vent.flutter',
    displayName: 'Ventricular flutter',
    category: 'ventricular',
    rateBpm: bpm(250, 350, 300),
    regularity: 'regular',
    pWave: noP('no P waves visible'),
    prMs: null,
    qrsMs: ms(120, 240, 180, 'QRS and T merge into sine-wave-like pattern'),
    qt: 'Not measurable.',
    stSegment: 'Not measurable.',
    tWave: 'Merged with QRS into smooth oscillation.',
    gridNotes: ['Large regular sine-wave complexes at very fast rate.', 'No isoelectric baseline between complexes.'],
    extremeVariants: ['Often transitions to VF.'],
    generatorHints: ['Render high-amplitude regular ventricular sine wave.'],
  },
  {
    rhythmId: 'vent.vfib',
    displayName: 'Coarse ventricular fibrillation',
    category: 'ventricular',
    rateBpm: null,
    regularity: 'chaotic',
    pWave: { status: 'chaotic', morphology: 'no P waves, QRS complexes, or T waves' },
    prMs: null,
    qrsMs: null,
    qt: 'Not measurable.',
    stSegment: 'Not measurable.',
    tWave: 'No organized T waves.',
    gridNotes: ['Chaotic baseline with amplitude commonly >3 mm in coarse VF.', 'No organized RR interval or QRS width.'],
    extremeVariants: ['Fine VF amplitude can fall below 3 mm and mimic asystole at low gain.'],
    generatorHints: ['Use irregular chaotic oscillation with no event-level QRS.'],
  },
  {
    rhythmId: 'vent.vfib-fine',
    displayName: 'Fine ventricular fibrillation',
    category: 'ventricular',
    rateBpm: null,
    regularity: 'chaotic',
    pWave: { status: 'chaotic', morphology: 'no organized atrial or ventricular complexes' },
    prMs: null,
    qrsMs: null,
    qt: 'Not measurable.',
    stSegment: 'Not measurable.',
    tWave: 'No organized T waves.',
    gridNotes: ['Low-amplitude chaotic deflections, often <3 mm.', 'Increase gain/check leads to distinguish from asystole in teaching.'],
    extremeVariants: ['Can deteriorate to near-flat asystolic appearance.'],
    generatorHints: ['Lower amplitude chaotic VF with subtle noise.'],
  },
  {
    rhythmId: 'vent.asystole',
    displayName: 'Asystole',
    category: 'ventricular',
    rateBpm: null,
    regularity: 'chaotic',
    pWave: noP('no visible atrial depolarization unless rare agonal P-only activity is layered in'),
    prMs: null,
    qrsMs: null,
    qt: 'Not measurable.',
    stSegment: 'Flat or near-flat baseline.',
    tWave: 'Absent.',
    gridNotes: ['Confirm in at least two leads and check gain/leads.', 'Baseline noise should remain below ECG-complex amplitude thresholds.'],
    extremeVariants: ['P-wave asystole can show atrial activity without ventricular response.'],
    generatorHints: ['Render near-flat baseline with minimal wander/noise.'],
  },
  {
    rhythmId: 'vent.pea',
    displayName: 'Pulseless electrical activity',
    category: 'ventricular',
    rateBpm: bpm(20, 120, 50, 'organized rhythm on monitor, no palpable pulse clinically'),
    regularity: 'organized-no-pulse',
    pWave: variableP('may be sinus, junctional, idioventricular, or other organized electrical rhythm'),
    prMs: ms(0, 240, 160, 'depends on displayed organized rhythm'),
    qrsMs: ms(60, 180, 100, 'depends on displayed organized rhythm'),
    qt: 'Depends on displayed rhythm; clinical pulse state defines PEA.',
    stSegment: 'Depends on cause, such as MI, hypoxia, or hyperkalemia.',
    tWave: 'Depends on underlying electrical rhythm.',
    gridNotes: ['PEA is not one morphology; it is organized electrical activity without a pulse.', 'Vitals should show absent BP/pulse despite monitor rhythm.'],
    extremeVariants: ['Pseudo-PEA with ultrasound cardiac activity can be an advanced branch.'],
    generatorHints: ['Pair organized ECG with no pulse/BP, falling ETCO2, and arrest state.'],
  },
  {
    rhythmId: 'pacer.atrial',
    displayName: 'Atrial paced rhythm',
    category: 'pacer',
    rateBpm: bpm(60, 100, 70),
    regularity: 'regular',
    pWave: pacedP('sharp pacing spike before a captured P wave'),
    prMs: normalPr,
    qrsMs: normalQrs,
    qt: 'Normal QTc unless ventricular conduction abnormality exists.',
    stSegment: 'Usually isoelectric if native QRS conduction is normal.',
    tWave: 'Normal if native ventricular activation is normal.',
    gridNotes: ['Tiny vertical pacing spike precedes each P wave.', 'Captured atrial beat conducts through AV node with PR interval.'],
    extremeVariants: ['Failure to capture shows spike without P wave.'],
    generatorHints: ['Add narrow pacing spike before P wave with normal downstream QRS.'],
  },
  {
    rhythmId: 'pacer.ventricular',
    displayName: 'Ventricular paced rhythm',
    category: 'pacer',
    rateBpm: bpm(50, 100, 70),
    regularity: 'regular',
    pWave: variableP('native P waves may be absent, dissociated, or sensed depending on mode'),
    prMs: null,
    qrsMs: ms(140, 220, 170, 'wide paced QRS after pacing spike'),
    qt: 'QT is difficult to interpret in paced wide QRS.',
    stSegment: 'Secondary discordant ST/T changes expected after paced QRS.',
    tWave: 'Discordant T wave after wide paced QRS.',
    gridNotes: ['Pacing spike immediately before every captured wide QRS.', 'Paced QRS often resembles LBBB pattern.'],
    extremeVariants: ['Failure to sense can create inappropriate spikes; oversensing can cause pauses.'],
    generatorHints: ['Add vertical spike, then wide QRS with paced morphology.'],
  },
  {
    rhythmId: 'pacer.av',
    displayName: 'Dual-chamber paced rhythm',
    category: 'pacer',
    rateBpm: bpm(50, 100, 70),
    regularity: 'regular',
    pWave: pacedP('atrial spike/P wave followed by AV delay and ventricular spike/QRS when ventricular pacing occurs'),
    prMs: ms(120, 220, 180, 'paced AV delay'),
    qrsMs: ms(120, 220, 160, 'narrow if native conduction, wide if ventricular paced'),
    qt: 'Depends on ventricular activation pathway.',
    stSegment: 'Discordant when ventricular paced.',
    tWave: 'Discordant when ventricular paced.',
    gridNotes: ['Two spikes may be visible: atrial then ventricular.', 'AV delay should be consistent.'],
    extremeVariants: ['Pacemaker-mediated tachycardia uses tracked atrial/retrograde activity.'],
    generatorHints: ['Use paired pacing spikes with programmable AV delay.'],
  },
  {
    rhythmId: 'pacer.failure-to-capture',
    displayName: 'Pacemaker failure to capture',
    category: 'pacer',
    rateBpm: bpm(20, 100, 50, 'depends on intrinsic/escape rhythm'),
    regularity: 'irregular',
    pWave: variableP('pacing spikes appear without the expected P or QRS response'),
    prMs: null,
    qrsMs: ms(60, 220, 140, 'captured beats wide if ventricular paced; failed spikes have no QRS'),
    qt: 'Measure only on captured/native beats.',
    stSegment: 'Depends on captured/native complexes.',
    tWave: 'Absent after noncaptured spikes.',
    gridNotes: ['Pacing spike not followed by expected depolarization.', 'Must verify mechanical capture when teaching TCP.'],
    extremeVariants: ['Intermittent capture alternates captured and noncaptured pacing spikes.'],
    generatorHints: ['Render spikes without following P/QRS for failed-capture events.'],
    simulationRules: [
      {
        id: 'pacer-capture-output',
        display: 'Visible pacing spikes at a regular programmed interval with some or all spikes not followed by QRS.',
        learnerMust: 'Identify spikes without capture, increase output if using an external pacer, and check reversible causes.',
        danger: 'Pacemaker-dependent patient may have no effective rhythm.',
        treatment: ['Increase external pacing output', 'Correct hyperkalemia/acidosis/hypoxia', 'Reposition pads or evaluate lead displacement', 'Use transcutaneous pacing as a bridge for implanted-device failure'],
      },
    ],
    criticalTeachingPoints: ['Electrical spike alone is not capture; capture requires depolarization and, clinically, perfusion.'],
  },
  {
    rhythmId: 'pacer.failure-to-sense',
    displayName: 'Pacemaker failure to sense',
    category: 'pacer',
    rateBpm: bpm(40, 120, 70, 'native rhythm competes with programmed pacing rate'),
    regularity: 'irregular',
    pWave: variableP('native atrial activity may be present while pacing spikes fire inappropriately'),
    prMs: ms(0, 220, 160, 'depends on native rhythm and paced events'),
    qrsMs: ms(60, 220, 140, 'native beats can be narrow; paced beats are usually wide'),
    qt: 'Measure only on representative native beats; spikes can fall into ST/T region.',
    stSegment: 'Pacing spikes can appear within ST or T wave because sensing is failing.',
    tWave: 'T waves may be interrupted by inappropriate pacing spikes.',
    gridNotes: ['Pacing spikes occur despite visible native QRS complexes.', 'Spikes can land on or near native QRS/T waves.'],
    extremeVariants: ['A spike on a T wave creates an R-on-T-like risk and can trigger VF in deterioration scenarios.'],
    generatorHints: ['Render native rhythm and independent pacer spikes at a fixed programmed interval.'],
    simulationRules: [
      {
        id: 'pacer-undersensing-competition',
        display: 'Pacing spikes fire at a fixed rate regardless of native QRS complexes.',
        learnerMust: 'Recognize pacer/native competition and R-on-T risk; adjust sensing or get device support.',
        danger: 'Inappropriate pacing during repolarization can provoke malignant ventricular arrhythmia.',
        treatment: ['Increase pacemaker sensitivity by lowering the mV threshold number', 'Assess lead displacement/fracture', 'Treat low-amplitude native signal causes'],
      },
    ],
  },
  {
    rhythmId: 'pacer.undersensing',
    displayName: 'Pacemaker undersensing',
    category: 'pacer',
    rateBpm: bpm(40, 120, 70),
    regularity: 'irregular',
    pWave: variableP('native activity continues but pacemaker does not reliably detect it'),
    prMs: ms(0, 220, 160),
    qrsMs: ms(60, 220, 140),
    qt: 'Representative native QT only; inappropriate spikes may obscure measurement.',
    stSegment: 'Spikes may appear on ST/T segments.',
    tWave: 'Spikes may fall on the T wave.',
    gridNotes: ['Undersensing is the mechanism behind many failure-to-sense tracings.', 'Fixed-rate spikes compete with native beats.'],
    extremeVariants: ['Native low-voltage QRS after MI/cardiomyopathy can worsen undersensing.'],
    generatorHints: ['Use independent pacer spike oscillator plus native complexes; do not inhibit spikes after sensed QRS.'],
    simulationRules: [
      {
        id: 'undersensing-sensitivity',
        display: 'Pacing spikes ignore native QRS complexes.',
        learnerMust: 'Name undersensing and increase sensitivity, which means lowering the programmed mV number.',
        danger: 'Competition with native rhythm can create spike-on-T events.',
      },
    ],
  },
  {
    rhythmId: 'pacer.oversensing',
    displayName: 'Pacemaker oversensing',
    category: 'pacer',
    rateBpm: bpm(0, 100, 45, 'effective rate falls when pacing is inappropriately inhibited'),
    regularity: 'regular-with-pauses',
    pWave: variableP('native P waves may be present; pacing output is intermittently inhibited'),
    prMs: ms(0, 240, 160, 'depends on native rhythm'),
    qrsMs: ms(60, 220, 140, 'native or paced complexes when present'),
    qt: 'Measure only on visible conducted/native beats.',
    stSegment: 'May be normal between pauses; artifact can be present if lead fracture/myopotential is simulated.',
    tWave: 'T-wave oversensing can suppress expected pacing output after repolarization.',
    gridNotes: ['Unexpected pauses occur because the pacer withholds output.', 'There may be no pacing spikes when the patient needs them.'],
    extremeVariants: ['Pacemaker-dependent patient can develop long pauses or asystole.'],
    generatorHints: ['Suppress scheduled pacing spikes during oversensed artifact/T-wave windows.'],
    simulationRules: [
      {
        id: 'oversensing-inhibition',
        display: 'Unexpected pauses in pacing output, often with patient symptoms.',
        learnerMust: 'Recognize inappropriate inhibition, decrease sensitivity, consider magnet/device help.',
        danger: 'Pacemaker-dependent patient may become bradycardic or asystolic.',
        treatment: ['Decrease sensitivity by raising the mV threshold number', 'Apply magnet if appropriate to force asynchronous pacing', 'Bridge with transcutaneous pacing if unstable'],
      },
    ],
  },
  {
    rhythmId: 'pacer.failure-to-pace',
    displayName: 'Pacemaker failure to pace',
    category: 'pacer',
    rateBpm: bpm(0, 100, 40, 'native rhythm only, or no rhythm if pacemaker-dependent'),
    regularity: 'regular-with-pauses',
    pWave: variableP('native rhythm may be visible, but expected pacing spikes are absent'),
    prMs: ms(0, 240, 160, 'depends on native rhythm'),
    qrsMs: ms(0, 160, 90, 'absent if no native/escape rhythm'),
    qt: 'Measure only if native complexes are present.',
    stSegment: 'Depends on native rhythm; absent during asystolic pauses.',
    tWave: 'Absent when no QRS is generated.',
    gridNotes: ['No pacing spikes are visible when the programmed device should be firing.', 'Normal inhibition is different: if native rate is above the lower rate limit, no spike is expected.'],
    extremeVariants: ['Battery depletion, lead fracture, component failure, or oversensing can all produce absent output.'],
    generatorHints: ['Remove expected pacing spikes; show native bradycardia, escape rhythm, or asystolic pauses.'],
    simulationRules: [
      {
        id: 'failure-to-pace-absent-output',
        display: 'No pacing spikes visible while the patient is bradycardic or asystolic.',
        learnerMust: 'Differentiate true absent output from normal inhibition by comparing native rate to programmed lower rate.',
        danger: 'Pacemaker-dependent patient may have no reliable ventricular escape.',
        treatment: ['Apply magnet when appropriate', 'Initiate transcutaneous pacing if unstable', 'Urgent cardiology/electrophysiology support'],
      },
    ],
  },
  {
    rhythmId: 'conduction.rbbb',
    displayName: 'Right bundle branch block',
    category: 'conduction',
    rateBpm: bpm(40, 140, 75, 'rate depends on underlying rhythm'),
    regularity: 'regular',
    pWave: normalP,
    prMs: normalPr,
    qrsMs: ms(120, 180, 140, 'complete RBBB >=120 ms'),
    qt: 'QT appears longer because QRS is wide; consider JT for advanced teaching.',
    stSegment: 'Secondary ST depression/T inversion in V1-V3 can be appropriate discordance.',
    tWave: 'T wave often inverted in right precordial leads due to secondary repolarization.',
    gridNotes: ['rsR prime or rabbit-ear pattern in V1.', 'Wide/slurred S wave in I and V6.'],
    extremeVariants: ['Incomplete RBBB has same morphology with QRS 100-119 ms.'],
    generatorHints: ['Delay terminal rightward forces; make V1 terminal R prime and lateral S wide.'],
  },
  {
    rhythmId: 'conduction.lbbb',
    displayName: 'Left bundle branch block',
    category: 'conduction',
    rateBpm: bpm(40, 140, 75),
    regularity: 'regular',
    pWave: normalP,
    prMs: normalPr,
    qrsMs: ms(120, 200, 150, 'complete LBBB >=120 ms'),
    qt: 'QT appears longer because QRS is wide; consider JT for advanced teaching.',
    stSegment: 'Appropriate discordant ST/T changes are expected; use Sgarbossa logic for MI teaching.',
    tWave: 'T waves typically discordant to dominant QRS deflection.',
    gridNotes: ['Broad/notched R in I, aVL, V5-V6.', 'Deep QS or rS in V1.'],
    extremeVariants: ['Incomplete LBBB has QRS 100-119 ms with LBBB-like morphology.'],
    generatorHints: ['Delay leftward depolarization; remove normal lateral septal q waves.'],
  },
  {
    rhythmId: 'conduction.wpw',
    displayName: 'Wolff-Parkinson-White pattern',
    category: 'conduction',
    rateBpm: bpm(60, 100, 75, 'sinus rhythm WPW pattern; tachyarrhythmia variants can be much faster'),
    regularity: 'regular',
    pWave: normalP,
    prMs: ms(80, 110, 100, 'short PR because ventricular activation begins through accessory pathway'),
    qrsMs: ms(100, 140, 120, 'total QRS includes 20-40 ms delta-wave slur'),
    qt: 'Use caution because QRS onset is slurred; QT includes pre-excited depolarization.',
    stSegment: 'Secondary ST/T changes are often discordant to delta-wave/QRS direction.',
    tWave: 'Can be discordant to pre-excited QRS.',
    gridNotes: ['Short PR is less than 120 ms or under 3 small boxes.', 'Delta wave is a 20-40 ms slurred QRS upstroke, about 0.5-1 small box wide.', 'Total QRS may be 100-140 ms.'],
    extremeVariants: ['Orthodromic AVRT is narrow regular SVT.', 'Antidromic AVRT is wide regular tachycardia.', 'Pre-excited AF is fast, broad, irregular, and dangerous.'],
    generatorHints: ['Start QRS with a rounded delta slur before the sharper ventricular upstroke; vary delta polarity by lead/pathway location.'],
    simulationRules: [
      {
        id: 'wpw-preexcited-af',
        display: 'Irregularly irregular wide-complex tachycardia with varying QRS width and very fast ventricular response.',
        learnerMust: 'Recognize pre-excited AF and avoid AV nodal blockers.',
        danger: 'Adenosine, diltiazem/verapamil, beta blockers, or digoxin can favor accessory-pathway conduction and precipitate VF.',
        treatment: ['If unstable: synchronized cardioversion', 'If pulseless: defibrillation', 'If stable: expert-guided procainamide or ibutilide pathway'],
      },
    ],
    criticalTeachingPoints: ['WPW plus AF plus AV nodal blocker is a high-risk acute cardiology drug error.'],
  },
  {
    rhythmId: 'conduction.brugada-pattern',
    displayName: 'Brugada pattern',
    category: 'special',
    rateBpm: bpm(50, 110, 75),
    regularity: 'regular',
    pWave: normalP,
    prMs: normalPr,
    qrsMs: ms(80, 120, 100, 'may resemble incomplete RBBB in right precordial leads'),
    qt: 'Usually not the primary diagnostic feature.',
    stSegment: 'Type 1: coved ST elevation >=2 mm in V1-V2 followed by inverted T wave. Type 2: saddleback ST elevation >=2 mm with positive or biphasic T wave.',
    tWave: 'Type 1 has inverted right-precordial T wave after coved ST; type 2 often has positive or biphasic T wave.',
    gridNotes: ['2 mm ST elevation equals two small boxes at 10 mm/mV.', 'Pattern is best seen in V1-V2, sometimes V3, especially high right-precordial placement.'],
    extremeVariants: ['Fever, sodium-channel blockers, and vagal states can unmask or intensify the pattern.', 'Type 1 coved pattern is the diagnostic pattern; type 2 is suggestive and needs further evaluation.'],
    generatorHints: ['For type 1, create high J-point/coved downsloping ST segment into inverted T in V1-V2; for type 2, create saddleback with second upward deflection.'],
    simulationRules: [
      {
        id: 'brugada-fever-unmasking',
        display: 'Right-precordial coved ST elevation appears or grows during a febrile scenario.',
        learnerMust: 'Identify Brugada type 1 morphology and avoid dismissing it as simple RBBB.',
        danger: 'Associated with malignant ventricular arrhythmia risk in the right clinical context.',
        treatment: ['Treat fever aggressively in scenario context', 'Escalate to clinician/cardiology review rather than stress-test style pathways'],
      },
    ],
  },
  {
    rhythmId: 'ischemia.inferior-stemi',
    displayName: 'Inferior STEMI pattern',
    category: 'ischemia',
    rateBpm: bpm(40, 120, 70),
    regularity: 'regular',
    pWave: normalP,
    prMs: normalPr,
    qrsMs: normalQrs,
    qt: 'QTc may be normal; ischemia can alter T-wave morphology.',
    stSegment: 'ST elevation in II, III, aVF with possible reciprocal depression in I/aVL.',
    tWave: 'Hyperacute or upright T waves early; later inversion can occur.',
    gridNotes: ['>=1 mm ST elevation is one small box in contiguous inferior leads.', 'ST elevation in III > II suggests RCA/right-sided involvement.'],
    extremeVariants: ['Add RV STEMI modifier with V4R elevation and hypotension/nitro warning.'],
    generatorHints: ['Raise J point/ST in inferior leads and optionally depress high lateral leads.'],
  },
  {
    rhythmId: 'ischemia.anterior-stemi',
    displayName: 'Anterior STEMI pattern',
    category: 'ischemia',
    rateBpm: bpm(60, 140, 90),
    regularity: 'regular',
    pWave: normalP,
    prMs: normalPr,
    qrsMs: normalQrs,
    qt: 'QTc may lengthen during ischemia.',
    stSegment: 'ST elevation in anterior precordial leads, especially V1-V4, using sex/age thresholds for V2-V3.',
    tWave: 'Hyperacute anterior T waves may precede clear ST elevation.',
    gridNotes: ['V1 and V4 use the >=1 mm contiguous-lead rule.', 'V2-V3 STEMI threshold is higher than other leads and depends on sex/age.', 'Poor R progression/pathologic Q waves can be late findings.'],
    extremeVariants: ['Proximal LAD can add de Winter or Wellens teaching branches.'],
    generatorHints: ['Raise ST in V1-V4, emphasize V2-V4, and add reciprocal inferior depression if desired.'],
    criticalTeachingPoints: ['Anterior STEMI can deteriorate into VF/VT or cardiogenic shock; do not let monitor rhythm training hide the 12-lead urgency.'],
  },
  {
    rhythmId: 'ischemia.lateral-stemi',
    displayName: 'Lateral STEMI pattern',
    category: 'ischemia',
    rateBpm: bpm(60, 130, 85),
    regularity: 'regular',
    pWave: normalP,
    prMs: normalPr,
    qrsMs: normalQrs,
    qt: 'Usually interpretable on representative beats; ischemia can alter repolarization.',
    stSegment: 'ST elevation in I, aVL, V5, and V6, with possible reciprocal depression in III and aVF.',
    tWave: 'Hyperacute lateral T waves may be broad and tall early, followed later by inversion.',
    gridNotes: ['>=1 mm ST elevation is one small box in contiguous lateral leads.', 'High lateral leads are I and aVL; low lateral leads are V5-V6.'],
    extremeVariants: ['High-lateral-only occlusion can show subtle I/aVL elevation with inferior reciprocal depression.', 'Anterolateral STEMI extends into V3-V6 plus I/aVL.'],
    generatorHints: ['Raise ST in I, aVL, V5, V6 and optionally depress inferior leads.'],
  },
  {
    rhythmId: 'ischemia.posterior-stemi',
    displayName: 'Posterior MI pattern',
    category: 'ischemia',
    rateBpm: bpm(60, 130, 85),
    regularity: 'regular',
    pWave: normalP,
    prMs: normalPr,
    qrsMs: normalQrs,
    qt: 'Usually interpretable on representative beats.',
    stSegment: 'Horizontal ST depression in V1-V3 as mirror image of posterior ST elevation.',
    tWave: 'Tall upright anterior T waves can accompany posterior mirror pattern.',
    gridNotes: ['Standard 12-lead shows the mirror image: horizontal ST depression in V1-V3.', 'Tall R waves in V1-V3 can mirror posterior Q waves.', 'Posterior leads V7-V9 use >=0.5 mm ST elevation threshold.'],
    extremeVariants: ['Often occurs with inferior/lateral MI patterns.'],
    generatorHints: ['Depress ST and enlarge R waves in V1-V3; optional V7-V9 overlay.'],
    criticalTeachingPoints: ['Posterior MI is easy to miss because the standard 12-lead often shows anterior ST depression instead of visible posterior ST elevation.'],
  },
  {
    rhythmId: 'ischemia.st-depression',
    displayName: 'Ischemic ST depression',
    category: 'ischemia',
    rateBpm: bpm(60, 160, 100),
    regularity: 'regular',
    pWave: normalP,
    prMs: normalPr,
    qrsMs: normalQrs,
    qt: 'Usually normal unless drug/electrolyte modifier.',
    stSegment: 'Horizontal or downsloping ST depression >=0.5 mm is suspicious; >=1 mm is easier for learners.',
    tWave: 'T-wave inversion or flattening may accompany ischemia.',
    gridNotes: ['0.5 mm is half a small box; 1 mm is one small box.', 'Upsloping depression is less specific than horizontal/downsloping.'],
    extremeVariants: ['Diffuse depression with aVR elevation can suggest left main/proximal LAD or severe supply-demand mismatch.'],
    generatorHints: ['Lower ST segment after J point without changing QRS width.'],
  },
  {
    rhythmId: 'electrolyte.hyperk-peaked-t',
    displayName: 'Hyperkalemia with peaked T waves',
    category: 'electrolyte',
    rateBpm: bpm(40, 120, 70),
    regularity: 'regular',
    pWave: variableP('P waves may flatten as potassium rises'),
    prMs: ms(120, 240, 180, 'PR can prolong with rising potassium'),
    qrsMs: ms(60, 120, 95, 'early hyperkalemia may still have narrow QRS'),
    qt: 'QT may shorten early because T wave narrows/peaks.',
    stSegment: 'ST segment may become short or hard to distinguish from peaked T.',
    tWave: 'Tall, narrow, symmetric tented T waves, often diffuse.',
    gridNotes: ['T waves should be narrow-based and pointed, not broad hyperacute MI T waves.', 'QRS may still be normal early.'],
    extremeVariants: ['Progression adds PR prolongation, P flattening, and QRS widening.'],
    generatorHints: ['Increase T amplitude and narrow T width; optionally flatten P.'],
  },
  {
    rhythmId: 'electrolyte.hyperk-progression',
    displayName: 'Progressive hyperkalemia',
    category: 'electrolyte',
    rateBpm: bpm(20, 120, 55),
    regularity: 'irregular',
    pWave: variableP('P waves flatten, widen, or disappear with severe hyperkalemia'),
    prMs: ms(160, 320, 240, 'progressive PR prolongation'),
    qrsMs: ms(100, 180, 140, 'progressive QRS widening'),
    qt: 'QT may shorten early, then becomes unreliable as QRS/T merge.',
    stSegment: 'ST/T merge as QRS widens in severe cases.',
    tWave: 'Peaked T early; later QRS and T merge.',
    gridNotes: ['Show widening from about 2.5 small boxes toward 4+ small boxes.', 'P wave loss plus wide QRS is late and dangerous.'],
    extremeVariants: ['Can progress to sine-wave, VF, or asystole.'],
    generatorHints: ['Animate staged widening and P attenuation over time.'],
    progressionStages: [
      {
        id: 'hyperk-mild-5-5-6-5',
        label: 'Mild hyperkalemia',
        trigger: 'Potassium roughly 5.5-6.5 mEq/L; ECG correlation is imperfect.',
        ecgChanges: ['Tall narrow symmetric peaked T waves', 'Best seen in V2-V4 and lead II', 'T wave may exceed R wave amplitude'],
        parameters: ['Increase T-wave amplitude to 150-200% of baseline', 'Narrow T-wave width', 'Use pointed tented T morphology'],
      },
      {
        id: 'hyperk-moderate-6-5-7-5',
        label: 'Moderate hyperkalemia',
        trigger: 'Potassium roughly 6.5-7.5 mEq/L.',
        ecgChanges: ['PR prolongation beyond 200 ms', 'P-wave flattening progressing to disappearance', 'QRS widening beyond 120 ms', 'ST depression can appear'],
        parameters: ['Increase PR interval toward 240-300 ms', 'Reduce P-wave amplitude toward zero', 'Increase QRS duration to 120-160 ms'],
      },
      {
        id: 'hyperk-severe-7-5-9',
        label: 'Severe hyperkalemia',
        trigger: 'Potassium roughly 7.5-9.0 mEq/L.',
        ecgChanges: ['Absent P waves', 'Marked QRS widening beyond 160 ms', 'QRS merges with T wave into sine-wave morphology', 'Can mimic STEMI, LBBB, or VT'],
        parameters: ['Increase QRS duration to 160-250 ms', 'Merge QRS and T into smooth undulating sine wave', 'Keep P waves absent'],
      },
      {
        id: 'hyperk-terminal-above-9',
        label: 'Terminal hyperkalemia',
        trigger: 'Potassium above roughly 9.0 mEq/L.',
        ecgChanges: ['Sine wave can degenerate into VF', 'Can progress to asystole', 'Cardiac arrest imminent'],
        parameters: ['Branch to VF/asystole generators when untreated', 'Suppress organized PQRST morphology'],
      },
    ],
    simulationRules: [
      {
        id: 'hyperk-calcium-feedback',
        display: 'After calcium, QRS narrows within 1-3 minutes while potassium-removal steps remain pending.',
        learnerMust: 'Understand calcium stabilizes the membrane but does not lower serum potassium.',
        treatment: ['Calcium gluconate 10% 10 mL IV over 2-3 minutes', 'Insulin 10 units IV plus dextrose 25 g', 'High-dose nebulized albuterol', 'Sodium bicarbonate if acidotic', 'Definitive potassium removal such as dialysis when refractory'],
      },
    ],
    criticalTeachingPoints: ['Clinical severity does not perfectly track potassium number; teach the ECG progression but let the scenario physiology drive urgency.'],
  },
  {
    rhythmId: 'electrolyte.hyperk-sine-wave',
    displayName: 'Severe hyperkalemia sine-wave pattern',
    category: 'electrolyte',
    rateBpm: bpm(20, 80, 40),
    regularity: 'irregular',
    pWave: noP('P waves absent or nearly invisible'),
    prMs: null,
    qrsMs: ms(180, 320, 240, 'QRS and T merge into sine-wave morphology'),
    qt: 'Not meaningfully measurable once QRS/T merge.',
    stSegment: 'No clear ST segment.',
    tWave: 'Merged with broad QRS into sine wave.',
    gridNotes: ['Very wide smooth QRS/T complex, often >4.5 small boxes.', 'This should trigger immediate hyperkalemia treatment teaching.'],
    extremeVariants: ['Can deteriorate into VF/asystole branch.'],
    generatorHints: ['Blend QRS and T into broad smooth oscillation with low/absent P waves.'],
  },
  {
    rhythmId: 'special.hypothermia',
    displayName: 'Hypothermia with Osborn/J waves',
    category: 'special',
    rateBpm: bpm(20, 70, 45, 'heart rate generally falls as core temperature drops'),
    regularity: 'irregular',
    pWave: variableP('sinus P waves may persist in mild hypothermia; atrial fibrillation becomes common with deeper hypothermia'),
    prMs: ms(160, 300, 220, 'PR prolongs as temperature falls'),
    qrsMs: ms(80, 140, 100, 'QRS can widen in severe hypothermia'),
    qt: 'QT prolongs as temperature falls; model roughly 10-20% increase per 1 C drop below 35 C for teaching.',
    stSegment: 'Osborn/J wave is a positive deflection at the J point between QRS and ST segment.',
    tWave: 'T waves can broaden or invert; tremor artifact can obscure repolarization.',
    gridNotes: ['Osborn wave amplitude 1-5 mm is 0.1-0.5 mV at standard gain.', 'Osborn wave duration 40-80 ms spans 1-2 small boxes.', 'Best seen in lateral leads V4-V6 and lead II.'],
    extremeVariants: ['Moderate hypothermia commonly shows atrial fibrillation.', 'Below 28 C, VF/asystole risk is high and Osborn waves can be very prominent.'],
    generatorHints: ['Slow heart rate, prolong PR/QT, add dome-shaped J-point bump after QRS, and optionally add tremor artifact.'],
    progressionStages: [
      {
        id: 'hypothermia-mild-32-35',
        label: 'Mild hypothermia',
        trigger: 'Core temperature 32-35 C.',
        ecgChanges: ['Sinus bradycardia', 'PR prolongation', 'QT prolongation', 'Muscle tremor artifact', 'Small Osborn waves may begin'],
        parameters: ['Decrease HR about 10 bpm per 1 C drop below 35 C', 'Increase QT 10-20% per 1 C drop for teaching', 'Add low-amplitude tremor artifact'],
      },
      {
        id: 'hypothermia-moderate-28-32',
        label: 'Moderate hypothermia',
        trigger: 'Core temperature 28-32 C.',
        ecgChanges: ['Prominent Osborn/J waves', 'Atrial fibrillation common', 'Further bradycardia'],
        parameters: ['Osborn amplitude 1-5 mm depending on temperature', 'Osborn duration 40-80 ms', 'Prefer lateral leads and II for visibility'],
      },
      {
        id: 'hypothermia-severe-below-28',
        label: 'Severe hypothermia',
        trigger: 'Core temperature below 28 C.',
        ecgChanges: ['Very high VF risk', 'Asystole can occur', 'Very prominent Osborn waves'],
        parameters: ['Allow deterioration branch to VF/asystole', 'Keep profound bradycardia and marked QT prolongation'],
      },
    ],
    simulationRules: [
      {
        id: 'hypothermia-rewarm-first',
        display: 'Cold bradycardic patient with Osborn waves and worsening ectopy.',
        learnerMust: 'Recognize hypothermia pattern and prioritize rewarming plus gentle handling in the scenario.',
        danger: 'Severe hypothermia is highly arrhythmogenic; repeated shocks may be ineffective until rewarming improves physiology.',
      },
    ],
  },

  // ── Gap-fill: implemented rhythms that lack measurement specs ───────
  // Added so the realism audit reaches every rendered rhythm.

  {
    rhythmId: 'av-block.dissociation',
    displayName: 'AV dissociation',
    category: 'av-block',
    rateBpm: bpm(40, 110, 70, 'depends on which focus is faster (sinus, junctional, or ventricular escape)'),
    atrialRateBpm: bpm(60, 100, 80, 'often sinus'),
    ventricularRateBpm: bpm(40, 110, 60, 'junctional or ventricular escape rate'),
    regularity: 'regular',
    pWave: variableP('Sinus P waves march through independently of QRS; some Ps fall before, on, or just after QRS without a stable PR.'),
    prMs: null,
    qrsMs: normalQrs,
    qt: 'QT measured from the QRS that is present; ventricular escape variant uses wide QRS QT envelope.',
    stSegment: 'Isoelectric unless a separate ischemic modifier is layered in.',
    tWave: 'Normal polarity for the focus driving the QRS.',
    gridNotes: [
      'P-to-QRS relationship varies beat-to-beat — that is the diagnostic finding.',
      'Differs from third-degree AV block: atrial and ventricular rates may be similar or the ventricular rate may transiently exceed the atrial rate.',
    ],
    extremeVariants: [
      'Isorhythmic AV dissociation (atrial and ventricular rates nearly identical) is the classic presentation.',
      'AV dissociation during VT with retrograde block is a major VT-versus-SVT clue.',
    ],
    generatorHints: [
      'Drive two independent rate clocks: sinus P-P and junctional/ventricular R-R. Render P waves at their own cadence regardless of QRS timing.',
    ],
  },

  {
    rhythmId: 'vent.pvc-couplet',
    displayName: 'PVC couplet',
    category: 'ventricular',
    rateBpm: bpm(60, 110, 80, 'underlying sinus rate; couplet itself is two consecutive PVCs'),
    regularity: 'irregular',
    pWave: variableP('Underlying sinus P waves precede conducted beats; PVCs have no preceding P wave.'),
    prMs: normalPr,
    qrsMs: wideQrs,
    qt: 'PVC QT lengthened by wide QRS; T wave usually discordant.',
    stSegment: 'Secondary ST shift opposite the wide PVC QRS direction.',
    tWave: 'Discordant to the PVC QRS — opposite deflection from the dominant QRS vector.',
    gridNotes: [
      'Two consecutive wide bizarre QRS complexes (>=120 ms) without a P wave preceding either one.',
      'Compensatory pause typically follows the couplet before the next sinus beat.',
    ],
    extremeVariants: [
      'Unifocal couplet: both PVCs share the same morphology.',
      'Multifocal couplet: the two PVCs have visibly different shapes — higher risk for sustained VT.',
    ],
    generatorHints: [
      'Insert two sequential wide-QRS templates back-to-back into the underlying sinus stream; suppress the P wave for both beats and follow with a compensatory pause.',
    ],
  },

  {
    rhythmId: 'vent.pvc-triplet',
    displayName: 'PVC triplet (3-beat run)',
    category: 'ventricular',
    rateBpm: bpm(60, 110, 80, 'underlying sinus rate; the triplet itself is at a VT-like rate'),
    regularity: 'irregular',
    pWave: variableP('Underlying sinus P waves precede conducted beats; the three PVCs have no preceding P wave.'),
    prMs: normalPr,
    qrsMs: wideQrs,
    qt: 'PVC QT lengthened by wide QRS; T wave usually discordant.',
    stSegment: 'Secondary ST shift opposite the wide PVC QRS direction.',
    tWave: 'Discordant to the PVC QRS.',
    gridNotes: [
      'Three consecutive wide PVCs at >100 bpm meets the definition of non-sustained VT (run).',
      'By definition, a sustained run is >=30 seconds — triplets terminate well before that.',
    ],
    extremeVariants: [
      'Slow triplet (rate <100 bpm) is an idioventricular run rather than a VT run.',
      'Polymorphic triplet on a long QT background may precede torsades.',
    ],
    generatorHints: [
      'Insert three sequential wide-QRS templates; rate within the run typically 140-200 bpm even if underlying sinus is normal.',
    ],
  },

  {
    rhythmId: 'conduction.wpw-type-a',
    displayName: 'WPW pattern — Type A (left-sided accessory pathway)',
    category: 'conduction',
    rateBpm: bpm(60, 100, 75, 'sinus rhythm with pre-excitation pattern'),
    regularity: 'regular',
    pWave: normalP,
    prMs: ms(80, 110, 100, 'short PR because ventricular activation begins through left-sided accessory pathway'),
    qrsMs: ms(100, 140, 120, 'delta-wave slur prolongs the early QRS'),
    qt: 'QT measured from start of delta wave; usually within normal range.',
    stSegment: 'Secondary ST changes opposite to delta wave direction.',
    tWave: 'Often discordant to the pre-excited QRS.',
    gridNotes: [
      'Type A: dominant R wave in V1-V2 (mimics RBBB or posterior MI) because depolarization moves right-to-left from a left-sided accessory pathway.',
      'Delta wave is positive in most precordial leads in Type A.',
    ],
    extremeVariants: [
      'Type A can mimic RBBB or posterior MI in V1-V2 — clue is the short PR and the delta-wave slur on the QRS upstroke.',
    ],
    generatorHints: [
      'Use positive delta polarity in V1-V6; pathway location: left lateral or posteroseptal. Keep PR <120 ms and add 20-40 ms delta slur to QRS onset.',
    ],
    criticalTeachingPoints: ['Pre-excited AF with a left-sided pathway can conduct at very fast ventricular rates — AV nodal blockers are dangerous.'],
  },

  {
    rhythmId: 'conduction.wpw-type-b',
    displayName: 'WPW pattern — Type B (right-sided accessory pathway)',
    category: 'conduction',
    rateBpm: bpm(60, 100, 75, 'sinus rhythm with pre-excitation pattern'),
    regularity: 'regular',
    pWave: normalP,
    prMs: ms(80, 110, 100, 'short PR because ventricular activation begins through right-sided accessory pathway'),
    qrsMs: ms(100, 140, 120, 'delta-wave slur prolongs the early QRS'),
    qt: 'QT measured from start of delta wave; usually within normal range.',
    stSegment: 'Secondary ST changes opposite to delta wave direction.',
    tWave: 'Often discordant to the pre-excited QRS.',
    gridNotes: [
      'Type B: negative or biphasic delta in V1-V2 (mimics LBBB) because depolarization moves left-to-right from a right-sided accessory pathway.',
      'Positive delta in lateral leads I, V5-V6.',
    ],
    extremeVariants: [
      'Type B can mimic LBBB — clue is the short PR and the delta-wave slur on the QRS upstroke.',
    ],
    generatorHints: [
      'Use negative delta in V1-V2, positive in V5-V6; pathway location: right free wall or anteroseptal. Keep PR <120 ms and add 20-40 ms delta slur to QRS onset.',
    ],
  },

  {
    rhythmId: 'ischemia.septal-stemi',
    displayName: 'Septal STEMI pattern',
    category: 'ischemia',
    rateBpm: bpm(60, 130, 85),
    regularity: 'regular',
    pWave: normalP,
    prMs: normalPr,
    qrsMs: normalQrs,
    qt: 'QTc usually normal; ischemia can alter T-wave morphology.',
    stSegment: 'ST elevation in V1-V2; reciprocal ST depression may appear in inferior leads.',
    tWave: 'Hyperacute T waves V1-V2 early; inversion can develop later.',
    gridNotes: [
      'STEMI thresholds in V1-V2: men <40 yr need >=2.5 mm, men >=40 yr need >=2 mm, women need >=1.5 mm.',
      'Loss of normal R-wave progression in V1-V2 hints at septal infarction.',
    ],
    extremeVariants: [
      'Isolated septal STEMI is uncommon; usually extends to anterior wall as septal-anterior infarct.',
    ],
    generatorHints: [
      'Raise J point and ST in V1-V2; suppress R-wave progression in V1-V3; LAD septal-branch occlusion is the typical culprit.',
    ],
    criticalTeachingPoints: ['Septal ST elevation overlapping with LBBB or LVH morphology must be evaluated with modified Sgarbossa criteria.'],
  },

  {
    rhythmId: 'ischemia.anterolateral-stemi',
    displayName: 'Anterolateral STEMI pattern',
    category: 'ischemia',
    rateBpm: bpm(60, 140, 90),
    regularity: 'regular',
    pWave: normalP,
    prMs: normalPr,
    qrsMs: normalQrs,
    qt: 'QTc may be normal; ischemia can alter T-wave morphology.',
    stSegment: 'ST elevation across V3-V6, I, and aVL; reciprocal ST depression in II, III, aVF.',
    tWave: 'Hyperacute or upright early; inverts as infarct evolves.',
    gridNotes: [
      'Contiguous lead criteria met across precordial and high-lateral leads.',
      'Reciprocal inferior ST depression supports anterolateral over isolated anterior.',
    ],
    extremeVariants: [
      'Large anterolateral STEMI usually means proximal LAD occlusion before the first diagonal — high mortality.',
    ],
    generatorHints: [
      'Raise J point/ST across V3-V6, I, aVL; depress II, III, aVF reciprocally; proximal LAD culprit.',
    ],
    criticalTeachingPoints: ['Anterolateral STEMI has higher in-hospital mortality than isolated anterior STEMI — prioritize rapid PCI.'],
  },

  {
    rhythmId: 'ischemia.sgarbossa',
    displayName: 'Sgarbossa criteria (MI in LBBB)',
    category: 'ischemia',
    rateBpm: bpm(50, 120, 75, 'LBBB-paced or native LBBB with overlaid acute ischemia'),
    regularity: 'regular',
    pWave: normalP,
    prMs: normalPr,
    qrsMs: ms(120, 180, 140, 'LBBB-morphology wide QRS'),
    qt: 'Use QTc cautiously in wide-QRS rhythms.',
    stSegment: 'Concordant ST elevation >=1 mm (5 points), concordant ST depression >=1 mm in V1-V3 (3 points), discordant ST elevation >=5 mm (2 points). Score >=3 is highly specific for MI.',
    tWave: 'Concordant T wave directions in any lead support acute ischemia.',
    gridNotes: [
      'Original Sgarbossa: total score >=3 of the three weighted criteria diagnoses MI in LBBB with high specificity.',
      'A single concordant ST elevation >=1 mm alone (5 pts) already meets the threshold.',
    ],
    extremeVariants: [
      'New (or presumed new) LBBB with chest pain is treated as STEMI-equivalent in many protocols even before Sgarbossa is applied.',
    ],
    generatorHints: [
      'Render LBBB morphology with one concordant ST elevation or a markedly discordant ST elevation >=5 mm to teach the scoring.',
    ],
    criticalTeachingPoints: ['Discordant ST elevation up to 5 mm is normal in LBBB. The diagnosis turns on concordance or excessive discordance, not on any ST elevation.'],
  },

  {
    rhythmId: 'ischemia.modified-sgarbossa',
    displayName: 'Modified Sgarbossa criteria (Smith)',
    category: 'ischemia',
    rateBpm: bpm(50, 120, 75, 'LBBB or paced rhythm with acute ischemia overlay'),
    regularity: 'regular',
    pWave: normalP,
    prMs: normalPr,
    qrsMs: ms(120, 180, 140, 'LBBB-morphology wide QRS'),
    qt: 'Use QTc cautiously in wide-QRS rhythms.',
    stSegment: 'Modified rule replaces the absolute 5 mm discordance with a proportional rule: discordant ST elevation >=1 mm AND >=25% of preceding S-wave depth is positive.',
    tWave: 'Concordant T wave directions also support acute ischemia.',
    gridNotes: [
      'Modified Sgarbossa positivity: any single proportional discordant ST elevation criterion is positive (no point-total needed).',
      'Concordant ST elevation >=1 mm or concordant ST depression >=1 mm in V1-V3 also positive (same as original).',
    ],
    extremeVariants: [
      'Smith-modified criteria have higher sensitivity than original Sgarbossa, similar specificity — better tool when LBBB makes interpretation hard.',
    ],
    generatorHints: [
      'Render LBBB with a discordant ST elevation that is 25-40% of the S-wave depth — that is the teaching moment.',
    ],
    criticalTeachingPoints: ['Modified Sgarbossa replaces the absolute 5 mm rule with a proportional rule. It catches more true MIs.'],
  },

  {
    rhythmId: 'special.brugada-type-1',
    displayName: 'Brugada — Type 1 (coved)',
    category: 'special',
    rateBpm: bpm(50, 110, 75),
    regularity: 'regular',
    pWave: normalP,
    prMs: normalPr,
    qrsMs: ms(80, 120, 105, 'may show incomplete RBBB morphology in V1-V2'),
    qt: 'QT usually within normal range; Brugada is primarily an ST-T phenotype.',
    stSegment: 'Coved ST elevation >=2 mm in V1-V2 with a descending ST segment that flows into an inverted T wave.',
    tWave: 'Inverted T wave following the coved ST elevation in V1-V2.',
    gridNotes: [
      'Type 1 is the only diagnostic Brugada pattern. Type 2 and 3 are suggestive and need provocation or further work-up.',
      'High right-precordial lead placement (2nd-3rd intercostal space) increases sensitivity.',
    ],
    extremeVariants: [
      'Fever can unmask Type 1 morphology in a previously unrecognized carrier.',
      'Sodium-channel blocker challenge (ajmaline, procainamide, flecainide) can also convert non-diagnostic patterns into Type 1.',
    ],
    generatorHints: [
      'In V1-V2 raise J point >=2 mm, slope ST downward into a deeply inverted T. Keep PR/QRS in normal-to-incomplete-RBBB range.',
    ],
    simulationRules: [
      {
        id: 'brugada-type-1-fever',
        display: 'Coved ST elevation appears or worsens in V1-V2 during a febrile scenario.',
        learnerMust: 'Recognize Type 1 Brugada and prioritize fever control and arrhythmia surveillance.',
        danger: 'Type 1 morphology in the right clinical context is associated with VF and sudden cardiac death.',
        treatment: ['Aggressive antipyresis in scenario context', 'Cardiology consultation', 'Avoid sodium-channel blockers that can worsen the pattern'],
      },
    ],
    criticalTeachingPoints: ['Type 1 Brugada is the diagnostic Brugada pattern; do not dismiss it as benign RBBB.'],
  },

  {
    rhythmId: 'special.brugada-type-2',
    displayName: 'Brugada — Type 2 (saddleback)',
    category: 'special',
    rateBpm: bpm(50, 110, 75),
    regularity: 'regular',
    pWave: normalP,
    prMs: normalPr,
    qrsMs: ms(80, 120, 105, 'may show incomplete RBBB morphology in V1-V2'),
    qt: 'QT usually within normal range.',
    stSegment: 'Saddleback ST elevation >=2 mm in V1-V2 with a second positive deflection on the descending limb.',
    tWave: 'Upright or biphasic T wave following the saddleback.',
    gridNotes: [
      'Type 2 is suggestive, not diagnostic. Provocation testing (sodium-channel blocker) is needed to convert to Type 1 for diagnosis.',
      'Saddleback morphology is the key clue: J point elevation, downsloping ST, then a second upward deflection before the T wave.',
    ],
    extremeVariants: [
      'Type 2 → Type 1 conversion with fever or sodium-channel blocker challenge confirms Brugada syndrome.',
    ],
    generatorHints: [
      'Render the V1-V2 ST as a saddle: high J point, downsloping toward isoelectric, then a small positive deflection before the upright or biphasic T.',
    ],
  },

  {
    rhythmId: 'pacer.pmt',
    displayName: 'Pacemaker-mediated tachycardia (endless-loop tachycardia)',
    category: 'pacer',
    rateBpm: bpm(100, 180, 130, 'usually at or just below the programmed upper rate limit'),
    regularity: 'regular',
    pWave: pacedP('Atrial activity is retrograde — each ventricular pace conducts back through the AV node and is sensed as a native P, which triggers the next ventricular pace.'),
    prMs: null,
    qrsMs: wideQrs,
    qt: 'Wide QRS QT envelope; rate-dependent.',
    stSegment: 'Discordant to the paced QRS.',
    tWave: 'Discordant.',
    gridNotes: [
      'Regular wide-complex tachycardia at the upper rate limit in a dual-chamber pacemaker patient — think PMT.',
      'Magnet application converts pacing to asynchronous mode and breaks the loop, confirming the diagnosis.',
    ],
    extremeVariants: [
      'Reprogramming the post-ventricular atrial refractory period (PVARP) prevents recurrence.',
    ],
    generatorHints: [
      'Drive paced ventricular beats at the programmed upper rate; insert a small retrograde P after each QRS that triggers the next pace.',
    ],
    simulationRules: [
      {
        id: 'pmt-magnet-break',
        display: 'Regular wide-complex tachycardia at the dual-chamber upper rate limit in a paced patient.',
        learnerMust: 'Recognize PMT and apply a magnet to terminate the loop.',
        treatment: ['Magnet over the device → asynchronous pacing, loop breaks', 'Adjust PVARP after termination to prevent recurrence'],
      },
    ],
    criticalTeachingPoints: ['Magnet application is diagnostic and therapeutic for PMT — it forces asynchronous pacing that breaks the reentry loop.'],
  },

  {
    rhythmId: 'pacer.runaway',
    displayName: 'Runaway pacemaker',
    category: 'pacer',
    rateBpm: bpm(180, 400, 220, 'far above programmed upper rate; can degrade hemodynamics rapidly'),
    regularity: 'regular',
    pWave: pacedP('Atrial pacing may be present or absent depending on lead, but the dominant feature is rapid ventricular pacing.'),
    prMs: null,
    qrsMs: wideQrs,
    qt: 'Very short; rate-dependent.',
    stSegment: 'Discordant to paced QRS.',
    tWave: 'Discordant; may merge with the next paced complex at very high rates.',
    gridNotes: [
      'Pacing spike before every QRS at a rate far above the programmed upper rate (>180 bpm) is the diagnostic finding.',
      'Hemodynamic collapse can follow rapidly — treat as a true emergency.',
    ],
    extremeVariants: [
      'Older generators are most at risk; modern devices have runaway-prevention firmware.',
      'Most often triggered by battery depletion, generator component failure, or external EMI.',
    ],
    generatorHints: [
      'Drive paced beats at 180-400 bpm with visible spikes; reduce QRS amplitude as rates rise due to incomplete repolarization.',
    ],
    simulationRules: [
      {
        id: 'runaway-magnet-or-cut',
        display: 'Paced wide-complex tachycardia far above the programmed upper rate, with hemodynamic decline.',
        learnerMust: 'Recognize runaway pacemaker; the device is the cause.',
        danger: 'Pacing spikes drive a hemodynamically intolerable ventricular rate; standard antiarrhythmics are useless.',
        treatment: ['Magnet application may slow paced rate to magnet rate', 'If magnet fails: emergent generator deactivation, surgical lead disconnection, or generator replacement'],
      },
    ],
    criticalTeachingPoints: ['Runaway pacemaker is a device emergency, not a rhythm emergency. Antiarrhythmics do not help — the pacing system must be stopped.'],
  },
] as const;

export const RHYTHM_MEASUREMENT_BY_ID: ReadonlyMap<RhythmId, RhythmMeasurementSpec> = new Map(
  RHYTHM_MEASUREMENT_SPECS.map((spec) => [spec.rhythmId, spec]),
);

export function rhythmMeasurementSpec(id: RhythmId): RhythmMeasurementSpec | undefined {
  return RHYTHM_MEASUREMENT_BY_ID.get(id);
}

export function implementedMeasurementRhythmIds(): readonly RhythmId[] {
  return RHYTHM_MEASUREMENT_SPECS.map((spec) => spec.rhythmId);
}
