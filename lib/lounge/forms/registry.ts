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
  /** When false, the form can still be admin-sent but does not appear in the employee request menu. */
  employeeRequestable?: boolean;
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
    employeeRequestable: false,
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
    employeeRequestable: false,
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

  // 13. Performance Improvement Plan
  {
    id: "performance_improvement_plan",
    label: "Performance Improvement Plan",
    blurb: "Document recurring or significant performance issues with measurable goals + review dates.",
    pdfTitle: "Performance Improvement Plan",
    filenamePrefix: "PerformanceImprovementPlan",
    defaultFileTab: "personnel_records",
    confidentiality: "open",
    bulkAssignable: false,
    defaults: { saveToFile: true, visibleToEmployee: true, emailEmployee: false, emailAdminInbox: true },
    sections: [
      {
        title: "Concern",
        fields: [
          { key: "performanceConcern", label: "Performance concern", type: "longtext", rows: 4, required: true,
            helpText: "What specific performance is below standard? Stick to observed, measurable facts." },
          { key: "specificExamples", label: "Specific examples", type: "longtext", rows: 5,
            helpText: "Dates, calls, incidents, documentation issues — anything concrete." },
          { key: "expectedStandard", label: "Expected standard", type: "longtext", rows: 3, required: true,
            helpText: "What does meeting the expectation actually look like?" },
        ],
      },
      {
        title: "Plan & timeline",
        fields: [
          { key: "measurableGoals", label: "Measurable goals", type: "longtext", rows: 4, required: true,
            helpText: "Each goal should be specific, measurable, and time-bound." },
          { key: "supportOffered", label: "Support / training offered", type: "longtext", rows: 3 },
          { key: "reviewDates", label: "Review dates", type: "longtext", rows: 2,
            helpText: "Schedule of check-ins (e.g. 30 / 60 / 90 day reviews)." },
          { key: "consequencesIfNotMet", label: "Consequences if expectations are not met", type: "longtext", rows: 2, required: true },
        ],
      },
      {
        title: "Outcome",
        fields: [
          { key: "progressNotes", label: "Progress notes (updated as reviews happen)", type: "longtext", rows: 4 },
          { key: "outcome", label: "Outcome / next step", type: "select", options: ["In progress", "Met expectations", "Partial progress", "Not met — further action", "Closed"] },
          { key: "employeeResponse", label: "Employee response", type: "longtext", rows: 3 },
        ],
      },
    ],
    signatures: [
      { who: "manager", label: "Issuing supervisor", required: true, certificationText: ACK_MANAGER },
      { who: "employee", label: "Employee", required: true, certificationText: ACK_EMPLOYEE, allowRefusal: true },
    ],
  },

  // 14. Annual Performance Evaluation
  {
    id: "annual_performance_evaluation",
    label: "Annual Performance Evaluation",
    blurb: "Year-end review across clinical, operational, and professional dimensions.",
    pdfTitle: "Annual Performance Evaluation",
    filenamePrefix: "AnnualEvaluation",
    defaultFileTab: "personnel_records",
    confidentiality: "open",
    bulkAssignable: false,
    defaults: { saveToFile: true, visibleToEmployee: true, emailEmployee: false, emailAdminInbox: false },
    sections: [
      {
        title: "Review period",
        fields: [
          { key: "reviewStart", label: "Review period — start", type: "date", required: true },
          { key: "reviewEnd",   label: "Review period — end",   type: "date", required: true },
          { key: "reviewer",    label: "Reviewer",              type: "text", required: true },
        ],
      },
      {
        title: "Performance ratings",
        intro: "Rate each area: Exceeds · Meets · Needs improvement · Unsatisfactory · Not applicable.",
        fields: [
          { key: "clinicalPerformance",  label: "Clinical performance",  type: "select", options: ["Exceeds", "Meets", "Needs improvement", "Unsatisfactory", "N/A"] },
          { key: "documentationQuality", label: "Documentation quality", type: "select", options: ["Exceeds", "Meets", "Needs improvement", "Unsatisfactory", "N/A"] },
          { key: "attendanceReliability",label: "Attendance / reliability", type: "select", options: ["Exceeds", "Meets", "Needs improvement", "Unsatisfactory", "N/A"] },
          { key: "teamwork",             label: "Teamwork", type: "select", options: ["Exceeds", "Meets", "Needs improvement", "Unsatisfactory", "N/A"] },
          { key: "professionalism",      label: "Professionalism", type: "select", options: ["Exceeds", "Meets", "Needs improvement", "Unsatisfactory", "N/A"] },
          { key: "drivingSafety",        label: "Driving / safety", type: "select", options: ["Exceeds", "Meets", "Needs improvement", "Unsatisfactory", "N/A"] },
          { key: "policyCompliance",     label: "Policy compliance", type: "select", options: ["Exceeds", "Meets", "Needs improvement", "Unsatisfactory", "N/A"] },
          { key: "communication",        label: "Communication", type: "select", options: ["Exceeds", "Meets", "Needs improvement", "Unsatisfactory", "N/A"] },
          { key: "initiative",           label: "Initiative", type: "select", options: ["Exceeds", "Meets", "Needs improvement", "Unsatisfactory", "N/A"] },
          { key: "leadershipPotential",  label: "Leadership potential", type: "select", options: ["Exceeds", "Meets", "Needs improvement", "Unsatisfactory", "N/A"] },
        ],
      },
      {
        title: "Narrative",
        fields: [
          { key: "strengths",         label: "Strengths", type: "longtext", rows: 4 },
          { key: "areasForImprovement", label: "Areas for improvement", type: "longtext", rows: 4 },
          { key: "goalsNextYear",     label: "Goals for next review period", type: "longtext", rows: 4 },
          { key: "employeeComments",  label: "Employee comments", type: "longtext", rows: 4 },
        ],
      },
    ],
    signatures: [
      { who: "manager", label: "Reviewer", required: true, certificationText: ACK_MANAGER },
      { who: "employee", label: "Employee", required: true, certificationText: ACK_EMPLOYEE, allowRefusal: true },
    ],
  },

  // 15. Employee Complaint / Concern  (confidential HR)
  {
    id: "employee_complaint",
    label: "Employee Complaint / Concern",
    blurb: "Submit a workplace concern. Routed to leadership for review.",
    pdfTitle: "Employee Complaint / Concern",
    filenamePrefix: "EmployeeComplaint",
    defaultFileTab: "confidential_hr",
    confidentiality: "confidential_hr",
    bulkAssignable: false,
    employeeFillable: true,
    employeeRequestable: false,
    defaults: { saveToFile: true, visibleToEmployee: false, emailEmployee: false, emailAdminInbox: true },
    sections: [
      {
        title: "Concern",
        fields: [
          { key: "concernType", label: "Type of concern", type: "select", required: true, options: [
            "Workplace behavior",
            "Communication issue",
            "Schedule / scheduling",
            "Operational",
            "Safety",
            "Equipment / supplies",
            "Patient care",
            "Other",
          ] },
          { key: "peopleInvolved", label: "People involved (if any)", type: "longtext", rows: 2,
            helpText: "Optional. Names or roles." },
          { key: "incidentDate", label: "Date / time", type: "datetime" },
          { key: "incidentLocation", label: "Location", type: "text" },
          { key: "description", label: "Description", type: "longtext", rows: 6, required: true,
            helpText: "Describe what happened factually. Avoid labels or opinions." },
          { key: "priorAttempts", label: "Prior attempts to resolve (if any)", type: "longtext", rows: 3 },
          { key: "requestedFollowUp", label: "What follow-up are you requesting?", type: "longtext", rows: 3 },
          { key: "confidentialityRequest", label: "Confidentiality request", type: "select", options: ["No special request", "Please keep confidential where possible"] },
        ],
      },
      {
        title: "Admin review",
        intro: "For admin completion after submission.",
        fields: [
          { key: "adminReviewNotes", label: "Review notes", type: "longtext", rows: 4 },
          { key: "resolution", label: "Resolution / action taken", type: "longtext", rows: 4 },
          { key: "resolutionDate", label: "Resolution date", type: "date" },
        ],
      },
    ],
    signatures: [
      { who: "employee", label: "Submitting employee", required: true, certificationText: ACK_EMPLOYEE },
      { who: "manager",  label: "Reviewing supervisor", required: true, certificationText: ACK_MANAGER },
    ],
  },

  // 16. Harassment / Discrimination / Retaliation Complaint (highest confidentiality)
  {
    id: "harassment_complaint",
    label: "Harassment / Discrimination Complaint",
    blurb: "Formal sensitive-complaint reporting. Restricted to authorized investigators.",
    pdfTitle: "Harassment / Discrimination / Retaliation Complaint",
    filenamePrefix: "SensitiveComplaint",
    defaultFileTab: "confidential_hr",
    confidentiality: "confidential_hr",
    bulkAssignable: false,
    employeeFillable: true,
    employeeRequestable: false,
    defaults: { saveToFile: true, visibleToEmployee: false, emailEmployee: false, emailAdminInbox: true },
    sections: [
      {
        title: "Complaint",
        fields: [
          { key: "complaintType", label: "Complaint type", type: "select", required: true, options: [
            "Harassment",
            "Sexual harassment",
            "Discrimination",
            "Retaliation",
            "Hostile work environment",
            "Other",
          ] },
          { key: "peopleInvolved", label: "People involved", type: "longtext", rows: 2 },
          { key: "incidentDate", label: "Date(s) / time(s)", type: "longtext", rows: 2 },
          { key: "incidentLocation", label: "Location(s)", type: "text" },
          { key: "description", label: "Description of incident(s)", type: "longtext", rows: 8, required: true,
            helpText: "Be as specific as you can about what was said and done." },
          { key: "witnesses", label: "Witnesses (names + contact)", type: "longtext", rows: 3 },
          { key: "evidence", label: "Evidence / supporting documents (describe; admin will collect uploads separately)", type: "longtext", rows: 3 },
          { key: "requestedAction", label: "Requested action / outcome", type: "longtext", rows: 3 },
          { key: "antiRetaliationAck", label: "I understand Millstadt EMS prohibits retaliation for good-faith complaints.", type: "checkbox" },
        ],
      },
      {
        title: "Investigation (admin)",
        fields: [
          { key: "investigatorAssigned", label: "Investigator assigned", type: "text" },
          { key: "investigationStatus", label: "Status", type: "select", options: ["Received", "Under investigation", "Action recommended", "Resolved", "No action — unfounded"] },
          { key: "investigationNotes", label: "Investigation notes", type: "longtext", rows: 6 },
          { key: "resolution", label: "Resolution / outcome", type: "longtext", rows: 4 },
          { key: "resolutionDate", label: "Resolution date", type: "date" },
        ],
      },
    ],
    signatures: [
      { who: "employee", label: "Complainant", required: true, certificationText: ACK_EMPLOYEE },
      { who: "manager",  label: "Investigator / reviewing administrator", required: true, certificationText: ACK_MANAGER },
    ],
  },

  // 17. Return-to-Work / Fitness-for-Duty
  {
    id: "return_to_work",
    label: "Return-to-Work / Fitness-for-Duty",
    blurb: "Document return from leave + provider restrictions.",
    pdfTitle: "Return-to-Work / Fitness-for-Duty",
    filenamePrefix: "ReturnToWork",
    defaultFileTab: "confidential_medical",
    confidentiality: "confidential_medical",
    bulkAssignable: false,
    employeeFillable: true,
    employeeRequestable: false,
    defaults: { saveToFile: true, visibleToEmployee: false, emailEmployee: false, emailAdminInbox: true },
    sections: [
      {
        title: "Leave",
        fields: [
          { key: "dateOffWork", label: "Date off work", type: "date", required: true },
          { key: "returnDate",  label: "Return date",  type: "date", required: true },
          { key: "restrictionsYesNo", label: "Restrictions?", type: "select", options: ["No", "Yes"] },
          { key: "restrictionDetails", label: "Restriction details", type: "longtext", rows: 3 },
          { key: "restrictionEndDate", label: "Restrictions end date (estimated)", type: "date" },
          { key: "providerNoteUrl", label: "Provider note URL (Vercel Blob or shared link)", type: "text" },
        ],
      },
      {
        title: "Clearance (admin)",
        fields: [
          { key: "clearedForDuty", label: "Cleared for duty?", type: "select", options: ["Yes", "Yes with restrictions", "Not cleared"] },
          { key: "adminReviewNotes", label: "Admin notes", type: "longtext", rows: 3 },
        ],
      },
    ],
    signatures: [
      { who: "employee", label: "Employee", required: true, certificationText: ACK_EMPLOYEE },
      { who: "manager",  label: "Administrator review", required: true, certificationText: ACK_MANAGER },
    ],
  },

  // 18. Accommodation Request
  {
    id: "accommodation_request",
    label: "Accommodation Request",
    blurb: "Document a workplace accommodation request and the interactive process.",
    pdfTitle: "Workplace Accommodation Request",
    filenamePrefix: "AccommodationRequest",
    defaultFileTab: "confidential_medical",
    confidentiality: "confidential_medical",
    bulkAssignable: false,
    employeeFillable: true,
    defaults: { saveToFile: true, visibleToEmployee: false, emailEmployee: false, emailAdminInbox: true },
    sections: [
      {
        title: "Request",
        fields: [
          { key: "accommodationRequested", label: "Accommodation requested", type: "longtext", rows: 4, required: true,
            helpText: "Describe what would help you perform your job duties." },
          { key: "jobDutyAffected", label: "Job duty / function affected", type: "longtext", rows: 3 },
          { key: "expectedDuration", label: "Expected duration", type: "text" },
          { key: "employeeStatement", label: "Additional information from employee", type: "longtext", rows: 4 },
        ],
      },
      {
        title: "Interactive process (admin)",
        fields: [
          { key: "interactiveProcessNotes", label: "Interactive process notes", type: "longtext", rows: 5 },
          { key: "decision", label: "Decision", type: "select", options: ["Approved", "Denied", "Approved (alternative)", "Pending"] },
          { key: "alternativeOffered", label: "Alternative accommodation offered (if applicable)", type: "longtext", rows: 3 },
          { key: "reviewDate", label: "Next review date", type: "date" },
        ],
      },
    ],
    signatures: [
      { who: "employee", label: "Employee", required: true, certificationText: ACK_EMPLOYEE },
      { who: "manager",  label: "Administrator", required: true, certificationText: ACK_MANAGER },
    ],
  },

  // 19. Shift Trade / Coverage Request
  {
    id: "shift_trade",
    label: "Shift Trade / Coverage Request",
    blurb: "Two-employee shift trade or one-way coverage request.",
    pdfTitle: "Shift Trade / Coverage Request",
    filenamePrefix: "ShiftTrade",
    defaultFileTab: "payroll_scheduling",
    confidentiality: "open",
    bulkAssignable: false,
    employeeFillable: true,
    employeeRequestable: true,
    defaults: { saveToFile: true, visibleToEmployee: true, emailEmployee: false, emailAdminInbox: true },
    sections: [
      {
        title: "Trade details",
        fields: [
          { key: "requestingEmployee", label: "Requesting employee", type: "text", required: true },
          { key: "coveringEmployee",   label: "Covering / trading employee", type: "text", required: true },
          { key: "originalShift", label: "Original shift (date, time, unit)", type: "text", required: true },
          { key: "coveringShift", label: "Covering shift (date, time, unit)", type: "text" },
          { key: "tradeDetails", label: "Trade details / notes", type: "longtext", rows: 3 },
          { key: "bothPartiesAck", label: "Both employees acknowledge this trade.", type: "checkbox" },
        ],
      },
    ],
    signatures: [
      { who: "employee", label: "Requesting employee", required: true, certificationText: ACK_EMPLOYEE },
      { who: "witness",  label: "Covering employee", required: true, certificationText: ACK_EMPLOYEE },
      { who: "manager",  label: "Supervisor approval", required: true, certificationText: ACK_MANAGER },
    ],
  },

  // 20. Uniform / Equipment Issue
  {
    id: "uniform_equipment_issue",
    label: "Uniform / Equipment Issue",
    blurb: "Track items issued or returned: uniforms, radios, keys, devices.",
    pdfTitle: "Uniform / Equipment Issue Record",
    filenamePrefix: "EquipmentIssue",
    defaultFileTab: "equipment_property",
    confidentiality: "open",
    bulkAssignable: false,
    defaults: { saveToFile: true, visibleToEmployee: true, emailEmployee: false, emailAdminInbox: false },
    sections: [
      {
        title: "Issued",
        fields: [
          { key: "itemIssued", label: "Item issued", type: "text", required: true },
          { key: "sizeSerial", label: "Size / serial number", type: "text" },
          { key: "condition", label: "Condition", type: "select", options: ["New", "Like new", "Used — good", "Used — fair", "Used — poor"] },
          { key: "dateIssued", label: "Date issued", type: "date", required: true },
          { key: "replacement", label: "Replacement for prior item?", type: "select", options: ["No", "Yes"] },
          { key: "replacementReason", label: "Reason for replacement", type: "longtext", rows: 2 },
        ],
      },
      {
        title: "Return (when applicable)",
        fields: [
          { key: "returnDate", label: "Return date", type: "date" },
          { key: "returnCondition", label: "Condition on return", type: "select", options: ["—", "New", "Like new", "Used — good", "Used — fair", "Used — poor", "Damaged", "Not returned"] },
          { key: "adminVerification", label: "Admin verification notes", type: "longtext", rows: 2 },
        ],
      },
    ],
    signatures: [
      { who: "employee", label: "Employee", required: true, certificationText: ACK_EMPLOYEE },
      { who: "manager",  label: "Issuing supervisor", required: true, certificationText: ACK_MANAGER },
    ],
  },

  // 21. Exit Interview
  {
    id: "exit_interview",
    label: "Exit Interview",
    blurb: "Collect feedback from a departing employee.",
    pdfTitle: "Exit Interview",
    filenamePrefix: "ExitInterview",
    defaultFileTab: "confidential_hr",
    confidentiality: "confidential_hr",
    bulkAssignable: false,
    employeeFillable: true,
    employeeRequestable: false,
    defaults: { saveToFile: true, visibleToEmployee: false, emailEmployee: false, emailAdminInbox: true },
    sections: [
      {
        title: "Reasons & feedback",
        fields: [
          { key: "reasonForLeaving", label: "Reason for leaving", type: "longtext", rows: 3 },
          { key: "whatWorkedWell",   label: "What worked well",   type: "longtext", rows: 4 },
          { key: "whatNeedsImprovement", label: "What needs improvement", type: "longtext", rows: 4 },
          { key: "supervisorFeedback", label: "Supervisor feedback",  type: "longtext", rows: 3 },
          { key: "cultureFeedback",  label: "Culture feedback",      type: "longtext", rows: 3 },
          { key: "wouldReapply", label: "Would you reapply someday?", type: "select", options: ["Yes", "Maybe", "No"] },
          { key: "additionalComments", label: "Additional comments", type: "longtext", rows: 4 },
        ],
      },
    ],
    signatures: [
      { who: "employee", label: "Departing employee (optional)", required: false, certificationText: ACK_EMPLOYEE, allowRefusal: true },
      { who: "manager",  label: "Administrator", required: true, certificationText: ACK_MANAGER },
    ],
  },

  // 22. Corrective Action / Write-Up — the unified-framework version of the
  //     stand-alone write-up generator. New write-ups should use this; the
  //     legacy /admin/employees/[id]/writeups/[writeupId] route is kept for
  //     existing finalized records.
  {
    id: "corrective_action",
    label: "Corrective Action / Write-Up",
    blurb: "Document a corrective action — coaching through termination recommendation.",
    pdfTitle: "Employee Corrective Action / Write-Up",
    filenamePrefix: "EmployeeWriteUp",
    defaultFileTab: "corrective_actions",
    confidentiality: "open",
    bulkAssignable: false,
    defaults: { saveToFile: true, visibleToEmployee: true, emailEmployee: false, emailAdminInbox: true },
    sections: [
      {
        title: "Employee & incident",
        fields: [
          { key: "dateIssued", label: "Date write-up issued", type: "date", required: true },
          { key: "incidentDate", label: "Date / time of incident", type: "datetime", required: true },
          { key: "incidentLocation", label: "Location of incident", type: "text" },
          { key: "correctiveActionType", label: "Type of corrective action", type: "select", required: true, options: [
            "Documented verbal counseling",
            "Written warning",
            "Final written warning",
            "Suspension recommendation",
            "Performance improvement plan",
            "Termination recommendation",
            "Other",
          ] },
          { key: "issueCategory", label: "Category of issue", type: "select", required: true, options: [
            "Attendance / tardiness",
            "Performance concern",
            "Policy violation",
            "Safety issue",
            "Conduct / professionalism",
            "Documentation issue",
            "Patient care concern",
            "Equipment / property issue",
            "Insubordination",
            "Confidentiality / HIPAA concern",
            "Workplace behavior",
            "Other",
          ] },
        ],
      },
      {
        title: "Issue details",
        fields: [
          { key: "factualDescription", label: "Factual description of incident", type: "longtext", rows: 6, required: true,
            helpText: "Describe only what was observed, reported, documented, or confirmed. Avoid opinions, labels, or emotional language." },
          { key: "policyViolated", label: "Policy / SOP / expectation violated", type: "longtext", rows: 4, required: true,
            helpText: "Identify the specific policy, SOP, job description duty, or known workplace expectation involved." },
        ],
      },
      {
        title: "Evidence, prior notice, impact",
        fields: [
          { key: "evidenceReviewed", label: "Evidence or sources reviewed", type: "longtext", rows: 3 },
          { key: "priorNoticeOfExpectation", label: "How the employee was previously informed of this expectation", type: "longtext", rows: 3 },
          { key: "priorRelatedDiscipline", label: "Prior related discipline (if applicable)", type: "longtext", rows: 3 },
          { key: "operationalImpact", label: "Operational, safety, or workplace impact", type: "longtext", rows: 3 },
        ],
      },
      {
        title: "Corrective expectations",
        fields: [
          { key: "correctiveExpectations", label: "Corrective expectations going forward", type: "longtext", rows: 4, required: true,
            helpText: "Specific, measurable, and time-bound." },
          { key: "actionPlan", label: "Action plan / remediation steps", type: "longtext", rows: 3 },
          { key: "improvementTimeline", label: "Timeline for improvement", type: "text", required: true },
          { key: "consequencesStatement", label: "Consequences if not corrected", type: "longtext", rows: 3, required: true },
        ],
      },
      {
        title: "Employee response",
        fields: [
          { key: "responseStatus", label: "Response status", type: "select", options: [
            "Provided written response",
            "Declined to provide a response",
            "Will submit response later",
            "Refused to participate",
            "Unavailable at time of review",
          ] },
          { key: "employeeResponseText", label: "Employee statement (if provided)", type: "longtext", rows: 5 },
        ],
      },
    ],
    signatures: [
      { who: "manager",  label: "Issuing supervisor", required: true, certificationText: ACK_MANAGER },
      { who: "employee", label: "Employee", required: true, certificationText: ACK_EMPLOYEE, allowRefusal: true },
      { who: "witness",  label: "Witness (optional)", required: false, certificationText: ACK_EMPLOYEE },
    ],
  },

  // 23. Promotion / Role Change / Assignment
  {
    id: "promotion_role_change",
    label: "Promotion / Role Change",
    blurb: "Document a role change, promotion, or shift assignment change.",
    pdfTitle: "Promotion / Role Change",
    filenamePrefix: "RoleChange",
    defaultFileTab: "personnel_records",
    confidentiality: "open",
    bulkAssignable: false,
    defaults: { saveToFile: true, visibleToEmployee: true, emailEmployee: true, emailAdminInbox: false },
    sections: [
      {
        title: "Change",
        fields: [
          { key: "currentRole", label: "Current role", type: "text", required: true },
          { key: "newRole",     label: "New role / assignment", type: "text", required: true },
          { key: "effectiveDate", label: "Effective date", type: "date", required: true },
          { key: "payStatusChange", label: "Pay or status change (if applicable)", type: "longtext", rows: 2 },
          { key: "reason", label: "Reason for change", type: "longtext", rows: 3 },
          { key: "requiredCredentials", label: "Required credentials / training", type: "longtext", rows: 3 },
          { key: "probationaryReview", label: "Probationary review date (if applicable)", type: "date" },
        ],
      },
    ],
    signatures: [
      { who: "manager",  label: "Administrator", required: true, certificationText: ACK_MANAGER },
      { who: "employee", label: "Employee", required: true, certificationText: ACK_EMPLOYEE },
    ],
  },
];

export function getFormSpec(id: string): FormSpec | null {
  return FORM_REGISTRY.find((f) => f.id === id) ?? null;
}

export function isEmployeeRequestableForm(form: FormSpec): boolean {
  return (form.employeeRequestable ?? form.employeeFillable) === true;
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

/**
 * Maps a form type to a personnel-records severity. Used when the form
 * is saved-to-file and creates a corresponding personnel record, so the
 * record sorts correctly in the personnel dashboard rollups.
 */
export type PersonnelRecordSeverity =
  | "informational" | "coaching" | "minor" | "moderate" | "serious" | "critical";

export function severityForFormType(formType: string): PersonnelRecordSeverity {
  switch (formType) {
    case "harassment_complaint":            return "serious";
    case "corrective_action":               return "moderate";
    case "performance_improvement_plan":    return "moderate";
    case "employee_complaint":              return "minor";
    case "vehicle_accident":                return "moderate";
    case "coaching_note":                   return "coaching";
    case "workplace_injury":                return "informational";
    case "equipment_damage":                return "informational";
    case "controlled_substance_access":     return "informational";
    default:                                return "informational";
  }
}
