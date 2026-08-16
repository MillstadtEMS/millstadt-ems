import { createHash, randomBytes } from "crypto";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { signedAgreementPdf, type AgreementSignature } from "./agreement-pdf";
import {
  ACCEPTED_BUTTON_TEXT,
  ACCEPTED_CHECKBOX_TEXT,
  AI_NOTICE_VERSION,
  PRIVACY_VERSION,
  RUN_COUNT_METHODOLOGY_NOTICE,
  SYNTHETIC_RECORD_LABEL,
  TERMS_VERSION,
  type AccessRequestRecord,
  type AuditEvent,
  type CatalogDocument,
  type RequestStatus,
  type SyntheticDocument,
  type ViewerSession,
} from "./types";

export const DEVELOPMENT_ADMIN_ID = "MAS-DEV-ADMIN";

export class FinancialsHubError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "FinancialsHubError";
    this.status = status;
  }
}

type AuditContext = {
  ipAddress: string;
  userAgent: string;
};

type CreateRequestInput = {
  idempotencyKey?: unknown;
  fullLegalName?: unknown;
  mailingAddress?: unknown;
  addressLine2?: unknown;
  city?: unknown;
  state?: unknown;
  postalCode?: unknown;
  verifiedEmail?: unknown;
  selectedDocIds?: unknown;
  requestedInformationDescription?: unknown;
  acceptedCheckboxText?: unknown;
  acceptedButtonText?: unknown;
  signatureMethod?: unknown;
  signatureDataUrl?: unknown;
  signatureTypedName?: unknown;
};

type AdminDecisionInput = {
  approvedDocIds?: unknown;
  expirationAtUtc?: unknown;
  reviewReason?: unknown;
  expectedStatus?: unknown;
  expectedRequestVersion?: unknown;
};

type Store = {
  requests: AccessRequestRecord[];
  sessions: ViewerSession[];
  auditEvents: AuditEvent[];
  agreements: Map<string, Buffer>;
  idempotencyKeys: Map<string, { requestId: string; payloadHash: string }>;
  submissionRateLimits: Map<string, number[]>;
};

const VIEWER_SESSION_MINUTES = 20;
const DEFAULT_APPROVAL_DAYS = 30;
const ACCESS_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const ACCESS_RATE_LIMIT_MAX = 5;
const CALL_VOLUME_DOCUMENT_ID = "CALL-VOLUME-REQUESTS-2022-2026";
const CALL_VOLUME_BUNDLE_PDF = path.join(
  process.cwd(),
  "data",
  "financials-hub",
  "call-volume-requests.pdf",
);
const CALL_VOLUME_BUNDLE_TEXT = path.join(
  process.cwd(),
  "data",
  "financials-hub",
  "call-volume-requests.txt",
);

const RAW_SYNTHETIC_DOCUMENTS = [
  {
    id: "SYN-2026-FIN-001",
    title: "Synthetic Annual Financial Report",
    filename: "SYNTHETIC_TEST_FINANCIAL_REPORT.pdf",
    category: "Financial report",
    version: "1.0",
    publicationDate: "2026-08-16",
    pages: [
      `${SYNTHETIC_RECORD_LABEL}\n\nPrototype annual financial report page with invented receipt totals, disbursement totals, reserve balances, and reconciliation notes. These figures are not Millstadt Ambulance Service financial records.`,
      `${SYNTHETIC_RECORD_LABEL}\n\nPrototype line-item schedule for controlled-viewer testing. Values, dates, vendors, and notes are invented so watermarking, authorization, and audit logging can be demonstrated without real records.`,
    ],
  },
  {
    id: "SYN-2026-BUD-001",
    title: "Synthetic Operating Budget",
    filename: "SYNTHETIC_TEST_BUDGET.pdf",
    category: "Budget",
    version: "1.0",
    publicationDate: "2026-08-16",
    pages: [
      `${SYNTHETIC_RECORD_LABEL}\n\nPrototype operating budget page with sample categories, sample projected totals, and sample notes. This is generated development data only.`,
      `${SYNTHETIC_RECORD_LABEL}\n\nPrototype capital planning schedule. The retained synthetic original remains separate from individualized viewing sessions.`,
    ],
  },
  {
    id: "SYN-2026-AUD-001",
    title: "Synthetic Audit Summary",
    filename: "SYNTHETIC_TEST_AUDIT_RECORD.pdf",
    category: "Audit",
    version: "1.0",
    publicationDate: "2026-08-16",
    pages: [
      `${SYNTHETIC_RECORD_LABEL}\n\nPrototype audit summary for request, approval, revocation, and expiration testing. No real names, addresses, email addresses, IP logs, or unreleased materials are used.`,
      `${SYNTHETIC_RECORD_LABEL}\n\nPrototype access-event table. This page exists only to test page navigation, release identifiers, and provenance notices.`,
    ],
  },
  {
    id: "CALL-VOLUME-REQUESTS-2022-2026",
    title: "Call Volume Requests",
    filename: "call-volume-requests.pdf",
    category: "Operational",
    version: "2026.08.16",
    publicationDate: "2026-08-16",
    pages: callVolumeBundlePages(),
  },
] satisfies Omit<SyntheticDocument, "originalHash">[];

