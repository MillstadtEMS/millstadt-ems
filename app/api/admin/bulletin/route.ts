import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin/auth";
import { getBulletinPosts, createBulletinPost, updateBulletinPost, deleteBulletinPost } from "@/lib/db";

export const runtime = "nodejs";

async function auth() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

export async function GET() {
  const e = await auth(); if (e) return e;
  return NextResponse.json(await getBulletinPosts(true));
}

export async function POST(req: NextRequest) {
  const e = await auth(); if (e) return e;
  const body = await req.json();
  const p = await createBulletinPost({ author: body.author, title: body.title, body: body.body, category: body.category ?? "General", approved: body.approved ?? false });
  return NextResponse.json(p);
}

export async function PATCH(req: NextRequest) {
  const e = await auth(); if (e) return e;
  const { id, ...data } = await req.json();
  await updateBulletinPost(id, data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const e = await auth(); if (e) return e;
  const { id } = await req.json();
  await deleteBulletinPost(id);
  return NextResponse.json({ ok: true });
}
