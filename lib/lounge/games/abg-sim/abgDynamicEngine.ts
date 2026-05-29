import type { BloodGasSampleType, BloodGasValue } from './abgTypes';

export type BloodGasMode = BloodGasSampleType | 'MIXED';
export type BloodGasLevel = 'baby' | 'building' | 'intermediate' | 'advanced' | 'expert' | 'master';
export type BloodGasQuestionId =
  | 'ph'
  | 'primary'
  | 'compensation'
  | 'oxygen'
  | 'ag'
  | 'winter'
  | 'delta'
  | 'aa'
  | 'priority';

export interface DynamicBloodGasAnswer {
  ph: string;
  primary: string;
  compensation: string;
  oxygen: string;
  ag: string;
  winter: string;
  delta: string;
  aa: string;
  priority: string;
}

export interface DynamicBloodGasLabels {
  co2: string;
  o2: string;
  sat: string;
}

export interface DynamicBloodGasValues {
  pH: number;
  pCO2: number;
  pO2: number;
  TCO2: number;
  HCO3: number;
  BEecf: number;
  sO2: number;
  Na: number;
  K: number;
  Cl: number;
  iCa: number;
  Glu: number;
  Lac: number;
  Hct: number;
  Hgb: number;
  AG: number;
  Aa: number | null;
  deltaRatio: number | null;
}

export interface DynamicBloodGasCase {
  key: string;
  sample: BloodGasSampleType;
  title: string;
  vignette: string;
  pearl: string;
  fio2: number;
  labels: DynamicBloodGasLabels;
  values: DynamicBloodGasValues;
  answer: DynamicBloodGasAnswer;
  templateId: string;
}

export interface BloodGasQuestionOption {
  id: string;
  label: string;
}

export interface BloodGasQuestionDef {
  id: BloodGasQuestionId;
  title: string;
  hint: string;
  options: readonly BloodGasQuestionOption[];
  minLevel: number;
}

export interface BloodGasAnswerResult {
  id: BloodGasQuestionId;
  label: string;
  selected: string | null;
  correct: string;
  ok: boolean;
}

interface Rng {
  next: () => number;
}

interface TemplateContext {
  mode: BloodGasMode;
  level: BloodGasLevel;
  rng: Rng;
}

interface BuildConfig {
  pco2: number;
  hco3: number;
  ag: number;
  fio2?: number;
  aa?: number;
  lactate: number;
  glucose: number;
  title: string;
  vignette?: string;
  pearl: string;
  answer: Partial<DynamicBloodGasAnswer> & {
    ph?: string;
    primary: string;
    compensation: string;
    oxygen?: string;
    ag?: string;
  };
  fixedNa?: number;
  fixedCl?: number;
  fixedK?: number;
  forceClHigh?: boolean;
  clBase?: number;
  kBase?: number;
}

interface BloodGasTemplate {
  id: string;
  minLevel: number;
  title: string;
  vignette: string;
  generate: (ctx: TemplateContext) => DynamicBloodGasCase;
}

export const BLOOD_GAS_LEVEL_ORDER: Record<BloodGasLevel, number> = {
  baby: 1,
  building: 2,
  intermediate: 3,
  advanced: 4,
  expert: 5,
  master: 6,
};

const REFS = {
  ABG: {
    pH: [7.35, 7.45],
    pCO2: [35, 45],
    pO2: [80, 100],
    HCO3: [22, 26],
    sO2: [95, 100],
  },
  VBG: {
    pH: [7.31, 7.41],
    pCO2: [40, 50],
    pO2: [30, 50],
    HCO3: [23, 27],
    sO2: [60, 80],
  },
  shared: {
    BEecf: [-2, 2],
    Na: [136, 145],
    K: [3.5, 5.0],
    Cl: [98, 106],
    iCa: [1.12, 1.32],
    Glu: [70, 110],
    Lac: [0.5, 2.0],
    Hgb: [12, 17],
  },
} as const;

export const BLOOD_GAS_QUESTIONS: readonly BloodGasQuestionDef[] = [
  {
    id: 'ph',
    title: '1. pH status',
    hint: 'ABG normal pH is 7.35-7.45. VBG pH runs slightly lower.',
    options: [
      { id: 'acidemia', label: 'Acidemia' },
      { id: 'normal', label: 'Normal pH' },
      { id: 'alkalemia', label: 'Alkalemia' },
    ],
    minLevel: 1,
  },
  {
    id: 'primary',
    title: '2. Primary process',
    hint: 'Like attracts like: start with pH, then find whether CO2 or HCO3 matches that acid/alkaline direction.',
    options: [
      { id: 'normal', label: 'Normal' },
      { id: 'resp-acidosis', label: 'Resp acidosis' },
      { id: 'resp-alkalosis', label: 'Resp alkalosis' },
      { id: 'met-acidosis', label: 'Met acidosis' },
      { id: 'met-alkalosis', label: 'Met alkalosis' },
      { id: 'mixed', label: 'Mixed disorder' },
    ],
    minLevel: 1,
  },
  {
    id: 'compensation',
    title: '3. Compensation',
    hint: 'After the primary process, the opposite system should move in a helpful direction. Expected ranges catch mixed disorders.',
    options: [
      { id: 'normal', label: 'Normal' },
      { id: 'uncompensated', label: 'Uncompensated' },
      { id: 'partial', label: 'Partially compensated' },
      { id: 'full', label: 'Fully compensated' },
      { id: 'mixed', label: 'Mixed / inappropriate' },
    ],
    minLevel: 2,
  },
  {
    id: 'oxygen',
    title: '4. Hypoxia',
    hint: 'ABG oxygenation can be classified by PaO2. VBG oxygenation is not assessed by PvO2.',
    options: [
      { id: 'none', label: 'Without hypoxia' },
      { id: 'mild', label: 'Mild hypoxia' },
      { id: 'moderate', label: 'Moderate hypoxia' },
      { id: 'severe', label: 'Severe hypoxia' },
      { id: 'vbg-na', label: 'VBG: not assessed' },
    ],
    minLevel: 2,
  },
  {
    id: 'ag',
    title: '5. Anion gap classification',
    hint: 'AG = Na - (Cl + HCO3). Calculate it for metabolic acidosis and mixed-pattern checks.',
    options: [
      { id: 'not-indicated', label: 'Not indicated' },
      { id: 'normal-ag', label: 'Normal AG' },
      { id: 'high-ag', label: 'High AG' },
      { id: 'low-ag', label: 'Low AG' },
    ],
    minLevel: 3,
  },
  {
    id: 'winter',
    title: '6. Winter / compensation math',
    hint: 'Expected CO2 = 1.5 x HCO3 + 8 +/- 2 for metabolic acidosis.',
    options: [
      { id: 'not-applicable', label: 'Not applicable' },
      { id: 'appropriate', label: 'Appropriate compensation' },
      { id: 'resp-acidosis', label: 'CO2 too high' },
      { id: 'resp-alkalosis', label: 'CO2 too low' },
    ],
    minLevel: 4,
  },
  {
    id: 'delta',
    title: '7. Delta-delta',
    hint: 'Delta ratio = (AG - 12) / (24 - HCO3). <1 hidden NAGMA, 1-2 pure AGMA, >2 hidden metabolic alkalosis.',
    options: [
      { id: 'not-applicable', label: 'Not applicable' },
      { id: 'pure-agma', label: 'Pure AGMA' },
      { id: 'hidden-met-alk', label: 'AGMA + met alkalosis' },
      { id: 'hidden-nagma', label: 'AGMA + NAGMA' },
    ],
    minLevel: 4,
  },
  {
    id: 'aa',
    title: '8. A-a gradient',
    hint: 'ABG only. Compare A-a to an age-aware upper limit; elevated suggests V/Q mismatch, shunt, or diffusion trouble.',
    options: [
      { id: 'not-indicated', label: 'Not indicated' },
      { id: 'normal', label: 'Normal A-a' },
      { id: 'elevated', label: 'Elevated A-a' },
      { id: 'vbg-na', label: 'VBG: not available' },
    ],
    minLevel: 4,
  },
  {
    id: 'priority',
    title: '9. Clinical priority',
    hint: 'Expert/Master mode: choose the first high-yield move matching the physiology.',
    options: [
      { id: 'supportive', label: 'Monitor / supportive care' },
      { id: 'sepsis-bundle', label: 'Sepsis bundle' },
      { id: 'fluids-insulin-k', label: 'DKA fluids + insulin + K plan' },
      { id: 'peep-prone-fio2', label: 'ARDS oxygenation strategy' },
      { id: 'decrease-minute-vent', label: 'Decrease minute ventilation' },
      { id: 'reduce-rate-expiration', label: 'Reduce rate / extend expiration' },
      { id: 'increase-fio2-check-trapped-gas', label: 'Increase FiO2 / check trapped gas' },
      { id: 'post-rosc-bundle', label: 'Post-ROSC bundle' },
    ],
    minLevel: 5,
  },
];

