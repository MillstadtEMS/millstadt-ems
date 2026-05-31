/**
 * GET  /api/lounge/forms      — pending + visible-finalized forms + draft-by-self
 *                                + the catalog of employee-requestable form types
 * POST /api/lounge/forms      — disabled; employees request forms through
 *                                /api/lounge/form-requests
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  listEmployeeVisibleForms,
  listFormsForEmployee,
  listPendingForEmployee,
} from "@/lib/lounge/forms/db";
import { FORM_REGISTRY, isEmployeeRequestableForm } from "@/lib/lounge/forms/registry";

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

  // Forms without an assignment_id that are still draft. These are usually
  // admin-created individual forms or older employee-started drafts.
  const myDrafts = decorate(allMyForms.filter((f) => f.status === "draft" && f.assignmentId === null));

  // Catalog of form types this employee can request from leadership.
  const startable = FORM_REGISTRY
    .filter(isEmployeeRequestableForm)
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

export async function POST(_req: NextRequest) {
  // Direct self-start was removed when the request workflow was added.
  // Employees can no longer create a form instance directly — they
  // request the form via POST /api/lounge/form-requests, an admin
  // approves it, and the resulting assignment seeds the draft.
  return NextResponse.json(
    { error: "Forms must be requested via /api/lounge/form-requests. Direct self-start is disabled." },
    { status: 410 },
  );
}
