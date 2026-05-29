import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  audit,
  createAttachment,
  deleteAttachment,
  getRecord,
  listAttachmentsForRecord,
} from "@/lib/lounge/personnel";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg", "image/png", "image/heic", "image/webp",
];

function meta(req: NextRequest) {
  return {
    ip: req.headers.get("x-forwarded-for") ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
  };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const record = await getRecord(id);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const attachments = await listAttachmentsForRecord(id);
  await audit({
    recordId: id,
    employeeId: record.employeeId,
    actorId: me.id,
    action: "view",
    detail: { route: "attachments" },
    ...meta(req),
  });
  return NextResponse.json({ attachments });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const record = await getRecord(id);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid upload" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });
  if (file.type && !ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
  }

  const visibility = (form.get("visibility") as string) || "admin";
  const documentCategory = (form.get("documentCategory") as string) || null;
  const adminNotes = (form.get("adminNotes") as string) || null;
  const employeeNotes = (form.get("employeeNotes") as string) || null;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  const stamp = Date.now();
  const blob = await put(`personnel/${record.employeeId}/${id}/${stamp}-${safeName}`, file, {
    access: "public",  // signed-ish via long random URL; we also gate the metadata API
    addRandomSuffix: true,
    contentType: file.type || "application/octet-stream",
  });

  const created = await createAttachment({
    recordId: id,
    employeeId: record.employeeId,
    fileName: file.name,
    fileUrl: blob.url,
    fileMime: file.type || undefined,
    fileSize: file.size,
    documentCategory: documentCategory ?? undefined,
    visibilityLevel: visibility === "employee" ? "employee" : visibility === "restricted_hr" ? "restricted_hr" : "admin",
    adminNotes: adminNotes ?? undefined,
    employeeNotes: employeeNotes ?? undefined,
    uploadedBy: me.id,
  });

  await audit({
    recordId: id,
    attachmentId: created.id,
    employeeId: record.employeeId,
    actorId: me.id,
    action: "upload",
    detail: { fileName: file.name, fileMime: file.type, fileSize: file.size, visibilityLevel: created.visibilityLevel },
    ...meta(req),
  });

  return NextResponse.json({ attachment: created });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const attachmentId = url.searchParams.get("attachmentId");
  if (!attachmentId) return NextResponse.json({ error: "attachmentId required" }, { status: 400 });

  const { id } = await ctx.params;
  const record = await getRecord(id);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url2 = await deleteAttachment(attachmentId);
  await audit({
    recordId: id,
    attachmentId,
    employeeId: record.employeeId,
    actorId: me.id,
    action: "delete",
    detail: { fileUrl: url2 },
    ...meta(req),
  });
  return NextResponse.json({ ok: true });
}