export const BLOOD_GAS_LABELS: Record<BloodGasQuestionId, Record<string, string>> = {
  ph: { acidemia: 'acidemia', normal: 'normal pH', alkalemia: 'alkalemia' },
  primary: {
    normal: 'normal blood gas',
    'resp-acidosis': 'respiratory acidosis',
    'resp-alkalosis': 'respiratory alkalosis',
    'met-acidosis': 'metabolic acidosis',
    'met-alkalosis': 'metabolic alkalosis',
    mixed: 'mixed acid-base disorder',
  },
  compensation: {
    normal: 'no compensation needed',
    uncompensated: 'uncompensated',
    partial: 'partial compensation',
    full: 'full compensation',
    mixed: 'mixed or inappropriate compensation',
  },
  oxygen: {
    none: 'no hypoxia',
    mild: 'mild hypoxia',
    moderate: 'moderate hypoxia',
    severe: 'severe hypoxia',
    'vbg-na': 'VBG oxygenation not assessed',
  },
  ag: {
    'not-indicated': 'AG not required for this level/case',
    'normal-ag': 'normal anion gap',
    'high-ag': 'high anion gap',
    'low-ag': 'low anion gap',
  },
  winter: {
    'not-applicable': "Winter's formula not applicable",
    appropriate: "appropriate Winter's compensation",
    'resp-acidosis': 'CO2 too high: concurrent respiratory acidosis',
    'resp-alkalosis': 'CO2 too low: concurrent respiratory alkalosis',
  },
  delta: {
    'not-applicable': 'delta-delta not applicable',
    'pure-agma': 'pure AGMA by delta ratio',
    'hidden-met-alk': 'hidden metabolic alkalosis by delta ratio',
    'hidden-nagma': 'hidden non-gap metabolic acidosis by delta ratio',
  },
  aa: {
    'not-indicated': 'A-a not indicated',
    normal: 'normal A-a gradient',
    elevated: 'elevated A-a gradient',
    'vbg-na': 'VBG: no A-a gradient',
  },
  priority: {
    supportive: 'supportive care / monitor',
    'sepsis-bundle': 'sepsis bundle',
    'fluids-insulin-k': 'DKA fluids, insulin, and potassium plan',
    'peep-prone-fio2': 'ARDS oxygenation strategy',
    'decrease-minute-vent': 'decrease minute ventilation',
    'reduce-rate-expiration': 'reduce rate and extend expiratory time',
    'increase-fio2-check-trapped-gas': 'increase FiO2 and check trapped gas',
    'post-rosc-bundle': 'post-ROSC bundle',
  },
};

function makeRng(seed: number): Rng {
  let s = seed >>> 0;
  return {
    next: () => {
      s = (1664525 * s + 1013904223) >>> 0;
      return s / 0x100000000;
    },
  };
}

function round(n: number, decimals = 0): number {
  const p = Math.pow(10, decimals);
  return Math.round(n * p) / p;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function rand(rng: Rng, min: number, max: number, decimals = 0): number {
  return round(rng.next() * (max - min) + min, decimals);
}

function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng.next() * (max - min + 1)) + min;
}

function calcPH(hco3: number, pco2: number): number {
  return round(6.1 + Math.log10(hco3 / (0.03 * pco2)), 2);
}

function calcBE(hco3: number, pco2: number): number {
  return round(0.4 * (pco2 - 40) + hco3 - 24, 1);
}

function calcSat(po2: number, ph: number): number {
  const p50 = ph < 7.35 ? 28.4 : ph > 7.45 ? 25.4 : 26.8;
  const n = 2.7;
  const sat = (100 * Math.pow(po2, n)) / (Math.pow(po2, n) + Math.pow(p50, n));
  return round(clamp(sat, 42, 100), 0);
}

const NORMAL_PCO2 = 40;
const NORMAL_HCO3 = 24;

interface ExpectedRange {
  expected: number;
  low: number;
  high: number;
}

function expectedRange(expected: number, tolerance: number): ExpectedRange {
  return {
    expected: round(expected, 1),
    low: round(expected - tolerance, 1),
    high: round(expected + tolerance, 1),
  };
}

function inExpected(value: number, range: ExpectedRange): boolean {
  return value >= range.low && value <= range.high;
}

function arterializedPco2(sample: BloodGasSampleType, pco2: number): number {
  return sample === 'VBG' ? pco2 - 5 : pco2;
}

function arterializedHco3(sample: BloodGasSampleType, hco3: number): number {
  return sample === 'VBG' ? hco3 - 1 : hco3;
}

function oxygenAnswer(sample: BloodGasSampleType, po2: number): string {
  if (sample === 'VBG') return 'vbg-na';
  if (po2 < 40) return 'severe';
  if (po2 < 60) return 'moderate';
  if (po2 < 80) return 'mild';
  return 'none';
}

function phAnswer(sample: BloodGasSampleType, ph: number): string {
  const r = REFS[sample].pH;
  if (ph < r[0]) return 'acidemia';
  if (ph > r[1]) return 'alkalemia';
  return 'normal';
}

type AcidBaseDirection = 'acidotic' | 'alkalotic' | 'normal';

function phDirection(sample: BloodGasSampleType, ph: number): AcidBaseDirection {
  const r = REFS[sample].pH;
  if (ph < r[0]) return 'acidotic';
  if (ph > r[1]) return 'alkalotic';
  if (ph < 7.4) return 'acidotic';
  if (ph > 7.4) return 'alkalotic';
  return 'normal';
}

function pco2Direction(pco2: number): AcidBaseDirection {
  if (pco2 > 45) return 'acidotic';
  if (pco2 < 35) return 'alkalotic';
  return 'normal';
}

function hco3Direction(hco3: number): AcidBaseDirection {
  if (hco3 < 22) return 'acidotic';
  if (hco3 > 26) return 'alkalotic';
  return 'normal';
}

function primaryAnswerByLikeAttractsLike(
  sample: BloodGasSampleType,
  ph: number,
  pco2: number,
  hco3: number,
  fallback: string,
): string {
  if (fallback === 'mixed') return 'mixed';

  const phDir = phDirection(sample, ph);
  const co2Dir = pco2Direction(arterializedPco2(sample, pco2));
  const bicarbDir = hco3Direction(arterializedHco3(sample, hco3));

  if (phAnswer(sample, ph) === 'normal' && co2Dir === 'normal' && bicarbDir === 'normal') {
    return 'normal';
  }
  if (phDir === 'normal') return fallback;

  const co2Matches = co2Dir === phDir;
  const bicarbMatches = bicarbDir === phDir;
  if (co2Matches && bicarbMatches) return 'mixed';
  if (co2Matches) return phDir === 'acidotic' ? 'resp-acidosis' : 'resp-alkalosis';
  if (bicarbMatches) return phDir === 'acidotic' ? 'met-acidosis' : 'met-alkalosis';
  return fallback;
}

