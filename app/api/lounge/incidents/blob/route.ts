import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { getIncident } from "@/lib/lounge/incidents";
import { privateBlobPath } from "@/lib/lounge/private-blobs";
import { recordSecurityAudit } from "@/lib/security/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const employee = await currentEmployee();
  if (!employee) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reference = req.nextUrl.searchParams.get("ref") ?? "";
  const pathname = privateBlobPath(reference);
  if (!pathname || !pathname.startsWith("lounge/incidents/")) {
    await recordSecurityAudit({
      actorType: "employee",
      actorId: employee.id,
      action: "incident_blob_read",
      resourceType: "incident_blob",
      outcome: "denied",
      req,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let allowed = employee.isAdmin || pathname.startsWith(`lounge/incidents/${employee.id}/`);
  const reportMatch = pathname.match(/^lounge\/incidents\/reports\/([^/]+)\.pdf$/);
  if (!allowed && reportMatch) {
    const report = await getIncident(reportMatch[1]);
    allowed = report?.createdBy.id === employee.id;
  }
  if (!allowed) {
    await recordSecurityAudit({
      actorType: "employee",
      actorId: employee.id,
      action: "incident_blob_read",
      resourceType: "incident_blob",
      resourceId: reportMatch?.[1] ?? null,
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
    action: "incident_blob_read",
    resourceType: "incident_blob",
    resourceId: reportMatch?.[1] ?? null,
    outcome: "allowed",
    req,
  });

  const filename = pathname.split("/").at(-1)?.replace(/[^a-zA-Z0-9._-]/g, "_") || "incident-file";
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
