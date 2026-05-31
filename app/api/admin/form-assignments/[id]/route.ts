/**
 * GET /api/admin/form-assignments/[id]
 *   Returns the assignment + every spawned form instance with each
 *   employee's name and current status. Used by the assignment-detail
 *   admin page.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import {
  getAssignment,
  listFormsForAssignment,
  progressForAssignment,
} from "@/lib/lounge/forms/db";
import { listEmployees } from "@/lib/lounge/employees";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id } = await ctx.params;

  const assignment = await getAssignment(id);
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [forms, progress, employees] = await Promise.all([
    listFormsForAssignment(id),
    progressForAssignment(id),
    listEmployees({ includeInactive: true }),
  ]);

  const empById = new Map(employees.map((e) => [e.id, e]));
  const rows = forms.map((f) => {
    const emp = empById.get(f.employeeId);
    return {
      formId: f.id,
      employeeId: f.employeeId,
      employeeName: emp ? `${emp.firstName} ${emp.lastName}`.trim() : "Unknown",
      employeeCertification: emp?.certification ?? null,
      employeeIsAdmin: emp?.isAdmin ?? false,
      status: f.status,
      finalizedAt: f.finalizedAt,
      createdAt: f.createdAt,
      pdfUrl: f.pdfUrl,
      pdfFilename: f.pdfFilename,
      emailedEmployee: f.emailedToEmployee,
    };
  });

  return NextResponse.json({ assignment, progress, rows });
}
