import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CheckCircle2, CircleSlash2, ShieldCheck } from "lucide-react";
import { currentBoardUser } from "@/lib/board/auth";
import { audit } from "@/lib/board/db";
import {
  canManageFireBoardAccess,
  FIRE_BOARD_ACCESS_LEVELS,
  FIRE_BOARD_ACCESS_OPTIONS,
  getFireBoardAccessStatus,
  getFireBoardUsers,
  setFireBoardAccessLevel,
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

  await setFireBoardAccessLevel(level, user);
  await audit({
    userId: user.id,
    username: user.username,
    role: user.role,
    action: "fire_board_access.updated",
    detail: `Fire Board access set to ${level}`,
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
        <form action={updateFireAccess} className="fire-access-options">
          {FIRE_BOARD_ACCESS_OPTIONS.map((option) => {
            const active = option.value === status.level;
            return (
              <button
                key={option.value}
                type="submit"
                name="accessLevel"
                value={option.value}
                className={`fire-access-option ${active ? "active" : ""}`}
              >
                <span className="fire-access-choice-icon" aria-hidden="true">
                  {active ? <CheckCircle2 size={22} /> : <ShieldCheck size={22} />}
                </span>
                <span className="fire-access-choice-main">
                  <strong>{option.label}</strong>
                  <small>{option.summary}</small>
                </span>
                {active && <span className="fire-access-current">Current</span>}
              </button>
            );
          })}
        </form>

        <div className="fire-access-side">
          <BoardCard>
            <BoardSectionHeader title="Current access" />
            <p className="board-sub" style={{ marginTop: 0 }}>{status.summary}</p>
            <div className="fire-access-rules">
              <div>
                <strong>Fire Board can see</strong>
                <ul>
                  {(FIRE_BOARD_ACCESS_OPTIONS.find((item) => item.value === status.level)?.allowed ?? []).map((item) => (
                    <li key={item}><CheckCircle2 size={15} aria-hidden="true" />{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Fire Board cannot see</strong>
                <ul>
                  {(FIRE_BOARD_ACCESS_OPTIONS.find((item) => item.value === status.level)?.blocked ?? []).map((item) => (
                    <li key={item}><CircleSlash2 size={15} aria-hidden="true" />{item}</li>
                  ))}
                </ul>
              </div>
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
