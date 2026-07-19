import BoardPhoto from "./BoardPhoto";

export default function BoardEmojiAvatar({
  emoji,
  photoUrl,
  size = "sm",
}: {
  emoji: string;
  photoUrl?: string | null;
  size?: "sm" | "lg";
}) {
  return (
    <span className={`board-emoji-avatar ${size}`} aria-hidden="true">
      {photoUrl ? (
        <>
          <span className="board-emoji-photo"><BoardPhoto src={photoUrl} /></span>
          <span className="board-emoji-corner">{emoji}</span>
        </>
      ) : (
        <span className="board-emoji-face">{emoji}</span>
      )}
    </span>
  );
}
