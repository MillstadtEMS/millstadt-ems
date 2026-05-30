import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import {
  getOrCreateApplicantWorkflow,
  updateApplicantStatus,
  updateApplicantInterview,
  updateApplicantEvaluation,
  updateApplicantOnboarding,
  markInterviewEmailSent,
  getFormSubmission,
} from "@/lib/db";
import { APPLICANT_STATUSES, type ApplicantStatus } from "@/lib/applicant-workflow";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/applicants/[id]
 * Returns workflow + form submission for the given submission id.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id } = await ctx.params;
  try {
    const submission = await getFormSubmission(id);
    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }
    const workflow = await getOrCreateApplicantWorkflow(id);
    return NextResponse.json({ submission, workflow });
  } catch (err) {
    console.error("[applicants GET]", err);
    return NextResponse.json({ error: "Could not load applicant" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/applicants/[id]
 * Body: one of:
 *   { status: "Denied", note?: string }
 *   { interview: { ...partial } }
 *   { evaluation: { ...partial } }
 *   { onboarding: { ...partial } }
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id } = await ctx.params;
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    let workflow = await getOrCreateApplicantWorkflow(id);

    // Status transition
    if (typeof body.status === "string") {
      const newStatus = body.status as ApplicantStatus;
      if (!APPLICANT_STATUSES.includes(newStatus)) {
        return NextResponse.json({ error: `Invalid status: ${newStatus}` }, { status: 400 });
      }
      workflow = await updateApplicantStatus(id, newStatus, body.actor, body.note);
    }

    // Interview update
    if (body.interview && typeof body.interview === "object") {
      const wasScheduled = !!workflow.interview.scheduled;
      workflow = await updateApplicantInterview(id, body.interview);

      // Send interview email when newly scheduled
      const isNowScheduled = !!workflow.interview.scheduled;
      if (!wasScheduled && isNowScheduled && !workflow.interviewEmailSentAt) {
        try {
          await sendInterviewEmail(id, workflow);
          await markInterviewEmailSent(id);
          workflow = await getOrCreateApplicantWorkflow(id);
        } catch (mailErr) {
          console.error("[applicants] interview email failed:", mailErr);
          // Continue — don't block on email.
        }
      }
    }

    // Evaluation update
    if (body.evaluation && typeof body.evaluation === "object") {
      workflow = await updateApplicantEvaluation(id, body.evaluation);
    }

    // Onboarding update
    if (body.onboarding && typeof body.onboarding === "object") {
      workflow = await updateApplicantOnboarding(id, body.onboarding);
    }

    return NextResponse.json({ workflow });
  } catch (err) {
    console.error("[applicants PATCH]", err);
    return NextResponse.json({ error: "Could not update applicant" }, { status: 500 });
  }
}

// ── Interview-scheduled email ─────────────────────────────────────────────
async function sendInterviewEmail(submissionId: string, workflow: Awaited<ReturnType<typeof getOrCreateApplicantWorkflow>>) {
  const submission = await getFormSubmission(submissionId);
  if (!submission) return;

  const f = submission.fields as Record<string, string | string[]>;
  const fullName = [f.first_name, f.middle_name, f.last_name]
    .filter(Boolean)
    .map(v => Array.isArray(v) ? v.join(" ") : String(v))
    .join(" ")
    .trim() || "Applicant";

  const position = String(f.position ?? "Position Not Specified");
  const phone = String(f.phone ?? "");
  const email = String(f.email ?? "");
  const i = workflow.interview;

  const scheduledFmt = i.scheduledAt
    ? new Date(i.scheduledAt).toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "full", timeStyle: "short" }) + " CT"
    : "TBD";

  const interviewers = (i.interviewers ?? []).filter(Boolean).join(", ") || "TBD";
  const location = i.location ?? "TBD";
  const notes = i.notes ?? "";

  const subject = `Interview Scheduled — ${fullName} — ${position}`;

  const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f4f4f5;margin:0;padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
      <tr><td style="background:#0f1e3a;padding:28px 32px;border-bottom:4px solid #c9a93a;">
        <div style="color:#c9a93a;font-size:11px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:6px;">Millstadt Ambulance Service</div>
        <h1 style="color:#fff;margin:0;font-size:24px;font-weight:900;">Interview Scheduled</h1>
      </td></tr>
      <tr><td style="padding:28px 32px;">
        <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#111;">An interview has been scheduled with the following applicant:</p>
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
          ${row("Applicant", fullName)}
          ${row("Position", position)}
          ${row("Date / Time", scheduledFmt)}
          ${row("Location / Link", location)}
          ${row("Interviewers", interviewers)}
          ${row("Phone", phone || "—")}
          ${row("Email", email || "—")}
          ${notes ? row("Notes", notes) : ""}
        </table>
        <p style="margin:24px 0 0;font-size:13px;color:#666;line-height:1.6;">
          Submission ID: <span style="font-family:monospace;color:#888;">${submissionId}</span><br>
          Review on the admin portal: <a href="https://www.millstadtems.org/admin/submissions/${submissionId}" style="color:#1e3a6e;">View Application</a>
        </p>
      </td></tr>
      <tr><td style="background:#f4f4f5;padding:14px 32px;border-top:1px solid #e5e5e5;color:#888;font-size:11px;">
        Auto-generated by Millstadt EMS Hiring Workflow.
      </td></tr>
    </table>
  </body></html>`;

  function row(label: string, value: string): string {
    return `<tr>
      <td style="padding:10px 12px 10px 0;border-bottom:1px solid #eee;color:#666;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:0.06em;width:140px;vertical-align:top;">${esc(label)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eee;color:#111;font-size:14px;line-height:1.5;">${esc(value).replace(/\n/g, "<br>")}</td>
    </tr>`;
  }

  function esc(s: string): string {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  const auth = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  const gmail = google.gmail({ version: "v1", auth });
  const from = process.env.GMAIL_USER ?? "millstadtcad@gmail.com";

  const recipients = [
    "millstadtems@gmail.com",
    "kenneth.james@millstadtems.org",
    "jennifer.goetz@millstadtems.org",
  ];

  const raw = Buffer.from(
    `From: Millstadt EMS Hiring <${from}>\r\n` +
    `To: ${recipients.join(", ")}\r\n` +
    `Subject: ${subject}\r\n` +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: text/html; charset=utf-8\r\n` +
    `\r\n` +
    html
  ).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
}
