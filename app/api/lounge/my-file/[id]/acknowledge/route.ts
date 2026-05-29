import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { acknowledgeRecord, audit, getRecord } from "@/lib/lounge/personnel";

export const dynamic = "force-dynamic";

function meta(req: NextRequest) {
  return {
    ip: req.headers.get("x-forwarded-for") ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
  };
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const record = await getRecord(id);
  if (!record || record.employeeId !== me.id || !record.employeeVisible) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const updated = await acknowledgeRecord({
    recordId: id,
    employeeId: me.id,
    signatureDataUrl: typeof body.signature === "string" ? body.signature : null,
    response: typeof body.response === "string" ? body.response.trim() : null,
  });

  await audit({
    recordId: id,
    employeeId: me.id,
    actorId: me.id,
    action: "acknowledge",
    detail: { response: typeof body.response === "string" ? body.response.trim() : null },
    ...meta(req),
  });

  return NextResponse.json({ record: updated });
}
