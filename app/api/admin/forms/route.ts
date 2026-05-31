/**
 * GET  /api/admin/forms                  list registry (catalog of form types)
 * GET  /api/admin/forms?employeeId=...   list instances for that employee
 * POST /api/admin/forms                  create new draft for an employee
 *   body: { formType, employeeId, prefillData?, share? }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import { FORM_REGISTRY, getFormSpec } from "@/lib/lounge/forms/registry";
import { createForm, listFormsForEmployee, logFormAudit } from "@/lib/lounge/forms/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const employeeId = req.nextUrl.searchParams.get("employeeId");
  if (employeeId) {
    const forms = await listFormsForEmployee(employeeId);
    return NextResponse.json({ forms });
  }
  // Surface only the catalog fields the launcher needs.
  return NextResponse.json({
    registry: FORM_REGISTRY.map((f) => ({
      id: f.id,
      label: f.label,
      blurb: f.blurb,
      defaultFileTab: f.defaultFileTab,
      confidentiality: f.confidentiality,
      bulkAssignable: f.bulkAssignable,
      employeeFillable: !!f.employeeFillable,
      employeeRequestable: (f.employeeRequestable ?? f.employeeFillable) === true,
    })),
  });
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as null | {
    formType?: string;
    employeeId?: string;
    prefillData?: Record<string, unknown>;
    share?: Record<string, boolean>;
  };
  if (!body?.formType || !body.employeeId) {
    return NextResponse.json({ error: "formType + employeeId required" }, { status: 400 });
  }
  const spec = getFormSpec(body.formType);
  if (!spec) return NextResponse.json({ error: "Unknown form type" }, { status: 400 });

  const form = await createForm({
    formType: spec.id,
    employeeId: body.employeeId,
    createdById: me.id,
    data: body.prefillData ?? {},
    share: { ...spec.defaults, ...(body.share ?? {}) },
  });
  await logFormAudit({
    formId: form.id,
    actorId: me.id,
    actorName: `${me.firstName} ${me.lastName}`.trim(),
    action: "created",
    details: spec.label,
  });
  return NextResponse.json({ form });
}
