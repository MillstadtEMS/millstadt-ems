/**
 * GET  /api/lounge/forms      — pending + visible-finalized forms + draft-by-self
 *                                + the catalog of employee-fillable form types
 * POST /api/lounge/forms      — employee starts their own form
 *                                body: { formType }
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import {
  createForm,
  listEmployeeVisibleForms,
  listFormsForEmployee,
  listPendingForEmployee,
  logFormAudit,
} from "@/lib/lounge/forms/db";
import { FORM_REGISTRY, getFormSpec } from "@/lib/lounge/forms/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [pending, visible, allMyForms] = await Promise.all([
    listPendingForEmployee(me.id),
    listEmployeeVisibleForms(me.id),
    listFormsForEmployee(me.id),
  ]);

  const labelByType = new Map(FORM_REGISTRY.map((f) => [f.id, f.label]));
  function decorate(list: typeof pending) {
    return list.map((f) => ({ ...f, formLabel: labelByType.get(f.formType) ?? f.formType }));
  }

  // Forms the employee started themselves (no assignment_id) that are
  // still draft — distinct from "pending" which only counts admin-pushed
  // forms. Crew want to see their in-progress complaints / injury
  // reports / leave requests separately.
  const myDrafts = decorate(allMyForms.filter((f) => f.status === "draft" && f.assignmentId === null));

  // Catalog of form types this employee can start themselves.
  const startable = FORM_REGISTRY
    .filter((f) => f.employeeFillable === true)
    .map((f) => ({
      id: f.id,
      label: f.label,
      blurb: f.blurb,
      confidentiality: f.confidentiality,
    }));

  return NextResponse.json({
    pending: decorate(pending),
    visible: decorate(visible),
    drafts: myDrafts,
    startable,
  });
}

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as null | { formType?: string };
  if (!body?.formType) return NextResponse.json({ error: "formType required" }, { status: 400 });

  const spec = getFormSpec(body.formType);
  if (!spec) return NextResponse.json({ error: "Unknown form type" }, { status: 400 });
  if (!spec.employeeFillable) {
    return NextResponse.json({ error: "This form can only be started by an administrator." }, { status: 403 });
  }

  const emp = await getEmployee(me.id);
  if (!emp) return NextResponse.json({ error: "Employee record not found" }, { status: 404 });

  const form = await createForm({
    formType: spec.id,
    employeeId: me.id,
    createdById: me.id,
    data: { employeeFullName: `${emp.firstName} ${emp.lastName}`.trim() },
    share: spec.defaults,
  });
  await logFormAudit({
    formId: form.id,
    actorId: me.id,
    actorName: `${me.firstName} ${me.lastName}`.trim(),
    action: "created",
    details: `${spec.label} — started by employee`,
  });

  return NextResponse.json({ form });
}
