import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  audit,
  listEmployeeVisibleRecords,
  listAttachmentsForRecord,
} from "@/lib/lounge/personnel";

export const dynamic = "force-dynamic";

function meta(req: NextRequest) {
  return {
    ip: req.headers.get("x-forwarded-for") ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
  };
}

// Returns the subset of personnel records that the admin explicitly marked
// employee_visible. Employees see ONLY their own.
export async function GET(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const records = await listEmployeeVisibleRecords(me.id);

  // Augment with attachments where visibility_level allows employee view.
  const out = [] as (typeof records[0] & { attachments: { id: string; fileName: string; fileUrl: string; fileMime: string | null; employeeNotes: string | null }[] })[];
  for (const r of records) {
    const atts = (await listAttachmentsForRecord(r.id))
      .filter((a) => a.visibilityLevel === "employee")
      .map((a) => ({
        id: a.id,
        fileName: a.fileName,
        fileUrl: a.fileUrl,
        fileMime: a.fileMime,
        employeeNotes: a.employeeNotes,
      }));
    out.push({ ...r, attachments: atts });
  }

  await audit({
    employeeId: me.id,
    actorId: me.id,
    action: "view",
    detail: { route: "my_file", count: records.length },
    ...meta(req),
  });

  return NextResponse.json({ records: out });
}
