import Link from "next/link";
import { currentBoardUser } from "@/lib/board/auth";
import NextMeetingCard from "@/components/board/NextMeetingCard";
import { userBoards } from "@/lib/board/governance";

export const dynamic = "force-dynamic";

function Tile({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link href={href} className="board-card" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
      <div style={{ fontFamily: "var(--b-serif)", fontSize: 18, fontWeight: 600, color: "var(--b-ink)" }}>{title}</div>
      <div style={{ fontSize: 13.5, color: "var(--b-muted)", marginTop: 6 }}>{sub}</div>
      <div style={{ marginTop: 12, fontSize: 13, color: "var(--b-accent)", fontWeight: 600 }}>Open →</div>
    </Link>
  );
}

export default async function BoardHome() {
  const user = await currentBoardUser();
  if (!user) return null;
  const isGuest = userBoards(user).length === 0; // Fire Board members view the model as guests

  return (
    <>
      <p className="board-eyebrow">Board of Directors</p>
      <h1 className="board-h1">Welcome, {user.firstName}</h1>
      <p className="board-sub">{isGuest
        ? "You have guest access to review the proposed EMS District financial model."
        : "Your board business at a glance — the next meeting, and the referendum financial model."}</p>

      {!isGuest && <NextMeetingCard user={user} />}

      <h2 className="board-h2">Go to</h2>
      <div className="board-grid k3">
        <Tile href="/board/referendum" title="Referendum Financial Model" sub="Projected cost and revenue needs for the proposed EMS District and full-time staffing model." />
        {!isGuest && <Tile href="/board/meetings" title="Meetings" sub="Board calendar, attendance, quorum, and questions before each meeting." />}
      </div>
    </>
  );
}
