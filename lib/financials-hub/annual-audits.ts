export type PendingAnnualAudit = {
  id: string;
  year: number;
  title: string;
  periodLabel: string;
  statusLabel: string;
  message: string;
  searchText: string;
};

export const ANNUAL_AUDIT_NOTE = "Reports are provided in full as issued, including any prior-year comparative figures.";

export const PENDING_ANNUAL_AUDITS: readonly PendingAnnualAudit[] = [
  {
    id: "annual-audit-fy-2025-2026",
    year: 2026,
    title: "Annual Audit — FY 2025–2026",
    periodLabel: "May 1, 2025 through April 30, 2026",
    statusLabel: "Awaiting audit completion",
    message: "The audit will be posted after completion and delivery.",
    searchText: "Annual Audits Annual Audit FY 2025-2026 FY 25-26 May 1 2025 April 30 2026 Operational Pending Awaiting audit completion The audit will be posted after completion and delivery.",
  },
];
