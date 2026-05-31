/**
 * POST /api/admin/onboarding/records/[id]/rescind
 *   Body: { reason }
 *   Marks a finalized record as rescinded. The PDF remains uploaded but
 *   the linked personnel record is archived so the document no longer
 *   appears in the employee-facing file. Email cannot be unsent — the
 *   admin UI shows that warning before allowing this action.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import { archiveRecord } from "@/lib/lounge/personnel";
import {
  getRecord,
  logOnboardingAudit,
  rescindRecord,
} from "@/lib/lounge/onboarding/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const rec = await getRecord(id);
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (rec.status !== "finalized") return NextResponse.json({ error: "Only finalized records can be rescinded." }, { status: 409 });

  const body = await req.json().catch(() => null) as null | Record<string, unknown>;
  const reason = body && typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason) return NextResponse.json({ error: "Reason required" }, { status: 400 });

  await rescindRecord({ id, byId: me.id, reason });
  if (rec.personnelRecordId) {
    try { await archiveRecord(rec.personnelRecordId); } catch (e) { console.error("[onboarding rescind] archive failed:", e); }
  }
  await logOnboardingAudit({
    recordId: id,
    actorId: me.id,
    actorName: `${me.firstName} ${me.lastName}`.trim(),
    action: "rescinded",
    details: reason,
  });

  return NextResponse.json({ ok: true });
}
