"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = ["Question", "Concern", "Comment", "Requested Agenda Item", "Financial Question", "Levy Question", "Proposal Question", "Contract Question", "Invoice Question", "Operations Question", "Personnel Question", "Policy Question", "Legal Concern", "Meeting-Minutes Question", "Unfinished Business", "Other"];

const VIS = [
  { v: "board", label: "Board", hint: "Visible to permitted board members." },
  { v: "leadership", label: "Leadership", hint: "Visible to authorized leadership reviewers." },
  { v: "confidential", label: "Confidential Review", hint: "Possible Confidential or Executive-Session Matter — Requires Review" },
];

export default function QuestionForm({ meetingId }: { meetingId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("Question");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState("board");
  const [relatedRef, setRelatedRef] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [urgentReason, setUrgentReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/board/meetings/question", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId, category, subject, body, visibility, relatedRef: relatedRef.trim() || null, urgent, urgentReason: urgentReason.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg({ ok: false, text: data.error || "Could not submit." }); return; }
      setMsg({ ok: true, text: data.afterDeadline ? "Submitted After Briefing Deadline" : "Submitted." });
      setSubject(""); setBody(""); setRelatedRef(""); setUrgent(false); setUrgentReason("");
      router.refresh();
    } catch { setMsg({ ok: false, text: "Network error. Please try again." }); }
    finally { setBusy(false); }
  }

  if (!open) {
    return <button className="board-submit" style={{ width: "auto", padding: "10px 20px" }} onClick={() => setOpen(true)}>Submit a question or concern</button>;
  }

  const labelStyle = { display: "block", fontFamily: "var(--b-mono)", fontSize: 10.5, letterSpacing: 0, textTransform: "uppercase" as const, color: "var(--b-muted)", margin: "0 0 6px" };

  return (
    <div className="board-card" style={{ maxWidth: 640 }}>
      <p style={{ margin: "0 0 4px", fontWeight: 650, fontSize: 15 }}>Questions Before the Meeting</p>
      <p style={{ margin: "0 0 16px", color: "var(--b-muted)", fontSize: 13 }}>
        Not anonymous. Do not include patient information, private employee details, passwords, bank information, or Social Security numbers.
      </p>

      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle}>Category</label>
            <select className="board-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Who can see this</label>
            <select className="board-input" value={visibility} onChange={(e) => setVisibility(e.target.value)}>
              {VIS.map((v) => <option key={v.v} value={v.v}>{v.label}</option>)}
            </select>
          </div>
        </div>
        <p style={{ margin: "-6px 0 0", fontSize: 12, color: "var(--b-faint)" }}>{VIS.find((v) => v.v === visibility)?.hint}</p>

        <div>
          <label style={labelStyle}>Subject</label>
          <input className="board-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short summary" />
        </div>
        <div>
          <label style={labelStyle}>Your question or comment</label>
          <textarea className="board-input" rows={4} value={body} onChange={(e) => setBody(e.target.value)} style={{ resize: "vertical", fontFamily: "inherit" }} />
        </div>
        <div>
          <label style={labelStyle}>Related item (optional)</label>
          <input className="board-input" value={relatedRef} onChange={(e) => setRelatedRef(e.target.value)} placeholder="e.g. Proposal #4, an invoice, a budget line" />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, cursor: "pointer" }}>
          <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
          Mark urgent (notifies leadership right away)
        </label>
        {urgent && (
          <input className="board-input" value={urgentReason} onChange={(e) => setUrgentReason(e.target.value)} placeholder="Why is this urgent? (required)" />
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="board-submit" style={{ width: "auto", padding: "10px 22px" }} disabled={busy} onClick={submit}>{busy ? "Submitting…" : "Submit"}</button>
          <button type="button" onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "var(--b-muted)", cursor: "pointer", fontSize: 13.5 }}>Cancel</button>
        </div>
        {msg && <p style={{ margin: 0, color: msg.ok ? "var(--b-good)" : "var(--b-crit)", fontSize: 13 }}>{msg.text}</p>}
      </div>
    </div>
  );
}
