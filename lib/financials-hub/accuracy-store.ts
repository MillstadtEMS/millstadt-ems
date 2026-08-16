import { createHash, randomBytes } from "crypto";
import path from "path";
import type { AgreementSignature } from "./agreement-pdf";
import { signedAccuracyReportPdf } from "./accuracy-report-pdf";
import {
  ACCURACY_REPORT_CATEGORIES,
  ACCURACY_REPORT_STATUSES,
  ACCURACY_REPORT_VERSION,
  type AccuracyReportActivity,
  type AccuracyReportCategory,
  type AccuracyReportRecord,
  type AccuracyReportStatus,
  type AccuracyReportUpload,
} from "./accuracy-types";
import { DEVELOPMENT_ADMIN_ID, FinancialsHubError, findDocument } from "./dev-store";
import { findPublicForm990 } from "./form990";

type AccuracyContext = {
  ipAddress: string;
  userAgent: string;
};

type AccuracyInput = {
  idempotencyKey?: unknown;
  documentId?: unknown;
  sourceUrl?: unknown;
  pageOrSection?: unknown;
  category?: unknown;
  description?: unknown;
  supportingSource?: unknown;
  reporterName?: unknown;
  reporterEmail?: unknown;
  reporterTelephone?: unknown;
  certificationAccepted?: unknown;
  contactAcknowledgmentAccepted?: unknown;
  certificationText?: unknown;
  contactAcknowledgmentText?: unknown;
  signatureMethod?: unknown;
  signatureDataUrl?: unknown;
  signatureTypedName?: unknown;
};

type AccuracyUploadInput = {
  filename: string;
  contentType: string;
  bytes: Buffer;
};

type AccuracyStore = {
  reports: AccuracyReportRecord[];
  attachments: Map<string, Buffer>;
  agreements: Map<string, Buffer>;
  rateLimits: Map<string, number[]>;
  idempotencyKeys: Map<string, { reportId: string; payloadHash: string }>;
};

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 4;

const globalAccuracyStore = globalThis as typeof globalThis & {
  __millstadtAccuracyReportDevStore?: AccuracyStore;
};

function store() {
  if (!globalAccuracyStore.__millstadtAccuracyReportDevStore) {
    globalAccuracyStore.__millstadtAccuracyReportDevStore = createSeedStore();
  }
  if (!globalAccuracyStore.__millstadtAccuracyReportDevStore.idempotencyKeys) {
    globalAccuracyStore.__millstadtAccuracyReportDevStore.idempotencyKeys = new Map();
  }
  return globalAccuracyStore.__millstadtAccuracyReportDevStore;
}

function createSeedStore(): AccuracyStore {
  const submittedAtUtc = "2026-08-16T15:00:00.000Z";
  const report: AccuracyReportRecord = {
    id: "DEV-ACC-SEED-001",
    documentId: "SYN-990-2024-001",
    documentTitle: "Synthetic Form 990 Public Inspection Copy",
    documentVersion: "SYNTHETIC-1.0",
    sourceUrl: "/api/financials/form-990/SYN-990-2024-001/html",
    pageOrSection: "Page 2, Part I summary",
    category: "Possible factual inaccuracy",
    description:
      "Synthetic development report used to verify the protected review queue, status controls, signed PDF, and audit history.",
    supportingSource: "Synthetic test source only.",
    reporterName: "Synthetic Test Reporter",
    reporterEmail: "reporter@example.test",
    reporterTelephone: "",
    acknowledgmentVersion: ACCURACY_REPORT_VERSION,
    acknowledgmentTimestampUtc: submittedAtUtc,
    submittedAtUtc,
    status: "Received",
    signatureMethod: "typed",
    signatureName: "Synthetic Test Reporter",
    signatureCapturedAtUtc: submittedAtUtc,
    agreementFilename: "Millstadt-EMS-DEV-ACC-SEED-001-signed-report.pdf",
    agreementHash: "",
    reviewerNote: "",
    resolution: "",
    flags: ["Email domain is reserved for synthetic testing."],
    activity: [
      {
        id: "ACC-AUD-SEED-001",
        timestampUtc: submittedAtUtc,
        eventType: "accuracy_report_submitted",
        reason: "Seeded synthetic accuracy report created for local review testing.",
      },
    ],
  };
  const agreement = signedAccuracyReportPdf(report, {
    method: "typed",
    name: report.reporterName,
  });
  report.agreementHash = `sha256:${sha256(agreement)}`;
  return {
    reports: [report],
    attachments: new Map(),
    agreements: new Map([[report.id, agreement]]),
    rateLimits: new Map(),
    idempotencyKeys: new Map(),
  };
}

export function resetAccuracyReportStore() {
  globalAccuracyStore.__millstadtAccuracyReportDevStore = createSeedStore();
}

export function accuracyReports() {
  return store().reports;
}

