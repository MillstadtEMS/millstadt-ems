/**
 * GET /api/lounge/forms                  — list pending + visible-finalized forms for the caller
 */
import { NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { listEmployeeVisibleForms, listPendingForEmployee } from "@/lib/lounge/forms/db";
import { FORM_REGISTRY } from "@/lib/lounge/forms/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [pending, visible] = await Promise.all([
    listPendingForEmployee(me.id),
    listEmployeeVisibleForms(me.id),
  ]);

  const labelByType = new Map(FORM_REGISTRY.map((f) => [f.id, f.label]));
  function decorate(list: Awaited<typeof pending>) {
    return list.map((f) => ({ ...f, formLabel: labelByType.get(f.formType) ?? f.formType }));
  }
  return NextResponse.json({
    pending: decorate(pending),
    visible: decorate(visible),
  });
}
