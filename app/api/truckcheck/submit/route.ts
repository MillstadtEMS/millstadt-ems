import { after, NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { currentTruckCheckEmployee } from "@/lib/truckcheck/auth";
import { sql as loungeSql } from "@/lib/lounge/db";
import { unitOrFallback } from "@/lib/truckcheck/units";
import { detectPencilWhip, type ItemForFlag } from "@/lib/truckcheck/pencil-whip";
import { contentLengthWithin, hasContentType, isSameOriginRequest, noStoreJson } from "@/lib/security/http";
import { truckCheckSubmissionSchema, type TruckCheckSubmission } from "@/lib/truckcheck/submission-schema";
import { isPrivateTruckPhotoUrl } from "@/lib/truckcheck/photo-reference";
import {
  formatChicagoDate,
  formatChicagoMilitaryTime,
  persistAuthoritativeTruckCheck,
  requeueTruckCheckOutbox,
  truckCheckIdempotencyKey,
  TruckCheckIdempotencyConflictError,
  truckCheckRequestHash,
  type PersistedTruckCheckPayload,
} from "@/lib/truckcheck/db";
import { processTruckCheckOutbox } from "@/lib/truckcheck/outbox";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  photos: string[];
  isAbnormal: boolean;
  requiresFollowUp: boolean;
  trendGroup: string | null;
  checkedAt: string;
}

export async function POST(req: NextRequest) {
  const me = await currentTruckCheckEmployee();
  if (!me) {
    return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSameOriginRequest(req)) {
    return noStoreJson({ error: "Cross-origin request denied" }, { status: 403 });
  }
  if (!hasContentType(req, "application/json") || !contentLengthWithin(req, 4 * 1024 * 1024)) {
    return noStoreJson({ error: "Invalid request" }, { status: 400 });
  }
  const idempotencyKey = truckCheckIdempotencyKey(req.headers.get("idempotency-key"));
  if (!idempotencyKey) {
    return noStoreJson({ error: "A valid Idempotency-Key header is required" }, { status: 400 });
  }

  const parsed = truckCheckSubmissionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return noStoreJson({ error: "Invalid truck check submission" }, { status: 400 });
  }
  const body = parsed.data;

  const unitNumber = String(body.unitNumber || body.truckNumber || "").trim();
  if (!unitNumber) return noStoreJson({ error: "Unit number required" }, { status: 400 });
  const unit = unitOrFallback(unitNumber);

  const submitterName = `${me.firstName} ${me.lastName}`.trim();
  if (!submitterName) return noStoreJson({ error: "Attendant identity is incomplete" }, { status: 403 });

  const startedAt = body.startedAt ? new Date(body.startedAt).toISOString() : new Date().toISOString();
  const submittedAt = body.submittedAt ? new Date(body.submittedAt).toISOString() : new Date().toISOString();
  const durationSeconds = Number.isFinite(body.durationSeconds)
    ? Number(body.durationSeconds)
    : Math.max(0, Math.round((new Date(submittedAt).getTime() - new Date(startedAt).getTime()) / 1000));

  const itemsIn: SubmittedItem[] = body.items;
  const photos: { url: string; caption: string | null; itemKey?: string }[] = [...body.photos];

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

  const allPhotoUrls = [
    ...photos.map((photo) => photo.url),
    ...itemsIn.flatMap((item) => item.photos ?? []),
  ];
  const photoUrlsArePrivate = allPhotoUrls.every((value) =>
    isPrivateTruckPhotoUrl(value, req.nextUrl.origin),
  );
  if (!photoUrlsArePrivate) {
    return noStoreJson({ error: "Invalid truck check photo reference" }, { status: 400 });
  }

  const categoryComments = Object.fromEntries(
    Object.entries(body.categoryComments).filter(([, value]) => value.length > 0),
  );
  const refillRequest = body.refillRequest || null;
  const additionalAttendants = body.attendants.map((attendant) => ({
    id: attendant.id,
    name: attendant.name,
    signatureDataUrl: attendant.signature || null,
  }));

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
  const authoritativeForm: TruckCheckSubmission = {
    ...body,
    unitNumber,
    truckNumber: body.truckNumber || unitNumber,
    attendant1Name: submitterName,
    startedAt,
    submittedAt,
    durationSeconds,
    items: itemsIn,
    photos,
    categoryComments,
    refillRequest: body.refillRequest || "",
  };
  const payload: PersistedTruckCheckPayload = {
    formVersion: 5,
    form: authoritativeForm,
    submitter: { id: me.id, name: submitterName },
    unit: { number: unitNumber, description: unit.description },
    photos,
    categoryComments,
    refillRequest,
    pencilWhip: { flag: flag.flag, reasons: flag.reasons },
    overallStatus,
    abnormalCount,
    failCount,
  };

  let result;
  try {
    result = await persistAuthoritativeTruckCheck({
      id,
      actorId: me.id,
      idempotencyKey,
      requestHash: truckCheckRequestHash({ employeeId: me.id, submission: body }),
      unitNumber,
      dateIso: formatChicagoDate(submittedAt),
      timeHhmm: formatChicagoMilitaryTime(submittedAt),
      submittedAt,
      startedAt,
      durationSeconds,
      overallStatus,
      pencilWhipFlag: flag.flag,
      pencilWhipReasons: flag.reasons,
      attendant2Id: additionalAttendants[0]?.id ?? null,
      attendant2Name: additionalAttendants[0]?.name ?? null,
      notes: body.notes.trim() || null,
      payload,
    });
  } catch (error) {
    if (error instanceof TruckCheckIdempotencyConflictError) {
      return noStoreJson(
        { error: "Idempotency key was already used for another submission" },
        { status: 409 },
      );
    }
    console.error("TruckCheck authoritative persistence failed", error);
    const response = noStoreJson(
      { error: "Truck check could not be saved. Please retry.", retryable: true },
      { status: 503 },
    );
    response.headers.set("Retry-After", "1");
    return response;
  }

  after(async () => {
    try {
      if (result.replayed) await requeueTruckCheckOutbox(result.id);
      await processTruckCheckOutbox(result.id);
      await processTruckCheckOutbox(undefined, undefined, 2);
    } catch (error) {
      console.error("TruckCheck outbox scheduling failed", error);
    }
  });

  return noStoreJson(result);
}
