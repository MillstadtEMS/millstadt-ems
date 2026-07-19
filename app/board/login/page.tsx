"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import BoardLogo from "@/components/board/BoardLogo";
import BoardAppearanceControl from "@/components/board/BoardAppearanceControl";

export default function BoardLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      window.sessionStorage.setItem("board:welcome", "1");
      router.push(data.mustChange ? "/board/change-password" : "/board");
      router.refresh();
    } catch {
      setErr("Network error. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <div className="board-login">
      <div className="board-login-tools">
        <BoardAppearanceControl compact />
      </div>
      <div className="aside">
        <BoardLogo className="asidelogo" variant="auto" />
        <div className="foot">Millstadt EMS Board of Directors Portal</div>
      </div>

      <div className="panel">
        <form className="form" onSubmit={submit}>
          <BoardLogo className="brandmobile" variant="auto" />
          <p className="eyebrow">Board of Directors</p>
          <h1>Board portal sign in</h1>

          {err && <div className="board-err" role="alert">{err}</div>}

          <div className="board-field">
            <label htmlFor="u">Username</label>
            <input id="u" className="board-input" autoComplete="username" autoCapitalize="none"
              value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="board-field">
            <label htmlFor="p">Password</label>
            <div className="board-password-control">
              <input
                id="p"
                className="board-input"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="board-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>

          <button className="board-submit" type="submit" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
