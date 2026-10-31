export type PendingAnnualAudit = {
  id: string;
  year: number;
  title: string;
  periodLabel: string;
  statusLabel: string;
  message: string;
  searchText: string;
};

export const ANNUAL_AUDIT_NOTE = "Reports are provided in full, including any prior-year comparative figures. Draft reports are clearly marked and are not final.";

export const PENDING_ANNUAL_AUDITS: readonly PendingAnnualAudit[] = [];
