/**
 * POST /api/board/login  { username, password }
 * Verifies board credentials, opens a session, records the login in the audit
 * trail. Returns { ok, mustChange } — the client routes to the forced
 * password-change screen when mustChange is true.
 */
import { NextRequest } from "next/server";
import {
  consumeBoardSetupToken,
  getUserByUsername,
  setSession,
  verifyBoardLoginCredential,
} from "@/lib/board/auth";
import { audit } from "@/lib/board/db";
import {
  contentLengthWithin,
  hasContentType,
  isSameOriginRequest,
  noStoreJson,
} from "@/lib/security/http";
import { checkRateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (
    !isSameOriginRequest(req) ||
    !hasContentType(req, "application/json") ||
    !contentLengthWithin(req, 8 * 1024)
  ) {
    return noStoreJson({ error: "Invalid request." }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (!username || !password) {
    return noStoreJson({ error: "Enter your username and password." }, { status: 400 });
  }
  if (username.length > 254 || password.length > 1_024) {
    return noStoreJson({ error: "That username or password isn't right." }, { status: 401 });
  }

  const limit = await checkRateLimit(req, "board-login", {
    limit: 5,
    windowMs: 15 * 60_000,
    blockMs: 30 * 60_000,
    discriminator: username,
  });
  if (!limit.allowed) {
    await audit({ username, action: "login_rate_limited", ip });
    const response = noStoreJson({ error: "Too many attempts. Please wait and try again." }, { status: 429 });
    response.headers.set("Retry-After", String(limit.retryAfterSeconds));
    return response;
  }

  const user = await getUserByUsername(username);
  const credential = user ? verifyBoardLoginCredential(user, password) : null;
  const productionDevLogin = process.env.NODE_ENV === "production" && user?.isDevLogin === true;
  const ok = !!user && user.isActive && !productionDevLogin && credential?.ok === true;

  if (!ok || !user) {
    // Small delay to blunt guessing.
    await new Promise((r) => setTimeout(r, 350));
    await audit({ username, action: "login_failed", ip });
    return noStoreJson({ error: "That username or password isn't right." }, { status: 401 });
  }

  if (credential.usesSetupToken) {
    const consumed = await consumeBoardSetupToken(user.id);
    if (!consumed) {
      await audit({ username, action: "setup_token_replay_denied", ip });
      return noStoreJson({ error: "That setup password was already used or expired. Contact management." }, { status: 409 });
    }
    await audit({
      userId: user.id,
      username: user.username,
      role: user.role,
      action: "setup_token_consumed",
      ip,
    });
  }

  await setSession(user.id, user.passwordHash);
  await audit({ userId: user.id, username: user.username, role: user.role, action: "login", ip });

  return noStoreJson({ ok: true, mustChange: user.mustChangePassword });
}