export const SYNTHETIC_DOCUMENTS: SyntheticDocument[] = RAW_SYNTHETIC_DOCUMENTS.map(
  (doc) => ({
    ...doc,
    originalHash:
      doc.id === CALL_VOLUME_DOCUMENT_ID && existsSync(CALL_VOLUME_BUNDLE_PDF)
        ? `sha256:${createHash("sha256").update(readFileSync(CALL_VOLUME_BUNDLE_PDF)).digest("hex")}`
        : `sha256:${sha256(doc.pages.join("\n\n---PAGE---\n\n"))}`,
  }),
);

const seedRequest: AccessRequestRecord = {
  id: "DEV-REQ-SEED-001",
  userId: "MAS-DEV-USER-FLAGGED",
  requestKind: "published_document_access",
  fullLegalName: "Anonymous Test User",
  mailingAddress: "123 Placeholder Lane",
  addressLine2: "",
  city: "Testville",
  state: "IL",
  postalCode: "00000",
  verifiedEmail: "anonymous@example.test",
  selectedDocIds: ["SYN-2026-FIN-001"],
  selectedDocumentVersions: { "SYN-2026-FIN-001": "1.0" },
  requestedInformationDescription: "",
  approvedDocIds: [],
  status: "pending",
  submittedAtUtc: "2026-08-16T14:00:00.000Z",
  termsVersion: TERMS_VERSION,
  aiNoticeVersion: AI_NOTICE_VERSION,
  privacyVersion: PRIVACY_VERSION,
  acceptedCheckboxText: ACCEPTED_CHECKBOX_TEXT,
  acceptedButtonText: ACCEPTED_BUTTON_TEXT,
  acceptedAtUtc: "2026-08-16T14:00:00.000Z",
  requestVersion: "sha256:dev-seed-request-version",
  releaseIds: [],
  flags: [
    "Name appears anonymous or placeholder-like.",
    "Email domain is reserved for testing.",
    "Phone or identity details are not independently verified in this prototype.",
    "Address appears placeholder-like.",
  ],
};

const seedAudit: AuditEvent[] = [
  {
    id: "AUD-SEED-001",
    eventType: "access_request_submitted",
    timestampUtc: "2026-08-16T14:00:00.000Z",
    userId: seedRequest.userId,
    requestId: seedRequest.id,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    aiNoticeVersion: AI_NOTICE_VERSION,
    ipAddress: "127.0.0.1",
    userAgent: "Synthetic development seed",
    result: "recorded",
    reason: "Seeded synthetic flagged application loaded for local development review.",
  },
];

const globalStore = globalThis as typeof globalThis & {
  __millstadtFinancialsHubDevStore?: Store;
};

function callVolumeBundlePages() {
  if (existsSync(CALL_VOLUME_BUNDLE_TEXT)) {
    const text = readFileSync(CALL_VOLUME_BUNDLE_TEXT, "utf8");
    const pages = text
      .split("\n--- MILLSTADT EMS PAGE BREAK ---\n")
      .map((page) => page.trim())
      .filter(Boolean);
    if (pages.length) return pages;
  }

  return [
    [
      "Call Volume Requests",
      "",
      ...RUN_COUNT_METHODOLOGY_NOTICE,
      "",
      "The source PDF bundle has not been generated in this local workspace yet.",
    ].join("\n"),
  ];
}

function store() {
  if (!globalStore.__millstadtFinancialsHubDevStore) {
    globalStore.__millstadtFinancialsHubDevStore = {
      requests: [{ ...seedRequest }],
      sessions: [],
      auditEvents: [...seedAudit],
      agreements: new Map(),
      idempotencyKeys: new Map(),
      submissionRateLimits: new Map(),
    };
  }
  if (!globalStore.__millstadtFinancialsHubDevStore.agreements) {
    globalStore.__millstadtFinancialsHubDevStore.agreements = new Map();
  }
  if (!globalStore.__millstadtFinancialsHubDevStore.idempotencyKeys) {
    globalStore.__millstadtFinancialsHubDevStore.idempotencyKeys = new Map();
  }
  if (!globalStore.__millstadtFinancialsHubDevStore.submissionRateLimits) {
    globalStore.__millstadtFinancialsHubDevStore.submissionRateLimits = new Map();
  }
  return globalStore.__millstadtFinancialsHubDevStore;
}

export function resetDevelopmentStore() {
  globalStore.__millstadtFinancialsHubDevStore = {
    requests: [{ ...seedRequest }],
    sessions: [],
    auditEvents: [...seedAudit],
    agreements: new Map(),
    idempotencyKeys: new Map(),
    submissionRateLimits: new Map(),
  };
  return snapshot();
}

