/**
 * POST /api/board/login  { username, password }
 * Verifies board credentials, opens a session, records the login in the audit
 * trail. Returns { ok, mustChange } — the client routes to the forced
 * password-change screen when mustChange is true.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUserByUsername, verifyPassword, setSession } from "@/lib/board/auth";
import { audit } from "@/lib/board/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Very small in-memory throttle: slow repeated failures per username+ip.
const attempts = new Map<string, { n: number; at: number }>();
function throttleKey(u: string, ip: string) { return `${u}|${ip}`; }

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (!username || !password) {
    return NextResponse.json({ error: "Enter your username and password." }, { status: 400 });
  }

  const key = throttleKey(username, ip);
  const rec = attempts.get(key);
  if (rec && rec.n >= 5 && Date.now() - rec.at < 60_000) {
    return NextResponse.json({ error: "Too many attempts. Please wait a minute and try again." }, { status: 429 });
  }

  const user = await getUserByUsername(username);
  const ok = !!user && user.isActive && verifyPassword(password, user.passwordHash);

  if (!ok || !user) {
    attempts.set(key, { n: (rec?.n ?? 0) + 1, at: Date.now() });
    // Small delay to blunt guessing.
    await new Promise((r) => setTimeout(r, 350));
    await audit({ username, action: "login_failed", ip });
    return NextResponse.json({ error: "That username or password isn't right." }, { status: 401 });
  }

  attempts.delete(key);
  await setSession(user.id, user.passwordHash);
  await audit({ userId: user.id, username: user.username, role: user.role, action: "login", ip });

  return NextResponse.json({ ok: true, mustChange: user.mustChangePassword });
}
