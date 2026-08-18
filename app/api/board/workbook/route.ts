import { createHash, randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { currentBoardUser } from "@/lib/board/auth";
import { getCurrentBudgetAccess } from "@/lib/board/budget-access";
import { decideBoardWorkbookSourceAccess, decideBoardWorkbookViewAccess } from "@/lib/board/document-access";
import {
  BOARD_WORKBOOK_DOWNLOAD_PATH,
  privateBoardWorkbookPaths,
  recordCurrentBoardDocuments,
} from "@/lib/board/document-storage";
import { audit } from "@/lib/board/db";
import {
  type BoardWorkbookView,
  filterWorkbookForAudience,
  getBoardWorkbookVisibilitySettings,
  getCurrentBoardWorkbookView,
} from "@/lib/board/workbook";
import { contentLengthWithin, isSameOriginRequest, noStoreJson } from "@/lib/security/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MAX_WORKBOOK_BYTES = 10 * 1024 * 1024;

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hasXlsxSignature(buffer: Buffer): boolean {
  return buffer.length >= 4 &&
    buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
}

export async function GET() {
  const access = await getCurrentBudgetAccess();
  const decision = decideBoardWorkbookViewAccess(access?.user ?? null, access?.canViewWorkbook ?? false);
  if (!decision.allowed) {
    return noStoreJson(
      { error: decision.status === 401 ? "Unauthorized" : "Workbook access is not permitted." },
      { status: decision.status },
    );
  }

  const workbook = await getCurrentBoardWorkbookView();
  if (decision.fullWorkbook) return noStoreJson(workbook);

  const allSheetNames = workbook.sheets.map((sheet) => sheet.name);
  const settings = await getBoardWorkbookVisibilitySettings(allSheetNames);
  return noStoreJson(filterWorkbookForAudience(workbook, decision.audience!, settings));
}

export async function POST(req: NextRequest) {
  const user = await currentBoardUser();
  if (!user) return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  const decision = decideBoardWorkbookSourceAccess(user);
  if (!decision.allowed) {
    return noStoreJson(
      { error: "Only Kenneth James and Joe Wagner can update the board workbook." },
      { status: decision.status },
    );
  }
  if (!isSameOriginRequest(req)) {
    return noStoreJson({ error: "Cross-origin request denied." }, { status: 403 });
  }
  if (!contentLengthWithin(req, MAX_WORKBOOK_BYTES + 1024 * 1024)) {
    return noStoreJson({ error: "Workbook is too large. Keep it under 10 MB." }, { status: 413 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return noStoreJson({ error: "Attach an .xlsx workbook." }, { status: 400 });
  }
  if (!/\.xlsx$/i.test(file.name)) {
    return noStoreJson({ error: "Choose an .xlsx workbook." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_WORKBOOK_BYTES) {
    return noStoreJson({ error: "Workbook is too large. Keep it under 10 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!hasXlsxSignature(buffer)) {
    return noStoreJson({ error: "The file content is not a valid .xlsx workbook." }, { status: 400 });
  }
  const { parseBoardWorkbook } = await import("@/lib/board/workbook-parser");
  let parsed: BoardWorkbookView;
  try {
    parsed = parseBoardWorkbook(buffer, {
      sourceName: file.name,
      downloadUrl: "",
      updatedAt: null,
      size: file.size,
    });
    if (parsed.sheets.length === 0) throw new Error("No worksheets found.");
  } catch (error) {
    return noStoreJson({
      error: error instanceof Error ? error.message : "Could not read that workbook.",
    }, { status: 400 });
  }

  const generationId = randomUUID();
  const paths = privateBoardWorkbookPaths(generationId);
  const workbookBlob = await put(paths.workbook, buffer, {
    access: "private",
    contentType: XLSX_MIME,
    addRandomSuffix: false,
    allowOverwrite: false,
  });

  const updatedAt = new Date().toISOString();
  const view = {
    ...parsed,
    sourceName: file.name,
    downloadUrl: BOARD_WORKBOOK_DOWNLOAD_PATH,
    updatedAt,
    size: file.size,
  };
  const serializedView = JSON.stringify(view);
  const viewBlob = await put(paths.view, serializedView, {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
  });

  await recordCurrentBoardDocuments([
    {
      documentKey: "referendum_workbook",
      generationId,
      blobPathname: workbookBlob.pathname,
      sourceName: file.name,
      contentType: XLSX_MIME,
      size: file.size,
      etag: workbookBlob.etag,
      sha256: sha256(buffer),
    },
    {
      documentKey: "referendum_view",
      generationId,
      blobPathname: viewBlob.pathname,
      sourceName: `${file.name}.json`,
      contentType: "application/json",
      size: Buffer.byteLength(serializedView),
      etag: viewBlob.etag,
      sha256: sha256(serializedView),
    },
  ], {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
  });

  await audit({
    userId: user?.id,
    username: user?.username,
    role: user?.role,
    action: "board_workbook_updated",
    detail: `workbook '${file.name}' uploaded with ${view.sheets.length} sheet${view.sheets.length === 1 ? "" : "s"}`,
  });

  return noStoreJson({
    ok: true,
    url: BOARD_WORKBOOK_DOWNLOAD_PATH,
    sheetCount: view.sheets.length,
  });
}
