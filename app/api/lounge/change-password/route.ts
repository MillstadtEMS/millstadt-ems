import { NextRequest } from "next/server";
import {
  currentEmployeeForPasswordChange,
  verifyPassword,
  updatePassword,
  permanentPasswordError,
  makeSessionToken,
  cookieOptions,
  findEmployeeById,
} from "@/lib/lounge/auth";
import {
  contentLengthWithin,
  hasContentType,
  isSameOriginRequest,
  noStoreJson,
} from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { recordSecurityAudit } from "@/lib/security/audit";

export async function POST(req: NextRequest) {
  if (
    !isSameOriginRequest(req) ||
    !hasContentType(req, "application/json") ||
    !contentLengthWithin(req, 4 * 1024)
  ) {
    return noStoreJson({ error: "Invalid request" }, { status: 403 });
  }
  const emp = await currentEmployeeForPasswordChange();
  if (!emp) {
    return noStoreJson({ error: "Not signed in" }, { status: 401 });
  }

  const limit = await checkRateLimit(req, "lounge-change-password", {
    limit: 5,
    windowMs: 30 * 60_000,
    blockMs: 30 * 60_000,
    discriminator: emp.id,
  });
  if (!limit.allowed) {
    const response = noStoreJson({ error: "Too many attempts. Try again later." }, { status: 429 });
    response.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return response;
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return noStoreJson({ error: "Invalid request" }, { status: 400 });
  }
  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";

  if (!newPassword) {
    return noStoreJson({ error: "New password required" }, { status: 400 });
  }
  if (newPassword === currentPassword) {
    return noStoreJson(
      { error: "New password must be different" },
      { status: 400 },
    );
  }
  const policyError = permanentPasswordError(newPassword, emp.username);
  if (policyError) {
    return noStoreJson({ error: policyError }, { status: 400 });
  }
  if (!verifyPassword(currentPassword, emp.passwordHash)) {
    await recordSecurityAudit({
      actorType: "employee",
      actorId: emp.id,
      action: "lounge_password_change",
      resourceType: "authentication",
      outcome: "denied",
      req,
      detail: { reason: "incorrect_current_password" },
    });
    return noStoreJson(
      { error: "Current password is incorrect" },
      { status: 401 },
    );
  }

  const changed = await updatePassword(emp.id, emp.passwordHash, newPassword);
  if (!changed) {
    return noStoreJson(
      { error: "Your account changed in another session. Sign in again and retry." },
      { status: 409 },
    );
  }

  // Re-issue the cookie with the new password hash so the user stays
  // logged in (otherwise their existing cookie is now invalid).
  const fresh = await findEmployeeById(emp.id);
  if (!fresh) {
    return noStoreJson({ error: "Account unavailable" }, { status: 409 });
  }
  const token = makeSessionToken(fresh);
  await recordSecurityAudit({
    actorType: "employee",
    actorId: emp.id,
    action: "lounge_password_change",
    resourceType: "authentication",
    outcome: "completed",
    req,
    detail: { permanentPasswordSet: true, expirationScheduled: false },
  });
  const res = noStoreJson({ ok: true });
  res.cookies.set(cookieOptions(token));
  return res;
}
