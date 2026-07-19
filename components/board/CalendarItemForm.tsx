"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = ["Event", "Reminder"] as const;

export default function CalendarItemForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [itemType, setItemType] = useState<(typeof TYPES)[number]>("Event");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/board/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          itemType,
          date,
          startTime: startTime.trim() || null,
          endTime: endTime.trim() || null,
          description: description.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error || "Could not add the item." });
        return;
      }
      setTitle("");
      setDate("");
      setStartTime("");
      setEndTime("");
      setDescription("");
      setOpen(false);
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="board-submit" style={{ width: "auto", padding: "10px 18px" }} type="button" onClick={() => setOpen(true)}>
        Add event or reminder
      </button>
    );
  }

  return (
    <div className="board-card" style={{ marginTop: 14 }}>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <div className="board-field" style={{ margin: 0 }}>
            <label htmlFor="calendar-title">Title</label>
            <input id="calendar-title" className="board-input" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="board-field" style={{ margin: 0 }}>
            <label htmlFor="calendar-type">Type</label>
            <select id="calendar-type" className="board-input" value={itemType} onChange={(event) => setItemType(event.target.value as (typeof TYPES)[number])}>
              {TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
          <div className="board-field" style={{ margin: 0 }}>
            <label htmlFor="calendar-date">Date</label>
            <input id="calendar-date" className="board-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="board-field" style={{ margin: 0 }}>
            <label htmlFor="calendar-start">Start</label>
            <input id="calendar-start" className="board-input" value={startTime} onChange={(event) => setStartTime(event.target.value)} placeholder="7:00 PM" />
          </div>
          <div className="board-field" style={{ margin: 0 }}>
            <label htmlFor="calendar-end">End</label>
            <input id="calendar-end" className="board-input" value={endTime} onChange={(event) => setEndTime(event.target.value)} placeholder="Optional" />
          </div>
        </div>
        <div className="board-field" style={{ margin: 0 }}>
          <label htmlFor="calendar-desc">Details</label>
          <textarea id="calendar-desc" className="board-input" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} style={{ resize: "vertical", fontFamily: "inherit" }} />
        </div>
        <div className="board-actions">
          <button className="board-submit" style={{ width: "auto", padding: "10px 18px" }} type="button" disabled={busy} onClick={submit}>
            {busy ? "Adding..." : "Add"}
          </button>
          <button className="board-btn-secondary" type="button" onClick={() => setOpen(false)}>Cancel</button>
        </div>
        {msg && <p style={{ margin: 0, color: msg.ok ? "var(--b-good)" : "var(--b-crit)", fontSize: 13 }}>{msg.text}</p>}
      </div>
    </div>
  );
}
