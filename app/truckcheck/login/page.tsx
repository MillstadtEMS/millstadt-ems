"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TruckCheckLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/truckcheck/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/truckcheck");
      router.refresh();
    } else {
      setError("Wrong password.");
      setPassword("");
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px", paddingTop: "calc(24px + env(safe-area-inset-top))" }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: "rgba(240,180,41,0.1)", border: "1px solid rgba(240,180,41,0.25)", margin: "0 auto 18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 32 32" width={36} height={36} fill="none" aria-hidden>
              <rect x="14" y="2" width="4" height="28" rx="2" fill="white" opacity="0.9" />
              <rect x="14" y="2" width="4" height="28" rx="2" fill="white" opacity="0.9" transform="rotate(60 16 16)" />
              <rect x="14" y="2" width="4" height="28" rx="2" fill="white" opacity="0.9" transform="rotate(120 16 16)" />
              <circle cx="16" cy="16" r="3" fill="#f0b429" />
            </svg>
          </div>
          <h1 style={{ color: "white", fontWeight: 900, fontSize: 24, margin: 0, letterSpacing: "-0.01em" }}>Truck Check</h1>
          <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 6, letterSpacing: "0.18em", textTransform: "uppercase" }}>Millstadt EMS</p>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            type="password"
            inputMode="text"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={{ padding: "16px 16px", borderRadius: 12, background: "#071428", border: "1px solid rgba(255,255,255,0.12)", color: "white", fontSize: 16, outline: "none" }}
          />
          {error && (
            <div style={{ padding: 12, borderRadius: 10, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", color: "#fecaca", fontSize: 14 }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            style={{ padding: "16px 20px", borderRadius: 12, background: loading || !password ? "#a07a1c" : "#f0b429", color: "#040d1a", fontWeight: 900, fontSize: 16, border: "none", cursor: loading || !password ? "default" : "pointer", letterSpacing: "0.04em" }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
}
