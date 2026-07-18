"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const OPTIONS = ["Attending", "Attending Remotely", "Tentative", "Not Attending", "Excused Absence Requested"] as const;

export default function AttendanceControl({
  meetingId, current, currentNote, canRespond,
}: { meetingId: number; current: string; currentNote: string | null; canRespond: boolean }) {
  const router = useRouter();
  const [sel, setSel] = useState(current === "No Response" ? "" : current);
  const [note, setNote] = useState(currentNote ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!canRespond) {
    return <p style={{ margin: 0, color: "var(--b-muted)", fontSize: 14 }}>You are viewing this board&rsquo;s meeting. Attendance responses are recorded for that board&rsquo;s members.</p>;
  }

  async function send(response: string) {
    setBusy(true); setSaved(false);
    try {
      const res = await fetch("/api/board/meetings/attendance", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId, response, note: note.trim() || null }),
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
              {o === "Excused Absence Requested" ? "Excused Absence" : o}
            </button>
          );
        })}
      </div>
      <textarea value={note} onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note (e.g. &ldquo;may arrive 15 minutes late&rdquo; or &ldquo;must leave by 8:00&rdquo;)"
        className="board-input" rows={2}
        style={{ marginTop: 12, resize: "vertical", fontFamily: "inherit" }}
        onBlur={() => sel && send(sel)} />
      {saved && <p style={{ margin: "8px 0 0", color: "var(--b-good)", fontSize: 13 }}>Saved. This is your planned attendance — the secretary confirms the official record at the meeting.</p>}
    </div>
  );
}
