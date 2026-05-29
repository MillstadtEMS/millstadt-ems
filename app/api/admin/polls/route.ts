import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { createPoll, listPolls } from "@/lib/lounge/polls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const polls = await listPolls();
  return NextResponse.json({ polls });
}

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const kind = ["single_choice", "multi_choice", "free_text"].includes(body.kind) ? body.kind : "single_choice";
  const optionsIn = Array.isArray(body.options) ? body.options : [];
  const options = optionsIn
    .map((o: unknown) => (typeof o === "string" ? o : (o && typeof (o as { label?: unknown }).label === "string" ? String((o as { label: string }).label) : "")))
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0)
    .map((label: string) => ({ label }));
  if (kind !== "free_text" && options.length < 2) {
    return NextResponse.json({ error: "Add at least two options" }, { status: 400 });
  }

  const poll = await createPoll({
    createdBy: me.id,
    title,
    description: typeof body.description === "string" ? body.description.trim() || null : null,
    kind,
    options,
    allowComment: !!body.allowComment,
  });
  return NextResponse.json({ poll });
}
