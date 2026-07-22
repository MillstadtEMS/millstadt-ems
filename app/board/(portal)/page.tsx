import Link from "next/link";
import { currentBoardUser } from "@/lib/board/auth";
import BoardEmojiAvatar from "@/components/board/BoardEmojiAvatar";
import NextMeetingCard from "@/components/board/NextMeetingCard";
import { BoardActionLink, BoardCard, BoardEmptyState, BoardPageHeader, BoardSectionHeader, BoardStatusChip } from "@/components/board/BoardPrimitives";
import {
  canManageFireBoardAccess,
  canReviewFireMeetingRequests,
  canSubmitFireMeetingRequest,
  canViewBudgetWorkbook,
  canRecordAttendance,
  canSeeQuestion,
  getAttendance,
  getFireBoardAccessStatus,
  getFireMeetingRequests,
  getNextMeeting,
  getQuestions,
  userBoards,
} from "@/lib/board/governance";
import { boardUserEmoji } from "@/lib/board/personalization";

export const dynamic = "force-dynamic";

export default async function BoardHome() {
  const user = await currentBoardUser();
  if (!user) return null;

  const fireAccess = await getFireBoardAccessStatus();
  const fireAccessLevel = fireAccess.level;
  const boards = userBoards(user, fireAccessLevel);
  const showMeetings = boards.length > 0;
  const showRequests = canSubmitFireMeetingRequest(user) || canReviewFireMeetingRequests(user);
  const showReferendum = canViewBudgetWorkbook(user, fireAccessLevel, fireAccess.budgetSections);
  const budgetHref = "/board/referendum";
  const showAdmin = user.role === "admin";
  const showFireAccess = canManageFireBoardAccess(user);
  const personalEmoji = boardUserEmoji(user);
  const personalTitle = user.officerTitle?.trim() || null;
  const nextMeeting = showMeetings ? await getNextMeeting(user, fireAccessLevel) : null;

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
      <BoardPageHeader
        eyebrow="Governance"
        title={`Welcome, ${user.firstName}`}
        actions={(
          <div className="board-welcome-identity">
            <BoardEmojiAvatar emoji={personalEmoji} photoUrl={user.photoUrl} role={user.role} size="lg" />
            <div>
              <strong>Welcome, {user.firstName}</strong>
              {personalTitle && <small>{personalTitle}</small>}
            </div>
          </div>
        )}
      />

      {showMeetings ? (
        <div className="board-command-center">
          <NextMeetingCard user={user} fireAccessLevel={fireAccessLevel} />
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
      ) : showRequests ? (
        <Link href="/board/requests" className="board-card board-link-card board-referendum-panel">
          <BoardStatusChip tone="accent">Fire Board</BoardStatusChip>
          <h2 className="board-h2">Request EMS Board attendance</h2>
          <p className="board-sub">Submit a meeting request with the date, attendees, and reason.</p>
        </Link>
      ) : null}

      <div className="board-dashboard-row">
        {showReferendum && (
          <BoardCard className="board-referendum-panel">
            <BoardStatusChip tone="accent">Budget</BoardStatusChip>
            <h2 className="board-h2">Referendum Budget Workbook</h2>
            <p className="board-sub">Shared read-only worksheet for board review.</p>
            <Link href={budgetHref} className="board-btn-primary">Open budget</Link>
          </BoardCard>
        )}

        {(nextMeeting || showRequests || showAdmin || showFireAccess) && (
          <BoardCard>
            <BoardSectionHeader title="Recent activity" />
            <div className="board-action-queue">
              {nextMeeting && (
                <BoardActionLink
                  href={`/board/meetings/${nextMeeting.id}`}
                  label="Next meeting workspace"
                  meta={user.role === "fire_board" ? "Meeting details and permitted records" : "Attendance, quorum, minutes, and questions"}
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
              {showFireAccess && (
                <BoardActionLink href="/board/admin/visibility" label="Fire Board access" meta="Control what Fire Board users can see" />
              )}
            </div>
          </BoardCard>
        )}
      </div>
    </div>
  );
}