function expectedMetabolicAcidosisPco2(hco3: number): ExpectedRange {
  return expectedRange(1.5 * hco3 + 8, 2);
}

function expectedMetabolicAlkalosisPco2(hco3: number): ExpectedRange {
  const expected = clamp(0.7 * (hco3 - NORMAL_HCO3) + NORMAL_PCO2, NORMAL_PCO2, 55);
  return expectedRange(expected, 5);
}

function expectedRespAcidosisHco3(pco2: number, chronic: boolean): ExpectedRange {
  const delta = Math.max(0, (pco2 - NORMAL_PCO2) / 10);
  const expected = NORMAL_HCO3 + delta * (chronic ? 3.5 : 1);
  return expectedRange(expected, chronic ? 3 : 2);
}

function expectedRespAlkalosisHco3(pco2: number, chronic: boolean): ExpectedRange {
  const delta = Math.max(0, (NORMAL_PCO2 - pco2) / 10);
  const expected = NORMAL_HCO3 - delta * (chronic ? 4.5 : 2);
  return expectedRange(expected, chronic ? 3 : 2);
}

function compensationAnswer(
  answer: Pick<DynamicBloodGasAnswer, 'primary' | 'compensation'>,
  sample: BloodGasSampleType,
  ph: number,
  pco2: number,
  hco3: number,
): string {
  if (answer.compensation === 'normal') return 'normal';
  if (answer.compensation === 'mixed' || answer.primary === 'mixed') return 'mixed';

  const phState = phAnswer(sample, ph);
  const rulePco2 = arterializedPco2(sample, pco2);
  const ruleHco3 = arterializedHco3(sample, hco3);

  if (answer.primary === 'met-acidosis') {
    if (ruleHco3 >= 22) return 'mixed';
    const expected = expectedMetabolicAcidosisPco2(ruleHco3);
    if (!inExpected(rulePco2, expected)) return 'mixed';
    return phState === 'normal' ? 'full' : 'partial';
  }

  if (answer.primary === 'met-alkalosis') {
    if (ruleHco3 <= 26) return 'mixed';
    const expected = expectedMetabolicAlkalosisPco2(ruleHco3);
    if (!inExpected(rulePco2, expected)) return 'mixed';
    return phState === 'normal' ? 'full' : 'partial';
  }

  if (answer.primary === 'resp-acidosis') {
    if (rulePco2 <= 45) return 'mixed';
    const acute = expectedRespAcidosisHco3(rulePco2, false);
    const chronic = expectedRespAcidosisHco3(rulePco2, true);
    if (inExpected(ruleHco3, chronic)) return phState === 'normal' ? 'full' : 'partial';
    if (inExpected(ruleHco3, acute)) return phState === 'normal' ? 'full' : 'uncompensated';
    return 'mixed';
  }

  if (answer.primary === 'resp-alkalosis') {
    if (rulePco2 >= 35) return 'mixed';
    const acute = expectedRespAlkalosisHco3(rulePco2, false);
    const chronic = expectedRespAlkalosisHco3(rulePco2, true);
    if (inExpected(ruleHco3, chronic)) return phState === 'normal' ? 'full' : 'partial';
    if (inExpected(ruleHco3, acute)) return phState === 'normal' ? 'full' : 'uncompensated';
    return 'mixed';
  }

  return 'normal';
}

function agAnswer(ag: number, albumin = 4): string {
  const correctedAg = ag + 2.5 * (4 - albumin);
  if (correctedAg < 8) return 'low-ag';
  if (correctedAg > 12) return 'high-ag';
  return 'normal-ag';
}

function winterAnswer(primary: string, hco3: number, pco2: number): string {
  if (primary !== 'met-acidosis' && primary !== 'mixed') return 'not-applicable';
  if (hco3 >= 22) return 'not-applicable';
  const expected = expectedMetabolicAcidosisPco2(hco3);
  if (pco2 > expected.high) return 'resp-acidosis';
  if (pco2 < expected.low) return 'resp-alkalosis';
  return 'appropriate';
}

function deltaAnswer(ag: number, hco3: number): string {
  if (ag <= 12 || hco3 >= 24) return 'not-applicable';
  const ratio = (ag - 12) / (24 - hco3);
  if (ratio > 2) return 'hidden-met-alk';
  if (ratio < 1) return 'hidden-nagma';
  return 'pure-agma';
}

function aaAnswer(sample: BloodGasSampleType, aa: number | null, ageYears = 40): string {
  if (sample === 'VBG') return 'vbg-na';
  if (typeof aa !== 'number') return 'not-indicated';
  const ageAdjustedUpperLimit = Math.max(20, ageYears / 4 + 4);
  return aa > ageAdjustedUpperLimit ? 'elevated' : 'normal';
}

function resolveSampleMode(mode: BloodGasMode, rng: Rng): BloodGasSampleType {
  if (mode === 'MIXED') return rng.next() > 0.5 ? 'ABG' : 'VBG';
  return mode;
}

function buildCase(cfg: BuildConfig, ctx: TemplateContext): DynamicBloodGasCase {
  const sample = resolveSampleMode(ctx.mode, ctx.rng);
  let pco2 = cfg.pco2;
  let hco3 = cfg.hco3;
  let ph = calcPH(hco3, pco2);
  const labels = {
    co2: sample === 'VBG' ? 'pvCO2' : 'pCO2',
    o2: sample === 'VBG' ? 'pvO2' : 'pO2',
    sat: sample === 'VBG' ? 'svO2' : 'sO2',
  };

  if (sample === 'VBG') {
    ph = round(ph - rand(ctx.rng, 0.02, 0.04, 2), 2);
    pco2 = round(pco2 + rand(ctx.rng, 4, 7, 1), 1);
    hco3 = round(hco3 + rand(ctx.rng, 0.5, 1.4, 1), 1);
  }

  const be = calcBE(hco3, pco2);
  let sodium = typeof cfg.fixedNa === 'number' ? cfg.fixedNa : randInt(ctx.rng, 136, 145);
  let ag = cfg.ag;
  let chloride = Math.round(sodium - ag - hco3);

  if (cfg.forceClHigh && chloride < 108) {
    chloride = randInt(ctx.rng, 108, 118);
    ag = Math.round(sodium - chloride - hco3);
  }
  if (typeof cfg.clBase === 'number') {
    chloride = cfg.clBase;
    ag = Math.round(sodium - chloride - hco3);
  }
  if (typeof cfg.fixedCl === 'number') {
    chloride = cfg.fixedCl;
    sodium = Math.round(chloride + hco3 + ag);
  }

  const fio2 = cfg.fio2 ?? 0.21;
  const paO2Ideal = fio2 * (760 - 47) - pco2 / 0.8;
  const aa = sample === 'ABG' ? cfg.aa ?? 10 : null;
  const po2 =
    sample === 'ABG'
      ? Math.round(clamp(paO2Ideal - (aa ?? 0), 35, fio2 > 0.21 ? 220 : 112))
      : randInt(ctx.rng, 30, 54);
  const sat = sample === 'ABG' ? calcSat(po2, ph) : randInt(ctx.rng, 58, 82);
  const hgb = rand(ctx.rng, 10.8, 16.2, 1);
  const hct = round(hgb * 3, 0);
  const tco2 = round(hco3 + 0.03 * pco2, 0);
  const kBase = typeof cfg.kBase === 'number' ? cfg.kBase : rand(ctx.rng, 3.6, 4.8, 1);
  const potassium =
    typeof cfg.fixedK === 'number' ? cfg.fixedK : round(clamp(kBase + (7.4 - ph) * 3.2, 2.6, 7.6), 1);
  const iCa = round(clamp(rand(ctx.rng, 1.13, 1.27, 2) + (7.4 - ph) * 0.35, 0.92, 1.48), 2);
  const answer: DynamicBloodGasAnswer = {
    ph: cfg.answer.ph ?? 'auto',
    primary: cfg.answer.primary,
    compensation: cfg.answer.compensation,
    oxygen: cfg.answer.oxygen ?? 'auto',
    ag: cfg.answer.ag ?? agAnswer(ag),
    winter: cfg.answer.winter ?? '',
    delta: cfg.answer.delta ?? '',
    aa: cfg.answer.aa ?? 'auto',
    priority: cfg.answer.priority ?? 'supportive',
  };

  answer.ph = answer.ph === 'auto' ? phAnswer(sample, ph) : answer.ph;
  answer.primary = primaryAnswerByLikeAttractsLike(sample, ph, pco2, hco3, answer.primary);
  answer.oxygen = answer.oxygen === 'auto' ? oxygenAnswer(sample, po2) : answer.oxygen;
  const computedCompensation = compensationAnswer(answer, sample, ph, pco2, hco3);
  answer.compensation =
    answer.compensation === 'normal' || answer.compensation === 'mixed'
      ? answer.compensation
      : computedCompensation;
  const rulePco2 = arterializedPco2(sample, pco2);
  const ruleHco3 = arterializedHco3(sample, hco3);
  answer.winter = answer.winter || winterAnswer(answer.primary, ruleHco3, rulePco2);
  answer.delta = answer.delta || deltaAnswer(ag, ruleHco3);
  if (BLOOD_GAS_LEVEL_ORDER[ctx.level] < 3) answer.ag = 'not-indicated';
  const measuredAa = sample === 'ABG' ? Math.round(paO2Ideal - po2) : null;
  answer.aa = answer.aa === 'auto' ? aaAnswer(sample, measuredAa) : answer.aa || aaAnswer(sample, measuredAa);

  const values: DynamicBloodGasValues = {
    pH: ph,
    pCO2: pco2,
    pO2: po2,
    TCO2: tco2,
    HCO3: hco3,
    BEecf: be,
    sO2: sat,
    Na: sodium,
    K: potassium,
    Cl: chloride,
    iCa,
    Glu: cfg.glucose,
    Lac: cfg.lactate,
    Hct: hct,
    Hgb: hgb,
    AG: ag,
    Aa: measuredAa,
    deltaRatio: ag > 12 && hco3 < 24 ? round((ag - 12) / (24 - hco3), 2) : null,
  };

  return {
    key: [sample, values.pH, values.pCO2, values.HCO3].join('|'),
    sample,
    title: cfg.title,
    vignette: cfg.vignette ?? '',
    pearl: cfg.pearl,
    fio2,
    labels,
    values,
    answer,
    templateId: cfg.title,
  };
}

