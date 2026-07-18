/**
 * POST /api/board/meetings/question
 *   { meetingId, category, subject, body, visibility, relatedRef?, urgent?, urgentReason? }
 * A board member submits a question / concern / comment before a meeting.
 * Not anonymous. Confidential submissions are restricted and never appear in
 * the general board briefing. Urgent items must carry a reason.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentBoardUser } from "@/lib/board/auth";
import { audit } from "@/lib/board/db";
import {
  getMeeting, submitQuestion, isEligibleMember, isAfterDeadline,
  QUESTION_CATEGORIES, VISIBILITIES, type Visibility,
} from "@/lib/board/governance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await currentBoardUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const meetingId = Number(b.meetingId);
  const category = String(b.category ?? "");
  const subject = String(b.subject ?? "").trim().slice(0, 200);
  const bodyText = String(b.body ?? "").trim().slice(0, 5000);
  const visibility = String(b.visibility ?? "board") as Visibility;
  const relatedRef = b.relatedRef ? String(b.relatedRef).slice(0, 200) : null;
  const urgent = b.urgent === true;
  const urgentReason = urgent ? String(b.urgentReason ?? "").trim().slice(0, 500) : null;

  if (!meetingId) return NextResponse.json({ error: "Missing meeting." }, { status: 400 });
  if (!QUESTION_CATEGORIES.includes(category as (typeof QUESTION_CATEGORIES)[number])) {
    return NextResponse.json({ error: "Pick a category." }, { status: 400 });
  }
  if (!VISIBILITIES.includes(visibility)) return NextResponse.json({ error: "Pick a visibility." }, { status: 400 });
  if (!subject || !bodyText) return NextResponse.json({ error: "Add a subject and your question." }, { status: 400 });
  if (urgent && !urgentReason) return NextResponse.json({ error: "Urgent items need a short reason." }, { status: 400 });

  const meeting = await getMeeting(meetingId);
  if (!meeting) return NextResponse.json({ error: "Meeting not found." }, { status: 404 });
  if (!isEligibleMember(user, meeting.board) && user.role !== "admin" && user.role !== "submitter") {
    return NextResponse.json({ error: "You are not on this board." }, { status: 403 });
  }

  const afterDeadline = isAfterDeadline(meeting.date);
  const id = await submitQuestion({
    meetingId, userId: user.id, authorName: `${user.firstName} ${user.lastName}`,
    category, subject, body: bodyText, visibility, relatedRef, urgent, urgentReason, afterDeadline,
  });
  await audit({
    userId: user.id, username: user.username, role: user.role,
    action: "question_submitted",
    detail: `${meeting.board} ${meeting.date}: [${category}/${visibility}] ${subject}${urgent ? " (URGENT)" : ""}${afterDeadline ? " (after deadline)" : ""}`,
    ip: req.headers.get("x-forwarded-for"),
  });
  return NextResponse.json({ ok: true, id, afterDeadline });
}
