import { NextRequest, NextResponse } from "next/server";
import { getBulletinPosts, createBulletinPost } from "@/lib/db";

export const runtime = "nodejs";

// Public: approved posts only
export async function GET() {
  return NextResponse.json(await getBulletinPosts(false));
}

// Public posting disabled — admin only via /api/admin/bulletin
export async function POST() {
  return NextResponse.json({ error: "Not allowed" }, { status: 403 });
}
