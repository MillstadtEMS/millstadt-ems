import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { currentEmployee } from "@/lib/lounge/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/gif"];
const VIDEO_MIMES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_BYTES = 80 * 1024 * 1024; // 80MB

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid upload" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 80MB)" }, { status: 400 });

  const mime = (file.type || "").toLowerCase();
  const isImage = IMAGE_MIMES.includes(mime) || mime.startsWith("image/");
  const isVideo = VIDEO_MIMES.includes(mime) || mime.startsWith("video/");
  const kind: "image" | "video" | "file" = isImage ? "image" : isVideo ? "video" : "file";

  const safeName = (file.name || "upload").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  const stamp = Date.now();
  const blob = await put(`lounge-wall/${me.id}/${stamp}-${safeName}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: mime || "application/octet-stream",
  });

  return NextResponse.json({ url: blob.url, kind, name: file.name });
}
