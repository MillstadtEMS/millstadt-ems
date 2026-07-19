import type { ActualFinancialConnectionStatus } from "./types";

export function getSageConnectionStatus(): ActualFinancialConnectionStatus {
  return { status: "Not Connected", source: "Sage API" };
}
