import { redirect } from "next/navigation";
import { currentBoardUser } from "./auth";
import {
  canViewBudgetSection,
  firstVisibleBudgetSectionPath,
  getFireBoardAccessStatus,
  visibleBudgetSectionsForUser,
  type FireBoardBudgetSection,
} from "./governance";

export async function getCurrentBudgetAccess() {
  const user = await currentBoardUser();
  if (!user) return null;
  const fireAccess = await getFireBoardAccessStatus();
  const visibleSections = visibleBudgetSectionsForUser(user, fireAccess.level, fireAccess.budgetSections);
  return { user, fireAccess, visibleSections };
}

export async function requireBoardBudgetSection(section: FireBoardBudgetSection) {
  const access = await getCurrentBudgetAccess();
  if (!access) redirect("/board");
  if (canViewBudgetSection(access.user, section, access.fireAccess.level, access.fireAccess.budgetSections)) return access;
  const fallback = firstVisibleBudgetSectionPath(access.visibleSections);
  redirect(fallback ?? "/board");
}
