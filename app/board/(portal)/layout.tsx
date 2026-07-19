import { redirect } from "next/navigation";
import { currentBoardUser } from "@/lib/board/auth";
import BoardAppShell from "@/components/board/BoardAppShell";
import {
  canManageFireBoardAccess,
  canReviewFireMeetingRequests,
  canSubmitFireMeetingRequest,
  canViewFinancialModel,
  getFireBoardAccessLevel,
  userBoards,
} from "@/lib/board/governance";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await currentBoardUser();
  if (!user) redirect("/board/login");
  if (user.mustChangePassword) redirect("/board/change-password");

  const isBoardAdmin = user.role === "admin";
  const fireAccessLevel = await getFireBoardAccessLevel();
  const showMeetings = userBoards(user, fireAccessLevel).length > 0;
  const showBriefings = user.role !== "fire_board" && showMeetings;
  const showReferendum = canViewFinancialModel(user, fireAccessLevel);
  const showRequests = canSubmitFireMeetingRequest(user) || canReviewFireMeetingRequests(user);
  const canManageFireAccess = canManageFireBoardAccess(user);

  return (
    <BoardAppShell
      user={user}
      isAdmin={isBoardAdmin}
      canManageFireAccess={canManageFireAccess}
      showMeetings={showMeetings}
      showBriefings={showBriefings}
      showReferendum={showReferendum}
      showRequests={showRequests}
    >
      {children}
    </BoardAppShell>
  );
}
