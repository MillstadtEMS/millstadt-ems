/**
 * POST /api/admin/employees/[id]/reset-2fa
 *
 * Admin-only. Wipes the user's TOTP enrollment so they're forced back
 * through the QR-code setup the next time they sign in. Use this when:
 *   - a user lost their phone and can't generate codes anymore
 *   - leadership suspects someone else set up 2FA on a stolen
 *     password before the legitimate user could
 *   - rotating to a new authenticator app
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee, revokeAllPreauthChallenges } from "@/lib/lounge/auth";
import { sql } from "@/lib/lounge/db";
import { revokeAllTrustedDevices } from "@/lib/lounge/trusted-devices";
import { isSameOriginRequest, noStoreJson } from "@/lib/security/http";
import { recordSecurityAudit } from "@/lib/security/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(req)) {
    return noStoreJson({ error: "Invalid request" }, { status: 403 });
  }
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  const db = sql();
  await db`
    UPDATE lounge_employees
    SET totp_secret_encrypted = NULL,
        totp_enrolled_at = NULL,
        updated_at = NOW()
    WHERE id = ${id}
  `;
  // Also clear any pending SMS login codes + webauthn credentials for
  // a clean reset of all second factors.
  await db`
    UPDATE lounge_employees
    SET sms_login_code_hash = NULL,
        sms_login_code_expires_at = NULL,
        sms_login_code_attempts = 0
    WHERE id = ${id}
  `.catch(() => {});
  await db`DELETE FROM lounge_webauthn_credentials WHERE employee_id = ${id}`.catch(() => {});
  const [revokedPreauthChallenges, revokedTrustedDevices] = await Promise.all([
    revokeAllPreauthChallenges(id),
    revokeAllTrustedDevices(id),
  ]);
  await recordSecurityAudit({
    actorType: "administrator",
    actorId: me.id,
    action: "employee_second_factors_reset",
    resourceType: "employee",
    resourceId: id,
    outcome: "completed",
    req,
    detail: { revokedPreauthChallenges, revokedTrustedDevices },
  });

  return noStoreJson({ ok: true });
}
