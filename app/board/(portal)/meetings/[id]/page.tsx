import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentBoardUser } from "@/lib/board/auth";
import AttendanceControl from "@/components/board/AttendanceControl";
import ConfirmAttendance from "@/components/board/ConfirmAttendance";
import MeetingMinutesEditor from "@/components/board/MeetingMinutesEditor";
import QuestionForm from "@/components/board/QuestionForm";
import {
  getMeeting, getAttendance, getQuorumRequired, computeQuorum, getQuestions,
  canEditMinutes, canRecordAttendance, canSeeQuestion, isLeadership, isSecretary, userBoards, BOARD_LABEL, VISIBILITY_LABEL, type Board,
} from "@/lib/board/governance";

export const dynamic = "force-dynamic";

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}
const BADGE: Record<Board, { bg: string; fg: string; label: string }> = {
  ems: { bg: "var(--b-accent-soft)", fg: "var(--b-accent)", label: "EMS BOARD" },
  fire: { bg: "var(--b-crit-bg)", fg: "var(--b-crit)", label: "FIRE BOARD" },
};
const RSVP_COLOR: Record<string, string> = {
  "Attending": "var(--b-good)", "Attending Remotely": "var(--b-good)", "Tentative": "var(--b-warn)",
  "Not Attending": "var(--b-crit)", "Excused Absence Requested": "var(--b-crit)", "No Response": "var(--b-faint)",
};

