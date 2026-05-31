"use client";

import { useCallback, useEffect, useState } from "react";
import { startRegistration as browserStartRegistration } from "@simplewebauthn/browser";
import { markPasskeyEnrolledOnThisDevice } from "./PasskeyPrompt";

interface Credential {
  id: string;
  credentialId: string;
  deviceLabel: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

function thisDeviceLabel(): string {
  if (typeof navigator === "undefined") return "This device";
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone Face ID";
  if (/iPad/.test(ua)) return "iPad Face ID";
  if (/Android/.test(ua)) return "Android fingerprint";
  if (/Macintosh/.test(ua)) return "Mac Touch ID";
  if (/Windows/.test(ua)) return "Windows Hello";
  return "This device";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function SignInDevices() {
  const [creds, setCreds] = useState<Credential[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<null | { kind: "ok" | "err"; msg: string }>(null);
  const [webauthnSupported, setSupported] = useState(true);

  const load = useCallback(async () => {
    const r = await fetch("/api/lounge/webauthn/credentials", { cache: "no-store" });
    if (!r.ok) { setCreds([]); return; }
    const d = await r.json();
    setCreds(Array.isArray(d.credentials) ? d.credentials : []);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSupported(!!window.PublicKeyCredential);
    load();
  }, [load]);

  async function add() {
    setBusy(true);
    setStatus(null);
    try {
      const startRes = await fetch("/api/lounge/webauthn/register-start", { method: "POST" });
      if (!startRes.ok) {
        setStatus({ kind: "err", msg: "Couldn't start enrollment. Try again." });
        return;
      }
      const { options } = await startRes.json();
      const attested = await browserStartRegistration({ optionsJSON: options });
      const finishRes = await fetch("/api/lounge/webauthn/register-finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: attested, deviceLabel: thisDeviceLabel() }),
      });
      if (!finishRes.ok) {
        const d = await finishRes.json().catch(() => ({}));
        setStatus({ kind: "err", msg: d.error || "Enrollment failed." });
        return;
      }
      setStatus({ kind: "ok", msg: "Added. You can sign in with biometrics on this device next time." });
      // Mark this device as enrolled so the global PasskeyPrompt banner
      // stops appearing here. Multi-device still works — other phones /
      // tablets / laptops keep their own flag and prompt independently.
      markPasskeyEnrolledOnThisDevice();
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Cancelled.";
      // Browser cancellation isn't an error worth surfacing.
      if (!/NotAllowed|cancel/i.test(msg)) setStatus({ kind: "err", msg });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, label: string) {
    if (!confirm(`Remove ${label}? You'll need to sign in with your password + 2FA on that device next time.`)) return;
    const r = await fetch(`/api/lounge/webauthn/credentials?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!r.ok) {
      setStatus({ kind: "err", msg: "Could not remove that device. Try again." });
      return;
    }
    setStatus({ kind: "ok", msg: "Device removed." });
    await load();
  }

  return (
    <section style={card}>
      <header style={{ marginBottom: 14 }}>
        <div style={kicker}>Security</div>
        <h2 style={heading}>Sign-in devices</h2>
        <p style={lede}>
          Add Face ID, Touch ID, or fingerprint sign-in for every device you use to access the
          lounge. You can have as many as you want — your laptop, phone, tablet, work computer.
          Each one is independent.
        </p>
      </header>

      {!webauthnSupported && (
        <div style={notice}>
          This browser doesn&apos;t support biometric sign-in. Try Safari on iOS / macOS, or
          Chrome on Android / Windows.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {creds === null ? (
          <div style={emptyMuted}>Loading…</div>
        ) : creds.length === 0 ? (
          <div style={emptyMuted}>No biometric sign-in set up yet on any device.</div>
        ) : (
          creds.map((c) => (
            <div key={c.id} style={row}>
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                <div style={{ color: "white", fontWeight: 800, fontSize: 14 }}>
                  {c.deviceLabel ?? "Unnamed device"}
                </div>
                <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
                  Added {fmtDate(c.createdAt)}
                  {c.lastUsedAt ? ` · last used ${fmtDate(c.lastUsedAt)}` : " · never used"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(c.id, c.deviceLabel ?? "this device")}
                style={removeBtn}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={add}
        disabled={busy || !webauthnSupported}
        style={{ ...addBtn, opacity: busy || !webauthnSupported ? 0.5 : 1, cursor: busy || !webauthnSupported ? "not-allowed" : "pointer" }}
      >
        {busy ? "Enrolling…" : `Add this device (${thisDeviceLabel()})`}
      </button>

      {status && (
        <div
          role="status"
          style={{
            marginTop: 12,
            color: status.kind === "ok" ? "#86efac" : "#fca5a5",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {status.msg}
        </div>
      )}
    </section>
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
  fontSize: 22,
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
const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 12px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 12,
};
const addBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 16px",
  background: "#f0b429",
  color: "#040d1a",
  border: 0,
  borderRadius: 11,
  fontWeight: 900,
  fontSize: 13,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  fontFamily: "inherit",
};
const removeBtn: React.CSSProperties = {
  padding: "8px 12px",
  background: "transparent",
  color: "#fca5a5",
  border: "1px solid rgba(239,68,68,0.30)",
  borderRadius: 10,
  fontWeight: 800,
  fontSize: 11,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
};
const emptyMuted: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
  padding: "8px 0",
};
const notice: React.CSSProperties = {
  marginBottom: 14,
  padding: "10px 12px",
  background: "rgba(239,68,68,0.10)",
  border: "1px solid rgba(239,68,68,0.30)",
  color: "#fecaca",
  fontSize: 12.5,
  borderRadius: 10,
};
