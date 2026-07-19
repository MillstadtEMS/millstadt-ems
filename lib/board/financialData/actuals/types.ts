export interface ActualFinancialConnectionStatus {
  status: "Not Connected" | "Configuration Required" | "Connected" | "Synchronization Error";
  source: "Sage API" | "Verified Sage Export" | "Verified Workbook" | "Not Configured";
}
