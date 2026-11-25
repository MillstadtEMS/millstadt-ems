import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import {
  createStationSession, safeStationPath, STATION_COOKIE, stationCookieOptions, stationPasswordStatus,
  stationSameOrigin, verifyStationPassword, wantsSecureCookie,
} from "@/lib/station/auth";

export const runtime = "nodejs";

// A relative Location keeps the browser's own origin behind proxies and local aliases.
function back(path: string) {
  return new NextResponse(null, { status: 303, headers: { Location: path, "Cache-Control": "no-store, private" } });
}

/** The sign-in form, capped at 4 KB (a password and the return path). */
async function readForm(req: NextRequest): Promise<URLSearchParams | null> {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) return null;
  const reader = req.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); return null; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

export async function POST(req: NextRequest) {
  if (!stationSameOrigin(req.headers, req.nextUrl)) return new NextResponse("Invalid request origin.", { status: 403 });
  const form = await readForm(req);
  if (!form) return new NextResponse("Invalid form.", { status: 400 });
  const next = safeStationPath(form.get("next"));
  const retry = (error: string) => back(`/station/login?error=${error}&next=${encodeURIComponent(next)}`);

  try {
    const rate = await checkRateLimit(req, "station-login", { limit: 10, windowMs: 15 * 60_000, blockMs: 15 * 60_000 });
    if (!rate.allowed) return retry("wait");
  } catch (error) {
    console.error("[station] sign-in rate limit unavailable", { name: error instanceof Error ? error.name : "UnknownError" });
    return retry("unavailable");
  }

  const status = await stationPasswordStatus();
  if (status === "unset") return retry("setup");
  if (status === "unavailable") return retry("unavailable");
  if (!(await verifyStationPassword(form.get("password")))) return retry("password");

  const token = await createStationSession();
  if (!token) return retry("unavailable");
  const response = back(next);
  response.cookies.set(STATION_COOKIE, token, stationCookieOptions(wantsSecureCookie(req.nextUrl.protocol, req.headers.get("x-forwarded-proto"))));
  return response;
}
