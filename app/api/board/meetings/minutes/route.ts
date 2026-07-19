import { NextRequest, NextResponse } from "next/server";
import { currentBoardUser } from "@/lib/board/auth";
import { audit } from "@/lib/board/db";
import { canEditMinutes, getMeeting, updateMeetingMinutes } from "@/lib/board/governance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await currentBoardUser();
  if (!user || !canEditMinutes(user)) {
    return NextResponse.json({ error: "Meeting-minutes permission required." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const meetingId = Number(body.meetingId);
  const minutesText = body.minutesText == null ? null : String(body.minutesText).trim() || null;
  const minutesPublic = body.minutesPublic === true;
  if (!Number.isInteger(meetingId) || meetingId <= 0) {
    return NextResponse.json({ error: "Meeting is required." }, { status: 400 });
  }
  const meeting = await getMeeting(meetingId);
  if (!meeting || meeting.board !== "ems") {
    return NextResponse.json({ error: "EMS meeting not found." }, { status: 404 });
  }
  if (minutesPublic && !minutesText) {
    return NextResponse.json({ error: "Add minutes before sharing them publicly." }, { status: 400 });
  }

  await updateMeetingMinutes({
    meetingId,
    minutesText,
    minutesPublic,
    updatedBy: `${user.firstName} ${user.lastName}`,
  });
  await audit({
    userId: user.id,
    username: user.username,
    role: user.role,
    action: "meeting_minutes_updated",
    detail: `meeting ${meetingId}; public=${minutesPublic}`,
    ip: req.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ ok: true });
}
