/**
 * POST /api/admin/form-assignments
 *   Bulk-push a form to a target. Creates the assignment row + a draft
 *   instance for every targeted employee. Returns the assignment with
 *   progress counters.
 *   body: {
 *     formType, title, summary?, prefillData?, share?, dueAt?,
 *     targetKind: 'all' | 'crew' | 'admin' | 'explicit',
 *     targetEmployeeIds?: string[]   (required for explicit)
 *   }
 *
 * GET /api/admin/form-assignments?formType=...
 *   List open assignments for that form type with progress.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import { listEmployees } from "@/lib/lounge/employees";
import { getFormSpec } from "@/lib/lounge/forms/registry";
import {
  createAssignment,
  createForm,
  listAssignmentsForType,
  logFormAudit,
  progressForAssignment,
} from "@/lib/lounge/forms/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const formType = req.nextUrl.searchParams.get("formType");
  if (!formType) return NextResponse.json({ error: "formType required" }, { status: 400 });
  const assignments = await listAssignmentsForType(formType, req.nextUrl.searchParams.get("all") === "1");
  const withProgress = await Promise.all(
    assignments.map(async (a) => ({ ...a, progress: await progressForAssignment(a.id) })),
  );
  return NextResponse.json({ assignments: withProgress });
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as null | {
    formType?: string;
    title?: string;
    summary?: string;
    prefillData?: Record<string, unknown>;
    share?: { saveToFile: boolean; visibleToEmployee: boolean; emailEmployee: boolean; emailAdminInbox: boolean };
    dueAt?: string | null;
    targetKind?: "all" | "crew" | "admin" | "explicit";
    targetEmployeeIds?: string[];
  };
  if (!body?.formType || !body.title || !body.targetKind) {
    return NextResponse.json({ error: "formType, title, targetKind required" }, { status: 400 });
  }
  const spec = getFormSpec(body.formType);
  if (!spec) return NextResponse.json({ error: "Unknown form type" }, { status: 400 });
  if (!spec.bulkAssignable) return NextResponse.json({ error: "This form is not bulk-assignable." }, { status: 400 });

  // Resolve target employees.
  const allActive = await listEmployees();
  let targets: typeof allActive = [];
  switch (body.targetKind) {
    case "all":      targets = allActive; break;
    case "crew":     targets = allActive.filter((e) => !e.isAdmin); break;
    case "admin":    targets = allActive.filter((e) =>  e.isAdmin); break;
    case "explicit":
      if (!Array.isArray(body.targetEmployeeIds) || body.targetEmployeeIds.length === 0) {
        return NextResponse.json({ error: "Pick at least one employee." }, { status: 400 });
      }
      targets = allActive.filter((e) => body.targetEmployeeIds!.includes(e.id));
      break;
    default:
      return NextResponse.json({ error: "Bad targetKind" }, { status: 400 });
  }

  if (targets.length === 0) {
    return NextResponse.json({ error: "Target resolved to zero employees." }, { status: 400 });
  }

  const share = body.share ?? spec.defaults;
  const assignment = await createAssignment({
    formType: body.formType,
    title: body.title,
    summary: body.summary,
    prefillData: body.prefillData ?? {},
    share,
    dueAt: body.dueAt ?? null,
    targetKind: body.targetKind,
    targetEmployeeIds: targets.map((t) => t.id),
    createdById: me.id,
    createdByName: `${me.firstName} ${me.lastName}`.trim(),
  });

  // Spawn a draft instance for each target. Each row is independent so
  // we can track per-employee completion + audit.
  for (const t of targets) {
    const form = await createForm({
      formType: body.formType,
      employeeId: t.id,
      createdById: me.id,
      data: { ...body.prefillData, employeeFullName: `${t.firstName} ${t.lastName}`.trim() },
      share,
      assignmentId: assignment.id,
    });
    await logFormAudit({
      formId: form.id,
      actorId: me.id,
      actorName: `${me.firstName} ${me.lastName}`.trim(),
      action: "assigned",
      details: `assignment=${assignment.id}`,
    });
  }

  return NextResponse.json({ assignment, assignedCount: targets.length });
}
