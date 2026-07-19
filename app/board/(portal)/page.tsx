import Link from "next/link";
import { currentBoardUser } from "@/lib/board/auth";
import {
  canSeeQuestion,
  computeQuorum,
  getAttendance,
  getNextMeeting,
  getQuestions,
  getQuorumRequired,
  isEligibleMember,
  userBoards,
} from "@/lib/board/governance";

export const dynamic = "force-dynamic";

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Metric({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = (
    <>
      <div className="lbl">{label}</div>
      <div className="val">{value}</div>
    </>
  );
  if (!href) return <div className="board-card board-stat">{content}</div>;
  return (
    <Link href={href} className="board-card board-stat board-link-card">
      {content}
    </Link>
  );
}

export default async function BoardHome() {
  const user = await currentBoardUser();
  if (!user) return null;

  const meeting = await getNextMeeting(user);
  const meetingHref = meeting ? `/board/meetings/${meeting.id}` : "/board/meetings";
  const attendance = meeting ? await getAttendance(meeting.id, meeting.board) : [];
  const { required, isDefault } = meeting ? await getQuorumRequired(meeting.board, attendance.length) : { required: 0, isDefault: false };
  const quorum = meeting ? computeQuorum(attendance, required, isDefault) : null;
  const questions = meeting ? await getQuestions(meeting.id) : [];
  const visibleQuestions = questions.filter((question) => canSeeQuestion(user, question));
  const mine = meeting
    ? attendance.find((row) => row.userId === user.id)?.response ?? (isEligibleMember(user, meeting.board) ? "No Response" : "Not Eligible")
    : "No Meeting";
  const boards = userBoards(user);

  return (
    <>
      <p className="board-eyebrow">Governance</p>
      <h1 className="board-h1">Welcome, {user.firstName}</h1>

      <div className="board-grid k3 board-dashboard-grid" style={{ marginTop: 24 }}>
        <Metric label="Next Meeting" value={meeting ? `${fmtDate(meeting.date)} · ${meeting.startTime ?? "7:00 PM"}` : "Not Scheduled"} href={boards.length ? meetingHref : undefined} />
        <Metric label="Attendance Response" value={mine} href={meeting ? meetingHref : undefined} />
        <Metric label="Expected Quorum" value={quorum?.status ?? "Not Scheduled"} href={meeting ? meetingHref : undefined} />
        <Metric label="Board Briefing" value="Future Feature" />
        <Metric label="Questions Before the Meeting" value={String(visibleQuestions.length)} href={meeting ? meetingHref : undefined} />
        <Metric label="Items Requiring a Vote" value="Future Feature" />
        <Metric label="Proposals Requiring Review" value="Future Feature" />
        <Metric label="Minutes Requiring Approval" value="Future Feature" />
        <Metric label="Open Tasks" value="Future Feature" />
        <Metric label="Recent Documents" value="Future Feature" />
        <Metric label="Notifications" value="Future Feature" />
        <Link href="/board/referendum" className="board-card board-referendum-card">
          <div>
            <div className="lbl">Proposed EMS District Financial Model</div>
            <div className="val">Open Referendum Model</div>
          </div>
        </Link>
      </div>
    </>
  );
}
