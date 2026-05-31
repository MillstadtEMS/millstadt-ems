/**
 * Declarative registry of form types for the Employee Forms & Personnel
 * Documentation Center.
 *
 * Every form is a config entry — not its own file. The generic editor,
 * generic API routes, generic PDF builder, audit log, sharing controls,
 * and rescind workflow all walk this registry to drive their behavior.
 *
 * Add a new form by appending a new FormSpec to FORM_REGISTRY below; no
 * code changes elsewhere are required for the new form to appear in the
 * admin launcher and work end-to-end.
 */

export type FormFieldType =
  | "text"
  | "longtext"
  | "date"
  | "datetime"
  | "select"
  | "checkbox"
  | "number";

export interface FormFieldSpec {
  key: string;
  label: string;
  type: FormFieldType;
  helpText?: string;
  options?: string[];
  required?: boolean;
  placeholder?: string;
  rows?: number;
}

export interface FormSectionSpec {
  title: string;
  intro?: string;
  fields: FormFieldSpec[];
}

export type SignerRole = "manager" | "employee" | "evaluator" | "witness";

export interface SignatureSpec {
  who: SignerRole;
  label: string;
  required: boolean;
  /** Acknowledgment language shown ABOVE the signature pad and on the PDF. */
  certificationText: string;
  /** When true, allow a "refused to sign" checkbox alongside the pad. */
  allowRefusal?: boolean;
}

export type PersonnelFileTab =
  | "personnel_records"
  | "credentials_training"
  | "policy_acknowledgments"
  | "payroll_scheduling"
  | "equipment_property"
  | "operations_safety"
  | "confidential_hr"
  | "confidential_medical"
  | "corrective_actions"
  | "commendations"
  | "separation_records";

export type FormConfidentiality = "open" | "confidential_hr" | "confidential_medical";

export interface FormSpec {
  /** Machine id. Slug used in URLs and DB rows. */
  id: string;
  /** Human label. */
  label: string;
  /** One-liner shown under the title in the launcher. */
  blurb: string;
  /** Document title that appears at the top of the PDF. */
  pdfTitle: string;
  /** File-name prefix: PolicyAcknowledgment_Smith_John_2026-05-30.pdf */
  filenamePrefix: string;
  /** Personnel-file tab the saved PDF lands in (when saveToFile = true). */
  defaultFileTab: PersonnelFileTab;
  /** Confidentiality posture — drives default sharing toggles + restricts visibility. */
  confidentiality: FormConfidentiality;
  /** Whether the form can be bulk-pushed to many employees. */
  bulkAssignable: boolean;
  /** When true, the form is filled by the employee, not an admin. */
  employeeFillable?: boolean;
  /** Default sharing toggles for the share controls at finalize time. */
  defaults: {
    saveToFile: boolean;
    visibleToEmployee: boolean;
    emailEmployee: boolean;
    emailAdminInbox: boolean;
  };
  /** Editable form sections + fields. */
  sections: FormSectionSpec[];
  /** Signatures captured for this form. */
  signatures: SignatureSpec[];
}

// ── Pre-baked certification language per spec ──────────────────────────
const ACK_EMPLOYEE =
  "My signature acknowledges that I have reviewed this document. " +
  "My signature does not necessarily indicate agreement unless specifically stated in the form.";

const ACK_POLICY =
  "My signature acknowledges that I have received access to this policy/document and " +
  "understand that I am responsible for reviewing and following the expectations outlined within it.";

const ACK_MANAGER =
  "I certify that this document was completed and reviewed according to the information " +
  "available at the time of submission.";

// ── The registry ───────────────────────────────────────────────────────

