"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoungeLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
      // Tell the dashboard to play the welcome teleport animation once.
      try {
        sessionStorage.setItem("lounge:welcome", "1");
      } catch {}
      // TEMPORARY (QA): force-change-password flow is bypassed so KJ can
      // hop between accounts. Re-enable by restoring the conditional:
      //   router.push(data.mustChangePassword ? "/lounge/change-password" : "/lounge");
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
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "rgba(240,180,41,0.10)",
              border: "1px solid rgba(240,180,41,0.22)",
              marginBottom: 18,
            }}
          >
            <LoungeIcon />
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

          {error && (
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
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            style={{
              ...buttonStyle,
              opacity: loading || !username || !password ? 0.5 : 1,
              cursor: loading || !username || !password ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

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

function LoungeIcon() {
  return (
    <svg viewBox="0 0 32 32" width="36" height="36" fill="none" aria-hidden>
      <rect x="14" y="2" width="4" height="28" rx="2" fill="white" opacity="0.9" />
      <rect
        x="14"
        y="2"
        width="4"
        height="28"
        rx="2"
        fill="white"
        opacity="0.9"
        transform="rotate(60 16 16)"
      />
      <rect
        x="14"
        y="2"
        width="4"
        height="28"
        rx="2"
        fill="white"
        opacity="0.9"
        transform="rotate(120 16 16)"
      />
      <circle cx="16" cy="16" r="3" fill="#f0b429" />
    </svg>
  );
}
