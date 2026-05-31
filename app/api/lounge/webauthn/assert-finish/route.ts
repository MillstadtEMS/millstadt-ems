import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  cookieOptions,
  findEmployeeById,
  logLogin,
  makeSessionToken,
} from "@/lib/lounge/auth";
import { finishAuthentication } from "@/lib/lounge/webauthn";
import { issueTrustedDevice, trustCookieOptions } from "@/lib/lounge/trusted-devices";

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
  const body = await req.json().catch(() => ({}));
  if (!body.response) return NextResponse.json({ error: "Missing response" }, { status: 400 });

  const result = await finishAuthentication(body.response, req.headers.get("host"));
  if (!result.verified || !result.employeeId) {
    return NextResponse.json({ error: result.reason ?? "Sign-in failed" }, { status: 401 });
  }

  const emp = await findEmployeeById(result.employeeId);
  if (!emp || !emp.isActive) {
    return NextResponse.json({ error: "Account inactive" }, { status: 403 });
  }

  const token = makeSessionToken(emp);
  const opts = cookieOptions(token);
  const jar = await cookies();
  jar.set(opts);

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
    jar.set(tOpts);
  } catch (e) {
    console.error("[webauthn/assert-finish] trust-device issue failed:", e);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent") ?? null;
  await logLogin(emp.id, emp.username, true, ip, ua).catch(() => {});

  return NextResponse.json({
    ok: true,
    employee: { id: emp.id, firstName: emp.firstName, lastName: emp.lastName, isAdmin: emp.isAdmin },
  });
}
