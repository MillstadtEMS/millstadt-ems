import Link from "next/link";
import { currentBoardUser } from "@/lib/board/auth";
import {
  getUpcomingMeetings, generateRecurring, userBoards, getAttendance,
  getQuorumRequired, computeQuorum, isEligibleMember, BOARD_LABEL, type Board,
} from "@/lib/board/governance";

export const dynamic = "force-dynamic";

function fmtDate(iso: string): { dow: string; rest: string } {
  const d = new Date(`${iso}T00:00:00Z`);
  return {
    dow: d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }),
    rest: d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }),
  };
}
const BADGE: Record<Board, { bg: string; fg: string; label: string }> = {
  ems: { bg: "var(--b-accent-soft)", fg: "var(--b-accent)", label: "EMS" },
  fire: { bg: "var(--b-crit-bg)", fg: "var(--b-crit)", label: "FIRE" },
};

export default async function MeetingsPage() {
  const user = await currentBoardUser();
  if (!user) return null;
  await generateRecurring(6); // keep the next ~6 months seeded
  const meetings = await getUpcomingMeetings(userBoards(user), 30);

  // Quorum snapshot per meeting (cheap — small boards).
  const withQuorum = await Promise.all(meetings.map(async (m) => {
    const att = await getAttendance(m.id, m.board);
    const { required, isDefault } = await getQuorumRequired(m.board, att.length);
    const q = computeQuorum(att, required, isDefault);
    const mine = att.find((a) => a.userId === user.id)?.response ?? (isEligibleMember(user, m.board) ? "No Response" : null);
    return { m, q, mine };
  }));

  return (
    <>
      <p className="board-eyebrow">Governance</p>
      <h1 className="board-h1">Meetings</h1>
      <p className="board-sub">The EMS Board meets the second Wednesday of each month; the Fire District Board meets the last Thursday. Respond to attendance, submit questions before the meeting, and open the briefing when it&rsquo;s ready.</p>

      <div style={{ display: "grid", gap: 14, marginTop: 24 }}>
        {withQuorum.length === 0 && <div className="board-card"><p style={{ margin: 0 }}>No upcoming meetings scheduled.</p></div>}
        {withQuorum.map(({ m, q, mine }) => {
          const d = fmtDate(m.date);
          const b = BADGE[m.board];
          const qColor = q.status === "Quorum Confirmed" ? "var(--b-good)" : q.status === "Quorum Not Expected" ? "var(--b-crit)" : "var(--b-warn)";
          return (
            <Link key={m.id} href={`/board/meetings/${m.id}`} className="board-card" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--b-mono)", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", padding: "3px 8px", borderRadius: 6, background: b.bg, color: b.fg }}>{b.label}</span>
                    <span style={{ fontFamily: "var(--b-mono)", fontSize: 10.5, letterSpacing: ".05em", color: "var(--b-muted)", textTransform: "uppercase" }}>{m.type}</span>
                    {m.status !== "Scheduled" && <span className="board-chip">{m.status}</span>}
                    {!m.detailsConfirmed && <span className="board-chip review">Time &amp; place: confirm</span>}
                  </div>
                  <div style={{ fontFamily: "var(--b-serif)", fontSize: 19, fontWeight: 600, color: "var(--b-ink)" }}>{d.dow}, {d.rest}</div>
                  <div style={{ fontSize: 13.5, color: "var(--b-muted)", marginTop: 3 }}>
                    {m.startTime}{m.location ? ` · ${m.location}` : ""} · {BOARD_LABEL[m.board]}
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: 150 }}>
                  <div style={{ fontFamily: "var(--b-mono)", fontSize: 10, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--b-muted)" }}>Expected quorum</div>
                  <div style={{ fontWeight: 700, color: qColor, marginTop: 3 }}>{q.status}</div>
                  <div style={{ fontSize: 12.5, color: "var(--b-muted)", marginTop: 2 }}>{q.attending + q.remote} of {q.eligible} · need {q.required}</div>
                  {mine && <div style={{ marginTop: 8, fontSize: 12.5, color: mine === "No Response" ? "var(--b-warn)" : "var(--b-accent)", fontWeight: 600 }}>{mine === "No Response" ? "You haven't responded" : `You: ${mine}`}</div>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
