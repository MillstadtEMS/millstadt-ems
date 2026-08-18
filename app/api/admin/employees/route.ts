/**
 * GET  /api/admin/employees                — list (admin-only)
 * POST /api/admin/employees                — create employee
 *
 * Gated on lounge-admin session (KJ + Goetz only, per is_admin flag).
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  listEmployees,
  createEmployee,
  type CreateEmployeeInput,
} from "@/lib/lounge/employees";
import { recordSecurityAudit } from "@/lib/security/audit";

export const runtime = "nodejs";

async function gate() {
  const emp = await currentEmployee();
  if (!emp || !emp.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return emp;
}

export async function GET(req: NextRequest) {
  const guard = await gate();
  if (guard instanceof NextResponse) return guard;
  const includeInactive = new URL(req.url).searchParams.get("inactive") === "1";
  const employees = await listEmployees({ includeInactive });
  return NextResponse.json({ employees });
}

export async function POST(req: NextRequest) {
  const guard = await gate();
  if (guard instanceof NextResponse) return guard;

  let body: CreateEmployeeInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.firstName || !body.lastName) {
    return NextResponse.json(
      { error: "firstName and lastName required" },
      { status: 400 },
    );
  }
  try {
    const created = await createEmployee(body);
    await recordSecurityAudit({
      actorType: "administrator",
      actorId: guard.id,
      action: "employee_setup_token_created",
      resourceType: "employee",
      resourceId: created.employee.id,
      outcome: "completed",
      req,
      detail: { setupTokenExpiresAt: created.setupTokenExpiresAt },
    });
    return NextResponse.json(created);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Create failed";
    // Most common cause: duplicate username (unique constraint)
    if (/unique|duplicate/i.test(msg)) {
      return NextResponse.json(
        { error: "An employee with that username already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
