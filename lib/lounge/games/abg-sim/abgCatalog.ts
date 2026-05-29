import type {
  BloodGasCase,
  BloodGasEvidenceReference,
  BloodGasMasteryTier,
  BloodGasValue,
} from './abgTypes';

export const ABG_INTERPRETATION_REFERENCE: BloodGasEvidenceReference = {
  id: 'acid-base-nejm-2014',
  citation:
    'Berend K, de Vries APJ, Gans ROB. Physiological Approach to Assessment of Acid-Base Disturbances. N Engl J Med. 2014;371:1434-1445.',
  relevance:
    'Supports systematic acid-base interpretation using pH, primary disorder, expected compensation, and mixed-disorder checks.',
};

export const METABOLIC_ACIDOSIS_REFERENCE: BloodGasEvidenceReference = {
  id: 'metabolic-acidosis-nat-rev-2010',
  citation:
    'Kraut JA, Madias NE. Metabolic Acidosis: Pathophysiology, Diagnosis and Management. Nat Rev Nephrol. 2010;6:274-285.',
  relevance:
    'Supports high anion-gap metabolic acidosis interpretation and expected respiratory compensation checks.',
};

export const VENOUS_GAS_REFERENCE: BloodGasEvidenceReference = {
  id: 'vbg-emergency-review-2010',
  citation:
    'Kelly AM. Review Article: Can Venous Blood Gas Analysis Replace Arterial in Emergency Medical Care. Emerg Med Australas. 2010;22:493-498.',
  relevance:
    'Supports teaching VBG interpretation as a related but distinct sample type with different reference ranges.',
};

const value = (
  name: string,
  valueText: string,
  unit: string,
  ref: string,
  flag: BloodGasValue['flag'] = '',
): BloodGasValue => ({
  name,
  value: valueText,
  unit,
  ref,
  flag,
});

