"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") ?? "/admin";
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push(from);
    } else {
      setError("Wrong password.");
      setPassword("");
    }
  }

  return (
    <div className="min-h-screen bg-[#020810] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#f0b429]/10 border border-[#f0b429]/20 mb-5">
            <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none">
              <rect x="14" y="2" width="4" height="28" rx="2" fill="white" opacity="0.9"/>
              <rect x="14" y="2" width="4" height="28" rx="2" fill="white" opacity="0.9" transform="rotate(60 16 16)"/>
              <rect x="14" y="2" width="4" height="28" rx="2" fill="white" opacity="0.9" transform="rotate(120 16 16)"/>
              <circle cx="16" cy="16" r="3" fill="#f0b429"/>
            </svg>
          </div>
          <h1 className="text-white font-black text-2xl tracking-tight">Millstadt EMS</h1>
          <p className="text-slate-500 text-sm mt-1 tracking-widest uppercase">Admin Portal</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-xs uppercase tracking-widest font-bold mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              required
              className="w-full bg-white/5 border border-white/10 focus:border-[#f0b429]/50 rounded-xl px-4 py-3.5 text-white placeholder-slate-700 outline-none transition-colors"
              placeholder="••••••••••"
            />
          </div>
          {error && (
            <p className="text-red-400 text-sm flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#f0b429] hover:bg-[#f5c842] disabled:opacity-50 text-[#020810] font-black py-3.5 rounded-xl transition-colors text-sm tracking-wide uppercase"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-slate-700 text-xs mt-8">
          Millstadt Ambulance Service · Staff Only
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
