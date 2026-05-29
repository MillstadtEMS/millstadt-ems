"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Option { id: string; label: string }
interface Poll {
  id: string;
  title: string;
  description: string | null;
  kind: "single_choice" | "multi_choice" | "free_text";
  options: Option[];
  allowComment: boolean;
  open: boolean;
  createdBy: { id: string; firstName: string; lastName: string };
  createdAt: string;
  closedAt: string | null;
  responseCount: number;
  totalEligible: number;
}
interface Response {
  user: { id: string; firstName: string; lastName: string };
  choiceIds: string[];
  comment: string | null;
  submittedAt: string;
}

export default function PollResultsClient({
  poll: initialPoll,
  initialResponses,
}: { poll: Poll; initialResponses: Response[] }) {
  const router = useRouter();
  const [poll, setPoll] = useState<Poll>(initialPoll);
  const [responses] = useState<Response[]>(initialResponses);

  const totals: Record<string, number> = {};
  for (const opt of poll.options) totals[opt.id] = 0;
  for (const r of responses) for (const c of r.choiceIds) if (c in totals) totals[c]++;
  const maxCount = Math.max(1, ...Object.values(totals));

  async function toggleOpen() {
    const r = await fetch(`/api/admin/polls/${poll.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ open: !poll.open }),
    });
    if (r.ok) setPoll({ ...poll, open: !poll.open, closedAt: poll.open ? new Date().toISOString() : null });
  }
  async function remove() {
    if (!confirm("Delete this poll? Responses will be deleted too.")) return;
    const r = await fetch(`/api/admin/polls/${poll.id}`, { method: "DELETE" });
    if (r.ok) router.push("/admin/polls");
  }

  return (
    <div>
      <header style={{ marginBottom: 22 }}>
        <div style={{ color: "#f0b429", fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          Admin · Poll
        </div>
        <h1 style={{ margin: "4px 0 4px", fontSize: "1.6rem", fontWeight: 900, color: "white" }}>
          {poll.title}
        </h1>
        <div style={{ color: "#94a3b8", fontSize: 13 }}>
          {poll.responseCount} of {poll.totalEligible} responded · {poll.open ? "Open" : `Closed ${poll.closedAt ? new Date(poll.closedAt).toLocaleString() : ""}`}
        </div>
        {poll.description && (
          <p style={{ color: "#cbd5e1", fontSize: 14, lineHeight: 1.55, marginTop: 10 }}>{poll.description}</p>
        )}
      </header>

      {poll.kind !== "free_text" && (
        <section style={card}>
          <div style={sectionLabel}>Tally</div>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {poll.options.map((o) => {
              const n = totals[o.id] ?? 0;
              const pct = (n / maxCount) * 100;
              return (
                <div key={o.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "white", fontSize: 14, fontWeight: 700 }}>
                    <span>{o.label}</span>
                    <span style={{ color: "#f0b429", fontWeight: 900 }}>{n}</span>
                  </div>
                  <div style={{ marginTop: 6, height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #f0b429, #fbbf24)", borderRadius: 999 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section style={{ ...card, marginTop: 14 }}>
        <div style={sectionLabel}>Responses ({responses.length})</div>
        {responses.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: 13, margin: "10px 0 0" }}>Nobody&apos;s responded yet.</p>
        ) : (
          <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "grid", gap: 8 }}>
            {responses.map((r) => (
              <li key={r.user.id} style={{ padding: "10px 12px", background: "#040d1a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                  <span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>
                    {r.user.firstName} {r.user.lastName}
                  </span>
                  <span style={{ color: "#94a3b8", fontSize: 11 }}>
                    {new Date(r.submittedAt).toLocaleString()}
                  </span>
                </div>
                {r.choiceIds.length > 0 && poll.kind !== "free_text" && (
                  <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 4 }}>
                    {r.choiceIds.map((cid) => poll.options.find((o) => o.id === cid)?.label).filter(Boolean).join(", ")}
                  </div>
                )}
                {r.comment && (
                  <div style={{ color: "#e2e8f0", fontSize: 13, marginTop: 4, fontStyle: "italic", whiteSpace: "pre-wrap" }}>
                    “{r.comment}”
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
        <button type="button" onClick={() => router.push("/admin/polls")} style={cancelBtn}>← All polls</button>
        <button type="button" onClick={toggleOpen} style={poll.open ? warnBtn : goldBtn}>
          {poll.open ? "Close poll" : "Reopen poll"}
        </button>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={remove} style={dangerBtn}>Delete</button>
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "16px 18px" };
const sectionLabel: React.CSSProperties = { color: "#f0b429", fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" };
const cancelBtn: React.CSSProperties = { padding: "10px 18px", background: "transparent", border: "1px solid rgba(255,255,255,0.14)", color: "#cbd5e1", borderRadius: 12, fontFamily: "inherit", fontWeight: 800, fontSize: 13, cursor: "pointer" };
const goldBtn: React.CSSProperties = { padding: "10px 18px", background: "#f0b429", color: "#040d1a", border: 0, borderRadius: 12, fontFamily: "inherit", fontWeight: 900, fontSize: 13, cursor: "pointer" };
const warnBtn: React.CSSProperties = { padding: "10px 18px", background: "rgba(252,165,165,0.10)", color: "#fca5a5", border: "1px solid rgba(252,165,165,0.30)", borderRadius: 12, fontFamily: "inherit", fontWeight: 800, fontSize: 13, cursor: "pointer" };
const dangerBtn: React.CSSProperties = { padding: "10px 18px", background: "transparent", color: "#fca5a5", border: "1px solid rgba(252,165,165,0.30)", borderRadius: 12, fontFamily: "inherit", fontWeight: 800, fontSize: 13, cursor: "pointer" };
