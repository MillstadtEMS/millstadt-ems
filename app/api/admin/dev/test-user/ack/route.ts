/**
 * POST /api/admin/dev/test-user/ack
 *
 * Push a targeted acknowledgment that ONLY the @testuser dummy
 * account can see. Real crew never sees this — visibility is scoped
 * by `target_employee_id` on lounge_acks (see lib/lounge/acks.ts).
 *
 * Used by the /admin/dev-tools "Push test acknowledgment" button.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { currentEmployee } from "@/lib/lounge/auth";
import { sql } from "@/lib/lounge/db";
import { createAck } from "@/lib/lounge/acks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "Dev test notice").slice(0, 200);
  const text  = String(body.body  ?? "This is a dev-tools test acknowledgment.").slice(0, 4000);
  const requiresAcknowledgment = !!body.requiresAcknowledgment;

  const db = sql();
  const rows = (await db`
    SELECT id FROM lounge_employees WHERE LOWER(username) = 'testuser' LIMIT 1
  `) as unknown as { id: string }[];
  if (rows.length === 0) return NextResponse.json({ error: "Test user not found." }, { status: 404 });
  const targetId = rows[0].id;

  const ack = await createAck({
    authorId: me.id,
    title,
    body: text,
    category: "Dev test",
    requiresAcknowledgment,
    targetEmployeeId: targetId,
  });

  return NextResponse.json({ ok: true, ack });
}
