import { ensureBoardSchema, sql } from "./db";

export const BOARD_WORKBOOK_DOWNLOAD_PATH = "/api/board/workbook/file";
export const BOARD_WORKBOOK_VIEW_API_PATH = "/api/board/workbook";
export const DRAFT_BUDGET_FILE_API_PATH = "/api/admin/budget-documents/file";

export const LEGACY_BOARD_WORKBOOK_BLOB_PATH = "board-workbook/current.xlsx";
export const LEGACY_BOARD_WORKBOOK_VIEW_BLOB_PATH = "board-workbook/current.json";
export const LEGACY_BOARD_WORKBOOK_PUBLIC_PATH = "/board/referendum/current.xlsx";
export const LEGACY_BOARD_WORKBOOK_VIEW_PUBLIC_PATH = "/board/referendum/current.json";
export const LEGACY_DRAFT_BUDGET_BLOB_PATH = "admin/budget-documents/draft-annual-budget.pdf";

export type BoardDocumentKey =
  | "referendum_workbook"
  | "referendum_view"
  | "draft_budget";

export interface BoardDocumentManifestEntry {
  id: string;
  documentKey: BoardDocumentKey;
  generationId: string;
  blobPathname: string;
  sourceName: string;
  contentType: string;
  size: number;
  etag: string;
  sha256: string;
  uploadedById: string | null;
  uploadedByName: string | null;
  uploadedAt: string;
}

export interface NewBoardDocumentManifestEntry {
  documentKey: BoardDocumentKey;
  generationId: string;
  blobPathname: string;
  sourceName: string;
  contentType: string;
  size: number;
  etag: string;
  sha256: string;
}

export interface DocumentManifestActor {
  id?: string | null;
  name?: string | null;
}

export type StoredBoardDocument =
  | {
      storage: "private";
      pathname: string;
      sourceName: string;
      contentType: string;
      size: number;
      uploadedAt: string;
    }
  | {
      storage: "legacy-public";
      url: string;
      sourceName: string;
      contentType: string;
      size: number;
      uploadedAt: string;
    };

export interface OpenedBoardDocument {
  stream: ReadableStream<Uint8Array>;
  size: number;
  contentType: string;
}

let manifestReady = false;

async function ensureBoardDocumentManifestSchema(): Promise<void> {
  if (manifestReady) return;
  await ensureBoardSchema();
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS board_document_manifest (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      document_key     TEXT NOT NULL,
      generation_id    UUID NOT NULL,
      blob_pathname    TEXT NOT NULL,
      access_mode      TEXT NOT NULL DEFAULT 'private',
      source_name      TEXT NOT NULL,
      content_type     TEXT NOT NULL,
      size_bytes       BIGINT NOT NULL,
      etag             TEXT NOT NULL,
      sha256           TEXT NOT NULL,
      uploaded_by_id   TEXT,
      uploaded_by_name TEXT,
      uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_current       BOOLEAN NOT NULL DEFAULT TRUE,
      CHECK (access_mode = 'private')
    )
  `;
  await db`
    CREATE UNIQUE INDEX IF NOT EXISTS board_document_manifest_current_key
    ON board_document_manifest (document_key)
    WHERE is_current = TRUE
  `;
  await db`
    CREATE INDEX IF NOT EXISTS board_document_manifest_generation
    ON board_document_manifest (generation_id)
  `;
  manifestReady = true;
}

function manifestRow(row: Record<string, unknown>): BoardDocumentManifestEntry {
  return {
    id: String(row.id),
    documentKey: String(row.document_key) as BoardDocumentKey,
    generationId: String(row.generation_id),
    blobPathname: String(row.blob_pathname),
    sourceName: String(row.source_name),
    contentType: String(row.content_type),
    size: Number(row.size_bytes),
    etag: String(row.etag),
    sha256: String(row.sha256),
    uploadedById: row.uploaded_by_id == null ? null : String(row.uploaded_by_id),
    uploadedByName: row.uploaded_by_name == null ? null : String(row.uploaded_by_name),
    uploadedAt: row.uploaded_at instanceof Date
      ? row.uploaded_at.toISOString()
      : String(row.uploaded_at),
  };
}

export async function getCurrentBoardDocumentManifest(
  documentKey: BoardDocumentKey,
): Promise<BoardDocumentManifestEntry | null> {
  await ensureBoardDocumentManifestSchema();
  const rows = (await sql()`
    SELECT * FROM board_document_manifest
    WHERE document_key = ${documentKey} AND is_current = TRUE
    LIMIT 1
  `) as Record<string, unknown>[];
  return rows[0] ? manifestRow(rows[0]) : null;
}

export async function recordCurrentBoardDocuments(
  entries: NewBoardDocumentManifestEntry[],
  actor: DocumentManifestActor,
): Promise<void> {
  if (entries.length === 0) throw new Error("At least one document manifest entry is required.");
  await ensureBoardDocumentManifestSchema();
  const db = sql();
  const keys = entries.map((entry) => entry.documentKey);
  await db.transaction((tx) => [
    tx`
      UPDATE board_document_manifest
      SET is_current = FALSE
      WHERE document_key = ANY(${keys}::text[]) AND is_current = TRUE
    `,
    ...entries.map((entry) => tx`
      INSERT INTO board_document_manifest (
        document_key, generation_id, blob_pathname, access_mode,
        source_name, content_type, size_bytes, etag, sha256,
        uploaded_by_id, uploaded_by_name, is_current
      ) VALUES (
        ${entry.documentKey}, ${entry.generationId}, ${entry.blobPathname}, 'private',
        ${entry.sourceName}, ${entry.contentType}, ${entry.size}, ${entry.etag}, ${entry.sha256},
        ${actor.id ?? null}, ${actor.name ?? null}, TRUE
      )
    `),
  ]);
}

export function privateBoardWorkbookPaths(generationId: string) {
  const prefix = `board-private/referendum/${generationId}`;
  return {
    workbook: `${prefix}/current.xlsx`,
    view: `${prefix}/current.json`,
  };
}

export function privateDraftBudgetPath(generationId: string) {
  return `admin-private/budget-documents/${generationId}/draft-annual-budget.pdf`;
}

function privateSource(entry: BoardDocumentManifestEntry): StoredBoardDocument {
  return {
    storage: "private",
    pathname: entry.blobPathname,
    sourceName: entry.sourceName,
    contentType: entry.contentType,
    size: entry.size,
    uploadedAt: entry.uploadedAt,
  };
}

async function currentPrivateSource(key: BoardDocumentKey): Promise<StoredBoardDocument | null> {
  try {
    const manifest = await getCurrentBoardDocumentManifest(key);
    return manifest ? privateSource(manifest) : null;
  } catch {
    return null;
  }
}

async function legacyPublicSource(
  pathname: string,
  prefix: string,
  sourceName: string,
  contentType: string,
): Promise<StoredBoardDocument | null> {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix });
    const blob = blobs.find((candidate) => candidate.pathname === pathname);
    if (!blob) return null;
    return {
      storage: "legacy-public",
      url: blob.url,
      sourceName,
      contentType,
      size: blob.size,
      uploadedAt: blob.uploadedAt.toISOString(),
    };
  } catch {
    return null;
  }
}

function deployedPublicSource(
  relativePath: "board/referendum/current.xlsx" | "board/referendum/current.json",
  sourceName: string,
  contentType: string,
): StoredBoardDocument {
  const configuredHost = process.env.VERCEL_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const origin = configuredHost
    ? configuredHost.startsWith("http")
      ? configuredHost
      : `https://${configuredHost}`
    : `http://localhost:${process.env.PORT || "3000"}`;
  return {
    storage: "legacy-public",
    url: new URL(`/${relativePath}`, origin).toString(),
    sourceName,
    contentType,
    size: 0,
    uploadedAt: new Date(0).toISOString(),
  };
}

