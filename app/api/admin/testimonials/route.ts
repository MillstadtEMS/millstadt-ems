import { NextRequest } from "next/server";
import { currentAdmin } from "@/lib/admin/auth";
import {
  getAllTestimonials,
  getTestimonialModerationAudit,
  setStatus,
  deleteTestimonial,
} from "@/lib/testimonials";
import {
  contentLengthWithin,
  hasContentType,
  isSameOriginRequest,
  noStoreJson,
  safeHeaderValue,
} from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const TESTIMONIAL_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: string[]) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function adminName(admin: Awaited<ReturnType<typeof currentAdmin>>) {
  if (!admin) return "Unknown administrator";
  return safeHeaderValue(
    `${admin.firstName} ${admin.lastName}`.trim() || admin.username,
    120,
  );
}

async function authorizeMutation(req: NextRequest) {
  const admin = await currentAdmin();
  if (!admin) {
    return { response: noStoreJson({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  if (!isSameOriginRequest(req)) {
    return { response: noStoreJson({ error: "Cross-origin request denied" }, { status: 403 }) } as const;
  }
  if (!hasContentType(req, "application/json")) {
    return { response: noStoreJson({ error: "JSON body required" }, { status: 415 }) } as const;
  }
  if (!contentLengthWithin(req, 2_048)) {
    return { response: noStoreJson({ error: "Request body is too large" }, { status: 413 }) } as const;
  }
  const limit = await checkRateLimit(req, "admin-testimonial-moderation", {
    limit: 60,
    windowMs: 60_000,
    discriminator: admin.id,
  });
  if (!limit.allowed) {
    return {
      response: noStoreJson(
        { error: "Too many moderation requests. Please wait and try again." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      ),
    } as const;
  }
  return { admin } as const;
}

async function readJsonObject(req: NextRequest) {
  try {
    const value: unknown = await req.json();
    return isPlainObject(value) ? value : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const admin = await currentAdmin();
  if (!admin) return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  const items = await getAllTestimonials();
  if (req.nextUrl.searchParams.get("includeAudit") === "1") {
    return noStoreJson({
      items,
      audit: await getTestimonialModerationAudit(),
    });
  }
  return noStoreJson(items);
}

export async function PATCH(req: NextRequest) {
  const authorization = await authorizeMutation(req);
  if ("response" in authorization) return authorization.response;
  const body = await readJsonObject(req);
  if (
    !body ||
    !hasOnlyKeys(body, ["id", "status"]) ||
    typeof body.id !== "string" ||
    !TESTIMONIAL_ID.test(body.id) ||
    (body.status !== "approved" && body.status !== "denied")
  ) {
    return noStoreJson({ error: "Invalid testimonial action" }, { status: 400 });
  }
  const result = await setStatus(
    body.id,
    body.status,
    authorization.admin.id,
    adminName(authorization.admin),
  );
  if (result.outcome === "not-found") {
    return noStoreJson({ error: "Testimonial not found", outcome: result.outcome }, { status: 404 });
  }
  return noStoreJson({ ok: true, ...result });
}

export async function DELETE(req: NextRequest) {
  const authorization = await authorizeMutation(req);
  if ("response" in authorization) return authorization.response;
  const body = await readJsonObject(req);
  if (
    !body ||
    !hasOnlyKeys(body, ["id"]) ||
    typeof body.id !== "string" ||
    !TESTIMONIAL_ID.test(body.id)
  ) {
    return noStoreJson({ error: "Invalid testimonial ID" }, { status: 400 });
  }
  const outcome = await deleteTestimonial(
    body.id,
    authorization.admin.id,
    adminName(authorization.admin),
  );
  if (outcome === "not-found") {
    return noStoreJson({ error: "Testimonial not found", outcome }, { status: 404 });
  }
  return noStoreJson({ ok: true, outcome });
}
