/**
 * GET /api/cron/cert-alerts
 *   Triggered by Vercel cron (entry in vercel.json). Requires the
 *   CRON_SECRET in the Authorization header.
 *
 * Behavior:
 *   - Walks every expiration-tracked cert. Whenever today's threshold
 *     differs from the cert's last_alerted_threshold (or it's in the
 *     final-7-days / expired window), emails the employee and records
 *     the send so we don't double-fire.
 *   - On Mondays (UTC), also emails admins (KJ + Goetz) a single digest
 *     of every expiring + expired cert across the crew.
 */
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/lounge/db";
import {
  findCertsNeedingAlert,
  recordAlertSent,
  adminDigestSentToday,
  daysUntil,
} from "@/lib/lounge/certs";
import {
  sendEmployeeCertAlert,
  sendAdminCertDigest,
} from "@/lib/lounge/cert-email";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Cron secret gate — Vercel sends Authorization: Bearer <CRON_SECRET>.
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const isMonday = now.getUTCDay() === 1;
  const summary = {
    employeeEmailsSent: 0,
    employeeEmailsFailed: 0,
    adminDigestSent: false,
    hits: 0,
  };

  // ── Employee alerts ───────────────────────────────────────────────
  const hits = await findCertsNeedingAlert(now);
  summary.hits = hits.length;

  for (const hit of hits) {
    const emp = await loadEmployeeForCert(hit.cert.employeeId);
    if (!emp || !emp.email) continue;
    try {
      await sendEmployeeCertAlert({
        to: emp.email,
        employeeName: `${emp.first_name} ${emp.last_name}`,
        cert: hit.cert,
        daysLeft: hit.cert.expiresOn ? daysUntil(hit.cert.expiresOn, now) : 0,
      });
      await recordAlertSent(hit.cert.id, hit.threshold, hit.cert.employeeId, "employee", emp.email, true);
      summary.employeeEmailsSent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await recordAlertSent(hit.cert.id, hit.threshold, hit.cert.employeeId, "employee", emp.email, false, msg);
      summary.employeeEmailsFailed++;
    }
  }

  // ── Admin Monday digest ──────────────────────────────────────────
  if (isMonday && !(await adminDigestSentToday(now))) {
    const adminEmails = await loadAdminEmails();
    if (adminEmails.length > 0) {
      const digest = await buildAdminDigest(now);
      if (digest.expiringSoon.length > 0 || digest.expired.length > 0) {
        try {
          await sendAdminCertDigest({ to: adminEmails, ...digest });
          // Log one row per admin recipient.
          for (const a of adminEmails) {
            await recordAlertSent(null as unknown as string, 0, "", "admin_digest", a, true);
          }
          summary.adminDigestSent = true;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          for (const a of adminEmails) {
            await recordAlertSent(null as unknown as string, 0, "", "admin_digest", a, false, msg);
          }
        }
      }
    }
  }

  return NextResponse.json({ ok: true, ...summary });
}

// ── Helpers ───────────────────────────────────────────────────────────

async function loadEmployeeForCert(
  employeeId: string,
): Promise<{ first_name: string; last_name: string; email: string | null } | null> {
  const db = sql();
  const rows = (await db`
    SELECT first_name, last_name, email FROM lounge_employees WHERE id = ${employeeId} LIMIT 1
  `) as unknown as { first_name: string; last_name: string; email: string | null }[];
  return rows[0] ?? null;
}

async function loadAdminEmails(): Promise<string[]> {
  const db = sql();
  const rows = (await db`
    SELECT email FROM lounge_employees
    WHERE is_admin = TRUE AND is_active = TRUE AND email IS NOT NULL
  `) as unknown as { email: string }[];
  return rows.map((r) => r.email).filter(Boolean);
}

async function buildAdminDigest(now: Date) {
  // Pull every expiring/expired cert in one query for the digest. This
  // is independent of the per-employee threshold-cross logic above.
  const db = sql();
  const rows = (await db`
    SELECT ec.id, ec.employee_id, ec.cert_type_id,
           ct.name AS cert_type_name, ct.slug AS cert_type_slug,
           ct.requires_expiration AS cert_requires_expiration,
           ec.file_url, ec.file_mime, ec.file_name,
           ec.issued_on, ec.expires_on, ec.uploaded_at,
           e.first_name, e.last_name
    FROM lounge_employee_certs ec
    JOIN lounge_cert_types ct ON ct.id = ec.cert_type_id
    JOIN lounge_employees e ON e.id = ec.employee_id
    WHERE ec.expires_on IS NOT NULL
      AND ct.requires_expiration = TRUE
      AND e.is_active = TRUE
      AND ec.expires_on <= (CURRENT_DATE + INTERVAL '120 days')
  `) as unknown as Array<{
    id: string;
    employee_id: string;
    cert_type_id: string;
    cert_type_name: string;
    cert_type_slug: string;
    cert_requires_expiration: boolean;
    file_url: string;
    file_mime: string | null;
    file_name: string | null;
    issued_on: string | null;
    expires_on: string;
    uploaded_at: string;
    first_name: string;
    last_name: string;
  }>;

  const expired: Array<{ employeeName: string; cert: import("@/lib/lounge/certs").EmployeeCert; daysLeft: number }> = [];
  const expiringSoon: typeof expired = [];

  for (const r of rows) {
    const days = daysUntil(r.expires_on, now);
    const cert: import("@/lib/lounge/certs").EmployeeCert = {
      id: r.id,
      employeeId: r.employee_id,
      certTypeId: r.cert_type_id,
      certTypeName: r.cert_type_name,
      certTypeSlug: r.cert_type_slug,
      certRequiresExpiration: r.cert_requires_expiration,
      fileUrl: r.file_url,
      fileMime: r.file_mime,
      fileName: r.file_name,
      issuedOn: r.issued_on,
      expiresOn: r.expires_on,
      uploadedAt: r.uploaded_at,
      daysLeft: days,
      status: days < 0 ? "expired"
            : days <= 7 ? "final_7"
            : days <= 30 ? "30"
            : days <= 60 ? "60"
            : days <= 90 ? "90"
            : "120",
    };
    const entry = {
      employeeName: `${r.first_name} ${r.last_name}`,
      cert,
      daysLeft: days,
    };
    if (days < 0) expired.push(entry);
    else expiringSoon.push(entry);
  }

  return { expired, expiringSoon };
}
