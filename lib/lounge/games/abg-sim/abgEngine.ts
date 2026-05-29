import { BLOOD_GAS_CASES, BLOOD_GAS_MASTERY_TIERS } from './abgCatalog';
import type { BloodGasCase, BloodGasRunState } from './abgTypes';

export function startBloodGasRun(): BloodGasRunState {
  return {
    caseIndex: 0,
    right: 0,
    wrong: 0,
    streak: 0,
    selectedChoiceId: null,
    answeredChoiceId: null,
    completed: BLOOD_GAS_CASES.length === 0,
  };
}

export function currentBloodGasCase(
  state: BloodGasRunState,
  cases: readonly BloodGasCase[] = BLOOD_GAS_CASES,
): BloodGasCase | null {
  if (state.completed) return null;
  return cases[state.caseIndex] ?? null;
}

export function correctChoiceForCase(gasCase: BloodGasCase) {
  return gasCase.choices.find((choice) => choice.correct);
}

export function selectBloodGasChoice(state: BloodGasRunState, choiceId: string): BloodGasRunState {
  if (state.answeredChoiceId !== null || state.completed) return state;
  return {
    ...state,
    selectedChoiceId: choiceId,
  };
}

export function submitBloodGasChoice(
  state: BloodGasRunState,
  gasCase: BloodGasCase,
): BloodGasRunState {
  if (state.completed || state.answeredChoiceId !== null || state.selectedChoiceId === null) {
    return state;
  }

  const selected = gasCase.choices.find((choice) => choice.id === state.selectedChoiceId);
  const isCorrect = selected?.correct === true;

  return {
    ...state,
    answeredChoiceId: state.selectedChoiceId,
    right: state.right + (isCorrect ? 1 : 0),
    wrong: state.wrong + (isCorrect ? 0 : 1),
    streak: isCorrect ? state.streak + 1 : 0,
  };
}

export function advanceBloodGasCase(
  state: BloodGasRunState,
  cases: readonly BloodGasCase[] = BLOOD_GAS_CASES,
): BloodGasRunState {
  if (state.answeredChoiceId === null) return state;

  const nextIndex = state.caseIndex + 1;
  if (nextIndex >= cases.length) {
    return {
      ...state,
      completed: true,
      caseIndex: cases.length,
      selectedChoiceId: null,
      answeredChoiceId: null,
    };
  }

  return {
    ...state,
    caseIndex: nextIndex,
    selectedChoiceId: null,
    answeredChoiceId: null,
  };
}

export function bloodGasScorePercent(state: Pick<BloodGasRunState, 'right' | 'wrong'>): number {
  const total = state.right + state.wrong;
  if (total === 0) return 0;
  return Math.round((state.right / total) * 100);
}

export function bloodGasMasteryTierForState(state: Pick<BloodGasRunState, 'right' | 'wrong'>) {
  const percent = bloodGasScorePercent(state);
  let tier = BLOOD_GAS_MASTERY_TIERS[0]!;
  for (const candidate of BLOOD_GAS_MASTERY_TIERS) {
    if (state.right >= candidate.minCorrect && percent >= candidate.minPercent) {
      tier = candidate;
    }
  }
  return tier;
}
