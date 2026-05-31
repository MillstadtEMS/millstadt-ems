"use client";

import { useEffect, useMemo, useState } from "react";
import { startAuthentication as browserStartAuthentication } from "@simplewebauthn/browser";

interface TickerCall {
  id: string;
  eventNumber: string | null;
  dispatchDatetime: string | null;
  dispatchDate: string;
  dispatchTime: string;
  dispatchNature: string;
  sourceYear: number;
  completedAt: string | null;
  createdAt: string | null;
}

function todayLocal() {
  const d = new Date();
  return d.toLocaleDateString("en-CA");
}

function nowTimeLocal() {
  const d = new Date();
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function shortDate(value: string) {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return value.slice(0, 5);
  return value;
}

function timeAgo(input: string | null) {
  if (!input) return "Just now";
  const diff = Math.max(0, Date.now() - new Date(input).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function TickerControlLogin() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && !!window.PublicKeyCredential);
  }, []);

  async function signIn() {
    setBusy(true);
    setError("");
    try {
      // Omit the username so WebAuthn does a fully-discoverable sign-in:
      // each iPhone shows whichever passkey it has registered. That lets
      // KJ AND any other granted ticker editor (e.g. Dylan) use the same
      // Face ID button without us hard-coding a single username.
      const startRes = await fetch("/api/lounge/webauthn/assert-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!startRes.ok) {
        setError("Face ID sign-in is not available yet. Open the Lounge once and add a passkey under Sign-in & Devices.");
        return;
      }
      const { options } = await startRes.json();
      const asserted = await browserStartAuthentication({ optionsJSON: options });
      const finishRes = await fetch("/api/lounge/webauthn/assert-finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: asserted }),
      });
      const data = await finishRes.json().catch(() => ({}));
      if (!finishRes.ok) {
        setError(data.error || "Face ID sign-in failed.");
        return;
      }
      window.location.reload();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Face ID sign-in was cancelled.";
      if (!/notallowed|cancel/i.test(msg)) setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="ticker-control-page">
      <style>{TICKER_CONTROL_CSS}</style>
      <section className="ticker-login-card">
        <BrandMark />
        <span className="ticker-kicker">Ticker Editor</span>
        <h1>Live Ticker Control</h1>
        <p>
          Save this page to your home screen for quick updates to the live call ticker without opening the full Lounge.
        </p>
        <button className="ticker-primary-button" type="button" onClick={signIn} disabled={!supported || busy}>
          <LockIcon />
          {busy ? "Opening Face ID..." : supported ? "Sign in with Face ID" : "Face ID unavailable"}
        </button>
        {error && <div className="ticker-error">{error}</div>}
        <a className="ticker-primary-link" href="/lounge/login?next=/lounge/ticker-control">Use full Lounge login</a>
        <p className="ticker-fineprint">
          Face ID uses whichever passkey this device has registered. Don't have one yet? Sign in via the full Lounge login first and add a passkey under <strong>Sign-in &amp; Devices</strong>.
        </p>
        <InstallHint />
      </section>
    </main>
  );
}

export function TickerControlDenied() {
  return (
    <main className="ticker-control-page">
      <style>{TICKER_CONTROL_CSS}</style>
      <section className="ticker-login-card">
        <BrandMark />
        <span className="ticker-kicker">Restricted</span>
        <h1>This account doesn't have ticker access.</h1>
        <p>Ticker editing is granted per-employee by an administrator. Ask leadership to flip the <code>can_edit_ticker</code> flag on your account.</p>
        <a className="ticker-primary-link" href="/lounge">Back to Lounge</a>
      </section>
    </main>
  );
}

