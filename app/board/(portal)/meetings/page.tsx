import Link from "next/link";
import { redirect } from "next/navigation";
import { currentBoardUser } from "@/lib/board/auth";
import CalendarItemForm from "@/components/board/CalendarItemForm";
import {
  canManageCalendar, canRecordAttendance, getCalendarItems, getUpcomingMeetings, generateRecurring, userBoards, getAttendance,
  getQuorumRequired, computeQuorum, BOARD_LABEL, type Board,
  getFireBoardAccessLevel,
} from "@/lib/board/governance";

export const dynamic = "force-dynamic";

function fmtDate(iso: string): { dow: string; rest: string } {
  const d = new Date(`${iso}T00:00:00Z`);
  return {
    dow: d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }),
    rest: d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }),
  };
}
function reminderAudienceLabel(value: string): string {
  if (value === "ems_and_admins") return "EMS board, Kenneth, and Jen";
  if (value === "creator") return "Creator only";
  return "EMS board members";
}
function reminderRepeatLabel(value: string): string {
  if (value === "daily") return "daily";
  if (value === "weekly") return "weekly";
  return "once";
}
function reminderLeadLabel(days: number): string {
  if (days === 0) return "day of";
  if (days === 1) return "1 day before";
  if (days === 7) return "1 week before";
  if (days === 14) return "2 weeks before";
  return `${days} days before`;
}
const BADGE: Record<Board, { bg: string; fg: string; label: string }> = {
  ems: { bg: "var(--b-accent-soft)", fg: "var(--b-accent)", label: "EMS" },
  fire: { bg: "var(--b-crit-bg)", fg: "var(--b-crit)", label: "FIRE" },
};

export default async function MeetingsPage() {
  const user = await currentBoardUser();
  if (!user) return null;
  const fireAccessLevel = await getFireBoardAccessLevel();
  const boards = userBoards(user, fireAccessLevel);
  if (boards.length === 0) redirect("/board/requests");
  const fireViewer = user.role === "fire_board";
  await generateRecurring(6); // keep the next ~6 months seeded
  const [meetings, calendarItems] = await Promise.all([
    getUpcomingMeetings(boards, 30),
    getCalendarItems(),
  ]);
  const canAddCalendarItems = canManageCalendar(user);

  // Quorum snapshot per meeting (cheap — small boards).
  const withQuorum = await Promise.all(meetings.map(async (m) => {
    const att = await getAttendance(m.id, m.board);
    const { required, isDefault } = await getQuorumRequired(m.board, att.length);
    const q = computeQuorum(att, required, isDefault);
    const mine = att.find((a) => a.userId === user.id)?.response ?? (canRecordAttendance(user, m.board) ? "No Response" : null);
    return { m, q, mine };
  }));

  return (
    <>
      <p className="board-eyebrow">Governance</p>
      <h1 className="board-h1">Meetings</h1>
      <p className="board-sub">{fireViewer ? "EMS Board meeting dates and permitted records." : "EMS Board meetings and shared board calendar items."}</p>

      <div className="board-meetings-list">
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
                    <span style={{ fontFamily: "var(--b-mono)", fontSize: 10, fontWeight: 700, letterSpacing: 0, padding: "3px 8px", borderRadius: 6, background: b.bg, color: b.fg }}>{b.label}</span>
                    <span style={{ fontFamily: "var(--b-mono)", fontSize: 10.5, letterSpacing: 0, color: "var(--b-muted)", textTransform: "uppercase" }}>{m.type}</span>
                    {m.status !== "Scheduled" && <span className="board-chip">{m.status}</span>}
                  </div>
                  <div style={{ fontFamily: "var(--b-sans)", fontSize: 19, fontWeight: 700, color: "var(--b-ink)" }}>{d.dow}, {d.rest}</div>
                  <div style={{ fontSize: 13.5, color: "var(--b-muted)", marginTop: 3 }}>
                    {m.startTime}{m.location ? ` · ${m.location}` : ""} · {BOARD_LABEL[m.board]}
                  </div>
                </div>
                {!fireViewer ? (
                  <div style={{ textAlign: "right", minWidth: 150 }}>
                    <div style={{ fontFamily: "var(--b-mono)", fontSize: 10, letterSpacing: 0, textTransform: "uppercase", color: "var(--b-muted)" }}>Expected quorum</div>
                    <div style={{ fontWeight: 700, color: qColor, marginTop: 3 }}>{q.status}</div>
                    <div style={{ fontSize: 12.5, color: "var(--b-muted)", marginTop: 2 }}>{q.attending + q.remote} of {q.eligible} · need {q.required}</div>
                    {mine && <div style={{ marginTop: 8, fontSize: 12.5, color: mine === "No Response" ? "var(--b-warn)" : "var(--b-accent)", fontWeight: 600 }}>{mine === "No Response" ? "You haven't responded" : `You: ${mine}`}</div>}
                  </div>
                ) : (
                  <div style={{ textAlign: "right", minWidth: 150 }}>
                    <div style={{ fontFamily: "var(--b-mono)", fontSize: 10, letterSpacing: 0, textTransform: "uppercase", color: "var(--b-muted)" }}>Access</div>
                    <div style={{ fontWeight: 700, color: "var(--b-accent)", marginTop: 3 }}>Meeting details</div>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {!fireViewer && <section className="board-calendar-panel" aria-labelledby="events-reminders-title">
        <div className="board-calendar-panel-head">
          <div>
            <p className="board-eyebrow">Shared calendar</p>
            <h2 id="events-reminders-title" className="board-h2">Events and reminders</h2>
            <p className="board-sub">Board-visible dates, reminders, and optional email reminder schedules.</p>
          </div>
          {canAddCalendarItems && <CalendarItemForm />}
        </div>

        <div className="board-calendar-list">
          {calendarItems.length === 0 && (
            <div className="board-empty">
              <h2>No shared events or reminders yet.</h2>
              <p>Items added here will show below the meeting calendar.</p>
            </div>
          )}
          {calendarItems.map((item) => {
            const d = fmtDate(item.date);
            return (
              <div key={item.id} className="board-calendar-item">
                <div className="board-calendar-date">
                  <strong>{d.dow.slice(0, 3)}</strong>
                  <span>{d.rest.replace(",", "")}</span>
                </div>
                <div className="board-calendar-content">
                  <div className="board-calendar-meta">
                    <span className="board-chip accent">{item.itemType}</span>
                    <span>{item.startTime ?? "Time not set"}{item.endTime ? `-${item.endTime}` : ""}</span>
                    {item.createdByName && <span>Created by {item.createdByName}</span>}
                  </div>
                  <h3>{item.title}</h3>
                  {item.description && <p>{item.description}</p>}
                  {item.emailRemindersEnabled && (
                    <div className="board-reminder-summary">
                      <span>Email reminders on</span>
                      <span>{reminderAudienceLabel(item.reminderAudience)}</span>
                      <span>{reminderLeadLabel(item.reminderFirstOffsetDays)}, {reminderRepeatLabel(item.reminderRepeat)}, after {item.reminderPreferredTime}</span>
                      <span>{item.reminderSendCount} of {item.reminderMaxSends} sent</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>}
    </>
  );
}
