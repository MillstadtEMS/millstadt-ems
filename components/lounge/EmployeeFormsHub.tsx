"use client";

/**
 * Crew-facing forms hub.
 *
 * Behavior the agency wanted:
 *   No forms are directly self-startable by crew. Instead they pick
 *   a form from a dropdown and *request* it. Admins approve (which
 *   spawns the assignment) or deny (with a reason). Once approved,
 *   the assigned form appears in "Awaiting your signature" and is
 *   fillable + signable from there.
 *
 * Lists rendered:
 *   - pending: admin-pushed assignments awaiting employee signature
 *   - drafts:  in-progress drafts
 *   - requests: this employee's own request history
 *   - visible: finalized forms shared with the employee
 *
 * Hydration-safe (renders nothing until mounted).
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface FormItem {
  id: string;
  formType: string;
  formLabel: string;
  status: "draft" | "finalized" | "rescinded";
  createdAt: string;
  finalizedAt: string | null;
  pdfUrl: string | null;
}
interface CatalogItem {
  id: string;
  label: string;
  blurb: string;
}
interface RequestItem {
  id: string;
  formType: string;
  formLabel: string;
  message: string | null;
  status: "pending" | "approved" | "denied";
  deniedReason: string | null;
  createdAt: string;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function EmployeeFormsHub() {
  const [mounted, setMounted] = useState(false);
  const [pending, setPending] = useState<FormItem[]>([]);
  const [drafts, setDrafts] = useState<FormItem[]>([]);
  const [visible, setVisible] = useState<FormItem[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [pick, setPick] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<null | { kind: "ok" | "err"; text: string }>(null);

  const load = useCallback(async () => {
    try {
      const [formsRes, requestsRes] = await Promise.all([
        fetch("/api/lounge/forms", { cache: "no-store" }),
        fetch("/api/lounge/form-requests", { cache: "no-store" }),
      ]);
      if (formsRes.ok) {
        const d = await formsRes.json();
        setPending(Array.isArray(d.pending) ? d.pending : []);
        setDrafts(Array.isArray(d.drafts) ? d.drafts : []);
        setVisible(Array.isArray(d.visible) ? d.visible : []);
      }
      if (requestsRes.ok) {
        const d = await requestsRes.json();
        setRequests(Array.isArray(d.requests) ? d.requests : []);
        setCatalog(Array.isArray(d.catalog) ? d.catalog : []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { setMounted(true); load(); }, [load]);

  // When the sidebar sub-list links to /lounge/forms?request=<formId>
  // we treat that as the user explicitly asking to request that form.
  // We pre-select it so they only have to confirm + (optionally) add a
  // message. Without this query param the form-request panel doesn't
  // render at all — entry happens exclusively through the sidebar.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = new URL(window.location.href);
    const req = u.searchParams.get("request");
    if (req) setPick(req);
  }, []);

  async function submitRequest() {
    if (!pick) { setStatus({ kind: "err", text: "Pick a form to request." }); return; }
    setBusy(true); setStatus(null);
    try {
      const r = await fetch("/api/lounge/form-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formType: pick, message: message.trim() || null }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setStatus({ kind: "err", text: d?.error ?? "Could not submit request." }); return; }
      setStatus({ kind: "ok", text: "Request sent. An administrator will review it shortly." });
      setPick(""); setMessage("");
      // Clean ?request= off the URL so a refresh doesn't relaunch the
      // confirmation panel after a successful send.
      if (typeof window !== "undefined") {
        const u = new URL(window.location.href);
        if (u.searchParams.has("request")) {
          u.searchParams.delete("request");
          window.history.replaceState({}, "", u.toString());
        }
      }
      load();
    } finally {
      setBusy(false);
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

      {/* Confirm-and-send request panel. Only renders when the sidebar
          sub-list has pre-selected a form (?request=<id>). Otherwise
          there is no entry point on this page — the sidebar IS the
          form picker now. */}
      {pick && catalog.find((c) => c.id === pick) && (
        <Card kicker="Confirm request" title={catalog.find((c) => c.id === pick)!.label} accent="gold">
          <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.55, margin: "0 0 10px" }}>
            {catalog.find((c) => c.id === pick)!.blurb}
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>Message (optional)</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder="Anything leadership should know…"
                style={{ ...fieldStyle, resize: "vertical" }}
              />
            </label>
            {status && (
              <div style={{ padding: "10px 12px", borderRadius: 10, fontSize: 13, background: status.kind === "ok" ? "rgba(16,185,129,0.12)" : "rgba(248,113,113,0.12)", color: status.kind === "ok" ? "#34d399" : "#fca5a5" }}>
                {status.text}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" disabled={busy} onClick={submitRequest} style={primaryBtn}>
                {busy ? "Sending…" : "Send request"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setPick("");
                  setMessage("");
                  setStatus(null);
                  if (typeof window !== "undefined") {
                    const u = new URL(window.location.href);
                    u.searchParams.delete("request");
                    window.history.replaceState({}, "", u.toString());
                  }
                }}
                style={{ ...primaryBtn, background: "transparent", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Your request history */}
      {requests.length > 0 && (
        <Card kicker="History" title="Your requests" accent="sky">
          <ul style={list}>
            {requests.map((r) => (
              <li key={r.id} style={{ padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>{r.formLabel}</span>
                  <span style={{ ...requestPill, ...(r.status === "approved" ? requestPillApproved : r.status === "denied" ? requestPillDenied : requestPillPending) }}>
                    {r.status === "approved" ? "Approved — check above" : r.status === "denied" ? "Denied" : "Pending review"}
                  </span>
                  <span style={{ marginLeft: "auto", color: "#94a3b8", fontSize: 12 }}>{fmtDate(r.createdAt)}</span>
                </div>
                {r.message && <div style={{ color: "#cbd5e1", fontSize: 12, marginTop: 4 }}>You wrote: {r.message}</div>}
                {r.status === "denied" && r.deniedReason && <div style={{ color: "#fca5a5", fontSize: 12, marginTop: 4 }}>Reason: {r.deniedReason}</div>}
              </li>
            ))}
          </ul>
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

      {pending.length === 0 && drafts.length === 0 && visible.length === 0 && requests.length === 0 && !pick && (
        <Card kicker="Forms" title="Nothing here yet" accent="gold">
          <p style={{ color: "#cbd5e1", fontSize: 13.5 }}>
            When leadership sends you something to sign, or you request a form from the
            <strong> Forms &amp; Paperwork</strong> menu in the sidebar, it shows up on this page.
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
const fieldStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(4,13,26,0.6)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 10,
  padding: "10px 12px",
  color: "white",
  fontSize: 14,
  fontFamily: "inherit",
};
const primaryBtn: React.CSSProperties = {
  background: "#f0b429",
  color: "#040d1a",
  border: 0,
  padding: "10px 18px",
  borderRadius: 10,
  fontWeight: 900,
  fontSize: 12,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
};
const requestPill: React.CSSProperties = {
  fontSize: 9, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase",
  padding: "3px 8px", borderRadius: 6,
};
const requestPillPending: React.CSSProperties  = { background: "rgba(125,211,252,0.14)", color: "#7dd3fc" };
const requestPillApproved: React.CSSProperties = { background: "rgba(16,185,129,0.16)",  color: "#34d399" };
const requestPillDenied: React.CSSProperties   = { background: "rgba(248,113,113,0.16)", color: "#fca5a5" };
