/**
 * PATCH /api/admin/onboarding/records/[id]/items/[itemId]
 *   Update one progress row — status / notes / file / expiration. Sets
 *   completed_by + completed_at when status transitions into a completed
 *   bucket, and clears them when transitioning back.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  getRecord,
  logOnboardingAudit,
  setProgress,
} from "@/lib/lounge/onboarding/db";
import type { ItemStatus } from "@/lib/lounge/onboarding/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES: ItemStatus[] = ["pending", "completed", "completed_with_followup", "not_applicable", "not_met"];

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string; itemId: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, itemId } = await ctx.params;
  const rec = await getRecord(id);
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (rec.status === "finalized") return NextResponse.json({ error: "Record is finalized and locked." }, { status: 409 });

  const body = await req.json().catch(() => null) as null | Record<string, unknown>;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const status = typeof body.status === "string" && (VALID_STATUSES as string[]).includes(body.status)
    ? body.status as ItemStatus : undefined;

  const result = await setProgress({
    recordId: id,
    itemId,
    actorId: me.id,
    actorName: `${me.firstName} ${me.lastName}`.trim(),
    patch: {
      status,
      notes: body.notes === null ? null : typeof body.notes === "string" ? body.notes : undefined,
      fileUrl: body.fileUrl === null ? null : typeof body.fileUrl === "string" ? body.fileUrl : undefined,
      fileName: body.fileName === null ? null : typeof body.fileName === "string" ? body.fileName : undefined,
      expirationDate: body.expirationDate === null ? null : typeof body.expirationDate === "string" ? body.expirationDate : undefined,
    },
  });

  if (status) {
    await logOnboardingAudit({
      recordId: id, actorId: me.id, actorName: `${me.firstName} ${me.lastName}`.trim(),
      action: "item_status",
      details: `Item ${itemId.slice(0, 8)} → ${status}`,
    });
  }

  return NextResponse.json({ progress: result });
}
