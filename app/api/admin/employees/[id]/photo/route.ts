/**
 * POST /api/admin/employees/[id]/photo
 *   multipart/form-data with field "photo" (image file).
 *   Uploads to Vercel Blob and updates lounge_employees.photo_url.
 */
import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee, updateEmployee } from "@/lib/lounge/employees";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const emp = await getEmployee(id);
  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("photo") as File | null;
  if (!file) return NextResponse.json({ error: "Missing photo" }, { status: 400 });
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Image files only" }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Image too large (max 8 MB)" }, { status: 400 });
  }

  // Extension from MIME to keep URL clean
  const ext =
    file.type === "image/png" ? "png"
    : file.type === "image/webp" ? "webp"
    : file.type === "image/gif" ? "gif"
    : "jpg";
  const path = `lounge/employees/${id}/photo.${ext}`;

  const blob = await put(path, file, {
    access: "public",
    allowOverwrite: true,
    contentType: file.type,
  });

  // Best-effort cleanup of old photo if it was a different extension/path
  if (emp.photoUrl && emp.photoUrl !== blob.url) {
    try {
      await del(emp.photoUrl);
    } catch {
      // best-effort
    }
  }

  const updated = await updateEmployee(id, { photoUrl: blob.url });
  return NextResponse.json({ employee: updated, url: blob.url });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const emp = await getEmployee(id);
  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (emp.photoUrl) {
    try {
      await del(emp.photoUrl);
    } catch {
      // best-effort
    }
  }
  const updated = await updateEmployee(id, { photoUrl: null });
  return NextResponse.json({ employee: updated });
}
