"use client";

import { useEffect, useState } from "react";
import { startRegistration as browserStartRegistration } from "@simplewebauthn/browser";

/**
 * Shows a one-time "Enable Face ID / Touch ID for next time?" banner the
 * first time a logged-in user lands on the lounge without any passkeys
 * enrolled. Banner persists dismissal in localStorage so we don't nag.
 */
export default function PasskeyPrompt() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<null | { kind: "ok" | "err"; msg: string }>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.PublicKeyCredential) return;
    if (window.localStorage.getItem("lounge.passkeyDismissed") === "1") return;
    (async () => {
      try {
        const r = await fetch("/api/lounge/webauthn/credentials");
        if (!r.ok) return;
        const d = await r.json();
        if (Array.isArray(d.credentials) && d.credentials.length === 0) setShow(true);
      } catch { /* ignore */ }
    })();
  }, []);

  function dismiss() {
    setShow(false);
    try { window.localStorage.setItem("lounge.passkeyDismissed", "1"); } catch { /* ignore */ }
  }

  async function enable() {
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
      const label = navigator.userAgent.match(/iPhone|iPad/) ? "iPhone Face ID"
                  : navigator.userAgent.match(/Android/) ? "Android fingerprint"
                  : navigator.userAgent.match(/Mac/) ? "Mac Touch ID"
                  : "This device";
      const finishRes = await fetch("/api/lounge/webauthn/register-finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: attested, deviceLabel: label }),
      });
      if (!finishRes.ok) {
        const d = await finishRes.json().catch(() => ({}));
        setStatus({ kind: "err", msg: d.error || "Enrollment failed." });
        return;
      }
      setStatus({ kind: "ok", msg: "Saved. You can sign in with biometrics next time." });
      setTimeout(dismiss, 1800);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Cancelled.";
      if (!/NotAllowed|cancel/i.test(msg)) setStatus({ kind: "err", msg });
    } finally {
      setBusy(false);
    }
  }

  if (!show) return null;
  return (
    <div style={{
      marginBottom: 16,
      padding: "14px 16px",
      background: "linear-gradient(180deg, rgba(56,189,248,0.10), rgba(240,180,41,0.08))",
      border: "1px solid rgba(240,180,41,0.35)",
      borderRadius: 14,
      display: "flex",
      gap: 14,
      alignItems: "center",
      flexWrap: "wrap",
    }}>
      <span style={{ fontSize: 26 }} aria-hidden>🔓</span>
      <div style={{ flex: "1 1 200px", minWidth: 0 }}>
        <div style={{ fontWeight: 900, fontSize: 14, color: "white" }}>
          Sign in with Face ID / fingerprint next time?
        </div>
        <div style={{ color: "#cbd5e1", fontSize: 12.5, marginTop: 3 }}>
          Saves you from typing your password and 2FA every time on this device.
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={dismiss} style={ghost}>Not now</button>
        <button type="button" onClick={enable} disabled={busy} style={primary}>
          {busy ? "Enrolling…" : "Enable"}
        </button>
      </div>
      {status && (
        <div style={{ width: "100%", color: status.kind === "ok" ? "#86efac" : "#fca5a5", fontSize: 12.5, fontWeight: 700 }}>
          {status.msg}
        </div>
      )}
    </div>
  );
}

const primary: React.CSSProperties = {
  padding: "8px 16px",
  background: "#f0b429",
  color: "#040d1a",
  border: 0,
  borderRadius: 10,
  fontWeight: 900,
  fontSize: 12,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
};
const ghost: React.CSSProperties = {
  padding: "8px 14px",
  background: "transparent",
  color: "#94a3b8",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 10,
  fontWeight: 800,
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
};
