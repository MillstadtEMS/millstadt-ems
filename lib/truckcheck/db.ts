import { createHash, randomUUID } from "node:crypto";
import { sql } from "@/lib/neon";
import type { TruckCheckSubmission } from "@/lib/truckcheck/submission-schema";

export type TruckCheckResult = {
  ok: true;
  id: string;
  flag: string;
  durationSeconds: number;
  pdfUrl: string | null;
  replayed: boolean;
};

export type PersistedTruckCheckPayload = {
  formVersion: 5;
  form: TruckCheckSubmission;
  submitter: { id: string; name: string };
  unit: { number: string; description: string };
  photos: Array<{ url: string; caption: string | null; itemKey?: string }>;
  categoryComments: Record<string, string>;
  refillRequest: string | null;
  pencilWhip: {
    flag: string;
    reasons: Array<{ code: string; message: string; severity: string }>;
  };
  overallStatus: string;
  abnormalCount: number;
  failCount: number;
};

export type AuthoritativeTruckCheckInput = {
  id: string;
  actorId: string;
  idempotencyKey: string;
  requestHash: string;
  unitNumber: string;
  dateIso: string;
  timeHhmm: string;
  submittedAt: string;
  startedAt: string;
  durationSeconds: number;
  overallStatus: string;
  pencilWhipFlag: string;
  pencilWhipReasons: Array<{ code: string; message: string; severity: string }>;
  attendant2Id: string | null;
  attendant2Name: string | null;
  notes: string | null;
  payload: PersistedTruckCheckPayload;
};

type SqlQuery = Promise<unknown>;
type TransactionSql = (strings: TemplateStringsArray, ...values: unknown[]) => SqlQuery;

export type TruckCheckSqlClient = TransactionSql & {
  transaction: (
    builder: (transactionSql: TransactionSql) => SqlQuery[],
  ) => Promise<unknown[][]>;
};

type StoredIdempotencyRow = {
  request_hash: string;
  submission_result: unknown;
};

