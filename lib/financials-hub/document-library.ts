import { createHash, randomBytes } from "crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import path from "path";

import type { DocCategory, SyntheticDocument } from "./types";

export type ManagedDocumentAccess = "public_form_990" | "restricted";

export type ManagedDocumentRecord = {
  id: string;
  access: ManagedDocumentAccess;
  title: string;
  category: DocCategory;
  reportingPeriod: string;
  taxYear: string;
  filingYear: string;
  version: string;
  publicationDate: string;
  pageCount: number;
  originalHash: string;
  originalFilename: string;
  storedFilename: string;
  textFilename: string;
  createdAtUtc: string;
  archivedAtUtc: string | null;
};

export type CreateManagedDocumentInput = {
  access: unknown;
  title: unknown;
  category: unknown;
  reportingPeriod: unknown;
  taxYear: unknown;
  filingYear: unknown;
  version: unknown;
  publicationDate: unknown;
  originalFilename: unknown;
  pdf: Buffer;
  pages: string[];
};

export class DocumentLibraryError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "DocumentLibraryError";
    this.status = status;
  }
}

export const DOCUMENT_UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
export const DOCUMENT_UPLOAD_MAX_PAGES = 200;

const LIBRARY_ROOT = process.env.MILLSTADT_INFORMATION_HUB_DOCUMENT_LIBRARY_PATH
  ? path.resolve(process.env.MILLSTADT_INFORMATION_HUB_DOCUMENT_LIBRARY_PATH)
  : path.join(process.cwd(), ".local-data", "financials-hub");
const INDEX_PATH = path.join(LIBRARY_ROOT, "documents.json");
const FILES_PATH = path.join(LIBRARY_ROOT, "documents");
const ALLOWED_CATEGORIES: DocCategory[] = [
  "Financial report",
  "Budget",
  "Audit",
  "Operational",
];

export function managedDocumentCatalog(options?: { includeArchived?: boolean }) {
  return readIndex()
    .filter((document) => options?.includeArchived || !document.archivedAtUtc)
    .sort((left, right) => right.createdAtUtc.localeCompare(left.createdAtUtc));
}

export function activeManagedDocuments(access?: ManagedDocumentAccess) {
  return managedDocumentCatalog().filter(
    (document) => !access || document.access === access,
  );
}

export function managedRestrictedDocuments(): SyntheticDocument[] {
  return activeManagedDocuments("restricted").map((document) => ({
    id: document.id,
    title: document.title,
    filename: document.originalFilename,
    category: document.category,
    version: document.version,
    publicationDate: document.publicationDate,
    originalHash: document.originalHash,
    pages: readDocumentPages(document),
  }));
}

export function createManagedDocument(input: CreateManagedDocumentInput) {
  const access = cleanString(input.access) as ManagedDocumentAccess;
  const title = limitedString(input.title, 160);
  const category = cleanString(input.category) as DocCategory;
  const reportingPeriod = limitedString(input.reportingPeriod, 80);
  const taxYear = limitedString(input.taxYear, 12);
  const filingYear = limitedString(input.filingYear, 12);
  const version = limitedString(input.version, 60);
  const publicationDate = cleanString(input.publicationDate);
  const originalFilename = safeOriginalFilename(input.originalFilename);

  const errors: string[] = [];
  if (!(["public_form_990", "restricted"] as const).includes(access)) {
    errors.push("Choose a valid public document type.");
  }
  if (title.length < 3) errors.push("Enter a document title.");
  if (!ALLOWED_CATEGORIES.includes(category)) errors.push("Choose a valid category.");
  if (!reportingPeriod) errors.push("Enter a reporting period.");
  if (!version) errors.push("Enter a document version.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publicationDate)) {
    errors.push("Enter a valid publication date.");
  }
  if (!Number.isFinite(Date.parse(`${publicationDate}T00:00:00Z`))) {
    errors.push("Enter a real publication date.");
  }
  if (access === "public_form_990" && category !== "Financial report") {
    errors.push("Public Form 990 uploads must use the Financial report category.");
  }
  if (access === "public_form_990" && !/^\d{4}$/.test(taxYear)) {
    errors.push("Enter the four-digit Form 990 tax year.");
  }
  if (access === "public_form_990" && !/^\d{4}$/.test(filingYear)) {
    errors.push("Enter the four-digit Form 990 filing year.");
  }
  if (!input.pdf.length || input.pdf.length > DOCUMENT_UPLOAD_MAX_BYTES) {
    errors.push("The PDF must be 20 MB or smaller.");
  }
  if (!input.pages.length || input.pages.length > DOCUMENT_UPLOAD_MAX_PAGES) {
    errors.push("The PDF must contain between 1 and 200 pages.");
  }
  if (errors.length) throw new DocumentLibraryError(errors.join(" "));

  ensureLibrary();
  const now = new Date().toISOString();
  const idPrefix = access === "public_form_990" ? `FORM-990-${taxYear}` : "DOC";
  const id = `${idPrefix}-${randomBytes(5).toString("hex").toUpperCase()}`;
  const storedFilename = `${id}.pdf`;
  const textFilename = `${id}.pages.json`;
  const record: ManagedDocumentRecord = {
    id,
    access,
    title,
    category,
    reportingPeriod,
    taxYear: access === "public_form_990" ? taxYear : "",
    filingYear: access === "public_form_990" ? filingYear : "",
    version,
    publicationDate,
    pageCount: input.pages.length,
    originalHash: `sha256:${createHash("sha256").update(input.pdf).digest("hex")}`,
    originalFilename,
    storedFilename,
    textFilename,
    createdAtUtc: now,
    archivedAtUtc: null,
  };

  writeFileSync(path.join(FILES_PATH, storedFilename), input.pdf, { flag: "wx" });
  try {
    writeFileSync(
      path.join(FILES_PATH, textFilename),
      JSON.stringify(input.pages, null, 2),
      { flag: "wx" },
    );
    writeIndex([record, ...readIndex()]);
  } catch (error) {
    removeIfPresent(path.join(FILES_PATH, storedFilename));
    removeIfPresent(path.join(FILES_PATH, textFilename));
    throw error;
  }

  return record;
}

