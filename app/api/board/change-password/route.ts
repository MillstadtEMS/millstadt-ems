/**
 * POST /api/board/change-password  { newPassword }
 * Forced first-login (or voluntary) password change. Rehashes, clears the
 * must-change flag, and re-issues the session so the new password fingerprint
 * matches. Logged.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentBoardUser, hashPassword, setSession } from "@/lib/board/auth";
import { sql, audit } from "@/lib/board/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await currentBoardUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const newPassword = String(body.newPassword ?? "");
  if (newPassword.length < 10) {
    return NextResponse.json({ error: "Use at least 10 characters." }, { status: 400 });
  }

  const hash = hashPassword(newPassword);
  const db = sql();
  await db`UPDATE board_users SET password_hash = ${hash}, must_change_password = FALSE WHERE id = ${user.id}`;
  await setSession(user.id, hash);
  await audit({ userId: user.id, username: user.username, role: user.role, action: "password_changed" });

  return NextResponse.json({ ok: true });
}
