import { NextRequest, NextResponse } from "next/server";
import { currentBoardUser } from "@/lib/board/auth";
import { audit } from "@/lib/board/db";
import {
  canSubmitFireMeetingRequest,
  createFireMeetingRequest,
  getActiveEmsBoardRecipients,
} from "@/lib/board/governance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await currentBoardUser();
  if (!user || !canSubmitFireMeetingRequest(user)) {
    return NextResponse.json({ error: "Fire Board request permission required." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const meetingTitle = String(body.meetingTitle ?? "").trim();
  const date = body.date == null ? null : String(body.date).trim() || null;
  const startTime = body.startTime == null ? null : String(body.startTime).trim() || null;
  const location = body.location == null ? null : String(body.location).trim() || null;
  const requestedScope = String(body.requestedScope ?? "president").trim();
  const requestedUserIds: string[] = Array.isArray(body.requestedUserIds) ? body.requestedUserIds.map((id: unknown) => String(id)) : [];
  const reason = String(body.reason ?? "").trim();

  if (!meetingTitle) return NextResponse.json({ error: "Meeting or agenda item is required." }, { status: 400 });
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Date must use yyyy-mm-dd." }, { status: 400 });
  if (!["president", "all", "specific"].includes(requestedScope)) return NextResponse.json({ error: "Choose who is being requested." }, { status: 400 });
  if (!reason) return NextResponse.json({ error: "Reason for request is required." }, { status: 400 });

  const recipients = await getActiveEmsBoardRecipients();
  const allowed = new Set(recipients.map((r) => r.id));
  if (requestedScope === "specific") {
    if (requestedUserIds.length === 0) return NextResponse.json({ error: "Choose at least one EMS board member." }, { status: 400 });
    if (requestedUserIds.some((id) => !allowed.has(id))) return NextResponse.json({ error: "Invalid requested board member." }, { status: 400 });
  }

  const id = await createFireMeetingRequest({ requester: user, meetingTitle, date, startTime, location, requestedScope, requestedUserIds, reason });
  await audit({
    userId: user.id,
    username: user.username,
    role: user.role,
    action: "fire_meeting_request_created",
    detail: `${meetingTitle} · ${requestedScope}`,
    ip: req.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ ok: true, id });
}