export const BLOOD_GAS_TEMPLATES: readonly BloodGasTemplate[] = [
  {
    id: 'normal',
    minLevel: 1,
    title: 'Clean control sample',
    vignette: 'Healthy training control with no respiratory distress, no shock signs, and normal mentation.',
    generate: (ctx) =>
      buildCase(
        {
          pco2: rand(ctx.rng, 37, 43, 1),
          hco3: rand(ctx.rng, 23, 25.5, 1),
          ag: randInt(ctx.rng, 8, 12),
          fio2: 0.21,
          aa: rand(ctx.rng, 6, 12, 0),
          lactate: rand(ctx.rng, 0.7, 1.6, 1),
          glucose: randInt(ctx.rng, 82, 108),
          title: 'Normal blood gas',
          vignette: 'Healthy training control with no respiratory distress, no shock signs, and normal mentation.',
          answer: { ph: 'normal', primary: 'normal', compensation: 'normal', oxygen: 'none', ag: 'not-indicated' },
          pearl: 'Everything starts with the pH. If pH, CO2, and HCO3 are all in range, this is a normal acid-base pattern.',
        },
        ctx,
      ),
  },
  {
    id: 'acute-resp-acidosis',
    minLevel: 1,
    title: 'Opioid hypoventilation',
    vignette: 'Found somnolent with shallow respirations. The teaching target is CO2 retention from inadequate ventilation.',
    generate(ctx) {
      const pco2 = rand(ctx.rng, 55, 82, 1);
      const hco3 = round(24 + ((pco2 - 40) / 10) * rand(ctx.rng, 0.6, 1.4, 1), 1);
      return buildCase(
        {
          pco2,
          hco3,
          ag: randInt(ctx.rng, 8, 12),
          fio2: 0.21,
          aa: rand(ctx.rng, 8, 15, 0),
          lactate: rand(ctx.rng, 0.8, 2.0, 1),
          glucose: randInt(ctx.rng, 80, 160),
          title: 'Acute respiratory acidosis',
          vignette: 'Found somnolent with shallow respirations. The teaching target is CO2 retention from inadequate ventilation.',
          answer: { ph: 'acidemia', primary: 'resp-acidosis', compensation: 'uncompensated', oxygen: 'auto', ag: 'not-indicated' },
          pearl: 'Respiratory acidosis is pH down with CO2 up. Acute cases have little HCO3 response because kidneys need time.',
        },
        ctx,
      );
    },
  },
  {
    id: 'chronic-resp-acidosis',
    minLevel: 2,
    title: 'COPD CO2 retention',
    vignette: 'Longstanding COPD with worsening dyspnea. Elevated bicarbonate shows the kidneys have been compensating.',
    generate(ctx) {
      const pco2 = rand(ctx.rng, 58, 82, 1);
      const hco3 = round(24 + 4 * ((pco2 - 40) / 10) + rand(ctx.rng, -1.5, 1.5, 1), 1);
      return buildCase(
        {
          pco2,
          hco3,
          ag: randInt(ctx.rng, 8, 12),
          fio2: 0.28,
          aa: rand(ctx.rng, 12, 24, 0),
          lactate: rand(ctx.rng, 0.8, 2.2, 1),
          glucose: randInt(ctx.rng, 90, 155),
          title: 'Chronic respiratory acidosis with metabolic compensation',
          vignette: 'Longstanding COPD with worsening dyspnea. Elevated bicarbonate shows the kidneys have been compensating.',
          answer: { ph: 'auto', primary: 'resp-acidosis', compensation: 'partial-or-full', oxygen: 'auto', ag: 'not-indicated' },
          pearl: 'CO2 is high and HCO3 is high. The high HCO3 is the kidney response. Use the pH side of 7.40 to decide how fully compensated it is.',
        },
        ctx,
      );
    },
  },
  {
    id: 'acute-resp-alkalosis',
    minLevel: 1,
    title: 'Hyperventilation pattern',
    vignette: 'Rapid breathing with tingling hands. The teaching target is CO2 washout from hyperventilation.',
    generate(ctx) {
      const pco2 = rand(ctx.rng, 20, 32, 1);
      const hco3 = round(24 - 2 * ((40 - pco2) / 10) + rand(ctx.rng, -0.8, 0.8, 1), 1);
      return buildCase(
        {
          pco2,
          hco3,
          ag: randInt(ctx.rng, 8, 12),
          fio2: 0.21,
          aa: rand(ctx.rng, 6, 12, 0),
          lactate: rand(ctx.rng, 0.7, 1.8, 1),
          glucose: randInt(ctx.rng, 82, 130),
          title: 'Acute respiratory alkalosis',
          vignette: 'Rapid breathing with tingling hands. The teaching target is CO2 washout from hyperventilation.',
          answer: { ph: 'alkalemia', primary: 'resp-alkalosis', compensation: 'uncompensated', oxygen: 'none', ag: 'not-indicated' },
          pearl: 'Respiratory alkalosis is pH up with CO2 down. In acute hyperventilation, HCO3 has not had time to fall much.',
        },
        ctx,
      );
    },
  },
  {
    id: 'metabolic-acidosis-agma',
    minLevel: 1,
    title: 'DKA or lactic acidosis pattern',
    vignette: 'Tachypneic patient with acid buildup. Intermediate mode adds the anion-gap story.',
    generate(ctx) {
      const hco3 = rand(ctx.rng, 6, 16, 1);
      const expected = 1.5 * hco3 + 8;
      return buildCase(
        {
          pco2: round(clamp(expected + rand(ctx.rng, -1.8, 1.8, 1), 10, 36), 1),
          hco3,
          ag: randInt(ctx.rng, 20, 34),
          fio2: 0.21,
          aa: rand(ctx.rng, 8, 18, 0),
          lactate: rand(ctx.rng, 2.5, 8.5, 1),
          glucose: ctx.rng.next() > 0.45 ? randInt(ctx.rng, 260, 560) : randInt(ctx.rng, 95, 190),
          title: 'High anion-gap metabolic acidosis with appropriate respiratory compensation',
          vignette: 'Tachypneic patient with acid buildup. Intermediate mode adds the anion-gap story.',
          answer: { ph: 'acidemia', primary: 'met-acidosis', compensation: 'partial', oxygen: 'auto', ag: 'high-ag' },
          pearl: "Metabolic acidosis is pH down with HCO3 down. Winter's formula checks whether the CO2 drop is appropriate compensation.",
        },
        ctx,
      );
    },
  },
  {
    id: 'metabolic-acidosis-nagma',
    minLevel: 3,
    title: 'Hyperchloremic metabolic acidosis',
    vignette: 'Profuse diarrhea or large-volume saline resuscitation. Chloride rises while bicarbonate falls.',
    generate(ctx) {
      const hco3 = rand(ctx.rng, 10, 18, 1);
      const expected = 1.5 * hco3 + 8;
      return buildCase(
        {
          pco2: round(clamp(expected + rand(ctx.rng, -1.5, 1.5, 1), 14, 38), 1),
          hco3,
          ag: randInt(ctx.rng, 8, 12),
          fio2: 0.21,
          aa: rand(ctx.rng, 8, 16, 0),
          lactate: rand(ctx.rng, 0.8, 2.0, 1),
          glucose: randInt(ctx.rng, 82, 135),
          forceClHigh: true,
          title: 'Normal anion-gap metabolic acidosis',
          vignette: 'Profuse diarrhea or large-volume saline resuscitation. Chloride rises while bicarbonate falls.',
          answer: { ph: 'acidemia', primary: 'met-acidosis', compensation: 'partial', oxygen: 'auto', ag: 'normal-ag' },
          pearl: 'Normal-gap metabolic acidosis usually means bicarbonate loss or chloride gain. Diarrhea and normal saline are the classic bedside causes.',
        },
        ctx,
      );
    },
  },
  {
    id: 'metabolic-alkalosis',
    minLevel: 1,
    title: 'Vomiting or NG suction',
    vignette: 'Several days of vomiting or gastric suction. Acid loss leaves bicarbonate high.',
    generate(ctx) {
      const hco3 = rand(ctx.rng, 30, 42, 1);
      const expected = 0.7 * (hco3 - 24) + 40;
      return buildCase(
        {
          pco2: round(clamp(expected + rand(ctx.rng, -2, 2, 1), 40, 58), 1),
          hco3,
          ag: randInt(ctx.rng, 8, 12),
          fio2: 0.21,
          aa: rand(ctx.rng, 8, 16, 0),
          lactate: rand(ctx.rng, 0.7, 1.8, 1),
          glucose: randInt(ctx.rng, 82, 130),
          kBase: rand(ctx.rng, 2.8, 3.6, 1),
          clBase: randInt(ctx.rng, 84, 96),
          title: 'Metabolic alkalosis with respiratory compensation',
          vignette: 'Several days of vomiting or gastric suction. Acid loss leaves bicarbonate high.',
          answer: { ph: 'alkalemia', primary: 'met-alkalosis', compensation: 'partial', oxygen: 'auto', ag: 'not-indicated' },
          pearl: 'Metabolic alkalosis is pH up with HCO3 up. The lungs may retain some CO2, but hypoxic drive limits how far CO2 can climb.',
        },
        ctx,
      );
    },
  },
  {
    id: 'mixed-acidosis',
    minLevel: 4,
    title: 'Shock plus ventilatory failure',
    vignette: 'Septic shock or arrest physiology with lactic acidosis and inadequate ventilation. Both systems push pH down.',
    generate: (ctx) =>
      buildCase(
        {
          pco2: rand(ctx.rng, 50, 76, 1),
          hco3: rand(ctx.rng, 9, 18, 1),
          ag: randInt(ctx.rng, 18, 32),
          fio2: 0.4,
          aa: rand(ctx.rng, 28, 62, 0),
          lactate: rand(ctx.rng, 5.0, 12.5, 1),
          glucose: randInt(ctx.rng, 130, 260),
          title: 'Mixed metabolic and respiratory acidosis',
          vignette: 'Septic shock or arrest physiology with lactic acidosis and inadequate ventilation. Both systems push pH down.',
          answer: { ph: 'acidemia', primary: 'mixed', compensation: 'mixed', oxygen: 'auto', ag: 'high-ag' },
          pearl: 'Mixed acidosis is the danger pattern: CO2 is high and HCO3 is low, so both respiratory and metabolic processes are driving pH down.',
        },
        ctx,
      ),
  },
  {
    id: 'salicylate-mixed',
    minLevel: 4,
    title: 'Salicylate-style mixed disorder',
    vignette: 'Tinnitus, tachypnea, nausea, and confusion. The pH can look deceptively normal while CO2 and HCO3 are both very low.',
    generate: (ctx) =>
      buildCase(
        {
          pco2: rand(ctx.rng, 18, 27, 1),
          hco3: rand(ctx.rng, 11, 17, 1),
          ag: randInt(ctx.rng, 18, 28),
          fio2: 0.21,
          aa: rand(ctx.rng, 10, 22, 0),
          lactate: rand(ctx.rng, 1.4, 3.4, 1),
          glucose: randInt(ctx.rng, 85, 155),
          title: 'Mixed respiratory alkalosis and metabolic acidosis',
          vignette: 'Tinnitus, tachypnea, nausea, and confusion. The pH can look deceptively normal while CO2 and HCO3 are both very low.',
          answer: { ph: 'auto', primary: 'mixed', compensation: 'mixed', oxygen: 'auto', ag: 'high-ag' },
          pearl: 'When CO2 and HCO3 are both low, do not automatically call it compensation. If the pH is near normal, two opposing disorders may be canceling each other out.',
        },
        ctx,
      ),
  },
  {
    id: 'agma-hidden-met-alk',
    minLevel: 4,
    title: 'DKA with vomiting: hidden metabolic alkalosis',
    vignette: 'Diabetic patient with ketones, glucose elevation, and two days of vomiting. The anion gap is high, but bicarbonate is not as low as expected.',
    generate: (ctx) =>
      buildCase(
        {
          pco2: rand(ctx.rng, 34, 42, 1),
          hco3: rand(ctx.rng, 17, 22, 1),
          ag: randInt(ctx.rng, 26, 34),
          fio2: 0.21,
          aa: rand(ctx.rng, 8, 18, 0),
          lactate: rand(ctx.rng, 1.4, 3.2, 1),
          glucose: randInt(ctx.rng, 330, 620),
          kBase: rand(ctx.rng, 3.0, 4.0, 1),
          title: 'High AG metabolic acidosis with hidden metabolic alkalosis',
          vignette: 'Diabetic patient with ketones, glucose elevation, and two days of vomiting. The anion gap is high, but bicarbonate is not as low as expected.',
          answer: {
            ph: 'auto',
            primary: 'met-acidosis',
            compensation: 'mixed',
            oxygen: 'auto',
            ag: 'high-ag',
            delta: 'hidden-met-alk',
            winter: 'appropriate',
            aa: 'auto',
            priority: 'fluids-insulin-k',
          },
          pearl: 'Delta ratio above 2 means the bicarbonate did not fall enough for the size of the anion gap. Vomiting or contraction alkalosis is propping it up.',
        },
        ctx,
      ),
  },
  {
    id: 'agma-hidden-nagma',
    minLevel: 4,
    title: 'Sepsis plus saline: AGMA with hidden NAGMA',
    vignette: 'Septic shock after large-volume normal saline. Lactate is elevated and chloride is high.',
    generate(ctx) {
      const hco3 = rand(ctx.rng, 8, 13, 1);
      const expected = 1.5 * hco3 + 8;
      return buildCase(
        {
          pco2: round(expected + rand(ctx.rng, -4, -2.2, 1), 1),
          hco3,
          ag: randInt(ctx.rng, 14, 18),
          fixedCl: randInt(ctx.rng, 112, 120),
          fio2: 0.3,
          aa: rand(ctx.rng, 20, 42, 0),
          lactate: rand(ctx.rng, 5.4, 10.8, 1),
          glucose: randInt(ctx.rng, 145, 260),
          title: 'Triple pattern: AGMA + NAGMA + respiratory alkalosis',
          vignette: 'Septic shock after large-volume normal saline. Lactate is elevated and chloride is high.',
          answer: {
            ph: 'acidemia',
            primary: 'mixed',
            compensation: 'mixed',
            oxygen: 'auto',
            ag: 'high-ag',
            delta: 'hidden-nagma',
            winter: 'resp-alkalosis',
            aa: 'elevated',
            priority: 'sepsis-bundle',
          },
          pearl: 'Low delta ratio catches the extra non-gap acidosis. Here the chloride load is not background noise; it is a second metabolic acidosis layered onto lactic acidosis.',
        },
        ctx,
      );
    },
  },
  {
    id: 'ards-permissive-hypercapnia',
    minLevel: 5,
    title: 'ARDS ventilator: permissive hypercapnia',
    vignette: 'Intubated ARDS patient on lung-protective ventilation. PaO2 remains low despite PEEP, and CO2 is intentionally elevated.',
    generate: (ctx) =>
      buildCase(
        {
          pco2: rand(ctx.rng, 58, 70, 1),
          hco3: rand(ctx.rng, 27, 31, 1),
          ag: randInt(ctx.rng, 8, 12),
          fio2: 0.6,
          aa: rand(ctx.rng, 150, 260, 0),
          lactate: rand(ctx.rng, 1.0, 2.4, 1),
          glucose: randInt(ctx.rng, 110, 190),
          title: 'ARDS: respiratory acidosis with severe oxygenation failure',
          vignette: 'Intubated ARDS patient on lung-protective ventilation. PaO2 remains low despite PEEP, and CO2 is intentionally elevated.',
          answer: {
            ph: 'auto',
            primary: 'resp-acidosis',
            compensation: 'partial',
            oxygen: 'auto',
            ag: 'not-indicated',
            delta: 'not-applicable',
            winter: 'not-applicable',
            aa: 'elevated',
            priority: 'peep-prone-fio2',
          },
          pearl: 'In ARDS, do not chase a normal CO2 by using injurious tidal volumes. If pH is acceptable, prioritize lung-protective ventilation and oxygenation strategy.',
        },
        ctx,
      ),
  },
  {
    id: 'vent-overventilated',
    minLevel: 5,
    title: 'Ventilator over-assist: respiratory alkalosis',
    vignette: 'Intubated patient after seizures resolved. Ventilator rate and tidal volume are still set high, and PaO2 is more than needed.',
    generate: (ctx) =>
      buildCase(
        {
          pco2: rand(ctx.rng, 20, 28, 1),
          hco3: rand(ctx.rng, 18, 22, 1),
          ag: randInt(ctx.rng, 8, 12),
          fio2: 0.5,
          aa: rand(ctx.rng, 14, 28, 0),
          lactate: rand(ctx.rng, 0.8, 2.0, 1),
          glucose: randInt(ctx.rng, 92, 155),
          title: 'Ventilator-driven respiratory alkalosis with hyperoxia',
          vignette: 'Intubated patient after seizures resolved. Ventilator rate and tidal volume are still set high, and PaO2 is more than needed.',
          answer: {
            ph: 'alkalemia',
            primary: 'resp-alkalosis',
            compensation: 'partial',
            oxygen: 'none',
            ag: 'not-indicated',
            delta: 'not-applicable',
            winter: 'not-applicable',
            aa: 'normal',
            priority: 'decrease-minute-vent',
          },
          pearl: 'CO2 is a ventilation problem. Lower excessive minute ventilation with rate and/or tidal volume changes; oxygen should be weaned separately.',
        },
        ctx,
      ),
  },
  {
    id: 'auto-peep-asthma',
    minLevel: 5,
    title: 'Obstructive ventilator trap: auto-PEEP',
    vignette: 'Intubated severe asthma/COPD patient with high pressures and dropping blood pressure. The rate is too fast for exhalation.',
    generate: (ctx) =>
      buildCase(
        {
          pco2: rand(ctx.rng, 68, 88, 1),
          hco3: rand(ctx.rng, 24, 28, 1),
          ag: randInt(ctx.rng, 8, 12),
          fio2: 0.5,
          aa: rand(ctx.rng, 28, 58, 0),
          lactate: rand(ctx.rng, 1.8, 4.4, 1),
          glucose: randInt(ctx.rng, 115, 220),
          title: 'Auto-PEEP with acute respiratory acidosis',
          vignette: 'Intubated severe asthma/COPD patient with high pressures and dropping blood pressure. The rate is too fast for exhalation.',
          answer: {
            ph: 'acidemia',
            primary: 'resp-acidosis',
            compensation: 'uncompensated',
            oxygen: 'auto',
            ag: 'not-indicated',
            delta: 'not-applicable',
            winter: 'not-applicable',
            aa: 'elevated',
            priority: 'reduce-rate-expiration',
          },
          pearl: 'The dangerous move is increasing the rate. Obstructive patients need low-and-slow ventilation, longer expiratory time, bronchodilators, and permissive hypercapnia.',
        },
        ctx,
      ),
  },
  {
    id: 'flight-altitude',
    minLevel: 5,
    title: 'Flight physiology: altitude hypoxemia',
    vignette: 'Critical-care transport at cabin altitude with unchanged FiO2. PaO2 drops as barometric pressure falls.',
    generate: (ctx) =>
      buildCase(
        {
          pco2: rand(ctx.rng, 38, 42, 1),
          hco3: rand(ctx.rng, 23, 25, 1),
          ag: randInt(ctx.rng, 8, 12),
          fio2: 0.4,
          aa: rand(ctx.rng, 65, 120, 0),
          lactate: rand(ctx.rng, 0.9, 2.4, 1),
          glucose: randInt(ctx.rng, 85, 165),
          title: 'Transport hypoxemia with elevated A-a gradient',
          vignette: 'Critical-care transport at cabin altitude with unchanged FiO2. PaO2 drops as barometric pressure falls.',
          answer: {
            ph: 'auto',
            primary: 'normal',
            compensation: 'normal',
            oxygen: 'auto',
            ag: 'not-indicated',
            delta: 'not-applicable',
            winter: 'not-applicable',
            aa: 'elevated',
            priority: 'increase-fio2-check-trapped-gas',
          },
          pearl: 'Altitude lowers inspired oxygen pressure. In transport, interpret PaO2 in context and look for trapped gas problems such as pneumothorax expansion.',
        },
        ctx,
      ),
  },
  {
    id: 'triple-dka-copd-vomiting',
    minLevel: 6,
    title: 'Triple disorder: DKA + vomiting + COPD',
    vignette: 'COPD baseline CO2 retainer arrives with DKA and intractable vomiting. The pH looks less dramatic than the disease burden.',
    generate: (ctx) =>
      buildCase(
        {
          pco2: rand(ctx.rng, 48, 58, 1),
          hco3: rand(ctx.rng, 20, 23, 1),
          ag: randInt(ctx.rng, 18, 26),
          fixedCl: randInt(ctx.rng, 88, 96),
          fio2: 0.28,
          aa: rand(ctx.rng, 24, 46, 0),
          lactate: rand(ctx.rng, 1.4, 3.4, 1),
          glucose: randInt(ctx.rng, 380, 620),
          kBase: rand(ctx.rng, 3.0, 3.8, 1),
          title: 'Triple disorder: AGMA + metabolic alkalosis + chronic respiratory acidosis',
          vignette: 'COPD baseline CO2 retainer arrives with DKA and intractable vomiting. The pH looks less dramatic than the disease burden.',
          answer: {
            ph: 'auto',
            primary: 'mixed',
            compensation: 'mixed',
            oxygen: 'auto',
            ag: 'high-ag',
            delta: 'hidden-met-alk',
            winter: 'resp-acidosis',
            aa: 'elevated',
            priority: 'fluids-insulin-k',
          },
          pearl: 'A normal-ish pH can be the most deceptive gas in the room. The anion gap exposes the DKA, delta exposes vomiting alkalosis, and the CO2 reflects chronic respiratory disease.',
        },
        ctx,
      ),
  },
  {
    id: 'post-arrest-master',
    minLevel: 6,
    title: 'Post-arrest master case: lactic acidosis plus ventilatory mismatch',
    vignette: 'ROSC after prolonged CPR, intubated on high FiO2. Lactate is massive, potassium is dangerous, and oxygen is excessive.',
    generate: (ctx) =>
      buildCase(
        {
          pco2: rand(ctx.rng, 26, 34, 1),
          hco3: rand(ctx.rng, 6.5, 9, 1),
          ag: randInt(ctx.rng, 26, 36),
          fio2: 1,
          aa: rand(ctx.rng, 170, 290, 0),
          lactate: rand(ctx.rng, 12.0, 18.0, 1),
          glucose: randInt(ctx.rng, 220, 390),
          fixedK: rand(ctx.rng, 6.0, 7.1, 1),
          title: 'Post-arrest mixed physiology with hyperoxia and hyperkalemia',
          vignette: 'ROSC after prolonged CPR, intubated on high FiO2. Lactate is massive, potassium is dangerous, and oxygen is excessive.',
          answer: {
            ph: 'acidemia',
            primary: 'met-acidosis',
            compensation: 'mixed',
            oxygen: 'none',
            ag: 'high-ag',
            delta: 'pure-agma',
            winter: 'resp-acidosis',
            aa: 'elevated',
            priority: 'post-rosc-bundle',
          },
          pearl: "Even when CO2 looks low, it may be too high for the degree of metabolic acidosis. Compare it to Winter's. Post-ROSC care also means avoiding hyperoxia and treating dangerous potassium.",
        },
        ctx,
      ),
  },
];

