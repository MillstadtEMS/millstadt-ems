import { NextRequest } from "next/server";
import { requireAnalyticsSupervisor } from "@/lib/analytics/auth";
import { getAnalyticsConfig } from "@/lib/analytics/config";
import { cleanDateRange, noStoreJson } from "@/lib/analytics/http";
import { getAnalyticsSummary, listPreservationHolds } from "@/lib/analytics/store";
import { sql } from "@/lib/neon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authorized = await requireAnalyticsSupervisor();
  if ("response" in authorized) return authorized.response;
  const range = cleanDateRange(
    req.nextUrl.searchParams.get("from"),
    req.nextUrl.searchParams.get("to"),
  );
  if (!range) return noStoreJson({ error: "Invalid date range." }, { status: 400 });

  const config = getAnalyticsConfig();
  const summary = await getAnalyticsSummary(range.from, range.to);
  summary.security.failedLogins += await failedLoginCount(range.from, range.to);

  return noStoreJson({
    summary,
    preservationHolds: await listPreservationHolds(),
    configuration: {
      mode: config.mode,
      optionalAnalyticsEnabled: config.optionalAnalyticsEnabled,
      productionRuntime: config.productionRuntime,
      missingConfiguration: config.missingConfiguration,
      minimumGroupSize: config.minimumGroupSize,
      preciseLocationEnabled: false,
      ageRangeSurveyEnabled: false,
      communitySurveyEnabled: config.communitySurveyEnabled,
      retention: config.retention,
      privacyContactConfigured: Boolean(config.privacyContact),
      systemConfigured: Boolean(config.analyticsSystem),
      serviceProviderReviewConfigured: Boolean(config.serviceProviderContracts),
    },
  });
}

async function failedLoginCount(from: Date, to: Date) {
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
