"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { HospitalRecord, AccessCode, AccessCodeKind } from "@/lib/lounge/hospitals";

const PRIMARY_LABELS = ["EMS Patch", "ED", "Report Line"] as const;
const ACCESS_KINDS: AccessCodeKind[] = ["ER", "EMS Room", "Non-ER", "Nursing Home"];

export default function HospitalEditClient({ hospital }: { hospital: HospitalRecord }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: hospital.name,
    city: hospital.city,
    state: hospital.state,
    system: hospital.system ?? "",
    primaryLabel: hospital.primaryContact.label,
    primaryPhone: hospital.primaryContact.phone,
    secondaryLabel: hospital.secondaryContact?.label ?? "",
    secondaryValue: hospital.secondaryContact?.value ?? "",
    address: hospital.address,
    latitude: String(hospital.latitude),
    longitude: String(hospital.longitude),
    twelveLeadEmail: hospital.twelveLeadEmail ?? "",
    fax: hospital.fax ?? "",
    notes: hospital.notes ?? "",
    flagForReview: !!hospital.flagForReview,
  });
  // Codes start as the union of legacy door/ems-room codes plus structured codes.
  const initialCodes: AccessCode[] = [];
  if (hospital.doorCode) initialCodes.push({ kind: "ER", value: hospital.doorCode });
  if (hospital.emsRoomCode) initialCodes.push({ kind: "EMS Room", value: hospital.emsRoomCode });
  if (Array.isArray(hospital.codes)) for (const c of hospital.codes) initialCodes.push(c);
  const [codes, setCodes] = useState<AccessCode[]>(initialCodes);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<null | { kind: "ok" | "err"; msg: string }>(null);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }
  function patchCode(i: number, p: Partial<AccessCode>) {
    setCodes((s) => s.map((c, idx) => (idx === i ? { ...c, ...p } : c)));
  }
  function addCode() {
    setCodes((s) => [...s, { kind: "ER", value: "" }]);
  }
  function removeCode(i: number) {
    setCodes((s) => s.filter((_, idx) => idx !== i));
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const lat = Number(form.latitude);
      const lng = Number(form.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setStatus({ kind: "err", msg: "Latitude/longitude must be numbers." });
        return;
      }
      // Split codes: keep the first ER as door_code legacy, first EMS Room as ems_room_code legacy.
      const erFirst = codes.find((c) => c.kind === "ER")?.value || null;
      const emsRoomFirst = codes.find((c) => c.kind === "EMS Room")?.value || null;
      // Anything else (including extras) goes into the structured `codes` JSONB.
      const structured: AccessCode[] = [];
      let skippedEr = false;
      let skippedEms = false;
      for (const c of codes) {
        if (!c.value.trim()) continue;
        if (c.kind === "ER" && !skippedEr) { skippedEr = true; continue; }
        if (c.kind === "EMS Room" && !skippedEms) { skippedEms = true; continue; }
        structured.push(c);
      }
      const body = {
        name: form.name,
        city: form.city,
        state: form.state,
        system: form.system || null,
        primaryLabel: form.primaryLabel,
        primaryPhone: form.primaryPhone,
        secondaryLabel: form.secondaryLabel || null,
        secondaryValue: form.secondaryValue || null,
        address: form.address,
        latitude: lat,
        longitude: lng,
        doorCode: erFirst,
        emsRoomCode: emsRoomFirst,
        codes: structured.length > 0 ? structured : null,
        twelveLeadEmail: form.twelveLeadEmail || null,
        fax: form.fax || null,
        notes: form.notes || null,
        flagForReview: form.flagForReview,
      };
      const res = await fetch(`/api/admin/hospitals/${hospital.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ kind: "err", msg: d.error || "Save failed." });
        return;
      }
      setStatus({ kind: "ok", msg: "Saved." });
      router.refresh();
    } finally { setSaving(false); }
  }

  async function remove() {
    if (!confirm(`Delete ${hospital.name} from the directory?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/hospitals/${hospital.id}`, { method: "DELETE" });
      if (res.ok) router.push("/admin/hospitals");
    } finally { setSaving(false); }
  }

  return (
    <div>
      <header style={{ marginBottom: 16, textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "white" }}>Edit hospital</h1>
      </header>

      <Card eyebrow="🏥" title="Hospital">
        <Field label="Name *">
          <input value={form.name} onChange={(e) => setField("name", e.target.value)} style={inp} />
        </Field>
        <div style={twoCol}>
          <Field label="City *">
            <input value={form.city} onChange={(e) => setField("city", e.target.value)} style={inp} />
          </Field>
          <Field label="State *">
            <input value={form.state} onChange={(e) => setField("state", e.target.value)} style={inp} />
          </Field>
        </div>
        <Field label="Hospital System">
          <input value={form.system} onChange={(e) => setField("system", e.target.value)} placeholder="e.g. BJC, SSM Health" style={inp} />
        </Field>
      </Card>

      <Card eyebrow="📞" title="Contact">
        <div>
          <div style={fieldLabel}>Primary Line</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            {PRIMARY_LABELS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setField("primaryLabel", l)}
                style={pill(form.primaryLabel === l)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <Field label="Primary Phone *">
          <input value={form.primaryPhone} onChange={(e) => setField("primaryPhone", e.target.value)} placeholder="3147688986" style={inp} />
        </Field>
        <div style={twoCol}>
          <Field label="Secondary Label">
            <input value={form.secondaryLabel} onChange={(e) => setField("secondaryLabel", e.target.value)} placeholder="Charge nurse" style={inp} />
          </Field>
          <Field label="Secondary Value">
            <input value={form.secondaryValue} onChange={(e) => setField("secondaryValue", e.target.value)} placeholder="314-555-0200" style={inp} />
          </Field>
        </div>
      </Card>

      <Card eyebrow="📍" title="Address">
        <Field label="Street Address *">
          <input value={form.address} onChange={(e) => setField("address", e.target.value)} style={inp} />
        </Field>
        <div style={twoCol}>
          <Field label="Latitude *">
            <input value={form.latitude} onChange={(e) => setField("latitude", e.target.value)} style={inp} />
          </Field>
          <Field label="Longitude *">
            <input value={form.longitude} onChange={(e) => setField("longitude", e.target.value)} style={inp} />
          </Field>
        </div>
      </Card>

      <Card eyebrow="🔑" title="Access Codes" right={
        <button type="button" onClick={addCode} style={addBtn}>+ Add</button>
      }>
        {codes.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>No codes on file. Tap +&nbsp;Add to record one.</p>
        ) : codes.map((c, i) => (
          <div key={i} style={{ marginTop: i === 0 ? 0 : 14, padding: 12, background: "#040d1a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              {ACCESS_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => patchCode(i, { kind: k })}
                  style={pill(c.kind === k)}
                >
                  {k}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <button type="button" onClick={() => removeCode(i)} style={{ ...pill(false), color: "#fca5a5", borderColor: "rgba(252,165,165,0.30)" }}>
                Remove
              </button>
            </div>
            <input
              value={c.value}
              onChange={(e) => patchCode(i, { value: e.target.value })}
              placeholder="e.g. 911*"
              style={inp}
            />
            <input
              value={c.note ?? ""}
              onChange={(e) => patchCode(i, { note: e.target.value })}
              placeholder="Access note (optional) — e.g. elevator then east hall"
              style={{ ...inp, marginTop: 8 }}
            />
          </div>
        ))}
      </Card>

      <Card eyebrow="📡" title="Communication">
        <Field label="12-Lead Email">
          <input value={form.twelveLeadEmail} onChange={(e) => setField("twelveLeadEmail", e.target.value)} placeholder="12lead@hospital.org" style={inp} />
        </Field>
        <Field label="Fax">
          <input value={form.fax} onChange={(e) => setField("fax", e.target.value)} placeholder="314-555-0300" style={inp} />
        </Field>
      </Card>

      <Card eyebrow="📝" title="Notes & Admin">
        <Field label="Notes">
          <textarea
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            rows={4}
            placeholder="Any context crews should know — quirks, back-entry, recent changes."
            style={{ ...inp, resize: "vertical", minHeight: 100, fontFamily: "inherit" }}
          />
        </Field>
        <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", marginTop: 6 }}>
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: 14 }}>Flag for review</div>
            <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
              Shown with a banner in the list so another admin can double-check.
            </div>
          </div>
          <input
            type="checkbox"
            checked={form.flagForReview}
            onChange={(e) => setField("flagForReview", e.target.checked)}
            style={{ width: 36, height: 22, accentColor: "#f0b429" }}
          />
        </label>
      </Card>

      {status && (
        <div style={{
          marginTop: 12, padding: 12, borderRadius: 12,
          background: status.kind === "ok" ? "rgba(134,239,172,0.10)" : "rgba(252,165,165,0.10)",
          border: `1px solid ${status.kind === "ok" ? "rgba(134,239,172,0.30)" : "rgba(252,165,165,0.30)"}`,
          color: status.kind === "ok" ? "#86efac" : "#fca5a5",
          fontWeight: 700, fontSize: 13.5,
        }}>{status.msg}</div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 22, flexWrap: "wrap" }}>
        <button type="button" onClick={() => router.push("/admin/hospitals")} style={cancelBtn}>Cancel</button>
        <button type="button" onClick={save} disabled={saving} style={{ ...saveBtn, opacity: saving ? 0.55 : 1 }}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        <div style={{ flex: 1 }} />
        <button type="button" onClick={remove} disabled={saving} style={deleteBtn}>Delete</button>
      </div>
    </div>
  );
}

function Card({ eyebrow, title, right, children }: { eyebrow: string; title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{ background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "18px 18px 20px", marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }} aria-hidden>{eyebrow}</span>
          <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 900, letterSpacing: "0.20em", textTransform: "uppercase" }}>{title}</span>
        </div>
        {right}
      </div>
      <div style={{ display: "grid", gap: 14 }}>{children}</div>
    </section>
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
    padding: "8px 16px",
    borderRadius: 999,
    background: active ? "#f0b429" : "transparent",
    color: active ? "#040d1a" : "#cbd5e1",
    border: `1px solid ${active ? "#f0b429" : "rgba(255,255,255,0.14)"}`,
    fontFamily: "inherit",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
  };
}
const fieldLabel: React.CSSProperties = { color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" };
const inp: React.CSSProperties = { width: "100%", padding: "13px 14px", background: "#040d1a", border: "1px solid rgba(255,255,255,0.10)", color: "white", borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit" };
const twoCol: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 };
const addBtn: React.CSSProperties = { padding: "6px 14px", background: "transparent", color: "#f0b429", border: "1px solid rgba(240,180,41,0.35)", borderRadius: 999, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" };
const cancelBtn: React.CSSProperties = { padding: "12px 22px", background: "transparent", border: "1px solid rgba(255,255,255,0.14)", color: "#cbd5e1", borderRadius: 12, fontFamily: "inherit", fontWeight: 800, fontSize: 14, cursor: "pointer" };
const saveBtn: React.CSSProperties = { padding: "12px 28px", background: "#f0b429", color: "#040d1a", border: 0, borderRadius: 12, fontFamily: "inherit", fontWeight: 900, fontSize: 14, cursor: "pointer" };
const deleteBtn: React.CSSProperties = { padding: "12px 18px", background: "transparent", color: "#fca5a5", border: "1px solid rgba(252,165,165,0.30)", borderRadius: 12, fontFamily: "inherit", fontWeight: 800, fontSize: 13, cursor: "pointer" };
