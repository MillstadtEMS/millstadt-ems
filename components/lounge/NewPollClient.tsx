"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Kind = "single_choice" | "multi_choice" | "free_text";

export default function NewPollClient() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<Kind>("single_choice");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [allowComment, setAllowComment] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setOpt(i: number, v: string) {
    setOptions((s) => s.map((x, idx) => (idx === i ? v : x)));
  }
  function addOpt() { setOptions((s) => [...s, ""]); }
  function removeOpt(i: number) { setOptions((s) => s.filter((_, idx) => idx !== i)); }

  async function go() {
    setError(null);
    if (!title.trim()) { setError("Title required."); return; }
    if (kind !== "free_text") {
      const filled = options.map((o) => o.trim()).filter((o) => o.length > 0);
      if (filled.length < 2) { setError("Add at least two options."); return; }
    }
    setBusy(true);
    try {
      const r = await fetch("/api/admin/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          kind,
          options: options.map((o) => o.trim()).filter((o) => o.length > 0),
          allowComment,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error || "Could not create."); return; }
      router.push(`/admin/polls/${d.poll.id}`);
    } finally { setBusy(false); }
  }

  return (
    <div>
      <header style={{ marginBottom: 16, textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "white" }}>New poll</h1>
        <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>
          Each active employee gets one response. Free-text polls collect open feedback.
        </p>
      </header>

      <section style={card}>
        <Field label="Title *">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Which uniform shirt do you prefer?" style={inp} />
        </Field>
        <Field label="Description (optional)">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            placeholder="Context, deadline, anything the crew needs to know." style={{ ...inp, resize: "vertical", minHeight: 70, fontFamily: "inherit" }} />
        </Field>

        <div>
          <div style={fieldLabel}>Response type</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <KindPill active={kind === "single_choice"} onClick={() => setKind("single_choice")}>Pick one</KindPill>
            <KindPill active={kind === "multi_choice"} onClick={() => setKind("multi_choice")}>Pick many</KindPill>
            <KindPill active={kind === "free_text"} onClick={() => setKind("free_text")}>Open-ended</KindPill>
          </div>
        </div>

        {kind !== "free_text" && (
          <div>
            <div style={fieldLabel}>Options</div>
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              {options.map((o, i) => (
                <div key={i} style={{ display: "flex", gap: 8 }}>
                  <input value={o} onChange={(e) => setOpt(i, e.target.value)} placeholder={`Option ${i + 1}`} style={{ ...inp, flex: 1 }} />
                  {options.length > 2 && (
                    <button type="button" onClick={() => removeOpt(i)} style={{ ...ghostBtn, padding: "8px 12px", color: "#fca5a5", borderColor: "rgba(252,165,165,0.30)" }}>×</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addOpt} style={{ ...ghostBtn, alignSelf: "flex-start" }}>+ Add option</button>
            </div>
          </div>
        )}

        <label style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#040d1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, marginTop: 4 }}>
          <input type="checkbox" checked={allowComment} onChange={(e) => setAllowComment(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#f0b429" }} />
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: 13.5 }}>Allow a free-text comment alongside the answer</div>
            <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
              Useful when you want a quick why behind the vote.
            </div>
          </div>
        </label>
      </section>

      {error && (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "rgba(252,165,165,0.10)", border: "1px solid rgba(252,165,165,0.30)", color: "#fca5a5", fontWeight: 700, fontSize: 13 }}>{error}</div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
        <button type="button" onClick={() => router.push("/admin/polls")} style={cancelBtn}>Cancel</button>
        <button type="button" onClick={go} disabled={busy} style={{ ...saveBtn, opacity: busy ? 0.55 : 1 }}>
          {busy ? "Creating…" : "Create poll"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={fieldLabel}>{label}</span>
      {children}
    </label>
  );
}
function KindPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: "8px 16px", borderRadius: 999,
      background: active ? "#f0b429" : "transparent",
      color: active ? "#040d1a" : "#cbd5e1",
      border: `1px solid ${active ? "#f0b429" : "rgba(255,255,255,0.14)"}`,
      fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer",
    }}>
      {children}
    </button>
  );
}
const card: React.CSSProperties = { background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "18px 18px 20px", display: "grid", gap: 14 };
const fieldLabel: React.CSSProperties = { color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" };
const inp: React.CSSProperties = { width: "100%", padding: "13px 14px", background: "#040d1a", border: "1px solid rgba(255,255,255,0.10)", color: "white", borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit" };
const cancelBtn: React.CSSProperties = { padding: "12px 22px", background: "transparent", border: "1px solid rgba(255,255,255,0.14)", color: "#cbd5e1", borderRadius: 12, fontFamily: "inherit", fontWeight: 800, fontSize: 14, cursor: "pointer" };
const saveBtn: React.CSSProperties = { padding: "12px 28px", background: "#f0b429", color: "#040d1a", border: 0, borderRadius: 12, fontFamily: "inherit", fontWeight: 900, fontSize: 14, cursor: "pointer" };
const ghostBtn: React.CSSProperties = { padding: "8px 14px", background: "transparent", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer" };
