/**
 * POST /api/admin/writeups
 *   Create a new draft write-up.
 *   Body: { employeeId }
 *   Pre-fills employee name, supervisor name from the caller.
 *
 * GET /api/admin/writeups?employeeId=...
 *   List all write-ups for an employee (draft + finalized), newest first.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import {
  createWriteUp,
  listWriteUpsForEmployee,
  logWriteUpAudit,
} from "@/lib/lounge/writeups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const employeeId = req.nextUrl.searchParams.get("employeeId");
  if (!employeeId) return NextResponse.json({ error: "employeeId required" }, { status: 400 });
  const writeups = await listWriteUpsForEmployee(employeeId);
  return NextResponse.json({ writeups });
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as null | { employeeId?: string };
  if (!body?.employeeId) return NextResponse.json({ error: "employeeId required" }, { status: 400 });

  const emp = await getEmployee(body.employeeId);
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });

  const wu = await createWriteUp({
    employeeId: emp.id,
    employeeFullName: `${emp.firstName} ${emp.lastName}`.trim(),
    employeePosition: emp.position,
    supervisorId: me.id,
    supervisorName: `${me.firstName} ${me.lastName}`.trim(),
    createdById: me.id,
  });

  await logWriteUpAudit({
    writeupId: wu.id,
    actorId: me.id,
    actorName: `${me.firstName} ${me.lastName}`.trim(),
    action: "created",
  });

  return NextResponse.json({ writeup: wu });
}
