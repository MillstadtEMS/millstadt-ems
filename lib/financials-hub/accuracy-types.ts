export const ACCURACY_REPORT_VERSION = "DEV-ACCURACY-2026.08.16.3";

export const ACCURACY_REPORT_INTRO = [
  "Report an accuracy or document-integrity concern",
  "Identify the document and describe the specific concern.",
];

export const ACCURACY_UPLOAD_NOTICE = [
  "Upload warning",
  "Do not upload patient information, medical records, Social Security numbers, account information, passwords, or material you are not authorized to provide.",
];

export const ACCURACY_CERTIFICATION = [
  "I certify that I am submitting this report in good faith and that the information I provided is accurate to the best of my knowledge.",
];

export const ACCURACY_REPORT_RESULT =
  "Your report was submitted for review.";

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
