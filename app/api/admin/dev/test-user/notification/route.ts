/**
 * POST /api/admin/dev/test-user/notification
 *
 * Drop a single bell-tray notification on the @testuser account so
 * leadership can confirm the lounge notification pipeline end-to-end
 * without spamming a real employee.
 *
 * Used by the /admin/dev-tools "Drop a bell notification" button.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import { sql } from "@/lib/lounge/db";
import { createNotifications } from "@/lib/lounge/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title       = String(body.title ?? "Dev-tools test notification").slice(0, 200);
  const bodyPreview = String(body.body  ?? "If you can see this in the @testuser bell, notifications work end-to-end.").slice(0, 400);

  const db = sql();
  const rows = (await db`
    SELECT id FROM lounge_employees WHERE LOWER(username) = 'testuser' LIMIT 1
  `) as unknown as { id: string }[];
  if (rows.length === 0) return NextResponse.json({ error: "Test user not found." }, { status: 404 });
  const recipientId = rows[0].id;

  // createNotifications skips when recipientId === actorId, so we
  // pass actorId = null here — the test user is meant to "receive"
  // the notification regardless of who's pushing it.
  await createNotifications([{
    recipientId,
    kind: "post",
    title,
    bodyPreview,
    linkUrl: "/lounge",
    sourceId: null,
    actorId: null,
  }]);

  return NextResponse.json({ ok: true });
}
