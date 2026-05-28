/**
 * POST /api/lounge/feed/[id]/pin    — body: { pinned: boolean }
 *   Admin-only. Pins (or unpins) a post to the top of the wall.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { setPinned, getPost } from "@/lib/lounge/feed";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  await setPinned(id, !!body.pinned);
  const post = await getPost(id, me.id);
  return NextResponse.json({ post });
}
