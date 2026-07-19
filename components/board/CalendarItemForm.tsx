"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, CalendarPlus, Mail, X } from "lucide-react";

const TYPES = ["Event", "Reminder"] as const;
const AUDIENCES = [
  { value: "ems_board", label: "EMS board members" },
  { value: "ems_and_admins", label: "EMS board, Kenneth, and Jen" },
  { value: "creator", label: "Only me" },
] as const;
const REPEATS = [
  { value: "none", label: "Once" },
  { value: "daily", label: "Daily until the event" },
  { value: "weekly", label: "Weekly until the event" },
] as const;

export default function CalendarItemForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [itemType, setItemType] = useState<(typeof TYPES)[number]>("Event");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [emailRemindersEnabled, setEmailRemindersEnabled] = useState(false);
  const [reminderAudience, setReminderAudience] = useState<(typeof AUDIENCES)[number]["value"]>("ems_board");
  const [reminderFirstOffsetDays, setReminderFirstOffsetDays] = useState("7");
  const [reminderRepeat, setReminderRepeat] = useState<(typeof REPEATS)[number]["value"]>("none");
  const [reminderMaxSends, setReminderMaxSends] = useState("1");
  const [reminderPreferredTime, setReminderPreferredTime] = useState("08:00");
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
          emailRemindersEnabled,
          reminderAudience,
          reminderFirstOffsetDays: Number(reminderFirstOffsetDays),
          reminderRepeat,
          reminderMaxSends: Number(reminderMaxSends),
          reminderPreferredTime,
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
      setEmailRemindersEnabled(false);
      setReminderAudience("ems_board");
      setReminderFirstOffsetDays("7");
      setReminderRepeat("none");
      setReminderMaxSends("1");
      setReminderPreferredTime("08:00");
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
      <button className="board-submit board-calendar-add" type="button" onClick={() => setOpen(true)}>
        <CalendarPlus size={17} aria-hidden="true" />
        Add event or reminder
      </button>
    );
  }

  return (
    <div className="board-card board-calendar-form-card">
      <div className="board-calendar-form-head">
        <div>
          <span className="board-chip accent"><CalendarPlus size={13} aria-hidden="true" /> New calendar item</span>
          <h3>Create event or reminder</h3>
        </div>
        <button className="board-icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close event form">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="board-calendar-form-grid">
        <div className="board-calendar-form-main">
          <div className="board-form-grid two">
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
          <div className="board-form-grid three">
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
        </div>

        <div className="board-reminder-options">
          <div className="board-reminder-toggle">
            <div>
              <span><Mail size={16} aria-hidden="true" /> Email reminders</span>
              <small>Automatically email before this item.</small>
            </div>
            <label className="board-switch">
              <input
                type="checkbox"
                checked={emailRemindersEnabled}
                onChange={(event) => setEmailRemindersEnabled(event.target.checked)}
                aria-label="Send email reminders"
              />
              <i aria-hidden="true" />
            </label>
          </div>

          <div className={emailRemindersEnabled ? "board-reminder-fields" : "board-reminder-fields disabled"}>
            <div className="board-field" style={{ margin: 0 }}>
              <label htmlFor="calendar-reminder-audience">Send to</label>
              <select
                id="calendar-reminder-audience"
                className="board-input"
                value={reminderAudience}
                disabled={!emailRemindersEnabled}
                onChange={(event) => setReminderAudience(event.target.value as (typeof AUDIENCES)[number]["value"])}
              >
                {AUDIENCES.map((audience) => <option key={audience.value} value={audience.value}>{audience.label}</option>)}
              </select>
            </div>
            <div className="board-form-grid two compact">
              <div className="board-field" style={{ margin: 0 }}>
                <label htmlFor="calendar-reminder-days">First send</label>
                <select
                  id="calendar-reminder-days"
                  className="board-input"
                  value={reminderFirstOffsetDays}
                  disabled={!emailRemindersEnabled}
                  onChange={(event) => setReminderFirstOffsetDays(event.target.value)}
                >
                  <option value="0">Day of</option>
                  <option value="1">1 day before</option>
                  <option value="3">3 days before</option>
                  <option value="7">1 week before</option>
                  <option value="14">2 weeks before</option>
                  <option value="30">30 days before</option>
                </select>
              </div>
              <div className="board-field" style={{ margin: 0 }}>
                <label htmlFor="calendar-reminder-time">After</label>
                <input
                  id="calendar-reminder-time"
                  className="board-input"
                  type="time"
                  value={reminderPreferredTime}
                  disabled={!emailRemindersEnabled}
                  onChange={(event) => setReminderPreferredTime(event.target.value)}
                />
              </div>
            </div>
            <div className="board-form-grid two compact">
              <div className="board-field" style={{ margin: 0 }}>
                <label htmlFor="calendar-reminder-repeat">How often</label>
                <select
                  id="calendar-reminder-repeat"
                  className="board-input"
                  value={reminderRepeat}
                  disabled={!emailRemindersEnabled}
                  onChange={(event) => setReminderRepeat(event.target.value as (typeof REPEATS)[number]["value"])}
                >
                  {REPEATS.map((repeat) => <option key={repeat.value} value={repeat.value}>{repeat.label}</option>)}
                </select>
              </div>
              <div className="board-field" style={{ margin: 0 }}>
                <label htmlFor="calendar-reminder-max">Stop after</label>
                <input
                  id="calendar-reminder-max"
                  className="board-input"
                  type="number"
                  min="1"
                  max="24"
                  value={reminderMaxSends}
                  disabled={!emailRemindersEnabled}
                  onChange={(event) => setReminderMaxSends(event.target.value)}
                />
              </div>
            </div>
            <p><BellRing size={14} aria-hidden="true" /> Runs from the website scheduler. Sent reminders are counted so they do not resend endlessly.</p>
          </div>
        </div>
      </div>

      <div className="board-actions">
        <button className="board-submit" style={{ width: "auto", padding: "10px 18px" }} type="button" disabled={busy} onClick={submit}>
          <CalendarPlus size={17} aria-hidden="true" />
          {busy ? "Adding..." : "Add"}
        </button>
        <button className="board-btn-secondary" type="button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      {msg && <p style={{ margin: 0, color: msg.ok ? "var(--b-good)" : "var(--b-crit)", fontSize: 13 }}>{msg.text}</p>}
    </div>
  );
}
