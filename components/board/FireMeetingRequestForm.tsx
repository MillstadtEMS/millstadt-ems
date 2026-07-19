"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Recipient {
  id: string;
  name: string;
  officerTitle: string | null;
  role: string;
}

export default function FireMeetingRequestForm({ recipients }: { recipients: Recipient[] }) {
  const router = useRouter();
  const [meetingTitle, setMeetingTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [location, setLocation] = useState("");
  const [scope, setScope] = useState("president");
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const president = useMemo(() => recipients.find((r) => r.role === "ems_president" || r.officerTitle === "President"), [recipients]);

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }

  async function submit() {
    setBusy(true);
    setMsg(null);
    const requestedUserIds = scope === "specific" ? selected : [];
    try {
      const res = await fetch("/api/board/fire-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingTitle,
          date: date || null,
          startTime: startTime.trim() || null,
          location: location.trim() || null,
          requestedScope: scope,
          requestedUserIds,
          reason,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: data.error || "Could not submit the request." });
        return;
      }
      setMeetingTitle("");
      setDate("");
      setStartTime("");
      setLocation("");
      setScope("president");
      setSelected([]);
      setReason("");
      setMsg({ ok: true, text: "Request submitted." });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="board-card" style={{ maxWidth: 760 }}>
      <div style={{ display: "grid", gap: 13 }}>
        <div className="board-field" style={{ margin: 0 }}>
          <label htmlFor="fire-title">Meeting or agenda item</label>
          <input id="fire-title" className="board-input" value={meetingTitle} onChange={(event) => setMeetingTitle(event.target.value)} placeholder="Fire Board meeting or topic" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          <div className="board-field" style={{ margin: 0 }}>
            <label htmlFor="fire-date">Date</label>
            <input id="fire-date" className="board-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <div className="board-field" style={{ margin: 0 }}>
            <label htmlFor="fire-time">Time</label>
            <input id="fire-time" className="board-input" value={startTime} onChange={(event) => setStartTime(event.target.value)} placeholder="7:00 PM" />
          </div>
          <div className="board-field" style={{ margin: 0 }}>
            <label htmlFor="fire-location">Location</label>
            <input id="fire-location" className="board-input" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Optional" />
          </div>
        </div>
        <div className="board-field" style={{ margin: 0 }}>
          <label htmlFor="fire-scope">Who are you requesting?</label>
          <select id="fire-scope" className="board-input" value={scope} onChange={(event) => setScope(event.target.value)}>
            <option value="president">Board president{president ? ` (${president.name})` : ""}</option>
            <option value="all">All EMS board members</option>
            <option value="specific">Specific EMS board member(s)</option>
          </select>
        </div>
        {scope === "specific" && (
          <div style={{ display: "grid", gap: 8 }}>
            {recipients.map((person) => (
              <label key={person.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
                <input type="checkbox" checked={selected.includes(person.id)} onChange={() => toggle(person.id)} />
                <span>{person.name}{person.officerTitle ? ` · ${person.officerTitle}` : ""}</span>
              </label>
            ))}
          </div>
        )}
        <div className="board-field" style={{ margin: 0 }}>
          <label htmlFor="fire-reason">Reason for request</label>
          <textarea id="fire-reason" className="board-input" rows={4} value={reason} onChange={(event) => setReason(event.target.value)} style={{ resize: "vertical", fontFamily: "inherit" }} />
        </div>
        <button className="board-submit" type="button" disabled={busy} onClick={submit} style={{ width: "auto", justifySelf: "start", padding: "10px 20px" }}>
          {busy ? "Submitting..." : "Submit request"}
        </button>
        {msg && <p style={{ margin: 0, color: msg.ok ? "var(--b-good)" : "var(--b-crit)", fontSize: 13 }}>{msg.text}</p>}
      </div>
    </div>
  );
}
