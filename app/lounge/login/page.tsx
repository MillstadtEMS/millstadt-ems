"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoungeLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 2FA state
  const [step, setStep] = useState<"password" | "verify_2fa" | "setup_2fa">("password");
  const [code, setCode] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  // When we transition to setup_2fa, fetch the otpauth URL + secret, then
  // render the QR client-side so a server-side qrcode failure can never
  // strand the user on "Loading QR…".
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
      setStep(data.step === "setup_2fa" ? "setup_2fa" : "verify_2fa");
      setLoading(false);
    } catch {
      setError("Connection error");
      setLoading(false);
    }
  }

  async function submitCode(endpoint: string) {
    setError("");
    setLoading(true);
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Verification failed");
        setLoading(false);
        return;
      }
      try { sessionStorage.setItem("lounge:welcome", "1"); } catch {}
      router.push("/lounge");
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
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo + branding */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 132,
              height: 132,
              marginBottom: 14,
              filter: "drop-shadow(0 10px 28px rgba(0,0,0,0.6)) drop-shadow(0 0 28px rgba(60,120,255,0.35))",
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
          <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginTop: 6 }}>
            Millstadt Ambulance Service
          </p>
        </div>

        {step === "password" && (
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
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
          </form>
        )}

        {step === "verify_2fa" && (
          <form
            onSubmit={(e) => { e.preventDefault(); submitCode("/api/lounge/verify-2fa"); }}
            style={{ display: "grid", gap: 14 }}
          >
            <p style={{ color: "#cbd5e1", fontSize: 14, lineHeight: 1.55, margin: 0 }}>
              Open Okta Verify (or your authenticator app) and enter the 6-digit code for <strong style={{ color: "#f0b429" }}>Millstadt EMS</strong>.
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
            <p style={{ color: "#cbd5e1", fontSize: 14, lineHeight: 1.55, margin: 0 }}>
              First-time setup: open <strong style={{ color: "#f0b429" }}>Okta Verify</strong> (or Google Authenticator, 1Password, Authy, etc.) and scan this QR code, then enter the 6-digit code it shows.
            </p>
            {qr ? (
              <div style={{ display: "flex", justifyContent: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="2FA setup QR code" style={{ width: 220, height: 220, background: "white", borderRadius: 12, padding: 8 }} />
              </div>
            ) : setupError ? (
              <ErrorBanner>{setupError}</ErrorBanner>
            ) : (
              <div style={{ color: "#94a3b8", textAlign: "center", padding: 22 }}>Generating QR…</div>
            )}
            {secret && (
              <div style={{ color: "#94a3b8", fontSize: 11, textAlign: "center" }}>
                Can&apos;t scan? Enter this secret manually:<br />
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
      </div>
    </div>
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

