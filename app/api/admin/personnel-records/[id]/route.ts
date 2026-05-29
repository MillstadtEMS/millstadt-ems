import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  archiveRecord,
  audit,
  getRecord,
  listAttachmentsForRecord,
  updateRecord,
  type UpdateRecordInput,
} from "@/lib/lounge/personnel";

export const dynamic = "force-dynamic";

function meta(req: NextRequest) {
  return {
    ip: req.headers.get("x-forwarded-for") ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
  };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const record = await getRecord(id);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const attachments = await listAttachmentsForRecord(id);
  await audit({
    recordId: id,
    employeeId: record.employeeId,
    actorId: me.id,
    action: "view",
    detail: { route: "detail" },
    ...meta(req),
  });
  return NextResponse.json({ record, attachments });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as UpdateRecordInput;
  const before = await getRecord(id);
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let updated;
  try {
    updated = await updateRecord(id, body);
  } catch (e) {
    if (e instanceof Error && e.message === "LOCKED") {
      return NextResponse.json({ error: "Record is locked. Unlock before editing." }, { status: 409 });
    }
    throw e;
  }
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const visibilityChanged =
    body.employeeVisible !== undefined && body.employeeVisible !== before.employeeVisible ||
    body.restrictedVisibility !== undefined && body.restrictedVisibility !== before.restrictedVisibility;

  await audit({
    recordId: id,
    employeeId: updated.employeeId,
    actorId: me.id,
    action: visibilityChanged ? "visibility_change" : "update",
    detail: { changes: body },
    ...meta(req),
  });

  return NextResponse.json({ record: updated });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const before = await getRecord(id);
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Soft-delete: archive, do not hard-delete. Requires the caller to be admin.
  await archiveRecord(id);
  await audit({
    recordId: id,
    employeeId: before.employeeId,
    actorId: me.id,
    action: "archive",
    detail: { previousStatus: before.status },
    ...meta(req),
  });
  return NextResponse.json({ ok: true });
}
