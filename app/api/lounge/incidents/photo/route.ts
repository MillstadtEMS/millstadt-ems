import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { currentEmployee } from "@/lib/lounge/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid upload" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!(file.type || "").startsWith("image/")) {
    return NextResponse.json({ error: "Image only" }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "Photo too large (max 20MB)" }, { status: 400 });
  }

  const safe = (file.name || "photo.jpg").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const blob = await put(`lounge/incidents/${me.id}/${Date.now()}-${safe}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type || "image/jpeg",
  });

  return NextResponse.json({ url: blob.url, name: file.name });
}
