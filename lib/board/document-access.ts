import type { BoardUser } from "./db";
import {
  audienceForBoardUser,
  canManageBoardWorkbook,
  type BoardWorkbookAudience,
} from "./workbook";

export type DocumentAccessDecision =
  | { allowed: false; status: 401 | 403 }
  | {
      allowed: true;
      audience?: BoardWorkbookAudience;
      fullWorkbook?: boolean;
    };

function boardAccountIsReady(user: BoardUser | null): user is BoardUser {
  return Boolean(user?.isActive && !user.mustChangePassword);
}

export function decideBoardWorkbookViewAccess(
  user: BoardUser | null,
  canViewWorkbook: boolean,
): DocumentAccessDecision {
  if (!user) return { allowed: false, status: 401 };
  if (!boardAccountIsReady(user) || !canViewWorkbook) {
    return { allowed: false, status: 403 };
  }
  const fullWorkbook = canManageBoardWorkbook(user);
  return {
    allowed: true,
    audience: audienceForBoardUser(user),
    fullWorkbook,
  };
}

export function decideBoardWorkbookSourceAccess(
  user: BoardUser | null,
): DocumentAccessDecision {
  if (!user) return { allowed: false, status: 401 };
  if (!boardAccountIsReady(user) || !canManageBoardWorkbook(user)) {
    return { allowed: false, status: 403 };
  }
  return { allowed: true, fullWorkbook: true };
}

export interface DraftBudgetActor {
  isActive: boolean;
  isAdmin: boolean;
  mustChangePassword?: boolean;
}

export function decideDraftBudgetDocumentAccess(
  actor: DraftBudgetActor | null,
): DocumentAccessDecision {
  if (!actor) return { allowed: false, status: 401 };
  if (!actor.isActive || !actor.isAdmin || actor.mustChangePassword) {
    return { allowed: false, status: 403 };
  }
  return { allowed: true };
}
