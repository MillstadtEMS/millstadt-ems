/**
 * GET /api/admin/employees/[id]/certs-overview
 *   Returns this employee's certs + required-vs-uploaded status for the
 *   admin detail page. Admin-only.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { certStatusForEmployee, listEmployeeCerts } from "@/lib/lounge/certs";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const [status, certs] = await Promise.all([
    certStatusForEmployee(id),
    listEmployeeCerts(id),
  ]);
  return NextResponse.json({ status, certs });
}
