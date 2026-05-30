/**
 * POST /api/admin/visual-editor — unlock the visual editor with second password
 * DELETE /api/admin/visual-editor — lock / sign out of visual editor
 */
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

export const runtime = "nodejs";

const COOKIE_NAME = "ve_session";
const COOKIE_TTL  = 60 * 60 * 8; // 8 hours

function veSecret(): string {
  const s = process.env.VE_SECRET;
  if (!s) throw new Error("VE_SECRET is not configured");
  return s;
}

function makeToken(): string {
  const payload = `ve:${Date.now()}`;
  const sig = createHmac("sha256", veSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyVeToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const lastColon = decoded.lastIndexOf(":");
    const payload = decoded.slice(0, lastColon);
    const sig     = decoded.slice(lastColon + 1);
    const expected = createHmac("sha256", veSecret()).update(payload).digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const { password } = await req.json() as { password: string };

  const expected = process.env.VISUAL_EDITOR_PASSWORD;
  if (!expected) return NextResponse.json({ error: "Visual editor not configured" }, { status: 500 });

  const a = Buffer.from(password ?? "");
  const b = Buffer.from(expected);
  const match = a.length === b.length && timingSafeEqual(a, b);
  if (!match) return NextResponse.json({ error: "Incorrect password" }, { status: 401 });

  const token = makeToken();
  const res   = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_TTL,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}
