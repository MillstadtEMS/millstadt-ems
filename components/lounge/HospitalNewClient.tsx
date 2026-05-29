"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const PRIMARY_LABELS = ["EMS Patch", "ED", "Report Line"] as const;

export default function HospitalNewClient() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", city: "", state: "",
    primaryLabel: "EMS Patch" as (typeof PRIMARY_LABELS)[number],
    primaryPhone: "",
    address: "", latitude: "", longitude: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function go() {
    setError(null);
    const lat = Number(form.latitude); const lng = Number(form.longitude);
    if (!form.name || !form.city || !form.state || !form.primaryPhone || !form.address) {
      setError("Fill in every required field."); return;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError("Latitude/longitude must be numbers."); return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/hospitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, latitude: lat, longitude: lng }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || "Could not create."); return; }
      router.push(`/admin/hospitals/${d.hospital.id}`);
    } finally { setBusy(false); }
  }

  return (
    <div>
      <header style={{ marginBottom: 16, textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "white" }}>New hospital</h1>
        <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>
          Save the basics here, then add codes, secondary contacts, and notes on the edit page.
        </p>
      </header>

      <section style={card}>
        <Field label="Name *"><input value={form.name} onChange={(e) => set("name", e.target.value)} style={inp} /></Field>
        <div style={twoCol}>
          <Field label="City *"><input value={form.city} onChange={(e) => set("city", e.target.value)} style={inp} /></Field>
          <Field label="State *"><input value={form.state} onChange={(e) => set("state", e.target.value)} style={inp} placeholder="IL / MO" /></Field>
        </div>

        <div>
          <div style={fieldLabel}>Primary Line</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {PRIMARY_LABELS.map((l) => (
              <button key={l} type="button" onClick={() => set("primaryLabel", l)} style={pill(form.primaryLabel === l)}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <Field label="Primary Phone *"><input value={form.primaryPhone} onChange={(e) => set("primaryPhone", e.target.value)} placeholder="3147688986" style={inp} /></Field>

        <Field label="Street Address *"><input value={form.address} onChange={(e) => set("address", e.target.value)} style={inp} /></Field>
        <div style={twoCol}>
          <Field label="Latitude *"><input value={form.latitude} onChange={(e) => set("latitude", e.target.value)} style={inp} placeholder="38.63" /></Field>
          <Field label="Longitude *"><input value={form.longitude} onChange={(e) => set("longitude", e.target.value)} style={inp} placeholder="-90.31" /></Field>
        </div>
      </section>

      {error && (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "rgba(252,165,165,0.10)", border: "1px solid rgba(252,165,165,0.30)", color: "#fca5a5", fontWeight: 700, fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
        <button type="button" onClick={() => router.push("/admin/hospitals")} style={cancelBtn}>Cancel</button>
        <button type="button" onClick={go} disabled={busy} style={{ ...saveBtn, opacity: busy ? 0.55 : 1 }}>
          {busy ? "Creating…" : "Create"}
        </button>
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={fieldLabel}>{label}</span>
      {children}
    </label>
  );
}
function pill(active: boolean): React.CSSProperties {
  return {
    padding: "8px 16px", borderRadius: 999,
    background: active ? "#f0b429" : "transparent",
    color: active ? "#040d1a" : "#cbd5e1",
    border: `1px solid ${active ? "#f0b429" : "rgba(255,255,255,0.14)"}`,
    fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer",
  };
}
const card: React.CSSProperties = { background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "18px 18px 20px", display: "grid", gap: 14 };
const fieldLabel: React.CSSProperties = { color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" };
const inp: React.CSSProperties = { width: "100%", padding: "13px 14px", background: "#040d1a", border: "1px solid rgba(255,255,255,0.10)", color: "white", borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit" };
const twoCol: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 };
const cancelBtn: React.CSSProperties = { padding: "12px 22px", background: "transparent", border: "1px solid rgba(255,255,255,0.14)", color: "#cbd5e1", borderRadius: 12, fontFamily: "inherit", fontWeight: 800, fontSize: 14, cursor: "pointer" };
const saveBtn: React.CSSProperties = { padding: "12px 28px", background: "#f0b429", color: "#040d1a", border: 0, borderRadius: 12, fontFamily: "inherit", fontWeight: 900, fontSize: 14, cursor: "pointer" };