export function snapshot() {
  expireOverdueRequests();
  const current = store();
  return {
    requests: current.requests,
    sessions: current.sessions,
    auditEvents: current.auditEvents,
  };
}

export function catalog(): CatalogDocument[] {
  return SYNTHETIC_DOCUMENTS.map(({ pages, ...doc }) => ({
    ...doc,
    pageCount: pages.length,
    accessStatement: "Access requires administrator approval.",
  }));
}

export function requestForUser(userId: string) {
  expireOverdueRequests();
  return store().requests.filter((request) => request.userId === userId);
}

export function createAccessRequest(input: CreateRequestInput, context: AuditContext) {
  const errors = validateRequestInput(input);
  if (errors.length) {
    recordAudit({
      eventType: "access_request_submitted",
      userId: "MAS-DEV-UNKNOWN",
      result: "blocked",
      reason: errors.join(" "),
      context,
    });
    throw new FinancialsHubError(errors.join(" "), 400);
  }

  const current = store();
  const idempotencyKey = cleanString(input.idempotencyKey);
  const payloadHash = requestPayloadHash(input);
  const existing = current.idempotencyKeys.get(idempotencyKey);
  if (existing) {
    if (existing.payloadHash !== payloadHash) {
      throw new FinancialsHubError(
        "This request retry does not match the original submission.",
        409,
      );
    }
    const existingRequest = current.requests.find(
      (request) => request.id === existing.requestId,
    );
    if (!existingRequest) {
      throw new FinancialsHubError("The original request could not be restored.", 409);
    }
    return { request: existingRequest, created: false as const };
  }

  checkAccessRequestRateLimit(context.ipAddress);
  const selectedDocIds = Array.from(new Set(stringArray(input.selectedDocIds)));
  const signature = signatureFromInput(input);
  const requestedInformationDescription = "";
  const now = new Date().toISOString();
  const userId = `MAS-DEV-USER-${randomToken(32)}`;
  const selectedDocuments = selectedDocIds
    .map((documentId) => findDocument(documentId))
    .filter((document): document is SyntheticDocument => Boolean(document));
  const selectedDocumentVersions = Object.fromEntries(
    selectedDocuments.map((document) => [document.id, document.version]),
  );
  const request: AccessRequestRecord = {
    id: `DEV-REQ-${randomToken(10)}`,
    userId,
    requestKind: "published_document_access",
    fullLegalName: limitedString(input.fullLegalName, 160),
    mailingAddress: limitedString(input.mailingAddress, 220),
    addressLine2: limitedString(input.addressLine2, 120),
    city: limitedString(input.city, 120),
    state: limitedString(input.state, 30).toUpperCase(),
    postalCode: limitedString(input.postalCode, 10),
    verifiedEmail: limitedString(input.verifiedEmail, 254).toLowerCase(),
    selectedDocIds,
    selectedDocumentVersions,
    requestedInformationDescription,
    approvedDocIds: [],
    status: "pending",
    submittedAtUtc: now,
    termsVersion: TERMS_VERSION,
    aiNoticeVersion: AI_NOTICE_VERSION,
    privacyVersion: PRIVACY_VERSION,
    acceptedCheckboxText: ACCEPTED_CHECKBOX_TEXT,
    acceptedButtonText: ACCEPTED_BUTTON_TEXT,
    acceptedAtUtc: now,
    requestVersion: `sha256:${sha256(`${payloadHash}|${now}`)}`,
    signatureMethod: signature.method,
    signatureName: signature.name,
    signatureCapturedAtUtc: now,
    releaseIds: [],
    flags: flagSubmission(input),
  };

  const agreement = signedAgreementPdf(request, selectedDocuments, signature);
  request.agreementFilename = `Millstadt-EMS-${request.id}-signed-agreement.pdf`;
  request.agreementHash = `sha256:${sha256(agreement)}`;

  current.requests.unshift(request);
  current.agreements.set(request.id, agreement);
  current.idempotencyKeys.set(idempotencyKey, { requestId: request.id, payloadHash });
  recordAccessRequestRateLimit(context.ipAddress);
  recordAudit({
    eventType: "account_created",
    userId,
    requestId: request.id,
    result: "recorded",
    reason: "Development account created by synthetic test bypass.",
    context,
  });
  recordAudit({
    eventType: "email_verified",
    userId,
    requestId: request.id,
    result: "recorded",
    reason: "Development email verification bypass recorded for synthetic prototype.",
    context,
  });
  recordAudit({
    eventType: "terms_accepted",
    userId,
    requestId: request.id,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    aiNoticeVersion: AI_NOTICE_VERSION,
    result: "recorded",
    reason: "Signed electronic acknowledgment recorded.",
    context,
  });
  recordAudit({
    eventType: "signature_captured",
    userId,
    requestId: request.id,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    aiNoticeVersion: AI_NOTICE_VERSION,
    documentHash: request.agreementHash,
    result: "recorded",
    reason: `${signature.method === "drawn" ? "Drawn" : "Typed"} electronic signature captured and signed agreement PDF generated.`,
    context,
  });
  recordAudit({
    eventType: "access_request_submitted",
    userId,
    requestId: request.id,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    aiNoticeVersion: AI_NOTICE_VERSION,
    result: "recorded",
    reason: `Submitted access request for ${selectedDocIds.length} listed document(s).`,
    context,
  });

  return { request, created: true as const };
}

