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

function extensionFor(type: string): string | null {
  if (type === "image/jpeg" || type === "image/jpg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return null;
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

  const ext = extensionFor(file.type);
  if (!ext) {
    return NextResponse.json({ error: "Use a JPG, PNG, WebP, or GIF image." }, { status: 400 });
  }

  const path = `lounge/employees/${session.id}/profile-${Date.now()}.${ext}`;
  const blob = await put(path, file, {
    access: "public",
    contentType: file.type,
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
