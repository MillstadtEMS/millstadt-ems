"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const OPTIONS = ["Attending", "Attending Remotely", "Tentative", "Not Attending", "Excused Absence Requested", "No Response"] as const;

export default function AttendanceControl({
  meetingId, current, canRespond,
}: { meetingId: number; current: string; canRespond: boolean }) {
  const router = useRouter();
  const [sel, setSel] = useState(current);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!canRespond) {
    return null;
  }

  async function send(response: string) {
    setBusy(true); setSaved(false);
    try {
      const res = await fetch("/api/board/meetings/attendance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId, response, note: null }),
      });
      if (res.ok) { setSel(response); setSaved(true); router.refresh(); }
    } finally { setBusy(false); }
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {OPTIONS.map((o) => {
          const on = sel === o;
          return (
            <button key={o} type="button" disabled={busy} onClick={() => send(o)}
              className="board-rsvp" aria-pressed={on}
              style={{
                padding: "9px 14px", borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
                border: on ? "1px solid var(--b-accent)" : "1px solid var(--b-hair)",
                background: on ? "var(--b-accent-soft)" : "var(--b-surface)",
                color: on ? "var(--b-ink)" : "var(--b-ink-2)",
              }}>
              {o === "Excused Absence Requested" ? "Excused Absence Requested" : o}
            </button>
          );
        })}
      </div>
      {saved && <p style={{ margin: "8px 0 0", color: "var(--b-good)", fontSize: 13 }}>Saved. This is your planned attendance — the secretary confirms the official record at the meeting.</p>}
    </div>
  );
}
