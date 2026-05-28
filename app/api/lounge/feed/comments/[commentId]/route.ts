/**
 * DELETE /api/lounge/feed/comments/[commentId]
 *   Removes a comment. Comment author or any admin can delete.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { deleteComment, getCommentAuthor } from "@/lib/lounge/feed";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ commentId: string }> },
) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { commentId } = await ctx.params;
  const authorId = await getCommentAuthor(commentId);
  if (!authorId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (authorId !== me.id && !me.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await deleteComment(commentId);
  return NextResponse.json({ ok: true });
}
