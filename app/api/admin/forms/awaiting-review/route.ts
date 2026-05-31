/**
 * GET /api/admin/forms/awaiting-review
 *   Surface all employee-initiated forms that have been signed by the
 *   employee but are still draft (i.e. waiting on an administrator to
 *   sign and finalize). Powers the "awaiting review" card on /admin/forms.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { sql } from "@/lib/lounge/db";
import { FORM_REGISTRY } from "@/lib/lounge/forms/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  form_type: string;
  employee_id: string;
  signatures: { who: string }[] | null;
  created_at: string | Date;
}

export async function GET() {
  const denied = await requireAdmin(); if (denied) return denied;
  const db = sql();
  const rows = (await db`
    SELECT f.id, f.form_type, f.employee_id, f.signatures, f.created_at,
           e.first_name, e.last_name, e.certification
    FROM lounge_forms f
    JOIN lounge_employees e ON e.id = f.employee_id
    WHERE f.status = 'draft'
      AND f.assignment_id IS NULL
      AND f.signatures @> '[{"who":"employee"}]'::jsonb
    ORDER BY f.created_at DESC
    LIMIT 100
  `) as unknown as (Row & { first_name: string; last_name: string; certification: string | null })[];

  const labelByType = new Map(FORM_REGISTRY.map((f) => [f.id, f.label]));

  return NextResponse.json({
    items: rows.map((r) => ({
      formId: r.id,
      formType: r.form_type,
      formLabel: labelByType.get(r.form_type) ?? r.form_type,
      employeeId: r.employee_id,
      employeeName: `${r.first_name} ${r.last_name}`.trim(),
      employeeCertification: r.certification,
      submittedAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    })),
  });
}
