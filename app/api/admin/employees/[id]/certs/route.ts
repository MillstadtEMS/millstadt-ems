/**
 * POST /api/admin/employees/[id]/certs — admin uploads a cert for any
 * employee. Mirrors /api/lounge/certs (self-service upload) but the
 * employee id comes from the URL and the caller must be admin.
 *
 * If certTypeId is provided, the existing cert type is used. If the
 * caller wants a new custom type, set certTypeName instead and we'll
 * create a custom type on the fly (and use it).
 */

import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  addEmployeeCert,
  createCertType,
  deleteEmployeeCert,
  getCertType,
  listCertTypes,
  listEmployeeCerts,
} from "@/lib/lounge/certs";
import { privateBlobReference } from "@/lib/lounge/private-blobs";
import { CREDENTIAL_DOCUMENT_TYPES, inspectUploadedFile } from "@/lib/security/upload-inspection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: employeeId } = await ctx.params;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const file = form.get("file") as File | null;
  let certTypeId = (form.get("certTypeId") as string | null)?.trim() || null;
  const customName = (form.get("certTypeName") as string | null)?.trim() || null;
  const expiresFlag = (form.get("expires") as string | null) === "yes";
  const issuedOn = (form.get("issuedOn") as string | null) || undefined;
  const expiresOn = (form.get("expiresOn") as string | null) || undefined;

  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 15 MB)" }, { status: 400 });
  }
  if (expiresFlag && !expiresOn) {
    return NextResponse.json({ error: "Expiration date required when 'Expires' is yes" }, { status: 400 });
  }
  const inspected = await inspectUploadedFile(file, CREDENTIAL_DOCUMENT_TYPES);
  if (!inspected.ok) return NextResponse.json({ error: inspected.error }, { status: 400 });

  // If a custom name was provided and no certTypeId, create the custom
  // cert type up front so it shows up in the global list next time.
  if (!certTypeId && customName) {
    const existing = (await listCertTypes()).find(
      (t) => t.name.toLowerCase() === customName.toLowerCase(),
    );
    if (existing) {
      certTypeId = existing.id;
    } else {
      const created = await createCertType({
        name: customName,
        slug: customName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        requiresExpiration: expiresFlag,
        createdBy: me.id,
      });
      certTypeId = created.id;
    }
  }

  if (!certTypeId) {
    return NextResponse.json({ error: "Pick an existing cert type or provide a custom name" }, { status: 400 });
  }
  const certType = await getCertType(certTypeId);
  if (!certType) return NextResponse.json({ error: "Unknown cert type" }, { status: 400 });

  // Replace prior upload of the same cert type for this employee (matches
  // self-service behaviour).
  const prior = (await listEmployeeCerts(employeeId)).filter((c) => c.certTypeId === certTypeId);
  for (const old of prior) {
    const url = await deleteEmployeeCert(old.id);
    if (url) { try { await del(url); } catch { /* best-effort */ } }
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `lounge/certs/${employeeId}/${certType.slug}/${Date.now()}_${safeName}`;
  const blob = await put(path, file, {
    access: "private",
    allowOverwrite: false,
    contentType: inspected.mime,
  });

  const saved = await addEmployeeCert({
    employeeId,
    certTypeId,
    fileUrl: privateBlobReference(blob.pathname),
    fileMime: inspected.mime,
    fileName: file.name,
    issuedOn,
    expiresOn: expiresFlag ? expiresOn : undefined,
    uploadedBy: me.id,
  });

  return NextResponse.json({ cert: saved });
}
