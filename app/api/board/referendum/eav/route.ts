import { NextRequest, NextResponse } from "next/server";
import { currentBoardUser, isAdmin } from "@/lib/board/auth";
import { audit, ensureBoardSchema, sql } from "@/lib/board/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await currentBoardUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!isAdmin(user)) return NextResponse.json({ error: "Financial-model permission required." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const eav = Number(body.eav);
  const reason = String(body.reason ?? "").trim().slice(0, 500);

  if (!Number.isFinite(eav) || eav <= 0) {
    return NextResponse.json({ error: "Enter a positive EAV." }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: "A reason is required." }, { status: 400 });
  }

  await ensureBoardSchema();
  const db = sql();
  const previousRows = (await db`
    SELECT value FROM board_finance WHERE key = 'district_eav' LIMIT 1
  `) as Record<string, unknown>[];
  const oldValue = previousRows[0]?.value != null ? Number(previousRows[0].value) : null;

  await db`
    INSERT INTO board_finance (key, label, value, unit, grouping, sort, source_cell, needs_review, text_value, updated_at)
    VALUES ('district_eav', 'Equalized Assessed Value (EAV)', ${eav}, 'currency', 'levy', 5, 'Levy Calculator!B5', TRUE, 'Synchronization Pending', NOW())
    ON CONFLICT (key) DO UPDATE SET
      label = EXCLUDED.label,
      value = EXCLUDED.value,
      unit = EXCLUDED.unit,
      grouping = EXCLUDED.grouping,
      sort = EXCLUDED.sort,
      source_cell = EXCLUDED.source_cell,
      needs_review = TRUE,
      text_value = 'Synchronization Pending',
      updated_at = NOW()
  `;

  await audit({
    userId: user.id,
    username: user.username,
    role: user.role,
    action: "referendum_eav_saved",
    detail: `old=${oldValue ?? "not set"} new=${eav} reason=${reason}; workbook_sync=Configuration Required`,
    ip: req.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({
    ok: true,
    oldValue,
    newValue: eav,
    synchronizationStatus: "Configuration Required",
  });
}
