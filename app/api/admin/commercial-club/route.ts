import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin/auth";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form  = await req.formData();
  const month = form.get("month") as string;
  const year  = form.get("year")  as string;
  const file  = form.get("file")  as File | null;

  if (!month || !year || !file) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "PDF only" }, { status: 400 });

  const blob = await put(`commercial-club/${year}/${month}_newsletter.pdf`, file, {
    access: "public", allowOverwrite: true, contentType: "application/pdf",
  });

  return NextResponse.json({ ok: true, url: blob.url });
}
