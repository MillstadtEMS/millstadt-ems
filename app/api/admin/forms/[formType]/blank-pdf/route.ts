/**
 * GET /api/admin/forms/[formType]/blank-pdf
 *   Streams a blank "Draft preview" PDF of a registry form type. Used by
 *   admins to print an unfilled form for paper handoff to a new hire or
 *   for in-person interviews where digital signing isn't practical.
 *
 *   The PDF renders the spec's title block, section structure, and
 *   signature panels with no field values — admins fill in by hand.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getFormSpec } from "@/lib/lounge/forms/registry";
import { buildFormPdf, formFilename } from "@/lib/lounge/forms/pdf";
import type { FormInstance } from "@/lib/lounge/forms/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ formType: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { formType } = await ctx.params;

  const spec = getFormSpec(formType);
  if (!spec) return NextResponse.json({ error: "Unknown form type" }, { status: 404 });

  // Synthesize an empty form so buildFormPdf can render the section
  // structure, field labels, and signature panels with blank fillable
  // lines. The default renderer drops empty scalars — to keep the PDF
  // useful as a printable blank, we seed each field key with a long
  // run of underscores so it renders as a line you can write on.
  const BLANK_LINE = "________________________________";
  const seedData: Record<string, unknown> = {};
  for (const section of spec.sections) {
    for (const field of section.fields) {
      if (field.type === "checkbox") seedData[field.key] = false;
      else if (field.type === "longtext") seedData[field.key] = "\n" + BLANK_LINE + "\n" + BLANK_LINE + "\n" + BLANK_LINE;
      else seedData[field.key] = BLANK_LINE;
    }
  }

  const blank: FormInstance = {
    id: "00000000-blank-" + Date.now().toString(36),
    formType: spec.id,
    employeeId: "blank",
    status: "draft",
    data: seedData,
    signatures: [],
    refusedToSign: [],
    share: { saveToFile: false, visibleToEmployee: false, emailEmployee: false, emailAdminInbox: false },
    assignmentId: null,
    pdfUrl: null,
    pdfFilename: null,
    personnelRecordId: null,
    emailedToEmployee: false,
    emailedToAdminInbox: false,
    emailedAt: null,
    finalizedAt: null,
    finalizedById: null,
    rescindedAt: null,
    rescindedById: null,
    rescindedReason: null,
    rescindedByName: null,
    correctedById: null,
    correctsId: null,
    createdById: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const pdf = await buildFormPdf({
    spec,
    form: blank,
    employee: {
      firstName: "",
      lastName: "",
      fullName: "(blank — fill in by hand)",
      position: null,
      employeeId: null,
    },
  });

  const filename = `BLANK_${formFilename(spec, "Blank", "Form", null)}`;

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
