import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { sql } from "@/lib/lounge/db";
import { getRecord } from "@/lib/lounge/personnel";

export const dynamic = "force-dynamic";

interface AuditRow {
  id: number;
  record_id: string | null;
  attachment_id: string | null;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  detail: unknown;
  ip: string | null;
  user_agent: string | null;
  at: string;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const record = await getRecord(id);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const db = sql();
  const rows = (await db`
    SELECT a.id, a.record_id, a.attachment_id, a.actor_id,
           e.first_name || ' ' || e.last_name AS actor_name,
           a.action, a.detail, a.ip, a.user_agent, a.at
    FROM lounge_personnel_audit a
    LEFT JOIN lounge_employees e ON e.id = a.actor_id
    WHERE a.record_id = ${id}
       OR a.attachment_id IN (SELECT id FROM lounge_personnel_attachments WHERE record_id = ${id})
    ORDER BY a.at DESC
    LIMIT 500
  `) as unknown as AuditRow[];

  return NextResponse.json({
    entries: rows.map((r) => ({
      id: r.id,
      actorId: r.actor_id,
      actorName: r.actor_name,
      action: r.action,
      detail: r.detail,
      ip: r.ip,
      userAgent: r.user_agent,
      at: r.at,
    })),
  });
}
