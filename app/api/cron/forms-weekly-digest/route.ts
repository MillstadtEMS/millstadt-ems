/**
 * GET /api/cron/forms-weekly-digest
 *   Triggered by Vercel cron (entry in vercel.json). Requires the
 *   CRON_SECRET in the Authorization header.
 *
 * Emails millstadtems@gmail.com a single rollup of the prior 7 days of
 * HR forms activity: how many were finalized, how many are still
 * awaiting an admin signature, how many assignments went overdue, and
 * a per-form-type breakdown. Quiet weeks send nothing.
 */
import { NextRequest, NextResponse } from "next/server";
import { emailAdmins } from "@/lib/lounge/notify-admins";
import { sql } from "@/lib/lounge/db";
import { FORM_REGISTRY } from "@/lib/lounge/forms/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface CountRow { n: number }
interface ByTypeRow { form_type: string; n: number }
interface OverdueRow { id: string; title: string; due_at: Date | string }

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = sql();

  const finalizedRows = (await db`
    SELECT COUNT(*)::int AS n FROM lounge_forms
    WHERE status = 'finalized' AND finalized_at >= NOW() - INTERVAL '7 days'
  `) as unknown as CountRow[];
  const finalizedCount = finalizedRows[0]?.n ?? 0;

  const awaitingRows = (await db`
    SELECT COUNT(*)::int AS n FROM lounge_forms
    WHERE status = 'draft'
      AND assignment_id IS NULL
      AND signatures @> '[{"who":"employee"}]'::jsonb
  `) as unknown as CountRow[];
  const awaitingCount = awaitingRows[0]?.n ?? 0;

  const overdueRows = (await db`
    SELECT a.id, a.title, a.due_at
    FROM lounge_form_assignments a
    WHERE a.closed_at IS NULL
      AND a.due_at IS NOT NULL
      AND a.due_at < NOW()
      AND EXISTS (
        SELECT 1 FROM lounge_forms f WHERE f.assignment_id = a.id AND f.status = 'draft'
      )
    ORDER BY a.due_at ASC
    LIMIT 20
  `) as unknown as OverdueRow[];

  const byType = (await db`
    SELECT form_type, COUNT(*)::int AS n
    FROM lounge_forms
    WHERE status = 'finalized' AND finalized_at >= NOW() - INTERVAL '7 days'
    GROUP BY form_type
    ORDER BY n DESC
  `) as unknown as ByTypeRow[];

  if (finalizedCount === 0 && awaitingCount === 0 && overdueRows.length === 0) {
    return NextResponse.json({ ok: true, sent: false, reason: "quiet week" });
  }

  const labelByType = new Map(FORM_REGISTRY.map((f) => [f.id, f.label]));
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://millstadtems.org";

  const lines: string[] = [];
  lines.push(`Forms activity for the past 7 days:`);
  lines.push("");
  lines.push(`• ${finalizedCount} finalized`);
  lines.push(`• ${awaitingCount} awaiting your countersign`);
  lines.push(`• ${overdueRows.length} assignment${overdueRows.length === 1 ? "" : "s"} with overdue signatures`);

  if (byType.length) {
    lines.push("");
    lines.push("By form type:");
    for (const r of byType) {
      lines.push(`  · ${labelByType.get(r.form_type) ?? r.form_type} — ${r.n}`);
    }
  }
  if (overdueRows.length) {
    lines.push("");
    lines.push("Overdue assignments:");
    for (const r of overdueRows) {
      const when = r.due_at instanceof Date ? r.due_at.toLocaleDateString() : String(r.due_at).slice(0, 10);
      lines.push(`  · ${r.title} — was due ${when}`);
    }
  }

  lines.push("");
  lines.push(`Open the admin console: ${baseUrl}/admin/forms`);

  try {
    await emailAdmins({
      kicker: "HR Forms · Weekly Digest",
      headline: `${finalizedCount} signed · ${awaitingCount} awaiting · ${overdueRows.length} overdue`,
      meta: `${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
      bodyText: lines.join("\n"),
      link: { url: `${baseUrl}/admin/forms`, label: "Open admin forms" },
      subject: `[EMS Forms] Weekly digest — ${finalizedCount} signed, ${awaitingCount} awaiting, ${overdueRows.length} overdue`,
    });
  } catch (e) {
    console.error("[cron/forms-weekly-digest] mail send failed:", e);
    return NextResponse.json({ ok: false, error: "mail send failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    sent: true,
    finalized: finalizedCount,
    awaiting: awaitingCount,
    overdue: overdueRows.length,
  });
}
