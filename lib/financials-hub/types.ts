export const ORGANIZATION_NAME = "Millstadt Ambulance Service / Millstadt EMS";

export const HUB_TITLE = "Millstadt EMS Financials and Information Request Hub";

export const PUBLIC_FINANCIALS_PAGE_TITLE = "Financial Information";

export const PUBLIC_FINANCIALS_PAGE_SUBTITLE =
  "Access published Form 990 filings and request access to additional financial documents.";

export const DEVELOPMENT_STATUS_BANNER =
  "Development environment — synthetic test data only";

export const SYNTHETIC_RECORD_LABEL =
  "SYNTHETIC DEVELOPMENT DATA — NOT A RECORD OF MILLSTADT AMBULANCE SERVICE / MILLSTADT EMS";

export const PRODUCTION_NOTICE =
  `The ${ORGANIZATION_NAME} Financials and Information Request Hub is being prepared. The archive and document-access system are not currently available for public use.\n\nThis page does not accept document requests, information requests, applications, uploads, comments, or submissions. No documents are available for viewing through this page at this time.`;

export const TERMS_VERSION = "DEV-2026.08.16.3";
export const AI_NOTICE_VERSION = "DEV-AI-2026.08.16.3";
export const PRIVACY_VERSION = "DEV-PRIVACY-2026.08.16.3";

export const ABOUT_ARCHIVE_NOTICE = [
  "About this archive",
  "This page provides access to published Form 990 filings and information about additional financial documents. Published Form 990 filings may be viewed, printed, and downloaded without an account, identifying information, administrator approval, or acknowledgment.",
  "This page is an archive of available documents. It is not a new information-request portal.",
];

export const RESTRICTED_REQUEST_INTRO = [
  "Request access to a restricted document",
  "The documents selected below are provided through an administrative review process rather than unrestricted public download. Millstadt will review the request and may contact the requester for clarification before making an access decision.",
  "Please provide complete and truthful information so Millstadt can identify the request, communicate with the requester, and maintain an administrative release record.",
  "Where Millstadt may lawfully require identification for the selected document category, knowingly providing materially false or misleading identifying information may result in denial or cancellation of the request.",
  "This process does not apply to published Form 990 filings and does not override any applicable legal right of access.",
];

export const REQUESTER_INFORMATION_NOTICE = [
  "Requester information",
  "Provide the information requested below so Millstadt can identify and communicate about this request. Required fields must be limited to information reasonably necessary for the selected document and administrative release process.",
  "The requester must provide a full name and reliable email address. Retain any existing address or telephone fields only as currently configured by the application or administrator policy.",
];

export const ACCEPTED_CHECKBOX_TEXT =
  "I have read and agree to the Request Terms and Release Notice. I certify that the information I have submitted is accurate to the best of my knowledge and that I have not knowingly provided materially false or misleading information. I understand that Millstadt may contact me for clarification and that submitting a request does not guarantee access unless applicable law requires disclosure.";

export const FINAL_SUBMISSION_CONFIRMATION_TEXT =
  "I am submitting this request electronically under the name shown above, and I authorize Millstadt to include my electronic signature and acknowledged terms in the administrative request record.";

export const ACCEPTED_BUTTON_TEXT = "Sign and submit request";

export type RequestStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "denied"
  | "revoked"
  | "expired";

export type DocCategory = "Financial report" | "Budget" | "Audit" | "Operational";

export type AccessRequestKind =
  | "published_document_access"
  | "new_information_request"
  | "mixed";

export type SyntheticDocument = {
  id: string;
  title: string;
  filename: string;
  category: DocCategory;
  version: string;
  publicationDate: string;
  originalHash: string;
  pages: string[];
};

export type CatalogDocument = Omit<SyntheticDocument, "pages"> & {
  pageCount: number;
  accessStatement: string;
};

export type AccessRequestRecord = {
  id: string;
  userId: string;
  requestKind: AccessRequestKind;
  fullLegalName: string;
  mailingAddress: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  verifiedEmail: string;
  selectedDocIds: string[];
  selectedDocumentVersions: Record<string, string>;
  requestedInformationDescription: string;
  approvedDocIds: string[];
  status: RequestStatus;
  submittedAtUtc: string;
  termsVersion: string;
  aiNoticeVersion: string;
  privacyVersion: string;
  acceptedCheckboxText: string;
  acceptedButtonText: string;
  acceptedAtUtc: string;
  termsAcknowledged: boolean;
  signatureFullName: string;
  signatureMethod?: "drawn" | "typed";
  signatureName?: string;
  signatureCapturedAtUtc?: string;
  finalSubmissionConfirmationText: string;
  finalSubmissionConfirmedAtUtc: string;
  agreementFilename?: string;
  agreementHash?: string;
  signedCopyRequested: boolean;
  requestVersion: string;
  reviewedBy?: string;
  reviewedAtUtc?: string;
  reviewReason?: string;
  expirationAtUtc?: string;
  releaseIds: string[];
  flags: string[];
};

