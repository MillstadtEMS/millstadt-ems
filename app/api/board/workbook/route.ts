import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { currentBoardUser } from "@/lib/board/auth";
import { audit } from "@/lib/board/db";
import {
  BOARD_WORKBOOK_BLOB_PATH,
  BOARD_WORKBOOK_VIEW_BLOB_PATH,
  type BoardWorkbookView,
  canManageBoardWorkbook,
} from "@/lib/board/workbook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MAX_WORKBOOK_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const user = await currentBoardUser();
  if (!canManageBoardWorkbook(user)) {
    return NextResponse.json({ error: "Only Kenneth James and Joe Wagner can update the board workbook." }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Attach an .xlsx workbook." }, { status: 400 });
  }
  if (!/\.xlsx$/i.test(file.name)) {
    return NextResponse.json({ error: "Choose an .xlsx workbook." }, { status: 400 });
  }
  if (file.size > MAX_WORKBOOK_BYTES) {
    return NextResponse.json({ error: "Workbook is too large. Keep it under 10 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
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
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Could not read that workbook.",
    }, { status: 400 });
  }

  const workbookBlob = await put(BOARD_WORKBOOK_BLOB_PATH, buffer, {
    access: "public",
    contentType: XLSX_MIME,
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  const updatedAt = new Date().toISOString();
  const view = {
    ...parsed,
    sourceName: file.name,
    downloadUrl: workbookBlob.url,
    updatedAt,
    size: file.size,
  };
  await put(BOARD_WORKBOOK_VIEW_BLOB_PATH, JSON.stringify(view), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  await audit({
    userId: user?.id,
    username: user?.username,
    role: user?.role,
    action: "board_workbook_updated",
    detail: `workbook '${file.name}' uploaded with ${view.sheets.length} sheet${view.sheets.length === 1 ? "" : "s"}`,
  });

  return NextResponse.json({
    ok: true,
    url: workbookBlob.url,
    sheetCount: view.sheets.length,
  });
}
