export type BloodGasSampleType = 'ABG' | 'VBG';
export type BloodGasFlag = '' | 'L' | 'H' | 'LL' | 'HH';

export interface BloodGasValue {
  name: string;
  value: string;
  unit: string;
  ref: string;
  flag: BloodGasFlag;
}

export interface BloodGasChoice {
  id: string;
  label: string;
  correct?: boolean;
}

export interface BloodGasEvidenceReference {
  id: string;
  citation: string;
  relevance: string;
}

export interface BloodGasCase {
  id: string;
  sample: BloodGasSampleType;
  patient: string;
  mrn: string;
  tempC: string;
  fio2: string;
  cartridge: string;
  context: string;
  values: readonly BloodGasValue[];
  question: string;
  choices: readonly BloodGasChoice[];
  teachingPoint: string;
  evidenceRefs: readonly BloodGasEvidenceReference[];
}

export interface BloodGasMasteryTier {
  id: string;
  label: string;
  minCorrect: number;
  minPercent: number;
  badge: string;
  description: string;
}

export interface BloodGasRunState {
  caseIndex: number;
  right: number;
  wrong: number;
  streak: number;
  selectedChoiceId: string | null;
  answeredChoiceId: string | null;
  completed: boolean;
}
