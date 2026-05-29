"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SignaturePad from "./SignaturePad";

interface RosterMember {
  id: string;
  firstName: string;
  lastName: string;
  certification: string | null;
}
interface CurrentUser { id: string; firstName: string; lastName: string }
interface CrewEntry { id: string | null; firstName: string; lastName: string }

interface Log {
  id: string;
  unit: string;
  washedAt: string;
  exempt: boolean;
  exemptReason: string | null;
  truckExteriorWashed: boolean;
  interiorFloorsMopped: boolean;
  crew: CrewEntry[];
  submittedBy: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

const UNITS = ["M3935", "M3926", "M3925"];
const EXEMPT_REASONS = [
  "Inclement weather",
  "Truck out of service / repair",
  "Crew on continuous calls — no time",
  "Other",
];

function nowDateInput() {
  const d = new Date();
  const pad = (n: number) => `${n}`.padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function nowTimeInput() {
  const d = new Date();
  const pad = (n: number) => `${n}`.padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TruckWashClient({ currentUser }: { currentUser: CurrentUser }) {
  const [unit, setUnit] = useState("");
  const [date, setDate] = useState(nowDateInput());
  const [time, setTime] = useState(nowTimeInput());
  const [crew, setCrew] = useState<CrewEntry[]>([
    { id: currentUser.id, firstName: currentUser.firstName, lastName: currentUser.lastName },
  ]);
  const [exempt, setExempt] = useState(false);
  const [exemptReason, setExemptReason] = useState(EXEMPT_REASONS[0]);
  const [truckExteriorWashed, setTruckExteriorWashed] = useState(false);
  const [interiorFloorsMopped, setInteriorFloorsMopped] = useState(false);
  const [notes, setNotes] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<null | { kind: "ok" | "err"; msg: string }>(null);

  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [recent, setRecent] = useState<Log[]>([]);

  useEffect(() => {
    fetch("/api/lounge/roster").then(async (r) => {
      if (!r.ok) return;
      const d = await r.json();
      setRoster(Array.isArray(d.employees) ? d.employees : []);
    });
    void loadRecent();
  }, []);

  const loadRecent = useCallback(async () => {
    const r = await fetch("/api/lounge/truckwash");
    if (!r.ok) return;
    const d = await r.json();
    setRecent(Array.isArray(d.logs) ? d.logs.slice(0, 5) : []);
  }, []);

  const filteredPicker = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    const haveIds = new Set(crew.map((c) => c.id).filter(Boolean));
    return roster
      .filter((m) => !haveIds.has(m.id) && m.id !== currentUser.id)
      .filter((m) => !q || `${m.firstName} ${m.lastName}`.toLowerCase().includes(q));
  }, [roster, crew, pickerSearch, currentUser.id]);

  function addCrewFromRoster(m: RosterMember) {
    setCrew((c) => [...c, { id: m.id, firstName: m.firstName, lastName: m.lastName }]);
    setPickerSearch("");
    setShowPicker(false);
  }
  function addCrewManual() {
    const name = prompt("Name of crew member not on the roster")?.trim();
    if (!name) return;
    const [first, ...rest] = name.split(/\s+/);
    setCrew((c) => [...c, { id: null, firstName: first, lastName: rest.join(" ") || "" }]);
  }
  function removeCrew(idx: number) {
    if (idx === 0) return; // crew[0] is the logged-in user
    setCrew((c) => c.filter((_, i) => i !== idx));
  }

  const canSubmit = (() => {
    if (!unit || !signature) return false;
    if (exempt) return !!exemptReason;
    return truckExteriorWashed && interiorFloorsMopped;
  })();

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setStatus(null);
    try {
      const washedAt = new Date(`${date}T${time}`).toISOString();
      const res = await fetch("/api/lounge/truckwash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit,
          washedAt,
          exempt,
          exemptReason: exempt ? exemptReason : null,
          truckExteriorWashed,
          interiorFloorsMopped,
          crew,
          notes: notes || null,
          signatureDataUrl: signature,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus({ kind: "err", msg: data?.error || "Could not submit." });
        return;
      }
      setStatus({ kind: "ok", msg: "Wash log submitted." });
      // Reset form (keep unit so crew can log another truck same shift)
      setSignature(null);
      setTruckExteriorWashed(false);
      setInteriorFloorsMopped(false);
      setExempt(false);
      setExemptReason(EXEMPT_REASONS[0]);
      setNotes("");
      setCrew([{ id: currentUser.id, firstName: currentUser.firstName, lastName: currentUser.lastName }]);
      void loadRecent();
    } catch {
      setStatus({ kind: "err", msg: "Could not submit. Try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <header style={{ marginBottom: 18 }}>
        <div style={{ color: "#f0b429", fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          Truck Wash Log
        </div>
        <h1 style={{ margin: "4px 0 6px", fontSize: "1.85rem", fontWeight: 900, letterSpacing: "-0.015em" }}>
          Log a wash for the rotation
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.55 }}>
          You&apos;re auto-logged as a participant. Add anyone else who helped with the <strong>+</strong>{" "}
          button, then sign at the bottom to record the wash.
        </p>
      </header>

      <Notice>
        <strong style={{ color: "#fbbf24" }}>Mandatory.</strong>{" "}
        All Millstadt ambulances must be washed in accordance with the Ambulance Washing Schedule —
        at least once per week per the calendar. Inclement weather is the only acceptable exemption.
        Both crew members are required to participate, except the Chief and Asst. Chief.
      </Notice>

      {status && (
        <div style={{
          marginTop: 12, padding: 12, borderRadius: 12,
          background: status.kind === "ok" ? "rgba(134,239,172,0.12)" : "rgba(252,165,165,0.12)",
          border: `1px solid ${status.kind === "ok" ? "rgba(134,239,172,0.30)" : "rgba(252,165,165,0.30)"}`,
          color: status.kind === "ok" ? "#86efac" : "#fca5a5",
          fontSize: 13, fontWeight: 700,
        }}>{status.msg}</div>
      )}

      <Card title="When & Who">
        <Field label="Truck">
          <select value={unit} onChange={(e) => setUnit(e.target.value)} style={inp}>
            <option value="">Select…</option>
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </Field>
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} />
        </Field>
        <Field label="Time">
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inp} />
        </Field>

        <div style={{ marginTop: 14 }}>
          <div style={fieldLabel}>Crew that participated</div>
          <div style={{ display: "grid", gap: 8 }}>
            {crew.map((c, i) => (
              <div key={`${c.id ?? "manual"}-${i}`} style={crewRow}>
                <div>
                  <div style={{ fontWeight: 800, color: "white", fontSize: 14 }}>
                    {c.firstName} {c.lastName}
                  </div>
                  {i === 0 && (
                    <div style={{ color: "#86efac", fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", marginTop: 2 }}>
                      You (auto)
                    </div>
                  )}
                </div>
                {i > 0 && (
                  <button type="button" onClick={() => removeCrew(i)} style={removeBtn}>×</button>
                )}
              </div>
            ))}
          </div>

          {!showPicker ? (
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button type="button" onClick={() => setShowPicker(true)} style={plusBtn}>+ Add Crew</button>
              <button type="button" onClick={addCrewManual} style={ghostBtn}>+ Add Someone Off-Roster</button>
            </div>
          ) : (
            <div style={{ marginTop: 10, padding: 10, background: "#040d1a", border: "1px solid rgba(240,180,41,0.30)", borderRadius: 10 }}>
              <input
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Search roster…"
                style={inp}
                autoFocus
              />
              <div style={{ marginTop: 8, maxHeight: 220, overflow: "auto", display: "grid", gap: 4 }}>
                {filteredPicker.length === 0 ? (
                  <div style={{ color: "#64748b", fontSize: 13, padding: 8 }}>No matches.</div>
                ) : filteredPicker.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => addCrewFromRoster(m)}
                    style={pickerItem}
                  >
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{m.firstName} {m.lastName}</span>
                    {m.certification && (
                      <span style={{ color: "#94a3b8", fontSize: 12, marginLeft: 8 }}>· {m.certification}</span>
                    )}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <button type="button" onClick={() => setShowPicker(false)} style={ghostBtn}>Done</button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card title="Verification">
        <label style={checkRow}>
          <input type="checkbox" checked={exempt} onChange={(e) => setExempt(e.target.checked)} style={checkbox} />
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: 14 }}>Wash not performed (exempt)</div>
            <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
              Check this if the wash could not be performed — e.g. inclement weather, truck out of service. Pick a reason below.
            </div>
          </div>
        </label>

        {exempt && (
          <Field label="Reason">
            <select value={exemptReason} onChange={(e) => setExemptReason(e.target.value)} style={inp}>
              {EXEMPT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
        )}

        {!exempt && (
          <>
            <label style={checkRow}>
              <input type="checkbox" checked={truckExteriorWashed} onChange={(e) => setTruckExteriorWashed(e.target.checked)} style={checkbox} />
              <div>
                <div style={{ color: "white", fontWeight: 800, fontSize: 14 }}>Truck exterior washed</div>
                <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
                  By confirming, you affirm that you have thoroughly washed the ambulance exterior.
                </div>
              </div>
            </label>
            <label style={checkRow}>
              <input type="checkbox" checked={interiorFloorsMopped} onChange={(e) => setInteriorFloorsMopped(e.target.checked)} style={checkbox} />
              <div>
                <div style={{ color: "white", fontWeight: 800, fontSize: 14 }}>Inside floors mopped</div>
                <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
                  By confirming, you affirm that you have mopped the interior floors of the patient compartment.
                </div>
              </div>
            </label>
          </>
        )}

        <Field label="Notes (optional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything leadership should know about this wash."
            rows={3}
            style={{ ...inp, resize: "vertical", minHeight: 80, fontFamily: "inherit" }}
          />
        </Field>
      </Card>

      <Card title="Sign to submit">
        <p style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.5, margin: "0 0 12px" }}>
          Your signature certifies that the information above is accurate.
        </p>
        <SignaturePad value={signature} onChange={setSignature} label="Submitter signature" height={160} />

        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit || submitting}
          style={{
            ...submitBtn,
            background: canSubmit && !submitting ? "#f0b429" : "rgba(240,180,41,0.40)",
            cursor: canSubmit && !submitting ? "pointer" : "not-allowed",
          }}
        >
          {submitting ? "Submitting…" : "Submit wash log"}
        </button>
      </Card>

      {recent.length > 0 && (
        <Card title="Your station's recent washes">
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
            {recent.map((l) => (
              <li key={l.id} style={recentRow}>
                <div>
                  <div style={{ fontWeight: 800, color: "white", fontSize: 14 }}>
                    {l.unit} — {new Date(l.washedAt).toLocaleDateString()}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
                    {l.exempt ? `Exempt — ${l.exemptReason}` : "Washed + mopped"} · {l.crew.map(c => `${c.firstName} ${c.lastName}`).join(", ")}
                  </div>
                </div>
                <div style={{ color: "#64748b", fontSize: 12 }}>
                  by {l.submittedBy.firstName} {l.submittedBy.lastName}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

// ── UI primitives ────────────────────────────────────────────────────────
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 18, background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "22px 22px 24px" }}>
      <h2 style={{ margin: "0 0 16px", color: "white", fontSize: 15, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      marginTop: 6, padding: "14px 16px",
      background: "rgba(251,191,36,0.06)",
      border: "1px solid rgba(251,191,36,0.30)",
      borderLeft: "4px solid #fbbf24",
      borderRadius: 12,
      color: "#e2e8f0", fontSize: 13.5, lineHeight: 1.55,
    }}>{children}</div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6, marginTop: 12 }}>
      <span style={fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

const fieldLabel: React.CSSProperties = { color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" };
const inp: React.CSSProperties = {
  width: "100%", padding: "12px 14px",
  background: "#040d1a", border: "1px solid rgba(255,255,255,0.10)",
  color: "white", borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit",
};
const checkRow: React.CSSProperties = {
  display: "flex", gap: 14, alignItems: "flex-start",
  padding: "12px 14px", marginTop: 12,
  background: "#040d1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
  cursor: "pointer",
};
const checkbox: React.CSSProperties = { width: 22, height: 22, marginTop: 2, accentColor: "#f0b429", flexShrink: 0 };
const crewRow: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
  padding: "12px 14px", background: "#040d1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
};
const removeBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 999,
  background: "rgba(252,165,165,0.12)", border: "1px solid rgba(252,165,165,0.30)",
  color: "#fca5a5", fontWeight: 900, fontSize: 16, cursor: "pointer", lineHeight: 1, fontFamily: "inherit",
};
const plusBtn: React.CSSProperties = {
  padding: "10px 16px", background: "#f0b429", color: "#040d1a", border: 0, borderRadius: 12,
  fontFamily: "inherit", fontSize: 13, fontWeight: 900, letterSpacing: "0.10em", textTransform: "uppercase", cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  padding: "10px 16px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
  color: "#cbd5e1", borderRadius: 12, fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer",
};
const pickerItem: React.CSSProperties = {
  display: "block", textAlign: "left", padding: "10px 12px",
  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
  color: "white", borderRadius: 8, fontFamily: "inherit", fontSize: 14, cursor: "pointer",
};
const submitBtn: React.CSSProperties = {
  marginTop: 14, width: "100%", padding: "14px 18px",
  color: "#040d1a", border: 0, borderRadius: 14,
  fontFamily: "inherit", fontSize: 14, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase",
};
const recentRow: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
  padding: "10px 12px", background: "#040d1a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10,
};
