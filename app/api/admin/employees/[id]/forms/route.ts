/**
 * GET /api/admin/employees/[id]/forms
 *   Admin-only listing of every form on file for one employee, grouped by
 *   the spec's defaultFileTab. Powers the "Forms & documents" section on
 *   /admin/filing-cabinet/[id]. Drafts ship separately so admins can spot
 *   in-progress or awaiting-review items at a glance.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { listFormsForEmployee } from "@/lib/lounge/forms/db";
import { FORM_REGISTRY, fileTabLabel } from "@/lib/lounge/forms/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id } = await ctx.params;

  const forms = await listFormsForEmployee(id);
  const specByType = new Map(FORM_REGISTRY.map((f) => [f.id, f]));

  const decorated = forms.map((f) => {
    const spec = specByType.get(f.formType);
    return {
      id: f.id,
      formType: f.formType,
      formLabel: spec?.label ?? f.formType,
      fileTab: spec?.defaultFileTab ?? "personnel_records",
      fileTabLabel: spec ? fileTabLabel(spec.defaultFileTab) : "Personnel records",
      confidentiality: spec?.confidentiality ?? "open",
      status: f.status,
      assignmentId: f.assignmentId,
      pdfUrl: f.pdfUrl,
      pdfFilename: f.pdfFilename,
      finalizedAt: f.finalizedAt,
      createdAt: f.createdAt,
      hasEmployeeSignature: f.signatures.some((s) => s.who === "employee"),
      awaitingAdmin:
        f.status === "draft" &&
        f.assignmentId === null &&
        f.signatures.some((s) => s.who === "employee") &&
        !f.signatures.some((s) => s.who !== "employee"),
    };
  });

  return NextResponse.json({ forms: decorated });
}
