import { NextResponse } from "next/server";
import { currentBoardUser, setSession } from "@/lib/board/auth";
import { getUserById, audit } from "@/lib/board/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const user = await currentBoardUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const fullUser = await getUserById(user.id);
  if (!fullUser || !fullUser.isActive) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  await setSession(fullUser.id, fullUser.passwordHash);
  await audit({ userId: user.id, username: user.username, role: user.role, action: "session_refreshed" });
  return NextResponse.json({ ok: true });
}
