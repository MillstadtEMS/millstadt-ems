import Link from "next/link";
import { currentBoardUser } from "@/lib/board/auth";
import NextMeetingCard from "@/components/board/NextMeetingCard";
import {
  canReviewFireMeetingRequests,
  canSubmitFireMeetingRequest,
  canViewFinancialModel,
  userBoards,
} from "@/lib/board/governance";

export const dynamic = "force-dynamic";

function ActionCard({ label, value, href }: { label: string; value: string; href: string }) {
  const content = (
    <>
      <div className="lbl">{label}</div>
      <div className="val">{value}</div>
    </>
  );
  return (
    <Link href={href} className="board-card board-stat board-link-card">
      {content}
    </Link>
  );
}

export default async function BoardHome() {
  const user = await currentBoardUser();
  if (!user) return null;

  const boards = userBoards(user);
  const showMeetings = boards.length > 0;
  const showRequests = canSubmitFireMeetingRequest(user) || canReviewFireMeetingRequests(user);
  const showReferendum = canViewFinancialModel(user);
  const showAdmin = user.role === "admin";

  return (
    <>
      <p className="board-eyebrow">Governance</p>
      <h1 className="board-h1">Welcome, {user.firstName}</h1>
      <p className="board-sub">Millstadt EMS Board workspace.</p>

      {showMeetings ? (
        <NextMeetingCard user={user} />
      ) : (
        <Link href="/board/requests" className="board-card board-link-card" style={{ display: "block", marginTop: 22, borderLeft: "3px solid var(--b-accent)" }}>
          <div className="board-eyebrow" style={{ margin: 0 }}>Fire Board Requests</div>
          <div style={{ fontFamily: "var(--b-sans)", fontSize: 21, fontWeight: 700, color: "var(--b-ink)", marginTop: 8 }}>Request EMS Board attendance</div>
          <p style={{ margin: "6px 0 0", color: "var(--b-muted)", fontSize: 13.5 }}>Send a meeting request with the date, requested EMS attendees, and reason.</p>
        </Link>
      )}

      <h2 className="board-h2">Quick Access</h2>
      <div className="board-grid k3 board-dashboard-grid">
        {showMeetings && <ActionCard label="Meetings" value="Schedule, attendance, minutes" href="/board/meetings" />}
        {showRequests && <ActionCard label="Requests" value={user.role === "fire_board" ? "Request EMS Board attendance" : "Review Fire Board requests"} href="/board/requests" />}
        {showReferendum && <ActionCard label="Referendum Model" value="Open financial model" href="/board/referendum" />}
        {showAdmin && <ActionCard label="Administration" value="Users, imports, model status" href="/board/admin" />}
      </div>
    </>
  );
}
