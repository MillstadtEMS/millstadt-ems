/**
 * POST /api/admin/employees/[id]/reset-password
 *   body: { newPassword?: string }   — defaults to firstinitial+lastname+3935
 *   Sets must_change_password = TRUE.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  getEmployee,
  resetEmployeePassword,
  defaultInitialPassword,
} from "@/lib/lounge/employees";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const emp = await getEmployee(id);
  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { newPassword?: string } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — use default
  }
  const newPassword =
    body.newPassword?.trim() || defaultInitialPassword(emp.firstName, emp.lastName);

  await resetEmployeePassword(id, newPassword);
  return NextResponse.json({ ok: true, newPassword });
}
