import { redirect } from "next/navigation";
import { currentBoardUser } from "@/lib/board/auth";
import BoardAppShell from "@/components/board/BoardAppShell";
import { canReviewFireMeetingRequests, canSubmitFireMeetingRequest, canViewFinancialModel, userBoards } from "@/lib/board/governance";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await currentBoardUser();
  if (!user) redirect("/board/login");
  if (user.mustChangePassword) redirect("/board/change-password");

  const isBoardAdmin = user.role === "admin";
  const showMeetings = userBoards(user).length > 0;
  const showReferendum = canViewFinancialModel(user);
  const showRequests = canSubmitFireMeetingRequest(user) || canReviewFireMeetingRequests(user);

  return (
    <BoardAppShell
      user={user}
      isAdmin={isBoardAdmin}
      showMeetings={showMeetings}
      showReferendum={showReferendum}
      showRequests={showRequests}
    >
      {children}
    </BoardAppShell>
  );
}
