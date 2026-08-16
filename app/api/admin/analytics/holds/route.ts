import { NextRequest } from "next/server";
import { requireAnalyticsSupervisor } from "@/lib/analytics/auth";
import {
  cleanDateRange,
  contentLengthWithin,
  hasJsonContentType,
  isSameOriginRequest,
  noStoreJson,
} from "@/lib/analytics/http";
import {
  createPreservationHold,
  releasePreservationHold,
} from "@/lib/analytics/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const authorized = await requireAnalyticsSupervisor();
  if ("response" in authorized) return authorized.response;
  if (
    !isSameOriginRequest(req) ||
    !hasJsonContentType(req) ||
    !contentLengthWithin(req, 4_096)
  ) {
    return noStoreJson({ error: "Invalid preservation-hold request." }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return noStoreJson({ error: "Invalid preservation-hold request." }, { status: 400 });
  }
  if (!body || Array.isArray(body)) {
    return noStoreJson({ error: "Invalid preservation-hold request." }, { status: 400 });
  }
  const action = body.action;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (reason.length < 12 || reason.length > 240) {
    return noStoreJson({ error: "A specific incident reason is required." }, { status: 400 });
  }

  if (action === "create") {
    if (Object.keys(body).some((key) => !["action", "reason", "from", "to"].includes(key))) {
      return noStoreJson({ error: "Invalid preservation-hold request." }, { status: 400 });
    }
    const range = cleanDateRange(
      typeof body.from === "string" ? body.from : null,
      typeof body.to === "string" ? body.to : null,
    );
    if (!range) return noStoreJson({ error: "Invalid hold date range." }, { status: 400 });
    const hold = await createPreservationHold({
      supervisorId: authorized.employee.id,
      reason,
      from: range.from,
      to: range.to,
    });
    return noStoreJson({ hold }, { status: 201 });
  }

  if (action === "release") {
    if (
      Object.keys(body).some((key) => !["action", "reason", "holdId"].includes(key)) ||
      typeof body.holdId !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(body.holdId)
    ) {
      return noStoreJson({ error: "Invalid preservation-hold request." }, { status: 400 });
    }
    const hold = await releasePreservationHold({
      id: body.holdId,
      supervisorId: authorized.employee.id,
      reason,
    });
    return hold
      ? noStoreJson({ hold })
      : noStoreJson({ error: "The active hold was not found." }, { status: 404 });
  }

  return noStoreJson({ error: "Invalid preservation-hold action." }, { status: 400 });
}
