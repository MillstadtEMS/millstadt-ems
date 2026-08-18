import { NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";

/**
 * Administrator access is provided only through a named, active Lounge
 * account with the administrator role. The former shared password/session
 * path is intentionally retired.
 */
export async function isAdminAuthed(): Promise<boolean> {
  return Boolean(await currentAdmin());
}

export async function currentAdmin() {
  const employee = await currentEmployee();
  return employee?.isAdmin && employee.isActive ? employee : null;
}

export async function requireAdmin(): Promise<NextResponse | null> {
  if (await currentAdmin()) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * Ticker editing remains a separate least-privilege role. This function is
 * deliberately preserved so the security pass does not require global admin
 * rights for employees who are authorized only to curate the ticker.
 */
export async function canEditTicker(): Promise<boolean> {
  const employee = await currentEmployee();
  if (!employee?.isActive) return false;
  if (employee.isAdmin) return true;
  const { sql } = await import("@/lib/lounge/db");
  const rows = (await sql()`
    SELECT COALESCE(can_edit_ticker, FALSE) AS can_edit_ticker
    FROM lounge_employees WHERE id = ${employee.id} LIMIT 1
  `) as unknown as { can_edit_ticker: boolean }[];
  return rows[0]?.can_edit_ticker ?? false;
}

export async function requireTickerEditor(): Promise<NextResponse | null> {
  if (await canEditTicker()) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function tickerEditorName(): Promise<string> {
  const employee = await currentEmployee();
  if (!employee?.isActive) return "Unknown";
  return employee.firstName || employee.username || "Staff";
}
