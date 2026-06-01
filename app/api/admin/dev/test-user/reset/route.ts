/**
 * POST /api/admin/dev/test-user/reset
 *
 * Nukes every dummy-account artifact so the next test run starts
 * clean. Safe to run repeatedly — only targets the @testuser row.
 */
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { sql } from "@/lib/lounge/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const denied = await requireAdmin(); if (denied) return denied;
  const db = sql();

  const rows = (await db`SELECT id FROM lounge_employees WHERE LOWER(username) = 'testuser' LIMIT 1`) as unknown as { id: string }[];
  if (rows.length === 0) return NextResponse.json({ error: "Test user not found." }, { status: 404 });
  const id = rows[0].id;

  // Best-effort table-by-table — some tables may not exist yet on
  // a freshly bootstrapped DB.
  const counts: Record<string, number> = {};
  async function nuke(label: string, fn: () => Promise<unknown[]>) {
    try { counts[label] = (await fn()).length; }
    catch { counts[label] = -1; }
  }

  await nuke("writeups",                () => db`DELETE FROM lounge_writeups               WHERE employee_id = ${id} RETURNING 1`);
  await nuke("personnel_attachments",   () => db`DELETE FROM lounge_personnel_attachments  WHERE employee_id = ${id} RETURNING 1`);
  await nuke("personnel_records",       () => db`DELETE FROM lounge_personnel_records      WHERE employee_id = ${id} RETURNING 1`);
  await nuke("forms",                   () => db`DELETE FROM lounge_forms                  WHERE employee_id = ${id} RETURNING 1`);
  await nuke("form_requests",           () => db`DELETE FROM lounge_form_requests          WHERE employee_id = ${id} RETURNING 1`);
  await nuke("notifications",           () => db`DELETE FROM lounge_notifications          WHERE recipient_id = ${id} RETURNING 1`);
  // lounge_ack_states keys on user_id (not employee_id) — see schema.sql.
  await nuke("ack_states",              () => db`DELETE FROM lounge_ack_states             WHERE user_id = ${id} RETURNING 1`);
  // Targeted "test-user only" acks pushed via dev-tools; cascading
  // FK on lounge_ack_states wipes any per-row state automatically.
  await nuke("targeted_acks",           () => db`DELETE FROM lounge_acks                   WHERE target_employee_id = ${id} RETURNING 1`);
  await nuke("onboarding_records",      () => db`DELETE FROM lounge_onboarding_records     WHERE employee_id = ${id} RETURNING 1`);
  await nuke("profile_change_requests", () => db`DELETE FROM lounge_profile_change_requests WHERE employee_id = ${id} RETURNING 1`);

  return NextResponse.json({ ok: true, counts });
}