export async function resolveLegacyBoardWorkbookSource(): Promise<StoredBoardDocument | null> {
  return (
    (await legacyPublicSource(
      LEGACY_BOARD_WORKBOOK_BLOB_PATH,
      "board-workbook/",
      "current.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )) ??
    deployedPublicSource(
      "board/referendum/current.xlsx",
      "current.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
  );
}

export async function resolveCurrentBoardWorkbookSource(): Promise<StoredBoardDocument | null> {
  return (
    (await currentPrivateSource("referendum_workbook")) ??
    (await resolveLegacyBoardWorkbookSource())
  );
}

export async function resolveLegacyBoardWorkbookViewSource(): Promise<StoredBoardDocument | null> {
  return (
    (await legacyPublicSource(
      LEGACY_BOARD_WORKBOOK_VIEW_BLOB_PATH,
      "board-workbook/",
      "current.json",
      "application/json",
    )) ??
    deployedPublicSource(
      "board/referendum/current.json",
      "current.json",
      "application/json",
    )
  );
}

export async function resolveCurrentBoardWorkbookViewSource(): Promise<StoredBoardDocument | null> {
  return (
    (await currentPrivateSource("referendum_view")) ??
    (await resolveLegacyBoardWorkbookViewSource())
  );
}

export async function resolveLegacyDraftBudgetSource(): Promise<StoredBoardDocument | null> {
  return (
    (await legacyPublicSource(
      LEGACY_DRAFT_BUDGET_BLOB_PATH,
      "admin/budget-documents/",
      "draft-annual-budget.pdf",
      "application/pdf",
    ))
  );
}

export async function resolveCurrentDraftBudgetSource(): Promise<StoredBoardDocument | null> {
  return (
    (await currentPrivateSource("draft_budget")) ??
    (await resolveLegacyDraftBudgetSource())
  );
}

export async function openStoredBoardDocument(
  document: StoredBoardDocument,
): Promise<OpenedBoardDocument | null> {
  if (document.storage === "private") {
    const { get } = await import("@vercel/blob");
    const result = await get(document.pathname, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) return null;
    return {
      stream: result.stream,
      size: result.blob.size,
      contentType: result.blob.contentType || document.contentType,
    };
  }

  const response = await fetch(document.url, { cache: "no-store" });
  if (!response.ok || !response.body) return null;
  const contentLength = Number(response.headers.get("content-length"));
  return {
    stream: response.body,
    size: Number.isSafeInteger(contentLength) && contentLength >= 0
      ? contentLength
      : document.size,
    contentType: response.headers.get("content-type") || document.contentType,
  };
}

export async function readStoredBoardDocumentJson(document: StoredBoardDocument): Promise<unknown> {
  const opened = await openStoredBoardDocument(document);
  if (!opened) throw new Error("Stored board document is unavailable.");
  return new Response(opened.stream, {
    headers: { "Content-Type": opened.contentType },
  }).json();
}
