/**
 * PATCH /api/admin/profile-change-requests/[id]
 *   Admin approve / deny / toggle share-with-employee. Body:
 *     { status?: "approved"|"denied", shareWithEmployee?: boolean,
 *       adminDecisionNotes?: string, applyValue?: boolean }
 *
 *   If `applyValue` is true and the request has a `proposedValue`, the
 *   employee record is updated in the same call so the admin doesn't
 *   also have to open the employee edit form.
 *
 *   When the decision is finalized we notify the requester via the
 *   lounge bell + an email (CC'd to their secondary if they opted in).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  getRequest,
  setRequestDecision,
  setShareWithEmployee,
} from "@/lib/lounge/profile-change-requests";
import { getEmployee, updateEmployee, type UpdateEmployeeInput } from "@/lib/lounge/employees";
import { createNotifications } from "@/lib/lounge/notifications";
import { sendEmployeeEmail } from "@/lib/lounge/employee-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id } = await ctx.params;

  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as null | {
    status?: "approved" | "denied";
    shareWithEmployee?: boolean;
    adminDecisionNotes?: string;
    applyValue?: boolean;
  };
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const existing = await getRequest(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Share-only toggle (no status change) — used by the checkbox on the
  // admin panel after the decision is made.
  if (body.status === undefined && typeof body.shareWithEmployee === "boolean") {
    await setShareWithEmployee(id, body.shareWithEmployee);
    return NextResponse.json({ ok: true });
  }

  if (body.status !== "approved" && body.status !== "denied") {
    return NextResponse.json({ error: "status must be approved or denied" }, { status: 400 });
  }

  // Optionally write the proposed value into the employee record. Only
  // applies if the field is a real updatable field and the request
  // carried a non-empty value.
  if (body.status === "approved" && body.applyValue && existing.proposedValue) {
    const patch: UpdateEmployeeInput = {};
    const k = existing.fieldKey as keyof UpdateEmployeeInput;
    // Only allow the field keys that map to real updatable strings on
    // UpdateEmployeeInput. Anything else (including "other") is a
    // no-op — the human admin will edit manually.
    const stringFields = new Set<keyof UpdateEmployeeInput>([
      "certification", "email", "phone", "dob",
      "addressStreet", "addressCity", "addressState", "addressZip",
      "driverLicenseNum", "driverLicenseState",
      "ecName", "ecRelationship", "ecPhone",
      "ec2Name", "ec2Relationship", "ec2Phone",
      "shirtSize", "pantSize", "jacketSize",
      "allergies", "medicalConditions", "bloodType",
      "emailSecondary",
    ]);
    if (stringFields.has(k)) {
      // Treat the string set as an index of values to write.
      (patch as Record<string, string | null>)[k as string] = existing.proposedValue;
      await updateEmployee(existing.employeeId, patch);
    }
  }

  await setRequestDecision(id, {
    status: body.status,
    adminDecisionNotes: body.adminDecisionNotes ?? null,
    shareWithEmployee: Boolean(body.shareWithEmployee),
    decidedById: me.id,
  });

  // ── Tell the employee ──────────────────────────────────────────────────
  try {
    await createNotifications([{
      recipientId: existing.employeeId,
      kind: "post",
      title: body.status === "approved"
        ? `Your change request was approved: ${existing.fieldLabel}`
        : `Your change request was denied: ${existing.fieldLabel}`,
      bodyPreview: body.adminDecisionNotes ?? "",
      linkUrl: "/lounge/about-me",
      sourceId: existing.id,
      actorId: me.id,
    }]);
  } catch (e) { console.error("[admin/profile-change-requests] notify employee failed:", e); }

  try {
    const emp = await getEmployee(existing.employeeId);
    const ccs: string[] = [];
    if (emp?.email) ccs.push(emp.email);
    if (emp?.emailSecondary && emp.emailSecondaryAlerts) ccs.push(emp.emailSecondary);
    if (ccs.length > 0) {
      const verdict = body.status === "approved" ? "approved" : "denied";
      await sendEmployeeEmail({
        to: ccs,
        subject: `Change request ${verdict}: ${existing.fieldLabel}`,
        kicker: `Change request ${verdict}`,
        headline: existing.fieldLabel,
        meta: `Decided ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} CT`,
        bodyText: [
          `Hi ${emp?.firstName ?? "there"},`,
          ``,
          `Your request to update your ${existing.fieldLabel.toLowerCase()} was ${verdict}.`,
          body.adminDecisionNotes ? `\nNote from leadership:\n${body.adminDecisionNotes}` : null,
          ``,
          `You can review your About Me page in the Employee Lounge.`,
        ].filter(Boolean).join("\n"),
        link: { url: "https://millstadtems.org/lounge/about-me", label: "Open About Me" },
      });
    }
  } catch (e) { console.error("[admin/profile-change-requests] email employee failed:", e); }

  return NextResponse.json({ ok: true });
}
