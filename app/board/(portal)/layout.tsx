import { redirect } from "next/navigation";
import Link from "next/link";
import { currentBoardUser } from "@/lib/board/auth";
import LogoutButton from "@/components/board/LogoutButton";
import WelcomeOverlay from "@/components/board/WelcomeOverlay";
import BoardPhoto from "@/components/board/BoardPhoto";
import BoardNav from "@/components/board/BoardNav";
import BoardLogo from "@/components/board/BoardLogo";

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
            <span className="mk" aria-hidden="true" style={{ overflow: "hidden", padding: 0 }}>
              <BoardLogo style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
            </span>
            <span className="tt">
              <span className="t1">Millstadt EMS</span>
              <span className="t2">Board of Directors</span>
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
