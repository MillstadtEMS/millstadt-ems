import { randomBytes, randomUUID } from "crypto";
import { sql } from "@/lib/neon";
import { getAnalyticsConfig } from "./config";
import {
  decryptSecurityIdentifier,
  encryptSecurityIdentifier,
  tokenHash,
} from "./crypto";
import type {
  AnalyticsEventRecord,
  AnalyticsSummary,
  CommunityArea,
  ConsentRecord,
  ConsentStatus,
  OptionalAnalyticsCategory,
  SecurityEventInput,
} from "./types";

type BrowserEstimate = {
  browserHash: string;
  firstSeen: string;
  lastSeen: string;
  lastSessionHash: string;
  sessionCount: number;
  eventCount: number;
  expiresAt: string;
};

type SecurityRecord = SecurityEventInput & {
  id: string;
  occurredAt: string;
  encryptedIp: string | null;
  userAgentCategory: string;
};

type SurveyRecord = { id: string; area: CommunityArea; submittedAt: string };
type AdminAuditRecord = {
  id: string;
  supervisorId: string;
  action: string;
  reason: string;
  fields: string[];
  rangeFrom: string | null;
  rangeTo: string | null;
  createdAt: string;
};
type ExportRecord = {
  tokenHash: string;
  supervisorId: string;
  fields: string[];
  rangeFrom: string;
  rangeTo: string;
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
};
export type PreservationHoldRecord = {
  id: string;
  category: "security";
  supervisorId: string;
  reason: string;
  rangeFrom: string;
  rangeTo: string;
  createdAt: string;
  expiresAt: string;
  releasedAt: string | null;
};

type MemoryAnalyticsStore = {
  events: AnalyticsEventRecord[];
  browsers: Map<string, BrowserEstimate>;
  consents: ConsentRecord[];
  security: SecurityRecord[];
  surveys: SurveyRecord[];
  adminAudit: AdminAuditRecord[];
  exports: ExportRecord[];
  holds: PreservationHoldRecord[];
};

declare global {
  var __millstadtAnalyticsMemoryStore: MemoryAnalyticsStore | undefined;
  var __millstadtAnalyticsSchemaPromise: Promise<void> | undefined;
}

const EMPTY_OVERVIEW: AnalyticsSummary["overview"] = {
  pageViews: 0,
  estimatedSessions: 0,
  estimatedReturningSessions: 0,
  estimatedFirstTimeBrowsers: 0,
  estimatedReturningBrowsers: 0,
  averageEstimatedEngagementSeconds: 0,
  form990Views: 0,
  form990Downloads: 0,
  printSelections: 0,
  accessibleAlternativeViews: 0,
  accessibilityControlUses: 0,
  readAloudUses: 0,
  clientErrors: 0,
  averagePageLoadMs: 0,
};

function memoryStore() {
  globalThis.__millstadtAnalyticsMemoryStore ??= {
    events: [],
    browsers: new Map(),
    consents: [],
    security: [],
    surveys: [],
    adminAudit: [],
    exports: [],
    holds: [],
  };
  globalThis.__millstadtAnalyticsMemoryStore.holds ??= [];
  return globalThis.__millstadtAnalyticsMemoryStore;
}

function shouldUseMemoryStore() {
  return getAnalyticsConfig().developmentMemoryStore;
}

function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export async function ensureAnalyticsSchema() {
  if (shouldUseMemoryStore() || !databaseConfigured()) return;
  globalThis.__millstadtAnalyticsSchemaPromise ??= createAnalyticsSchema().catch((error) => {
    globalThis.__millstadtAnalyticsSchemaPromise = undefined;
    throw error;
  });
  return globalThis.__millstadtAnalyticsSchemaPromise;
}

