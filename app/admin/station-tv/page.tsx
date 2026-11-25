"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Settings = { status: "set" | "unset" | "unavailable"; canChange: boolean; minLength: number };

const statusText: Record<Settings["status"], string> = {
  set: "A station TV password is set.",
  unset: "No station TV password yet. Set one below, then sign in each TV at /station.",
  unavailable: "The password store isn't answering right now. Try again in a minute.",
};

// Admin > Station TV: the shared password the station TVs sign in with (/station). It's stored hashed
// on the server; this page never sees the current password.
export default function StationTvSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/admin/station/settings", { cache: "no-store" });
      if (res.ok) setSettings(await res.json());
    } catch { /* shown as loading */ }
  }
  useEffect(() => { void load(); }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const min = settings?.minLength ?? 8;
    if (newPassword !== confirmPassword) { setMessage({ ok: false, text: "The passwords don't match." }); return; }
    if (newPassword.length < min) { setMessage({ ok: false, text: `Use at least ${min} characters.` }); return; }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/station/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ ok: true, text: data.message || "Saved." });
        setNewPassword("");
        setConfirmPassword("");
        void load();
      } else {
        setMessage({ ok: false, text: data.error || "Couldn't save the password." });
      }
    } catch {
      setMessage({ ok: false, text: "Connection error." });
    }
    setSaving(false);
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="h-px w-8 bg-[#f0b429]" />
          <span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">Station TV</span>
        </div>
        <h1 className="text-2xl font-black text-white">Station TV password</h1>
        <p className="text-slate-400 text-sm mt-1">
          The station TVs show the hands-free Christmas dashboard at{" "}
          <Link href="/station" className="text-[#f0b429] underline underline-offset-2" target="_blank" rel="noopener">/station</Link>.
          Each TV signs in once with this shared password and stays signed in.
        </p>
      </div>

      <div className="max-w-md space-y-4">
        <div className="bg-[#071428] border border-white/10 rounded-2xl p-5 text-sm text-slate-300" role="status">
          {settings ? statusText[settings.status] : "Checking…"}
        </div>

        <form onSubmit={save} className="bg-[#071428] border border-white/10 rounded-2xl p-6">
          <h3 className="text-white font-bold mb-1">{settings?.status === "set" ? "Change the password" : "Set the password"}</h3>
          <p className="text-slate-500 text-xs mb-4">Saving signs out every signed-in TV, so each one asks for the new password.</p>
          <div className="space-y-3 mb-4">
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password"
              autoComplete="new-password" maxLength={256} disabled={settings?.canChange === false}
              className="w-full px-4 py-3 bg-[#040d1a] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#f0b429]/40" />
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password"
              autoComplete="new-password" maxLength={256} disabled={settings?.canChange === false}
              className="w-full px-4 py-3 bg-[#040d1a] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#f0b429]/40" />
          </div>
          {message && <div className={`mb-4 text-sm font-medium ${message.ok ? "text-emerald-400" : "text-red-400"}`} role="alert">{message.text}</div>}
          {settings?.canChange === false && (
            <p className="mb-4 text-xs text-slate-500">This copy of the site has no database, so the password comes from its STATION_PASSWORD setting.</p>
          )}
          <button type="submit" disabled={saving || !newPassword || !confirmPassword || settings?.canChange === false}
            className="w-full py-3 bg-[#f0b429] text-[#040d1a] font-bold rounded-xl hover:bg-[#f0b429]/90 disabled:opacity-50 transition-all">
            {saving ? "Saving…" : "Save password"}
          </button>
        </form>
      </div>
    </div>
  );
}
