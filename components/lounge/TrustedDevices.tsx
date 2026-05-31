"use client";

import { useCallback, useEffect, useState } from "react";

interface Device {
  id: string;
  deviceLabel: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtCountdown(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  if (days >= 1) return `Expires in ${days} day${days === 1 ? "" : "s"}`;
  const hours = Math.floor(ms / (60 * 60 * 1000));
  return `Expires in ${hours}h`;
}

export default function TrustedDevices() {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<null | { kind: "ok" | "err"; text: string }>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/lounge/trusted-devices", { cache: "no-store" });
      if (!r.ok) { setDevices([]); return; }
      const d = await r.json();
      setDevices(Array.isArray(d.devices) ? d.devices : []);
    } catch {
      setDevices([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function revoke(d: Device) {
    if (!confirm(`Stop trusting ${d.deviceLabel ?? "this device"}? Next sign-in there will require your 2FA code.`)) return;
    setBusy(d.id);
    try {
      const r = await fetch(`/api/lounge/trusted-devices?id=${encodeURIComponent(d.id)}`, { method: "DELETE" });
      if (!r.ok) { setMsg({ kind: "err", text: "Couldn't revoke that device. Try again." }); return; }
      setMsg({ kind: "ok", text: "Device removed." });
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <section style={card}>
      <header style={{ marginBottom: 14 }}>
        <div style={kicker}>Security</div>
        <h2 style={heading}>Trusted devices for 2FA</h2>
        <p style={lede}>
          Devices you&apos;ve told the lounge to remember. While a device is trusted, you skip the
          2FA code at sign-in for 30 days. Revoke any device any time — losing a phone, switching
          off shared devices, etc.
        </p>
      </header>

      {devices === null ? (
        <div style={emptyMuted}>Loading…</div>
      ) : devices.length === 0 ? (
        <div style={emptyMuted}>No trusted devices. Check the box at the 2FA step on your next sign-in to add one.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {devices.map((d) => (
            <div key={d.id} style={row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "white", fontWeight: 800, fontSize: 14 }}>
                  {d.deviceLabel ?? "Unnamed device"}
                </div>
                <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
                  Added {fmtDate(d.createdAt)}
                  {d.lastUsedAt ? ` · last used ${fmtDate(d.lastUsedAt)}` : " · not used yet"}
                  {" · "}{fmtCountdown(d.expiresAt)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => revoke(d)}
                disabled={busy === d.id}
                style={revokeBtn}
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}

      {msg && (
        <div
          role="status"
          style={{
            marginTop: 12,
            color: msg.kind === "ok" ? "#86efac" : "#fca5a5",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {msg.text}
        </div>
      )}
    </section>
  );
}

const card: React.CSSProperties = {
  padding: 20,
  background: "rgba(7,20,40,0.55)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
};
const kicker: React.CSSProperties = {
  color: "#f0b429",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  fontFamily: "var(--font-mas-mono), ui-monospace, monospace",
};
const heading: React.CSSProperties = {
  color: "white",
  fontSize: 22,
  fontWeight: 900,
  letterSpacing: "-0.015em",
  margin: "4px 0 6px",
};
const lede: React.CSSProperties = {
  color: "#cbd5e1",
  fontSize: 13.5,
  lineHeight: 1.55,
  margin: 0,
};
const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 12px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 12,
};
const emptyMuted: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 13,
  padding: "8px 0",
};
const revokeBtn: React.CSSProperties = {
  padding: "8px 12px",
  background: "transparent",
  color: "#fca5a5",
  border: "1px solid rgba(239,68,68,0.30)",
  borderRadius: 10,
  fontWeight: 800,
  fontSize: 11,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
};
