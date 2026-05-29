import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  LOUNGE_COOKIE_NAME,
  cookieOptions,
  findEmployeeById,
  logLogin,
  makeSessionToken,
} from "@/lib/lounge/auth";
import { finishAuthentication } from "@/lib/lounge/webauthn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent") ?? null;
  await logLogin(emp.id, emp.username, true, ip, ua).catch(() => {});

  return NextResponse.json({
    ok: true,
    employee: { id: emp.id, firstName: emp.firstName, lastName: emp.lastName, isAdmin: emp.isAdmin },
  });
}