export const FORM_REGISTRY: FormSpec[] = [
  // 1. Policy Acknowledgment
  {
    id: "policy_acknowledgment",
    label: "Policy Acknowledgment",
    blurb: "Push a policy or SOP to crew for receipt + signature acknowledgment.",
    pdfTitle: "Policy / SOP Acknowledgment",
    filenamePrefix: "PolicyAcknowledgment",
    defaultFileTab: "policy_acknowledgments",
    confidentiality: "open",
    bulkAssignable: true,
    defaults: { saveToFile: true, visibleToEmployee: true, emailEmployee: false, emailAdminInbox: true },
    sections: [
      {
        title: "Policy details",
        fields: [
          { key: "policyTitle", label: "Policy / SOP title", type: "text", required: true },
          { key: "policyVersion", label: "Version", type: "text" },
          { key: "policyEffectiveDate", label: "Effective date", type: "date" },
          { key: "policyCategory", label: "Category", type: "select", options: [
            "Operations", "Clinical", "HR", "Safety", "Compliance", "Vehicle / Fleet", "Documentation",
          ] },
          { key: "policyLink", label: "Document URL", type: "text", helpText: "Link to the policy PDF or page" },
          { key: "summaryOfChange", label: "Summary of change", type: "longtext", rows: 4 },
        ],
      },
      {
        title: "Employee acknowledgment",
        intro: "Employee confirms they have received access to this policy and accept responsibility to follow it.",
        fields: [
          { key: "employeeComments", label: "Employee comments / questions (optional)", type: "longtext", rows: 3 },
        ],
      },
    ],
    signatures: [
      { who: "manager", label: "Issuing supervisor", required: true, certificationText: ACK_MANAGER },
      { who: "employee", label: "Employee", required: true, certificationText: ACK_POLICY, allowRefusal: true },
    ],
  },

  // 2. Training Completion / Education Acknowledgment
  {
    id: "training_completion",
    label: "Training Completion",
    blurb: "Document completed training, assigned education, or protocol updates.",
    pdfTitle: "Training Completion Record",
    filenamePrefix: "TrainingCompletion",
    defaultFileTab: "credentials_training",
    confidentiality: "open",
    bulkAssignable: true,
    defaults: { saveToFile: true, visibleToEmployee: true, emailEmployee: false, emailAdminInbox: false },
    sections: [
      {
        title: "Training details",
        fields: [
          { key: "trainingTitle", label: "Training title", type: "text", required: true },
          { key: "trainingCategory", label: "Category", type: "select", options: [
            "Clinical / protocol", "Safety", "Equipment", "Compliance", "Continuing education", "Orientation", "Other",
          ] },
          { key: "assignedDate", label: "Assigned date", type: "date" },
          { key: "completionDate", label: "Completion date", type: "date", required: true },
          { key: "instructor", label: "Instructor / source", type: "text" },
          { key: "requiredOrOptional", label: "Required or optional", type: "select", options: ["Required", "Optional"] },
          { key: "quizScore", label: "Quiz score (if applicable)", type: "text" },
          { key: "certificateUrl", label: "Certificate URL", type: "text" },
        ],
      },
    ],
    signatures: [
      { who: "employee", label: "Employee", required: true, certificationText: ACK_EMPLOYEE },
      { who: "manager", label: "Instructor / Verifying supervisor", required: true, certificationText: ACK_MANAGER },
    ],
  },

  // 3. Competency Validation
  {
    id: "competency_validation",
    label: "Competency Validation",
    blurb: "Document validation of an EMS skill or credentialing competency.",
    pdfTitle: "Skill / Competency Validation",
    filenamePrefix: "CompetencyValidation",
    defaultFileTab: "credentials_training",
    confidentiality: "open",
    bulkAssignable: false,
    defaults: { saveToFile: true, visibleToEmployee: true, emailEmployee: false, emailAdminInbox: false },
    sections: [
      {
        title: "Skill validated",
        fields: [
          { key: "skill", label: "Skill / competency", type: "select", required: true, options: [
            "Airway management",
            "IV / IO access",
            "Cardiac monitor",
            "Ventilator",
            "CPAP / BiPAP",
            "Controlled substances",
            "Power-LOAD / stretcher",
            "LUCAS device",
            "Pediatric equipment",
            "RSI credentialing",
            "Other",
          ] },
          { key: "validationDate", label: "Validation date", type: "date", required: true },
          { key: "evaluatorName", label: "Evaluator", type: "text", required: true },
          { key: "checklistNotes", label: "Checklist / observations", type: "longtext", rows: 6,
            helpText: "Itemized observations or checklist notes captured during the validation." },
          { key: "result", label: "Result", type: "select", required: true, options: ["Competent", "Not competent"] },
          { key: "remediationRequired", label: "Remediation required?", type: "select", options: ["No", "Yes"] },
          { key: "remediationPlan", label: "Remediation plan", type: "longtext", rows: 3 },
          { key: "retestDate", label: "Retest date (if needed)", type: "date" },
        ],
      },
    ],
    signatures: [
      { who: "evaluator", label: "Evaluator", required: true, certificationText: ACK_MANAGER },
      { who: "employee", label: "Employee", required: true, certificationText: ACK_EMPLOYEE },
    ],
  },

  // 4. Coaching / Counseling Note
  {
    id: "coaching_note",
    label: "Coaching / Counseling Note",
    blurb: "Document a verbal coaching conversation without escalating to formal discipline.",
    pdfTitle: "Supervisor Coaching Note",
    filenamePrefix: "CoachingNote",
    defaultFileTab: "personnel_records",
    confidentiality: "open",
    bulkAssignable: false,
    defaults: { saveToFile: true, visibleToEmployee: false, emailEmployee: false, emailAdminInbox: false },
    sections: [
      {
        title: "Discussion summary",
        fields: [
          { key: "discussionDate", label: "Date of discussion", type: "datetime", required: true },
          { key: "topicDiscussed", label: "Topic discussed", type: "text", required: true },
          { key: "objectiveFacts", label: "Objective facts", type: "longtext", rows: 4, required: true,
            helpText: "What was observed, reported, or confirmed. Avoid labels or opinions." },
          { key: "coachingProvided", label: "Coaching provided", type: "longtext", rows: 3, required: true },
          { key: "expectationsGoingForward", label: "Expectations going forward", type: "longtext", rows: 3, required: true },
          { key: "followUpDate", label: "Follow-up date (optional)", type: "date" },
          { key: "employeeResponse", label: "Employee response / acknowledgment", type: "longtext", rows: 3 },
        ],
      },
    ],
    signatures: [
      { who: "manager", label: "Supervisor", required: true, certificationText: ACK_MANAGER },
      { who: "employee", label: "Employee (optional acknowledgment)", required: false, certificationText: ACK_EMPLOYEE, allowRefusal: true },
    ],
  },

  // 5. Workplace Injury / Exposure Report
  {
    id: "workplace_injury",
    label: "Workplace Injury / Exposure",
    blurb: "Document an on-duty injury, exposure, needlestick, or assault.",
    pdfTitle: "Workplace Injury / Exposure Report",
    filenamePrefix: "WorkplaceInjury",
    defaultFileTab: "confidential_medical",
    confidentiality: "confidential_medical",
    bulkAssignable: false,
    employeeFillable: true,
    defaults: { saveToFile: true, visibleToEmployee: true, emailEmployee: false, emailAdminInbox: true },
    sections: [
      {
        title: "Incident",
        fields: [
          { key: "incidentType", label: "Incident type", type: "select", required: true, options: [
            "Needlestick / sharps",
            "Body fluid exposure",
            "Lift / strain",
            "Slip / fall",
            "Vehicle-related",
            "Assault",
            "Other",
          ] },
          { key: "incidentDate", label: "Date / time", type: "datetime", required: true },
          { key: "incidentLocation", label: "Location", type: "text", required: true },
          { key: "description", label: "Description", type: "longtext", rows: 6, required: true,
            helpText: "What happened, in factual terms." },
          { key: "ppeUsed", label: "PPE used at time of incident", type: "text" },
          { key: "bodyPartAffected", label: "Body part affected", type: "text" },
          { key: "treatmentSought", label: "Treatment sought", type: "longtext", rows: 2 },
          { key: "supervisorNotified", label: "Supervisor notified", type: "text" },
          { key: "witnesses", label: "Witnesses", type: "longtext", rows: 2 },
        ],
      },
    ],
    signatures: [
      { who: "employee", label: "Employee", required: true, certificationText: ACK_EMPLOYEE },
      { who: "manager", label: "Supervisor review", required: true, certificationText: ACK_MANAGER },
    ],
  },

  // 6. Equipment Damage / Malfunction
  {
    id: "equipment_damage",
    label: "Equipment Damage / Malfunction",
    blurb: "Report broken or malfunctioning equipment.",
    pdfTitle: "Equipment Damage / Malfunction Report",
    filenamePrefix: "EquipmentDamage",
    defaultFileTab: "operations_safety",
    confidentiality: "open",
    bulkAssignable: false,
    employeeFillable: true,
    defaults: { saveToFile: false, visibleToEmployee: false, emailEmployee: false, emailAdminInbox: true },
    sections: [
      {
        title: "Equipment",
        fields: [
          { key: "equipmentType", label: "Equipment type", type: "text", required: true },
          { key: "assetSerial", label: "Asset / serial number", type: "text" },
          { key: "unitLocation", label: "Unit / location", type: "text" },
          { key: "problemDescription", label: "Problem description", type: "longtext", rows: 5, required: true },
          { key: "whenDiscovered", label: "When discovered", type: "datetime" },
          { key: "actionTaken", label: "Action taken", type: "longtext", rows: 3 },
          { key: "removedFromService", label: "Removed from service?", type: "select", options: ["No", "Yes"] },
          { key: "reportedToWhom", label: "Reported to whom", type: "text" },
        ],
      },
    ],
    signatures: [
      { who: "employee", label: "Reporting employee", required: true, certificationText: ACK_EMPLOYEE },
    ],
  },

  // 7. Commendation
  {
    id: "commendation",
    label: "Commendation / Positive Recognition",
    blurb: "Document positive performance for the employee file.",
    pdfTitle: "Employee Commendation",
    filenamePrefix: "Commendation",
    defaultFileTab: "commendations",
    confidentiality: "open",
    bulkAssignable: false,
    defaults: { saveToFile: true, visibleToEmployee: true, emailEmployee: true, emailAdminInbox: false },
    sections: [
      {
        title: "Recognition",
        fields: [
          { key: "category", label: "Category", type: "select", required: true, options: [
            "Patient care excellence",
            "Teamwork",
            "Leadership",
            "Community service",
            "Clinical performance",
            "Professionalism",
            "Public compliment",
            "Other",
          ] },
          { key: "eventDate", label: "Date / event", type: "date" },
          { key: "narrative", label: "Narrative", type: "longtext", rows: 6, required: true,
            helpText: "Describe what the employee did and why it stood out." },
          { key: "submittedBy", label: "Submitted by", type: "text" },
        ],
      },
    ],
    signatures: [
      { who: "manager", label: "Supervisor approval", required: true, certificationText: ACK_MANAGER },
    ],
  },

  // 8. Leave Request
  {
    id: "leave_request",
    label: "Leave Request",
    blurb: "Employee submits a request for time off; supervisor approves.",
    pdfTitle: "Leave Request",
    filenamePrefix: "LeaveRequest",
    defaultFileTab: "payroll_scheduling",
    confidentiality: "open",
    bulkAssignable: false,
    employeeFillable: true,
    defaults: { saveToFile: true, visibleToEmployee: true, emailEmployee: true, emailAdminInbox: true },
    sections: [
      {
        title: "Request details",
        fields: [
          { key: "leaveType", label: "Leave type", type: "select", required: true, options: [
            "PTO / vacation",
            "Sick",
            "Bereavement",
            "Jury duty",
            "Military",
            "FMLA",
            "Unpaid leave",
            "Other",
          ] },
          { key: "startDate", label: "Start date", type: "date", required: true },
          { key: "endDate", label: "End date", type: "date", required: true },
          { key: "hoursRequested", label: "Hours requested", type: "text" },
          { key: "reason", label: "Reason (if required)", type: "longtext", rows: 2 },
          { key: "coverageArranged", label: "Coverage arranged?", type: "select", options: ["No", "Yes"] },
          { key: "coverageDetails", label: "Coverage details", type: "longtext", rows: 2 },
        ],
      },
    ],
    signatures: [
      { who: "employee", label: "Requesting employee", required: true, certificationText: ACK_EMPLOYEE },
      { who: "manager", label: "Supervisor approval / denial", required: true, certificationText: ACK_MANAGER },
    ],
  },

  // 9. Time Correction / Missed Punch
  {
    id: "time_correction",
    label: "Time Correction / Missed Punch",
    blurb: "Correct a timeclock issue and route for supervisor + payroll approval.",
    pdfTitle: "Time Correction",
    filenamePrefix: "TimeCorrection",
    defaultFileTab: "payroll_scheduling",
    confidentiality: "open",
    bulkAssignable: false,
    employeeFillable: true,
    defaults: { saveToFile: true, visibleToEmployee: true, emailEmployee: false, emailAdminInbox: true },
    sections: [
      {
        title: "Correction",
        fields: [
          { key: "shiftDate", label: "Shift date", type: "date", required: true },
          { key: "scheduledShift", label: "Scheduled shift", type: "text" },
          { key: "actualTimeWorked", label: "Actual time worked", type: "text" },
          { key: "requestedCorrection", label: "Requested correction", type: "longtext", rows: 3, required: true },
          { key: "reason", label: "Reason", type: "longtext", rows: 2 },
        ],
      },
    ],
    signatures: [
      { who: "employee", label: "Employee", required: true, certificationText: ACK_EMPLOYEE },
      { who: "manager", label: "Supervisor approval", required: true, certificationText: ACK_MANAGER },
    ],
  },

  // 10. Vehicle Accident / Damage
  {
    id: "vehicle_accident",
    label: "Vehicle Accident / Damage",
    blurb: "Document a vehicle accident, fender bender, or apparatus damage.",
    pdfTitle: "Vehicle Accident / Damage Report",
    filenamePrefix: "VehicleAccident",
    defaultFileTab: "operations_safety",
    confidentiality: "open",
    bulkAssignable: false,
    defaults: { saveToFile: true, visibleToEmployee: false, emailEmployee: false, emailAdminInbox: true },
    sections: [
      {
        title: "Incident",
        fields: [
          { key: "unitNumber", label: "Unit number", type: "text", required: true },
          { key: "incidentDate", label: "Date / time", type: "datetime", required: true },
          { key: "incidentLocation", label: "Location", type: "text", required: true },
          { key: "driver", label: "Driver", type: "text", required: true },
          { key: "passengers", label: "Passengers", type: "longtext", rows: 2 },
          { key: "damageDescription", label: "Damage description", type: "longtext", rows: 5, required: true },
          { key: "policeReportNumber", label: "Police report #", type: "text" },
          { key: "otherVehicles", label: "Other vehicles involved", type: "longtext", rows: 2 },
          { key: "injuries", label: "Injuries?", type: "select", options: ["No", "Yes"] },
          { key: "supervisorNotified", label: "Supervisor notified", type: "text" },
          { key: "drugAlcoholTesting", label: "Drug/alcohol testing required?", type: "select", options: ["No", "Yes"] },
          { key: "employeeStatement", label: "Employee statement", type: "longtext", rows: 4 },
          { key: "witnesses", label: "Witnesses", type: "longtext", rows: 2 },
        ],
      },
    ],
    signatures: [
      { who: "employee", label: "Driver / employee", required: true, certificationText: ACK_EMPLOYEE },
      { who: "manager", label: "Supervisor review", required: true, certificationText: ACK_MANAGER },
    ],
  },

  // 11. Controlled Substance Access Acknowledgment
  {
    id: "controlled_substance_access",
    label: "Controlled Substance Access Acknowledgment",
    blurb: "Document narcotic key / code / access responsibilities.",
    pdfTitle: "Controlled Substance Access Acknowledgment",
    filenamePrefix: "ControlledSubstanceAccess",
    defaultFileTab: "credentials_training",
    confidentiality: "open",
    bulkAssignable: true,
    defaults: { saveToFile: true, visibleToEmployee: true, emailEmployee: false, emailAdminInbox: true },
    sections: [
      {
        title: "Access",
        fields: [
          { key: "accessType", label: "Access type (key / code / safe / lockbox)", type: "text", required: true },
          { key: "policyReviewed", label: "Policy reviewed", type: "text" },
          { key: "responsibilities", label: "Employee responsibilities", type: "longtext", rows: 4 },
          { key: "reportingRequirements", label: "Reporting requirements", type: "longtext", rows: 3 },
          { key: "lostKeyProcess", label: "Lost key / access issue process", type: "longtext", rows: 3 },
        ],
      },
    ],
    signatures: [
      { who: "employee", label: "Employee", required: true, certificationText: ACK_POLICY },
      { who: "manager", label: "Issuing supervisor", required: true, certificationText: ACK_MANAGER },
    ],
  },

  // 12. Resignation / Separation
  {
    id: "resignation",
    label: "Resignation / Separation",
    blurb: "Paperless offboarding record.",
    pdfTitle: "Resignation / Separation Record",
    filenamePrefix: "Separation",
    defaultFileTab: "separation_records",
    confidentiality: "open",
    bulkAssignable: false,
    defaults: { saveToFile: true, visibleToEmployee: false, emailEmployee: false, emailAdminInbox: true },
    sections: [
      {
        title: "Separation",
        fields: [
          { key: "noticeDate", label: "Notice date", type: "date", required: true },
          { key: "lastDay", label: "Last working day", type: "date", required: true },
          { key: "reason", label: "Reason (optional)", type: "longtext", rows: 2 },
          { key: "equipmentReturned", label: "Equipment / uniforms returned", type: "longtext", rows: 4 },
          { key: "keysAccessRemoved", label: "Keys / access removed", type: "longtext", rows: 2 },
          { key: "accountsDisabled", label: "Accounts disabled", type: "longtext", rows: 2 },
          { key: "finalPaycheckNotes", label: "Final paycheck notes", type: "longtext", rows: 2 },
          { key: "exitInterviewCompleted", label: "Exit interview completed?", type: "select", options: ["No", "Yes"] },
        ],
      },
    ],
    signatures: [
      { who: "manager", label: "Supervisor", required: true, certificationText: ACK_MANAGER },
      { who: "employee", label: "Employee (if available)", required: false, certificationText: ACK_EMPLOYEE, allowRefusal: true },
    ],
  },
];

export function getFormSpec(id: string): FormSpec | null {
  return FORM_REGISTRY.find((f) => f.id === id) ?? null;
}

export function fileTabLabel(tab: PersonnelFileTab): string {
  switch (tab) {
    case "personnel_records":      return "Personnel Records";
    case "credentials_training":   return "Credentials & Training";
    case "policy_acknowledgments": return "Policy Acknowledgments";
    case "payroll_scheduling":     return "Payroll / Scheduling";
    case "equipment_property":     return "Equipment / Property";
    case "operations_safety":      return "Operations / Safety";
    case "confidential_hr":        return "Confidential HR / Complaints";
    case "confidential_medical":   return "Confidential Medical / Accommodation";
    case "corrective_actions":     return "Corrective Actions";
    case "commendations":          return "Commendations";
    case "separation_records":     return "Separation Records";
  }
}
