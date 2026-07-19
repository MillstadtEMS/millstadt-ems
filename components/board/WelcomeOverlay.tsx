"use client";

import { useEffect, useState } from "react";
import BoardPhoto from "./BoardPhoto";

function welcomeSeenKey(firstName: string, lastName: string) {
  return `board:welcome-seen:${firstName.trim().toLowerCase()}:${lastName.trim().toLowerCase()}`;
}

/**
 * A brief "Welcome, <name>" splash shown once per browser after
 * a board member reaches the portal. Shows their profile photo below the
 * greeting (or their initials until a photo is added). Dismisses on click or
 * after a few seconds; respects reduced-motion.
 */
export default function WelcomeOverlay({ firstName, lastName, title, photoUrl }: {
  firstName: string; lastName: string; title: string | null; photoUrl: string | null;
}) {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      const key = welcomeSeenKey(firstName, lastName);
      if (localStorage.getItem(key) === "1") return;
      if (sessionStorage.getItem("board_welcomed") === "1") return;
      localStorage.setItem(key, "1");
      sessionStorage.setItem("board_welcomed", "1");
    } catch { /* private mode — just show it */ }
    const raf = requestAnimationFrame(() => setShow(true));
    const t1 = setTimeout(() => setLeaving(true), 3200);
    const t2 = setTimeout(() => setShow(false), 3700);
    return () => { cancelAnimationFrame(raf); clearTimeout(t1); clearTimeout(t2); };
  }, [firstName, lastName]);

  if (!show) return null;
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();

  return (
    <div
      className={`board-welcome ${leaving ? "leaving" : ""}`}
      role="dialog"
      aria-label={`Welcome, ${firstName}`}
      onClick={() => { setLeaving(true); setTimeout(() => setShow(false), 300); }}
    >
      <div className="board-welcome-card">
        <div className="hi">Welcome,</div>
        <div className="nm">{firstName} {lastName}</div>
        {title && <div className="ti">{title}</div>}
        <div className="pic">
          {photoUrl ? <BoardPhoto src={photoUrl} /> : <span className="ini" aria-hidden="true">{initials}</span>}
        </div>
      </div>
    </div>
  );
}