export function archiveManagedDocument(documentId: string) {
  const records = readIndex();
  const existing = records.find((document) => document.id === documentId);
  if (!existing) throw new DocumentLibraryError("Document not found.", 404);
  if (existing.archivedAtUtc) return existing;

  const archived = { ...existing, archivedAtUtc: new Date().toISOString() };
  writeIndex(
    records.map((document) => (document.id === documentId ? archived : document)),
  );
  return archived;
}

export function restoreManagedDocument(documentId: string) {
  const records = readIndex();
  const existing = records.find((document) => document.id === documentId);
  if (!existing) throw new DocumentLibraryError("Document not found.", 404);
  if (!existing.archivedAtUtc) return existing;

  const restored = { ...existing, archivedAtUtc: null };
  writeIndex(
    records.map((document) => (document.id === documentId ? restored : document)),
  );
  return restored;
}

export function findManagedDocument(documentId: string, includeArchived = false) {
  return (
    readIndex().find(
      (document) =>
        document.id === documentId && (includeArchived || !document.archivedAtUtc),
    ) ?? null
  );
}

export function readManagedDocumentPdf(documentId: string, includeArchived = false) {
  const document = findManagedDocument(documentId, includeArchived);
  if (!document) return null;
  const filePath = path.join(FILES_PATH, document.storedFilename);
  return existsSync(filePath) ? readFileSync(filePath) : null;
}

export function readDocumentPages(document: ManagedDocumentRecord) {
  const filePath = path.join(FILES_PATH, document.textFilename);
  if (!existsSync(filePath)) return [];
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8"));
    return Array.isArray(parsed)
      ? parsed.filter((page): page is string => typeof page === "string")
      : [];
  } catch {
    return [];
  }
}

function readIndex(): ManagedDocumentRecord[] {
  if (!existsSync(INDEX_PATH)) return [];
  try {
    const parsed = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
    return Array.isArray(parsed) ? parsed.filter(isManagedDocumentRecord) : [];
  } catch {
    throw new DocumentLibraryError(
      "The local document library index could not be read.",
      500,
    );
  }
}

function writeIndex(records: ManagedDocumentRecord[]) {
  ensureLibrary();
  const tempPath = `${INDEX_PATH}.${randomBytes(6).toString("hex")}.tmp`;
  writeFileSync(tempPath, JSON.stringify(records, null, 2));
  renameSync(tempPath, INDEX_PATH);
}

function ensureLibrary() {
  mkdirSync(FILES_PATH, { recursive: true });
}

function isManagedDocumentRecord(value: unknown): value is ManagedDocumentRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<ManagedDocumentRecord>;
  return (
    typeof record.id === "string" &&
    (record.access === "public_form_990" || record.access === "restricted") &&
    typeof record.title === "string" &&
    typeof record.storedFilename === "string" &&
    typeof record.textFilename === "string" &&
    typeof record.pageCount === "number"
  );
}

function safeOriginalFilename(value: unknown) {
  const basename = path.basename(cleanString(value)).replace(/[^a-zA-Z0-9._ -]/g, "_");
  const filename = basename.slice(0, 180);
  return filename.toLowerCase().endsWith(".pdf") ? filename : `${filename || "document"}.pdf`;
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function limitedString(value: unknown, maxLength: number) {
  return cleanString(value).replace(/\s+/g, " ").slice(0, maxLength);
}

function removeIfPresent(filePath: string) {
  try {
    unlinkSync(filePath);
  } catch {
    // Cleanup is best-effort after a failed write.
  }
}
