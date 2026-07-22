import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Save } from "lucide-react";
import { currentBoardUser } from "@/lib/board/auth";
import { audit } from "@/lib/board/db";
import {
  canManageFireBoardAccess,
  FIRE_BOARD_ACCESS_LEVELS,
  FIRE_BOARD_ACCESS_OPTIONS,
  FIRE_BOARD_BUDGET_SECTIONS,
  FIRE_BOARD_BUDGET_SECTION_VALUES,
  getFireBoardAccessStatus,
  getFireBoardUsers,
  setFireBoardAccessLevel,
  type FireBoardBudgetSection,
  type FireBoardAccessLevel,
} from "@/lib/board/governance";
import { BoardCard, BoardPageHeader, BoardSectionHeader, BoardStatusChip } from "@/components/board/BoardPrimitives";

export const dynamic = "force-dynamic";

async function updateFireAccess(formData: FormData) {
  "use server";
  const user = await currentBoardUser();
  if (!user || !canManageFireBoardAccess(user)) redirect("/board");

  const requested = String(formData.get("accessLevel") ?? "");
  const level = FIRE_BOARD_ACCESS_LEVELS.includes(requested as FireBoardAccessLevel)
    ? requested as FireBoardAccessLevel
    : "requests";
  const budgetSections = formData.getAll("budgetSections")
    .map((section) => String(section))
    .filter((section): section is FireBoardBudgetSection => FIRE_BOARD_BUDGET_SECTION_VALUES.includes(section as FireBoardBudgetSection));

  await setFireBoardAccessLevel(level, user, budgetSections);
  await audit({
    userId: user.id,
    username: user.username,
    role: user.role,
    action: "fire_board_access.updated",
    detail: `Fire Board access set to ${level}; budget workbook: ${budgetSections.includes("overview") ? "on" : "off"}`,
  });
  revalidatePath("/board");
  revalidatePath("/board/admin/visibility");
  revalidatePath("/board/meetings");
  revalidatePath("/board/referendum");
  revalidatePath("/board/documents");
  redirect("/board/admin/visibility?saved=1");
}

export default async function VisibilityPage({ searchParams }: { searchParams?: Promise<{ saved?: string }> }) {
  const user = await currentBoardUser();
  if (!user || !canManageFireBoardAccess(user)) redirect("/board");

  const [status, fireUsers] = await Promise.all([
    getFireBoardAccessStatus(),
    getFireBoardUsers(),
  ]);
  const params = searchParams ? await searchParams : {};
  const saved = params.saved === "1";
  const activeBudgetSections = new Set(status.budgetSections);
  const visibleBudgetLabels = FIRE_BOARD_BUDGET_SECTIONS
    .filter((section) => activeBudgetSections.has(section.value))
    .map((section) => section.navLabel);
  const budgetAccessOn = status.level === "budget" || status.level === "meetings_budget";
  const budgetSummary = budgetAccessOn
    ? (visibleBudgetLabels.length ? visibleBudgetLabels.join(", ") : "Budget workbook off")
    : "Budget access is off";

  return (
    <>
      <BoardPageHeader
        eyebrow="Administration"
        title="Fire Board access"
        description="Choose what Fire Board users can see in the EMS Board portal."
        actions={<BoardStatusChip tone="accent">{status.label}</BoardStatusChip>}
      />

      {saved && <div className="board-empty compact" role="status">Fire Board access updated.</div>}

      <div className="fire-access-layout">
        <form action={updateFireAccess} className="fire-access-control">
          <BoardCard>
            <BoardSectionHeader title="General access" />
            <p className="board-sub" style={{ marginTop: 0 }}>Pick the outside boundary first. The workbook switch below only matters when this includes Budget.</p>
            <div className="fire-access-options">
              {FIRE_BOARD_ACCESS_OPTIONS.map((option) => {
                const active = option.value === status.level;
                return (
                  <label
                    key={option.value}
                    className={`fire-access-option ${active ? "active" : ""}`}
                  >
                    <input type="radio" name="accessLevel" value={option.value} defaultChecked={active} />
                    <span className="fire-access-choice-main">
                      <strong>{option.label}</strong>
                      <small>{option.summary}</small>
                    </span>
                    {active && <span className="fire-access-current">Current</span>}
                  </label>
                );
              })}
            </div>
          </BoardCard>

          <BoardCard>
            <BoardSectionHeader title="Budget workbook" />
            <p className="board-sub" style={{ marginTop: 0 }}>Controls whether Fire Board users can open the workbook. Kenneth and Joe choose the visible workbook tabs on the workbook page.</p>
            <div className="fire-budget-grid">
              {FIRE_BOARD_BUDGET_SECTIONS.map((section) => {
                const active = activeBudgetSections.has(section.value);
                return (
                  <label key={section.value} className="fire-budget-option">
                    <input type="checkbox" name="budgetSections" value={section.value} defaultChecked={active} />
                    <span>
                      <strong>{section.label}</strong>
                      <small>{section.summary}</small>
                    </span>
                  </label>
                );
              })}
            </div>
            <button type="submit" className="board-btn-primary fire-access-save"><Save size={16} aria-hidden="true" /> Save Fire Board access</button>
          </BoardCard>
        </form>

        <div className="fire-access-side">
          <BoardCard>
            <BoardSectionHeader title="Current Fire Board view" />
            <p className="board-sub" style={{ marginTop: 0 }}>{status.summary}</p>
            <div className="fire-access-summary">
              <div><strong>General access</strong><span>{status.label}</span></div>
              <div><strong>Budget workbook</strong><span>{budgetSummary}</span></div>
            </div>
            <p className="board-updated">
              Last changed {status.updatedAt ? new Date(status.updatedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "never"}
              {status.updatedByName ? ` by ${status.updatedByName}` : ""}.
            </p>
          </BoardCard>

          <BoardCard>
            <BoardSectionHeader title="Who this affects" />
            <div className="fire-access-users">
              {fireUsers.length === 0 && <p className="board-sub" style={{ margin: 0 }}>No active Fire Board users found.</p>}
              {fireUsers.map((member) => (
                <div key={member.id} className="fire-access-user">
                  <span>
                    <strong>{member.name}</strong>
                    <small>{member.officerTitle ?? "Fire Board"} · {member.username}</small>
                  </span>
                </div>
              ))}
            </div>
          </BoardCard>
        </div>
      </div>
    </>
  );
}
