/**
 * DELETE /api/lounge/acks/[id]   — author or admin can delete.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { sql } from "@/lib/lounge/db";
import { deleteAck } from "@/lib/lounge/acks";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const rows = (await sql()`
    SELECT created_by FROM lounge_acks WHERE id = ${id} LIMIT 1
  `) as unknown as { created_by: string }[];
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (rows[0].created_by !== me.id && !me.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await deleteAck(id);
  return NextResponse.json({ ok: true });
}
