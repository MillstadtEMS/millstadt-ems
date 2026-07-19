export interface ActualFinancialConnectionStatus {
  status: "Future Feature" | "Configuration Required" | "Connected" | "Synchronization Error";
  source: "Sage API" | "Verified Sage Export" | "Verified Workbook" | "Not Configured";
}
