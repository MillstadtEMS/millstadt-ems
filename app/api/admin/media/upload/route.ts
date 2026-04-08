/**
 * POST /api/admin/media/upload
 * Accepts a multipart file upload, stores in Vercel Blob, returns the URL.
 */
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const ext  = file.name.split(".").pop() ?? "jpg";
  const name = `media/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const blob = await put(name, file, {
    access: "public",
    contentType: file.type || "image/jpeg",
  });

  return NextResponse.json({ url: blob.url });
}
