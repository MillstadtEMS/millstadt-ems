/**
 * GET    /api/admin/employees/[id]   — single employee (no plaintext SSN)
 * PATCH  /api/admin/employees/[id]   — update fields
 * DELETE /api/admin/employees/[id]   — soft delete (is_active = false)
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  getEmployee,
  updateEmployee,
  deactivateEmployee,
  type UpdateEmployeeInput,
} from "@/lib/lounge/employees";

export const runtime = "nodejs";

async function gate() {
  const emp = await currentEmployee();
  if (!emp || !emp.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return emp;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await gate();
  if (guard instanceof NextResponse) return guard;
  const { id } = await ctx.params;
  const emp = await getEmployee(id);
  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ employee: emp });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await gate();
  if (guard instanceof NextResponse) return guard;
  const { id } = await ctx.params;

  let body: UpdateEmployeeInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updated = await updateEmployee(id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ employee: updated });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await gate();
  if (guard instanceof NextResponse) return guard;
  const { id } = await ctx.params;
  await deactivateEmployee(id);
  return NextResponse.json({ ok: true });
}