export type AuditEvent = {
  id: string;
  eventType: string;
  timestampUtc: string;
  userId: string;
  administratorId?: string;
  requestId?: string;
  documentId?: string;
  documentVersion?: string;
  releaseId?: string;
  termsVersion?: string;
  privacyVersion?: string;
  aiNoticeVersion?: string;
  ipAddress: string;
  userAgent: string;
  result: "allowed" | "blocked" | "recorded";
  reason: string;
  documentHash?: string;
};

export type ViewerSession = {
  id: string;
  userId: string;
  requestId: string;
  documentId: string;
  documentVersion: string;
  releaseId: string;
  createdAtUtc: string;
  expiresAtUtc: string;
  individualizedHash: string;
};

export type RequestTermsSection = {
  heading: string;
  bullets?: string[];
  paragraphs?: string[];
};

export const REQUEST_TERMS_INTRO =
  "Before submitting this request, review the following information.";

export const REQUEST_TERMS_SECTIONS: RequestTermsSection[] = [
  {
    heading: "Administrative review",
    bullets: [
      "Submission of a request does not guarantee access unless disclosure is otherwise required by applicable law.",
      "Millstadt may request clarification before making an access decision.",
      "An approved release may be limited to the selected documents, version, viewing period, and conditions identified by Millstadt.",
      "Millstadt may maintain an administrative record of the request, decision, release version, release identifier, and related communications.",
    ],
  },
  {
    heading: "Accuracy of submitted information",
    bullets: [
      "The requester must provide information that is accurate to the best of the requester’s knowledge.",
      "Knowingly providing materially false or misleading information may result in denial or cancellation of the request.",
      "A good-faith mistake, disagreement, criticism, opinion, inference, or inability to establish a concern does not by itself constitute knowingly false information.",
    ],
  },
  {
    heading: "Document presentation and provenance",
    bullets: [
      "The released document may contain a release identifier, document version, release date, page numbering, watermark, or other provenance information.",
      "A cropped, edited, annotated, transcribed, summarized, or otherwise modified version should not be represented as a complete or unaltered original Millstadt record.",
      "These provisions address attribution and provenance. They do not prohibit lawful criticism, commentary, journalism, reporting, political speech, or other lawful discussion.",
    ],
  },
  {
    heading: "AI and automated processing",
    bullets: [
      "To the extent Millstadt has authority to grant or withhold permission, the release does not authorize downstream AI or automated processing for the uses described in the AI-processing notice below.",
      "No permission or license is granted by the notice for those uses, except as required by law or separately authorized in writing.",
      "The notice states Millstadt’s permission and provenance position. It does not represent that it automatically binds every AI provider, automated system, or third party.",
    ],
  },
  {
    heading: "Technical viewing controls",
    bullets: [
      "Technical viewing controls are intended to manage the approved viewing session.",
      "They are not a guarantee that the document cannot be copied, captured, photographed, transcribed, or otherwise reproduced.",
    ],
  },
  {
    heading: "Applicable rights",
    paragraphs: [
      "Nothing in this request process is intended to waive, limit, or override an access right or other right that applies under law.",
    ],
  },
];

export const AI_PROCESSING_NOTICE_INTRO =
  "To the extent Millstadt Ambulance Service, Millstadt EMS, or Millstadt EMS ESD has authority to grant or withhold permission, Millstadt does not authorize downstream use of this released document or its contents for artificial-intelligence or automated processing, including:";

export const AI_PROCESSING_USES = [
  "reading or extracting the document for automated processing;",
  "automated summarization or analysis;",
  "model training or machine-learning training;",
  "inclusion in an AI dataset, model-training corpus, or public data repository;",
  "ingestion into a public vector database, retrieval system, knowledge base, or similar repository;",
  "creation of embeddings or other machine-readable representations;",
  "redistribution to a data broker or similar data repository;",
  "automated alteration, manipulation, or transformation; or",
  "creation of a modified or derivative file presented as an original Millstadt record.",
];

export const AI_PROCESSING_NOTICE_CONCLUSION = [
  "No permission or license is granted by this notice for those uses, except as required by law or separately authorized in writing.",
  "This notice states Millstadt’s permission and provenance position. It does not represent that the notice independently binds every AI provider, automated system, or third party. It does not restrict lawful criticism, commentary, journalism, reporting, political speech, research, or other lawful discussion.",
];

export const AI_PROCESSING_NOTICE = [
  "AI-processing notice",
  AI_PROCESSING_NOTICE_INTRO,
  ...AI_PROCESSING_USES,
  ...AI_PROCESSING_NOTICE_CONCLUSION,
];

export const PROVENANCE_NOTICE = [
  "Provenance and altered copies",
  "This release is identified by the release ID, document version, and release date shown on the document.",
  "A cropped, edited, annotated, transcribed, summarized, or otherwise modified version is not the complete, unaltered released copy and should not be represented as a complete or unaltered Millstadt Ambulance Service, Millstadt EMS, or Millstadt EMS ESD record.",
  "Excerpts should retain material context and should not be presented as the complete record when they are not. This notice addresses attribution and provenance. It does not prohibit lawful criticism, commentary, journalism, reporting, political speech, or other lawful discussion.",
];

