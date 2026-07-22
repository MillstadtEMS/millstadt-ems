import { currentBoardUser } from "./auth";
import {
  canViewBudgetWorkbook,
  getFireBoardAccessStatus,
} from "./governance";

export async function getCurrentBudgetAccess() {
  const user = await currentBoardUser();
  if (!user) return null;
  const fireAccess = await getFireBoardAccessStatus();
  const canViewWorkbook = canViewBudgetWorkbook(user, fireAccess.level, fireAccess.budgetSections);
  return { user, fireAccess, canViewWorkbook };
}
