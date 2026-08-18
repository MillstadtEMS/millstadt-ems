import { redirect } from "next/navigation";
import { currentBoardUserForPasswordChange } from "@/lib/board/auth";
import BoardAppShell from "@/components/board/BoardAppShell";
import {
  canManageFireBoardAccess,
  canReviewFireMeetingRequests,
  canSubmitFireMeetingRequest,
  canViewBudgetWorkbook,
  getFireBoardAccessStatus,
  userBoards,
} from "@/lib/board/governance";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await currentBoardUserForPasswordChange();
  if (!user) redirect("/board/login");
  if (user.mustChangePassword) redirect("/board/change-password");

  const isBoardAdmin = user.role === "admin";
  const fireAccess = await getFireBoardAccessStatus();
  const fireAccessLevel = fireAccess.level;
  const showMeetings = userBoards(user, fireAccessLevel).length > 0;
  const showBriefings = user.role !== "fire_board" && showMeetings;
  const showReferendum = canViewBudgetWorkbook(user, fireAccessLevel, fireAccess.budgetSections);
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
