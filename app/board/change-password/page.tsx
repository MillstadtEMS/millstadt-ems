"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePassword() {
  const router = useRouter();
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (p1.length < 10) { setErr("Use at least 10 characters."); return; }
    if (p1 !== p2) { setErr("The two passwords don't match."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/board/change-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: p1 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) { router.push("/board/login"); return; }
        setErr(data.error || "Could not update your password."); return;
      }
      router.push("/board");
      router.refresh();
    } catch { setErr("Network error. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <div className="board-login">
      <div className="aside">
        <div className="mk" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 2.2 3.4 6v6.2c0 5 3.7 8.2 8.6 9.6 4.9-1.4 8.6-4.6 8.6-9.6V6L12 2.2Z"/><path d="M12 8.4v7M8.5 11.9h7"/></svg>
        </div>
        <div>
          <h2>Set your password</h2>
          <p>For your security, choose a new password before continuing. This replaces the temporary one you were given.</p>
        </div>
        <div className="foot">MILLSTADT EMS · BOARD PORTAL</div>
      </div>
      <div className="panel">
        <form className="form" onSubmit={submit}>
          <p className="board-eyebrow eyebrow">First sign-in</p>
          <h1>Create a new password</h1>
          <p className="lede">At least 10 characters. Make it something only you would know.</p>
          {err && <div className="board-err" role="alert">{err}</div>}
          <div className="board-field">
            <label htmlFor="p1">New password</label>
            <input id="p1" className="board-input" type="password" autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} required />
          </div>
          <div className="board-field">
            <label htmlFor="p2">Confirm new password</label>
            <input id="p2" className="board-input" type="password" autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} required />
          </div>
          <button className="board-submit" type="submit" disabled={busy}>{busy ? "Saving…" : "Save and continue"}</button>
        </form>
      </div>
    </div>
  );
}
