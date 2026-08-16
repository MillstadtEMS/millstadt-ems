import { NextRequest } from "next/server";
import { requireAnalyticsSupervisor } from "@/lib/analytics/auth";
import {
  cleanDateRange,
  contentLengthWithin,
  hasJsonContentType,
  isSameOriginRequest,
  noStoreJson,
} from "@/lib/analytics/http";
import { listRawSecurityEvents, saveSecurityEvent } from "@/lib/analytics/store";
import { requestIp } from "@/lib/analytics/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authorized = await requireAnalyticsSupervisor();
  if ("response" in authorized) {
    await saveSecurityEvent({
      eventType: "unauthorized_access",
      route: req.nextUrl.pathname,
      method: req.method,
      responseStatus: 403,
      ipAddress: requestIp(req),
      userAgent: req.headers.get("user-agent"),
      reason: "Supervisor-only raw security review was denied.",
    }).catch(() => undefined);
    return authorized.response;
  }
  if (
    !isSameOriginRequest(req) ||
    !hasJsonContentType(req) ||
    !contentLengthWithin(req, 4_096)
  ) {
    return noStoreJson({ error: "Invalid security review request." }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return noStoreJson({ error: "Invalid security review request." }, { status: 400 });
  }
  if (
    !body ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => !["reason", "from", "to"].includes(key))
  ) {
    return noStoreJson({ error: "Invalid security review request." }, { status: 400 });
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const range = cleanDateRange(
    typeof body.from === "string" ? body.from : null,
    typeof body.to === "string" ? body.to : null,
  );
  if (!range || reason.length < 12 || reason.length > 240) {
    return noStoreJson(
      { error: "Provide a specific review reason and a valid date range." },
      { status: 400 },
    );
  }
  const events = await listRawSecurityEvents({
    supervisorId: authorized.employee.id,
    reason,
    from: range.from,
    to: range.to,
  });
  return noStoreJson({ events, limit: 250 });
}