export function approveAccessRequest(
  requestId: string,
  input: AdminDecisionInput,
  context: AuditContext,
) {
  const current = store();
  const request = findRequest(requestId);
  assertAdminDecision(request, input, ["pending", "under_review"]);
  const approvedDocIds = stringArray(input.approvedDocIds).filter((documentId) =>
    request.selectedDocIds.includes(documentId),
  );
  if (!approvedDocIds.length) {
    throw new FinancialsHubError("Approve at least one requested document.", 400);
  }
  for (const documentId of approvedDocIds) {
    const document = findDocument(documentId);
    if (!document || request.selectedDocumentVersions[documentId] !== document.version) {
      throw new FinancialsHubError(
        "A requested document changed after submission. A new signed request is required.",
        409,
      );
    }
  }
  const expirationAtUtc =
    cleanString(input.expirationAtUtc) || futureIsoDate(DEFAULT_APPROVAL_DAYS);
  if (!Number.isFinite(Date.parse(expirationAtUtc)) || Date.parse(expirationAtUtc) <= Date.now()) {
    throw new FinancialsHubError("Choose a future approval expiration date.", 400);
  }
  const updated: AccessRequestRecord = {
    ...request,
    status: "approved",
    approvedDocIds,
    reviewedBy: DEVELOPMENT_ADMIN_ID,
    reviewedAtUtc: new Date().toISOString(),
    reviewReason: cleanString(input.reviewReason),
    expirationAtUtc,
  };
  current.requests = current.requests.map((item) =>
    item.id === requestId ? updated : item,
  );
  recordAudit({
    eventType: "approval_granted",
    userId: updated.userId,
    administratorId: DEVELOPMENT_ADMIN_ID,
    requestId: updated.id,
    result: "recorded",
    reason: `Approved ${approvedDocIds.length} listed document(s).`,
    context,
  });
  return updated;
}

export function denyAccessRequest(
  requestId: string,
  input: AdminDecisionInput,
  context: AuditContext,
) {
  const current = store();
  const request = findRequest(requestId);
  assertAdminDecision(request, input, ["pending", "under_review"]);
  const updated = updateStatus(request, "denied", input);
  current.requests = current.requests.map((item) =>
    item.id === requestId ? updated : item,
  );
  recordAudit({
    eventType: "approval_denied",
    userId: request.userId,
    administratorId: DEVELOPMENT_ADMIN_ID,
    requestId,
    result: "recorded",
    reason: updated.reviewReason || "Development administrator denied access.",
    context,
  });
  return updated;
}

export function revokeAccessRequest(
  requestId: string,
  input: AdminDecisionInput,
  context: AuditContext,
) {
  const current = store();
  const request = findRequest(requestId);
  assertAdminDecision(request, input, ["approved"]);
  const updated = updateStatus(request, "revoked", input);
  current.requests = current.requests.map((item) =>
    item.id === requestId ? updated : item,
  );
  current.sessions = current.sessions.filter((session) => session.requestId !== requestId);
  recordAudit({
    eventType: "approval_revoked",
    userId: request.userId,
    administratorId: DEVELOPMENT_ADMIN_ID,
    requestId,
    result: "recorded",
    reason: updated.reviewReason || "Development administrator revoked access.",
    context,
  });
  return updated;
}

export function expireAccessRequest(
  requestId: string,
  input: AdminDecisionInput,
  context: AuditContext,
) {
  const current = store();
  const request = findRequest(requestId);
  assertAdminDecision(request, input, ["approved"]);
  const updated = updateStatus(request, "expired", input);
  current.requests = current.requests.map((item) =>
    item.id === requestId ? updated : item,
  );
  current.sessions = current.sessions.filter((session) => session.requestId !== requestId);
  recordAudit({
    eventType: "approval_expired",
    userId: request.userId,
    administratorId: DEVELOPMENT_ADMIN_ID,
    requestId,
    result: "recorded",
    reason: updated.reviewReason || "Development administrator expired access.",
    context,
  });
  return updated;
}

