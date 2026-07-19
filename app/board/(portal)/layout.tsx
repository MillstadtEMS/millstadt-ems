import { redirect } from "next/navigation";
import Link from "next/link";
import { currentBoardUser } from "@/lib/board/auth";
import LogoutButton from "@/components/board/LogoutButton";
import WelcomeOverlay from "@/components/board/WelcomeOverlay";
import BoardPhoto from "@/components/board/BoardPhoto";
import BoardNav from "@/components/board/BoardNav";
import BoardLogo from "@/components/board/BoardLogo";
import { canReviewFireMeetingRequests, canSubmitFireMeetingRequest, canViewFinancialModel, userBoards } from "@/lib/board/governance";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await currentBoardUser();
  if (!user) redirect("/board/login");
  if (user.mustChangePassword) redirect("/board/change-password");

  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  const isBoardAdmin = user.role === "admin";
  const showMeetings = userBoards(user).length > 0;
  const showReferendum = canViewFinancialModel(user);
  const showRequests = canSubmitFireMeetingRequest(user) || canReviewFireMeetingRequests(user);

  return (
    <div className="board-shell">
      <aside className="board-side">
        <Link href="/board" className="board-side-brand">
          <BoardLogo className="board-seal-logo" />
        </Link>
        <BoardNav isAdmin={isBoardAdmin} showMeetings={showMeetings} showReferendum={showReferendum} showRequests={showRequests} />
        <p className="board-log-notice">Portal activity is logged for governance and security.</p>
      </aside>

      <div className="board-main-shell">
        <header className="board-top">
          <div className="board-top-in">
            <details className="board-mobile-nav">
              <summary>Menu</summary>
              <BoardNav isAdmin={isBoardAdmin} showMeetings={showMeetings} showReferendum={showReferendum} showRequests={showRequests} />
            </details>
            <Link href="/board" className="board-mobile-brand">
              <BoardLogo className="board-mobile-logo" />
              <span className="sr-only">Millstadt EMS Board Portal</span>
            </Link>

            <span className="spacer" />

            <span className="board-id">
              <span className="av" aria-hidden="true">
                {user.photoUrl ? <BoardPhoto src={user.photoUrl} /> : initials}
              </span>
              <span className="who">
                <span className="nm">{user.firstName} {user.lastName}</span>
                {user.officerTitle && <span className="ti">{user.officerTitle}</span>}
              </span>
            </span>
            <LogoutButton />
          </div>
        </header>
        <main className="board-page">{children}</main>
      </div>
      <WelcomeOverlay firstName={user.firstName} lastName={user.lastName} title={user.officerTitle} photoUrl={user.photoUrl} />
    </div>
  );
}
