"use client";

import { useEffect, useState } from "react";
import BoardEmojiAvatar from "./BoardEmojiAvatar";

/**
 * A brief welcome splash shown only after a successful login handoff.
 */
export default function WelcomeOverlay({ firstName, title, photoUrl, role, emoji }: {
  firstName: string;
  title: string | null;
  photoUrl: string | null;
  role: string;
  emoji: string;
}) {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem("board:welcome") !== "1") return;
    window.sessionStorage.removeItem("board:welcome");
    const raf = requestAnimationFrame(() => setShow(true));
    const t1 = setTimeout(() => setLeaving(true), 3000);
    const t2 = setTimeout(() => setShow(false), 3800);
    return () => { cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`board-welcome ${leaving ? "leaving" : ""}`}
      role="dialog"
      aria-label={`Welcome, ${firstName}`}
      onClick={() => { setLeaving(true); setTimeout(() => setShow(false), 650); }}
    >
      <div className="board-welcome-card">
        <h1>Welcome, {firstName}</h1>
        <BoardEmojiAvatar emoji={emoji} photoUrl={photoUrl} role={role} size="xl" />
        {title && <p>{title}</p>}
      </div>
    </div>
  );
}
