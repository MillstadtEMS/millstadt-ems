"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface FormSummary {
  id: string;
  formType: string;
  formLabel: string;
  createdAt: string;
}

export default function PendingFormsWidget() {
  const [pending, setPending] = useState<FormSummary[] | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/lounge/forms", { cache: "no-store" });
      if (!r.ok) { setPending([]); return; }
      const d = await r.json();
      setPending(Array.isArray(d.pending) ? d.pending : []);
    } catch { setPending([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (pending === null || pending.length === 0) return null;
  return (
    <section style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={kicker}>Action needed</span>
        <span style={pill}>{pending.length}</span>
      </div>
      <h2 style={heading}>You have {pending.length} form{pending.length === 1 ? "" : "s"} waiting on your signature</h2>
      <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
        {pending.map((f) => (
          <li key={f.id}>
            <Link href={`/lounge/forms/${f.id}`} style={row}>
              <span style={{ color: "white", fontWeight: 700 }}>{f.formLabel}</span>
              <span style={{ color: "#94a3b8", fontSize: 12, marginLeft: "auto" }}>
                Open →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const card: React.CSSProperties = {
  marginBottom: 16,
  padding: 18,
  background: "linear-gradient(180deg, rgba(56,189,248,0.10), rgba(240,180,41,0.06))",
  border: "1px solid rgba(240,180,41,0.30)",
  borderRadius: 14,
};
const kicker: React.CSSProperties = {
  color: "#f0b429",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  fontFamily: "var(--font-mas-mono), ui-monospace, monospace",
};
const pill: React.CSSProperties = {
  minWidth: 22,
  padding: "2px 8px",
  background: "#ef4444",
  color: "white",
  fontFamily: "var(--font-mas-mono), ui-monospace, monospace",
  fontSize: 11,
  fontWeight: 800,
  borderRadius: 999,
  textAlign: "center",
};
const heading: React.CSSProperties = {
  color: "white",
  fontSize: 16,
  fontWeight: 900,
  letterSpacing: "-0.01em",
  margin: 0,
};
const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 10,
  textDecoration: "none",
  color: "#cbd5e1",
  fontSize: 13.5,
};
