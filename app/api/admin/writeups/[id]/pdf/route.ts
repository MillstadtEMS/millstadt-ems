/**
 * GET /api/admin/writeups/[id]/pdf
 *   Returns the PDF as an inline attachment. Works for both draft and
 *   finalized states — drafts get a watermark.
 *
 * Optional `?download=1` to force a Content-Disposition attachment.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import { getWriteUp, logWriteUpAudit } from "@/lib/lounge/writeups";
import { buildWriteUpPdf, writeUpFilename } from "@/lib/lounge/writeup-pdf";
import { getEmployee } from "@/lib/lounge/employees";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const wu = await getWriteUp(id);
  if (!wu) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const emp = await getEmployee(wu.employeeId);
  const last = emp?.lastName ?? wu.employeeFullName.split(" ").slice(-1)[0] ?? "Employee";
  const first = emp?.firstName ?? wu.employeeFullName.split(" ")[0] ?? "";
  const filename = writeUpFilename(last, first, wu.dateIssued);

  const pdf = await buildWriteUpPdf({ writeUp: wu, draft: wu.status === "draft" });

  await logWriteUpAudit({
    writeupId: id,
    actorId: me.id,
    actorName: `${me.firstName} ${me.lastName}`.trim(),
    action: wu.status === "draft" ? "previewed" : "pdf_generated",
  });

  const disposition = req.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
