"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["Present", "Present Remotely", "Absent", "Excused Absence", "Unexcused Absence", "Late Arrival", "Left Early", "Recused for Part of Meeting", "Not Eligible for This Meeting"];

interface Member { userId: string; name: string; officerTitle: string | null; response: string; confirmedStatus: string | null }

export default function ConfirmAttendance({ meetingId, members }: { meetingId: number; members: Member[] }) {
  const router = useRouter();
  const [savingId, setSavingId] = useState<string | null>(null);

  async function save(userId: string, status: string) {
    if (!status) return;
    setSavingId(userId);
    try {
      const res = await fetch("/api/board/meetings/confirm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId, userId, status }),
      });
      if (res.ok) router.refresh();
    } finally { setSavingId(null); }
  }

  return (
    <div className="board-card">
      <p style={{ margin: "0 0 4px", fontWeight: 650, fontSize: 15 }}>Confirm official attendance</p>
      <p style={{ margin: "0 0 14px", color: "var(--b-muted)", fontSize: 13 }}>You are the secretary for this board. This is the official record that feeds the minutes and attendance history — separate from members&rsquo; planned responses.</p>
      <div className="board-tw">
        <table>
          <thead><tr><th>Member</th><th>Planned</th><th>Official status</th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId}>
                <td style={{ fontWeight: 600 }}>{m.name}{m.officerTitle ? <span style={{ color: "var(--b-muted)", fontWeight: 400 }}> · {m.officerTitle}</span> : ""}</td>
                <td style={{ color: "var(--b-muted)", fontSize: 13 }}>{m.response}</td>
                <td>
                  <select className="board-input" style={{ padding: "6px 8px", minWidth: 190 }}
                    defaultValue={m.confirmedStatus ?? ""} disabled={savingId === m.userId}
                    onChange={(e) => save(m.userId, e.target.value)}>
                    <option value="">— not confirmed —</option>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
