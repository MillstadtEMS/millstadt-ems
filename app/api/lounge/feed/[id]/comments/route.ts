/**
 * GET  /api/lounge/feed/[id]/comments    — list comments on a post
 * POST /api/lounge/feed/[id]/comments    — add a comment
 *   body: { body: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { listComments, addComment } from "@/lib/lounge/feed";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const comments = await listComments(id);
  return NextResponse.json({ comments });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();
  const text = String(body.body ?? "").trim();
  if (!text) return NextResponse.json({ error: "Empty comment" }, { status: 400 });
  const mentions = Array.isArray(body.mentions)
    ? body.mentions.filter((m: unknown): m is string => typeof m === "string")
    : [];
  const comment = await addComment({ postId: id, authorId: me.id, body: text, mentions });
  return NextResponse.json({ comment });
}
