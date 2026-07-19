"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BoardLogo from "@/components/board/BoardLogo";

export default function ChangePassword() {
  const router = useRouter();
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (p1.length < 12) { setErr("Use at least 12 characters."); return; }
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
        <BoardLogo className="asidelogo" variant="auto" />
        <div className="foot">Millstadt EMS Board of Directors Portal</div>
      </div>
      <div className="panel">
        <form className="form" onSubmit={submit}>
          <BoardLogo className="brandmobile" variant="auto" />
          <p className="board-eyebrow eyebrow">First sign-in</p>
          <h1>Create a new password</h1>
          <p className="lede">At least 12 characters. Avoid names, usernames, and common temporary passwords.</p>
          {err && <div className="board-err" role="alert">{err}</div>}
          <div className="board-field">
            <label htmlFor="p1">New password</label>
            <input id="p1" className="board-input" type="password" autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} required />
          </div>
          <div className="board-field">
            <label htmlFor="p2">Confirm new password</label>
            <input id="p2" className="board-input" type="password" autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} required />
          </div>
          <button className="board-submit" type="submit" disabled={busy}>{busy ? "Saving..." : "Save and Continue"}</button>
        </form>
      </div>
    </div>
  );
}