export async function createAccuracyReport(
  input: AccuracyInput,
  upload: AccuracyUploadInput | null,
  context: AccuracyContext,
) {
  const errors = validateAccuracyInput(input);
  if (errors.length) throw new FinancialsHubError(errors.join(" "), 400);

  const document = resolveDocument(cleanString(input.documentId));
  if (!document) throw new FinancialsHubError("The referenced document was not found.", 404);

  const signature = signatureFromInput(input);
  const current = store();
  const idempotencyKey = cleanString(input.idempotencyKey);
  const payloadHash = accuracyPayloadHash(input, upload);
  const existing = current.idempotencyKeys.get(idempotencyKey);
  if (existing) {
    if (existing.payloadHash !== payloadHash) {
      throw new FinancialsHubError(
        "This report retry does not match the original submission.",
        409,
      );
    }
    const existingReport = current.reports.find((report) => report.id === existing.reportId);
    if (!existingReport) {
      throw new FinancialsHubError("The original report could not be restored.", 409);
    }
    return { report: existingReport, created: false as const };
  }

  checkRateLimit(context.ipAddress);
  const now = new Date().toISOString();
  const reportId = `DEV-ACC-${randomToken(10)}`;
  const storedUpload = upload ? validateAndStoreUpload(reportId, upload) : undefined;
  recordRateLimit(context.ipAddress);
  const report: AccuracyReportRecord = {
    id: reportId,
    documentId: document.id,
    documentTitle: document.title,
    documentVersion: document.version,
    sourceUrl: sanitizeSourceUrl(input.sourceUrl, document.sourceUrl),
    pageOrSection: limitedString(input.pageOrSection, 220),
    category: cleanString(input.category) as AccuracyReportCategory,
    description: limitedString(input.description, 6000),
    supportingSource: limitedString(input.supportingSource, 1800),
    reporterName: limitedString(input.reporterName, 160),
    reporterEmail: limitedString(input.reporterEmail, 254).toLowerCase(),
    reporterTelephone: limitedString(input.reporterTelephone, 40),
    upload: storedUpload,
    acknowledgmentVersion: ACCURACY_REPORT_VERSION,
    acknowledgmentTimestampUtc: now,
    submittedAtUtc: now,
    status: "Received",
    signatureMethod: signature.method,
    signatureName: signature.name,
    signatureCapturedAtUtc: now,
    agreementFilename: `Millstadt-EMS-${reportId}-signed-report.pdf`,
    agreementHash: "",
    reviewerNote: "",
    resolution: "",
    flags: flagAccuracyReport(input),
    activity: [],
  };

  addActivity(report, "accuracy_report_submitted", "Accuracy report submitted for protected administrative review.");
  addActivity(report, "accuracy_report_signature_captured", `${signature.method === "drawn" ? "Drawn" : "Typed"} electronic signature captured.`);
  if (storedUpload) {
    addActivity(
      report,
      "accuracy_report_upload_scanned",
      `Supporting upload passed development content and structure checks: ${storedUpload.sha256}.`,
    );
  }

  const agreement = signedAccuracyReportPdf(report, signature);
  report.agreementHash = `sha256:${sha256(agreement)}`;
  current.reports.unshift(report);
  current.agreements.set(report.id, agreement);
  current.idempotencyKeys.set(idempotencyKey, { reportId: report.id, payloadHash });
  return { report, created: true as const };
}

export function updateAccuracyReport(
  reportId: string,
  input: {
    status?: unknown;
    reviewerNote?: unknown;
    resolution?: unknown;
    expectedStatus?: unknown;
  },
  context: AccuracyContext,
) {
  const report = findAccuracyReport(reportId);
  if (cleanString(input.expectedStatus) !== report.status) {
    throw new FinancialsHubError(
      "This report changed after it was opened. Refresh the review queue and try again.",
      409,
    );
  }
  const status = cleanString(input.status) as AccuracyReportStatus;
  if (!ACCURACY_REPORT_STATUSES.includes(status)) {
    throw new FinancialsHubError("Choose a valid report status.", 400);
  }
  const reviewerNote = limitedString(input.reviewerNote, 4000);
  const resolution = limitedString(input.resolution, 4000);
  report.status = status;
  report.reviewerNote = reviewerNote;
  report.resolution = resolution;
  addActivity(
    report,
    "accuracy_report_review_updated",
    `Status changed to ${status}. Private reviewer note and resolution record updated from ${context.ipAddress}.`,
    DEVELOPMENT_ADMIN_ID,
  );
  return report;
}

export function findAccuracyReport(reportId: string) {
  const report = store().reports.find((item) => item.id === reportId);
  if (!report) throw new FinancialsHubError("Accuracy report not found.", 404);
  return report;
}

