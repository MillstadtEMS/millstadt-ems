"use client";

import { useEffect, useMemo, useState } from "react";
import type { Hospital } from "@/lib/lounge/hospitals";

interface H extends Hospital { miles: number }

interface LiveEta { minutes: number; miles: number; source: "osrm" | "estimate"; rush: boolean }

function fmtPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return raw;
}
function estEtaMin(miles: number): { min: number; max: number; bucket: "now" | "light" | "rush" } {
  const baseMin = (miles / 55) * 60;
  const hour = new Date().getHours();
  const inRush = (hour >= 7 && hour < 9) || (hour >= 16 && hour < 19);
  const factor = inRush ? 1.45 : 1.10;
  const min = Math.max(2, Math.round(baseMin));
  const max = Math.max(min + 1, Math.round(baseMin * factor));
  return { min, max, bucket: inRush ? "rush" : "light" };
}
function mapsDirUrl(destLat: number, destLng: number) {
  // Opens native Maps on iOS/Android, web Maps on desktop. Driving mode.
  return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
}

export default function HospitalsClient({
  hospitals,
}: { hospitals: H[]; stationLat: number; stationLng: number; emsDoorCode: string }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<H | null>(null);
  const [liveEtas, setLiveEtas] = useState<Record<string, LiveEta>>({});
  const [newFacilityOpen, setNewFacilityOpen] = useState(false);

  // Pull a real driving ETA for every hospital on mount. Each request is
  // small + cached server-side so this stays cheap. The "ETA 44 min" the
  // crew sees then mirrors what Maps would say with traffic.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const h of hospitals) {
        if (cancelled) return;
        try {
          const r = await fetch(`/api/lounge/hospitals/eta?lat=${h.latitude}&lng=${h.longitude}`);
          if (!r.ok) continue;
          const d = await r.json();
          if (cancelled) return;
          setLiveEtas((s) => ({ ...s, [h.id]: d }));
        } catch { /* swallow */ }
      }
    })();
    return () => { cancelled = true; };
  }, [hospitals]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return hospitals;
    return hospitals.filter((h) =>
      h.name.toLowerCase().includes(q) ||
      h.city.toLowerCase().includes(q) ||
      h.address.toLowerCase().includes(q),
    );
  }, [hospitals, search]);

  return (
    <div>
      <header style={{ marginBottom: 18 }}>
        <div style={{ color: "#f0b429", fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          Hospitals
        </div>
        <h1 style={{ margin: "4px 0 6px", fontSize: "1.85rem", fontWeight: 900, letterSpacing: "-0.015em" }}>
          Receiving facilities directory
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.55 }}>
          Tap a hospital for patch line, door codes, and GPS routing. Distance and ETA estimates
          are from the station — not the truck&apos;s current location.
        </p>
      </header>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, city, address…"
          style={{ flex: 1, minWidth: 200, padding: "12px 14px", background: "#071428", border: "1px solid rgba(255,255,255,0.10)", color: "white", borderRadius: 12, fontSize: 14, outline: "none", fontFamily: "inherit" }}
        />
        <button
          type="button"
          onClick={() => setNewFacilityOpen(true)}
          style={{ padding: "10px 16px", background: "transparent", border: "1px solid rgba(56,189,248,0.40)", color: "#7dd3fc", borderRadius: 12, fontSize: 12, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}
        >
          + Suggest Facility
        </button>
      </div>

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
        {filtered.map((h) => {
          const live = liveEtas[h.id];
          const fallback = estEtaMin(h.miles);
          return (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => setOpen(h)}
                style={row}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 900, fontSize: 15, color: "white" }}>{h.name}</span>
                    {h.doorCode && (
                      <span style={badge}>Door {h.doorCode}</span>
                    )}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 3 }}>
                    {h.city}, {h.state} · {(live?.miles ?? h.miles).toFixed(1)} mi
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#f0b429" }}>
                    {live ? `ETA ${live.minutes} min` : `~${fallback.min}-${fallback.max} min`}
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "0.10em", textTransform: "uppercase", marginTop: 2 }}>
                    {live ? (live.rush ? "traffic adjusted" : "current traffic") : (fallback.bucket === "rush" ? "rush hour" : "off-peak")}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {open && <DetailModal h={open} liveEta={liveEtas[open.id]} onClose={() => setOpen(null)} />}
      {newFacilityOpen && <NewFacilityModal onClose={() => setNewFacilityOpen(false)} />}
    </div>
  );
}

