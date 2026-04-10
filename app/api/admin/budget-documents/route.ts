/**
 * POST /api/admin/budget-documents
 * Upload a draft budget PDF. Auth via admin session cookie.
 * GET  /api/admin/budget-documents
 * Returns the current document URL if it exists.
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin/auth";
import { put, list } from "@vercel/blob";

export const runtime = "nodejs";

const BLOB_PATH = "admin/budget-documents/draft-annual-budget.pdf";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
  }

  const blob = await put(BLOB_PATH, file, {
    access: "public",
    allowOverwrite: true,
    contentType: "application/pdf",
  });

  return NextResponse.json({ ok: true, url: blob.url });
}

export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { blobs } = await list({ prefix: "admin/budget-documents/" });
  const doc = blobs.find(b => b.pathname.includes("draft-annual-budget"));

  if (!doc) {
    return NextResponse.json({ url: null });
  }

  return NextResponse.json({
    url: doc.url,
    size: doc.size,
    uploadedAt: doc.uploadedAt,
  });
}
