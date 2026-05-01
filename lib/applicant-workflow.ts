/**
 * Applicant Tracking & Hiring Workflow types and shared definitions.
 *
 * The application data itself lives in `form_submissions` (existing) and is
 * never modified by this module. Workflow state (status, interview, evaluation,
 * onboarding checklists) lives in a separate `applicant_workflow` table keyed
 * by submission_id.
 */

export type ApplicantStatus =
  | "Applied"
  | "Waitlisted"
  | "Interview Process"
  | "Tentative Hire"
  | "Hired"
  | "Denied";

export const APPLICANT_STATUSES: ApplicantStatus[] = [
  "Applied",
  "Waitlisted",
  "Interview Process",
  "Tentative Hire",
  "Hired",
  "Denied",
];

export type StatusHistoryEntry = {
  from: ApplicantStatus | null;
  to: ApplicantStatus;
  at: string;        // ISO timestamp
  actor?: string;    // user/admin identifier (best-effort)
  note?: string;
};

export type InterviewData = {
  contacted?: boolean;
  contactedAt?: string;       // ISO date
  contactedNotes?: string;
  attemptedContact?: boolean;
  attemptedContactAt?: string;
  scheduled?: boolean;
  scheduledAt?: string;       // ISO datetime
  location?: string;          // physical location or virtual meeting link
  interviewers?: string[];
  notes?: string;
};

export type EvaluationData = {
  arrivedOnTime?: boolean;
  appropriateAppearance?: boolean;
  communicationSkills?: boolean;
  clinicalKnowledge?: boolean;
  scenarioPerformance?: boolean;
  understandsEMSRole?: boolean;
  professionalDemeanor?: boolean;
  teamFit?: boolean;
  drivingExperience?: boolean;
  certificationsVerified?: boolean;
  overallRating?: number;     // 1-5
  strengths?: string;
  concerns?: string;
  recommendation?: "Hire" | "Waitlist" | "Do Not Hire" | "";
  evaluatorName?: string;
  evaluatedAt?: string;
};

export type OnboardingData = {
  // ── HR / Legal ──
  i9?: boolean;
  w4?: boolean;
  ilW4?: boolean;
  directDeposit?: boolean;
  handbookAck?: boolean;
  hipaaAgreement?: boolean;
  sexualHarassmentTraining?: boolean;
  // ── Medical / Compliance ──
  physicalExam?: boolean;
  drugScreen?: boolean;
  tbTest?: boolean;
  immunizationsVerified?: boolean;
  hepBOrDeclination?: boolean;
  // ── EMS Credentials ──
  idphLicenseVerified?: boolean;
  cprBls?: boolean;
  acls?: boolean;
  pals?: boolean;
  itlsOrPhtls?: boolean;
  // ── Background / Compliance ──
  backgroundCheck?: boolean;
  mvrCheck?: boolean;
  oigExclusionCheck?: boolean;
  samExclusionCheck?: boolean;
  fingerprinting?: boolean;
  narcoticsEnrollment?: boolean;
  // ── Systems Access ──
  esoAccount?: boolean;
  adpAccount?: boolean;
  emailIssued?: boolean;
  cadAccess?: boolean;
  idBadge?: boolean;
  keyCard?: boolean;
  // ── Training / Ops ──
  orientationCompleted?: boolean;
  protocolTraining?: boolean;
  ftoAssigned?: boolean;
  evocVerified?: boolean;
  fieldClearance?: boolean;
};

