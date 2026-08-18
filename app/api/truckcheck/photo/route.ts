import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { get, put } from "@vercel/blob";
import { isTruckCheckAuthed } from "@/lib/truckcheck/auth";
import { privateBlobPath, privateBlobReference } from "@/lib/lounge/private-blobs";
import { inspectUploadedFile } from "@/lib/security/upload-inspection";
import { isSameOriginRequest } from "@/lib/security/http";

export const dynamic = "force-dynamic";

const TRUCK_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

const EXTENSION_BY_TYPE: Record<(typeof TRUCK_PHOTO_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export async function GET(req: NextRequest) {
  if (!(await isTruckCheckAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reference = req.nextUrl.searchParams.get("ref") ?? "";
  const pathname = privateBlobPath(reference);
  if (!pathname?.startsWith("truckcheck/photos/")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await get(pathname, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new Response(result.stream, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, private",
      "Content-Type": result.blob.contentType || "application/octet-stream",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

export async function POST(req: NextRequest) {
  if (!(await isTruckCheckAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Cross-origin request denied" }, { status: 403 });
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

  const inspected = await inspectUploadedFile(file, TRUCK_PHOTO_TYPES);
  if (!inspected.ok) {
    return NextResponse.json({ error: inspected.error }, { status: 400 });
  }

  const ext = EXTENSION_BY_TYPE[inspected.mime as keyof typeof EXTENSION_BY_TYPE];
  const blob = await put(`truckcheck/photos/${Date.now()}-${randomUUID()}.${ext}`, file, {
    access: "private",
    addRandomSuffix: false,
    contentType: inspected.mime,
  });

  const reference = privateBlobReference(blob.pathname);
  const url = new URL("/api/truckcheck/photo", req.nextUrl.origin);
  url.searchParams.set("ref", reference);
  return NextResponse.json({ url: url.toString() });
}
