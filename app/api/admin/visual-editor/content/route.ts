/**
 * GET  /api/admin/visual-editor/content — fetch all content (live + draft)
 * POST /api/admin/visual-editor/content — save draft for one or more keys
 * PUT  /api/admin/visual-editor/content — publish all drafts (or specific keys)
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyVeToken } from "../route";
import { getAllContent, saveDraft, publishAllDrafts, publishContent, logChange } from "@/lib/db";

export const runtime = "nodejs";

async function authed(): Promise<boolean> {
  const store = await cookies();
  const token = store.get("ve_session")?.value;
  return Boolean(token && verifyVeToken(token));
}

export async function GET() {
  if (!(await authed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const content = await getAllContent();
  return NextResponse.json(content);
}

export async function POST(req: NextRequest) {
  if (!(await authed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json() as { key: string; value: string } | { drafts: { key: string; value: string }[] };
  if ("drafts" in body) {
    for (const { key, value } of body.drafts) await saveDraft(key, value);
    await logChange("Save Draft", "Visual Editor", `${body.drafts.length} field(s) saved as draft`);
  } else {
    await saveDraft(body.key, body.value);
    await logChange("Save Draft", "Visual Editor", `${body.key} updated`);
  }
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  if (!(await authed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json() as { keys?: string[] };
  if (body.keys?.length) {
    await publishContent(body.keys);
  } else {
    await publishAllDrafts();
  }
  await logChange("Publish", "Visual Editor", "All drafts published to live site");
  // Trigger revalidation of public pages
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  try {
    await fetch(`${baseUrl}/api/revalidate`, { method: "POST" });
  } catch { /* non-fatal */ }
  return NextResponse.json({ ok: true });
}