export function accuracyReportAgreement(reportId: string) {
  const report = findAccuracyReport(reportId);
  const pdf = store().agreements.get(reportId);
  if (!pdf) throw new FinancialsHubError("Signed report PDF not found.", 404);
  return { report, pdf, filename: report.agreementFilename };
}

export function accuracyReportAttachment(reportId: string) {
  const report = findAccuracyReport(reportId);
  if (!report.upload) throw new FinancialsHubError("Supporting upload not found.", 404);
  const bytes = store().attachments.get(report.upload.id);
  if (!bytes) throw new FinancialsHubError("Supporting upload not found.", 404);
  return { report, upload: report.upload, bytes };
}

export function recordAccuracyAdminNotificationResult(
  reportId: string,
  input: { emailSent: boolean; emailRecipients: string[] },
) {
  const report = findAccuracyReport(reportId);
  addActivity(
    report,
    "accuracy_report_administrator_notified",
    `Admin notification email=${input.emailSent ? "sent" : "skipped"} to ${input.emailRecipients.length} configured test recipient(s); SMS is disabled during testing.`,
  );
}

function resolveDocument(documentId: string) {
  if (documentId === "PAGE-FINANCIAL-INFORMATION") {
    return {
      id: documentId,
      title: "Financial Information page",
      version: ACCURACY_REPORT_VERSION,
      sourceUrl: "/financials-information-hub",
    };
  }
  const form990 = findPublicForm990(documentId);
  if (form990) {
    return {
      id: form990.id,
      title: form990.title,
      version: form990.version,
      sourceUrl: `/api/financials/form-990/${form990.id}/html`,
    };
  }
  const restricted = findDocument(documentId);
  return restricted
    ? {
        id: restricted.id,
        title: restricted.title,
        version: restricted.version,
        sourceUrl: "/financials-information-hub",
      }
    : null;
}

function validateAccuracyInput(input: AccuracyInput) {
  const errors: string[] = [];
  if (!/^[a-f0-9-]{16,64}$/i.test(cleanString(input.idempotencyKey))) {
    errors.push("The report form session is invalid. Close it and try again.");
  }
  const required: Array<[string, unknown]> = [
    ["Full name", input.reporterName],
    ["Email address", input.reporterEmail],
    ["Document", input.documentId],
    ["Page, section, statement, or location", input.pageOrSection],
    ["Specific concern", input.description],
  ];
  for (const [label, value] of required) {
    if (!cleanString(value)) errors.push(`${label} is required.`);
  }
  const email = cleanString(input.reporterEmail);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Email address must be formatted like an email address.");
  }
  if (!ACCURACY_REPORT_CATEGORIES.includes(cleanString(input.category) as AccuracyReportCategory)) {
    errors.push("Choose what you are reporting.");
  }
  if (input.certificationAccepted !== "true") {
    errors.push("The good-faith certification is required.");
  }
  if (input.contactAcknowledgmentAccepted !== "true") {
    errors.push("The contact and retention acknowledgment is required.");
  }

  const signatureMethod = cleanString(input.signatureMethod);
  if (signatureMethod === "drawn") {
    if (!isValidPngDataUrl(cleanString(input.signatureDataUrl))) {
      errors.push("A valid drawn signature is required.");
    }
  } else if (signatureMethod === "typed") {
    if (
      normalizeIdentity(cleanString(input.signatureTypedName)) !==
      normalizeIdentity(cleanString(input.reporterName))
    ) {
      errors.push("The typed signature must match the full name on the report.");
    }
  } else {
    errors.push("Choose a signature method and sign the report.");
  }
  return errors;
}

function accuracyPayloadHash(input: AccuracyInput, upload: AccuracyUploadInput | null) {
  return sha256(
    JSON.stringify({
      documentId: cleanString(input.documentId),
      sourceUrl: cleanString(input.sourceUrl),
      pageOrSection: cleanString(input.pageOrSection),
      category: cleanString(input.category),
      description: cleanString(input.description),
      supportingSource: cleanString(input.supportingSource),
      reporterName: cleanString(input.reporterName),
      reporterEmail: cleanString(input.reporterEmail).toLowerCase(),
      reporterTelephone: cleanString(input.reporterTelephone),
      certificationAccepted: cleanString(input.certificationAccepted),
      contactAcknowledgmentAccepted: cleanString(input.contactAcknowledgmentAccepted),
      signatureMethod: cleanString(input.signatureMethod),
      signatureDataHash: sha256(cleanString(input.signatureDataUrl)),
      signatureTypedName: cleanString(input.signatureTypedName),
      uploadHash: upload ? sha256(upload.bytes) : "",
    }),
  );
}