function DetailModal({ h, liveEta, onClose }: { h: H; liveEta?: LiveEta; onClose: () => void }) {
  const eta = estEtaMin(h.miles);
  const [suggestOpen, setSuggestOpen] = useState(false);
  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        <button onClick={onClose} type="button" style={closeBtn}>×</button>

        <div style={{ color: "#f0b429", fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          {h.state} · {h.miles.toFixed(1)} miles
        </div>
        <h2 style={{ margin: "6px 0 4px", color: "white", fontSize: 22, fontWeight: 900, letterSpacing: "-0.01em" }}>{h.name}</h2>
        <div style={{ color: "#cbd5e1", fontSize: 13.5 }}>{h.address}</div>

        <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(240,180,41,0.08)", border: "1px solid rgba(240,180,41,0.25)", borderRadius: 12 }}>
          <span style={{ color: "#f0b429", fontSize: 12, fontWeight: 800 }}>ETA from station:</span>{" "}
          <span style={{ color: "white", fontWeight: 800 }}>
            {liveEta ? `${liveEta.minutes} min` : `~${eta.min}-${eta.max} min`}
          </span>{" "}
          <span style={{ color: "#94a3b8", fontSize: 12 }}>
            ({liveEta ? (liveEta.rush ? "traffic adjusted" : "current traffic") : (eta.bucket === "rush" ? "rush-hour adjusted" : "off-peak")})
          </span>
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
          <a href={`tel:${h.primaryContact.phone.replace(/\D/g, "")}`} style={primaryBtn}>
            📞 Call {h.primaryContact.label} · {fmtPhone(h.primaryContact.phone)}
          </a>
          <a href={mapsDirUrl(h.latitude, h.longitude)} target="_blank" rel="noreferrer" style={secondaryBtn}>
            🧭 Route in Maps
          </a>
          {h.secondaryContact && (
            <div style={smallNote}>
              <span style={{ color: "#94a3b8", fontWeight: 700 }}>{h.secondaryContact.label}:</span>{" "}
              <span style={{ color: "white" }}>{h.secondaryContact.value}</span>
            </div>
          )}
          {h.twelveLeadEmail && (
            <a href={`mailto:${h.twelveLeadEmail}`} style={smallNote}>
              ✉️ 12-Lead: <span style={{ color: "white" }}>{h.twelveLeadEmail}</span>
            </a>
          )}
        </div>

        <section style={{ marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={sectionLabel}>Access Codes</div>
            <button
              type="button"
              onClick={() => setSuggestOpen(true)}
              style={{ background: "transparent", border: "1px solid rgba(56,189,248,0.30)", color: "#7dd3fc", padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}
            >
              ✎ Suggest change
            </button>
          </div>
          <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
            {h.doorCode && <CodeRow label="ER Door" value={h.doorCode} />}
            {h.emsRoomCode && <CodeRow label="EMS Room / Back Entry" value={h.emsRoomCode} />}
            {h.codes?.map((c, i) => (
              <CodeRow key={i} label={c.kind} value={c.value} note={c.note} />
            ))}
            {!h.doorCode && !h.emsRoomCode && !h.codes?.length && (
              <div style={{ color: "#64748b", fontSize: 12 }}>No codes on file. Have one? Tap Suggest change.</div>
            )}
          </div>
        </section>

        {h.notes && (
          <section style={{ marginTop: 14 }}>
            <div style={sectionLabel}>Notes</div>
            <div style={{ color: "#e2e8f0", fontSize: 13.5, lineHeight: 1.5 }}>{h.notes}</div>
          </section>
        )}

        {suggestOpen && (
          <SuggestCodeModal h={h} onClose={() => setSuggestOpen(false)} />
        )}
      </div>
    </div>
  );
}

function CodeRow({ label, value, note, accent }: { label: string; value: string; note?: string; accent?: string }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        background: accent ? "rgba(134,239,172,0.08)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${accent ?? "rgba(255,255,255,0.08)"}`,
        borderLeft: `4px solid ${accent ?? "#f0b429"}`,
        borderRadius: 10,
      }}
    >
      <div style={{ color: "#94a3b8", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: "white", fontSize: 17, fontWeight: 900, fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>{value}</div>
      {note && <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>{note}</div>}
    </div>
  );
}

const row: React.CSSProperties = {
  width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
  padding: "14px 16px", background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14,
  color: "white", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
};
const badge: React.CSSProperties = {
  fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase",
  padding: "3px 8px", borderRadius: 999, background: "rgba(240,180,41,0.12)", color: "#f0b429",
};
const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex",
  alignItems: "flex-start", justifyContent: "center", padding: 16, paddingTop: "max(16px, env(safe-area-inset-top))",
  overflow: "auto",
};
const modal: React.CSSProperties = {
  position: "relative", width: "100%", maxWidth: 540, background: "#040d1a",
  border: "1px solid rgba(240,180,41,0.30)", borderRadius: 16, padding: 22, color: "white",
};
const closeBtn: React.CSSProperties = {
  position: "absolute", top: 10, right: 14, background: "transparent", border: 0,
  color: "#cbd5e1", fontSize: 28, cursor: "pointer", lineHeight: 1, fontFamily: "inherit",
};
const primaryBtn: React.CSSProperties = {
  display: "block", textAlign: "center", padding: "14px 18px", background: "#f0b429",
  color: "#040d1a", borderRadius: 12, fontWeight: 900, fontSize: 14, letterSpacing: "0.08em",
  textTransform: "uppercase", textDecoration: "none",
};
const secondaryBtn: React.CSSProperties = {
  display: "block", textAlign: "center", padding: "12px 18px", background: "#38bdf8",
  color: "#040d1a", borderRadius: 12, fontWeight: 900, fontSize: 13, letterSpacing: "0.08em",
  textTransform: "uppercase", textDecoration: "none",
};
const smallNote: React.CSSProperties = {
  display: "block", padding: "10px 14px", background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, color: "#cbd5e1",
  fontSize: 13, textDecoration: "none",
};
const sectionLabel: React.CSSProperties = {
  color: "#f0b429", fontSize: 11, fontWeight: 900, letterSpacing: "0.18em",
  textTransform: "uppercase", marginBottom: 8,
};

// ── Suggest a code change modal ──────────────────────────────────────────
function SuggestCodeModal({ h, onClose }: { h: H; onClose: () => void }) {
  const [codeKind, setCodeKind] = useState<"ER" | "EMS Room" | "Non-ER" | "Nursing Home">("ER");
  const [newValue, setNewValue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<null | { kind: "ok" | "err"; msg: string }>(null);

  async function submit() {
    if (!newValue.trim()) return;
    setBusy(true); setStatus(null);
    try {
      const r = await fetch("/api/lounge/hospitals/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "code_change", hospitalId: h.id,
          codeKind, newValue: newValue.trim(), note: note.trim() || undefined,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setStatus({ kind: "err", msg: d.error || "Could not submit." }); return; }
      setStatus({ kind: "ok", msg: "Sent to admin for approval." });
      setTimeout(onClose, 1400);
    } finally { setBusy(false); }
  }

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modal, maxWidth: 480 }}>
        <button type="button" onClick={onClose} style={closeBtn}>×</button>
        <div style={{ color: "#7dd3fc", fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Suggest change
        </div>
        <h3 style={{ margin: "4px 0 4px", fontSize: 18, fontWeight: 900, color: "white" }}>{h.name}</h3>
        <p style={{ color: "#94a3b8", fontSize: 12.5, lineHeight: 1.5, margin: "0 0 14px" }}>
          Spotted a code that doesn&apos;t work or got updated? Tell admin and they&apos;ll review it.
        </p>

        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={smallLabel}>Which code?</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {(["ER", "EMS Room", "Non-ER", "Nursing Home"] as const).map((k) => (
                <button key={k} type="button" onClick={() => setCodeKind(k)} style={pill(codeKind === k)}>
                  {k}
                </button>
              ))}
            </div>
          </div>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={smallLabel}>New value</span>
            <input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="e.g. 911*" style={inp} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={smallLabel}>Note (optional)</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="How did you find this out? Anything else admin should know?" style={{ ...inp, resize: "vertical", minHeight: 70, fontFamily: "inherit" }} />
          </label>
        </div>

        {status && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: status.kind === "ok" ? "rgba(134,239,172,0.10)" : "rgba(252,165,165,0.10)", border: `1px solid ${status.kind === "ok" ? "rgba(134,239,172,0.30)" : "rgba(252,165,165,0.30)"}`, color: status.kind === "ok" ? "#86efac" : "#fca5a5", fontSize: 13, fontWeight: 700 }}>
            {status.msg}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button type="button" onClick={onClose} style={ghostBtn}>Cancel</button>
          <button type="button" onClick={submit} disabled={busy || !newValue.trim()} style={{ ...submitBtn, opacity: busy || !newValue.trim() ? 0.5 : 1 }}>
            {busy ? "Sending…" : "Send to admin"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Suggest a brand-new facility modal ───────────────────────────────────
function NewFacilityModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: "", city: "", state: "",
    primaryLabel: "EMS Patch" as "EMS Patch" | "ED" | "Report Line",
    primaryPhone: "",
    address: "",
    doorCode: "", emsRoomCode: "",
    note: "",
  });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<null | { kind: "ok" | "err"; msg: string }>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function submit() {
    if (!form.name.trim() || !form.city.trim() || !form.state.trim() || !form.primaryPhone.trim() || !form.address.trim()) return;
    setBusy(true); setStatus(null);
    try {
      const r = await fetch("/api/lounge/hospitals/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "new_facility", ...form }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setStatus({ kind: "err", msg: d.error || "Could not submit." }); return; }
      setStatus({ kind: "ok", msg: "Sent to admin for approval." });
      setTimeout(onClose, 1400);
    } finally { setBusy(false); }
  }

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...modal, maxWidth: 540 }}>
        <button type="button" onClick={onClose} style={closeBtn}>×</button>
        <div style={{ color: "#7dd3fc", fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          Suggest a new facility
        </div>
        <h3 style={{ margin: "4px 0 4px", fontSize: 18, fontWeight: 900, color: "white" }}>Add to the directory</h3>
        <p style={{ color: "#94a3b8", fontSize: 12.5, lineHeight: 1.5, margin: "0 0 14px" }}>
          Fill in what you know. Admin will review it, add the lat/lng, and publish it for the crew.
        </p>

        <div style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}><span style={smallLabel}>Facility name *</span>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} style={inp} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}><span style={smallLabel}>City *</span>
              <input value={form.city} onChange={(e) => set("city", e.target.value)} style={inp} /></label>
            <label style={{ display: "grid", gap: 6 }}><span style={smallLabel}>State *</span>
              <input value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="IL / MO" style={inp} /></label>
          </div>
          <label style={{ display: "grid", gap: 6 }}><span style={smallLabel}>Full address *</span>
            <input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="123 Main St, City, ST 12345" style={inp} /></label>

          <div>
            <div style={smallLabel}>Primary line</div>
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {(["EMS Patch", "ED", "Report Line"] as const).map((l) => (
                <button key={l} type="button" onClick={() => set("primaryLabel", l)} style={pill(form.primaryLabel === l)}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <label style={{ display: "grid", gap: 6 }}><span style={smallLabel}>Primary phone *</span>
            <input value={form.primaryPhone} onChange={(e) => set("primaryPhone", e.target.value)} placeholder="(555) 555-5555" style={inp} /></label>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}><span style={smallLabel}>ER door code</span>
              <input value={form.doorCode} onChange={(e) => set("doorCode", e.target.value)} placeholder="if you know it" style={inp} /></label>
            <label style={{ display: "grid", gap: 6 }}><span style={smallLabel}>EMS room code</span>
              <input value={form.emsRoomCode} onChange={(e) => set("emsRoomCode", e.target.value)} placeholder="if you know it" style={inp} /></label>
          </div>
          <label style={{ display: "grid", gap: 6 }}><span style={smallLabel}>Note for admin</span>
            <textarea value={form.note} onChange={(e) => set("note", e.target.value)} rows={3} placeholder="Where did you learn about this place? Specialties to know? Etc." style={{ ...inp, resize: "vertical", minHeight: 70, fontFamily: "inherit" }} /></label>
        </div>

        {status && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: status.kind === "ok" ? "rgba(134,239,172,0.10)" : "rgba(252,165,165,0.10)", border: `1px solid ${status.kind === "ok" ? "rgba(134,239,172,0.30)" : "rgba(252,165,165,0.30)"}`, color: status.kind === "ok" ? "#86efac" : "#fca5a5", fontSize: 13, fontWeight: 700 }}>
            {status.msg}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button type="button" onClick={onClose} style={ghostBtn}>Cancel</button>
          <button type="button" onClick={submit} disabled={busy} style={{ ...submitBtn, opacity: busy ? 0.5 : 1 }}>
            {busy ? "Sending…" : "Send to admin"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── shared bits ──────────────────────────────────────────────────────────
const smallLabel: React.CSSProperties = {
  color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase",
};
const inp: React.CSSProperties = {
  width: "100%", padding: "11px 13px", background: "#040d1a",
  border: "1px solid rgba(255,255,255,0.10)", color: "white", borderRadius: 10,
  fontSize: 14, outline: "none", fontFamily: "inherit",
};
function pill(active: boolean): React.CSSProperties {
  return {
    padding: "7px 14px", borderRadius: 999,
    background: active ? "#7dd3fc" : "transparent",
    color: active ? "#040d1a" : "#cbd5e1",
    border: `1px solid ${active ? "#7dd3fc" : "rgba(255,255,255,0.14)"}`,
    fontFamily: "inherit", fontSize: 12, fontWeight: 800, cursor: "pointer",
  };
}
const ghostBtn: React.CSSProperties = {
  padding: "10px 16px", background: "transparent",
  border: "1px solid rgba(255,255,255,0.14)", color: "#cbd5e1",
  borderRadius: 10, fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer",
};
const submitBtn: React.CSSProperties = {
  flex: 1, padding: "10px 18px", background: "#7dd3fc", color: "#040d1a",
  border: 0, borderRadius: 10, fontFamily: "inherit", fontSize: 13, fontWeight: 900,
  letterSpacing: "0.10em", textTransform: "uppercase", cursor: "pointer",
};
