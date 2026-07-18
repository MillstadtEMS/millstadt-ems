/**
 * POST /api/board/meetings/confirm  { meetingId, userId, status, arrival?, departure? }
 * The secretary (or admin) confirms the OFFICIAL attendance record. Distinct
 * from a member's planned RSVP — only confirmed attendance counts toward stats.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentBoardUser } from "@/lib/board/auth";
import { audit } from "@/lib/board/db";
import { getMeeting, confirmAttendance, isSecretary, CONFIRMED_STATUSES } from "@/lib/board/governance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await currentBoardUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!isSecretary(user)) return NextResponse.json({ error: "Only the secretary can confirm attendance." }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const meetingId = Number(b.meetingId);
  const userId = String(b.userId ?? "");
  const status = String(b.status ?? "");
  const arrival = b.arrival ? String(b.arrival).slice(0, 20) : null;
  const departure = b.departure ? String(b.departure).slice(0, 20) : null;

  if (!meetingId || !userId) return NextResponse.json({ error: "Missing meeting or member." }, { status: 400 });
  if (!CONFIRMED_STATUSES.includes(status as (typeof CONFIRMED_STATUSES)[number])) {
    return NextResponse.json({ error: "Pick a valid status." }, { status: 400 });
  }
  const meeting = await getMeeting(meetingId);
  if (!meeting) return NextResponse.json({ error: "Meeting not found." }, { status: 404 });

  await confirmAttendance(meetingId, userId, status, `${user.firstName} ${user.lastName}`, arrival, departure);
  await audit({
    userId: user.id, username: user.username, role: user.role, action: "attendance_confirmed",
    detail: `${meeting.board} ${meeting.date}: member ${userId} → ${status}`,
    ip: req.headers.get("x-forwarded-for"),
  });
  return NextResponse.json({ ok: true });
}
