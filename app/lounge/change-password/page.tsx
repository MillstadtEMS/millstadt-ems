"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePassword() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState<{ firstName: string; mustChangePassword: boolean } | null>(
    null,
  );

  useEffect(() => {
    fetch("/api/lounge/me")
      .then(async (r) => {
        if (!r.ok) {
          router.push("/lounge/login");
          return null;
        }
        const data = await r.json();
        setMe(data.employee);
      })
      .catch(() => router.push("/lounge/login"));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) {
      setError("New passwords don't match");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must be different from current");
      return;
    }
    if (!newPassword) {
      setError("New password required");
      return;
    }
    if (newPassword.length < 12) {
      setError("New password must be at least 12 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/lounge/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not change password");
        setLoading(false);
        return;
      }
      try {
        sessionStorage.setItem("lounge:welcome", "1");
      } catch {}
      router.push("/lounge");
    } catch {
      setError("Connection error");
      setLoading(false);
    }
  }

  if (!me) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#040d1a",
          color: "#94a3b8",
        }}
      >
        Loading…
      </div>
    );
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
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              display: "inline-block",
              padding: "6px 14px",
              borderRadius: 999,
              background: "rgba(240,180,41,0.12)",
              border: "1px solid rgba(240,180,41,0.3)",
              color: "#f0b429",
              fontSize: "0.7rem",
              fontWeight: 900,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            {me.mustChangePassword ? "First-Time Setup" : "Update Password"}
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
            {me.mustChangePassword
              ? `Welcome, ${me.firstName}.`
              : "Choose a new password"}
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginTop: 8, lineHeight: 1.55 }}>
            {me.mustChangePassword
              ? "Choose a permanent password with at least 12 characters. It will not expire on a schedule."
              : "Choose a permanent password with at least 12 characters. It will not expire on a schedule."}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <FieldLabel>Current password</FieldLabel>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            maxLength={1024}
            required
            style={inputStyle}
          />

          <FieldLabel>New password</FieldLabel>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            style={inputStyle}
          />

          <FieldLabel>Confirm new password</FieldLabel>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
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
                marginTop: 4,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !currentPassword || !newPassword || !confirm}
            style={{
              ...buttonStyle,
              marginTop: 8,
              opacity:
                loading || !currentPassword || !newPassword || !confirm ? 0.5 : 1,
              cursor:
                loading || !currentPassword || !newPassword || !confirm
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {loading ? "Saving…" : "Save & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        color: "#94a3b8",
        fontSize: "0.72rem",
        fontWeight: 800,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        marginTop: 6,
      }}
    >
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px 16px",
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
  fontFamily: "inherit",
};