function chooseTemplate(level: BloodGasLevel, rng: Rng): BloodGasTemplate {
  const lvl = BLOOD_GAS_LEVEL_ORDER[level];
  const available = BLOOD_GAS_TEMPLATES.filter((t) => t.minLevel <= lvl);
  let focused = available;
  if (lvl >= 6) focused = BLOOD_GAS_TEMPLATES.filter((t) => t.minLevel >= 5 && t.minLevel <= lvl);
  else if (lvl === 5) focused = BLOOD_GAS_TEMPLATES.filter((t) => t.minLevel >= 4 && t.minLevel <= lvl);
  else if (lvl === 4) focused = BLOOD_GAS_TEMPLATES.filter((t) => t.minLevel >= 3 && t.minLevel <= lvl);
  else if (lvl === 3) focused = BLOOD_GAS_TEMPLATES.filter((t) => t.minLevel >= 2 && t.minLevel <= lvl);
  if (!focused.length) focused = available;
  return focused[randInt(rng, 0, focused.length - 1)]!;
}

export function generateBloodGasCase(input: {
  mode: BloodGasMode;
  level: BloodGasLevel;
  seed?: number;
}): DynamicBloodGasCase {
  const rng = makeRng(input.seed ?? Date.now());
  const template = chooseTemplate(input.level, rng);
  return template.generate({ mode: input.mode, level: input.level, rng });
}

