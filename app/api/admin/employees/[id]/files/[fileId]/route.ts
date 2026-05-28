/**
 * DELETE /api/admin/employees/[id]/files/[fileId]
 *   Removes the DB row + best-effort delete from Vercel Blob.
 */
import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { currentEmployee } from "@/lib/lounge/auth";
import { deleteEmployeeFile } from "@/lib/lounge/employees";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; fileId: string }> },
) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { fileId } = await ctx.params;
  const url = await deleteEmployeeFile(fileId);
  if (url) {
    try {
      await del(url);
    } catch {
      // best-effort cleanup
    }
  }
  return NextResponse.json({ ok: true });
}
