/**
 * POST /api/board/meetings/attendance  { meetingId, response, note? }
 * A board member records their PLANNED attendance (RSVP). This is not the
 * official record — the secretary confirms actual attendance separately.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentBoardUser } from "@/lib/board/auth";
import { audit } from "@/lib/board/db";
import { getMeeting, setAttendance, isEligibleMember, RESPONSES, type Response } from "@/lib/board/governance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await currentBoardUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const meetingId = Number(body.meetingId);
  const response = String(body.response ?? "") as Response;
  const note = body.note ? String(body.note).slice(0, 500) : null;

  if (!meetingId || !RESPONSES.includes(response)) {
    return NextResponse.json({ error: "Pick a valid response." }, { status: 400 });
  }
  const meeting = await getMeeting(meetingId);
  if (!meeting) return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
  if (!isEligibleMember(user, meeting.board)) {
    return NextResponse.json({ error: "You are not on this board." }, { status: 403 });
  }

  await setAttendance(meetingId, user.id, response, note);
  await audit({
    userId: user.id, username: user.username, role: user.role,
    action: "attendance_response",
    detail: `${meeting.board} ${meeting.date}: ${response}${note ? ` — ${note}` : ""}`,
    ip: req.headers.get("x-forwarded-for"),
  });
  return NextResponse.json({ ok: true, response });
}
