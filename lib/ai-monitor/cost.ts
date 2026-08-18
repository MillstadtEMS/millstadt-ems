const LUNA_INPUT_MICRODOLLARS_PER_TOKEN = 0.2;
const LUNA_OUTPUT_MICRODOLLARS_PER_TOKEN = 1.2;

export function estimateAiMonitorCostMicros(inputTokens: number, outputTokens: number) {
  const safeInput = Math.max(0, Math.floor(inputTokens));
  const safeOutput = Math.max(0, Math.floor(outputTokens));
  return Math.ceil(
    safeInput * LUNA_INPUT_MICRODOLLARS_PER_TOKEN +
      safeOutput * LUNA_OUTPUT_MICRODOLLARS_PER_TOKEN,
  );
}

export function dollarsToMicros(dollars: number) {
  return Math.floor(Math.max(0, dollars) * 1_000_000);
}

export function microsToDollars(micros: number) {
  return Math.max(0, micros) / 1_000_000;
}

export const MAX_RESERVED_RUN_COST_MICROS = 20_000;
