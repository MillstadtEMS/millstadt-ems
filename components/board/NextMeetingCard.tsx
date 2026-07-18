import Link from "next/link";
import type { BoardUser } from "@/lib/board/db";
import {
  getNextMeeting, getAttendance, getQuorumRequired, computeQuorum, getQuestions,
  isEligibleMember, canSeeQuestion, BOARD_LABEL, type Board,
} from "@/lib/board/governance";

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}
const BADGE: Record<Board, { bg: string; fg: string; label: string }> = {
  ems: { bg: "var(--b-accent-soft)", fg: "var(--b-accent)", label: "EMS BOARD" },
  fire: { bg: "var(--b-crit-bg)", fg: "var(--b-crit)", label: "FIRE BOARD" },
};

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
  const mine = att.find((a) => a.userId === user.id)?.response ?? (isEligibleMember(user, m.board) ? "No Response" : null);
  const b = BADGE[m.board];
  const qColor = q.status === "Quorum Confirmed" ? "var(--b-good)" : q.status === "Quorum Not Expected" ? "var(--b-crit)" : "var(--b-warn)";

  return (
    <Link href={`/board/meetings/${m.id}`} className="board-card" style={{ display: "block", textDecoration: "none", color: "inherit", marginTop: 22, borderLeft: "3px solid var(--b-accent)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--b-mono)", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", padding: "3px 8px", borderRadius: 6, background: b.bg, color: b.fg }}>{b.label}</span>
        <span className="board-eyebrow" style={{ margin: 0 }}>Next meeting</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontFamily: "var(--b-serif)", fontSize: 21, fontWeight: 600, color: "var(--b-ink)" }}>{fmtDate(m.date)}</div>
          <div style={{ fontSize: 13.5, color: "var(--b-muted)", marginTop: 3 }}>{m.startTime}{m.location ? ` · ${m.location}` : ""} · {BOARD_LABEL[m.board]}</div>
          <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap", fontSize: 13 }}>
            {mine && <span style={{ color: mine === "No Response" ? "var(--b-warn)" : "var(--b-accent)", fontWeight: 600 }}>{mine === "No Response" ? "⚠ Respond to attendance" : `You: ${mine}`}</span>}
            <span style={{ color: "var(--b-muted)" }}>{myQuestions} question{myQuestions === 1 ? "" : "s"} submitted</span>
            {openForMe > 0 && <span style={{ color: "var(--b-muted)" }}>{openForMe} awaiting response</span>}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "var(--b-mono)", fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--b-muted)" }}>Expected quorum</div>
          <div style={{ fontWeight: 700, color: qColor, marginTop: 3 }}>{q.status}</div>
          <div style={{ fontSize: 12.5, color: "var(--b-muted)", marginTop: 2 }}>{q.attending + q.remote} of {q.eligible} · need {q.required}</div>
        </div>
      </div>
    </Link>
  );
}
