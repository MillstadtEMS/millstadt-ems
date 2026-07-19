import { NextRequest, NextResponse } from "next/server";
import { currentBoardUser, isAdmin } from "@/lib/board/auth";
import { audit } from "@/lib/board/db";
import { importWorkbook } from "@/lib/board/import";
import { downloadReferendumWorkbookFromOneDrive } from "@/lib/board/financialData/referendum/excelAdapter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorized(req: NextRequest) {
  const secret = process.env.BOARD_SYNC_SECRET;
  const bearer = req.headers.get("authorization");
  if (secret && bearer === `Bearer ${secret}`) return { ok: true, user: null };

  const user = await currentBoardUser();
  if (user && isAdmin(user)) return { ok: true, user };
  return { ok: false, user: null };
}

async function sync(req: NextRequest) {
  const auth = await authorized(req);
  if (!auth.ok) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  try {
    const workbook = await downloadReferendumWorkbookFromOneDrive();
    const result = await importWorkbook(workbook);
    await audit({
      userId: auth.user?.id ?? null,
      username: auth.user?.username ?? "system",
      role: auth.user?.role ?? "sync",
      action: "referendum_workbook_synced",
      detail: `OneDrive workbook imported: ${result.finance} figures, ${result.budgetLines} lines, ${result.personnelGroups} personnel groups, ${result.truckUnits} fleet items, ${result.debts} debts`,
      ip: req.headers.get("x-forwarded-for"),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    await audit({
      userId: auth.user?.id ?? null,
      username: auth.user?.username ?? "system",
      role: auth.user?.role ?? "sync",
      action: "referendum_workbook_sync_failed",
      detail: error instanceof Error ? error.message : "Unknown sync failure",
      ip: req.headers.get("x-forwarded-for"),
    });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Workbook sync failed." }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  return sync(req);
}

export async function POST(req: NextRequest) {
  return sync(req);
}
