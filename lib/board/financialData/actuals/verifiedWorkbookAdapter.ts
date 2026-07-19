import type { ActualFinancialConnectionStatus } from "./types";

export function getVerifiedWorkbookConnectionStatus(): ActualFinancialConnectionStatus {
  return { status: "Future Feature", source: "Verified Workbook" };
}
