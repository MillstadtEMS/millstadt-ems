import { NextRequest, NextResponse } from "next/server";
import { findEmployeeByUsername } from "@/lib/lounge/auth";
import { startAuthentication } from "@/lib/lounge/webauthn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Generates an authentication challenge. Optionally accepts a username to
 * narrow the allowed credentials list — useful when the same iPhone has
 * passkeys for several lounge accounts. Omit for a fully-discoverable
 * sign-in.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  let employeeId: string | undefined;
  if (typeof body.username === "string" && body.username.trim()) {
    const emp = await findEmployeeByUsername(body.username.trim());
    if (emp) employeeId = emp.id;
  }
  const options = await startAuthentication(employeeId);
  return NextResponse.json({ options });
}
