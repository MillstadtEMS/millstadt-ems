import { NextRequest, NextResponse } from "next/server";
import { currentBoardUser } from "@/lib/board/auth";
import { audit } from "@/lib/board/db";
import { hasDisallowedMinutesLanguage, hasUnresolvedMinutesPlaceholders, prepareOfficialMinutesText } from "@/lib/board/minutes-draft";
import { finalizeMeetingMinutes, getMeeting, isSecretary } from "@/lib/board/governance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await currentBoardUser();
  if (!user || !isSecretary(user)) {
    return NextResponse.json({ error: "Secretary signature is required to finalize minutes." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const meetingId = Number(body.meetingId);
  const minutesText = prepareOfficialMinutesText(String(body.minutesText ?? ""));
  const minutesPublic = body.minutesPublic === true;
  const signatureDataUrl = String(body.signatureDataUrl ?? "");
  if (!Number.isInteger(meetingId) || meetingId <= 0) {
    return NextResponse.json({ error: "Meeting is required." }, { status: 400 });
  }
  if (minutesText.length < 40) {
    return NextResponse.json({ error: "Minutes are required before finalizing." }, { status: 400 });
  }
  if (!signatureDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Secretary signature is required to finalize minutes." }, { status: 400 });
  }
  if (hasDisallowedMinutesLanguage(minutesText)) {
    return NextResponse.json({ error: "Final minutes still contain language or banter that cannot be included in official minutes." }, { status: 400 });
  }
  if (hasUnresolvedMinutesPlaceholders(minutesText)) {
    return NextResponse.json({ error: "Final minutes still contain draft placeholders. Secretary review is required before signing." }, { status: 400 });
  }

  const meeting = await getMeeting(meetingId);
  if (!meeting || meeting.board !== "ems") {
    return NextResponse.json({ error: "EMS meeting not found." }, { status: 404 });
  }

  const signedBy = `${user.firstName} ${user.lastName}`;
  const signedTitle = user.officerTitle ?? "Secretary";
  await finalizeMeetingMinutes({
    meetingId,
    minutesText,
    minutesPublic,
    signedBy,
    signedTitle,
    signatureDataUrl,
    signatureIp: req.headers.get("x-forwarded-for"),
    signatureUserAgent: req.headers.get("user-agent"),
  });
  await audit({
    userId: user.id,
    username: user.username,
    role: user.role,
    action: "meeting_minutes_finalized",
    detail: `meeting ${meetingId}; public=${minutesPublic}`,
    ip: req.headers.get("x-forwarded-for"),
  });

  return NextResponse.json({ ok: true });
}
