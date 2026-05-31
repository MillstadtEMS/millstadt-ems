/**
 * GET /api/admin/form-assignments/[id]/csv
 *   Downloads a CSV of the assignment roster + signing status. Useful
 *   for offline tracking and compliance audits.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getAssignment, listFormsForAssignment } from "@/lib/lounge/forms/db";
import { listEmployees } from "@/lib/lounge/employees";
import { getFormSpec } from "@/lib/lounge/forms/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id } = await ctx.params;

  const assignment = await getAssignment(id);
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const spec = getFormSpec(assignment.formType);

  const [forms, employees] = await Promise.all([
    listFormsForAssignment(id),
    listEmployees({ includeInactive: true }),
  ]);
  const empById = new Map(employees.map((e) => [e.id, e]));

  const header = [
    "Employee", "Certification", "Status", "Finalized At", "Created At", "PDF URL", "Document ID",
  ];
  const rows = forms.map((f) => {
    const emp = empById.get(f.employeeId);
    return [
      emp ? `${emp.firstName} ${emp.lastName}`.trim() : "Unknown",
      emp?.certification ?? "",
      f.status,
      f.finalizedAt ?? "",
      f.createdAt,
      f.pdfUrl ?? "",
      f.id.slice(0, 8),
    ];
  });

  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");

  const label = spec?.label?.replace(/[^\w-]+/g, "_") ?? "FormAssignment";
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${label}_${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
