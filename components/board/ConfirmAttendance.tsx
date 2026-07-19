"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["Present", "Present Remotely", "Absent", "Excused", "Unexcused", "Late Arrival", "Left Early", "Recused"];

interface Member { userId: string; name: string; officerTitle: string | null; response: string; confirmedStatus: string | null }

interface Draft {
  status: string;
  arrival: string;
  departure: string;
}

export default function ConfirmAttendance({ meetingId, members }: { meetingId: number; members: Member[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => Object.fromEntries(
    members.map((member) => [member.userId, { status: member.confirmedStatus ?? "", arrival: "", departure: "" }]),
  ));
  const [savingId, setSavingId] = useState<string | null>(null);

  function update(userId: string, patch: Partial<Draft>) {
    setDrafts((current) => ({
      ...current,
      [userId]: { ...(current[userId] ?? { status: "", arrival: "", departure: "" }), ...patch },
    }));
  }

  async function save(userId: string) {
    const draft = drafts[userId];
    if (!draft?.status) return;
    setSavingId(userId);
    try {
      const res = await fetch("/api/board/meetings/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId,
          userId,
          status: draft.status,
          arrival: draft.arrival || null,
          departure: draft.departure || null,
        }),
      });
      if (res.ok) router.refresh();
    } finally { setSavingId(null); }
  }

  return (
    <div className="board-card">
      <p style={{ margin: "0 0 4px", fontWeight: 650, fontSize: 15 }}>Confirm Official Attendance</p>
      <p style={{ margin: "0 0 14px", color: "var(--b-muted)", fontSize: 13 }}>Official attendance is separate from planned responses.</p>
      <div className="board-tw">
        <table>
          <thead><tr><th>Member</th><th>Planned</th><th>Official status</th><th>Arrival</th><th>Departure</th><th></th></tr></thead>
          <tbody>
            {members.map((member) => {
              const draft = drafts[member.userId] ?? { status: "", arrival: "", departure: "" };
              return (
                <tr key={member.userId}>
                  <td style={{ fontWeight: 600 }}>{member.name}{member.officerTitle ? <span style={{ color: "var(--b-muted)", fontWeight: 400 }}> · {member.officerTitle}</span> : ""}</td>
                  <td style={{ color: "var(--b-muted)", fontSize: 13 }}>{member.response}</td>
                  <td>
                    <select className="board-input" style={{ padding: "6px 8px", minWidth: 170 }}
                      value={draft.status} disabled={savingId === member.userId}
                      onChange={(event) => update(member.userId, { status: event.target.value })}>
                      <option value="">Not Confirmed</option>
                      {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </td>
                  <td><input className="board-input" type="time" value={draft.arrival} onChange={(event) => update(member.userId, { arrival: event.target.value })} /></td>
                  <td><input className="board-input" type="time" value={draft.departure} onChange={(event) => update(member.userId, { departure: event.target.value })} /></td>
                  <td><button className="board-btn-secondary" type="button" disabled={savingId === member.userId || !draft.status} onClick={() => save(member.userId)}>Save</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
