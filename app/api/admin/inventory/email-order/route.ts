/**
 * Admin: email the current back-stock order, or an expired-count sheet,
 * as a PDF — on demand from the inventory editor.
 *
 * POST /api/admin/inventory/email-order  { mode?: "order" | "expired" }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getItems } from "@/lib/inventory/db";
import { sendInventoryOrderEmail } from "@/lib/inventory/email";
import { currentEmployee } from "@/lib/lounge/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const mode = body.mode === "expired" ? "expired" : "order";

  const me = await currentEmployee();
  const submittedBy = me ? `${me.firstName} ${me.lastName}` : undefined;

  const items = await getItems(undefined, "backstock");
  const sent = await sendInventoryOrderEmail(items, { mode, submittedBy, submittedDate: new Date() });

  if (!sent) {
    return NextResponse.json(
      { ok: false, error: mode === "expired" ? "No expired items to report." : "Nothing currently needs ordering." },
      { status: 200 },
    );
  }
  return NextResponse.json({ ok: true, mode });
}
