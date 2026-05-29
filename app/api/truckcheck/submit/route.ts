import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { isTruckCheckAuthed } from "@/lib/truckcheck/auth";
import { neon } from "@neondatabase/serverless";
import { currentEmployee } from "@/lib/lounge/auth";
import { sql as loungeSql } from "@/lib/lounge/db";
import { unitOrFallback } from "@/lib/truckcheck/units";
import { detectPencilWhip, type ItemForFlag } from "@/lib/truckcheck/pencil-whip";
import { buildTruckCheckPdf } from "@/lib/truckcheck/pdf";
import { sendTruckCheckEmail } from "@/lib/truckcheck/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function legacySql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return neon(url);
}

interface SubmittedItem {
  itemKey: string;
  label: string;
  category: string;
  responseType: string;
  status: string | null;
  numericValue: number | null;
  unitOfMeasure: string | null;
  amountAdded: number | null;
  amountUnit: string | null;
  comment: string;
  photos?: string[];
  isAbnormal: boolean;
  requiresFollowUp: boolean;
  trendGroup: string | null;
  checkedAt: string;
}

export async function POST(req: NextRequest) {
  if (!(await isTruckCheckAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const me = await currentEmployee();

  const unitNumber = String(body.unitNumber || body.truckNumber || "").trim();
  if (!unitNumber) return NextResponse.json({ error: "Unit number required" }, { status: 400 });
  const unit = unitOrFallback(unitNumber);

  const submitterName = me ? `${me.firstName} ${me.lastName}` : String(body.attendant1Name || "").trim();
  if (!submitterName) return NextResponse.json({ error: "Attendant name required" }, { status: 400 });

  const startedAt = body.startedAt ? new Date(body.startedAt).toISOString() : new Date().toISOString();
  const submittedAt = body.submittedAt ? new Date(body.submittedAt).toISOString() : new Date().toISOString();
  const durationSeconds = Number.isFinite(body.durationSeconds)
    ? Number(body.durationSeconds)
    : Math.max(0, Math.round((new Date(submittedAt).getTime() - new Date(startedAt).getTime()) / 1000));

  const itemsIn: SubmittedItem[] = Array.isArray(body.items) ? body.items : [];
  const photos: { url: string; caption: string | null; itemKey?: string }[] = Array.isArray(body.photos)
    ? body.photos.filter((p: { url?: string }) => typeof p?.url === "string")
    : [];

  // Roll per-item photo URLs in alongside global photos so the dashboard
  // and PDF still see them all.
  for (const it of itemsIn) {
    if (Array.isArray(it.photos)) {
      for (const u of it.photos) {
        if (typeof u === "string" && !photos.some((p) => p.url === u)) {
          photos.push({ url: u, caption: it.label, itemKey: it.itemKey });
        }
      }
    }
  }

  const categoryComments: Record<string, string> =
    body.categoryComments && typeof body.categoryComments === "object" && !Array.isArray(body.categoryComments)
      ? Object.fromEntries(
          Object.entries(body.categoryComments as Record<string, unknown>)
            .filter(([, v]) => typeof v === "string" && (v as string).trim().length > 0)
            .map(([k, v]) => [k, (v as string).trim()]),
        )
      : {};
  const refillRequest: string | null = typeof body.refillRequest === "string" && body.refillRequest.trim().length > 0
    ? body.refillRequest.trim()
    : null;
  interface AttendantIn { id?: string | null; name?: string; signature?: string }
  const additionalAttendants: { id: string | null; name: string; signatureDataUrl: string | null }[] = Array.isArray(body.attendants)
    ? (body.attendants as AttendantIn[])
        .filter((a) => typeof a?.name === "string" && a.name.trim().length > 0)
        .map((a) => ({
          id: a.id ?? null,
          name: String(a.name).trim(),
          signatureDataUrl: typeof a.signature === "string" ? a.signature : null,
        }))
    : [];

  // Detect pencil-whipping.
  const flagInput: ItemForFlag[] = itemsIn.map((it) => ({
    itemKey: it.itemKey,
    label: it.label,
    category: it.category,
    responseType: it.responseType,
    status: it.status,
    numericValue: it.numericValue,
    amountAdded: it.amountAdded,
    comment: it.comment ?? "",
    checkedAt: it.checkedAt,
    isAbnormal: !!it.isAbnormal,
  }));

  let recentFastCount = 0;
  if (me?.id) {
    try {
      const db = loungeSql();
      const rows = (await db`
        SELECT COUNT(*)::int AS c
        FROM lounge_truck_checks
        WHERE submitted_by_id = ${me.id}
          AND submitted_at > NOW() - INTERVAL '21 days'
          AND duration_seconds IS NOT NULL
          AND duration_seconds < 90
      `) as unknown as { c: number }[];
      recentFastCount = rows[0]?.c ?? 0;
    } catch { recentFastCount = 0; }
  }

  const flag = detectPencilWhip({
    startedAt,
    submittedAt,
    unit: unitNumber,
    items: flagInput,
    recentSameEmployeeFastCount: recentFastCount,
  });

  const failCount = itemsIn.filter((i) => i.status === "Fail" || i.status === "Missing" || i.status === "Discrepancy" || i.status === "Expired Found" || i.status === "Out of Range").length;
  const abnormalCount = itemsIn.filter((i) => i.isAbnormal).length;
  const overallStatus = failCount > 0 ? "failed" : abnormalCount > 0 ? "issues" : "pass";

  const id = randomUUID();

  // Persist to lounge_truck_checks (requires a lounge user; if there's no
  // lounge session this is a legacy/shared-password submission, so we fall
  // back to the original form_submissions path further down).
  if (me?.id) {
    try {
      const db = loungeSql();
      const dateIso = submittedAt.slice(0, 10);
      const timeHhmm = new Date(submittedAt).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", timeZone: "America/Chicago" });

      await db`
        INSERT INTO lounge_truck_checks (
          id, unit, kind, date_iso, time_hhmm, submitted_by_id, submitted_at, payload,
          started_at, duration_seconds, overall_status, pencil_whip_flag, pencil_whip_reasons,
          attendant2_id, attendant2_name, odometer, notes
        ) VALUES (
          ${id}, ${unitNumber}, 'truck_check', ${dateIso}, ${timeHhmm}, ${me.id}, ${submittedAt}::timestamptz,
          ${JSON.stringify({
            flag,
            photoUrls: photos.map((p) => p.url),
            additionalAttendants: additionalAttendants.map((a) => ({ id: a.id, name: a.name })),
            categoryComments,
            refillRequest,
            formVersion: 4,
          })}::jsonb,
          ${startedAt}::timestamptz, ${durationSeconds}, ${overallStatus}, ${flag.flag}, ${JSON.stringify(flag.reasons)}::jsonb,
          ${additionalAttendants[0]?.id ?? null}, ${additionalAttendants[0]?.name ?? null}, ${null}, ${String(body.notes || "").trim() || null}
        )
      `;

      for (const it of itemsIn) {
        await db`
          INSERT INTO lounge_truck_check_items (
            id, truck_check_id, unit, category, item_key, label, response_type,
            status, numeric_value, unit_of_measure, amount_added, amount_unit,
            comment, is_abnormal, requires_follow_up, trend_group, checked_at, checked_by_id
          ) VALUES (
            ${randomUUID()}, ${id}, ${unitNumber}, ${it.category}, ${it.itemKey}, ${it.label}, ${it.responseType},
            ${it.status}, ${it.numericValue}, ${it.unitOfMeasure}, ${it.amountAdded}, ${it.amountUnit},
            ${it.comment || null}, ${!!it.isAbnormal}, ${!!it.requiresFollowUp}, ${it.trendGroup},
            ${it.checkedAt}::timestamptz, ${me.id}
          )
        `;
      }

      for (const p of photos) {
        await db`
          INSERT INTO lounge_truck_check_photos (id, truck_check_id, file_url, caption, item_key, uploaded_by_id)
          VALUES (${randomUUID()}, ${id}, ${p.url}, ${p.caption ?? null}, ${p.itemKey ?? null}, ${me.id})
        `;
      }
    } catch (dbErr) {
      console.error("truck check persist error:", dbErr);
      // Don't fail the request — we still need to keep legacy form_submissions writes working.
    }
  }

  // Legacy form_submissions path (keeps the existing report views working).
  try {
    const legacy = legacySql();
    await legacy`
      INSERT INTO form_submissions (id, form_type, fields, submitted_at)
      VALUES (${id}, 'truck_check',
              ${JSON.stringify({
                truckNumber: unitNumber,
                attendant1Name: submitterName,
                attendant1UserId: me?.id ?? null,
                attendant2Name: String(body.attendant2Name || ""),
                attendant1Signature: String(body.attendant1Signature || ""),
                attendant2Signature: String(body.attendant2Signature || ""),
                startedAt,
                finishedAt: submittedAt,
                durationSeconds,
                items: itemsIn,
                photos,
                pencilWhipFlag: flag.flag,
                pencilWhipReasons: flag.reasons,
                overallStatus,
                notes: String(body.notes || ""),
              })}::jsonb,
              NOW())
    `;
  } catch (e) {
    console.error("legacy form_submissions write failed:", e);
  }

  // Build the PDF + upload to Blob + email it.
  let pdfUrl: string | null = null;
  try {
    const pdfBuf = await buildTruckCheckPdf({
      truckCheckId: id,
      unit: unitNumber,
      unitDescription: unit.description,
      submittedBy: submitterName,
      startedAt,
      submittedAt,
      durationSeconds,
      pencilWhipFlag: flag.flag,
      pencilWhipReasons: flag.reasons,
      overallStatus,
      notes: String(body.notes || ""),
      categoryComments,
      refillRequest,
      items: itemsIn,
      photos,
      signatureDataUrl: String(body.attendant1Signature || "") || null,
      additionalAttendants: additionalAttendants.map((a) => ({ name: a.name, signatureDataUrl: a.signatureDataUrl })),
    });

    try {
      const blob = await put(`truckcheck/pdf/${id}.pdf`, pdfBuf, {
        access: "public",
        addRandomSuffix: false,
        contentType: "application/pdf",
      });
      pdfUrl = blob.url;
      if (me?.id) {
        try {
          const db = loungeSql();
          await db`UPDATE lounge_truck_checks SET pdf_url = ${pdfUrl} WHERE id = ${id}`;
        } catch { /* ignore */ }
      }
    } catch (blobErr) {
      console.error("PDF blob upload failed:", blobErr);
    }

    try {
      await sendTruckCheckEmail({
        truckCheckId: id,
        unit: unitNumber,
        submittedBy: submitterName,
        partnerName: additionalAttendants.map((a) => a.name).join(", ") || null,
        durationSeconds,
        pencilWhipFlag: flag.flag,
        pencilWhipReasons: flag.reasons,
        abnormalCount,
        failCount,
        notes: String(body.notes || ""),
        pdfBytes: pdfBuf,
        photos,
      });
    } catch (mailErr) {
      console.error("truck check email failed (non-fatal):", mailErr);
    }
  } catch (pdfErr) {
    console.error("PDF build failed (non-fatal):", pdfErr);
  }

  return NextResponse.json({
    ok: true,
    id,
    flag: flag.flag,
    durationSeconds,
    pdfUrl,
  });
}
