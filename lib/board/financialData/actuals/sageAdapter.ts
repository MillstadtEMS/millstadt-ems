import type { ActualFinancialConnectionStatus } from "./types";

export function getSageConnectionStatus(): ActualFinancialConnectionStatus {
  return { status: "Future Feature", source: "Sage API" };
}
