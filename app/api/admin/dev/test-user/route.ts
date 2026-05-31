/**
 * GET    /api/admin/dev/test-user        — find the dummy account
 * POST   /api/admin/dev/test-user/reset  — wipe all the test user's
 *                                          write-ups, forms, acks,
 *                                          notifications etc. so the
 *                                          next test run starts clean
 *
 * Admin-only. Used by the /admin/dev-tools page so leadership can
 * confirm flows end-to-end against a non-real employee.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { sql } from "@/lib/lounge/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin(); if (denied) return denied;
  const db = sql();
  const rows = (await db`
    SELECT id, username, first_name, last_name, email, certification, position
    FROM lounge_employees
    WHERE LOWER(username) = 'testuser'
    LIMIT 1
  `) as unknown as { id: string; username: string; first_name: string; last_name: string; email: string | null; certification: string | null; position: string | null }[];
  if (rows.length === 0) {
    return NextResponse.json({ exists: false }, { status: 404 });
  }
  const r = rows[0];
  return NextResponse.json({
    exists: true,
    employee: {
      id: r.id,
      username: r.username,
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      certification: r.certification,
      position: r.position,
    },
  });
}
