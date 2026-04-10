"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InventoryLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Invalid password");
        setLoading(false);
        return;
      }
      router.push("/inventory");
    } catch {
      setError("Connection error");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#040d1a]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#f0b429]/10 border border-[#f0b429]/20 mb-4">
            <svg viewBox="0 0 32 32" className="w-8 h-8" fill="none">
              <rect x="14" y="2" width="4" height="28" rx="2" fill="white" opacity="0.9"/>
              <rect x="14" y="2" width="4" height="28" rx="2" fill="white" opacity="0.9" transform="rotate(60 16 16)"/>
              <rect x="14" y="2" width="4" height="28" rx="2" fill="white" opacity="0.9" transform="rotate(120 16 16)"/>
              <circle cx="16" cy="16" r="3" fill="#f0b429"/>
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white">Inventory Access</h1>
          <p className="text-slate-500 text-sm mt-1">Millstadt Ambulance Service</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter inventory password"
              autoFocus
              className="w-full px-4 py-3.5 bg-[#071428] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#f0b429]/50 focus:ring-1 focus:ring-[#f0b429]/25 text-base"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3.5 bg-[#f0b429] hover:bg-[#d4a127] text-[#040d1a] font-black text-base rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
