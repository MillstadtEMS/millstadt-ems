import { ORGANIZATION_NAME } from "./types";

export const ACCURACY_REPORT_VERSION = "DEV-ACCURACY-2026.08.16.2";

export const ACCURACY_REPORT_INTRO = [
  `Use this form to report a specific concern about the accuracy, attribution, completeness, or presentation of material published by ${ORGANIZATION_NAME}.`,
  `This form is for internal review. It is not an emergency-reporting channel, public-records request process, legal-service process, or guarantee that ${ORGANIZATION_NAME} will remove, change, or republish material.`,
];

export const ACCURACY_IDENTITY_HELP =
  `This form requires identifying information so ${ORGANIZATION_NAME} can follow up, discourage fabricated submissions, and maintain an administrative review record. Your information will not be displayed publicly. This requirement applies only to this voluntary reporting form and does not state that anonymous communication is unlawful.`;

export const ACCURACY_UPLOAD_NOTICE = [
  `Do not upload patient-care reports, protected health information, medical records, Social Security numbers, financial-account information, passwords, or other sensitive personal information unless ${ORGANIZATION_NAME} has specifically requested it through an approved secure process.`,
  "Upload only material that you may lawfully provide.",
];

export const ACCURACY_CERTIFICATION = [
  "I certify that I am submitting this report in good faith; that the factual information I have provided is accurate to the best of my knowledge after reasonable care; and that I have not knowingly submitted materially false information or fabricated, altered, or misrepresented supporting material.",
  "I understand that an honest mistake, disagreement, criticism, opinion, inference, or inability to prove a concern does not by itself mean that I violated this certification.",
];

export const ACCURACY_CONTACT_ACKNOWLEDGMENT =
  `I understand that ${ORGANIZATION_NAME} may contact me to clarify this report and may retain, review, and disclose the submission as described in the Privacy Notice or as otherwise permitted or required by law.`;

export const ACCURACY_PRIVACY_NOTICE = [
  `${ORGANIZATION_NAME} collects the information submitted through this voluntary reporting form to evaluate the concern, contact the reporter when clarification is needed, protect document integrity, and maintain a private administrative review record.`,
  "The record may include the reporter's name, email address, optional telephone number, referenced document, report description, supporting source, protected upload, signature, acknowledgment record, submission time, IP address, user-agent information, review status, and authorized reviewer activity.",
  "The report, reporter identity, supporting upload, private reviewer notes, and resolution record are not published automatically. They are available only to authorized administrators and service providers, and may be retained, reviewed, or disclosed as permitted or required by law.",
  `Do not submit patient information, medical records, account credentials, government identification numbers, or other sensitive personal information unless ${ORGANIZATION_NAME} specifically requests it through an approved secure process.`,
  `${ORGANIZATION_NAME} uses administrative, technical, and physical safeguards appropriate to the information maintained. No internet transmission or storage system can guarantee absolute security.`,
  `Questions regarding information collected through this process may be directed through the published contact channels of ${ORGANIZATION_NAME}.`,
];

export const ACCURACY_REPORT_RESULT =
  `${ORGANIZATION_NAME} received your report. Submission does not establish that the reported material is inaccurate, defamatory, unlawful, or subject to removal. ${ORGANIZATION_NAME} may review the cited source, contact you for clarification, and determine whether correction, clarification, republication, or no action is appropriate.`;

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