export default function TickerControlClient({ firstName }: { firstName: string }) {
  const [calls, setCalls] = useState<TickerCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [draftEvent, setDraftEvent] = useState("");
  const [status, setStatus] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({
    dispatchDate: todayLocal(),
    dispatchTime: nowTimeLocal(),
    dispatchNature: "",
    eventNumber: "",
    active: true,
  });

  const active = useMemo(() => calls.filter((call) => !call.completedAt), [calls]);
  const recent = useMemo(() => calls.filter((call) => call.completedAt).slice(0, 8), [calls]);

  async function load({ quiet = false } = {}) {
    if (!quiet) setLoading(true);
    const res = await fetch("/api/lounge/ticker-control/calls", { cache: "no-store" });
    if (res.status === 401 || res.status === 403) {
      window.location.reload();
      return;
    }
    const data = await res.json();
    setCalls(Array.isArray(data.calls) ? data.calls : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = window.setInterval(() => load({ quiet: true }), 15_000);
    return () => window.clearInterval(id);
  }, []);

  function startEdit(call: TickerCall) {
    setEditingId(call.id);
    setDraft(call.dispatchNature);
    setDraftEvent(call.eventNumber ?? "");
    setStatus("");
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft("");
    setDraftEvent("");
  }

  async function saveEdit(id: string) {
    if (!draft.trim()) return;
    setBusyId(id);
    setStatus("");
    const res = await fetch("/api/lounge/ticker-control/calls", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, dispatchNature: draft.trim(), eventNumber: draftEvent.trim() }),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus(data.error || "Could not save ticker text.");
      return;
    }
    setEditingId(null);
    setDraft("");
    setDraftEvent("");
    setStatus("Saved. Public ticker will pick it up on its next refresh.");
    await load({ quiet: true });
  }

  async function setActive(call: TickerCall, activeNext: boolean) {
    setBusyId(call.id);
    setStatus("");
    const res = await fetch("/api/lounge/ticker-control/calls", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: call.id, active: activeNext }),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus(data.error || "Could not update ticker visibility.");
      return;
    }
    setStatus(activeNext ? "Showing on the live ticker." : "Removed from the live ticker.");
    await load({ quiet: true });
  }

  async function addCall() {
    if (!addForm.dispatchNature.trim()) return;
    setAdding(true);
    setStatus("");
    const res = await fetch("/api/lounge/ticker-control/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    setAdding(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setStatus(data.error || "Could not add ticker item.");
      return;
    }
    setShowAdd(false);
    setAddForm({ dispatchDate: todayLocal(), dispatchTime: nowTimeLocal(), dispatchNature: "", eventNumber: "", active: true });
    setStatus("Added. Public ticker will pick it up on its next refresh.");
    await load({ quiet: true });
  }

  async function removeCall(id: string) {
    if (!window.confirm("Delete this ticker/log item?")) return;
    setBusyId(id);
    setStatus("");
    const res = await fetch("/api/lounge/ticker-control/calls", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setBusyId(null);
    if (!res.ok) {
      setStatus("Could not delete item.");
      return;
    }
    setStatus("Deleted.");
    await load({ quiet: true });
  }

  return (
    <main className="ticker-control-page">
      <style>{TICKER_CONTROL_CSS}</style>
      <section className="ticker-control-shell">
        <header className="ticker-hero">
          <div className="ticker-hero-copy">
            <span className="ticker-kicker">Live command shortcut</span>
            <h1>Ticker Control</h1>
            <p>Hey {firstName}. Change only the call-log record that feeds the public ticker. The ticker component and CAD polling stay untouched.</p>
          </div>
          <div className="ticker-metrics" aria-label="Ticker summary">
            <Metric label="Live" value={active.length} tone="red" />
            <Metric label="Year" value={calls.length} tone="gold" />
            <Metric label="Sync" value="30s" tone="cyan" />
          </div>
        </header>

        <div className="ticker-action-row">
          <button className="ticker-primary-button" type="button" onClick={() => setShowAdd((v) => !v)}>
            <PlusIcon />
            {showAdd ? "Close new item" : "Add ticker item"}
          </button>
          <button className="ticker-ghost-button" type="button" onClick={() => load()}>
            <RefreshIcon />
            Refresh
          </button>
        </div>

        {status && <div className="ticker-status">{status}</div>}

        {showAdd && (
          <section className="ticker-panel">
            <span className="ticker-kicker">New ticker item</span>
            <label>
              <span>Ticker text</span>
              <textarea
                autoFocus
                rows={3}
                value={addForm.dispatchNature}
                onChange={(e) => setAddForm((f) => ({ ...f, dispatchNature: e.target.value }))}
                placeholder="Example: Medical Emergency"
              />
            </label>
            <div className="ticker-form-grid">
              <label>
                <span>Date</span>
                <input type="date" value={addForm.dispatchDate} onChange={(e) => setAddForm((f) => ({ ...f, dispatchDate: e.target.value }))} />
              </label>
              <label>
                <span>Time</span>
                <input type="time" value={addForm.dispatchTime} onChange={(e) => setAddForm((f) => ({ ...f, dispatchTime: e.target.value }))} />
              </label>
            </div>
            <label>
              <span>Event number</span>
              <input value={addForm.eventNumber} onChange={(e) => setAddForm((f) => ({ ...f, eventNumber: e.target.value }))} placeholder="Optional" />
            </label>
            <label className="ticker-check">
              <input type="checkbox" checked={addForm.active} onChange={(e) => setAddForm((f) => ({ ...f, active: e.target.checked }))} />
              <span>Show on the public ticker immediately</span>
            </label>
            <button className="ticker-primary-button" type="button" onClick={addCall} disabled={adding || !addForm.dispatchNature.trim()}>
              {adding ? "Saving..." : "Save item"}
            </button>
          </section>
        )}

        <section className="ticker-section">
          <div className="ticker-section-head">
            <span className="ticker-live-dot" aria-hidden />
            <h2>Showing now</h2>
          </div>
          {loading ? (
            <div className="ticker-empty">Loading ticker records...</div>
          ) : active.length === 0 ? (
            <div className="ticker-empty">Nothing is currently marked live.</div>
          ) : (
            <div className="ticker-card-list">
              {active.map((call) => (
                <TickerCard
                  key={call.id}
                  call={call}
                  live
                  editing={editingId === call.id}
                  draft={draft}
                  draftEvent={draftEvent}
                  busy={busyId === call.id}
                  onDraft={setDraft}
                  onDraftEvent={setDraftEvent}
                  onEdit={() => startEdit(call)}
                  onSave={() => saveEdit(call.id)}
                  onCancel={cancelEdit}
                  onHide={() => setActive(call, false)}
                  onShow={() => setActive(call, true)}
                  onDelete={() => removeCall(call.id)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="ticker-section">
          <div className="ticker-section-head muted">
            <span aria-hidden />
            <h2>Recent log</h2>
          </div>
          {recent.length === 0 ? (
            <div className="ticker-empty">No completed items in the current-year log.</div>
          ) : (
            <div className="ticker-card-list">
              {recent.map((call) => (
                <TickerCard
                  key={call.id}
                  call={call}
                  live={false}
                  editing={editingId === call.id}
                  draft={draft}
                  draftEvent={draftEvent}
                  busy={busyId === call.id}
                  onDraft={setDraft}
                  onDraftEvent={setDraftEvent}
                  onEdit={() => startEdit(call)}
                  onSave={() => saveEdit(call.id)}
                  onCancel={cancelEdit}
                  onHide={() => setActive(call, false)}
                  onShow={() => setActive(call, true)}
                  onDelete={() => removeCall(call.id)}
                />
              ))}
            </div>
          )}
        </section>

        <InstallHint />
      </section>
    </main>
  );
}

function TickerCard({
  call,
  live,
  editing,
  draft,
  draftEvent,
  busy,
  onDraft,
  onDraftEvent,
  onEdit,
  onSave,
  onCancel,
  onHide,
  onShow,
  onDelete,
}: {
  call: TickerCall;
  live: boolean;
  editing: boolean;
  draft: string;
  draftEvent: string;
  busy: boolean;
  onDraft: (value: string) => void;
  onDraftEvent: (value: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onHide: () => void;
  onShow: () => void;
  onDelete: () => void;
}) {
  return (
    <article className={`ticker-call-card ${live ? "is-live" : ""}`}>
      {editing ? (
        <div className="ticker-edit-stack">
          <label>
            <span>Ticker text</span>
            <textarea rows={3} value={draft} onChange={(e) => onDraft(e.target.value)} />
          </label>
          <label>
            <span>Event number</span>
            <input value={draftEvent} onChange={(e) => onDraftEvent(e.target.value)} placeholder="Optional" />
          </label>
          <div className="ticker-card-actions">
            <button className="ticker-primary-button" type="button" onClick={onSave} disabled={busy || !draft.trim()}>
              {busy ? "Saving..." : "Save"}
            </button>
            <button className="ticker-ghost-button" type="button" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="ticker-call-top">
            <span className={`ticker-state ${live ? "live" : ""}`}>{live ? "Live" : "Log"}</span>
            <span className="ticker-time">{shortDate(call.dispatchDate)} {call.dispatchTime}</span>
          </div>
          <h3>{call.dispatchNature}</h3>
          <div className="ticker-call-meta">
            {call.eventNumber && <span>{call.eventNumber}</span>}
            <span>{live ? "Showing on ticker" : `Completed ${timeAgo(call.completedAt)}`}</span>
          </div>
          <div className="ticker-card-actions">
            <button className="ticker-ghost-button" type="button" onClick={onEdit}>Edit text</button>
            {live ? (
              <button className="ticker-warn-button" type="button" onClick={onHide} disabled={busy}>
                {busy ? "..." : "Remove live"}
              </button>
            ) : (
              <button className="ticker-primary-button" type="button" onClick={onShow} disabled={busy}>
                {busy ? "..." : "Show live"}
              </button>
            )}
            <button className="ticker-danger-button" type="button" onClick={onDelete} disabled={busy}>Delete</button>
          </div>
        </>
      )}
    </article>
  );
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone: "red" | "gold" | "cyan" }) {
  return (
    <div className={`ticker-metric tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InstallHint() {
  return (
    <aside className="ticker-install">
      <strong>Phone shortcut</strong>
      <span>On iPhone: open this page in Safari, tap Share, then Add to Home Screen. It opens straight back here.</span>
    </aside>
  );
}

function BrandMark() {
  return (
    <div className="ticker-brand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/millstadt-ems/crest.png" alt="Millstadt EMS" />
    </div>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M17 10V8A5 5 0 0 0 7 8v2H5v11h14V10h-2Zm-8 0V8a3 3 0 0 1 6 0v2H9Zm4 7.7V19h-2v-1.3a2 2 0 1 1 2 0Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M17.7 6.3A8 8 0 1 0 20 12h-2a6 6 0 1 1-1.8-4.3L13 11h8V3l-3.3 3.3Z" />
    </svg>
  );
}

const TICKER_CONTROL_CSS = `
.ticker-control-page {
  min-height: 100svh;
  color: white;
  background:
    radial-gradient(620px 420px at 20% -10%, rgba(37,99,235,0.26), transparent 62%),
    radial-gradient(520px 360px at 90% 0%, rgba(240,180,41,0.16), transparent 64%),
    linear-gradient(180deg, #03101f 0%, #02070f 100%);
  padding: max(env(safe-area-inset-top), 18px) 14px max(env(safe-area-inset-bottom), 22px);
}
.ticker-control-shell,
.ticker-login-card {
  width: min(100%, 720px);
  margin: 0 auto;
}
.ticker-login-card {
  min-height: calc(100svh - 40px);
  display: grid;
  align-content: center;
  justify-items: center;
  text-align: center;
  gap: 14px;
}
.ticker-brand {
  width: 132px;
  height: 132px;
  display: grid;
  place-items: center;
  filter: drop-shadow(0 18px 42px rgba(0,0,0,0.56)) drop-shadow(0 0 34px rgba(96,165,250,0.32));
}
.ticker-brand img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.ticker-kicker {
  color: #f0b429;
  font-family: var(--mas-font-mono), ui-monospace, monospace;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.19em;
  text-transform: uppercase;
}
.ticker-login-card h1,
.ticker-hero h1 {
  margin: 0;
  color: white;
  font-size: clamp(2.4rem, 13vw, 4.9rem);
  line-height: 0.9;
  letter-spacing: -0.055em;
  font-weight: 950;
}
.ticker-login-card p,
.ticker-hero p {
  margin: 0;
  max-width: 42rem;
  color: #cbd5e1;
  font-size: 1rem;
  line-height: 1.55;
}
.ticker-primary-button,
.ticker-primary-link,
.ticker-ghost-button,
.ticker-warn-button,
.ticker-danger-button {
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border-radius: 14px;
  border: 1px solid transparent;
  padding: 0 16px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
}
.ticker-primary-button,
.ticker-primary-link {
  background: #f0b429;
  color: #03101f;
  box-shadow: 0 14px 32px rgba(240,180,41,0.18);
}
.ticker-primary-button:disabled,
.ticker-ghost-button:disabled,
.ticker-warn-button:disabled,
.ticker-danger-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.ticker-primary-button svg,
.ticker-ghost-button svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}
.ticker-ghost-button {
  background: rgba(255,255,255,0.05);
  color: #dbeafe;
  border-color: rgba(255,255,255,0.12);
}
.ticker-warn-button {
  background: rgba(240,180,41,0.08);
  color: #f0b429;
  border-color: rgba(240,180,41,0.26);
}
.ticker-danger-button {
  background: rgba(248,113,113,0.08);
  color: #fca5a5;
  border-color: rgba(248,113,113,0.24);
}
.ticker-subtle-link {
  color: #94a3b8;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}
.ticker-fineprint {
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
  margin: 0;
  text-align: center;
}
.ticker-fineprint code {
  background: rgba(255,255,255,0.08);
  padding: 1px 5px;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
  font-size: 11px;
}
.ticker-error,
.ticker-status {
  width: 100%;
  border-radius: 14px;
  padding: 12px 14px;
  font-size: 13px;
  font-weight: 700;
}
.ticker-error {
  color: #fecaca;
  background: rgba(248,113,113,0.10);
  border: 1px solid rgba(248,113,113,0.24);
}
.ticker-status {
  color: #dbeafe;
  background: rgba(56,189,248,0.08);
  border: 1px solid rgba(56,189,248,0.20);
}
.ticker-install {
  width: 100%;
  display: grid;
  gap: 4px;
  margin-top: 10px;
  padding: 14px;
  border-radius: 16px;
  background: rgba(255,255,255,0.045);
  border: 1px solid rgba(255,255,255,0.09);
  color: #94a3b8;
  text-align: left;
  font-size: 12.5px;
  line-height: 1.45;
}
.ticker-install strong {
  color: white;
  font-size: 13px;
}
.ticker-hero {
  position: relative;
  overflow: hidden;
  display: grid;
  gap: 18px;
  padding: 22px;
  border-radius: 28px;
  background:
    linear-gradient(135deg, rgba(37,99,235,0.36), rgba(2,9,18,0.90) 58%, rgba(240,180,41,0.13)),
    #071428;
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: 0 28px 78px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.08);
}
.ticker-hero::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: linear-gradient(90deg, black, transparent 72%);
  pointer-events: none;
}
.ticker-hero-copy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10px;
}
.ticker-metrics {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 9px;
}
.ticker-metric {
  min-width: 0;
  display: grid;
  gap: 2px;
  padding: 11px 12px;
  border-radius: 18px;
  background: rgba(2,9,18,0.58);
  border: 1px solid rgba(255,255,255,0.10);
}
.ticker-metric span {
  color: #94a3b8;
  font-family: var(--mas-font-mono), ui-monospace, monospace;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.ticker-metric strong {
  color: white;
  font-size: 1.28rem;
  line-height: 1;
  font-weight: 950;
}
.ticker-metric.tone-red strong { color: #fca5a5; }
.ticker-metric.tone-gold strong { color: #f0b429; }
.ticker-metric.tone-cyan strong { color: #7dd3fc; }
.ticker-action-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  margin: 14px 0;
}
.ticker-panel,
.ticker-call-card,
.ticker-empty {
  border-radius: 22px;
  background: rgba(7,20,40,0.78);
  border: 1px solid rgba(255,255,255,0.09);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
}
.ticker-panel {
  display: grid;
  gap: 12px;
  padding: 16px;
  margin-bottom: 18px;
}
.ticker-panel label,
.ticker-edit-stack label {
  display: grid;
  gap: 7px;
}
.ticker-panel label span,
.ticker-edit-stack label span {
  color: #94a3b8;
  font-family: var(--mas-font-mono), ui-monospace, monospace;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.13em;
  text-transform: uppercase;
}
.ticker-panel input,
.ticker-panel textarea,
.ticker-edit-stack input,
.ticker-edit-stack textarea {
  width: 100%;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 15px;
  background: rgba(2,9,18,0.70);
  color: white;
  padding: 13px 14px;
  font: inherit;
  outline: none;
}
.ticker-panel textarea,
.ticker-edit-stack textarea {
  resize: vertical;
  line-height: 1.45;
}
.ticker-panel input:focus,
.ticker-panel textarea:focus,
.ticker-edit-stack input:focus,
.ticker-edit-stack textarea:focus {
  border-color: rgba(240,180,41,0.55);
  box-shadow: 0 0 0 3px rgba(240,180,41,0.10);
}
.ticker-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.ticker-check {
  grid-template-columns: 22px minmax(0, 1fr);
  align-items: center;
  padding: 12px;
  border-radius: 15px;
  background: rgba(255,255,255,0.035);
  border: 1px solid rgba(255,255,255,0.08);
}
.ticker-check input {
  width: 18px;
  height: 18px;
  padding: 0;
  accent-color: #f0b429;
}
.ticker-check span {
  color: #dbeafe !important;
  font-family: inherit !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
  font-size: 14px !important;
}
.ticker-section {
  display: grid;
  gap: 10px;
  margin-top: 18px;
}
.ticker-section-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ticker-section-head h2 {
  margin: 0;
  color: white;
  font-size: 1rem;
  font-weight: 950;
  letter-spacing: -0.01em;
}
.ticker-section-head.muted h2 {
  color: #cbd5e1;
}
.ticker-live-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #f87171;
  box-shadow: 0 0 0 6px rgba(248,113,113,0.12), 0 0 20px rgba(248,113,113,0.5);
}
.ticker-card-list {
  display: grid;
  gap: 10px;
}
.ticker-call-card {
  display: grid;
  gap: 10px;
  padding: 15px;
}
.ticker-call-card.is-live {
  border-color: rgba(248,113,113,0.26);
  background: linear-gradient(180deg, rgba(127,29,29,0.18), rgba(7,20,40,0.82));
}
.ticker-call-top,
.ticker-call-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}
.ticker-state {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  background: rgba(148,163,184,0.10);
  color: #cbd5e1;
  font-family: var(--mas-font-mono), ui-monospace, monospace;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.ticker-state.live {
  background: rgba(248,113,113,0.12);
  color: #fca5a5;
}
.ticker-time,
.ticker-call-meta {
  color: #94a3b8;
  font-family: var(--mas-font-mono), ui-monospace, monospace;
  font-size: 11px;
}
.ticker-call-card h3 {
  margin: 0;
  color: white;
  font-size: 1.05rem;
  line-height: 1.28;
  font-weight: 900;
}
.ticker-call-meta {
  justify-content: flex-start;
}
.ticker-card-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.ticker-edit-stack {
  display: grid;
  gap: 11px;
}
.ticker-empty {
  padding: 18px;
  color: #94a3b8;
  text-align: center;
}
@media (max-width: 430px) {
  .ticker-control-page { padding-left: 10px; padding-right: 10px; }
  .ticker-hero { padding: 19px; border-radius: 24px; }
  .ticker-login-card h1,
  .ticker-hero h1 { font-size: clamp(2.25rem, 15vw, 4rem); }
  .ticker-action-row { grid-template-columns: 1fr; }
  .ticker-card-actions { grid-template-columns: 1fr; }
}
`;