export function visibleBloodGasQuestions(
  gasCase: DynamicBloodGasCase,
  level: BloodGasLevel,
): readonly BloodGasQuestionDef[] {
  const lvl = BLOOD_GAS_LEVEL_ORDER[level];
  return BLOOD_GAS_QUESTIONS.filter((q) => {
    if (q.minLevel > lvl) return false;
    if (q.id === 'winter') return gasCase.answer.winter !== 'not-applicable';
    if (q.id === 'delta') return gasCase.answer.delta !== 'not-applicable';
    return true;
  });
}

export function labelForBloodGasAnswer(id: BloodGasQuestionId, value: string): string {
  return BLOOD_GAS_LABELS[id]?.[value] ?? value;
}

export function evaluateBloodGasAnswers(
  gasCase: DynamicBloodGasCase,
  level: BloodGasLevel,
  selections: Partial<Record<BloodGasQuestionId, string>>,
): readonly BloodGasAnswerResult[] {
  return visibleBloodGasQuestions(gasCase, level).map((q) => {
    const selected = selections[q.id] ?? null;
    const correct = gasCase.answer[q.id];
    return {
      id: q.id,
      label: q.title,
      selected,
      correct,
      ok: selected === correct,
    };
  });
}

export function fullBloodGasInterpretation(gasCase: DynamicBloodGasCase, level: BloodGasLevel): string {
  const lvl = BLOOD_GAS_LEVEL_ORDER[level];
  const parts = [
    labelForBloodGasAnswer('primary', gasCase.answer.primary),
    labelForBloodGasAnswer('compensation', gasCase.answer.compensation),
    labelForBloodGasAnswer('oxygen', gasCase.answer.oxygen),
    lvl >= 3 ? labelForBloodGasAnswer('ag', gasCase.answer.ag) : null,
    lvl >= 4 && gasCase.answer.delta !== 'not-applicable'
      ? labelForBloodGasAnswer('delta', gasCase.answer.delta)
      : null,
    lvl >= 4 ? labelForBloodGasAnswer('aa', gasCase.answer.aa) : null,
    lvl >= 5 ? labelForBloodGasAnswer('priority', gasCase.answer.priority) : null,
  ].filter(Boolean);
  return parts.join('; ');
}

