export const ACCURACY_REPORT_VERSION = "DEV-ACCURACY-2026.08.16.3";

export const ACCURACY_REPORT_INTRO = [
  "Report an accuracy or document-integrity concern",
  "Use this form to report a specific concern about the accuracy, attribution, completeness, or presentation of material published by Millstadt Ambulance Service, Millstadt EMS, or Millstadt EMS ESD.",
  "This form is for internal administrative review. It is not an emergency-reporting channel, public-records request process, legal-service process, or guarantee that Millstadt will remove, change, or republish material.",
  "Millstadt may review the submission, request clarification, correct an error when appropriate, or retain the existing publication when the material is accurate or the concern reflects a lawful disagreement, criticism, opinion, or inference.",
];

export const ACCURACY_UPLOAD_NOTICE = [
  "Upload warning",
  "Do not upload patient-care reports, protected health information, medical records, Social Security numbers, financial-account information, passwords, or other sensitive personal information unless Millstadt has specifically requested it through an approved secure process.",
  "Upload only material that you may lawfully provide.",
];

export const ACCURACY_CERTIFICATION = [
  "I certify that I am submitting this report in good faith; that the factual information I have provided is accurate to the best of my knowledge after reasonable care; and that I have not knowingly submitted materially false information or fabricated, altered, or misrepresented supporting material. I understand that an honest mistake, disagreement, criticism, opinion, inference, or inability to prove a concern does not by itself mean that I violated this certification.",
];

export const ACCURACY_REPORT_RESULT =
  "Millstadt may review the submission, request clarification, correct an error when appropriate, or retain the existing publication when the material is accurate or the concern reflects a lawful disagreement, criticism, opinion, or inference.";

export const ACCURACY_REPORT_CATEGORIES = [
  "Possible factual inaccuracy",
  "Incorrect attribution",
  "Incomplete or misleading presentation",
  "Document-integrity concern",
  "Altered or derivative version",
  "Other",
] as const;

export type AccuracyReportCategory = (typeof ACCURACY_REPORT_CATEGORIES)[number];

export const ACCURACY_REPORT_STATUSES = [
  "Received",
  "Under review",
  "Clarification requested",
  "Resolved",
  "No action",
  "Closed",
] as const;

export type AccuracyReportStatus = (typeof ACCURACY_REPORT_STATUSES)[number];

export type AccuracyReportActivity = {
  id: string;
  timestampUtc: string;
  eventType: string;
  administratorId?: string;
  reason: string;
};

export type AccuracyReportUpload = {
  id: string;
  originalFilename: string;
  contentType: string;
  size: number;
  sha256: string;
  scanResult: "passed-development-content-scan";
};

export type AccuracyReportRecord = {
  id: string;
  documentId: string;
  documentTitle: string;
  documentVersion: string;
  sourceUrl: string;
  pageOrSection: string;
  category: AccuracyReportCategory;
  description: string;
  supportingSource: string;
  reporterName: string;
  reporterEmail: string;
  reporterTelephone: string;
  upload?: AccuracyReportUpload;
  acknowledgmentVersion: string;
  acknowledgmentTimestampUtc: string;
  submittedAtUtc: string;
  status: AccuracyReportStatus;
  signatureMethod: "drawn" | "typed";
  signatureName: string;
  signatureCapturedAtUtc: string;
  agreementFilename: string;
  agreementHash: string;
  reviewerNote: string;
  resolution: string;
  flags: string[];
  activity: AccuracyReportActivity[];
};
