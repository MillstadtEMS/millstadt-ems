import { NextRequest, NextResponse } from "next/server";
import { currentBoardUser } from "@/lib/board/auth";
import { buildOfficialMeetingMinutesPdf } from "@/lib/board/minutes-pdf";
import { canEditMinutes, getFireBoardAccessLevel, getMeeting, userBoards } from "@/lib/board/governance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await currentBoardUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const meetingId = Number(new URL(req.url).searchParams.get("meetingId"));
  if (!Number.isInteger(meetingId) || meetingId <= 0) {
    return NextResponse.json({ error: "Meeting is required." }, { status: 400 });
  }
  const meeting = await getMeeting(meetingId);
  if (!meeting || meeting.board !== "ems") {
    return NextResponse.json({ error: "EMS meeting not found." }, { status: 404 });
  }
  const fireAccessLevel = await getFireBoardAccessLevel();
  if (!canEditMinutes(user) && !userBoards(user, fireAccessLevel).includes(meeting.board)) {
    return NextResponse.json({ error: "Meeting access required." }, { status: 403 });
  }
  if (!meeting.minutesText || !meeting.minutesSignedBy || !meeting.minutesSignedAt || !meeting.minutesSignatureDataUrl) {
    return NextResponse.json({ error: "Minutes have not been finalized and signed." }, { status: 409 });
  }

  const pdf = await buildOfficialMeetingMinutesPdf({
    meeting,
    minutesText: meeting.minutesText,
    secretaryName: meeting.minutesSignedBy,
    secretaryTitle: meeting.minutesSignedTitle ?? "Secretary",
    signedAt: meeting.minutesSignedAt,
    signatureDataUrl: meeting.minutesSignatureDataUrl,
  });
  const filename = `Millstadt-EMS-Board-Minutes-${meeting.date}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
