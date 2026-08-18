import { NextRequest } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { finishRegistration } from "@/lib/lounge/webauthn";
import { contentLengthWithin, hasContentType, isSameOriginRequest, noStoreJson } from "@/lib/security/http";
import { recordSecurityAudit } from "@/lib/security/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (
    !isSameOriginRequest(req) ||
    !hasContentType(req, "application/json") ||
    !contentLengthWithin(req, 64 * 1024)
  ) {
    return noStoreJson({ error: "Invalid request" }, { status: 403 });
  }
  const me = await currentEmployee();
  if (!me) return noStoreJson({ error: "Unauthorized" }, { status: 401 });
  if (me.mustChangePassword) {
    return noStoreJson({ error: "Choose your permanent password before adding a passkey" }, { status: 409 });
  }
  const body = await req.json().catch(() => ({}));
  if (!body.response) return noStoreJson({ error: "Missing response" }, { status: 400 });
  const deviceLabel = typeof body.deviceLabel === "string" ? body.deviceLabel.trim().slice(0, 80) : undefined;
  const result = await finishRegistration(
    me.id,
    body.response,
    deviceLabel,
    req.headers.get("host"),
    req.headers.get("origin"),
  );
  if (!result.verified) {
    return noStoreJson({ error: result.reason ?? "Could not register" }, { status: 400 });
  }
  await recordSecurityAudit({
    actorType: "employee",
    actorId: me.id,
    action: "lounge_passkey_registered",
    resourceType: "authentication",
    outcome: "completed",
    req,
  });
  return noStoreJson({ ok: true });
}
