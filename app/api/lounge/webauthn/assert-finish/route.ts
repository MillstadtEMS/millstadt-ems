import { NextRequest } from "next/server";
import {
  cookieOptions,
  findEmployeeById,
  logLogin,
  makeSessionToken,
} from "@/lib/lounge/auth";
import { finishAuthentication } from "@/lib/lounge/webauthn";
import { issueTrustedDevice, trustCookieOptions } from "@/lib/lounge/trusted-devices";
import { contentLengthWithin, hasContentType, isSameOriginRequest, noStoreJson } from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { recordSecurityAudit } from "@/lib/security/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function uaToDeviceLabel(ua: string | null): string | null {
  if (!ua) return null;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  return null;
}

export async function POST(req: NextRequest) {
  if (
    !isSameOriginRequest(req) ||
    !hasContentType(req, "application/json") ||
    !contentLengthWithin(req, 64 * 1024)
  ) {
    return noStoreJson({ error: "Invalid request" }, { status: 403 });
  }
  const limit = await checkRateLimit(req, "lounge-passkey-finish", {
    limit: 10,
    windowMs: 15 * 60_000,
    blockMs: 30 * 60_000,
  });
  if (!limit.allowed) {
    const response = noStoreJson({ error: "Too many attempts. Try again later." }, { status: 429 });
    response.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return response;
  }
  const body = await req.json().catch(() => ({}));
  if (!body.response) return noStoreJson({ error: "Missing response" }, { status: 400 });

  const result = await finishAuthentication(
    body.response,
    req.headers.get("host"),
    req.headers.get("origin"),
  );
  if (!result.verified || !result.employeeId) {
    return noStoreJson({ error: result.reason ?? "Sign-in failed" }, { status: 401 });
  }

  const emp = await findEmployeeById(result.employeeId);
  if (!emp || !emp.isActive) {
    return noStoreJson({ error: "Account inactive" }, { status: 403 });
  }
  if (emp.mustChangePassword) {
    return noStoreJson(
      { error: "Use your username and one-time password before biometric sign-in." },
      { status: 409 },
    );
  }

  const token = makeSessionToken(emp);
  const opts = cookieOptions(token);
  const res = noStoreJson({
    ok: true,
    employee: { id: emp.id, firstName: emp.firstName, lastName: emp.lastName, isAdmin: emp.isAdmin },
  });
  res.cookies.set(opts);

  // A successful WebAuthn assertion is just as strong as a password
  // + 2FA prompt — it proves possession of a hardware-bound key. So
  // we issue a trust cookie here too, which means a subsequent
  // password login on this same device won't re-challenge for 2FA.
  // Without this, KJ's iPhone kept hitting the 2FA screen every time
  // his short session expired.
  try {
    const label = uaToDeviceLabel(req.headers.get("user-agent"));
    const trustToken = await issueTrustedDevice(emp.id, label);
    const tOpts = trustCookieOptions(trustToken);
    res.cookies.set(tOpts);
  } catch (e) {
    console.error("[webauthn/assert-finish] trust-device issue failed:", e);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent") ?? null;
  await logLogin(emp.id, emp.username, true, ip, ua).catch(() => {});
  await recordSecurityAudit({
    actorType: "employee",
    actorId: emp.id,
    action: "lounge_passkey_login",
    resourceType: "authentication",
    outcome: "completed",
    req,
  });

  return res;
}
