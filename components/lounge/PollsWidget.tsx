"use client";

import { useEffect, useState } from "react";

interface Option { id: string; label: string }
interface PollForViewer {
  id: string;
  title: string;
  description: string | null;
  kind: "single_choice" | "multi_choice" | "free_text";
  options: Option[];
  allowComment: boolean;
  open: boolean;
  responseCount: number;
  totalEligible: number;
  myResponse: null | { choiceIds: string[]; comment: string | null; submittedAt: string };
}

export default function PollsWidget() {
  const [polls, setPolls] = useState<PollForViewer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/lounge/polls")
      .then((r) => r.ok ? r.json() : { polls: [] })
      .then((d) => { setPolls(Array.isArray(d.polls) ? d.polls : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Only render polls that are open AND I haven't responded to.
  const visible = polls.filter((p) => p.open && !p.myResponse);
  if (loading || visible.length === 0) return null;

  return (
    <section style={{
      marginTop: 14,
      background: "linear-gradient(140deg, rgba(167,139,250,0.10), rgba(56,189,248,0.06))",
      border: "1px solid rgba(167,139,250,0.30)",
      borderLeft: "4px solid #a78bfa",
      borderRadius: 14,
      padding: "16px 18px",
    }}>
      <div style={{ color: "#c4b5fd", fontSize: 10.5, fontWeight: 900, letterSpacing: "0.20em", textTransform: "uppercase", marginBottom: 10 }}>
        Leadership wants your input
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {visible.map((p) => <PollCard key={p.id} poll={p} onResponded={(id) => setPolls((s) => s.map((x) => x.id === id ? { ...x, myResponse: { choiceIds: [], comment: null, submittedAt: new Date().toISOString() } } : x))} />)}
      </div>
    </section>
  );
}

function PollCard({ poll, onResponded }: { poll: PollForViewer; onResponded: (id: string) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    if (poll.kind === "single_choice") setSelected([id]);
    else setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }

  async function submit() {
    setError(null);
    if (poll.kind === "free_text" && !comment.trim()) { setError("Type your answer first."); return; }
    if (poll.kind !== "free_text" && selected.length === 0) { setError("Pick at least one option."); return; }
    setBusy(true);
    try {
      const r = await fetch(`/api/lounge/polls/${poll.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choiceIds: selected, comment: comment.trim() || null }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error || "Could not submit."); return; }
      onResponded(poll.id);
    } finally { setBusy(false); }
  }

  return (
    <article style={{ background: "rgba(2,9,18,0.6)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 900, color: "white" }}>{poll.title}</h3>
        <span style={{ color: "#94a3b8", fontSize: 11 }}>{poll.responseCount} / {poll.totalEligible} responded</span>
      </div>
      {poll.description && (
        <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.55, margin: "8px 0 0" }}>{poll.description}</p>
      )}

      {poll.kind !== "free_text" && (
        <div style={{ display: "grid", gap: 6, marginTop: 12 }}>
          {poll.options.map((o) => {
            const active = selected.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => toggle(o.id)}
                style={{
                  textAlign: "left", padding: "10px 12px",
                  background: active ? "rgba(240,180,41,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${active ? "rgba(240,180,41,0.35)" : "rgba(255,255,255,0.10)"}`,
                  color: "white", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                  fontSize: 14, fontWeight: 700,
                }}
              >
                {active ? "✓ " : ""}{o.label}
              </button>
            );
          })}
        </div>
      )}

      {(poll.kind === "free_text" || poll.allowComment) && (
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder={poll.kind === "free_text" ? "Your answer…" : "Add a comment (optional)…"}
          style={{ width: "100%", marginTop: 10, padding: "10px 12px", background: "#040d1a", border: "1px solid rgba(255,255,255,0.10)", color: "white", borderRadius: 10, fontSize: 13.5, outline: "none", fontFamily: "inherit", resize: "vertical", minHeight: 60 }}
        />
      )}

      {error && (
        <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, background: "rgba(252,165,165,0.10)", border: "1px solid rgba(252,165,165,0.30)", color: "#fca5a5", fontSize: 12, fontWeight: 700 }}>{error}</div>
      )}

      <button type="button" onClick={submit} disabled={busy} style={{
        marginTop: 12, padding: "10px 18px",
        background: busy ? "rgba(240,180,41,0.4)" : "#f0b429",
        color: "#040d1a", border: 0, borderRadius: 10,
        fontFamily: "inherit", fontSize: 13, fontWeight: 900,
        letterSpacing: "0.10em", textTransform: "uppercase",
        cursor: busy ? "wait" : "pointer",
      }}>
        {busy ? "Submitting…" : "Submit response"}
      </button>
    </article>
  );
}
