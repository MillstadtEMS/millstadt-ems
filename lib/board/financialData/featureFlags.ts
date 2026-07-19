export function actualFinancialsEnabled(): boolean {
  return process.env.ENABLE_ACTUAL_FINANCIALS === "true";
}

export function actualCashFlowEnabled(): boolean {
  return process.env.ENABLE_ACTUAL_CASH_FLOW === "true";
}
