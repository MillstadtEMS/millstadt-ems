/**
 * POST /api/lounge/feed/[id]/react   — body: { kind: string | null }
 *   Sets (or clears, when kind is null) the current user's reaction to the post.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { setReaction, getPost } from "@/lib/lounge/feed";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const kind = body.kind == null ? null : String(body.kind);
  await setReaction(id, me.id, kind);
  const post = await getPost(id, me.id);
  return NextResponse.json({ post });
}