export default async function MeetingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meetingId = Number(id);
  const user = await currentBoardUser();
  if (!user) return null;
  const meeting = await getMeeting(meetingId);
  if (!meeting) notFound();
  if (!userBoards(user).includes(meeting.board)) redirect("/board");

  const [att, questions] = await Promise.all([getAttendance(meetingId, meeting.board), getQuestions(meetingId)]);
  const { required, isDefault } = await getQuorumRequired(meeting.board, att.length);
  const q = computeQuorum(att, required, isDefault);
  const canRespond = canRecordAttendance(user, meeting.board);
  const mine = att.find((a) => a.userId === user.id);
  const visibleQuestions = questions.filter((question) => canSeeQuestion(user, question));
  const canEditMeetingMinutes = meeting.board === "ems" && canEditMinutes(user);
  const b = BADGE[meeting.board];
  const qColor = q.status === "Quorum Confirmed" ? "var(--b-good)" : q.status === "Quorum Not Expected" ? "var(--b-crit)" : "var(--b-warn)";

  return (
    <>
      <Link href="/board/meetings" className="board-btn-secondary">All meetings</Link>

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0 6px", flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--b-mono)", fontSize: 10, fontWeight: 700, letterSpacing: 0, padding: "3px 8px", borderRadius: 6, background: b.bg, color: b.fg }}>{b.label}</span>
        <span style={{ fontFamily: "var(--b-mono)", fontSize: 10.5, letterSpacing: 0, color: "var(--b-muted)", textTransform: "uppercase" }}>{meeting.type} meeting</span>
        <span className="board-chip">{meeting.status}</span>
      </div>
      <h1 className="board-h1" style={{ marginBottom: 6 }}>{fmtDate(meeting.date)}</h1>
      <p className="board-sub">{meeting.startTime}{meeting.endTime ? `–${meeting.endTime}` : ""}{meeting.location ? ` · ${meeting.location}` : ""} · {BOARD_LABEL[meeting.board]}</p>
      {meeting.virtualLink && <p style={{ marginTop: 4 }}><a href={meeting.virtualLink} style={{ color: "var(--b-accent)" }}>Join virtually →</a></p>}
      {meeting.description && <p style={{ marginTop: 14, color: "var(--b-ink-2)", maxWidth: 680 }}>{meeting.description}</p>}

      {canRespond && (
        <>
          <h2 id="attendance" className="board-h2">Will you attend?</h2>
          <div className="board-card" style={{ maxWidth: 680 }}>
            <AttendanceControl meetingId={meeting.id} current={mine?.response ?? "No Response"} canRespond={canRespond} />
          </div>
        </>
      )}

      {/* Quorum */}
      <h2 className="board-h2">Expected quorum</h2>
      <div className="board-card">
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontFamily: "var(--b-sans)", fontSize: 24, fontWeight: 700, color: qColor }}>{q.status}</span>
          <span style={{ color: "var(--b-muted)", fontSize: 14 }}>{q.attending + q.remote} attending of {q.eligible} members · quorum needs {q.required}</span>
        </div>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 14, fontSize: 13 }}>
          <span><strong>{q.attending}</strong> in person</span>
          <span><strong>{q.remote}</strong> remote</span>
          <span><strong>{q.tentative}</strong> tentative</span>
          <span><strong>{q.notAttending}</strong> not attending</span>
          <span><strong>{q.noResponse}</strong> no response</span>
        </div>
        {isDefault && <p className="board-chip review" style={{ display: "inline-flex", marginTop: 14 }}>Quorum setting requires administrator review</p>}
      </div>

      {/* Who has responded */}
      <h2 className="board-h2">Who has responded</h2>
      <div className="board-tw" style={{ maxWidth: 680 }}>
        <table>
          <thead><tr><th>Member</th><th>Planned</th></tr></thead>
          <tbody>
            {att.map((a) => (
              <tr key={a.userId}>
                <td style={{ fontWeight: 600 }}>{a.name}{a.officerTitle ? <span style={{ color: "var(--b-muted)", fontWeight: 400 }}> · {a.officerTitle}</span> : ""}</td>
                <td style={{ color: RSVP_COLOR[a.response], fontWeight: 600 }}>{a.response}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="board-updated" style={{ marginTop: 10 }}>Planned attendance only. The secretary confirms the official record during or after the meeting; only confirmed attendance counts toward statistics.</p>

      {isSecretary(user) && (
        <div style={{ marginTop: 18 }}>
          <ConfirmAttendance meetingId={meeting.id} members={att} />
        </div>
      )}

      {(canEditMeetingMinutes || meeting.minutesText) && (
        <>
          <h2 className="board-h2">Meeting minutes</h2>
          {canEditMeetingMinutes ? (
            <MeetingMinutesEditor
              meetingId={meeting.id}
              initialMinutes={meeting.minutesText}
              initialPublic={meeting.minutesPublic}
              initialRawTranscript={meeting.minutesRawTranscript}
              finalizedBy={meeting.minutesSignedBy}
              finalizedAt={meeting.minutesSignedAt}
              canFinalize={isSecretary(user)}
            />
          ) : (
            <div className="board-card" style={{ maxWidth: 780 }}>
              {meeting.minutesSignedAt && (
                <p style={{ margin: "0 0 12px" }}>
                  <a className="board-btn-secondary" href={`/api/board/meetings/minutes/pdf?meetingId=${meeting.id}`} target="_blank" rel="noreferrer">Official PDF</a>
                </p>
              )}
              <p style={{ margin: 0, whiteSpace: "pre-wrap", color: "var(--b-ink-2)", lineHeight: 1.5 }}>{meeting.minutesText}</p>
            </div>
          )}
        </>
      )}

      {/* Questions */}
      <h2 id="briefing" className="board-h2">Questions before the meeting</h2>
      {visibleQuestions.length === 0 && <p style={{ color: "var(--b-muted)", marginTop: -6 }}>No questions submitted yet.</p>}
      <div style={{ display: "grid", gap: 12, margin: "6px 0 18px" }}>
        {visibleQuestions.map((question) => (
          <div key={question.id} className="board-card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <span style={{ fontFamily: "var(--b-mono)", fontSize: 10.5, letterSpacing: 0, textTransform: "uppercase", color: "var(--b-accent)" }}>{question.category}</span>
              {question.visibility !== "board" && <span className="board-chip review">{VISIBILITY_LABEL[question.visibility]}</span>}
              {question.urgent && <span className="board-chip" style={{ color: "var(--b-crit)", borderColor: "var(--b-crit)" }}>Urgent</span>}
              {question.afterDeadline && <span className="board-chip">Submitted After Briefing Deadline</span>}
              <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--b-faint)" }}>{question.status}</span>
            </div>
            <p style={{ margin: "0 0 4px", fontWeight: 650 }}>{question.subject}</p>
            <p style={{ margin: 0, color: "var(--b-ink-2)", fontSize: 14, whiteSpace: "pre-wrap" }}>{question.body}</p>
            <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--b-muted)" }}>— {question.authorName}{question.relatedRef ? ` · re: ${question.relatedRef}` : ""}</p>
            {question.responseBody && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--b-hair)" }}>
                <p style={{ margin: 0, fontSize: 14 }}><strong>Response:</strong> {question.responseBody}</p>
                {question.responseBy && <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--b-muted)" }}>— {question.responseBy}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
      <QuestionForm meetingId={meeting.id} />
      {isLeadership(user) && <p className="board-updated" style={{ marginTop: 14 }}>You have leadership visibility — you can see leadership-only submissions here. Confidential items appear only to authorized reviewers and never in the general briefing.</p>}
    </>
  );
}
