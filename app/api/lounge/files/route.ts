import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { sql } from "@/lib/lounge/db";
import { privateBlobPath } from "@/lib/lounge/private-blobs";
import { recordSecurityAudit } from "@/lib/security/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVATE_NAMESPACES = [
  "lounge/certs/",
  "lounge/employees/",
  "lounge/forms/",
  "lounge/writeups/",
  "lounge/onboarding/",
  "lounge/ack-memorandums/",
  "lounge/profile-change-requests/",
  "personnel/",
];

async function employeeCanRead(reference: string, pathname: string, employeeId: string) {
  if (pathname.startsWith(`lounge/certs/${employeeId}/`)) return true;
  if (pathname.startsWith(`lounge/profile-change-requests/${employeeId}/`)) return true;

  const db = sql();
  const personnel = (await db`
    SELECT 1
    FROM lounge_personnel_attachments a
    JOIN lounge_personnel_records r ON r.id = a.record_id
    WHERE a.file_url = ${reference}
      AND a.employee_id = ${employeeId}
      AND a.visibility_level = 'employee'
      AND r.employee_visible = TRUE
      AND r.status <> 'archived'
    LIMIT 1
  `) as unknown as { "?column?": number }[];
  if (personnel.length) return true;

  const forms = (await db`
    SELECT 1 FROM lounge_forms
    WHERE pdf_url = ${reference}
      AND employee_id = ${employeeId}
      AND visible_to_employee = TRUE
      AND status = 'finalized'
    LIMIT 1
  `) as unknown as { "?column?": number }[];
  if (forms.length) return true;

  const writeups = (await db`
    SELECT 1 FROM lounge_writeups
    WHERE pdf_url = ${reference}
      AND employee_id = ${employeeId}
      AND save_to_file = TRUE
      AND status = 'finalized'
    LIMIT 1
  `) as unknown as { "?column?": number }[];
  return writeups.length > 0;
}

export async function GET(req: NextRequest) {
  const employee = await currentEmployee();
  if (!employee) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reference = req.nextUrl.searchParams.get("ref") ?? "";
  const pathname = privateBlobPath(reference);
  const namespaceAllowed = Boolean(
    pathname && PRIVATE_NAMESPACES.some((prefix) => pathname.startsWith(prefix)),
  );

  let allowed = Boolean(employee.isAdmin && namespaceAllowed);
  if (!allowed && pathname && namespaceAllowed) {
    try {
      allowed = await employeeCanRead(reference, pathname, employee.id);
    } catch {
      allowed = false;
    }
  }

  if (!pathname || !allowed) {
    await recordSecurityAudit({
      actorType: "employee",
      actorId: employee.id,
      action: "private_lounge_blob_read",
      resourceType: "lounge_blob",
      outcome: "denied",
      req,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await get(pathname, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await recordSecurityAudit({
    actorType: "employee",
    actorId: employee.id,
    action: "private_lounge_blob_read",
    resourceType: "lounge_blob",
    outcome: "allowed",
    req,
  });

  const filename = pathname.split("/").at(-1)?.replace(/[^a-zA-Z0-9._-]/g, "_") || "document";
  return new Response(result.stream, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, private",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Type": result.blob.contentType || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
