/**
 * Self-service profile photo management for the logged-in lounge employee.
 *
 * This intentionally only updates lounge_employees.photo_url. Feed posts,
 * comments, Messenger previews, and the lounge shell already read from that
 * field, so the new photo flows through without touching those backend systems.
 */
import { del, put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee, updateEmployee } from "@/lib/lounge/employees";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

// Accept anything the browser considers an image — including HEIC/HEIF
// straight off an iPhone camera roll, AVIF from newer Android, plus
// macOS Safari which sometimes sends an empty content-type. Falls back
// to the filename extension when MIME is missing.
function extensionFor(type: string, fileName: string): string {
  const t = (type || "").toLowerCase();
  if (t === "image/jpeg" || t === "image/jpg") return "jpg";
  if (t === "image/png") return "png";
  if (t === "image/webp") return "webp";
  if (t === "image/gif") return "gif";
  if (t === "image/heic" || t === "image/heif") return "heic";
  if (t === "image/avif") return "avif";
  if (t === "image/bmp") return "bmp";
  if (t === "image/tiff" || t === "image/tif") return "tif";
  const m = (fileName || "").toLowerCase().match(/\.([a-z0-9]{2,5})$/);
  return m ? m[1] : "img";
}

export async function POST(req: NextRequest) {
  const session = await currentEmployee();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employee = await getEmployee(session.id);
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("photo") as File | null;
  if (!file) return NextResponse.json({ error: "Missing photo" }, { status: 400 });
  if (file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "Image too large. Max size is 8 MB." }, { status: 400 });
  }

  // Reject only when the upload clearly isn't an image at all.
  const looksLikeImage =
    (file.type || "").toLowerCase().startsWith("image/") ||
    /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp|tiff?)$/i.test(file.name || "");
  if (!looksLikeImage) {
    return NextResponse.json({ error: "Choose an image (JPG, PNG, HEIC, etc.)" }, { status: 400 });
  }

  const ext = extensionFor(file.type, file.name);
  const path = `lounge/employees/${session.id}/profile-${Date.now()}.${ext}`;
  const blob = await put(path, file, {
    access: "public",
    contentType: file.type || "application/octet-stream",
  });

  if (employee.photoUrl && employee.photoUrl !== blob.url) {
    try {
      await del(employee.photoUrl);
    } catch {
      // Best-effort cleanup. The profile should still update if deletion fails.
    }
  }

  const updated = await updateEmployee(session.id, { photoUrl: blob.url });
  return NextResponse.json({ photoUrl: updated?.photoUrl ?? blob.url });
}

export async function DELETE() {
  const session = await currentEmployee();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employee = await getEmployee(session.id);
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (employee.photoUrl) {
    try {
      await del(employee.photoUrl);
    } catch {
      // Best-effort cleanup. The database update below is the source of truth.
    }
  }

  await updateEmployee(session.id, { photoUrl: null });
  return NextResponse.json({ photoUrl: null });
}
