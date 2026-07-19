import type { ActualFinancialConnectionStatus } from "./types";

export function getVerifiedWorkbookConnectionStatus(): ActualFinancialConnectionStatus {
  return { status: "Not Connected", source: "Verified Workbook" };
}
