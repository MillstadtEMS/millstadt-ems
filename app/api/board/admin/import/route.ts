/**
 * POST /api/board/admin/import   (admin only, multipart: file=<workbook.xlsx>)
 * Re-parses an uploaded FY workbook and refreshes the portal's financial
 * tables, then stores the file as the current downloadable version. This is
 * how an Excel overhaul reaches the website today (pre Graph/OneDrive sync).
 */
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { currentBoardUser, isAdmin } from "@/lib/board/auth";
import { importWorkbook } from "@/lib/board/import";
import { audit } from "@/lib/board/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await currentBoardUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Attach an .xlsx workbook." }, { status: 400 });
  if (!/\.xlsx$/i.test(file.name)) return NextResponse.json({ error: "That is not an .xlsx file." }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());

  let result;
  try {
    result = await importWorkbook(buf);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not read that workbook." }, { status: 400 });
  }

  // Keep the current copy for the (future) board download.
  try {
    await put("board-workbook/current.xlsx", buf, {
      access: "public", contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      addRandomSuffix: false, allowOverwrite: true,
    });
  } catch { /* storage optional for the refresh itself */ }

  await audit({ userId: user.id, username: user.username, role: user.role, action: "financials_updated",
    detail: `workbook '${file.name}' → ${result.finance} figures, ${result.budgetLines} lines, ${result.cashMonths} months` });

  return NextResponse.json({ ok: true, ...result });
}
