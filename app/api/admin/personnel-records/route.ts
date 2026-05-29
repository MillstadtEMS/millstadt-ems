import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  createRecord,
  listRecordsForEmployee,
  audit,
  type CreateRecordInput,
} from "@/lib/lounge/personnel";

export const dynamic = "force-dynamic";

function clientMeta(req: NextRequest) {
  return {
    ip: req.headers.get("x-forwarded-for") ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
  };
}

// GET /api/admin/personnel-records?employeeId=…
export async function GET(req: NextRequest) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employeeId");
  if (!employeeId) return NextResponse.json({ error: "employeeId required" }, { status: 400 });

  const records = await listRecordsForEmployee(employeeId);
  await audit({
    employeeId,
    actorId: me.id,
    action: "view",
    detail: { route: "list", count: records.length },
    ...clientMeta(req),
  });
  return NextResponse.json({ records });
}

// POST /api/admin/personnel-records  — create
export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.employeeId || !body?.category || !body?.recordType || !body?.title) {
    return NextResponse.json({ error: "employeeId, category, recordType, and title required" }, { status: 400 });
  }

  const input: CreateRecordInput = { ...body, createdBy: me.id };
  const created = await createRecord(input);

  await audit({
    recordId: created.id,
    employeeId: created.employeeId,
    actorId: me.id,
    action: "create",
    detail: { category: created.category, recordType: created.recordType, title: created.title },
    ...clientMeta(req),
  });

  return NextResponse.json({ record: created });
}
