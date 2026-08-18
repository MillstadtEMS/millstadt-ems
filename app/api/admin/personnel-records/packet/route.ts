import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { getEmployee } from "@/lib/lounge/employees";
import {
  audit,
  listAttachmentsForRecord,
  listRecordsForEmployee,
  type PersonnelAttachment,
} from "@/lib/lounge/personnel";
import { buildPersonnelPacketPdf } from "@/lib/lounge/personnel-pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function meta(req: NextRequest) {
  return {
    ip: req.headers.get("x-forwarded-for") ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
  };
}

export async function GET(req: NextRequest) {
  const me = await currentEmployee();
  if (!me || !me.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employeeId");
  if (!employeeId) return NextResponse.json({ error: "employeeId required" }, { status: 400 });

  const employee = await getEmployee(employeeId);
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const records = await listRecordsForEmployee(employeeId);
  const attachmentsByRecord: Record<string, PersonnelAttachment[]> = {};
  for (const r of records) {
    attachmentsByRecord[r.id] = await listAttachmentsForRecord(r.id);
  }

  const pdf = await buildPersonnelPacketPdf({
    employee: {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      certification: employee.certification,
      position: employee.position,
      hireDate: employee.hireDate,
      photoUrl: employee.photoUrl,
    },
    records,
    attachmentsByRecord,
    generatedBy: `${me.firstName} ${me.lastName}`,
  });

  await audit({
    employeeId,
    actorId: me.id,
    action: "download",
    detail: { route: "packet", recordCount: records.length },
    ...meta(req),
  });

  const filename = `personnel-packet-${employee.lastName}-${employee.firstName}-${new Date().toISOString().slice(0, 10)}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
