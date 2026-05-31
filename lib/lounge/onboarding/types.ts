/**
 * Shared types for the EMS onboarding checklist module.
 *
 * The system supports three layers:
 *  1. A single global template (sections → items) that admins edit.
 *  2. Per-employee onboarding records that snapshot the template into
 *     per-item progress rows + signatures + final outcome.
 *  3. A finalize step that produces a PDF and (optionally) a personnel
 *     record + attachment for the file.
 */

export type ItemStatus =
  | "pending"
  | "completed"
  | "completed_with_followup"
  | "not_applicable"
  | "not_met";

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  pending: "Pending",
  completed: "Completed",
  completed_with_followup: "Completed with follow-up required",
  not_applicable: "Not applicable",
  not_met: "Requirement not met",
};

export type FinalOutcome =
  | "cleared"
  | "cleared_with_restrictions"
  | "not_cleared"
  | "discontinued"
  | "admin_review";

export const FINAL_OUTCOME_LABELS: Record<FinalOutcome, string> = {
  cleared: "Cleared for duty",
  cleared_with_restrictions: "Cleared for duty with restrictions / follow-up",
  not_cleared: "Not cleared pending additional requirements",
  discontinued: "Onboarding discontinued",
  admin_review: "Administrative review required",
};

export type EmploymentType = "full_time" | "part_time" | "prn" | "volunteer" | "other";

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  prn: "PRN",
  volunteer: "Volunteer",
  other: "Other",
};

export type CredentialLevel = "emt" | "paramedic" | "critical_care_paramedic" | "rn" | "other";

export const CREDENTIAL_LEVEL_LABELS: Record<CredentialLevel, string> = {
  emt: "EMT",
  paramedic: "Paramedic",
  critical_care_paramedic: "Critical Care Paramedic",
  rn: "RN",
  other: "Other",
};

export type RecordStatus = "in_progress" | "finalized" | "rescinded";

export type SignerWho = "employee" | "preceptor" | "witness";

export interface SectionRow {
  id: string;
  title: string;
  displayOrder: number;
  active: boolean;
}

export interface ItemRow {
  id: string;
  sectionId: string;
  label: string;
  required: boolean;
  hasUpload: boolean;
  hasExpiration: boolean;
  hasNotes: boolean;
  hasVerification: boolean;
  shareSaveToFile: boolean;
  shareEmailEmployee: boolean;
  shareEmailAdmin: boolean;
  displayOrder: number;
  active: boolean;
}

export interface ProgressRow {
  id: string;
  recordId: string;
  itemId: string;
  status: ItemStatus;
  notes: string | null;
  fileUrl: string | null;
  fileName: string | null;
  expirationDate: string | null;
  completedById: string | null;
  completedByName: string | null;
  completedAt: string | null;
}

export interface SignatureRow {
  id: string;
  recordId: string;
  who: SignerWho;
  printedName: string;
  signatureDataUrl: string;
  signedAt: string;
}

export interface OnboardingRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string | null;
  startDate: string | null;
  employmentType: EmploymentType | null;
  credentialLevel: CredentialLevel | null;
  assignedUnit: string | null;
  preceptorId: string | null;
  preceptorName: string | null;
  witnessId: string | null;
  witnessName: string | null;
  status: RecordStatus;
  finalOutcome: FinalOutcome | null;
  finalNotes: string | null;
  pdfUrl: string | null;
  pdfFilename: string | null;
  personnelRecordId: string | null;
  finalizedAt: string | null;
  finalizedById: string | null;
  rescindedAt: string | null;
  rescindedById: string | null;
  rescindedReason: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export const EMPLOYEE_ACKNOWLEDGMENT =
  "I acknowledge that I have been shown where to access the Millstadt Ambulance Service Employee Handbook, Policy Manual, Bylaws, standard operating guidelines/procedures, and applicable training resources. I understand that I am responsible for reviewing and complying with current agency policies, procedures, expectations, and assigned training requirements. I understand that policies and procedures may be updated, and I may be required to review and acknowledge future updates electronically.";

export const PRECEPTOR_ATTESTATION =
  "I attest that the above onboarding items were reviewed, verified, or completed to the best of my knowledge based on the records and documentation available at the time of completion. Any pending items, restrictions, or follow-up requirements have been documented in this checklist.";

export const WITNESS_ATTESTATION =
  "I attest that the employee and admin/preceptor signatures were completed as part of this onboarding record and that the final status was documented at the time of signature.";
