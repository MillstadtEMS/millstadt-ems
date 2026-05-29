import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { isTruckCheckAuthed } from "@/lib/truckcheck/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!(await isTruckCheckAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid upload" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  if (file.size > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "Photo too large (max 12MB)" }, { status: 400 });
  }

  const ext = (file.type.split("/")[1] || "jpg").replace(/[^a-z0-9]/gi, "");
  const stamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const blob = await put(`truckcheck/${stamp}-${random}.${ext}`, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type || "image/jpeg",
  });

  return NextResponse.json({ url: blob.url });
}
