import { NextRequest, NextResponse } from "next/server";
import { currentBoardUser } from "@/lib/board/auth";
import { audit } from "@/lib/board/db";
import {
  canManageBoardWorkbook,
  getCurrentBoardWorkbookView,
  setBoardWorkbookVisibilitySettings,
} from "@/lib/board/workbook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sheetList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function POST(req: NextRequest) {
  const user = await currentBoardUser();
  if (!canManageBoardWorkbook(user)) {
    return NextResponse.json({ error: "Only Kenneth James and Joe Wagner can change workbook tab visibility." }, { status: 403 });
  }

  const body = await req.json().catch(() => null) as { emsBoard?: unknown; fireBoard?: unknown } | null;
  if (!body) return NextResponse.json({ error: "Send workbook tab visibility settings." }, { status: 400 });

  const workbook = await getCurrentBoardWorkbookView();
  const allSheetNames = workbook.sheets.map((sheet) => sheet.name);
  const settings = await setBoardWorkbookVisibilitySettings({
    emsBoard: sheetList(body.emsBoard),
    fireBoard: sheetList(body.fireBoard),
  }, allSheetNames, user);

  await audit({
    userId: user.id,
    username: user.username,
    role: user.role,
    action: "board_workbook_visibility_updated",
    detail: `EMS Board tabs: ${settings.emsBoard.join(", ") || "none"}; Fire Board tabs: ${settings.fireBoard.join(", ") || "none"}`,
  });

  return NextResponse.json({ ok: true, settings });
}
