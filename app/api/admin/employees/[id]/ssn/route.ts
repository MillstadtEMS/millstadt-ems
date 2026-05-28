/**
 * GET /api/admin/employees/[id]/ssn
 *   Returns the decrypted SSN. Admin-only. Logged.
 *   Never call this client-side without a deliberate user gesture
 *   ("reveal SSN" click).
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { sql } from "@/lib/lounge/db";
import { getEmployeeSsnDecrypted } from "@/lib/lounge/employees";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const ssn = await getEmployeeSsnDecrypted(id);

  // Audit trail — record who revealed which employee's SSN, and when.
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const ua = req.headers.get("user-agent") ?? null;
    const db = sql();
    await db`
      INSERT INTO lounge_login_log (employee_id, username_tried, success, ip, user_agent)
      VALUES (${me.id}, ${"REVEAL_SSN:" + id}, ${ssn !== null}, ${ip}, ${ua})
    `;
  } catch {
    // never let audit failures block the response
  }

  return NextResponse.json({ ssn });
}
