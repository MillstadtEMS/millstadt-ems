import { NextRequest, NextResponse } from "next/server";
import { currentBoardUser } from "@/lib/board/auth";
import { audit } from "@/lib/board/db";
import { buildDraftMinutesFromTranscript } from "@/lib/board/minutes-draft";
import { canEditMinutes, getMeeting, updateMeetingMinutesDraft } from "@/lib/board/governance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await currentBoardUser();
  if (!user || !canEditMinutes(user)) {
    return NextResponse.json({ error: "Meeting-minutes permission required." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const meetingId = Number(body.meetingId);
  const rawTranscript = String(body.rawTranscript ?? "").trim();
  if (!Number.isInteger(meetingId) || meetingId <= 0) {
    return NextResponse.json({ error: "Meeting is required." }, { status: 400 });
  }
  if (rawTranscript.length < 20) {
    return NextResponse.json({ error: "Transcript is too short to draft minutes." }, { status: 400 });
  }

  const meeting = await getMeeting(meetingId);
  if (!meeting || meeting.board !== "ems") {
    return NextResponse.json({ error: "EMS meeting not found." }, { status: 404 });
  }

  const preparedBy = `${user.firstName} ${user.lastName}`;
  const draftText = buildDraftMinutesFromTranscript({ meeting, transcript: rawTranscript, preparedBy });
  await updateMeetingMinutesDraft({ meetingId, rawTranscript, draftText, updatedBy: preparedBy });
  await audit({
    userId: user.id,
    username: user.username,
    role: user.role,
    action: "meeting_minutes_draft_created",
    detail: `meeting ${meetingId}; transcriptChars=${rawTranscript.length}`,
    ip: req.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ ok: true, draftText });
}
