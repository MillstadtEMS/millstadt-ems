/**
 * POST /api/admin/employees/[id]/reset-password
 *   Issues a random, expiring one-use setup credential, revokes every session,
 *   trusted device, and pending MFA challenge. Passkeys and TOTP are preserved.
 */
import { NextRequest } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  getEmployee,
  resetEmployeePassword,
} from "@/lib/lounge/employees";
import { isSameOriginRequest, noStoreJson } from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { recordSecurityAudit } from "@/lib/security/audit";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!isSameOriginRequest(req)) {
    return noStoreJson({ error: "Invalid request" }, { status: 403 });
  }
  const me = await currentEmployee();
  if (!me || !me.isAdmin) {
    return noStoreJson({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const limit = await checkRateLimit(req, "admin-employee-password-reset", {
    limit: 10,
    windowMs: 60 * 60_000,
    blockMs: 60 * 60_000,
    discriminator: me.id,
  });
  if (!limit.allowed) {
    const response = noStoreJson({ error: "Too many password resets. Try again later." }, { status: 429 });
    response.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return response;
  }
  const emp = await getEmployee(id);
  if (!emp) return noStoreJson({ error: "Not found" }, { status: 404 });

  const reset = await resetEmployeePassword(id);
  if (!reset) return noStoreJson({ error: "Not found" }, { status: 404 });
  const {
    setupToken,
    setupTokenExpiresAt,
    revokedTrustedDevices,
    revokedPreauthChallenges,
  } = reset;
  await recordSecurityAudit({
    actorType: "administrator",
    actorId: me.id,
    action: "employee_password_reset",
    resourceType: "employee",
    resourceId: id,
    outcome: "completed",
    req,
    detail: {
      preservedPasskeysAndTotp: true,
      forcedPasswordChange: true,
      setupTokenExpiresAt,
      revokedTrustedDevices,
      revokedPreauthChallenges,
    },
  });
  return noStoreJson({ ok: true, setupToken, setupTokenExpiresAt });
}