export function createViewerSession(input: {
  requestId?: unknown;
  documentId?: unknown;
  userId?: unknown;
}, context: AuditContext) {
  expireOverdueRequests();
  const requestId = cleanString(input.requestId);
  const documentId = cleanString(input.documentId);
  const userId = cleanString(input.userId);
  const request = store().requests.find((item) => item.id === requestId);
  const doc = findDocument(documentId);

  if (
    !request ||
    !doc ||
    request.userId !== userId ||
    request.status !== "approved" ||
    !request.approvedDocIds.includes(documentId) ||
    request.selectedDocumentVersions[documentId] !== doc.version ||
    isExpired(request.expirationAtUtc)
  ) {
    recordAudit({
      eventType: "document_access_denied",
      userId: userId || "MAS-DEV-UNKNOWN",
      requestId,
      documentId,
      result: "blocked",
      reason: "Viewer session blocked by authorization, revocation, or expiration check.",
      context,
    });
    throw new FinancialsHubError("Document access is not approved.", 403);
  }

  const now = new Date();
  const releaseId = `MAS-DEV-${utcDateStamp(now)}-${randomToken(8)}`;
  const session: ViewerSession = {
    id: `DEV-VIEW-${randomToken(10)}`,
    userId,
    requestId,
    documentId,
    documentVersion: doc.version,
    releaseId,
    createdAtUtc: now.toISOString(),
    expiresAtUtc: new Date(
      now.getTime() + VIEWER_SESSION_MINUTES * 60 * 1000,
    ).toISOString(),
    individualizedHash: `sha256:${sha256(`${doc.originalHash}|${releaseId}|${userId}|${now.toISOString()}`)}`,
  };

  const current = store();
  current.sessions.unshift(session);
  current.requests = current.requests.map((item) =>
    item.id === requestId
      ? { ...item, releaseIds: Array.from(new Set([releaseId, ...item.releaseIds])) }
      : item,
  );

  recordAudit({
    eventType: "viewer_session_created",
    userId,
    requestId,
    documentId,
    documentVersion: doc.version,
    releaseId,
    documentHash: session.individualizedHash,
    result: "allowed",
    reason: "Short-lived synthetic viewer session created.",
    context,
  });
  recordAudit({
    eventType: "document_view_started",
    userId,
    requestId,
    documentId,
    documentVersion: doc.version,
    releaseId,
    documentHash: session.individualizedHash,
    result: "allowed",
    reason: "Controlled viewer opened.",
    context,
  });

  return session;
}

export function getViewerPage(input: {
  sessionId: string;
  pageNumber: number;
  userId: string;
}, context: AuditContext) {
  expireOverdueRequests();
  const current = store();
  const session = current.sessions.find((item) => item.id === input.sessionId);
  const request = session
    ? current.requests.find((item) => item.id === session.requestId)
    : undefined;
  const doc = session ? findDocument(session.documentId) : undefined;

  if (
    !session ||
    !request ||
    !doc ||
    session.userId !== input.userId ||
    isExpired(session.expiresAtUtc) ||
    request.status !== "approved" ||
    !request.approvedDocIds.includes(session.documentId) ||
    request.selectedDocumentVersions[session.documentId] !== doc.version ||
    session.documentVersion !== doc.version ||
    isExpired(request.expirationAtUtc)
  ) {
    recordAudit({
      eventType: isExpired(session?.expiresAtUtc) ? "viewer_session_expired" : "document_access_denied",
      userId: input.userId || session?.userId || "MAS-DEV-UNKNOWN",
      requestId: request?.id,
      documentId: session?.documentId,
      releaseId: session?.releaseId,
      result: "blocked",
      reason: "Viewer page blocked by session, revocation, expiration, or authorization check.",
      context,
    });
    throw new FinancialsHubError("Viewer session is not authorized.", 403);
  }

  const pageIndex = input.pageNumber - 1;
  if (pageIndex < 0 || pageIndex >= doc.pages.length) {
    throw new FinancialsHubError("Page not found.", 404);
  }

  const viewedAtUtc = new Date().toISOString();
  const watermark = `MILLSTADT EMS RELEASE ${session.releaseId} • AUTHORIZED VIEWER ${request.fullLegalName} • AI PROCESSING NOT AUTHORIZED BY MILLSTADT • ALTERED COPIES ARE NOT ORIGINAL MILLSTADT RECORDS`;
  const footerText = `MILLSTADT EMS RELEASE ${session.releaseId} | AUTHORIZED VIEWER ${request.fullLegalName} | DOCUMENT ${doc.id} | VERSION ${doc.version} | PAGE ${input.pageNumber} OF ${doc.pages.length} | VIEWED ${viewedAtUtc}`;

  recordAudit({
    eventType: "document_page_viewed",
    userId: session.userId,
    requestId: request.id,
    documentId: doc.id,
    documentVersion: doc.version,
    releaseId: session.releaseId,
    documentHash: session.individualizedHash,
    result: "allowed",
    reason: `Viewed page ${input.pageNumber} of ${doc.pages.length}.`,
    context,
  });

  return {
    session,
    document: {
      id: doc.id,
      title: doc.title,
      version: doc.version,
      publicationDate: doc.publicationDate,
      originalHash: doc.originalHash,
      individualizedHash: session.individualizedHash,
      pageCount: doc.pages.length,
    },
    pageNumber: input.pageNumber,
    pageText: doc.pages[pageIndex],
    viewedAtUtc,
    watermark,
    footerText,
  };
}

