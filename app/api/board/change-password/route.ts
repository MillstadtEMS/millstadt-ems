/**
 * POST /api/board/change-password  { newPassword }
 * Forced first-login (or voluntary) password change. Rehashes, clears the
 * must-change flag, and re-issues the session so the new password fingerprint
 * matches. Logged.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentBoardUserForPasswordChange, hashPassword, setSession, validateBoardPassword } from "@/lib/board/auth";
import { sql, audit } from "@/lib/board/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await currentBoardUserForPasswordChange();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const newPassword = String(body.newPassword ?? "");
  const passwordError = validateBoardPassword(newPassword, [user.username, user.firstName, user.lastName]);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const hash = hashPassword(newPassword);
  const db = sql();
  await db`
    UPDATE board_users
    SET password_hash = ${hash},
        must_change_password = FALSE,
        setup_token_hash = NULL,
        setup_token_expires_at = NULL,
        setup_token_used_at = NULL
    WHERE id = ${user.id}
  `;
  await setSession(user.id, hash);
  await audit({
    userId: user.id,
    username: user.username,
    role: user.role,
    action: "password_changed",
    detail: user.mustChangePassword ? "setup_completed" : "voluntary_change",
  });

  return NextResponse.json({ ok: true });
}
