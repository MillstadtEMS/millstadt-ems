/**
 * POST /api/admin/senior-center
 * Accepts a PDF upload. Auth via admin session cookie.
 * Body: multipart/form-data — type (menu|activities|newsletter), month, year, file
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin/auth";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

const VALID_TYPES = ["menu", "activities", "newsletter"] as const;
type DocType = typeof VALID_TYPES[number];

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form  = await req.formData();
  const type  = form.get("type")  as DocType;
  const month = form.get("month") as string;
  const year  = form.get("year")  as string;
  const file  = form.get("file")  as File | null;

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }
  if (!month || !year || !file) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
  }

  const filename = `senior-center/${year}/${month}_${type}.pdf`;
  const blob = await put(filename, file, {
    access: "public",
    allowOverwrite: true,
    contentType: "application/pdf",
  });

  return NextResponse.json({ ok: true, url: blob.url, filename });
}
