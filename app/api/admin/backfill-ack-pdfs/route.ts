/**
 * POST /api/admin/backfill-ack-pdfs
 *   Admin-only. One-shot maintenance endpoint that walks every
 *   notice_acknowledgment attachment whose file_url is still a data: URL
 *   (legacy state from before the memorandum-PDF code shipped), generates
 *   the memorandum PDF, uploads to Vercel Blob, and updates the row.
 *
 * Safe to re-run — it skips rows already pointing at a Blob URL.
 */
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { isAdminAuthed } from "@/lib/admin/auth";
import { sql } from "@/lib/lounge/db";
import { buildAckMemorandumPdf } from "@/lib/lounge/ack-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface BackfillRow {
  attachment_id: string;
  record_id: string;
  employee_id: string;
  notice_title: string;
  notice_body: string;
  notice_created_at: string;
  acknowledged_at: string | null;
  signature_data_url: string | null;
  signature_ip: string | null;
  employee_first_name: string;
  employee_last_name: string;
  employee_position: string | null;
  employee_certification: string | null;
  ack_id: string;
}

export async function POST() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = sql();

  // Pull every legacy ack attachment with everything we need to rebuild
  // the memorandum, joining through lounge_ack_states back to lounge_acks.
  const rows = (await db`
    SELECT
      att.id              AS attachment_id,
      att.record_id       AS record_id,
      att.employee_id     AS employee_id,
      n.id                AS ack_id,
      n.title             AS notice_title,
      n.body              AS notice_body,
      n.created_at        AS notice_created_at,
      s.acknowledged_at   AS acknowledged_at,
      s.signature_data_url AS signature_data_url,
      s.signature_ip      AS signature_ip,
      emp.first_name      AS employee_first_name,
      emp.last_name       AS employee_last_name,
      emp.position        AS employee_position,
      emp.certification   AS employee_certification
    FROM lounge_personnel_attachments att
    JOIN lounge_ack_states s
      ON s.personnel_record_id = att.record_id
     AND s.user_id = att.employee_id
    JOIN lounge_acks n ON n.id = s.ack_id
    JOIN lounge_employees emp ON emp.id = att.employee_id
    WHERE att.document_category = 'notice_acknowledgment'
      AND att.file_url LIKE 'data:%'
    ORDER BY att.uploaded_at ASC
  `) as unknown as BackfillRow[];

  const results: Array<{ attachmentId: string; ok: boolean; reason?: string; url?: string }> = [];

  for (const row of rows) {
    try {
      const pdfBytes = await buildAckMemorandumPdf({
        noticeTitle: row.notice_title,
        noticeBody: row.notice_body ?? "",
        noticeCreatedAt: row.notice_created_at,
        employeeName: `${row.employee_first_name} ${row.employee_last_name}`,
        employeeRank: row.employee_position ?? row.employee_certification ?? null,
        acknowledgedAt: row.acknowledged_at ?? new Date().toISOString(),
        signatureDataUrl: row.signature_data_url,
        signatureIp: row.signature_ip,
      });

      const safeTitle =
        (row.notice_title || "notice")
          .replace(/[^a-z0-9]+/gi, "-")
          .slice(0, 60)
          .replace(/^-|-$/g, "") || "notice";

      const blob = await put(
        `lounge/ack-memorandums/${row.ack_id}-${row.employee_id}-${safeTitle}-backfill-${Date.now()}.pdf`,
        pdfBytes,
        { access: "public", addRandomSuffix: false, contentType: "application/pdf" },
      );

      await db`
        UPDATE lounge_personnel_attachments
        SET file_url = ${blob.url},
            file_name = ${"Memorandum-" + (row.notice_title || "notice") + ".pdf"},
            file_mime = 'application/pdf',
            employee_notes = ${"Signed memorandum for \"" + (row.notice_title || "notice") + "\""}
        WHERE id = ${row.attachment_id}
      `;

      results.push({ attachmentId: row.attachment_id, ok: true, url: blob.url });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[backfill-ack-pdfs] failed for", row.attachment_id, msg);
      results.push({ attachmentId: row.attachment_id, ok: false, reason: msg });
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: rows.length,
    upgraded: results.filter((r) => r.ok).length,
    failures: results.filter((r) => !r.ok),
  });
}
