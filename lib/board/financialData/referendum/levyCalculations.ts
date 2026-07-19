import type { LevyScenario, ReferendumCalculationResult, ReferendumModelInput } from "./modelTypes";

export const MODELED_LEVY_RATES = [0.20, 0.25, 0.30, 0.35, 0.40] as const;

export function projectedLevyRevenue(eav: number, ratePercent: number): number {
  return eav * (ratePercent / 100);
}

export function estimatedAnnualTaxImpact(propertyMarketValue: number, ratePercent: number): number {
  return (propertyMarketValue / 3) * (ratePercent / 100);
}

export function requiredLevyRatePercent(requiredRevenue: number, eav: number): number {
  if (eav <= 0) return 0;
  return (requiredRevenue / eav) * 100;
}

export function buildLevyScenario(eav: number, ratePercent: number, requiredRevenue: number, totalProjectedAnnualNeed = requiredRevenue): LevyScenario {
  const revenue = projectedLevyRevenue(eav, ratePercent);
  const fundingMarginOrGap = revenue - requiredRevenue;
  return {
    ratePercent,
    projectedLevyRevenue: revenue,
    totalProjectedAnnualNeed,
    fundingMarginOrGap,
    result: fundingMarginOrGap >= 0 ? "Fully Funds Projected Model" : "Does Not Fully Fund Projected Model",
  };
}

export function calculateReferendum(input: ReferendumModelInput): ReferendumCalculationResult {
  const scenario = buildLevyScenario(input.eav, input.selectedLevyRatePercent, input.requiredRevenue, input.totalProjectedAnnualNeed);
  return {
    ...scenario,
    totalProjectedAnnualNeed: input.totalProjectedAnnualNeed,
    currentLevyRevenue: input.currentLevyRevenue,
    revenueIncrease: scenario.projectedLevyRevenue - input.currentLevyRevenue,
    requiredRevenue: input.requiredRevenue,
    requiredLevyRatePercent: requiredLevyRatePercent(input.requiredRevenue, input.eav),
    estimatedAnnualTaxImpact: estimatedAnnualTaxImpact(input.propertyMarketValue, input.selectedLevyRatePercent),
  };
}
