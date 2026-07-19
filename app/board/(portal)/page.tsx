import Link from "next/link";
import { currentBoardUser } from "@/lib/board/auth";
import NextMeetingCard from "@/components/board/NextMeetingCard";
import { BoardActionLink, BoardCard, BoardEmptyState, BoardPageHeader, BoardSectionHeader, BoardStatusChip } from "@/components/board/BoardPrimitives";
import {
  canReviewFireMeetingRequests,
  canSubmitFireMeetingRequest,
  canViewFinancialModel,
  canRecordAttendance,
  canSeeQuestion,
  getAttendance,
  getFireMeetingRequests,
  getNextMeeting,
  getQuestions,
  userBoards,
} from "@/lib/board/governance";

export const dynamic = "force-dynamic";

export default async function BoardHome() {
  const user = await currentBoardUser();
  if (!user) return null;

  const boards = userBoards(user);
  const showMeetings = boards.length > 0;
  const showRequests = canSubmitFireMeetingRequest(user) || canReviewFireMeetingRequests(user);
  const showReferendum = canViewFinancialModel(user);
  const showAdmin = user.role === "admin";
  const nextMeeting = showMeetings ? await getNextMeeting(user) : null;

  let attendanceNeeded = 0;
  let questionsAwaiting = 0;
  if (nextMeeting) {
    const [attendance, questions] = await Promise.all([
      getAttendance(nextMeeting.id, nextMeeting.board),
      getQuestions(nextMeeting.id),
    ]);
    const mine = attendance.find((row) => row.userId === user.id)?.response ?? (canRecordAttendance(user, nextMeeting.board) ? "No Response" : null);
    attendanceNeeded = mine === "No Response" ? 1 : 0;
    questionsAwaiting = questions.filter((question) => canSeeQuestion(user, question) && !question.responseBody).length;
  }

  const fireRequests = showRequests && canReviewFireMeetingRequests(user)
    ? (await getFireMeetingRequests(user)).filter((request) => request.status === "Requested").length
    : 0;
  const actionCount = attendanceNeeded + questionsAwaiting + fireRequests;

  return (
    <div className="board-dashboard">
      <BoardPageHeader eyebrow="Governance" title={`Welcome, ${user.firstName}`} />

      {showMeetings ? (
        <div className="board-command-center">
          <NextMeetingCard user={user} />
          <BoardCard className="board-action-queue">
            <BoardSectionHeader title="Action queue" />
            {actionCount === 0 && <BoardEmptyState title="No pending actions." />}
            {attendanceNeeded > 0 && nextMeeting && (
              <BoardActionLink
                href={`/board/meetings/${nextMeeting.id}#attendance`}
                label="Attendance response"
                meta="Next meeting"
                count={attendanceNeeded}
                tone="warn"
              />
            )}
            {questionsAwaiting > 0 && nextMeeting && (
              <BoardActionLink
                href={`/board/meetings/${nextMeeting.id}#briefing`}
                label="Questions awaiting response"
                meta="Visible pre-meeting questions"
                count={questionsAwaiting}
                tone="info"
              />
            )}
            {fireRequests > 0 && (
              <BoardActionLink
                href="/board/requests"
                label="Fire Board requests"
                meta="Attendance requests pending review"
                count={fireRequests}
                tone="warn"
              />
            )}
          </BoardCard>
        </div>
      ) : (
        <Link href="/board/requests" className="board-card board-link-card board-referendum-panel">
          <BoardStatusChip tone="accent">Fire Board</BoardStatusChip>
          <h2 className="board-h2">Request EMS Board attendance</h2>
          <p className="board-sub">Submit a meeting request with the date, attendees, and reason.</p>
        </Link>
      )}

      <div className="board-dashboard-row">
        {showReferendum && (
          <BoardCard className="board-referendum-panel">
            <BoardStatusChip tone="accent">Referendum</BoardStatusChip>
            <h2 className="board-h2">Proposed EMS District Financial Model</h2>
            <p className="board-sub">Financial model and levy scenarios.</p>
            <Link href="/board/referendum" className="board-btn-primary">Open referendum model</Link>
          </BoardCard>
        )}

        <BoardCard>
          <BoardSectionHeader title="Recent activity" />
          <div className="board-action-queue">
            {nextMeeting && (
              <BoardActionLink
                href={`/board/meetings/${nextMeeting.id}`}
                label="Next meeting packet workspace"
                meta="Attendance, quorum, minutes, and questions"
              />
            )}
            {showRequests && (
              <BoardActionLink
                href="/board/requests"
                label={user.role === "fire_board" ? "Submit Fire Board request" : "Review Fire Board requests"}
                meta={user.role === "fire_board" ? "Request EMS Board attendance" : "Pending and historical requests"}
              />
            )}
            {showAdmin && (
              <BoardActionLink href="/board/admin/appearance" label="Appearance and dashboard layout" meta="Presentation controls" />
            )}
          </div>
        </BoardCard>
      </div>
    </div>
  );
}