export function accessForDocument(input: { documentId: string; userId: string }) {
  expireOverdueRequests();
  const request = store().requests.find(
    (item) =>
      item.userId === input.userId &&
      item.status === "approved" &&
      item.approvedDocIds.includes(input.documentId) &&
      !isExpired(item.expirationAtUtc),
  );
  return {
    authorized: !!request,
    requestId: request?.id ?? null,
    status: request?.status ?? "pending",
  };
}

export function auditEvents() {
  return store().auditEvents;
}

export function getAccessRequest(requestId: string) {
  return store().requests.find((request) => request.id === requestId) ?? null;
}

export function signedAgreementForRequest(requestId: string) {
  const request = getAccessRequest(requestId);
  const pdf = store().agreements.get(requestId) ?? null;
  return request && pdf && request.agreementFilename
    ? { request, pdf, filename: request.agreementFilename }
    : null;
}

export function latestPendingRequestForSmsReply() {
  return (
    store().requests.find(
      (request) => request.status === "pending" && request.flags.length === 0,
    ) ?? null
  );
}

export function decideAccessRequestFromSms(
  replyBody: string,
  context: AuditContext,
) {
  const normalized = replyBody.trim().toUpperCase();
  const decision = normalized.startsWith("YES")
    ? "approve"
    : normalized.startsWith("NO")
      ? "deny"
      : null;

  if (!decision) return null;

  const explicitId = replyBody.match(/DEV-REQ-[A-Z0-9]+/i)?.[0]?.toUpperCase();
  const request = explicitId
    ? getAccessRequest(explicitId)
    : latestPendingRequestForSmsReply();

  if (!request) {
    return {
      handled: true,
      message:
        "No matching pending information request was found. Reply YES or NO with the request ID.",
    };
  }

  if (request.status !== "pending") {
    return {
      handled: true,
      message: `Request ${request.id} is already ${request.status}.`,
    };
  }

  if (request.flags.length > 0 && !explicitId) {
    return {
      handled: true,
      message:
        "The latest pending request is flagged for extra attention. Include the request ID after YES or NO if you still want to act on it.",
    };
  }

  if (decision === "approve") {
    const updated = approveAccessRequest(
      request.id,
      {
        approvedDocIds: request.selectedDocIds,
        reviewReason: "Approved by development SMS reply.",
        expectedStatus: request.status,
        expectedRequestVersion: request.requestVersion,
      },
      context,
    );
    return {
      handled: true,
      message: `Approved ${updated.id} for ${updated.approvedDocIds.length} document(s).`,
    };
  }

  const updated = denyAccessRequest(
    request.id,
    {
      reviewReason: "Denied by development SMS reply.",
      expectedStatus: request.status,
      expectedRequestVersion: request.requestVersion,
    },
    context,
  );
  return {
    handled: true,
    message: `Denied ${updated.id}.`,
  };
}

export function recordAdminNotificationResult(
  request: AccessRequestRecord,
  input: {
    emailSent: boolean;
    smsSent: boolean;
    emailRecipients: string[];
    smsNumber: string;
  },
  context: AuditContext,
) {
  recordAudit({
    eventType: "administrator_notified",
    userId: request.userId,
    requestId: request.id,
    termsVersion: request.termsVersion,
    privacyVersion: request.privacyVersion,
    aiNoticeVersion: request.aiNoticeVersion,
    result: "recorded",
    reason: `Admin notification email=${input.emailSent ? "sent" : "skipped"} to ${input.emailRecipients.length} configured test recipient(s); sms=${input.smsSent ? "sent" : "skipped"}.`,
    context,
  });
}

export function findDocument(documentId: string) {
  return SYNTHETIC_DOCUMENTS.find((doc) => doc.id === documentId);
}

export function auditContextFromHeaders(headers: Headers): AuditContext {
  return {
    ipAddress:
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headers.get("x-real-ip") ||
      "127.0.0.1",
    userAgent: headers.get("user-agent") || "Unknown development browser",
  };
}

export function isValidDevelopmentAdmin(headers: Headers, adminCode: string) {
  return headers.get("x-mems-dev-admin-code") === adminCode;
}

