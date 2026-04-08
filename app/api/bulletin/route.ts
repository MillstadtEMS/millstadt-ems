import { NextRequest, NextResponse } from "next/server";
import { getBulletinPosts, createBulletinPost } from "@/lib/db";

export const runtime = "nodejs";

// Public: approved posts only
export async function GET() {
  return NextResponse.json(await getBulletinPosts(false));
}

// Public: submit a post (goes to pending approval)
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.author?.trim() || !body.title?.trim() || !body.body?.trim()) {
    return NextResponse.json({ error: "Author, title, and message are required" }, { status: 400 });
  }
  // Sanitize — strip HTML
  const clean = (s: string) => s.replace(/<[^>]*>/g, "").slice(0, 2000).trim();
  const p = await createBulletinPost({
    author: clean(body.author),
    title:  clean(body.title),
    body:   clean(body.body),
    category: ["General","Events","Safety","Lost & Found","For Sale","Volunteer"].includes(body.category) ? body.category : "General",
    approved: false, // always pending
  });
  return NextResponse.json({ ok: true, id: p.id });
}
