export const ORGANIZATION_NAME = "Millstadt Ambulance Service / Millstadt EMS";

export const HUB_TITLE = "Millstadt EMS Financial Transparency";

export const PUBLIC_FINANCIALS_PAGE_TITLE = "Financial Transparency";

export const PUBLIC_FINANCIALS_PAGE_SUBTITLE =
  "View, download, enlarge, and print published financial documents without an account or access request.";

export const DEVELOPMENT_STATUS_BANNER =
  "Development environment — synthetic test data only";

export const SYNTHETIC_RECORD_LABEL =
  "SYNTHETIC DEVELOPMENT DATA — NOT A RECORD OF MILLSTADT AMBULANCE SERVICE / MILLSTADT EMS";

export const TERMS_VERSION = "DEV-2026.08.16.4";
export const PRIVACY_VERSION = "DEV-PRIVACY-2026.08.16.3";

export const RESTRICTED_REQUEST_INTRO = [
  "Request access",
];

export const REQUESTER_INFORMATION_NOTICE = [
  "Requester information",
];

export const ACCEPTED_CHECKBOX_TEXT =
  "I reviewed the request terms, confirm that the information I provided is accurate to the best of my knowledge, understand that access requires approval, and agree that my electronic signature authenticates this request.";

export const FINAL_SUBMISSION_CONFIRMATION_TEXT =
  `I authorize ${ORGANIZATION_NAME} to attach my electronic signature to this request.`;

export const ACCEPTED_BUTTON_TEXT = "Submit signed request";

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

export const REQUEST_TERMS_INTRO = "Restricted-document access";

export const REQUEST_TERMS_INTRO_PARAGRAPHS = [
  "This request process applies only to documents identified as restricted. Publicly available Form 990 filings remain accessible without an account, identification, approval, acknowledgment, or signature.",
  `Submitting a request does not guarantee approval. ${ORGANIZATION_NAME} will review each request under applicable policies and law.`,
];

export const REQUEST_TERMS_SECTIONS: RequestTermsSection[] = [
  {
    heading: "Administrative review",
    paragraphs: [
      "Access is subject to administrative review. An approval applies only to the documents, version, requester, release identifier, and access period stated in the approval. Access may expire or be cancelled as stated in the approval or where permitted by applicable law.",
    ],
  },
  {
    heading: "Accurate information",
    paragraphs: [
      "The requester confirms that the information provided is accurate to the best of the requester's knowledge. Knowingly providing materially false or misleading identifying information may result in denial or cancellation of the request, subject to applicable law.",
    ],
  },
  {
    heading: "Electronic signature",
    paragraphs: [
      "By signing and submitting this request, the requester confirms that the requester reviewed these terms, provided the information knowingly, and agrees that the electronic signature is intended to authenticate this submission.",
    ],
  },
  {
    heading: "Document integrity and attribution",
    paragraphs: [
      `A document supplied through this process must not be represented as a different document, a complete record when pages or attachments are missing, or an unaltered ${ORGANIZATION_NAME} record when it has been modified.`,
      `Any excerpt, quotation, summary, transcription, translation, annotation, or other derivative presentation should be identified as such and should not be attributed to ${ORGANIZATION_NAME} as an original or official document unless ${ORGANIZATION_NAME} has expressly issued or approved it.`,
    ],
  },
  {
    heading: "Legal rights",
    paragraphs: [
      `This request process does not waive, limit, or override any right or remedy available under applicable law. It also does not require ${ORGANIZATION_NAME} to disclose information that it may lawfully withhold.`,
      "Nothing in these terms is intended to restrict lawful speech, criticism, reporting, or use of information that the requester lawfully possesses.",
    ],
  },
];

export const REQUEST_ADDITIONAL_TERMS_SECTIONS: RequestTermsSection[] = [
  {
    heading: "AI processing and alteration",
    paragraphs: [
      `${ORGANIZATION_NAME} does not authorize the alteration of an original released document or the creation of an additional file that presents ${ORGANIZATION_NAME}'s data, records, or original expression as an original ${ORGANIZATION_NAME} document.`,
      `No permission or license is granted through this request to modify, reattribute, impersonate, or falsely present a released document. This notice states ${ORGANIZATION_NAME}'s permission and provenance position; it is not a claim that every downstream use is automatically unlawful or that it binds persons who did not agree to these terms.`,
      "Lawful criticism, commentary, reporting, fair use, independent analysis, and other rights available under applicable law are not waived by this notice.",
    ],
  },
  {
    heading: "Copying and technical limitations",
    paragraphs: [
      "The controlled viewer, watermark, logging, and other technical measures are intended to support document administration and provenance. They cannot guarantee that a document will not be copied, photographed, captured, retransmitted, or altered.",
    ],
  },
  {
    heading: "No guarantee of accuracy or completeness outside the released document",
    paragraphs: [
      `${ORGANIZATION_NAME} makes no representation that an excerpt, summary, interpretation, or third-party reproduction accurately reflects the complete released document. The released document and its identified version, pages, date, and release identifier control.`,
    ],
  },
];

export const REQUEST_TERMS_TEXT = [
  "Review request terms",
  REQUEST_TERMS_INTRO,
  ...REQUEST_TERMS_INTRO_PARAGRAPHS,
  ...REQUEST_TERMS_SECTIONS.flatMap((section) => [
    section.heading,
    ...(section.bullets ?? []),
    ...(section.paragraphs ?? []),
  ]),
  "Additional terms and limitations",
  ...REQUEST_ADDITIONAL_TERMS_SECTIONS.flatMap((section) => [
    section.heading,
    ...(section.bullets ?? []),
    ...(section.paragraphs ?? []),
  ]),
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
  `An altered, cropped, incomplete, edited, summarized, transcribed, or reconstructed version should be identified as a modification or derivative and should not be represented as the complete, unaltered record of ${ORGANIZATION_NAME}.`,
];

export const RUN_COUNT_SHORT_FOOTER =
  "MILLSTADT AMBULANCE SERVICE / MILLSTADT EMS RUN-COUNT NOTICE • ESO = PCRs GENERATED; WEBSITE TOTAL = RECORDED DISPATCHES • PRE-2026 FIGURES MAY DIFFER";

export const RUN_COUNT_MEDIUM_FOOTER =
  "MILLSTADT AMBULANCE SERVICE / MILLSTADT EMS RELEASE CALL-VOLUME-REQUESTS | ESO FIGURES COUNT PCRs GENERATED; WEBSITE FIGURES COUNT RECORDED DISPATCH EVENTS | HISTORICAL PRE-2026 CENCOM FIGURES MAY DIFFER DUE TO PRIOR TRACKING METHODS | ALTERED OR INCOMPLETE COPIES ARE NOT THE COMPLETE RECORD OF MILLSTADT AMBULANCE SERVICE / MILLSTADT EMS";