function validateRequestInput(input: CreateRequestInput) {
  const errors: string[] = [];
  const idempotencyKey = cleanString(input.idempotencyKey);
  if (!/^[a-f0-9-]{16,64}$/i.test(idempotencyKey)) {
    errors.push("The request form session is invalid. Refresh the page and try again.");
  }
  const required: Array<[string, unknown]> = [
    ["Full name", input.fullLegalName],
    ["Mailing address", input.mailingAddress],
    ["City", input.city],
    ["State", input.state],
    ["ZIP code", input.postalCode],
    ["Email address", input.verifiedEmail],
  ];

  for (const [label, value] of required) {
    if (!cleanString(value)) errors.push(`${label} is required.`);
  }

  const limits: Array<[string, unknown, number]> = [
    ["Full name", input.fullLegalName, 160],
    ["Mailing address", input.mailingAddress, 220],
    ["Address line 2", input.addressLine2, 120],
    ["City", input.city, 120],
    ["State", input.state, 30],
    ["ZIP code", input.postalCode, 10],
    ["Email address", input.verifiedEmail, 254],
  ];
  for (const [label, value, maximum] of limits) {
    if (cleanString(value).length > maximum) {
      errors.push(`${label} must be ${maximum} characters or fewer.`);
    }
  }

  const selectedDocIds = stringArray(input.selectedDocIds);
  if (!selectedDocIds.length) {
    errors.push("Select at least one listed document.");
  }
  if (selectedDocIds.length > 10) {
    errors.push("Select no more than 10 listed documents.");
  }
  for (const documentId of selectedDocIds) {
    if (!findDocument(documentId)) errors.push("A selected document is not available.");
  }

  const email = cleanString(input.verifiedEmail);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Email address must be formatted like an email address.");
  }
  const postalCode = cleanString(input.postalCode);
  if (postalCode && !/^\d{5}(-\d{4})?$/.test(postalCode)) {
    errors.push("ZIP code must contain 5 digits or ZIP+4.");
  }

  if (cleanString(input.acceptedCheckboxText) !== ACCEPTED_CHECKBOX_TEXT) {
    errors.push("The required acceptance checkbox was not recorded.");
  }
  if (cleanString(input.acceptedButtonText) !== ACCEPTED_BUTTON_TEXT) {
    errors.push("The required submission action was not recorded.");
  }

  const signatureMethod = cleanString(input.signatureMethod);
  if (signatureMethod === "drawn") {
    const dataUrl = cleanString(input.signatureDataUrl);
    if (!isValidPngDataUrl(dataUrl)) {
      errors.push("A valid drawn signature is required.");
    }
  } else if (signatureMethod === "typed") {
    const typedName = cleanString(input.signatureTypedName);
    const fullName = cleanString(input.fullLegalName);
    if (!typedName || normalizeIdentity(typedName) !== normalizeIdentity(fullName)) {
      errors.push("The typed signature must match the full name on the request.");
    }
  } else {
    errors.push("Choose a signature method and sign the request.");
  }

  return errors;
}

function signatureFromInput(input: CreateRequestInput): AgreementSignature {
  const method = cleanString(input.signatureMethod);
  const name = limitedString(input.fullLegalName, 160);
  if (method === "drawn") {
    return { method, name, dataUrl: cleanString(input.signatureDataUrl) };
  }
  return { method: "typed", name: limitedString(input.signatureTypedName, 160) || name };
}

function isValidPngDataUrl(value: string) {
  const match = value.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return false;
  try {
    const bytes = Buffer.from(match[1], "base64");
    return (
      bytes.length >= 100 &&
      bytes.length <= 750_000 &&
      bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    );
  } catch {
    return false;
  }
}

