import { NextRequest, NextResponse } from "next/server";
import {
  currentEmployee,
  verifyPassword,
  updatePassword,
  makeSessionToken,
  cookieOptions,
  findEmployeeById,
} from "@/lib/lounge/auth";

export async function POST(req: NextRequest) {
  const emp = await currentEmployee();
  if (!emp) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";

  if (!newPassword) {
    return NextResponse.json({ error: "New password required" }, { status: 400 });
  }
  if (newPassword === currentPassword) {
    return NextResponse.json(
      { error: "New password must be different" },
      { status: 400 },
    );
  }
  if (!verifyPassword(currentPassword, emp.passwordHash)) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 401 },
    );
  }

  await updatePassword(emp.id, newPassword);

  // Re-issue the cookie with the new password hash so the user stays
  // logged in (otherwise their existing cookie is now invalid).
  const fresh = await findEmployeeById(emp.id);
  if (!fresh) {
    return NextResponse.json({ ok: true });
  }
  const token = makeSessionToken(fresh);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieOptions(token));
  return res;
}