export class TruckCheckIdempotencyConflictError extends Error {
  constructor() {
    super("Idempotency key was already used for another TruckCheck submission");
    this.name = "TruckCheckIdempotencyConflictError";
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

export function truckCheckRequestHash(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

export function truckCheckIdempotencyKey(value: string | null): string | null {
  const key = value?.trim() ?? "";
  return /^[A-Za-z0-9_-]{16,128}$/.test(key) ? key : null;
}

export function formatChicagoMilitaryTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function formatChicagoDate(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function asStoredResult(value: unknown): TruckCheckResult | null {
  if (!value || typeof value !== "object") return null;
  const result = value as Partial<TruckCheckResult>;
  if (
    result.ok !== true
    || typeof result.id !== "string"
    || typeof result.flag !== "string"
    || typeof result.durationSeconds !== "number"
    || (result.pdfUrl !== null && typeof result.pdfUrl !== "string")
  ) {
    return null;
  }
  return { ...result, replayed: true } as TruckCheckResult;
}

export async function persistAuthoritativeTruckCheck(
  input: AuthoritativeTruckCheckInput,
  database: TruckCheckSqlClient = sql() as unknown as TruckCheckSqlClient,
): Promise<TruckCheckResult> {
  const itemRows = input.payload.form.items.map((item) => ({
    id: randomUUID(),
    category: item.category,
    item_key: item.itemKey,
    label: item.label,
    response_type: item.responseType,
    status: item.status,
    numeric_value: item.numericValue,
    unit_of_measure: item.unitOfMeasure,
    amount_added: item.amountAdded,
    amount_unit: item.amountUnit,
    comment: item.comment || null,
    is_abnormal: item.isAbnormal,
    requires_follow_up: item.requiresFollowUp,
    trend_group: item.trendGroup,
    checked_at: item.checkedAt,
  }));
  const photoRows = input.payload.photos.map((photo) => ({
    id: randomUUID(),
    file_url: photo.url,
    caption: photo.caption,
    item_key: photo.itemKey ?? null,
  }));
  const result: TruckCheckResult = {
    ok: true,
    id: input.id,
    flag: input.pencilWhipFlag,
    durationSeconds: input.durationSeconds,
    pdfUrl: null,
    replayed: false,
  };

  const transactionResults = await database.transaction((tx) => [
    tx`
      /* truckcheck:submission */
      INSERT INTO lounge_truck_checks (
        id, unit, kind, date_iso, time_hhmm, submitted_by_id, submitted_at, payload,
        started_at, duration_seconds, overall_status, pencil_whip_flag, pencil_whip_reasons,
        attendant2_id, attendant2_name, odometer, notes,
        idempotency_key, request_hash, submission_result
      ) VALUES (
        ${input.id}, ${input.unitNumber}, 'truck_check', ${input.dateIso}, ${input.timeHhmm},
        ${input.actorId}, ${input.submittedAt}::timestamptz, ${JSON.stringify(input.payload)}::jsonb,
        ${input.startedAt}::timestamptz, ${input.durationSeconds}, ${input.overallStatus},
        ${input.pencilWhipFlag}, ${JSON.stringify(input.pencilWhipReasons)}::jsonb,
        ${input.attendant2Id}, ${input.attendant2Name}, ${null}, ${input.notes},
        ${input.idempotencyKey}, ${input.requestHash}, ${JSON.stringify(result)}::jsonb
      )
      ON CONFLICT (submitted_by_id, idempotency_key)
        WHERE idempotency_key IS NOT NULL
      DO NOTHING
      RETURNING id
    `,
    tx`
      /* truckcheck:items */
      INSERT INTO lounge_truck_check_items (
        id, truck_check_id, unit, category, item_key, label, response_type,
        status, numeric_value, unit_of_measure, amount_added, amount_unit,
        comment, is_abnormal, requires_follow_up, trend_group, checked_at, checked_by_id
      )
      SELECT
        item.id, ${input.id}, ${input.unitNumber}, item.category, item.item_key, item.label,
        item.response_type, item.status, item.numeric_value, item.unit_of_measure,
        item.amount_added, item.amount_unit, item.comment, item.is_abnormal,
        item.requires_follow_up, item.trend_group, item.checked_at, ${input.actorId}
      FROM jsonb_to_recordset(${JSON.stringify(itemRows)}::jsonb) AS item(
        id TEXT, category TEXT, item_key TEXT, label TEXT, response_type TEXT,
        status TEXT, numeric_value NUMERIC, unit_of_measure TEXT, amount_added NUMERIC,
        amount_unit TEXT, comment TEXT, is_abnormal BOOLEAN, requires_follow_up BOOLEAN,
        trend_group TEXT, checked_at TIMESTAMPTZ
      )
      WHERE EXISTS (SELECT 1 FROM lounge_truck_checks WHERE id = ${input.id})
    `,
    tx`
      /* truckcheck:photos */
      INSERT INTO lounge_truck_check_photos (
        id, truck_check_id, file_url, caption, item_key, uploaded_by_id
      )
      SELECT photo.id, ${input.id}, photo.file_url, photo.caption, photo.item_key, ${input.actorId}
      FROM jsonb_to_recordset(${JSON.stringify(photoRows)}::jsonb) AS photo(
        id TEXT, file_url TEXT, caption TEXT, item_key TEXT
      )
      WHERE EXISTS (SELECT 1 FROM lounge_truck_checks WHERE id = ${input.id})
    `,
    tx`
      /* truckcheck:outbox */
      INSERT INTO lounge_truck_check_outbox (id, truck_check_id, job_type)
      SELECT job.id, ${input.id}, job.job_type
      FROM (VALUES
        (${randomUUID()}, 'legacy_copy'),
        (${randomUUID()}, 'pdf_email')
      ) AS job(id, job_type)
      WHERE EXISTS (SELECT 1 FROM lounge_truck_checks WHERE id = ${input.id})
      ON CONFLICT (truck_check_id, job_type) DO NOTHING
    `,
  ]);

  const inserted = transactionResults[0] as Array<{ id: string }> | undefined;
  if (inserted?.length === 1) return result;

  const rows = (await database`
    SELECT request_hash, submission_result
    FROM lounge_truck_checks
    WHERE submitted_by_id = ${input.actorId}
      AND idempotency_key = ${input.idempotencyKey}
    LIMIT 1
  `) as unknown as StoredIdempotencyRow[];
  const existing = rows[0];
  if (!existing) throw new Error("TruckCheck idempotency result was not durable");
  if (existing.request_hash !== input.requestHash) {
    throw new TruckCheckIdempotencyConflictError();
  }
  const replay = asStoredResult(existing.submission_result);
  if (!replay) throw new Error("TruckCheck idempotency result is invalid");
  return replay;
}

export type TruckCheckOutboxJob = {
  id: string;
  truckCheckId: string;
  jobType: "legacy_copy" | "pdf_email";
  attemptCount: number;
};

export async function requeueTruckCheckOutbox(truckCheckId: string): Promise<void> {
  const database = sql();
  await database`
    UPDATE lounge_truck_check_outbox
    SET status = 'pending', available_at = NOW(), updated_at = NOW()
    WHERE truck_check_id = ${truckCheckId} AND status = 'failed'
  `;
}

export async function claimTruckCheckOutboxJob(
  preferredTruckCheckId?: string,
): Promise<TruckCheckOutboxJob | null> {
  const database = sql();
  const rows = (await database`
    UPDATE lounge_truck_check_outbox
    SET status = 'processing',
        attempt_count = attempt_count + 1,
        claimed_at = NOW(),
        updated_at = NOW()
    WHERE id = (
      SELECT id
      FROM lounge_truck_check_outbox
      WHERE (${preferredTruckCheckId ?? null}::text IS NULL OR truck_check_id = ${preferredTruckCheckId ?? null})
        AND available_at <= NOW()
        AND (
          status = 'pending'
          OR status = 'failed'
          OR (status = 'processing' AND claimed_at < NOW() - INTERVAL '5 minutes')
        )
      ORDER BY created_at ASC, job_type ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING id, truck_check_id, job_type, attempt_count
  `) as unknown as Array<{
    id: string;
    truck_check_id: string;
    job_type: "legacy_copy" | "pdf_email";
    attempt_count: number;
  }>;
  const row = rows[0];
  return row ? {
    id: row.id,
    truckCheckId: row.truck_check_id,
    jobType: row.job_type,
    attemptCount: Number(row.attempt_count),
  } : null;
}

export async function completeTruckCheckOutboxJob(jobId: string): Promise<void> {
  const database = sql();
  await database`
    UPDATE lounge_truck_check_outbox
    SET status = 'completed', completed_at = NOW(), claimed_at = NULL,
        last_error = NULL, updated_at = NOW()
    WHERE id = ${jobId} AND status = 'processing'
  `;
}

export async function failTruckCheckOutboxJob(jobId: string, message: string): Promise<void> {
  const database = sql();
  await database`
    UPDATE lounge_truck_check_outbox
    SET status = 'failed', claimed_at = NULL,
        available_at = NOW() + (LEAST(attempt_count, 60) * INTERVAL '1 minute'),
        last_error = ${message.slice(0, 500)}, updated_at = NOW()
    WHERE id = ${jobId} AND status = 'processing'
  `;
}

export async function loadPersistedTruckCheck(
  truckCheckId: string,
): Promise<PersistedTruckCheckPayload> {
  const database = sql();
  const rows = (await database`
    SELECT payload
    FROM lounge_truck_checks
    WHERE id = ${truckCheckId}
    LIMIT 1
  `) as unknown as Array<{ payload: PersistedTruckCheckPayload }>;
  const payload = rows[0]?.payload;
  if (!payload || payload.formVersion !== 5 || !payload.form) {
    throw new Error("Authoritative TruckCheck payload is missing or invalid");
  }
  return payload;
}

export async function writeLegacyTruckCheck(
  truckCheckId: string,
  payload: PersistedTruckCheckPayload,
): Promise<void> {
  const database = sql();
  const form = payload.form;
  await database`
    INSERT INTO form_submissions (id, form_type, fields, submitted_at)
    VALUES (
      ${truckCheckId},
      'truck_check',
      ${JSON.stringify({
        ...form,
        truckNumber: payload.unit.number,
        unitNumber: payload.unit.number,
        attendant1Name: payload.submitter.name,
        attendant1UserId: payload.submitter.id,
        finishedAt: form.submittedAt,
        items: form.items,
        photos: payload.photos,
        pencilWhipFlag: payload.pencilWhip.flag,
        pencilWhipReasons: payload.pencilWhip.reasons,
        overallStatus: payload.overallStatus,
      })}::jsonb,
      ${form.submittedAt ?? new Date().toISOString()}::timestamptz
    )
    ON CONFLICT (id) DO NOTHING
  `;
}

export async function saveTruckCheckPdfReference(
  truckCheckId: string,
  pdfReference: string,
): Promise<void> {
  const database = sql();
  await database`
    UPDATE lounge_truck_checks
    SET pdf_url = ${pdfReference}
    WHERE id = ${truckCheckId}
  `;
}
