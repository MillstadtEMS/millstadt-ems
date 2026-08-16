/**
 * GET  /api/admin/employees/[id]/files     — list this employee's files
 * POST /api/admin/employees/[id]/files     — upload (multipart)
 *   form fields:
 *     file       : File (required)
 *     fileType   : 'cert' | 'license' | 'writeup' | 'other'
 *     title      : string
 *     notes      : string (optional)
 *     expiresOn  : YYYY-MM-DD (optional, for certs/licenses)
 */
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  getEmployee,
  listEmployeeFiles,
  addEmployeeFile,
  type EmployeeFile,
} from "@/lib/lounge/employees";
import { privateBlobReference } from "@/lib/lounge/private-blobs";
import { inspectUploadedFile, PRIVATE_DOCUMENT_TYPES } from "@/lib/security/upload-inspection";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const files = await listEmployeeFiles(id);
  return NextResponse.json({ files });
}

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
  const file = form.get("file") as File | null;
  const fileType = (form.get("fileType") as string | null) ?? "other";
  const title = (form.get("title") as string | null)?.trim() ?? "";
  const notes = (form.get("notes") as string | null) ?? undefined;
  const expiresOn = (form.get("expiresOn") as string | null) || undefined;

  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 25 MB)" }, { status: 400 });
  }
  if (!["cert", "license", "writeup", "other"].includes(fileType)) {
    return NextResponse.json({ error: "Invalid fileType" }, { status: 400 });
  }
  const inspected = await inspectUploadedFile(file, PRIVATE_DOCUMENT_TYPES);
  if (!inspected.ok) return NextResponse.json({ error: inspected.error }, { status: 400 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `lounge/employees/${id}/${fileType}/${Date.now()}_${safeName}`;

  const blob = await put(path, file, {
    access: "private",
    allowOverwrite: false,
    contentType: inspected.mime,
  });

  const saved = await addEmployeeFile({
    employeeId: id,
    fileType: fileType as EmployeeFile["fileType"],
    title,
    fileUrl: privateBlobReference(blob.pathname),
    fileMime: inspected.mime,
    notes,
    expiresOn,
    uploadedBy: me.id,
  });

  return NextResponse.json({ file: saved });
}