async function createAnalyticsSchema() {
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS site_analytics_events (
      id TEXT PRIMARY KEY,
      occurred_at TIMESTAMPTZ NOT NULL,
      event_name TEXT NOT NULL,
      path TEXT NOT NULL,
      duration_ms INTEGER,
      metric_value INTEGER,
      document_kind TEXT,
      document_id TEXT,
      control_name TEXT,
      session_hash TEXT,
      browser_hash TEXT,
      returning_browser BOOLEAN,
      return_interval_days REAL,
      browser_category TEXT NOT NULL,
      operating_system_category TEXT NOT NULL,
      device_category TEXT NOT NULL,
      referring_source TEXT NOT NULL,
      country TEXT,
      region TEXT,
      city TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS site_analytics_events_time_idx ON site_analytics_events (occurred_at DESC)`;
  await db`CREATE INDEX IF NOT EXISTS site_analytics_events_name_idx ON site_analytics_events (event_name, occurred_at DESC)`;
  await db`
    CREATE TABLE IF NOT EXISTS site_analytics_browser_estimates (
      browser_hash TEXT PRIMARY KEY,
      first_seen TIMESTAMPTZ NOT NULL,
      last_seen TIMESTAMPTZ NOT NULL,
      last_session_hash TEXT NOT NULL,
      session_count INTEGER NOT NULL DEFAULT 1,
      event_count INTEGER NOT NULL DEFAULT 1,
      expires_at TIMESTAMPTZ NOT NULL
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS site_privacy_consents (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      consent_version TEXT NOT NULL,
      categories JSONB NOT NULL DEFAULT '[]'::jsonb,
      decided_at TIMESTAMPTZ,
      withdrawn_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS site_security_events (
      id TEXT PRIMARY KEY,
      occurred_at TIMESTAMPTZ NOT NULL,
      event_type TEXT NOT NULL,
      route TEXT NOT NULL,
      method TEXT NOT NULL,
      response_status INTEGER,
      encrypted_ip TEXT,
      user_agent_category TEXT NOT NULL,
      reason TEXT NOT NULL,
      administrator_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`CREATE INDEX IF NOT EXISTS site_security_events_time_idx ON site_security_events (occurred_at DESC)`;
  await db`
    CREATE TABLE IF NOT EXISTS site_analytics_surveys (
      id TEXT PRIMARY KEY,
      survey_type TEXT NOT NULL,
      response_value TEXT NOT NULL,
      submitted_at TIMESTAMPTZ NOT NULL
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS site_analytics_admin_audit (
      id TEXT PRIMARY KEY,
      supervisor_id TEXT NOT NULL,
      action TEXT NOT NULL,
      reason TEXT NOT NULL,
      selected_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
      range_from TIMESTAMPTZ,
      range_to TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS site_analytics_exports (
      token_hash TEXT PRIMARY KEY,
      supervisor_id TEXT NOT NULL,
      selected_fields JSONB NOT NULL,
      range_from TIMESTAMPTZ NOT NULL,
      range_to TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS site_analytics_preservation_holds (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      supervisor_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      range_from TIMESTAMPTZ NOT NULL,
      range_to TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      released_at TIMESTAMPTZ
    )
  `;
}

export async function saveConsent(input: {
  id: string;
  status: ConsentStatus;
  consentVersion: string;
  categories: OptionalAnalyticsCategory[];
  decidedAt: string;
  withdrawnAt: string | null;
}) {
  const record: ConsentRecord = {
    id: input.id,
    status: input.status,
    consentVersion: input.consentVersion,
    categories: input.categories,
    decidedAt: input.decidedAt,
    withdrawnAt: input.withdrawnAt,
  };
  if (shouldUseMemoryStore()) {
    const store = memoryStore();
    store.consents = [record, ...store.consents.filter((item) => item.id !== input.id)];
    return;
  }
  if (!databaseConfigured()) return;
  await ensureAnalyticsSchema();
  const db = sql();
  await db`
    INSERT INTO site_privacy_consents
      (id, status, consent_version, categories, decided_at, withdrawn_at, updated_at)
    VALUES
      (${input.id}, ${input.status}, ${input.consentVersion}, ${JSON.stringify(input.categories)}::jsonb,
       ${input.decidedAt}, ${input.withdrawnAt}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      consent_version = EXCLUDED.consent_version,
      categories = EXCLUDED.categories,
      decided_at = EXCLUDED.decided_at,
      withdrawn_at = EXCLUDED.withdrawn_at,
      updated_at = NOW()
  `;
}

export async function touchReturningBrowser(input: {
  browserHash: string;
  sessionHash: string;
  occurredAt: string;
}) {
  const config = getAnalyticsConfig();
  const now = new Date(input.occurredAt);
  const expiresAt = new Date(
    now.getTime() + config.retention.recurringVisitorDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  if (shouldUseMemoryStore()) {
    const store = memoryStore();
    const existing = store.browsers.get(input.browserHash);
    const newSession = Boolean(existing && existing.lastSessionHash !== input.sessionHash);
    const returningBrowser = Boolean(
      existing && (existing.sessionCount > 1 || newSession),
    );
    const returnIntervalDays = existing && newSession
      ? Math.max(0, (now.getTime() - new Date(existing.lastSeen).getTime()) / 86_400_000)
      : null;
    store.browsers.set(input.browserHash, {
      browserHash: input.browserHash,
      firstSeen: existing?.firstSeen ?? input.occurredAt,
      lastSeen: input.occurredAt,
      lastSessionHash: input.sessionHash,
      sessionCount:
        (existing?.sessionCount ?? 0) + (existing?.lastSessionHash === input.sessionHash ? 0 : 1),
      eventCount: (existing?.eventCount ?? 0) + 1,
      expiresAt,
    });
    return { returningBrowser, returnIntervalDays };
  }
  await ensureAnalyticsSchema();
  const db = sql();
  const rows = (await db`
    SELECT first_seen, last_seen, last_session_hash, session_count, event_count
    FROM site_analytics_browser_estimates
    WHERE browser_hash = ${input.browserHash}
    LIMIT 1
  `) as unknown as Array<{
    first_seen: string | Date;
    last_seen: string | Date;
    last_session_hash: string;
    session_count: number;
    event_count: number;
  }>;
  const existing = rows[0];
  const newSession = Boolean(existing && existing.last_session_hash !== input.sessionHash);
  const returningBrowser = Boolean(
    existing && (Number(existing.session_count) > 1 || newSession),
  );
  const previousLastSeen = existing ? new Date(existing.last_seen).getTime() : now.getTime();
  const returnIntervalDays = existing && newSession
    ? Math.max(0, (now.getTime() - previousLastSeen) / 86_400_000)
    : null;
  await db`
    INSERT INTO site_analytics_browser_estimates
      (browser_hash, first_seen, last_seen, last_session_hash, session_count, event_count, expires_at)
    VALUES
      (${input.browserHash}, ${input.occurredAt}, ${input.occurredAt}, ${input.sessionHash}, 1, 1, ${expiresAt})
    ON CONFLICT (browser_hash) DO UPDATE SET
      last_seen = EXCLUDED.last_seen,
      last_session_hash = EXCLUDED.last_session_hash,
      session_count = site_analytics_browser_estimates.session_count +
        CASE WHEN site_analytics_browser_estimates.last_session_hash = EXCLUDED.last_session_hash THEN 0 ELSE 1 END,
      event_count = site_analytics_browser_estimates.event_count + 1,
      expires_at = EXCLUDED.expires_at
  `;
  return { returningBrowser, returnIntervalDays };
}

export async function saveAnalyticsEvent(event: AnalyticsEventRecord) {
  if (shouldUseMemoryStore()) {
    memoryStore().events.unshift(event);
    return;
  }
  await ensureAnalyticsSchema();
  const db = sql();
  await db`
    INSERT INTO site_analytics_events (
      id, occurred_at, event_name, path, duration_ms, metric_value,
      document_kind, document_id, control_name, session_hash, browser_hash,
      returning_browser, return_interval_days, browser_category,
      operating_system_category, device_category, referring_source,
      country, region, city
    ) VALUES (
      ${event.id}, ${event.occurredAt}, ${event.eventName}, ${event.path},
      ${event.durationMs ?? null}, ${event.value ?? null}, ${event.documentKind ?? null},
      ${event.documentId ?? null}, ${event.control ?? null}, ${event.sessionHash},
      ${event.browserHash}, ${event.returningBrowser}, ${event.returnIntervalDays},
      ${event.browserCategory}, ${event.operatingSystemCategory}, ${event.deviceCategory},
      ${event.referringSource}, ${event.country}, ${event.region}, ${event.city}
    )
  `;
}

export async function saveSecurityEvent(input: SecurityEventInput) {
  const now = new Date().toISOString();
  const record: SecurityRecord = {
    ...input,
    id: randomUUID(),
    occurredAt: now,
    encryptedIp: encryptSecurityIdentifier(input.ipAddress),
    userAgentCategory: coarseUserAgent(input.userAgent),
  };
  if (shouldUseMemoryStore()) {
    memoryStore().security.unshift(record);
    return;
  }
  if (!databaseConfigured()) return;
  await ensureAnalyticsSchema();
  const db = sql();
  await db`
    INSERT INTO site_security_events (
      id, occurred_at, event_type, route, method, response_status,
      encrypted_ip, user_agent_category, reason, administrator_id
    ) VALUES (
      ${record.id}, ${record.occurredAt}, ${record.eventType}, ${record.route},
      ${record.method}, ${record.responseStatus}, ${record.encryptedIp},
      ${record.userAgentCategory}, ${record.reason}, ${record.administratorId ?? null}
    )
  `;
}

export async function saveCommunitySurvey(area: CommunityArea) {
  const record = { id: randomUUID(), area, submittedAt: new Date().toISOString() };
  if (shouldUseMemoryStore()) {
    memoryStore().surveys.unshift(record);
    return;
  }
  await ensureAnalyticsSchema();
  const db = sql();
  await db`
    INSERT INTO site_analytics_surveys (id, survey_type, response_value, submitted_at)
    VALUES (${record.id}, 'community_area', ${area}, ${record.submittedAt})
  `;
}

export async function getAnalyticsSummary(from: Date, to: Date): Promise<AnalyticsSummary> {
  const config = getAnalyticsConfig();
  const empty = emptySummary(config.mode, from, to);
  if (shouldUseMemoryStore()) return memorySummary(from, to, empty);
  if (!databaseConfigured()) return empty;
  await ensureAnalyticsSchema();
  const db = sql();
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const overviewRows = (await db`
    SELECT
      COUNT(*) FILTER (WHERE event_name = 'page_view')::int AS page_views,
      COUNT(DISTINCT session_hash) FILTER (WHERE session_hash IS NOT NULL)::int AS sessions,
      COUNT(DISTINCT session_hash) FILTER (WHERE returning_browser = TRUE)::int AS returning_sessions,
      COUNT(DISTINCT browser_hash) FILTER (WHERE browser_hash IS NOT NULL AND returning_browser = FALSE)::int AS first_browsers,
      COUNT(DISTINCT browser_hash) FILTER (WHERE browser_hash IS NOT NULL AND returning_browser = TRUE)::int AS returning_browsers,
      COALESCE(AVG(duration_ms) FILTER (WHERE event_name = 'engagement'), 0)::float AS avg_engagement,
      COUNT(*) FILTER (WHERE event_name = 'document_view' AND document_kind = 'public_form_990')::int AS form990_views,
      COUNT(*) FILTER (WHERE event_name = 'document_download' AND document_kind = 'public_form_990')::int AS form990_downloads,
      COUNT(*) FILTER (WHERE event_name = 'print_selection')::int AS print_selections,
      COUNT(*) FILTER (WHERE event_name = 'accessible_alternative')::int AS accessible_views,
      COUNT(*) FILTER (WHERE event_name = 'accessibility_control')::int AS accessibility_uses,
      COUNT(*) FILTER (WHERE event_name = 'read_aloud')::int AS read_aloud_uses,
      COUNT(*) FILTER (WHERE event_name = 'client_error')::int AS client_errors,
      COALESCE(AVG(metric_value) FILTER (WHERE event_name = 'performance'), 0)::float AS avg_load
    FROM site_analytics_events
    WHERE occurred_at >= ${fromIso} AND occurred_at <= ${toIso}
  `) as unknown as Array<Record<string, number>>;
  const topPages = (await db`
    SELECT path, COUNT(*)::int AS views
    FROM site_analytics_events
    WHERE occurred_at >= ${fromIso} AND occurred_at <= ${toIso} AND event_name = 'page_view'
    GROUP BY path ORDER BY views DESC, path ASC LIMIT 20
  `) as unknown as Array<{ path: string; views: number }>;
  const browserClassRows = (await db`
    SELECT
      COUNT(*) FILTER (WHERE returning)::int AS returning_browsers,
      COUNT(*) FILTER (WHERE NOT returning)::int AS first_browsers
    FROM (
      SELECT browser_hash, BOOL_OR(returning_browser) AS returning
      FROM site_analytics_events
      WHERE occurred_at >= ${fromIso} AND occurred_at <= ${toIso}
        AND browser_hash IS NOT NULL
      GROUP BY browser_hash
    ) AS browser_classes
  `) as unknown as Array<{ returning_browsers: number; first_browsers: number }>;
  const documentEvents = (await db`
    SELECT event_name, COALESCE(document_kind, 'unspecified') AS document_kind, COUNT(*)::int AS events
    FROM site_analytics_events
    WHERE occurred_at >= ${fromIso} AND occurred_at <= ${toIso}
      AND event_name IN ('document_view', 'document_download', 'print_selection', 'accessible_alternative')
    GROUP BY event_name, document_kind ORDER BY events DESC
  `) as unknown as Array<{ event_name: string; document_kind: string; events: number }>;
  const geography = (await db`
    SELECT CONCAT_WS(' / ', NULLIF(country, ''), NULLIF(region, ''), NULLIF(city, '')) AS broad_area,
           COUNT(*)::int AS events
    FROM site_analytics_events
    WHERE occurred_at >= ${fromIso} AND occurred_at <= ${toIso}
      AND (country IS NOT NULL OR region IS NOT NULL OR city IS NOT NULL)
    GROUP BY country, region, city
    HAVING COUNT(*) >= ${config.minimumGroupSize}
    ORDER BY events DESC, broad_area ASC
  `) as unknown as Array<{ broad_area: string; events: number }>;
  const returningRows = (await db`
    SELECT
      COALESCE((SELECT AVG(session_count) FROM site_analytics_browser_estimates
                WHERE last_seen >= ${fromIso} AND last_seen <= ${toIso}), 0)::float AS frequency,
      COALESCE(AVG(return_interval_days) FILTER (WHERE return_interval_days IS NOT NULL), 0)::float AS interval_days
    FROM site_analytics_events
    WHERE occurred_at >= ${fromIso} AND occurred_at <= ${toIso}
      AND browser_hash IS NOT NULL
  `) as unknown as Array<{ frequency: number; interval_days: number }>;
  const surveyRows = (await db`
    SELECT response_value AS area, COUNT(*)::int AS responses
    FROM site_analytics_surveys
    WHERE survey_type = 'community_area' AND submitted_at >= ${fromIso} AND submitted_at <= ${toIso}
    GROUP BY response_value
    HAVING COUNT(*) >= ${config.minimumGroupSize}
    ORDER BY responses DESC
  `) as unknown as Array<{ area: CommunityArea; responses: number }>;
  const securityRows = (await db`
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'failed_login')::int AS failed_logins,
      COUNT(*) FILTER (WHERE event_type = 'rate_limit')::int AS rate_limits,
      COUNT(*) FILTER (WHERE event_type = 'malware_scan')::int AS malware_scans,
      COUNT(*) FILTER (WHERE event_type = 'unauthorized_access')::int AS unauthorized,
      (SELECT COUNT(*)::int FROM site_analytics_admin_audit
       WHERE created_at >= ${fromIso} AND created_at <= ${toIso}) AS administrator_actions,
      COUNT(*) FILTER (WHERE event_type = 'system_error')::int AS system_errors
    FROM site_security_events
    WHERE occurred_at >= ${fromIso} AND occurred_at <= ${toIso}
  `) as unknown as Array<Record<string, number>>;
  const o = overviewRows[0] ?? {};
  const s = securityRows[0] ?? {};
  return {
    ...empty,
    overview: {
      pageViews: numeric(o.page_views),
      estimatedSessions: numeric(o.sessions),
      estimatedReturningSessions: numeric(o.returning_sessions),
      estimatedFirstTimeBrowsers: numeric(browserClassRows[0]?.first_browsers),
      estimatedReturningBrowsers: numeric(browserClassRows[0]?.returning_browsers),
      averageEstimatedEngagementSeconds: round(numeric(o.avg_engagement) / 1000, 1),
      form990Views: numeric(o.form990_views),
      form990Downloads: numeric(o.form990_downloads),
      printSelections: numeric(o.print_selections),
      accessibleAlternativeViews: numeric(o.accessible_views),
      accessibilityControlUses: numeric(o.accessibility_uses),
      readAloudUses: numeric(o.read_aloud_uses),
      clientErrors: numeric(o.client_errors),
      averagePageLoadMs: Math.round(numeric(o.avg_load)),
    },
    topPages,
    documentEvents: documentEvents.map((row) => ({
      eventName: row.event_name,
      documentKind: row.document_kind,
      events: numeric(row.events),
    })),
    geography: geography.map((row) => ({ broadArea: row.broad_area, events: numeric(row.events) })),
    returning: {
      ...empty.returning,
      aggregateVisitFrequency: round(numeric(returningRows[0]?.frequency), 1),
      averageReturnIntervalDays: round(numeric(returningRows[0]?.interval_days), 1),
    },
    communitySurvey: surveyRows,
    security: {
      failedLogins: numeric(s.failed_logins),
      rateLimitEvents: numeric(s.rate_limits),
      malwareScanEvents: numeric(s.malware_scans),
      unauthorizedAccessAttempts: numeric(s.unauthorized),
      administratorActions: numeric(s.administrator_actions),
      systemErrors: numeric(s.system_errors),
    },
  };
}

export async function recordAdminAudit(input: Omit<AdminAuditRecord, "id" | "createdAt">) {
  const record: AdminAuditRecord = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  if (shouldUseMemoryStore()) {
    memoryStore().adminAudit.unshift(record);
    return;
  }
  await ensureAnalyticsSchema();
  const db = sql();
  await db`
    INSERT INTO site_analytics_admin_audit
      (id, supervisor_id, action, reason, selected_fields, range_from, range_to, created_at)
    VALUES
      (${record.id}, ${record.supervisorId}, ${record.action}, ${record.reason},
       ${JSON.stringify(record.fields)}::jsonb, ${record.rangeFrom}, ${record.rangeTo}, ${record.createdAt})
  `;
}

export async function createAnalyticsExport(input: {
  supervisorId: string;
  fields: string[];
  rangeFrom: string;
  rangeTo: string;
}) {
  const token = randomBytes(32).toString("base64url");
  const record: ExportRecord = {
    tokenHash: tokenHash(token),
    supervisorId: input.supervisorId,
    fields: input.fields,
    rangeFrom: input.rangeFrom,
    rangeTo: input.rangeTo,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    consumedAt: null,
  };
  if (shouldUseMemoryStore()) memoryStore().exports.unshift(record);
  else {
    await ensureAnalyticsSchema();
    const db = sql();
    await db`
      INSERT INTO site_analytics_exports
        (token_hash, supervisor_id, selected_fields, range_from, range_to, created_at, expires_at)
      VALUES
        (${record.tokenHash}, ${record.supervisorId}, ${JSON.stringify(record.fields)}::jsonb,
         ${record.rangeFrom}, ${record.rangeTo}, ${record.createdAt}, ${record.expiresAt})
    `;
  }
  await recordAdminAudit({
    supervisorId: input.supervisorId,
    action: "analytics_export_created",
    reason: "Confirmed aggregate analytics export",
    fields: input.fields,
    rangeFrom: input.rangeFrom,
    rangeTo: input.rangeTo,
  });
  return { token, expiresAt: record.expiresAt };
}

export async function consumeAnalyticsExport(token: string, supervisorId: string) {
  const hash = tokenHash(token);
  let record: ExportRecord | null = null;
  if (shouldUseMemoryStore()) {
    record = memoryStore().exports.find((item) => item.tokenHash === hash) ?? null;
    if (
      record &&
      record.supervisorId === supervisorId &&
      record.consumedAt === null &&
      Date.parse(record.expiresAt) > Date.now()
    ) {
      record.consumedAt = new Date().toISOString();
    } else {
      record = null;
    }
  } else {
    await ensureAnalyticsSchema();
    const db = sql();
    const rows = (await db`
      UPDATE site_analytics_exports SET consumed_at = NOW()
      WHERE token_hash = ${hash} AND supervisor_id = ${supervisorId}
        AND consumed_at IS NULL AND expires_at > NOW()
      RETURNING token_hash, supervisor_id, selected_fields, range_from, range_to,
                created_at, expires_at, consumed_at
    `) as unknown as Array<Record<string, unknown>>;
    const row = rows[0];
    if (row) {
      record = {
        tokenHash: String(row.token_hash),
        supervisorId: String(row.supervisor_id),
        fields: stringArray(row.selected_fields),
        rangeFrom: dateString(row.range_from),
        rangeTo: dateString(row.range_to),
        createdAt: dateString(row.created_at),
        expiresAt: dateString(row.expires_at),
        consumedAt: dateString(row.consumed_at),
      };
    }
  }
  if (
    !record ||
    record.supervisorId !== supervisorId ||
    record.consumedAt === null ||
    Date.parse(record.expiresAt) <= Date.now()
  ) {
    return null;
  }
  await recordAdminAudit({
    supervisorId,
    action: "analytics_export_downloaded",
    reason: "Protected aggregate analytics export downloaded",
    fields: record.fields,
    rangeFrom: record.rangeFrom,
    rangeTo: record.rangeTo,
  });
  return record;
}

export async function listRawSecurityEvents(input: {
  supervisorId: string;
  reason: string;
  from: Date;
  to: Date;
}) {
  const reason = input.reason.trim().slice(0, 240);
  if (reason.length < 12) throw new Error("A specific review reason is required.");
  let records: SecurityRecord[] = [];
  if (shouldUseMemoryStore()) {
    records = memoryStore().security.filter((event) => inRange(event.occurredAt, input.from, input.to));
  } else {
    await ensureAnalyticsSchema();
    const db = sql();
    const rows = (await db`
      SELECT id, occurred_at, event_type, route, method, response_status,
             encrypted_ip, user_agent_category, reason, administrator_id
      FROM site_security_events
      WHERE occurred_at >= ${input.from.toISOString()} AND occurred_at <= ${input.to.toISOString()}
      ORDER BY occurred_at DESC LIMIT 250
    `) as unknown as Array<Record<string, unknown>>;
    records = rows.map((row) => ({
      id: String(row.id),
      occurredAt: dateString(row.occurred_at),
      eventType: String(row.event_type),
      route: String(row.route),
      method: String(row.method),
      responseStatus: row.response_status === null ? null : numeric(row.response_status),
      ipAddress: null,
      userAgent: null,
      encryptedIp: row.encrypted_ip ? String(row.encrypted_ip) : null,
      userAgentCategory: String(row.user_agent_category),
      reason: String(row.reason),
      administratorId: row.administrator_id ? String(row.administrator_id) : null,
    }));
  }
  await recordAdminAudit({
    supervisorId: input.supervisorId,
    action: "raw_security_review",
    reason,
    fields: ["eventType", "route", "method", "responseStatus", "ipAddress", "userAgentCategory"],
    rangeFrom: input.from.toISOString(),
    rangeTo: input.to.toISOString(),
  });
  return records.slice(0, 250).map((record) => ({
    id: record.id,
    occurredAt: record.occurredAt,
    eventType: record.eventType,
    route: record.route,
    method: record.method,
    responseStatus: record.responseStatus,
    ipAddress: decryptSecurityIdentifier(record.encryptedIp),
    userAgentCategory: record.userAgentCategory,
    reason: record.reason,
  }));
}

export async function createPreservationHold(input: {
  supervisorId: string;
  reason: string;
  from: Date;
  to: Date;
}) {
  const config = getAnalyticsConfig();
  const reason = input.reason.trim().slice(0, 240);
  if (reason.length < 12 || config.retention.incidentHoldDays < 1) {
    throw new Error("A valid incident hold reason and retention period are required.");
  }
  const record: PreservationHoldRecord = {
    id: randomUUID(),
    category: "security",
    supervisorId: input.supervisorId,
    reason,
    rangeFrom: input.from.toISOString(),
    rangeTo: input.to.toISOString(),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(
      Date.now() + config.retention.incidentHoldDays * 86_400_000,
    ).toISOString(),
    releasedAt: null,
  };
  if (shouldUseMemoryStore()) memoryStore().holds.unshift(record);
  else {
    await ensureAnalyticsSchema();
    const db = sql();
    await db`
      INSERT INTO site_analytics_preservation_holds
        (id, category, supervisor_id, reason, range_from, range_to, created_at, expires_at)
      VALUES
        (${record.id}, ${record.category}, ${record.supervisorId}, ${record.reason},
         ${record.rangeFrom}, ${record.rangeTo}, ${record.createdAt}, ${record.expiresAt})
    `;
  }
  await recordAdminAudit({
    supervisorId: input.supervisorId,
    action: "security_preservation_hold_created",
    reason,
    fields: ["security"],
    rangeFrom: record.rangeFrom,
    rangeTo: record.rangeTo,
  });
  return record;
}

export async function listPreservationHolds() {
  if (shouldUseMemoryStore()) {
    return memoryStore().holds.filter(
      (hold) => !hold.releasedAt && Date.parse(hold.expiresAt) > Date.now(),
    );
  }
  if (!databaseConfigured()) return [];
  await ensureAnalyticsSchema();
  const rows = (await sql()`
    SELECT id, category, supervisor_id, reason, range_from, range_to,
           created_at, expires_at, released_at
    FROM site_analytics_preservation_holds
    WHERE released_at IS NULL AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 100
  `) as unknown as Array<Record<string, unknown>>;
  return rows.map(holdFromRow);
}

export async function releasePreservationHold(input: {
  id: string;
  supervisorId: string;
  reason: string;
}) {
  const reason = input.reason.trim().slice(0, 240);
  if (reason.length < 12) throw new Error("A specific release reason is required.");
  let record: PreservationHoldRecord | null = null;
  if (shouldUseMemoryStore()) {
    record = memoryStore().holds.find((hold) => hold.id === input.id && !hold.releasedAt) ?? null;
    if (record) record.releasedAt = new Date().toISOString();
  } else {
    await ensureAnalyticsSchema();
    const rows = (await sql()`
      UPDATE site_analytics_preservation_holds SET released_at = NOW()
      WHERE id = ${input.id} AND released_at IS NULL
      RETURNING id, category, supervisor_id, reason, range_from, range_to,
                created_at, expires_at, released_at
    `) as unknown as Array<Record<string, unknown>>;
    if (rows[0]) record = holdFromRow(rows[0]);
  }
  if (!record) return null;
  await recordAdminAudit({
    supervisorId: input.supervisorId,
    action: "security_preservation_hold_released",
    reason,
    fields: ["security"],
    rangeFrom: record.rangeFrom,
    rangeTo: record.rangeTo,
  });
  return record;
}

export async function pruneExpiredAnalytics() {
  const config = getAnalyticsConfig();
  const now = Date.now();
  if (shouldUseMemoryStore()) {
    const store = memoryStore();
    store.events = store.events.filter(
      (event) => now - Date.parse(event.occurredAt) <= config.retention.eventDays * 86_400_000,
    );
    store.security = store.security.filter(
      (event) =>
        now - Date.parse(event.occurredAt) <= config.retention.securityDays * 86_400_000 ||
        store.holds.some(
          (hold) =>
            !hold.releasedAt &&
            Date.parse(hold.expiresAt) > now &&
            inRange(event.occurredAt, new Date(hold.rangeFrom), new Date(hold.rangeTo)),
        ),
    );
    store.surveys = store.surveys.filter(
      (event) => now - Date.parse(event.submittedAt) <= config.retention.geographyDays * 86_400_000,
    );
    for (const [key, browser] of store.browsers) {
      if (Date.parse(browser.expiresAt) <= now) store.browsers.delete(key);
    }
    store.adminAudit = store.adminAudit.filter(
      (event) => now - Date.parse(event.createdAt) <= config.retention.administratorActionDays * 86_400_000,
    );
    store.exports = store.exports.filter((event) => Date.parse(event.expiresAt) > now);
    store.holds = store.holds.filter(
      (hold) =>
        now - Date.parse(hold.releasedAt ?? hold.expiresAt) <=
        config.retention.administratorActionDays * 86_400_000,
    );
    store.consents = store.consents.filter(
      (consent) =>
        !consent.decidedAt ||
        now - Date.parse(consent.decidedAt) <= config.retention.consentDays * 86_400_000,
    );
    return;
  }
  if (!databaseConfigured()) return;
  await ensureAnalyticsSchema();
  const db = sql();
  await db`DELETE FROM site_analytics_events WHERE occurred_at < NOW() - (${config.retention.eventDays} * INTERVAL '1 day')`;
  await db`
    DELETE FROM site_security_events AS event
    WHERE event.occurred_at < NOW() - (${config.retention.securityDays} * INTERVAL '1 day')
      AND NOT EXISTS (
        SELECT 1 FROM site_analytics_preservation_holds AS hold
        WHERE hold.category = 'security' AND hold.released_at IS NULL
          AND hold.expires_at > NOW()
          AND event.occurred_at >= hold.range_from AND event.occurred_at <= hold.range_to
      )
  `;
  await db`DELETE FROM site_analytics_surveys WHERE submitted_at < NOW() - (${config.retention.geographyDays} * INTERVAL '1 day')`;
  await db`DELETE FROM site_analytics_browser_estimates WHERE expires_at <= NOW()`;
  await db`DELETE FROM site_analytics_admin_audit WHERE created_at < NOW() - (${config.retention.administratorActionDays} * INTERVAL '1 day')`;
  await db`DELETE FROM site_analytics_exports WHERE expires_at <= NOW()`;
  await db`DELETE FROM site_privacy_consents WHERE updated_at < NOW() - (${config.retention.consentDays} * INTERVAL '1 day')`;
  await db`
    DELETE FROM site_analytics_preservation_holds
    WHERE COALESCE(released_at, expires_at) < NOW() - (${config.retention.administratorActionDays} * INTERVAL '1 day')
  `;
}

export function resetDevelopmentAnalyticsStore() {
  if (process.env.NODE_ENV === "production") return;
  globalThis.__millstadtAnalyticsMemoryStore = undefined;
}

function emptySummary(mode: AnalyticsSummary["mode"], from: Date, to: Date): AnalyticsSummary {
  return {
    mode,
    range: { from: from.toISOString(), to: to.toISOString() },
    overview: { ...EMPTY_OVERVIEW },
    topPages: [],
    documentEvents: [],
    geography: [],
    returning: {
      aggregateVisitFrequency: 0,
      averageReturnIntervalDays: 0,
      methodology:
        "Estimated from a random first-party browser identifier. Shared devices, multiple devices, deleted cookies, private browsing, and declined analytics affect accuracy.",
    },
    communitySurvey: [],
    security: {
      failedLogins: 0,
      rateLimitEvents: 0,
      malwareScanEvents: 0,
      unauthorizedAccessAttempts: 0,
      administratorActions: 0,
      systemErrors: 0,
    },
    workflow: {
      restrictedRequests: 0,
      approvals: 0,
      denials: 0,
      expirations: 0,
      revocations: 0,
      controlledViews: 0,
    },
  };
}

function memorySummary(from: Date, to: Date, base: AnalyticsSummary): AnalyticsSummary {
  const store = memoryStore();
  const events = store.events.filter((event) => inRange(event.occurredAt, from, to));
  const byName = (name: string) => events.filter((event) => event.eventName === name);
  const pageViews = byName("page_view");
  const sessions = new Set(events.map((event) => event.sessionHash).filter(Boolean));
  const returningSessions = new Set(
    events.filter((event) => event.returningBrowser).map((event) => event.sessionHash).filter(Boolean),
  );
  const browserClasses = new Map<string, boolean>();
  for (const event of events) {
    if (!event.browserHash) continue;
    browserClasses.set(
      event.browserHash,
      (browserClasses.get(event.browserHash) ?? false) || event.returningBrowser === true,
    );
  }
  const firstBrowsers = [...browserClasses.values()].filter((returning) => !returning).length;
  const returningBrowsers = [...browserClasses.values()].filter(Boolean).length;
  const topPageMap = countBy(pageViews, (event) => event.path);
  const geographyMap = countBy(
    events.filter((event) => event.country || event.region || event.city),
    (event) => [event.country, event.region, event.city].filter(Boolean).join(" / "),
  );
  const config = getAnalyticsConfig();
  const security = store.security.filter((event) => inRange(event.occurredAt, from, to));
  const surveyMap = countBy(
    store.surveys.filter((event) => inRange(event.submittedAt, from, to)),
    (event) => event.area,
  );
  const engagement = byName("engagement").map((event) => event.durationMs ?? 0);
  const load = byName("performance").map((event) => event.value ?? 0);
  const intervals = events
    .map((event) => event.returnIntervalDays)
    .filter((value): value is number => value !== null);
  return {
    ...base,
    overview: {
      pageViews: pageViews.length,
      estimatedSessions: sessions.size,
      estimatedReturningSessions: returningSessions.size,
      estimatedFirstTimeBrowsers: firstBrowsers,
      estimatedReturningBrowsers: returningBrowsers,
      averageEstimatedEngagementSeconds: round(average(engagement) / 1000, 1),
      form990Views: events.filter((event) => event.eventName === "document_view" && event.documentKind === "public_form_990").length,
      form990Downloads: events.filter((event) => event.eventName === "document_download" && event.documentKind === "public_form_990").length,
      printSelections: byName("print_selection").length,
      accessibleAlternativeViews: byName("accessible_alternative").length,
      accessibilityControlUses: byName("accessibility_control").length,
      readAloudUses: byName("read_aloud").length,
      clientErrors: byName("client_error").length,
      averagePageLoadMs: Math.round(average(load)),
    },
    topPages: [...topPageMap.entries()]
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20),
    documentEvents: [...countBy(
      events.filter((event) => ["document_view", "document_download", "print_selection", "accessible_alternative"].includes(event.eventName)),
      (event) => `${event.eventName}|${event.documentKind ?? "unspecified"}`,
    ).entries()].map(([key, count]) => {
      const [eventName, documentKind] = key.split("|");
      return { eventName, documentKind, events: count };
    }),
    geography: [...geographyMap.entries()]
      .filter(([, count]) => count >= config.minimumGroupSize)
      .map(([broadArea, count]) => ({ broadArea, events: count })),
    returning: {
      ...base.returning,
      aggregateVisitFrequency: round(
        average([...store.browsers.values()].map((item) => item.sessionCount)),
        1,
      ),
      averageReturnIntervalDays: round(average(intervals), 1),
    },
    communitySurvey: [...surveyMap.entries()]
      .filter(([, count]) => count >= config.minimumGroupSize)
      .map(([area, responses]) => ({ area: area as CommunityArea, responses })),
    security: {
      failedLogins: security.filter((event) => event.eventType === "failed_login").length,
      rateLimitEvents: security.filter((event) => event.eventType === "rate_limit").length,
      malwareScanEvents: security.filter((event) => event.eventType === "malware_scan").length,
      unauthorizedAccessAttempts: security.filter((event) => event.eventType === "unauthorized_access").length,
      administratorActions:
        security.filter((event) => event.administratorId).length +
        store.adminAudit.filter((event) => inRange(event.createdAt, from, to)).length,
      systemErrors: security.filter((event) => event.eventType === "system_error").length,
    },
  };
}

function countBy<T>(items: T[], key: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  return counts;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function round(value: number, places: number) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function numeric(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function dateString(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return new Date(String(value)).toISOString();
}

function stringArray(value: unknown) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function inRange(value: string, from: Date, to: Date) {
  const time = Date.parse(value);
  return time >= from.getTime() && time <= to.getTime();
}

function coarseUserAgent(userAgent: string | null) {
  const ua = (userAgent ?? "").toLowerCase();
  if (/bot|crawler|spider/.test(ua)) return "Automated client";
  if (/mobile|iphone|android/.test(ua)) return "Mobile browser";
  return ua ? "Desktop browser" : "Unavailable";
}

function holdFromRow(row: Record<string, unknown>): PreservationHoldRecord {
  return {
    id: String(row.id),
    category: "security",
    supervisorId: String(row.supervisor_id),
    reason: String(row.reason),
    rangeFrom: dateString(row.range_from),
    rangeTo: dateString(row.range_to),
    createdAt: dateString(row.created_at),
    expiresAt: dateString(row.expires_at),
    releasedAt: row.released_at ? dateString(row.released_at) : null,
  };
}
