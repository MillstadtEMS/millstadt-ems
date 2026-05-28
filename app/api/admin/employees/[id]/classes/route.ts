/**
 * PUT /api/admin/employees/[id]/classes
 *   body: { classIds: string[] }
 *   Replaces the full set of classes assigned to this employee.
 * GET — returns the employee's current classes.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployeeClasses, setEmployeeClasses } from "@/lib/lounge/certs";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const classes = await getEmployeeClasses(id);
  return NextResponse.json({ classes });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const { classIds }: { classIds: string[] } = await req.json();
  if (!Array.isArray(classIds)) {
    return NextResponse.json({ error: "classIds must be an array" }, { status: 400 });
  }
  await setEmployeeClasses(id, classIds, me.id);
  const classes = await getEmployeeClasses(id);
  return NextResponse.json({ classes });
}
