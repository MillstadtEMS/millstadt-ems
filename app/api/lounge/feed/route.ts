/**
 * GET  /api/lounge/feed                       — list posts (newest first, pinned on top)
 * POST /api/lounge/feed                       — create a post (any employee)
 *   body: { body: string, media?: [{url, kind, name}] }
 */
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { listFeed, createPost, WALL_SUBJECT_TAGS, type WallSubjectTag } from "@/lib/lounge/feed";

export const runtime = "nodejs";

export async function GET() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const posts = await listFeed(me.id);
  return NextResponse.json({ posts });
}

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const text = String(body.body ?? "").trim();
  if (!text && (!body.media || body.media.length === 0)) {
    return NextResponse.json({ error: "Empty post" }, { status: 400 });
  }
  const subject: WallSubjectTag | null =
    typeof body.subject === "string" && (WALL_SUBJECT_TAGS as readonly string[]).includes(body.subject)
      ? (body.subject as WallSubjectTag)
      : null;
  const post = await createPost({
    authorId: me.id,
    body: text,
    subject,
    media: Array.isArray(body.media) ? body.media : undefined,
  });
  return NextResponse.json({ post });
}
