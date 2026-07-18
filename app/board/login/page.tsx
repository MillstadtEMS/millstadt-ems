"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BoardLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const res = await fetch("/api/board/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data.error || "Sign-in failed. Check your username and password."); return; }
      router.push(data.mustChange ? "/board/change-password" : "/board");
      router.refresh();
    } catch {
      setErr("Network error. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <div className="board-login">
      <div className="aside">
        <div className="mk" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 2.2 3.4 6v6.2c0 5 3.7 8.2 8.6 9.6 4.9-1.4 8.6-4.6 8.6-9.6V6L12 2.2Z"/><path d="M12 8.4v7M8.5 11.9h7"/></svg>
        </div>
        <div>
          <h2>Board of Directors Portal</h2>
          <p>A private, secured space for Millstadt EMS leadership and the Board — financials, proposals, votes, and meeting records. Access and actions are logged for security and board-record purposes.</p>
        </div>
        <div className="foot">MILLSTADT EMS · FY 2026–27</div>
      </div>

      <div className="panel">
        <form className="form" onSubmit={submit}>
          <p className="board-eyebrow eyebrow">Secure sign-in</p>
          <h1>Welcome back</h1>
          <p className="lede">Sign in with your board credentials.</p>

          {err && <div className="board-err" role="alert">{err}</div>}

          <div className="board-field">
            <label htmlFor="u">Username</label>
            <input id="u" className="board-input" autoComplete="username" autoCapitalize="none"
              value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. kjames" required />
          </div>
          <div className="board-field">
            <label htmlFor="p">Password</label>
            <input id="p" className="board-input" type="password" autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <button className="board-submit" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <p className="board-note">
            First time in? Use the temporary password you were given (your username + <strong>39</strong>). You will be asked to set a new one immediately.
          </p>
        </form>
      </div>
    </div>
  );
}
