"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MeetingMinutesEditor({
  meetingId,
  initialMinutes,
  initialPublic,
}: {
  meetingId: number;
  initialMinutes: string | null;
  initialPublic: boolean;
}) {
  const router = useRouter();
  const [minutesText, setMinutesText] = useState(initialMinutes ?? "");
  const [minutesPublic, setMinutesPublic] = useState(initialPublic);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/board/meetings/minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId, minutesText: minutesText.trim() || null, minutesPublic }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error || "Could not save minutes." });
        return;
      }
      setMsg({ ok: true, text: "Minutes saved." });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="board-card" style={{ maxWidth: 780 }}>
      <div className="board-field" style={{ margin: 0 }}>
        <label htmlFor="meeting-minutes">Meeting minutes</label>
        <textarea
          id="meeting-minutes"
          className="board-input"
          rows={8}
          value={minutesText}
          onChange={(event) => setMinutesText(event.target.value)}
          style={{ resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
        />
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 12, fontSize: 13.5, color: "var(--b-ink-2)" }}>
        <input type="checkbox" checked={minutesPublic} onChange={(event) => setMinutesPublic(event.target.checked)} />
        Share these minutes on the public website
      </label>
      <div className="board-actions" style={{ marginTop: 14 }}>
        <button className="board-submit" style={{ width: "auto", padding: "10px 20px" }} type="button" disabled={busy} onClick={save}>
          {busy ? "Saving..." : "Save minutes"}
        </button>
      </div>
      {msg && <p style={{ margin: "10px 0 0", color: msg.ok ? "var(--b-good)" : "var(--b-crit)", fontSize: 13 }}>{msg.text}</p>}
    </div>
  );
}
