export interface ReferendumModelInput {
  eav: number;
  selectedLevyRatePercent: number;
  propertyMarketValue: number;
  totalProjectedAnnualNeed: number;
  currentLevyRevenue: number;
  requiredRevenue: number;
}

export interface LevyScenario {
  ratePercent: number;
  projectedLevyRevenue: number;
  totalProjectedAnnualNeed: number;
  fundingMarginOrGap: number;
  result: "Fully Funds Projected Model" | "Does Not Fully Fund Projected Model";
}

export interface ReferendumCalculationResult extends LevyScenario {
  currentLevyRevenue: number;
  revenueIncrease: number;
  requiredRevenue: number;
  requiredLevyRatePercent: number;
  estimatedAnnualTaxImpact: number;
}
