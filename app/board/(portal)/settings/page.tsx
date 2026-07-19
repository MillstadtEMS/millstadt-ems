import { currentBoardUser } from "@/lib/board/auth";
import BoardAppearanceControl from "@/components/board/BoardAppearanceControl";
import { BoardCard, BoardPageHeader } from "@/components/board/BoardPrimitives";
import BoardEmojiAvatar from "@/components/board/BoardEmojiAvatar";
import { boardUserEmoji } from "@/lib/board/personalization";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await currentBoardUser();
  if (!user) return null;
  const personalEmoji = boardUserEmoji(user);

  return (
    <>
      <BoardPageHeader eyebrow="Account" title="Settings" />
      <BoardCard>
        <h2 className="board-h2">Appearance</h2>
        <p className="board-sub">Choose how the portal appears on this device.</p>
        <div style={{ marginTop: 16 }}>
          <BoardAppearanceControl />
        </div>
      </BoardCard>
      <BoardCard style={{ marginTop: 14 }}>
        <div className="board-account-personal">
          <BoardEmojiAvatar emoji={personalEmoji} photoUrl={user.photoUrl} role={user.role} size="lg" />
          <div>
            <h2 className="board-h2">Account</h2>
            <p className="board-sub">{user.firstName} {user.lastName}{user.officerTitle ? ` · ${user.officerTitle}` : ""}</p>
          </div>
        </div>
      </BoardCard>
    </>
  );
}
