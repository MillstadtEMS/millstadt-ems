"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Pull a ?next= path off the URL and only honor it if it's a relative
 * path inside the lounge (so an attacker can't redirect to a foreign
 * host via the login screen).
 */
function safeNext(raw: string | null): string {
  if (!raw) return "/lounge";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/lounge";
  if (!raw.startsWith("/lounge")) return "/lounge";
  return raw;
}
import { startAuthentication as browserStartAuthentication } from "@simplewebauthn/browser";

export default function LoungeLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [handingOff, setHandingOff] = useState(false);
  const router = useRouter();
  // Read ?next= from window.location once mounted to avoid the
  // useSearchParams Suspense-bailout that breaks prerender.
  const [next, setNext] = useState<string>("/lounge");
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      setNext(safeNext(u.searchParams.get("next")));
    } catch { /* ignore */ }
  }, []);

  // 2FA state
  const [step, setStep] = useState<"password" | "verify_sms" | "verify_2fa" | "setup_2fa">("password");
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(true);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [phoneTail, setPhoneTail] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [canUseTotp, setCanUseTotp] = useState(false);
  const [resending, setResending] = useState(false);

  // When we transition to setup_2fa, fetch the Microsoft Authenticator
  // otpauth URL + secret, then render the QR client-side so a server-side
  // qrcode failure can never strand the user on "Loading QR…".
  useEffect(() => {
    if (step !== "setup_2fa") return;
    let cancelled = false;
    (async () => {
      setSetupError(null);
      try {
        const r = await fetch("/api/lounge/setup-2fa");
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          if (!cancelled) setSetupError(d.error || `Couldn't load setup (${r.status}). Refresh and try again.`);
          return;
        }
        const d = await r.json();
        if (cancelled) return;
        setSecret(d.secret);
        // Lazy-import qrcode so SSR doesn't bundle it.
        const QR = (await import("qrcode")).default;
        const dataUrl = await QR.toDataURL(d.otpauth, { margin: 1, width: 260, errorCorrectionLevel: "M" });
        if (!cancelled) setQr(dataUrl);
      } catch (err) {
        if (!cancelled) setSetupError(err instanceof Error ? err.message : "Couldn't load setup. Refresh and try again.");
      }
    })();
    return () => { cancelled = true; };
  }, [step]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/lounge/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Sign in failed");
        setLoading(false);
        return;
      }
      if (data.step === "trusted") {
        // Trust cookie matched on the server — skip 2FA entirely.
        try { sessionStorage.setItem("lounge:welcome", "1"); } catch {}
        setHandingOff(true);
        router.push(next);
        return;
      }
      if (data.step === "verify_sms") {
        setStep("verify_sms");
        setPhoneTail(data.phoneTail ?? null);
        setDevCode(data.devCode ?? null);
        setCanUseTotp(!!data.canUseTotp);
      } else if (data.step === "verify_2fa") {
        setStep("verify_2fa");
      } else {
        setStep("setup_2fa");
      }
      setLoading(false);
    } catch {
      setError("Connection error");
      setLoading(false);
    }
  }

  async function resendSms() {
    setResending(true);
    setError("");
    try {
      const r = await fetch("/api/lounge/sms-login-code/send", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error || "Could not send code."); return; }
      setPhoneTail(d.phoneTail ?? phoneTail);
      setDevCode(d.devCode ?? null);
    } finally { setResending(false); }
  }

  async function submitCode(endpoint: string) {
    setError("");
    setLoading(true);
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), trustDevice }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Verification failed");
        setLoading(false);
        return;
      }
      try { sessionStorage.setItem("lounge:welcome", "1"); } catch {}
      setHandingOff(true);
      router.push(next);
    } catch {
      setError("Connection error");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background:
          "radial-gradient(1200px 600px at 50% -10%, rgba(240,180,41,0.07), transparent 60%), #040d1a",
      }}
    >
      {handingOff && (
        // Full-screen black blanket the moment 2FA succeeds. Bridges
        // the gap between this page and the lounge page so the user
        // never sees the dashboard underneath the welcome intro.
        <div
          aria-hidden
          style={{
            position: "fixed", inset: 0, background: "#000", zIndex: 99999,
            pointerEvents: "auto",
          }}
        />
      )}
      <div style={{ width: "min(100%, 400px)", maxWidth: "calc(100vw - 32px)", overflow: "hidden" }}>
        {/* Logo + branding */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "clamp(172px, 54vw, 240px)",
              height: "clamp(172px, 54vw, 240px)",
              marginBottom: 4,
              filter: "drop-shadow(0 18px 40px rgba(0,0,0,0.6)) drop-shadow(0 0 50px rgba(60,120,255,0.40))",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/millstadt-ems/crest.png"
              alt="Millstadt EMS"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
          <h1
            style={{
              color: "white",
              fontWeight: 900,
              fontSize: "1.65rem",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            Employee Lounge
          </h1>
          <p style={{ color: "#f0b429", fontSize: "0.78rem", marginTop: 6, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Virtual Breakroom
          </p>
        </div>

        {step === "password" && (
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username or email"
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              style={inputStyle}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              style={inputStyle}
            />

            {error && <ErrorBanner>{error}</ErrorBanner>}

            <button
              type="submit"
              disabled={loading || !username || !password}
              style={{
                ...buttonStyle,
                opacity: loading || !username || !password ? 0.5 : 1,
                cursor: loading || !username || !password ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Checking…" : "Continue"}
            </button>

            <BiometricSignIn router={router} setError={setError} />
          </form>
        )}

        {step === "verify_sms" && (
          <form
            onSubmit={(e) => { e.preventDefault(); submitCode("/api/lounge/sms-login-code/verify"); }}
            style={{ display: "grid", gap: 14 }}
          >
            <p style={{ color: "#cbd5e1", fontSize: 14, lineHeight: 1.55, margin: 0 }}>
              We just texted a 6-digit code to{" "}
              <strong style={{ color: "#f0b429" }}>(•••) •••-•{phoneTail ?? "••••"}</strong>.
              Enter it below to finish signing in.
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="\d{6}"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              autoFocus
              style={{ ...inputStyle, fontVariantNumeric: "tabular-nums", letterSpacing: "0.42em", textAlign: "center", fontSize: 24, padding: "16px 16px" }}
            />
            {devCode && (
              <div style={{ padding: 10, background: "rgba(240,180,41,0.10)", border: "1px solid rgba(240,180,41,0.30)", borderRadius: 10, textAlign: "center", color: "#cbd5e1", fontSize: 12 }}>
                SMS sender isn&apos;t configured yet — code:{" "}
                <span style={{ color: "#f0b429", fontWeight: 900, letterSpacing: "0.32em", fontSize: 18, marginLeft: 4 }}>{devCode}</span>
              </div>
            )}
            {error && <ErrorBanner>{error}</ErrorBanner>}
            <TrustDeviceCheckbox trustDevice={trustDevice} setTrustDevice={setTrustDevice} />
            <button type="submit" disabled={loading || code.length !== 6} style={{ ...buttonStyle, opacity: loading || code.length !== 6 ? 0.5 : 1, cursor: loading || code.length !== 6 ? "not-allowed" : "pointer" }}>
              {loading ? "Verifying…" : "Verify & sign in"}
            </button>
            <button type="button" onClick={resendSms} disabled={resending} style={ghostBtn}>
              {resending ? "Sending…" : "Resend code"}
            </button>
            {canUseTotp && (
              <button type="button" onClick={() => { setStep("verify_2fa"); setCode(""); setError(""); }} style={{ ...ghostBtn, color: "#94a3b8" }}>
                Use authenticator app instead
              </button>
            )}
            <button type="button" onClick={() => { setStep("password"); setCode(""); setError(""); }} style={{ ...ghostBtn, color: "#64748b" }}>← Back</button>
          </form>
        )}

        {step === "verify_2fa" && (
          <form
            onSubmit={(e) => { e.preventDefault(); submitCode("/api/lounge/verify-2fa"); }}
            style={{ display: "grid", gap: 14 }}
          >
            <p style={{ color: "#cbd5e1", fontSize: 14, lineHeight: 1.55, margin: 0 }}>
              Open <strong style={{ color: "#f0b429" }}>Microsoft Authenticator</strong> and enter the 6-digit code for <strong style={{ color: "#f0b429" }}>Millstadt EMS Employee Lounge</strong>.
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="\d{6}"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              autoFocus
              style={{ ...inputStyle, fontVariantNumeric: "tabular-nums", letterSpacing: "0.42em", textAlign: "center", fontSize: 24, padding: "16px 16px" }}
            />
            {error && <ErrorBanner>{error}</ErrorBanner>}
            <TrustDeviceCheckbox trustDevice={trustDevice} setTrustDevice={setTrustDevice} />
            <button type="submit" disabled={loading || code.length !== 6} style={{ ...buttonStyle, opacity: loading || code.length !== 6 ? 0.5 : 1, cursor: loading || code.length !== 6 ? "not-allowed" : "pointer" }}>
              {loading ? "Verifying…" : "Verify & sign in"}
            </button>
            <button type="button" onClick={() => { setStep("password"); setCode(""); setError(""); }} style={ghostBtn}>← Back</button>
          </form>
        )}

        {step === "setup_2fa" && (
          <form
            onSubmit={(e) => { e.preventDefault(); submitCode("/api/lounge/setup-2fa"); }}
            style={{ display: "grid", gap: 14 }}
          >
            <AuthenticatorSetupGuide />
            {qr ? (
              <div style={{ display: "flex", justifyContent: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="Microsoft Authenticator setup QR code" style={{ width: 230, height: 230, background: "white", borderRadius: 16, padding: 10, boxShadow: "0 18px 42px rgba(0,0,0,0.34)" }} />
              </div>
            ) : setupError ? (
              <ErrorBanner>{setupError}</ErrorBanner>
            ) : (
              <div style={{ color: "#94a3b8", textAlign: "center", padding: 22 }}>Generating QR…</div>
            )}
            {secret && (
              <div style={{ color: "#94a3b8", fontSize: 11, textAlign: "center" }}>
                Can&apos;t scan? In Microsoft Authenticator, choose manual entry and use this secret:<br />
                <code style={{ color: "#f0b429", fontSize: 13, letterSpacing: "0.08em", display: "inline-block", marginTop: 4 }}>{secret}</code>
              </div>
            )}
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="\d{6}"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              style={{ ...inputStyle, fontVariantNumeric: "tabular-nums", letterSpacing: "0.42em", textAlign: "center", fontSize: 24, padding: "16px 16px" }}
            />
            {error && <ErrorBanner>{error}</ErrorBanner>}
            <TrustDeviceCheckbox trustDevice={trustDevice} setTrustDevice={setTrustDevice} />
            <button type="submit" disabled={loading || code.length !== 6} style={{ ...buttonStyle, opacity: loading || code.length !== 6 ? 0.5 : 1, cursor: loading || code.length !== 6 ? "not-allowed" : "pointer" }}>
              {loading ? "Activating…" : "Activate 2FA & sign in"}
            </button>
            <button type="button" onClick={() => { setStep("password"); setCode(""); setError(""); }} style={ghostBtn}>← Back</button>
          </form>
        )}

        <p
          style={{
            color: "#475569",
            fontSize: "0.75rem",
            textAlign: "center",
            marginTop: 22,
            lineHeight: 1.6,
          }}
        >
          Don&apos;t have your password? Contact management.
        </p>

        <DevShortcut />{/* PIN-gated dev shortcut — see /api/lounge/dev-login/route.ts */}
      </div>
    </div>
  );
}

function DevShortcut() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState<"admin" | "employee" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [handingOff, setHandingOff] = useState(false);

  async function login(role: "admin" | "employee") {
    setErr(null);
    setBusy(role);
    try {
      const r = await fetch("/api/lounge/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim(), role }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Login failed"); return; }
      try { sessionStorage.setItem("lounge:welcome", "1"); } catch {}
      setHandingOff(true);
      router.push("/lounge");
    } catch {
      setErr("Connection error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
    {handingOff && (
      <div
        aria-hidden
        style={{ position: "fixed", inset: 0, background: "#000", zIndex: 99999 }}
      />
    )}
    <div
      style={{
        marginTop: 22,
        padding: 14,
        border: "1px dashed rgba(240,180,41,0.25)",
        borderRadius: 12,
        background: "rgba(240,180,41,0.04)",
      }}
    >
      <div style={{ color: "#f0b429", fontSize: 10, fontWeight: 900, letterSpacing: "0.20em", textTransform: "uppercase", marginBottom: 6 }}>
        Dev Shortcut
      </div>
      <p style={{ color: "#94a3b8", fontSize: 12, margin: "0 0 10px" }}>
        Enter the dev PIN to skip 2FA while building.
      </p>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        placeholder="Dev PIN"
        style={{ ...inputStyle, padding: "10px 12px", fontSize: 14, letterSpacing: "0.3em", textAlign: "center" }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          type="button"
          onClick={() => login("admin")}
          disabled={!pin || busy !== null}
          style={{ flex: 1, padding: "10px 12px", background: "#f0b429", color: "#040d1a", border: 0, borderRadius: 10, fontWeight: 900, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", cursor: !pin || busy ? "not-allowed" : "pointer", opacity: !pin || busy ? 0.5 : 1, fontFamily: "inherit" }}
        >
          {busy === "admin" ? "…" : "Admin"}
        </button>
        <button
          type="button"
          onClick={() => login("employee")}
          disabled={!pin || busy !== null}
          style={{ flex: 1, padding: "10px 12px", background: "rgba(255,255,255,0.06)", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, fontWeight: 900, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", cursor: !pin || busy ? "not-allowed" : "pointer", opacity: !pin || busy ? 0.5 : 1, fontFamily: "inherit" }}
        >
          {busy === "employee" ? "…" : "Employee"}
        </button>
      </div>
      {err && (
        <p style={{ color: "#fca5a5", fontSize: 12, marginTop: 8, marginBottom: 0 }}>{err}</p>
      )}
    </div>
    </>
  );
}

function AuthenticatorSetupGuide() {
  const steps = [
    "Install or open Microsoft Authenticator on your phone.",
    "Tap the + button, then choose Other account. Do not choose personal, work, or school Microsoft sign-in for this QR.",
    "Allow camera access if asked, scan the QR code below, then enter the 6-digit code shown for Millstadt EMS Employee Lounge.",
  ];

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        padding: 14,
        borderRadius: 16,
        background:
          "linear-gradient(180deg, rgba(56,189,248,0.10), rgba(7,20,40,0.72))",
        border: "1px solid rgba(56,189,248,0.25)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <div>
        <div style={{ color: "#f0b429", fontSize: 10, fontWeight: 950, letterSpacing: "0.20em", textTransform: "uppercase" }}>
          First-time authenticator setup
        </div>
        <h2 style={{ margin: "5px 0 0", color: "white", fontSize: 18, lineHeight: 1.1, fontWeight: 950 }}>
          Connect Microsoft Authenticator
        </h2>
        <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.5, margin: "8px 0 0" }}>
          The Lounge uses Microsoft Authenticator for rotating 6-digit codes.
          Set it up once, then use the code from the app whenever the Lounge asks.
        </p>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {steps.map((step, index) => (
          <div key={step} style={{ display: "grid", gridTemplateColumns: "28px minmax(0, 1fr)", gap: 10, alignItems: "start" }}>
            <span
              style={{
                width: 28,
                height: 28,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                background: "#f0b429",
                color: "#040d1a",
                fontSize: 12,
                fontWeight: 950,
              }}
            >
              {index + 1}
            </span>
            <span style={{ color: "#dbeafe", fontSize: 13, lineHeight: 1.45 }}>{step}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <a
          href="https://support.microsoft.com/en-us/authenticator/download-microsoft-authenticator"
          target="_blank"
          rel="noopener noreferrer"
          style={authGuideLink}
        >
          Download app
        </a>
        <a
          href="https://apps.apple.com/us/app/microsoft-authenticator/id983156458"
          target="_blank"
          rel="noopener noreferrer"
          style={authGuideLink}
        >
          iPhone
        </a>
        <a
          href="https://play.google.com/store/apps/details?id=com.azure.authenticator"
          target="_blank"
          rel="noopener noreferrer"
          style={authGuideLink}
        >
          Android
        </a>
      </div>
    </div>
  );
}

function TrustDeviceCheckbox({
  trustDevice,
  setTrustDevice,
}: {
  trustDevice: boolean;
  setTrustDevice: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        background: "rgba(56,189,248,0.06)",
        border: "1px solid rgba(56,189,248,0.20)",
        borderRadius: 11,
        color: "#cbd5e1",
        fontSize: 13,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <input
        type="checkbox"
        checked={trustDevice}
        onChange={(e) => setTrustDevice(e.target.checked)}
        style={{ width: 18, height: 18, accentColor: "#f0b429" }}
      />
      <span>
        Trust this device for 365 days.
        <span style={{ color: "#94a3b8", display: "block", fontSize: 11.5, marginTop: 2 }}>
        Skip the 2FA code on this device next time. You can revoke it from <em>Sign-in &amp; Devices</em>.
        </span>
      </span>
    </label>
  );
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(239,68,68,0.10)",
        border: "1px solid rgba(239,68,68,0.25)",
        borderRadius: 12,
        padding: "10px 14px",
        color: "#fca5a5",
        fontSize: "0.875rem",
        fontWeight: 500,
      }}
    >
      {children}
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  border: 0,
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  cursor: "pointer",
  padding: "8px 12px",
  fontFamily: "inherit",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  background: "#071428",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 12,
  color: "white",
  fontSize: "1rem",
  outline: "none",
  fontFamily: "inherit",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  background: "#f0b429",
  color: "#040d1a",
  fontWeight: 900,
  fontSize: "0.95rem",
  borderRadius: 12,
  border: 0,
  transition: "background 0.2s",
  fontFamily: "inherit",
};

const authGuideLink: React.CSSProperties = {
  minHeight: 34,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#f0b429",
  textDecoration: "none",
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
};

function BiometricSignIn({
  router,
  setError,
}: {
  router: ReturnType<typeof useRouter>;
  setError: (msg: string) => void;
}) {
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.PublicKeyCredential) {
      setSupported(true);
    }
  }, []);

  async function go() {
    setBusy(true);
    setError("");
    try {
      const startRes = await fetch("/api/lounge/webauthn/assert-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!startRes.ok) {
        setError("Biometric sign-in unavailable.");
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
        setError(data.error || "Biometric sign-in failed.");
        return;
      }
      router.push("/lounge");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Biometric sign-in cancelled.";
      // User-cancelled on iOS shows "NotAllowedError"; treat as silent.
      if (!/NotAllowed|cancel/i.test(msg)) setError(msg);
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      style={{
        marginTop: 4,
        width: "100%",
        padding: "12px 16px",
        background: "transparent",
        color: "#f0b429",
        border: "1px solid rgba(240,180,41,0.40)",
        borderRadius: 12,
        fontWeight: 900,
        fontSize: 12,
        letterSpacing: "0.10em",
        lineHeight: 1.2,
        textTransform: "uppercase",
        cursor: busy ? "wait" : "pointer",
        fontFamily: "inherit",
        whiteSpace: "normal",
      }}
    >
      {busy ? "Waking your authenticator…" : "Sign in with Face ID / fingerprint"}
    </button>
  );
}
