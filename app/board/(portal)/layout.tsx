import { redirect } from "next/navigation";
import { currentBoardUser } from "@/lib/board/auth";
import BoardAppShell from "@/components/board/BoardAppShell";
import {
  canManageFireBoardAccess,
  canReviewFireMeetingRequests,
  canSubmitFireMeetingRequest,
  canViewFinancialModel,
  getFireBoardAccessStatus,
  visibleBudgetSectionsForUser,
  userBoards,
} from "@/lib/board/governance";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await currentBoardUser();
  if (!user) redirect("/board/login");
  if (user.mustChangePassword) redirect("/board/change-password");

  const isBoardAdmin = user.role === "admin";
  const fireAccess = await getFireBoardAccessStatus();
  const fireAccessLevel = fireAccess.level;
  const showMeetings = userBoards(user, fireAccessLevel).length > 0;
  const showBriefings = user.role !== "fire_board" && showMeetings;
  const visibleBudgetSections = visibleBudgetSectionsForUser(user, fireAccess.level, fireAccess.budgetSections);
  const showReferendum = canViewFinancialModel(user, fireAccessLevel, fireAccess.budgetSections);
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
      visibleBudgetSections={visibleBudgetSections}
      showRequests={showRequests}
    >
      {children}
    </BoardAppShell>
  );
}
