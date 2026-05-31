import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import { getForm, logFormAudit } from "@/lib/lounge/forms/db";
import { getFormSpec } from "@/lib/lounge/forms/registry";
import { buildFormPdf, formFilename } from "@/lib/lounge/forms/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const form = await getForm(id);
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const spec = getFormSpec(form.formType);
  if (!spec) return NextResponse.json({ error: "Unknown form type" }, { status: 500 });
  const emp = await getEmployee(form.employeeId);
  if (!emp) return NextResponse.json({ error: "Employee missing" }, { status: 404 });

  const pdf = await buildFormPdf({
    spec,
    form,
    employee: {
      firstName: emp.firstName,
      lastName: emp.lastName,
      fullName: `${emp.firstName} ${emp.lastName}`.trim(),
      position: emp.position,
      employeeId: null,
    },
  });
  const refDate = form.finalizedAt ?? form.createdAt;
  const filename = formFilename(spec, emp.lastName, emp.firstName, refDate);
  await logFormAudit({
    formId: id,
    actorId: me.id,
    actorName: `${me.firstName} ${me.lastName}`.trim(),
    action: "previewed",
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
