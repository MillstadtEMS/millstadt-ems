import { getAnalyticsConfig } from "@/lib/analytics/config";
import { getAnalyticsSummary } from "@/lib/analytics/store";
import { sql } from "@/lib/neon";
import { isSafePublicPath } from "./privacy";
import type { AiMonitorReportType } from "./schemas";
import { listAiMonitorRuns } from "./store";

function safeText(value: string, maximum = 300) {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

function safeSiteUrl(configuredUrl: string) {
  const url = new URL(configuredUrl);
  const localDevelopment =
    process.env.NODE_ENV !== "production" &&
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if (url.protocol !== "https:" && !localDevelopment) {
    throw new Error("invalid_site_url");
  }
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

type PublicHealthCheck = {
  path: string;
  ok: boolean;
  status: number | null;
  durationMs: number;
  htmlReceived: boolean;
  minimumContentReceived: boolean;
  errorCode: string | null;
};

async function checkPublicPage(baseUrl: URL, path: string): Promise<PublicHealthCheck> {
  const started = Date.now();
  try {
    const response = await fetch(new URL(path, baseUrl), {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      headers: { "User-Agent": "MillstadtEMS-SiteMonitor/1.0" },
      signal: AbortSignal.timeout(8_000),
    });
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const body = await response.text();
    const htmlReceived = contentType.includes("text/html");
    const minimumContentReceived = body.length >= 1_000;
    return {
      path,
      ok: response.ok && htmlReceived && minimumContentReceived,
      status: response.status,
      durationMs: Date.now() - started,
      htmlReceived,
      minimumContentReceived,
      errorCode: null,
    };
  } catch (error) {
    const errorCode = error instanceof DOMException && error.name === "TimeoutError"
      ? "timeout"
      : "request_failed";
    return {
      path,
      ok: false,
      status: null,
      durationMs: Date.now() - started,
      htmlReceived: false,
      minimumContentReceived: false,
      errorCode,
    };
  }
}

async function publicHealth(siteUrl: string) {
  const baseUrl = safeSiteUrl(siteUrl);
  return Promise.all(
    ["/", "/kids-club", "/lounge/login"].map((path) => checkPublicPage(baseUrl, path)),
  );
}

async function failedLoungeLogins(from: Date, to: Date) {
  if (!process.env.DATABASE_URL) return 0;
  try {
    const rows = (await sql()`
      SELECT COUNT(*)::int AS count
      FROM lounge_login_log
      WHERE success = FALSE AND at >= ${from.toISOString()} AND at <= ${to.toISOString()}
    `) as unknown as Array<{ count: number }>;
    return Number(rows[0]?.count ?? 0);
  } catch {
    return 0;
  }
}

async function coarseGeography(from: Date, to: Date) {
  const config = getAnalyticsConfig();
  if (!process.env.DATABASE_URL || !config.optionalAnalyticsEnabled) return [];
  const rows = (await sql()`
    SELECT country, region, COUNT(*)::int AS events
    FROM site_analytics_events
    WHERE occurred_at >= ${from.toISOString()} AND occurred_at <= ${to.toISOString()}
      AND event_name = 'page_view'
      AND country IS NOT NULL
    GROUP BY country, region
    HAVING COUNT(*) >= ${config.minimumGroupSize}
    ORDER BY events DESC
    LIMIT 20
  `) as unknown as Array<{ country: string; region: string | null; events: number }>;
  return rows.map((row) => ({
    country: safeText(row.country, 80),
    region: row.region ? safeText(row.region, 80) : null,
    views: Number(row.events),
  }));
}

async function recentReportContext(reportType: AiMonitorReportType) {
  const runs = await listAiMonitorRuns(20);
  return runs
    .filter((run) => run.reportType === reportType && run.status === "completed" && run.report)
    .slice(0, 4)
    .map((run) => ({
      date: run.startedAt.slice(0, 10),
      verdict: run.report!.verdict,
      summary: safeText(run.report!.summary, 300),
      findingTitles: run.report!.findings.map((finding) => safeText(finding.title, 120)).slice(0, 6),
    }));
}

export async function buildNightlySecurityEvidence(siteUrl: string, now = new Date()) {
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1_000);
  const summary = await getAnalyticsSummary(from, now);
  return {
    evidenceVersion: 1,
    reportType: "nightly_security" as const,
    generatedAt: now.toISOString(),
    reportOnly: true,
    publicHealth: await publicHealth(siteUrl),
    aggregateSecurity: {
      failedLogins: summary.security.failedLogins + (await failedLoungeLogins(from, now)),
      rateLimitEvents: summary.security.rateLimitEvents,
      malwareScanEvents: summary.security.malwareScanEvents,
      unauthorizedAccessAttempts: summary.security.unauthorizedAccessAttempts,
      systemErrors: summary.security.systemErrors,
      clientErrors: summary.overview.clientErrors,
    },
    previousReports: await recentReportContext("nightly_security"),
  };
}

export async function buildWeeklyAnalyticsEvidence(now = new Date()) {
  const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1_000);
  const summary = await getAnalyticsSummary(from, now);
  return {
    evidenceVersion: 1,
    reportType: "weekly_analytics" as const,
    generatedAt: now.toISOString(),
    reportOnly: true,
    range: { from: from.toISOString(), to: now.toISOString() },
    overview: summary.overview,
    topPublicPages: summary.topPages
      .filter((item) => isSafePublicPath(item.path))
      .slice(0, 15)
      .map((item) => ({ path: item.path, views: item.views })),
    publicDocumentEvents: summary.documentEvents
      .filter((item) => item.documentKind === "public_form_990")
      .slice(0, 10),
    coarseGeography: await coarseGeography(from, now),
    returningVisitors: summary.returning,
    previousReports: await recentReportContext("weekly_analytics"),
    privacy: {
      minimumGeographyCohort: getAnalyticsConfig().minimumGroupSize,
      excluded: [
        "IP addresses",
        "user agents",
        "visitor identifiers",
        "city-level geography",
        "private routes",
        "personnel data",
        "CAD data",
        "financial records",
      ],
    },
  };
}