export const BLOOD_GAS_CASES: readonly BloodGasCase[] = [
  {
    id: 'abg.copd-chronic-respiratory-acidosis',
    sample: 'ABG',
    patient: 'GREEN, ALICE - 67F',
    mrn: '0451-A',
    tempC: '37.0',
    fio2: '0.28',
    cartridge: 'CG8+',
    context: 'COPD exacerbation - shortness of breath - accessory muscle use',
    values: [
      value('pH', '7.28', '', '7.35-7.45', 'LL'),
      value('pCO2', '68.0', 'mmHg', '35-45', 'H'),
      value('pO2', '54', 'mmHg', '80-100', 'LL'),
      value('HCO3', '31.0', 'mEq/L', '22-26', 'H'),
      value('BEecf', '+3.0', 'mEq/L', '-2 to +2', 'H'),
      value('sO2', '86', '%', '95-100', 'L'),
      value('Na+', '140', 'mEq/L', '136-145'),
      value('K+', '4.3', 'mEq/L', '3.5-5.0'),
      value('Cl-', '101', 'mEq/L', '98-106'),
      value('iCa', '1.21', 'mmol/L', '1.12-1.32'),
      value('Glu', '108', 'mg/dL', '70-110'),
      value('Lac', '1.8', 'mmol/L', '0.5-2.0'),
      value('Hgb', '14.4', 'g/dL', '12.0-17.0'),
    ],
    question: 'Interpret this arterial blood gas:',
    choices: [
      { id: 'acute-resp-acidosis', label: 'Acute respiratory acidosis, uncompensated' },
      { id: 'chronic-resp-acidosis-partial', label: 'Chronic respiratory acidosis, partially compensated', correct: true },
      { id: 'metabolic-alk-comp', label: 'Metabolic alkalosis with respiratory compensation' },
      { id: 'mixed-met-resp-acidosis', label: 'Mixed metabolic and respiratory acidosis' },
    ],
    teachingPoint:
      'pH is low, pCO2 is high, and HCO3 is high. The kidneys are retaining bicarbonate to buffer chronic CO2 retention, which is the classic COPD pattern.',
    evidenceRefs: [ABG_INTERPRETATION_REFERENCE],
  },
  {
    id: 'abg.dka-high-anion-gap-acidosis',
    sample: 'ABG',
    patient: 'TORRES, MIGUEL - 24M',
    mrn: '0452-B',
    tempC: '37.4',
    fio2: '0.21',
    cartridge: 'CG8+',
    context: 'New DKA - Kussmaul breathing - glucose 510',
    values: [
      value('pH', '7.16', '', '7.35-7.45', 'LL'),
      value('pCO2', '20.0', 'mmHg', '35-45', 'L'),
      value('pO2', '102', 'mmHg', '80-100', 'H'),
      value('HCO3', '8.2', 'mEq/L', '22-26', 'LL'),
      value('BEecf', '-19.0', 'mEq/L', '-2 to +2', 'LL'),
      value('sO2', '98', '%', '95-100'),
      value('Na+', '136', 'mEq/L', '136-145'),
      value('K+', '5.6', 'mEq/L', '3.5-5.0', 'H'),
      value('Cl-', '101', 'mEq/L', '98-106'),
      value('iCa', '1.14', 'mmol/L', '1.12-1.32'),
      value('Glu', '512', 'mg/dL', '70-110', 'H'),
      value('Lac', '3.8', 'mmol/L', '0.5-2.0', 'H'),
      value('Hgb', '15.1', 'g/dL', '12.0-17.0'),
    ],
    question: 'Best interpretation?',
    choices: [
      { id: 'uncompensated-met-acidosis', label: 'Uncompensated metabolic acidosis' },
      { id: 'hagma-resp-comp', label: 'High anion-gap metabolic acidosis with respiratory compensation', correct: true },
      { id: 'mixed-alkalosis', label: 'Mixed respiratory and metabolic alkalosis' },
      { id: 'normal-gap-acidosis', label: 'Normal anion-gap acidosis' },
    ],
    teachingPoint:
      'The anion gap is high, HCO3 is very low, and pCO2 is appropriately low by Winters formula. This is ketoacid-driven high anion-gap metabolic acidosis with respiratory compensation.',
    evidenceRefs: [ABG_INTERPRETATION_REFERENCE, METABOLIC_ACIDOSIS_REFERENCE],
  },
  {
    id: 'vbg.anxiety-acute-respiratory-alkalosis',
    sample: 'VBG',
    patient: 'BENNETT, ROSA - 41F',
    mrn: '0453-C',
    tempC: '36.8',
    fio2: '0.21',
    cartridge: 'CG8+',
    context: 'Anxiety attack - tingling - carpopedal spasm',
    values: [
      value('pH', '7.54', '', '7.31-7.41', 'H'),
      value('pCO2', '24.0', 'mmHg', '40-50', 'L'),
      value('PvO2', '52', 'mmHg', '30-50', 'H'),
      value('HCO3', '21.0', 'mEq/L', '23-27', 'L'),
      value('BEecf', '-1.0', 'mEq/L', '-2 to +2'),
      value('sO2', '78', '%', '60-80'),
      value('Na+', '139', 'mEq/L', '136-145'),
      value('K+', '3.4', 'mEq/L', '3.5-5.0', 'L'),
      value('Cl-', '104', 'mEq/L', '98-106'),
      value('iCa', '1.08', 'mmol/L', '1.12-1.32', 'L'),
      value('Glu', '94', 'mg/dL', '70-110'),
      value('Lac', '1.4', 'mmol/L', '0.5-2.0'),
      value('Hgb', '13.1', 'g/dL', '12.0-17.0'),
    ],
    question: 'Most likely interpretation?',
    choices: [
      { id: 'acute-resp-alkalosis', label: 'Acute respiratory alkalosis', correct: true },
      { id: 'chronic-met-alkalosis', label: 'Chronic metabolic alkalosis' },
      { id: 'mixed-alkalosis', label: 'Mixed alkalosis' },
      { id: 'resp-acidosis', label: 'Respiratory acidosis' },
    ],
    teachingPoint:
      'Hyperventilation blows off CO2, so pH rises and pCO2 falls. HCO3 is near normal because there has not been time for renal compensation.',
    evidenceRefs: [ABG_INTERPRETATION_REFERENCE, VENOUS_GAS_REFERENCE],
  },
  {
    id: 'abg.septic-shock-mixed-acidosis',
    sample: 'ABG',
    patient: 'OKAFOR, JAMES - 58M',
    mrn: '0454-D',
    tempC: '38.1',
    fio2: '0.40',
    cartridge: 'CG8+',
    context: 'Septic shock - pressors started - lactate rising',
    values: [
      value('pH', '7.21', '', '7.35-7.45', 'L'),
      value('pCO2', '48.0', 'mmHg', '35-45', 'H'),
      value('pO2', '72', 'mmHg', '80-100', 'L'),
      value('HCO3', '18.0', 'mEq/L', '22-26', 'L'),
      value('BEecf', '-9.0', 'mEq/L', '-2 to +2', 'L'),
      value('sO2', '94', '%', '95-100', 'L'),
      value('Na+', '138', 'mEq/L', '136-145'),
      value('K+', '4.7', 'mEq/L', '3.5-5.0'),
      value('Cl-', '102', 'mEq/L', '98-106'),
      value('iCa', '1.10', 'mmol/L', '1.12-1.32', 'L'),
      value('Glu', '162', 'mg/dL', '70-110', 'H'),
      value('Lac', '6.8', 'mmol/L', '0.5-2.0', 'HH'),
      value('Hgb', '10.4', 'g/dL', '12.0-17.0', 'L'),
    ],
    question: 'Best fit:',
    choices: [
      { id: 'pure-met-acidosis', label: 'Pure metabolic acidosis' },
      { id: 'pure-resp-acidosis', label: 'Pure respiratory acidosis' },
      { id: 'mixed-met-resp-acidosis', label: 'Mixed metabolic and respiratory acidosis', correct: true },
      { id: 'met-acidosis-full-comp', label: 'Metabolic acidosis with full compensation' },
    ],
    teachingPoint:
      'HCO3 is low from lactic acidosis. Winters formula predicts a much lower pCO2 than 48, so ventilation is inadequate too. That makes this a mixed metabolic and respiratory acidosis.',
    evidenceRefs: [ABG_INTERPRETATION_REFERENCE, METABOLIC_ACIDOSIS_REFERENCE],
  },
  {
    id: 'abg.vomiting-metabolic-alkalosis',
    sample: 'ABG',
    patient: 'PARK, LINDA - 72F',
    mrn: '0455-E',
    tempC: '37.0',
    fio2: '0.24',
    cartridge: 'CG8+',
    context: 'Persistent vomiting for 5 days - NGT decompression',
    values: [
      value('pH', '7.54', '', '7.35-7.45', 'H'),
      value('pCO2', '48.0', 'mmHg', '35-45', 'H'),
      value('pO2', '88', 'mmHg', '80-100'),
      value('HCO3', '38.0', 'mEq/L', '22-26', 'H'),
      value('BEecf', '+14.0', 'mEq/L', '-2 to +2', 'HH'),
      value('sO2', '96', '%', '95-100'),
      value('Na+', '142', 'mEq/L', '136-145'),
      value('K+', '3.1', 'mEq/L', '3.5-5.0', 'L'),
      value('Cl-', '88', 'mEq/L', '98-106', 'L'),
      value('iCa', '1.16', 'mmol/L', '1.12-1.32'),
      value('Glu', '102', 'mg/dL', '70-110'),
      value('Lac', '1.6', 'mmol/L', '0.5-2.0'),
      value('Hgb', '12.7', 'g/dL', '12.0-17.0'),
    ],
    question: 'This pattern represents:',
    choices: [
      { id: 'acute-resp-alkalosis', label: 'Acute respiratory alkalosis' },
      { id: 'met-alk-resp-comp', label: 'Metabolic alkalosis with respiratory compensation', correct: true },
      { id: 'mixed-alkalosis', label: 'Mixed alkalosis' },
      { id: 'comp-resp-acidosis', label: 'Compensated respiratory acidosis' },
    ],
    teachingPoint:
      'Loss of gastric HCl raises bicarbonate and produces hypochloremia and hypokalemia. The lungs hypoventilate, raising pCO2 to buffer the alkalosis.',
    evidenceRefs: [ABG_INTERPRETATION_REFERENCE],
  },
];

