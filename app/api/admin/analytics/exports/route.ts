import { NextRequest } from "next/server";
import { requireAnalyticsSupervisor } from "@/lib/analytics/auth";
import {
  cleanDateRange,
  contentLengthWithin,
  hasJsonContentType,
  isSameOriginRequest,
  noStoreJson,
} from "@/lib/analytics/http";
import { createAnalyticsExport } from "@/lib/analytics/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPORT_FIELDS = [
  "overview",
  "topPages",
  "documentActivity",
  "geography",
  "returning",
  "securitySummary",
  "workflow",
] as const;

export async function POST(req: NextRequest) {
  const authorized = await requireAnalyticsSupervisor();
  if ("response" in authorized) return authorized.response;
  if (
    !isSameOriginRequest(req) ||
    !hasJsonContentType(req) ||
    !contentLengthWithin(req, 4_096)
  ) {
    return noStoreJson({ error: "Invalid export request." }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return noStoreJson({ error: "Invalid export request." }, { status: 400 });
  }
  if (
    !body ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => !["fields", "from", "to", "confirmed"].includes(key)) ||
    body.confirmed !== true
  ) {
    return noStoreJson({ error: "Export confirmation is required." }, { status: 400 });
  }
  const fields = EXPORT_FIELDS.filter(
    (field) => Array.isArray(body.fields) && body.fields.includes(field),
  );
  const range = cleanDateRange(
    typeof body.from === "string" ? body.from : null,
    typeof body.to === "string" ? body.to : null,
  );
  if (!fields.length || !range) {
    return noStoreJson({ error: "Select export fields and a valid date range." }, { status: 400 });
  }
  const exported = await createAnalyticsExport({
    supervisorId: authorized.employee.id,
    fields,
    rangeFrom: range.from.toISOString(),
    rangeTo: range.to.toISOString(),
  });
  return noStoreJson({
    downloadUrl: `/api/admin/analytics/exports/${exported.token}`,
    expiresAt: exported.expiresAt,
  });
}
