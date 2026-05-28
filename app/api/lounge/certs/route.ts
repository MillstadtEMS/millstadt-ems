/**
 * GET  /api/lounge/certs                  — current user's certs + status
 * POST /api/lounge/certs                  — upload a cert (multipart)
 *   form fields:
 *     file        : File (required)
 *     certTypeId  : string (required)
 *     issuedOn    : YYYY-MM-DD (optional)
 *     expiresOn   : YYYY-MM-DD (required when the cert type requires expiration)
 *
 * Replaces any prior upload of the same cert type by the same employee
 * (no history kept — admins see the latest in the personnel file).
 */
import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  addEmployeeCert,
  certStatusForEmployee,
  deleteEmployeeCert,
  getCertType,
  listEmployeeCerts,
} from "@/lib/lounge/certs";

export const runtime = "nodejs";

export async function GET() {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [status, certs] = await Promise.all([
    certStatusForEmployee(me.id),
    listEmployeeCerts(me.id),
  ]);
  return NextResponse.json({ status, certs });
}

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const certTypeId = (form.get("certTypeId") as string | null)?.trim();
  const issuedOn = (form.get("issuedOn") as string | null) || undefined;
  const expiresOn = (form.get("expiresOn") as string | null) || undefined;

  if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
  if (!certTypeId) return NextResponse.json({ error: "certTypeId required" }, { status: 400 });
  if (file.size > 15 * 1024 * 1024)
    return NextResponse.json({ error: "File too large (max 15 MB)" }, { status: 400 });

  const certType = await getCertType(certTypeId);
  if (!certType) return NextResponse.json({ error: "Unknown cert type" }, { status: 400 });
  if (certType.requiresExpiration && !expiresOn) {
    return NextResponse.json(
      { error: `${certType.name} requires an expiration date` },
      { status: 400 },
    );
  }

  // Replace any existing upload of the same cert type for this employee.
  // Newest wins; the old blob is best-effort deleted.
  const existing = (await listEmployeeCerts(me.id)).filter(
    (c) => c.certTypeId === certTypeId,
  );
  for (const old of existing) {
    const url = await deleteEmployeeCert(old.id);
    if (url) {
      try {
        await del(url);
      } catch {
        // best-effort
      }
    }
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `lounge/certs/${me.id}/${certType.slug}/${Date.now()}_${safeName}`;
  const blob = await put(path, file, {
    access: "public",
    allowOverwrite: false,
    contentType: file.type || "application/octet-stream",
  });

  const saved = await addEmployeeCert({
    employeeId: me.id,
    certTypeId,
    fileUrl: blob.url,
    fileMime: file.type || undefined,
    fileName: file.name,
    issuedOn,
    expiresOn,
    uploadedBy: me.id,
  });
  return NextResponse.json({ cert: saved });
}
