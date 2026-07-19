import { actualFinancialsEnabled } from "../featureFlags";
import type { ActualFinancialConnectionStatus } from "./types";

export function getActualFinancialConnectionStatus(): ActualFinancialConnectionStatus {
  if (!actualFinancialsEnabled()) return { status: "Not Connected", source: "Not Configured" };
  return { status: "Configuration Required", source: "Not Configured" };
}