export type ApplicantWorkflow = {
  submissionId: string;
  status: ApplicantStatus;
  statusHistory: StatusHistoryEntry[];
  interview: InterviewData;
  evaluation: EvaluationData;
  onboarding: OnboardingData;
  interviewEmailSentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/* ── Onboarding checklist UI definition ──────────────────────────────── */

export type OnboardingItem = { key: keyof OnboardingData; label: string };
export type OnboardingGroup = { title: string; icon: string; items: OnboardingItem[] };

export const ONBOARDING_GROUPS: OnboardingGroup[] = [
  {
    title: "HR / Legal",
    icon: "🧾",
    items: [
      { key: "i9", label: "I-9 completed" },
      { key: "w4", label: "W-4 completed" },
      { key: "ilW4", label: "IL-W-4 completed" },
      { key: "directDeposit", label: "Direct deposit setup" },
      { key: "handbookAck", label: "Handbook acknowledgment" },
      { key: "hipaaAgreement", label: "HIPAA agreement" },
      { key: "sexualHarassmentTraining", label: "Sexual harassment training" },
    ],
  },
  {
    title: "Medical / Compliance",
    icon: "🏥",
    items: [
      { key: "physicalExam", label: "Physical exam" },
      { key: "drugScreen", label: "Drug screen" },
      { key: "tbTest", label: "TB test" },
      { key: "immunizationsVerified", label: "Immunizations verified" },
      { key: "hepBOrDeclination", label: "Hep B or declination" },
    ],
  },
  {
    title: "EMS Credentials",
    icon: "🚑",
    items: [
      { key: "idphLicenseVerified", label: "IDPH license verified" },
      { key: "cprBls", label: "CPR (BLS)" },
      { key: "acls", label: "ACLS (if applicable)" },
      { key: "pals", label: "PALS (if applicable)" },
      { key: "itlsOrPhtls", label: "ITLS or PHTLS verified" },
    ],
  },
  {
    title: "Background / Compliance",
    icon: "🔐",
    items: [
      { key: "backgroundCheck", label: "Background check" },
      { key: "mvrCheck", label: "MVR check" },
      { key: "oigExclusionCheck", label: "OIG exclusion check" },
      { key: "samExclusionCheck", label: "SAM exclusion check" },
      { key: "fingerprinting", label: "Fingerprinting" },
      { key: "narcoticsEnrollment", label: "Narcotics system enrollment" },
    ],
  },
  {
    title: "Systems Access",
    icon: "💻",
    items: [
      { key: "esoAccount", label: "ESO account created" },
      { key: "adpAccount", label: "ADP account created" },
      { key: "emailIssued", label: "Email issued" },
      { key: "cadAccess", label: "CAD access" },
      { key: "idBadge", label: "ID badge created" },
      { key: "keyCard", label: "Key card assigned" },
    ],
  },
  {
    title: "Training / Ops",
    icon: "🚒",
    items: [
      { key: "orientationCompleted", label: "Orientation completed" },
      { key: "protocolTraining", label: "Protocol training" },
      { key: "ftoAssigned", label: "FTO assigned" },
      { key: "evocVerified", label: "EVOC verified / training" },
      { key: "fieldClearance", label: "Field clearance" },
    ],
  },
];

export type EvaluationItem = { key: keyof EvaluationData; label: string };
export const EVALUATION_CHECKS: EvaluationItem[] = [
  { key: "arrivedOnTime", label: "Arrived on time" },
  { key: "appropriateAppearance", label: "Appropriate appearance (EMS professional standard)" },
  { key: "communicationSkills", label: "Communication skills" },
  { key: "clinicalKnowledge", label: "Clinical knowledge (basic)" },
  { key: "scenarioPerformance", label: "Scenario performance (if applicable)" },
  { key: "understandsEMSRole", label: "Understanding of EMS role" },
  { key: "professionalDemeanor", label: "Professional demeanor" },
  { key: "teamFit", label: "Team fit" },
  { key: "drivingExperience", label: "Driving experience (if applicable)" },
  { key: "certificationsVerified", label: "Certifications verified (CPR, ACLS, etc.)" },
];

/* ── Progress helpers ─────────────────────────────────────────────────── */

export function onboardingProgress(o: OnboardingData): { done: number; total: number; pct: number } {
  let total = 0;
  let done = 0;
  for (const group of ONBOARDING_GROUPS) {
    for (const item of group.items) {
      total++;
      if (o[item.key]) done++;
    }
  }
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function interviewProgress(i: InterviewData): { done: number; total: number; pct: number } {
  const items = [!!i.contacted, !!i.scheduled, !!i.interviewers && i.interviewers.length > 0];
  const done = items.filter(Boolean).length;
  return { done, total: items.length, pct: Math.round((done / items.length) * 100) };
}

export function evaluationProgress(e: EvaluationData): { done: number; total: number; pct: number } {
  let done = 0;
  for (const item of EVALUATION_CHECKS) {
    if (e[item.key]) done++;
  }
  if (e.recommendation) done++;
  if (e.overallRating && e.overallRating > 0) done++;
  const total = EVALUATION_CHECKS.length + 2;
  return { done, total, pct: Math.round((done / total) * 100) };
}

/* ── Default empty workflow ──────────────────────────────────────────── */

export function defaultWorkflow(submissionId: string): ApplicantWorkflow {
  return {
    submissionId,
    status: "Applied",
    statusHistory: [],
    interview: {},
    evaluation: {},
    onboarding: {},
    interviewEmailSentAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
