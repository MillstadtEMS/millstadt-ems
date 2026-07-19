import BoardPhoto from "./BoardPhoto";

export default function BoardEmojiAvatar({
  emoji,
  photoUrl,
  role,
  size = "sm",
}: {
  emoji: string;
  photoUrl?: string | null;
  role?: string | null;
  size?: "sm" | "lg" | "xl";
}) {
  const agency = role === "fire_board" ? "fire" : role ? "ems" : null;

  return (
    <span className={`board-emoji-avatar ${size}`} aria-hidden="true">
      {photoUrl ? (
        <>
          <span className="board-emoji-photo"><BoardPhoto src={photoUrl} /></span>
          <span className="board-emoji-corner">{emoji}</span>
        </>
      ) : agency === "ems" ? (
        <>
          <span className="board-agency-mark board-agency-star">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/millstadt-ems/star-of-life.png" alt="" />
          </span>
          <span className="board-emoji-corner">{emoji}</span>
        </>
      ) : agency === "fire" ? (
        <>
          <span className="board-agency-mark board-agency-fire">
            <span className="fire-face fire-heat" />
            <span className="fire-face fire-fuel" />
            <span className="fire-face fire-oxygen" />
            <span className="fire-face fire-chain" />
          </span>
          <span className="board-emoji-corner">{emoji}</span>
        </>
      ) : (
        <span className="board-emoji-face">{emoji}</span>
      )}
    </span>
  );
}
