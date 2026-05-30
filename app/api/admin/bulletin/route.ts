import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { getBulletinPosts, createBulletinPost, updateBulletinPost, deleteBulletinPost } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const denied = await requireAdmin(); if (denied) return denied;
  return NextResponse.json(await getBulletinPosts(true));
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const body = await req.json();
  const p = await createBulletinPost({ author: body.author, title: body.title, body: body.body, category: body.category ?? "General", approved: body.approved ?? false });
  return NextResponse.json(p);
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id, ...data } = await req.json();
  await updateBulletinPost(id, data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(); if (denied) return denied;
  const { id } = await req.json();
  await deleteBulletinPost(id);
  return NextResponse.json({ ok: true });
}