export const BLOOD_GAS_MASTERY_TIERS: readonly BloodGasMasteryTier[] = [
  {
    id: 'tier-01-sample-runner',
    label: 'Sample Runner',
    minCorrect: 0,
    minPercent: 0,
    badge: 'SR',
    description: 'Can identify the blood gas as ABG or VBG and read the printed panel without freezing.',
  },
  {
    id: 'tier-02-ph-spotter',
    label: 'pH Spotter',
    minCorrect: 1,
    minPercent: 20,
    badge: 'PH',
    description: 'Starts every interpretation with acidosis, alkalosis, or normal pH.',
  },
  {
    id: 'tier-03-primary-disorder',
    label: 'Primary Disorder',
    minCorrect: 2,
    minPercent: 40,
    badge: 'PD',
    description: 'Can separate respiratory from metabolic primary problems.',
  },
  {
    id: 'tier-04-compensation-check',
    label: 'Compensation Check',
    minCorrect: 3,
    minPercent: 60,
    badge: 'CC',
    description: 'Checks whether the compensatory response fits the primary disorder.',
  },
  {
    id: 'tier-05-gap-hunter',
    label: 'Gap Hunter',
    minCorrect: 3,
    minPercent: 70,
    badge: 'AG',
    description: 'Recognizes high anion-gap patterns and flags mixed disorders.',
  },
  {
    id: 'tier-06-mixed-disorder',
    label: 'Mixed Disorder',
    minCorrect: 4,
    minPercent: 80,
    badge: 'MX',
    description: 'Catches the second hit when compensation is wrong.',
  },
  {
    id: 'tier-07-istat-pro',
    label: 'i-Lab Pro',
    minCorrect: 5,
    minPercent: 90,
    badge: 'IL',
    description: 'Interprets full point-of-care panels cleanly under time pressure.',
  },
  {
    id: 'tier-08-abg-master',
    label: 'ABG Master',
    minCorrect: 5,
    minPercent: 100,
    badge: 'AM',
    description: 'Perfect run: pH, primary disorder, compensation, gap, and clinical context all locked in.',
  },
];

export function getBloodGasCase(id: string): BloodGasCase | undefined {
  return BLOOD_GAS_CASES.find((gasCase) => gasCase.id === id);
}
