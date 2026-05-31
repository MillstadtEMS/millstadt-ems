/**
 * "Request a change" panel that lives on the About Me page. Replaces the
 * inline-edit form. The employee picks a field, optionally types a new
 * value + comments, optionally attaches a file (license photo, etc.),
 * and submits — POST to /api/lounge/profile-change-requests.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface FieldOption { key: string; label: string }

interface PriorRequest {
  id: string;
  fieldLabel: string;
  proposedValue: string | null;
  status: "pending" | "approved" | "denied";
  createdAt: string;
}

export default function RequestProfileChange({ fields }: { fields: FieldOption[] }) {
  const [open, setOpen] = useState(false);
  const [fieldKey, setFieldKey] = useState(fields[0]?.key ?? "");
  const [proposedValue, setProposedValue] = useState("");
  const [comments, setComments] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<null | { kind: "ok" | "err"; text: string }>(null);
  const [history, setHistory] = useState<PriorRequest[] | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch("/api/lounge/profile-change-requests", { cache: "no-store" });
      if (!r.ok) { setHistory([]); return; }
      const d = await r.json();
      setHistory(Array.isArray(d.requests) ? d.requests : []);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  function reset() {
    setFieldKey(fields[0]?.key ?? "");
    setProposedValue("");
    setComments("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    setMsg(null);
  }

  async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      const form = new FormData();
      form.append("fieldKey", fieldKey);
      form.append("proposedValue", proposedValue);
      form.append("comments", comments);
      if (file) form.append("file", file);
      const r = await fetch("/api/lounge/profile-change-requests", { method: "POST", body: form });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg({ kind: "err", text: d?.error ?? "Could not submit your request." });
        return;
      }
      setMsg({ kind: "ok", text: "Submitted. Leadership has been notified and you'll get an email confirmation shortly." });
      reset();
      setOpen(false);
      await loadHistory();
    } catch {
      setMsg({ kind: "err", text: "Could not submit your request." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={card}>
      <header style={{ marginBottom: 12 }}>
        <div style={kicker}>Need something changed?</div>
        <h2 style={heading}>Request an About Me update</h2>
        <p style={lede}>
          About Me information is managed by leadership. To update something — your phone, your
          address, a new driver&apos;s license — submit a request below and admins will review it.
          Attach a photo or document if it&apos;s useful.
        </p>
      </header>

      {!open && (
        <button type="button" onClick={() => setOpen(true)} style={primary}>
          Request a change
        </button>
      )}

      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
          <div>
            <label htmlFor="pcr-field" style={fieldLabel}>What needs to change?</label>
            <select
              id="pcr-field"
              value={fieldKey}
              onChange={(e) => setFieldKey(e.target.value)}
              style={select}
            >
              {fields.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="pcr-value" style={fieldLabel}>New value (optional)</label>
            <input
              id="pcr-value"
              type="text"
              value={proposedValue}
              placeholder="e.g. 618-555-1234"
              onChange={(e) => setProposedValue(e.target.value)}
              style={input}
            />
          </div>

          <div>
            <label htmlFor="pcr-comments" style={fieldLabel}>Comments</label>
            <textarea
              id="pcr-comments"
              value={comments}
              placeholder="Anything leadership should know about the change…"
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              style={textarea}
            />
          </div>

          <div>
            <label style={fieldLabel}>Attachment (optional, up to 10MB)</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={fileBtn}
            />
            {file && (
              <div style={attachmentName}>
                Selected: {file.name} ({Math.round(file.size / 1024)} KB)
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={submit} disabled={busy} style={primary}>
              {busy ? "Submitting…" : "Submit request"}
            </button>
            <button type="button" onClick={() => { setOpen(false); reset(); }} disabled={busy} style={ghost}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {msg && (
        <div style={{ ...statusBox, color: msg.kind === "ok" ? "#86efac" : "#fca5a5" }}>
          {msg.text}
        </div>
      )}

      {history && history.length > 0 && (
        <div style={historyBlock}>
          <div style={fieldLabel}>Your recent requests</div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {history.map((h) => (
              <li key={h.id} style={historyRow}>
                <span style={{ flex: 1 }}>
                  <strong style={{ color: "white" }}>{h.fieldLabel}</strong>
                  {h.proposedValue ? <span style={{ color: "#cbd5e1" }}> → {h.proposedValue}</span> : null}
                  <span style={historyDate}> · {new Date(h.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                </span>
                <StatusPill status={h.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function StatusPill({ status }: { status: PriorRequest["status"] }) {
  const styles: React.CSSProperties = status === "approved"
    ? { background: "rgba(34,197,94,0.15)", color: "#86efac", border: "1px solid rgba(34,197,94,0.35)" }
    : status === "denied"
      ? { background: "rgba(239,68,68,0.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.35)" }
      : { background: "rgba(240,180,41,0.15)", color: "#f0b429", border: "1px solid rgba(240,180,41,0.35)" };
  return (
    <span style={{
      ...styles,
      fontSize: 10,
      fontWeight: 900,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      padding: "3px 8px",
      borderRadius: 999,
    }}>
      {status}
    </span>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  padding: 20,
  background: "rgba(7,20,40,0.55)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
};
const kicker: React.CSSProperties = {
  color: "#f0b429",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  fontFamily: "var(--font-mas-mono), ui-monospace, monospace",
};
const heading: React.CSSProperties = {
  color: "white",
  fontSize: 20,
  fontWeight: 900,
  letterSpacing: "-0.015em",
  margin: "4px 0 6px",
};
const lede: React.CSSProperties = {
  color: "#cbd5e1",
  fontSize: 13.5,
  lineHeight: 1.55,
  margin: 0,
};
const fieldLabel: React.CSSProperties = {
  display: "block",
  color: "#94a3b8",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  marginBottom: 6,
};
const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 10,
  color: "white",
  fontSize: 14,
  fontFamily: "inherit",
};
const select: React.CSSProperties = {
  ...input,
  appearance: "none",
};
const textarea: React.CSSProperties = {
  ...input,
  resize: "vertical",
  lineHeight: 1.5,
};
const fileBtn: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px dashed rgba(255,255,255,0.15)",
  borderRadius: 10,
  color: "#cbd5e1",
  fontSize: 13,
  fontFamily: "inherit",
  cursor: "pointer",
};
const attachmentName: React.CSSProperties = {
  marginTop: 6,
  color: "#94a3b8",
  fontSize: 12,
};
const primary: React.CSSProperties = {
  padding: "10px 18px",
  background: "#f0b429",
  color: "#040d1a",
  border: 0,
  borderRadius: 11,
  fontWeight: 900,
  fontSize: 13,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
};
const ghost: React.CSSProperties = {
  padding: "10px 14px",
  background: "transparent",
  color: "#94a3b8",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 11,
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
};
const statusBox: React.CSSProperties = {
  marginTop: 12,
  padding: "10px 12px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 700,
};
const historyBlock: React.CSSProperties = {
  marginTop: 18,
  paddingTop: 14,
  borderTop: "1px solid rgba(255,255,255,0.06)",
};
const historyRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: 10,
  fontSize: 13,
  color: "#cbd5e1",
};
const historyDate: React.CSSProperties = {
  color: "#64748b",
  marginLeft: 4,
};