function validateAndStoreUpload(reportId: string, input: AccuracyUploadInput) {
  const filename = path.basename(input.filename).replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 180);
  const extension = path.extname(filename).toLowerCase();
  const allowed: Record<string, string[]> = {
    ".pdf": ["application/pdf"],
    ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    ".png": ["image/png"],
    ".jpg": ["image/jpeg"],
    ".jpeg": ["image/jpeg"],
  };
  if (!allowed[extension]?.includes(input.contentType)) {
    throw new FinancialsHubError("Upload a PDF, DOCX, PNG, or JPG file.", 400);
  }
  if (!input.bytes.length || input.bytes.length > MAX_UPLOAD_BYTES) {
    throw new FinancialsHubError("The supporting upload must be 10 MB or smaller.", 400);
  }
  if (!hasExpectedMagic(extension, input.bytes)) {
    throw new FinancialsHubError("The uploaded file structure does not match its file type.", 400);
  }
  const upper = input.bytes.toString("latin1").toUpperCase();
  if (
    upper.includes("EICAR-STANDARD-ANTIVIRUS-TEST-FILE") ||
    (input.bytes[0] === 0x4d && input.bytes[1] === 0x5a)
  ) {
    throw new FinancialsHubError("The supporting upload did not pass the content safety scan.", 400);
  }

  const id = `ACC-UP-${randomToken(12)}`;
  const upload: AccuracyReportUpload = {
    id,
    originalFilename: filename,
    contentType: input.contentType,
    size: input.bytes.length,
    sha256: `sha256:${sha256(input.bytes)}`,
    scanResult: "passed-development-content-scan",
  };
  store().attachments.set(id, Buffer.from(input.bytes));
  return upload;
}

function hasExpectedMagic(extension: string, bytes: Buffer) {
  if (extension === ".pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if (extension === ".png") {
    return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (extension === ".jpg" || extension === ".jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (extension === ".docx") return bytes.subarray(0, 4).equals(Buffer.from("PK\u0003\u0004", "binary"));
  return false;
}

function signatureFromInput(input: AccuracyInput): AgreementSignature {
  const name = limitedString(input.reporterName, 160);
  if (cleanString(input.signatureMethod) === "drawn") {
    return { method: "drawn", name, dataUrl: cleanString(input.signatureDataUrl) };
  }
  return { method: "typed", name: limitedString(input.signatureTypedName, 160) };
}

function checkRateLimit(ipAddress: string) {
  const current = store();
  const now = Date.now();
  const key = ipAddress || "unknown";
  const recent = (current.rateLimits.get(key) ?? []).filter(
    (timestamp) => timestamp > now - RATE_LIMIT_WINDOW_MS,
  );
  if (recent.length >= RATE_LIMIT_MAX) {
    throw new FinancialsHubError("Too many reports were submitted. Please wait before trying again.", 429);
  }
  current.rateLimits.set(key, recent);
}

function recordRateLimit(ipAddress: string) {
  const current = store();
  const key = ipAddress || "unknown";
  current.rateLimits.set(key, [...(current.rateLimits.get(key) ?? []), Date.now()]);
}

function sanitizeSourceUrl(value: unknown, fallback: string) {
  const raw = cleanString(value);
  if (!raw) return fallback;
  try {
    const parsed = new URL(raw, "https://www.millstadtems.org");
    if (!parsed.pathname.startsWith("/")) return fallback;
    return `${parsed.pathname}${parsed.search}`.slice(0, 1000);
  } catch {
    return fallback;
  }
}

function addActivity(
  report: AccuracyReportRecord,
  eventType: string,
  reason: string,
  administratorId?: string,
) {
  const activity: AccuracyReportActivity = {
    id: `ACC-AUD-${randomToken(12)}`,
    timestampUtc: new Date().toISOString(),
    eventType,
    administratorId,
    reason,
  };
  report.activity.unshift(activity);
}

function flagAccuracyReport(input: AccuracyInput) {
  const flags: string[] = [];
  const name = cleanString(input.reporterName).toLowerCase();
  const email = cleanString(input.reporterEmail).toLowerCase();
  const description = cleanString(input.description).toLowerCase();
  if (/(anonymous|fake|test|asdf|unknown|n\/a|none|john doe|jane doe)/.test(name)) {
    flags.push("Name appears anonymous or placeholder-like.");
  }
  if (email.endsWith(".test") || email.includes("example") || email.includes("fake")) {
    flags.push("Email domain appears reserved or placeholder-like.");
  }
  if (description.length < 30 || /(asdf|lorem ipsum|just testing)/.test(description)) {
    flags.push("Concern description appears unusually short or placeholder-like.");
  }
  return flags;
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

function cleanString(value: unknown) {
  return typeof value === "string"
    ? value
        .replace(/\r\n?/g, "\n")
        .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
        .trim()
    : "";
}

function limitedString(value: unknown, maxLength: number) {
  return cleanString(value).slice(0, maxLength);
}

function randomToken(length: number) {
  return randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length).toUpperCase();
}

function sha256(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}
