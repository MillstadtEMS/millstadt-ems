export type PendingAnnualAudit = {
  id: string;
  year: number;
  title: string;
  periodLabel: string;
  statusLabel: string;
  message: string;
  searchText: string;
};

export const ANNUAL_AUDIT_NOTE = "Reports are provided in full as issued and include prior-year comparative figures.";

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
  {
    id: "annual-audit-fy-2024-2025",
    year: 2025,
    title: "Annual Audit — FY 2024–2025",
    periodLabel: "May 1, 2024 through April 30, 2025",
    statusLabel: "Awaiting finalization and delivery",
    message: "The audit will be posted once the finalized report is received.",
    searchText: "Annual Audits Annual Audit FY 2024-2025 FY 24-25 May 1 2024 April 30 2025 Operational Pending Awaiting finalization and delivery The audit will be posted once the finalized report is received.",
  },
];
