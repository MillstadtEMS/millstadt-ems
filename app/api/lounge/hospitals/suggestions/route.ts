import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import { createSuggestion } from "@/lib/lounge/hospital-suggestions";
import { notifyAdminsInLounge, emailAdmins } from "@/lib/lounge/notify-admins";

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
    try {
      await notifyAdminsInLounge({
        kind: "post",
        title: `Code change — ${codeKind}`,
        bodyPreview: `${codeKind}: ${newValue}${note ? ` — ${note}` : ""}`.slice(0, 180),
        linkUrl: "/admin/hospitals/suggestions",
        sourceId: created.id,
        actorId: me.id,
        exceptIds: [me.id],
      });
    } catch (err) {
      console.error("Hospital suggestion notification failed:", err);
    }
    try {
      await emailAdmins({
        kicker: "Hospital code change",
        headline: `${codeKind} update suggested`,
        meta: `Submitted by ${me.firstName} ${me.lastName}`,
        bodyText: `Suggested ${codeKind}: ${newValue}${note ? `\n\nNote: ${note}` : ""}`,
        link: { url: "https://millstadtems.org/admin/hospitals/suggestions", label: "Review in admin" },
        subject: `Hospital ${codeKind} update — pending review`,
      });
    } catch (err) {
      console.error("Hospital suggestion email failed:", err);
    }
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
  try {
    await notifyAdminsInLounge({
      kind: "post",
      title: `New facility suggested — ${payload.name}`,
      bodyPreview: `${payload.name} · ${payload.city}, ${payload.state}`.slice(0, 180),
      linkUrl: "/admin/hospitals/suggestions",
      sourceId: created.id,
      actorId: me.id,
      exceptIds: [me.id],
    });
  } catch (err) {
    console.error("Hospital suggestion notification failed:", err);
  }
  try {
    await emailAdmins({
      kicker: "New hospital",
      headline: `${payload.name} — ${payload.city}, ${payload.state}`,
      meta: `Submitted by ${me.firstName} ${me.lastName}`,
      bodyText:
        `Address: ${payload.address}\n` +
        `Primary line: ${payload.primaryLabel} — ${payload.primaryPhone}` +
        (payload.doorCode ? `\nDoor code: ${payload.doorCode}` : "") +
        (payload.emsRoomCode ? `\nEMS room code: ${payload.emsRoomCode}` : "") +
        (payload.note ? `\n\nNote: ${payload.note}` : ""),
      link: { url: "https://millstadtems.org/admin/hospitals/suggestions", label: "Review in admin" },
      subject: `New facility suggestion — ${payload.name}`,
    });
  } catch (err) {
    console.error("Hospital suggestion email failed:", err);
  }
  return NextResponse.json({ ok: true, suggestion: created });
}