export function bloodGasTeachingBullets(gasCase: DynamicBloodGasCase, level: BloodGasLevel): readonly string[] {
  const p = gasCase.values;
  const ruleHco3 = arterializedHco3(gasCase.sample, p.HCO3);
  const winter = ruleHco3 < 22 ? expectedMetabolicAcidosisPco2(ruleHco3) : null;
  const metAlkExpected = ruleHco3 > 26 ? expectedMetabolicAlkalosisPco2(ruleHco3) : null;
  const pao2Calc = round(gasCase.fio2 * (760 - 47) - p.pCO2 / 0.8, 0);
  const aaText =
    gasCase.sample === 'ABG'
      ? Math.abs(gasCase.fio2 - 0.21) < 0.01
        ? `A-a = 150 - 1.25 x PaCO2 - PaO2 = ${p.Aa} mmHg on the simplified room-air equation.`
        : `A-a = PAO2 - PaO2. PAO2 = FiO2 x (760 - 47) - PaCO2/0.8 = ${pao2Calc}; A-a = ${p.Aa} mmHg.`
      : 'A-a gradient is not calculated from a VBG because venous oxygen values reflect tissue extraction, not lung oxygen transfer.';

  const bullets = [
    `pH ${p.pH.toFixed(2)} is ${labelForBloodGasAnswer('ph', gasCase.answer.ph)}. Primary check: CO2 ${p.pCO2.toFixed(
      1,
    )} is respiratory and HCO3 ${p.HCO3.toFixed(1)} is metabolic; the value driving the pH points to ${labelForBloodGasAnswer('primary', gasCase.answer.primary)}.`,
    compensationTeaching(gasCase, winter, metAlkExpected),
    `AG = Na - (Cl + HCO3) = ${p.Na} - (${p.Cl} + ${p.HCO3}) = ${p.AG}. ${agTeaching(gasCase)}`,
    `${aaText} ${oxygenTeaching(gasCase)}`,
  ];

  if (BLOOD_GAS_LEVEL_ORDER[level] >= 4 && gasCase.answer.winter !== 'not-applicable') {
    bullets.push(`Winter interpretation: ${labelForBloodGasAnswer('winter', gasCase.answer.winter)}.`);
  }
  if (BLOOD_GAS_LEVEL_ORDER[level] >= 4 && gasCase.answer.delta !== 'not-applicable') {
    const ratio = gasCase.values.deltaRatio ? ` Ratio ${gasCase.values.deltaRatio}.` : '';
    bullets.push(`Delta-delta: ${labelForBloodGasAnswer('delta', gasCase.answer.delta)}.${ratio}`);
  }
  if (BLOOD_GAS_LEVEL_ORDER[level] >= 4) {
    bullets.push(`A-a read: ${labelForBloodGasAnswer('aa', gasCase.answer.aa)}.`);
  }
  if (BLOOD_GAS_LEVEL_ORDER[level] >= 5) {
    bullets.push(`Clinical priority: ${labelForBloodGasAnswer('priority', gasCase.answer.priority)}.`);
  }
  bullets.push(gasCase.pearl);
  return bullets;
}

