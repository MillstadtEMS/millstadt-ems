/**
 * GET  /api/lounge/policies     — list (any employee)
 * POST /api/lounge/policies     — create (admin only, multipart)
 *   form fields:
 *     title      : string (required)
 *     summary    : string (optional)
 *     category   : one of POLICY_CATEGORIES (required)
 *     tags       : comma-separated string (optional)
 *     version    : string (optional)
 *     file       : File (optional — policy doc, PDF preferred)
 */
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  POLICY_CATEGORIES,
  type PolicyCategory,
  type PolicyDocument,
  createPolicy,
  listPolicies,
} from "@/lib/lounge/policies";

export const runtime = "nodejs";

const MAX_BYTES = 25 * 1024 * 1024;

export async function GET() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ policies: await listPolicies(me.id) });
}

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const title = (form.get("title") as string | null)?.trim();
  const summary = (form.get("summary") as string | null)?.trim() ?? "";
  const categoryRaw = (form.get("category") as string | null)?.trim();
  const tagsRaw = (form.get("tags") as string | null) ?? "";
  const version = (form.get("version") as string | null)?.trim() || null;
  const file = form.get("file") as File | null;

  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  if (!categoryRaw || !POLICY_CATEGORIES.includes(categoryRaw as PolicyCategory)) {
    return NextResponse.json({ error: "Valid category required" }, { status: 400 });
  }
  if (file && file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 25 MB)" }, { status: 400 });
  }

  let document: PolicyDocument | null = null;
  if (file && file.size > 0) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `lounge/policies/${Date.now()}_${safeName}`;
    const blob = await put(path, file, {
      access: "public",
      allowOverwrite: false,
      contentType: file.type || "application/octet-stream",
    });
    document = {
      url: blob.url,
      name: file.name,
      mime: file.type || "application/octet-stream",
      size: file.size,
    };
  }

  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const policy = await createPolicy({
    authorId: me.id,
    title,
    summary,
    category: categoryRaw as PolicyCategory,
    tags,
    document,
    version,
  });

  return NextResponse.json({ policy });
}
