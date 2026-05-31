"use client";

/**
 * Crew-facing forms hub. Pulls /api/lounge/forms which returns four
 * lists:
 *   - pending: admin-pushed forms awaiting employee signature
 *   - drafts:  forms the employee has started themselves
 *   - visible: finalized forms shared with the employee
 *   - startable: catalog of form types this employee can start
 *
 * Hydration-safe (renders nothing until mounted).
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface FormItem {
  id: string;
  formType: string;
  formLabel: string;
  status: "draft" | "finalized" | "rescinded";
  createdAt: string;
  finalizedAt: string | null;
  pdfUrl: string | null;
}
interface StartableItem {
  id: string;
  label: string;
  blurb: string;
  confidentiality: "open" | "confidential_hr" | "confidential_medical";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function EmployeeFormsHub() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [pending, setPending] = useState<FormItem[]>([]);
  const [drafts, setDrafts] = useState<FormItem[]>([]);
  const [visible, setVisible] = useState<FormItem[]>([]);
  const [startable, setStartable] = useState<StartableItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/lounge/forms", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      setPending(Array.isArray(d.pending) ? d.pending : []);
      setDrafts(Array.isArray(d.drafts) ? d.drafts : []);
      setVisible(Array.isArray(d.visible) ? d.visible : []);
      setStartable(Array.isArray(d.startable) ? d.startable : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { setMounted(true); load(); }, [load]);

  async function start(formType: string) {
    setBusy(formType);
    setError(null);
    try {
      const r = await fetch("/api/lounge/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formType }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d?.error ?? "Could not start that form."); return; }
      router.push(`/lounge/forms/${d.form.id}`);
    } finally {
      setBusy(null);
    }
  }

  if (!mounted) return null;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Action needed */}
      {pending.length > 0 && (
        <Card kicker="Action needed" title={`Awaiting your signature (${pending.length})`} accent="amber">
          <ul style={list}>
            {pending.map((p) => (
              <li key={p.id}>
                <Link href={`/lounge/forms/${p.id}`} style={row}>
                  <span style={{ flex: 1, color: "white", fontWeight: 800, fontSize: 14 }}>{p.formLabel}</span>
                  <span style={{ color: "#94a3b8", fontSize: 12, marginRight: 8 }}>Sent {fmtDate(p.createdAt)}</span>
                  <span style={chip("amber")}>Open & sign</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Your drafts */}
      {drafts.length > 0 && (
        <Card kicker="In progress" title="Forms you've started" accent="sky">
          <ul style={list}>
            {drafts.map((d) => (
              <li key={d.id}>
                <Link href={`/lounge/forms/${d.id}`} style={row}>
                  <span style={{ flex: 1, color: "white", fontWeight: 800, fontSize: 14 }}>{d.formLabel}</span>
                  <span style={{ color: "#94a3b8", fontSize: 12, marginRight: 8 }}>Saved {fmtDate(d.createdAt)}</span>
                  <span style={chip("sky")}>Continue</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Startable */}
      {startable.length > 0 && (
        <Card kicker="Submit something" title="Forms you can start" accent="gold">
          {error && <div style={errorBox}>{error}</div>}
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            {startable.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => start(s.id)}
                disabled={busy === s.id}
                style={tile}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>{s.label}</span>
                  {s.confidentiality !== "open" && (
                    <span style={confidentialPill}>
                      {s.confidentiality === "confidential_medical" ? "Medical · confidential" : "Confidential"}
                    </span>
                  )}
                </div>
                <div style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.5 }}>{s.blurb}</div>
                <div style={{ marginTop: 10, color: "#f0b429", fontSize: 11, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  {busy === s.id ? "Opening…" : "Start →"}
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Signed history */}
      {visible.length > 0 && (
        <Card kicker="On file" title="Signed records shared with you" accent="emerald">
          <ul style={list}>
            {visible.map((v) => (
              <li key={v.id}>
                {v.pdfUrl ? (
                  <a href={v.pdfUrl} target="_blank" rel="noopener noreferrer" style={row}>
                    <span style={{ flex: 1, color: "white", fontWeight: 700, fontSize: 14 }}>{v.formLabel}</span>
                    <span style={{ color: "#94a3b8", fontSize: 12, marginRight: 8 }}>Signed {fmtDate(v.finalizedAt)}</span>
                    <span style={chip("emerald")}>Open PDF</span>
                  </a>
                ) : (
                  <div style={row}>
                    <span style={{ flex: 1, color: "white", fontWeight: 700, fontSize: 14 }}>{v.formLabel}</span>
                    <span style={{ color: "#94a3b8", fontSize: 12 }}>Signed {fmtDate(v.finalizedAt)}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {pending.length === 0 && drafts.length === 0 && startable.length === 0 && visible.length === 0 && (
        <Card kicker="Forms" title="Nothing here yet" accent="gold">
          <p style={{ color: "#cbd5e1", fontSize: 13.5 }}>
            When leadership sends you something to sign, or you submit a form yourself, it shows up
            on this page.
          </p>
        </Card>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

type Accent = "amber" | "sky" | "emerald" | "gold";

function accentColor(a: Accent): string {
  return a === "amber" ? "#fbbf24" : a === "sky" ? "#7dd3fc" : a === "emerald" ? "#34d399" : "#f0b429";
}

function Card({ kicker, title, accent, children }: { kicker: string; title: string; accent: Accent; children: React.ReactNode }) {
  return (
    <section style={{
      padding: 20,
      background: "rgba(7,20,40,0.55)",
      border: `1px solid rgba(255,255,255,0.08)`,
      borderRadius: 16,
    }}>
      <header style={{ marginBottom: 12 }}>
        <div style={{
          color: accentColor(accent),
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          fontFamily: "var(--font-mas-mono), ui-monospace, monospace",
        }}>{kicker}</div>
        <h2 style={{
          color: "white",
          fontSize: 20,
          fontWeight: 900,
          letterSpacing: "-0.015em",
          margin: "4px 0 0",
        }}>{title}</h2>
      </header>
      {children}
    </section>
  );
}

function chip(accent: Accent): React.CSSProperties {
  return {
    padding: "5px 10px",
    background: accentColor(accent),
    color: "#040d1a",
    fontWeight: 900,
    fontSize: 10,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    borderRadius: 8,
  };
}

const list: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "grid",
  gap: 6,
};
const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "10px 12px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 10,
  textDecoration: "none",
  color: "#cbd5e1",
};
const tile: React.CSSProperties = {
  textAlign: "left",
  padding: 14,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  color: "white",
  cursor: "pointer",
  fontFamily: "inherit",
};
const confidentialPill: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 900,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  background: "rgba(239,68,68,0.15)",
  color: "#fca5a5",
  border: "1px solid rgba(239,68,68,0.35)",
  padding: "2px 6px",
  borderRadius: 4,
};
const errorBox: React.CSSProperties = {
  marginBottom: 10,
  padding: "8px 12px",
  background: "rgba(239,68,68,0.10)",
  border: "1px solid rgba(239,68,68,0.30)",
  borderRadius: 10,
  color: "#fecaca",
  fontSize: 13,
};