function compensationTeaching(
  gasCase: DynamicBloodGasCase,
  winter: ExpectedRange | null,
  metAlkExpected: ExpectedRange | null,
): string {
  if (gasCase.answer.compensation === 'mixed') {
    return 'This is mixed or inappropriate compensation. Compensation should be predictable; when the opposite system misses the expected range, assume a second process until proven otherwise.';
  }
  if (gasCase.answer.primary === 'met-acidosis' && winter !== null) {
    return `Winter's formula: expected CO2 = 1.5 x HCO3 + 8 = ${winter.expected} mmHg, range ${winter.low}-${winter.high}. Actual CO2 is ${gasCase.values.pCO2}.`;
  }
  if (gasCase.answer.primary === 'met-alkalosis' && metAlkExpected !== null) {
    return `Metabolic alkalosis compensation estimate: expected CO2 = ${metAlkExpected.expected} mmHg, range ${metAlkExpected.low}-${metAlkExpected.high}. Actual CO2 is ${gasCase.values.pCO2}.`;
  }
  if (gasCase.answer.primary === 'resp-alkalosis') {
    return 'Respiratory alkalosis starts with low CO2. Acute HCO3 falls slightly; chronic HCO3 falls more after renal compensation over days.';
  }
  if (gasCase.answer.primary === 'resp-acidosis') {
    return 'Respiratory acidosis starts with high CO2. Acute HCO3 rises slightly; chronic HCO3 rises more after renal compensation over days.';
  }
  return 'For compensation, name the primary problem first, then confirm the opposite system is moving in a direction that helps the pH.';
}

function agTeaching(gasCase: DynamicBloodGasCase): string {
  if (gasCase.answer.ag === 'high-ag') {
    const delta = gasCase.values.deltaRatio ? ` Delta ratio is ${gasCase.values.deltaRatio}.` : '';
    return `High anion gap means unmeasured acid is present.${delta}`;
  }
  if (gasCase.answer.ag === 'normal-ag') return 'Normal-gap acidosis points toward bicarbonate loss or chloride gain.';
  if (gasCase.answer.ag === 'low-ag') return 'Low anion gap is unusual in standard training and usually needs lab/context review.';
  return 'AG is shown for training, but it is not the main decision point unless metabolic acidosis or an advanced mixed pattern is present.';
}

function oxygenTeaching(gasCase: DynamicBloodGasCase): string {
  if (gasCase.answer.oxygen === 'vbg-na') return 'For VBG mode, classify acid-base, not oxygenation.';
  if (gasCase.answer.oxygen === 'none') return 'No hypoxia by the displayed arterial oxygen value.';
  return `${labelForBloodGasAnswer('oxygen', gasCase.answer.oxygen)} is present. Oxygenation is separate from acid-base.`;
}

function flagFor(value: number, range: readonly [number, number]): BloodGasValue['flag'] {
  if (value < range[0]) return value < range[0] * 0.8 ? 'LL' : 'L';
  if (value > range[1]) return value > range[1] * 1.25 ? 'HH' : 'H';
  return '';
}

export function dynamicCaseToBloodGasValues(gasCase: DynamicBloodGasCase): readonly BloodGasValue[] {
  const v = gasCase.values;
  const sampleRefs = REFS[gasCase.sample];
  const shared = REFS.shared;
  return [
    { name: 'pH', value: v.pH.toFixed(2), unit: '', ref: `${sampleRefs.pH[0]}-${sampleRefs.pH[1]}`, flag: flagFor(v.pH, sampleRefs.pH) },
    { name: gasCase.labels.co2, value: v.pCO2.toFixed(1), unit: 'mmHg', ref: `${sampleRefs.pCO2[0]}-${sampleRefs.pCO2[1]}`, flag: flagFor(v.pCO2, sampleRefs.pCO2) },
    { name: gasCase.labels.o2, value: String(Math.round(v.pO2)), unit: 'mmHg', ref: `${sampleRefs.pO2[0]}-${sampleRefs.pO2[1]}`, flag: flagFor(v.pO2, sampleRefs.pO2) },
    { name: 'TCO2', value: String(Math.round(v.TCO2)), unit: 'mmol/L', ref: '23-27', flag: flagFor(v.TCO2, [23, 27]) },
    { name: 'HCO3', value: v.HCO3.toFixed(1), unit: 'mEq/L', ref: `${sampleRefs.HCO3[0]}-${sampleRefs.HCO3[1]}`, flag: flagFor(v.HCO3, sampleRefs.HCO3) },
    { name: 'BEecf', value: v.BEecf > 0 ? `+${v.BEecf.toFixed(1)}` : v.BEecf.toFixed(1), unit: 'mEq/L', ref: '-2 to +2', flag: flagFor(v.BEecf, shared.BEecf) },
    { name: gasCase.labels.sat, value: String(Math.round(v.sO2)), unit: '%', ref: `${sampleRefs.sO2[0]}-${sampleRefs.sO2[1]}`, flag: flagFor(v.sO2, sampleRefs.sO2) },
    { name: 'Na+', value: String(Math.round(v.Na)), unit: 'mEq/L', ref: '136-145', flag: flagFor(v.Na, shared.Na) },
    { name: 'K+', value: v.K.toFixed(1), unit: 'mEq/L', ref: '3.5-5.0', flag: flagFor(v.K, shared.K) },
    { name: 'Cl-', value: String(Math.round(v.Cl)), unit: 'mEq/L', ref: '98-106', flag: flagFor(v.Cl, shared.Cl) },
    { name: 'iCa', value: v.iCa.toFixed(2), unit: 'mmol/L', ref: '1.12-1.32', flag: flagFor(v.iCa, shared.iCa) },
    { name: 'Glu', value: String(Math.round(v.Glu)), unit: 'mg/dL', ref: '70-110', flag: flagFor(v.Glu, shared.Glu) },
    { name: 'Lac', value: v.Lac.toFixed(1), unit: 'mmol/L', ref: '0.5-2.0', flag: flagFor(v.Lac, shared.Lac) },
    { name: 'Hct', value: String(Math.round(v.Hct)), unit: '%PCV', ref: '36-48', flag: flagFor(v.Hct, [36, 48]) },
    { name: 'Hgb', value: v.Hgb.toFixed(1), unit: 'g/dL', ref: '12.0-17.0', flag: flagFor(v.Hgb, shared.Hgb) },
    { name: 'AG', value: String(Math.round(v.AG)), unit: 'mEq/L', ref: '8-12', flag: flagFor(v.AG, [8, 12]) },
    { name: 'A-a', value: v.Aa === null ? 'N/A' : String(Math.round(v.Aa)), unit: 'mmHg', ref: 'context', flag: v.Aa !== null && v.Aa > 20 ? 'H' : '' },
  ];
}
