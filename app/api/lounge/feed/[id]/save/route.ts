/**
 * POST /api/lounge/feed/[id]/save   — toggles whether this user has saved
 * the post (bookmark). Returns the new saved state.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { toggleSaved, getPost } from "@/lib/lounge/feed";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const saved = await toggleSaved(id, me.id);
  const post = await getPost(id, me.id);
  return NextResponse.json({ post, saved });
}