function normalizeIdentity(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function flagSubmission(input: CreateRequestInput) {
  const flags: string[] = [];
  const name = cleanString(input.fullLegalName).toLowerCase();
  const email = cleanString(input.verifiedEmail).toLowerCase();
  const address = cleanString(input.mailingAddress).toLowerCase();
  const city = cleanString(input.city).toLowerCase();
  const zip = cleanString(input.postalCode);

  if (/(anonymous|fake|test|asdf|unknown|n\/a|none|john doe|jane doe)/.test(name)) {
    flags.push("Name appears anonymous or placeholder-like.");
  }
  if (email.endsWith(".test") || email.includes("example") || email.includes("fake")) {
    flags.push("Email domain appears reserved or placeholder-like.");
  }
  if (/(placeholder|unknown|fake|test|n\/a|none)/i.test(address)) {
    flags.push("Address appears placeholder-like.");
  }
  if (/(testville|nowhere|unknown|fake)/i.test(city)) {
    flags.push("City appears placeholder-like.");
  }
  if (!/^\d{5}(-\d{4})?$/.test(zip) || /^0+$/.test(zip.replace(/\D/g, ""))) {
    flags.push("ZIP code appears incomplete or invalid.");
  }
  return flags;
}

function assertAdminDecision(
  request: AccessRequestRecord,
  input: AdminDecisionInput,
  allowedStatuses: RequestStatus[],
) {
  const expectedStatus = cleanString(input.expectedStatus);
  const expectedRequestVersion = cleanString(input.expectedRequestVersion);
  if (
    !expectedStatus ||
    !expectedRequestVersion ||
    expectedStatus !== request.status ||
    expectedRequestVersion !== request.requestVersion
  ) {
    throw new FinancialsHubError(
      "This request changed after it was opened. Refresh the review queue and try again.",
      409,
    );
  }
  if (!allowedStatuses.includes(request.status)) {
    throw new FinancialsHubError(
      `This request cannot be changed while it is ${request.status}.`,
      409,
    );
  }
}

function requestPayloadHash(input: CreateRequestInput) {
  return sha256(
    JSON.stringify({
      fullLegalName: cleanString(input.fullLegalName),
      mailingAddress: cleanString(input.mailingAddress),
      addressLine2: cleanString(input.addressLine2),
      city: cleanString(input.city),
      state: cleanString(input.state).toUpperCase(),
      postalCode: cleanString(input.postalCode),
      verifiedEmail: cleanString(input.verifiedEmail).toLowerCase(),
      selectedDocIds: stringArray(input.selectedDocIds),
      acceptedCheckboxText: cleanString(input.acceptedCheckboxText),
      acceptedButtonText: cleanString(input.acceptedButtonText),
      signatureMethod: cleanString(input.signatureMethod),
      signatureDataHash: sha256(cleanString(input.signatureDataUrl)),
      signatureTypedName: cleanString(input.signatureTypedName),
    }),
  );
}

function checkAccessRequestRateLimit(ipAddress: string) {
  const current = store();
  const key = ipAddress || "unknown";
  const now = Date.now();
  const recent = (current.submissionRateLimits.get(key) ?? []).filter(
    (timestamp) => timestamp > now - ACCESS_RATE_LIMIT_WINDOW_MS,
  );
  current.submissionRateLimits.set(key, recent);
  if (recent.length >= ACCESS_RATE_LIMIT_MAX) {
    throw new FinancialsHubError(
      "Too many access requests were submitted. Please wait before trying again.",
      429,
    );
  }
}

function recordAccessRequestRateLimit(ipAddress: string) {
  const current = store();
  const key = ipAddress || "unknown";
  current.submissionRateLimits.set(key, [
    ...(current.submissionRateLimits.get(key) ?? []),
    Date.now(),
  ]);
}

function updateStatus(
  request: AccessRequestRecord,
  status: Exclude<RequestStatus, "pending" | "under_review" | "approved">,
  input: AdminDecisionInput,
): AccessRequestRecord {
  return {
    ...request,
    status,
    approvedDocIds: [],
    reviewedBy: DEVELOPMENT_ADMIN_ID,
    reviewedAtUtc: new Date().toISOString(),
    reviewReason: cleanString(input.reviewReason),
    expirationAtUtc: status === "expired" ? new Date().toISOString() : undefined,
  };
}

function findRequest(requestId: string) {
  const request = store().requests.find((item) => item.id === requestId);
  if (!request) throw new FinancialsHubError("Access request not found.", 404);
  return request;
}

function expireOverdueRequests() {
  const current = store();
  const now = Date.now();
  for (const request of current.requests) {
    if (
      request.status === "approved" &&
      request.expirationAtUtc &&
      Date.parse(request.expirationAtUtc) <= now
    ) {
      request.status = "expired";
      request.approvedDocIds = [];
      if (
        !current.auditEvents.some(
          (event) =>
            event.eventType === "approval_expired" && event.requestId === request.id,
        )
      ) {
        recordAudit({
          eventType: "approval_expired",
          userId: request.userId,
          requestId: request.id,
          result: "recorded",
          reason: "Approved access expired automatically.",
          context: { ipAddress: "127.0.0.1", userAgent: "Development expiry check" },
        });
      }
    }
  }
  current.sessions = current.sessions.filter(
    (session) => Date.parse(session.expiresAtUtc) > now,
  );
}

function recordAudit(input: {
  eventType: string;
  userId: string;
  administratorId?: string;
  requestId?: string;
  documentId?: string;
  documentVersion?: string;
  releaseId?: string;
  termsVersion?: string;
  privacyVersion?: string;
  aiNoticeVersion?: string;
  documentHash?: string;
  result: AuditEvent["result"];
  reason: string;
  context: AuditContext;
}) {
  store().auditEvents.unshift({
    id: `AUD-${randomToken(12)}`,
    eventType: input.eventType,
    timestampUtc: new Date().toISOString(),
    userId: input.userId,
    administratorId: input.administratorId,
    requestId: input.requestId,
    documentId: input.documentId,
    documentVersion: input.documentVersion,
    releaseId: input.releaseId,
    termsVersion: input.termsVersion,
    privacyVersion: input.privacyVersion,
    aiNoticeVersion: input.aiNoticeVersion,
    ipAddress: input.context.ipAddress,
    userAgent: input.context.userAgent,
    result: input.result,
    reason: input.reason,
    documentHash: input.documentHash,
  });
}

function cleanString(value: unknown) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim()
    : "";
}

function limitedString(value: unknown, maximum: number) {
  return cleanString(value).slice(0, maximum);
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && !!item.trim())
    : [];
}

function randomToken(length: number) {
  return randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length)
    .toUpperCase();
}

function sha256(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}

function utcDateStamp(date: Date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function futureIsoDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function isExpired(value?: string) {
  return !!value && Date.parse(value) <= Date.now();
}
