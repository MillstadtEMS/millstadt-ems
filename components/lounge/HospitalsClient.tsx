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
  emsDoorCode,
}: { hospitals: H[]; stationLat: number; stationLng: number; emsDoorCode: string }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<H | null>(null);
  const [liveEtas, setLiveEtas] = useState<Record<string, LiveEta>>({});

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
        <div style={{ padding: "10px 14px", background: "rgba(240,180,41,0.08)", border: "1px solid rgba(240,180,41,0.25)", borderRadius: 12, color: "#f0b429", fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          EMS door {emsDoorCode}
        </div>
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

      {open && <DetailModal h={open} liveEta={liveEtas[open.id]} emsDoorCode={emsDoorCode} onClose={() => setOpen(null)} />}
    </div>
  );
}

function DetailModal({ h, liveEta, emsDoorCode, onClose }: { h: H; liveEta?: LiveEta; emsDoorCode: string; onClose: () => void }) {
  const eta = estEtaMin(h.miles);
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
          <div style={sectionLabel}>Access Codes</div>
          <div style={{ display: "grid", gap: 6 }}>
            <CodeRow label="EMS Door (Millstadt)" value={emsDoorCode} accent="#86efac" />
            {h.doorCode && <CodeRow label="Hospital ER Door" value={h.doorCode} />}
            {h.emsRoomCode && <CodeRow label="Hospital EMS Room" value={h.emsRoomCode} />}
            {h.codes?.map((c, i) => (
              <CodeRow key={i} label={c.kind} value={c.value} note={c.note} />
            ))}
            {!h.doorCode && !h.emsRoomCode && !h.codes?.length && (
              <div style={{ color: "#64748b", fontSize: 12 }}>No hospital-side codes on file.</div>
            )}
          </div>
        </section>

        {h.notes && (
          <section style={{ marginTop: 14 }}>
            <div style={sectionLabel}>Notes</div>
            <div style={{ color: "#e2e8f0", fontSize: 13.5, lineHeight: 1.5 }}>{h.notes}</div>
          </section>
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
