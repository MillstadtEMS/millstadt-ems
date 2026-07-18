import { NextResponse } from "next/server";
import { currentBoardUser, clearSession } from "@/lib/board/auth";
import { audit } from "@/lib/board/db";

export const runtime = "nodejs";

export async function POST() {
  const u = await currentBoardUser();
  if (u) await audit({ userId: u.id, username: u.username, role: u.role, action: "logout" });
  await clearSession();
  return NextResponse.json({ ok: true });
}
