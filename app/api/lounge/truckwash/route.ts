import { NextRequest, NextResponse } from "next/server";
import { currentEmployee } from "@/lib/lounge/auth";
import {
  createTruckWashLog,
  listTruckWashLogs,
  TRUCK_WASH_UNITS,
  TRUCK_WASH_EXEMPT_REASONS,
} from "@/lib/lounge/truckwash";
import { notifyAdminsInLounge, emailAdmins } from "@/lib/lounge/notify-admins";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Both crew + admin can see the log; admins use this on the dashboard,
  // crew use it as a "did this already happen this week" reference.
  const unit = req.nextUrl.searchParams.get("unit") || undefined;
  const logs = await listTruckWashLogs({ unit });
  return NextResponse.json({ logs });
}

export async function POST(req: NextRequest) {
  const me = await currentEmployee();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const unit = typeof body.unit === "string" ? body.unit.trim() : "";
  if (!TRUCK_WASH_UNITS.includes(unit)) {
    return NextResponse.json({ error: "Pick a truck." }, { status: 400 });
  }

  const washedAtRaw = typeof body.washedAt === "string" ? body.washedAt : "";
  const washedAt = washedAtRaw ? new Date(washedAtRaw).toISOString() : new Date().toISOString();

  const exempt = !!body.exempt;
  const exemptReason = exempt
    ? (typeof body.exemptReason === "string" && TRUCK_WASH_EXEMPT_REASONS.includes(body.exemptReason)
        ? body.exemptReason
        : null)
    : null;
  if (exempt && !exemptReason) {
    return NextResponse.json({ error: "Pick a reason for the exemption." }, { status: 400 });
  }

  const truckExteriorWashed = exempt ? false : !!body.truckExteriorWashed;
  const interiorFloorsMopped = exempt ? false : !!body.interiorFloorsMopped;
  if (!exempt && (!truckExteriorWashed || !interiorFloorsMopped)) {
    return NextResponse.json({
      error: "Confirm both the exterior wash and interior mop, or mark this as exempt.",
    }, { status: 400 });
  }

  const signatureDataUrl = typeof body.signatureDataUrl === "string" ? body.signatureDataUrl : "";
  if (!signatureDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Signature required to submit." }, { status: 400 });
  }

  // Crew list: always include the submitter. UI is supposed to pre-fill
  // them, but we enforce it on the server too so they can't be omitted.
  interface IncomingCrew { id?: unknown; firstName?: unknown; lastName?: unknown }
  const incoming: IncomingCrew[] = Array.isArray(body.crew) ? body.crew : [];
  const crew: { id: string | null; firstName: string; lastName: string }[] = [];
  for (const c of incoming) {
    const firstName = typeof c.firstName === "string" ? c.firstName.trim() : "";
    const lastName = typeof c.lastName === "string" ? c.lastName.trim() : "";
    if (!firstName && !lastName) continue;
    crew.push({
      id: typeof c.id === "string" ? c.id : null,
      firstName: firstName || "—",
      lastName: lastName || "—",
    });
  }
  if (!crew.some((c) => c.id === me.id)) {
    crew.unshift({ id: me.id, firstName: me.firstName, lastName: me.lastName });
  }

  const log = await createTruckWashLog({
    submittedBy: me.id,
    unit,
    washedAt,
    exempt,
    exemptReason,
    truckExteriorWashed,
    interiorFloorsMopped,
    signatureDataUrl,
    crew,
    notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
  });

  // Best-effort admin fan-out (lounge bell + millstadtems@gmail.com inbox).
  const verb = exempt ? "Exempt" : "Washed";
  const crewLine = crew.map((c) => `${c.firstName} ${c.lastName}`).join(", ");
  const notesLine = typeof body.notes === "string" ? body.notes.trim() : "";
  const summaryText =
    `${verb} ${unit} on ${new Date(washedAt).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.` +
    (exempt && exemptReason ? `\nExempt reason: ${exemptReason}.` : "") +
    `\nCrew: ${crewLine}.` +
    (notesLine ? `\nNotes: ${notesLine}` : "");
  try {
    await notifyAdminsInLounge({
      kind: "post",
      title: `${verb} — ${unit}`,
      bodyPreview: (notesLine || crewLine).slice(0, 180),
      linkUrl: "/admin/truckwash",
      sourceId: log.id,
      actorId: me.id,
      exceptIds: [me.id],
    });
  } catch (err) {
    console.error("Truck wash admin notification failed:", err);
  }
  try {
    await emailAdmins({
      kicker: "Truck wash",
      headline: `${verb} — ${unit}`,
      meta: `Submitted by ${me.firstName} ${me.lastName}`,
      bodyText: summaryText,
      link: { url: "https://millstadtems.org/admin/truckwash", label: "Open admin log" },
      subject: `Truck wash ${exempt ? "(exempt)" : "logged"} — ${unit}`,
    });
  } catch (err) {
    console.error("Truck wash admin email failed:", err);
  }

  return NextResponse.json({ ok: true, log });
}