export const CONTROLLED_VIEWING_NOTICE = [
  "Controlled viewing notice",
  "This document is being provided through an administrator-approved viewing session. The document version, release date, and release identifier may be recorded for security and provenance purposes.",
  "Technical viewing controls are intended to manage the approved viewing session. They are not a guarantee that the document cannot be copied, captured, photographed, transcribed, or otherwise reproduced.",
];

export const REQUEST_TERMS_TEXT = [
  "Review request terms",
  REQUEST_TERMS_INTRO,
  ...REQUEST_TERMS_SECTIONS.flatMap((section) => [
    section.heading,
    ...(section.bullets ?? []),
    ...(section.paragraphs ?? []),
  ]),
  ...AI_PROCESSING_NOTICE,
  ...PROVENANCE_NOTICE,
];

export const RUN_COUNT_METHODOLOGY_NOTICE = [
  "Run-Number, Dispatch, and Patient-Care-Report Methodology Notice",
  `This document bundle contains run-number, dispatch, and patient-care-report information relating to ${ORGANIZATION_NAME} for calendar years 2022, 2023, 2024, 2025, and 2026 through August 13, 2026.`,
  "The figures in this bundle represent different types of operational information and should not be treated as identical or directly interchangeable without considering the definitions and limitations described below.",
  "ESO patient-care-report figures represent the number of patient care reports, or PCRs, generated in ESO during the applicable period. An ESO PCR count is an administrative record count. It is not necessarily a count of unique dispatches, unique incidents, unique patients, transports, ambulance responses, CENCOM call numbers, or individual run numbers.",
  `Website dispatch-tracking figures represent dispatch events recorded in the ${ORGANIZATION_NAME} website call-volume reporting export reflected in the source PDFs for the applicable period. The website dispatch-tracking system is maintained separately from the ESO patient-care-report system. The two systems use different records and counting methods.`,
  `The term “independently verified” should not be used for these figures unless ${ORGANIZATION_NAME} has separately completed and documented an independent reconciliation against identified source records.`,
  `Before January 1, 2026, CENCOM’s records and tracking practices did not consistently identify or maintain individual ${ORGANIZATION_NAME} run numbers in the same manner as the current website dispatch-tracking system. CENCOM-related call numbers, historical run numbers, website dispatch totals, and ESO PCR counts for periods before January 1, 2026, may differ and should not be treated as exact equivalents.`,
  "A difference between these figures does not, by itself, establish that a dispatch, call, patient-care report, transport, or run was omitted or improperly counted. Differences may reflect numbering conventions, dispatch-recording practices, system fields, reporting periods, data-entry practices, corrections or adjustments, the distinction between dispatches and PCRs, or the transition between recordkeeping systems.",
  `The figures should be quoted and characterized according to the definitions above. A person reviewing, quoting, reproducing, or distributing this material should not knowingly combine different categories of counts and present the result as a single undifferentiated total, omit a material limitation in a manner that creates a materially misleading impression about what a number measures, or identify ${ORGANIZATION_NAME} as the author, verifier, approver, or source of a modified or generated version that ${ORGANIZATION_NAME} did not create or approve.`,
  "This notice does not state that every discrepancy, error, estimate, inference, opinion, criticism, or unfavorable characterization is unlawful or defamatory. It does not restrict lawful criticism, commentary, journalism, quotation, political speech, public discussion, good-faith disagreement, or other use protected by applicable law.",
  "This bundle is intended to contain operational counts and run-number information, not medical or patient-specific information. Medical and patient-specific information must not be included in the public bundle merely because it appears in an underlying dispatch or ESO record.",
  `An altered, cropped, incomplete, edited, summarized, transcribed, reconstructed, or AI-generated version should be identified as a modification or derivative and should not be represented as the complete, unaltered record of ${ORGANIZATION_NAME}.`,
];

export const RUN_COUNT_SHORT_FOOTER =
  "MILLSTADT AMBULANCE SERVICE / MILLSTADT EMS RUN-COUNT NOTICE • ESO = PCRs GENERATED; WEBSITE TOTAL = RECORDED DISPATCHES • PRE-2026 FIGURES MAY DIFFER";

export const RUN_COUNT_MEDIUM_FOOTER =
  "MILLSTADT AMBULANCE SERVICE / MILLSTADT EMS RELEASE CALL-VOLUME-REQUESTS | ESO FIGURES COUNT PCRs GENERATED; WEBSITE FIGURES COUNT RECORDED DISPATCH EVENTS | HISTORICAL PRE-2026 CENCOM FIGURES MAY DIFFER DUE TO PRIOR TRACKING METHODS | ALTERED OR INCOMPLETE COPIES ARE NOT THE COMPLETE RECORD OF MILLSTADT AMBULANCE SERVICE / MILLSTADT EMS";
