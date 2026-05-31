/**
 * GET  /api/admin/onboarding/records
 *   Lists every onboarding record (newest first). Used by the admin
 *   onboarding list page.
 * POST /api/admin/onboarding/records
 *   Creates a new in-progress record for an employee. Pre-seeds a
 *   pending progress row per active template item.
 *   Body: { employeeId, position?, startDate?, employmentType?,
 *           credentialLevel?, assignedUnit?, preceptorId?, witnessId? }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import { createRecord, listRecords, logOnboardingAudit } from "@/lib/lounge/onboarding/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin(); if (denied) return denied;
  const records = await listRecords();
  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as null | Record<string, unknown>;
  if (!body || typeof body.employeeId !== "string") {
    return NextResponse.json({ error: "employeeId required" }, { status: 400 });
  }

  const s = (k: string) => typeof body[k] === "string" && body[k] ? body[k] as string : null;
  const rec = await createRecord({
    employeeId: body.employeeId,
    position: s("position"),
    startDate: s("startDate"),
    employmentType: s("employmentType") as ReturnType<typeof s> as never,
    credentialLevel: s("credentialLevel") as ReturnType<typeof s> as never,
    assignedUnit: s("assignedUnit"),
    preceptorId: s("preceptorId"),
    witnessId: s("witnessId"),
    createdById: me.id,
  });
  await logOnboardingAudit({
    recordId: rec.id,
    actorId: me.id,
    actorName: `${me.firstName} ${me.lastName}`.trim(),
    action: "created",
    details: `Onboarding started for ${rec.employeeName}`,
  });
  return NextResponse.json({ record: rec });
}
