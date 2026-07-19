import Link from "next/link";
import type { BoardUser } from "@/lib/board/db";
import { BoardStatusChip } from "./BoardPrimitives";
import {
  getNextMeeting, getAttendance, getQuorumRequired, computeQuorum, getQuestions,
  canRecordAttendance, canSeeQuestion, BOARD_LABEL, type Board,
} from "@/lib/board/governance";

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}
const BADGE: Record<Board, { bg: string; fg: string; label: string }> = {
  ems: { bg: "var(--b-accent-soft)", fg: "var(--b-accent)", label: "EMS BOARD" },
  fire: { bg: "var(--b-crit-bg)", fg: "var(--b-crit)", label: "FIRE BOARD" },
};

function countdownLabel(iso: string): string {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const meeting = new Date(`${iso}T00:00:00`).getTime();
  const days = Math.round((meeting - start) / 86400000);
  if (days < 0) return "Past due";
  if (days === 0) return "Tonight";
  if (days === 1) return "Tomorrow";
  return `${days} days`;
}

function quorumTone(status: string): "good" | "warn" | "crit" | "info" {
  if (status === "Quorum Confirmed") return "good";
  if (status === "Quorum Not Expected") return "crit";
  if (status === "Quorum Not Yet Known") return "info";
  return "warn";
}

/** Home-dashboard "Next meeting" section (spec §27). */
export default async function NextMeetingCard({ user }: { user: BoardUser }) {
  const m = await getNextMeeting(user);
  if (!m) return null;
  const att = await getAttendance(m.id, m.board);
  const { required, isDefault } = await getQuorumRequired(m.board, att.length);
  const q = computeQuorum(att, required, isDefault);
  const questions = await getQuestions(m.id);
  const myQuestions = questions.filter((question) => question.userId === user.id).length;
  const openForMe = questions.filter((question) => canSeeQuestion(user, question) && !question.responseBody).length;
  const mine = att.find((a) => a.userId === user.id)?.response ?? (canRecordAttendance(user, m.board) ? "No Response" : null);
  const b = BADGE[m.board];
  const needsAttendance = mine === "No Response";
  const briefingStatus = m.status === "Briefing Distributed" ? "Distributed" : m.status === "Briefing Being Prepared" ? "Being prepared" : "Not distributed";

  return (
    <section className="board-card board-meeting-hero">
      <div className="board-meeting-head">
        <div className="board-meeting-title">
          <BoardStatusChip tone="accent">{b.label}</BoardStatusChip>
          <h2>{fmtDate(m.date)}</h2>
          <p>{m.startTime}{m.location ? ` · ${m.location}` : ""} · {BOARD_LABEL[m.board]}</p>
        </div>
        <div className="board-countdown" aria-label={`Meeting countdown: ${countdownLabel(m.date)}`}>
          <strong>{countdownLabel(m.date)}</strong>
          <span>Next meeting</span>
        </div>
      </div>

      <div className="board-meeting-status-grid">
        <div className="board-mini-status">
          <span>Attendance response</span>
          <strong>{mine ?? "Not applicable"}</strong>
        </div>
        <div className="board-mini-status">
          <span>Expected quorum</span>
          <strong><BoardStatusChip tone={quorumTone(q.status)}>{q.status}</BoardStatusChip></strong>
        </div>
        <div className="board-mini-status">
          <span>Briefing status</span>
          <strong>{briefingStatus}</strong>
        </div>
        <div className="board-mini-status">
          <span>Meeting packet</span>
          <strong>No packet posted</strong>
        </div>
      </div>

      <div className="board-hero-actions">
        <Link href={`/board/meetings/${m.id}#attendance`} className={needsAttendance ? "board-btn-primary" : "board-btn-secondary"}>
          {needsAttendance ? "Respond to attendance" : "Update attendance"}
        </Link>
        <Link href={`/board/meetings/${m.id}#briefing`} className="board-btn-secondary">Open briefing</Link>
        <button type="button" className="board-btn-secondary" disabled>Open meeting packet</button>
      </div>

      <div className="board-actions" style={{ marginTop: 16 }}>
        <BoardStatusChip tone="info">{myQuestions} submitted question{myQuestions === 1 ? "" : "s"}</BoardStatusChip>
        {openForMe > 0 && <BoardStatusChip tone="warn">{openForMe} awaiting response</BoardStatusChip>}
        <BoardStatusChip tone={quorumTone(q.status)}>{q.attending + q.remote} of {q.eligible} attending · need {q.required}</BoardStatusChip>
      </div>
    </section>
  );
}
