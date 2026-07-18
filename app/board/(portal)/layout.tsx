import { redirect } from "next/navigation";
import Link from "next/link";
import { currentBoardUser } from "@/lib/board/auth";
import LogoutButton from "@/components/board/LogoutButton";
import WelcomeOverlay from "@/components/board/WelcomeOverlay";
import BoardPhoto from "@/components/board/BoardPhoto";
import BoardNav from "@/components/board/BoardNav";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await currentBoardUser();
  if (!user) redirect("/board/login");
  if (user.mustChangePassword) redirect("/board/change-password");

  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

  return (
    <>
      <header className="board-top">
        <div className="board-wrap board-top-in">
          <Link href="/board" className="board-brand">
            <span className="mk" aria-hidden="true">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 2.2 3.4 6v6.2c0 5 3.7 8.2 8.6 9.6 4.9-1.4 8.6-4.6 8.6-9.6V6L12 2.2Z"/><path d="M12 8.4v7M8.5 11.9h7"/></svg>
            </span>
            <span className="tt">
              <span className="t1">Millstadt EMS</span>
              <span className="t2">Board Portal</span>
            </span>
          </Link>

          <BoardNav isAdmin={user.role === "admin"} />

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
      <main className="board-wrap board-page">{children}</main>
      <WelcomeOverlay firstName={user.firstName} lastName={user.lastName} title={user.officerTitle} photoUrl={user.photoUrl} />
    </>
  );
}
