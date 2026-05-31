/**
 * POST /api/lounge/profile-change-requests
 *   Logged-in employee submits a request to change an About-Me field.
 *   Body: multipart form-data with
 *     fieldKey      (string, required)  — one of REQUESTABLE_FIELDS
 *     proposedValue (string, optional)  — what they want it changed to
 *     comments      (string, required, may be empty if field+value is enough)
 *     file          (File,   optional)  — supporting attachment
 *
 *   On success the row is stored, every admin gets a lounge notification,
 *   a branded summary email is sent to millstadtems@gmail.com, and the
 *   requester receives a confirmation email (CC'd to their opt-in
 *   secondary email if enabled).
 *
 * GET /api/lounge/profile-change-requests
 *   Returns the caller's own request history (so the About Me page can
 *   show a "Pending requests" list).
 */
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import {
  createChangeRequest,
  listRequestsForEmployee,
  labelForField,
  REQUESTABLE_FIELDS,
} from "@/lib/lounge/profile-change-requests";
import { notifyAdminsInLounge, emailAdmins } from "@/lib/lounge/notify-admins";
import { sendEmployeeEmail } from "@/lib/lounge/employee-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reqs = await listRequestsForEmployee(me.id);
  return NextResponse.json({ requests: reqs });
}

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const fieldKey = String(form.get("fieldKey") ?? "").trim();
  const proposedValueRaw = form.get("proposedValue");
  const proposedValue = typeof proposedValueRaw === "string" ? proposedValueRaw.trim() : "";
  const comments = String(form.get("comments") ?? "").trim();
  const file = form.get("file");

  // Validate the field key against the public allow-list — guards against
  // someone hand-crafting a request for a non-existent column.
  const fieldMeta = REQUESTABLE_FIELDS.find((f) => f.key === fieldKey);
  if (!fieldMeta) return NextResponse.json({ error: "Pick a field to change" }, { status: 400 });
  if (!proposedValue && !comments && (!(file instanceof File) || file.size === 0)) {
    return NextResponse.json({ error: "Add a new value, a comment, or an attachment so we know what to change." }, { status: 400 });
  }

  // Optional attachment — store in Vercel Blob with a long random slug so
  // the URL itself is hard to guess. This is obscurity-not-security; the
  // admin reviewer page is the canonical entry point.
  let attachmentUrl: string | null = null;
  let attachmentName: string | null = null;
  let attachmentMime: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Attachment is over 10MB. Please trim or upload a smaller version." }, { status: 400 });
    }
    const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const slug = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    const safeName = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 80);
    const blob = await put(
      `lounge/profile-change-requests/${me.id}/${slug}.${ext}`,
      file,
      { access: "public", contentType: file.type || "application/octet-stream" },
    );
    attachmentUrl = blob.url;
    attachmentName = safeName;
    attachmentMime = file.type || null;
  }

  const created = await createChangeRequest({
    employeeId: me.id,
    fieldKey,
    fieldLabel: fieldMeta.label,
    proposedValue: proposedValue || null,
    comments,
    attachmentUrl,
    attachmentName,
    attachmentMime,
  });

  // ── Notify admins inside the lounge ────────────────────────────────────
  try {
    await notifyAdminsInLounge({
      kind: "post",
      title: `Profile change request: ${me.firstName} ${me.lastName}`,
      bodyPreview: `${labelForField(fieldKey)}${proposedValue ? ` → ${proposedValue}` : ""}`,
      linkUrl: `/admin/employees/${me.id}#change-requests`,
      sourceId: created.id,
      actorId: me.id,
    });
  } catch (e) { console.error("[profile-change-requests] admin in-lounge notify failed:", e); }

  // ── Email millstadtems@gmail.com (admin inbox) ─────────────────────────
  try {
    await emailAdmins({
      kicker: "Profile change request",
      headline: `${me.firstName} ${me.lastName}`,
      meta: `${labelForField(fieldKey)} · submitted ${new Date(created.createdAt).toLocaleString("en-US", { timeZone: "America/Chicago" })} CT`,
      bodyText: [
        `Field: ${labelForField(fieldKey)}`,
        proposedValue ? `Requested new value: ${proposedValue}` : null,
        comments ? `\nComments:\n${comments}` : null,
        attachmentName ? `\nAttachment: ${attachmentName}` : null,
      ].filter(Boolean).join("\n"),
      link: { url: `https://millstadtems.org/admin/employees/${me.id}#change-requests`, label: "Review in admin" },
      subject: `[EMS Lounge] Profile change request — ${me.firstName} ${me.lastName}`,
    });
  } catch (e) { console.error("[profile-change-requests] admin email failed:", e); }

  // ── Confirmation email to the employee (+ secondary if opted in) ───────
  try {
    const emp = await getEmployee(me.id);
    const ccs: string[] = [];
    if (emp?.email) ccs.push(emp.email);
    if (emp?.emailSecondary && emp.emailSecondaryAlerts) ccs.push(emp.emailSecondary);
    if (ccs.length > 0) {
      await sendEmployeeEmail({
        to: ccs,
        subject: `Request received: ${labelForField(fieldKey)}`,
        kicker: "Profile change request received",
        headline: "We got your request",
        meta: `${labelForField(fieldKey)} · ${new Date(created.createdAt).toLocaleString("en-US", { timeZone: "America/Chicago" })} CT`,
        bodyText: [
          `Hi ${me.firstName},`,
          ``,
          `Leadership received your request to update your ${labelForField(fieldKey).toLowerCase()}.`,
          proposedValue ? `\nYou asked for: ${proposedValue}` : null,
          comments ? `\nYour comments:\n${comments}` : null,
          attachmentName ? `\nYou attached: ${attachmentName}` : null,
          ``,
          `We'll let you know when it's been reviewed. No action needed on your end.`,
        ].filter(Boolean).join("\n"),
      });
    }
  } catch (e) { console.error("[profile-change-requests] requester email failed:", e); }

  return NextResponse.json({ ok: true, request: created });
}
