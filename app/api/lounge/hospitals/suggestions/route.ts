import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { createSuggestion } from "@/lib/lounge/hospital-suggestions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const kind = body.kind === "new_facility" ? "new_facility" : body.kind === "code_change" ? "code_change" : null;
  if (!kind) return NextResponse.json({ error: "kind must be code_change or new_facility" }, { status: 400 });

  if (kind === "code_change") {
    const hospitalId = typeof body.hospitalId === "string" ? body.hospitalId : "";
    if (!hospitalId) return NextResponse.json({ error: "hospitalId required for code change" }, { status: 400 });
    const codeKind = typeof body.codeKind === "string" ? body.codeKind : "";
    const newValue = typeof body.newValue === "string" ? body.newValue.trim() : "";
    if (!codeKind || !newValue) {
      return NextResponse.json({ error: "codeKind and newValue required" }, { status: 400 });
    }
    const note = typeof body.note === "string" ? body.note.trim() : "";
    const created = await createSuggestion({
      submittedBy: me.id,
      hospitalId,
      kind: "code_change",
      payload: { codeKind, newValue, note: note || null },
    });
    return NextResponse.json({ ok: true, suggestion: created });
  }

  // new_facility
  const required = ["name", "city", "state", "primaryPhone", "address"];
  for (const f of required) {
    if (!body[f] || typeof body[f] !== "string") {
      return NextResponse.json({ error: `${f} required` }, { status: 400 });
    }
  }
  const payload: Record<string, unknown> = {
    name: String(body.name).trim(),
    city: String(body.city).trim(),
    state: String(body.state).trim(),
    primaryLabel: ["EMS Patch", "ED", "Report Line"].includes(body.primaryLabel) ? body.primaryLabel : "EMS Patch",
    primaryPhone: String(body.primaryPhone).trim(),
    address: String(body.address).trim(),
    doorCode: typeof body.doorCode === "string" ? body.doorCode.trim() || null : null,
    emsRoomCode: typeof body.emsRoomCode === "string" ? body.emsRoomCode.trim() || null : null,
    note: typeof body.note === "string" ? body.note.trim() || null : null,
  };
  const created = await createSuggestion({
    submittedBy: me.id,
    hospitalId: null,
    kind: "new_facility",
    payload,
  });
  return NextResponse.json({ ok: true, suggestion: created });
}
