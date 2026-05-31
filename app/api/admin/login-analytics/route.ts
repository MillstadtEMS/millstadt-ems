/**
 * GET /api/admin/login-analytics
 *   Per-employee login activity summary. Returns each active employee
 *   with their most recent successful login, total success count,
 *   most recent failed attempt, and total failure count. Powers the
 *   admin "Login activity" page so leadership can see which crew
 *   members have actually adopted the lounge.
 *
 *   Joins lounge_login_log → lounge_employees so an employee who has
 *   never signed in still appears with a null last_login_at.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { sql } from "@/lib/lounge/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  certification: string | null;
  is_admin: boolean;
  is_active: boolean;
  last_success_at: unknown;
  last_success_ip: string | null;
  last_success_ua: string | null;
  success_count: number;
  last_fail_at: unknown;
  fail_count: number;
}

function dateTime(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
  return String(v);
}

export async function GET() {
  const denied = await requireAdmin(); if (denied) return denied;
  const db = sql();

  const rows = (await db`
    WITH success AS (
      SELECT employee_id,
             MAX(at) AS last_at,
             COUNT(*)::int AS n
      FROM lounge_login_log
      WHERE success = TRUE AND employee_id IS NOT NULL
      GROUP BY employee_id
    ),
    last_success AS (
      SELECT DISTINCT ON (l.employee_id)
        l.employee_id, l.at, l.ip, l.user_agent
      FROM lounge_login_log l
      WHERE l.success = TRUE AND l.employee_id IS NOT NULL
      ORDER BY l.employee_id, l.at DESC
    ),
    failure AS (
      SELECT employee_id,
             MAX(at) AS last_at,
             COUNT(*)::int AS n
      FROM lounge_login_log
      WHERE success = FALSE AND employee_id IS NOT NULL
      GROUP BY employee_id
    )
    SELECT
      e.id, e.first_name, e.last_name, e.username, e.certification,
      e.is_admin, e.is_active,
      ls.at AS last_success_at, ls.ip AS last_success_ip, ls.user_agent AS last_success_ua,
      COALESCE(s.n, 0) AS success_count,
      f.last_at AS last_fail_at,
      COALESCE(f.n, 0) AS fail_count
    FROM lounge_employees e
    LEFT JOIN success s      ON s.employee_id  = e.id
    LEFT JOIN last_success ls ON ls.employee_id = e.id
    LEFT JOIN failure f      ON f.employee_id  = e.id
    ORDER BY ls.at DESC NULLS LAST, e.last_name ASC
  `) as unknown as Row[];

  return NextResponse.json({
    employees: rows.map((r) => ({
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      username: r.username,
      certification: r.certification,
      isAdmin: r.is_admin,
      isActive: r.is_active,
      lastSuccessAt: dateTime(r.last_success_at),
      lastSuccessIp: r.last_success_ip,
      lastSuccessUa: r.last_success_ua,
      successCount: r.success_count,
      lastFailAt: dateTime(r.last_fail_at),
      failCount: r.fail_count,
    })),
  });
}
