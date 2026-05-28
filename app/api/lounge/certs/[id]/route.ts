/**
 * DELETE /api/lounge/certs/[id]
 *   Employee deletes one of their own uploads. Admins can delete any.
 */
import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { sql } from "@/lib/lounge/db";
import { currentEmployee } from "@/lib/lounge/auth";
import { deleteEmployeeCert } from "@/lib/lounge/certs";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  // Ownership check (admins can delete anyone's).
  const owners = (await sql()`
    SELECT employee_id FROM lounge_employee_certs WHERE id = ${id} LIMIT 1
  `) as unknown as { employee_id: string }[];
  if (!owners[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (owners[0].employee_id !== me.id && !me.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = await deleteEmployeeCert(id);
  if (url) {
    try {
      await del(url);
    } catch {
      // best-effort cleanup
    }
  }
  return NextResponse.json({ ok: true });
}
