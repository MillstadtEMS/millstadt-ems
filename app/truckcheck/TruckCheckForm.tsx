"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SignaturePad from "./SignaturePad";

type Status = "OK" | "ISSUE" | "NA";

const CHECKLIST_GROUPS: { group: string; items: string[] }[] = [
  {
    group: "Vehicle / Exterior",
    items: [
      "Engine oil",
      "Coolant",
      "Washer fluid",
      "Tires (pressure + condition)",
      "Body / damage",
      "Headlights, brake, signals",
      "Emergency lights",
      "Siren / air horn",
    ],
  },
  {
    group: "Cab",
    items: [
      "Seat belts",
      "Mirrors",
      "Wipers",
      "Radios (primary + backup)",
      "Mobile / MDT",
      "PPE / gloves stocked",
    ],
  },
  {
    group: "Patient Compartment",
    items: [
      "Suction unit",
      "Stretcher (locks, straps, battery)",
      "Stair chair",
      "AED",
      "Defibrillator (battery + pads in-date)",
      "Drug box seal intact",
      "Airway / intubation kit",
      "IV supplies",
      "Trauma kit / bandages",
      "Splints / C-collars",
      "BVM (adult + pediatric)",
      "Linens / pillows",
      "Cleaning / sanitizer",
    ],
  },
];

const STATUS_CYCLE: Record<Status, Status> = { OK: "ISSUE", ISSUE: "NA", NA: "OK" };

export default function TruckCheckForm() {
  const router = useRouter();

  const [truckNumber, setTruckNumber] = useState("");
  const [attendant1Name, setAttendant1Name] = useState("");
  const [attendant2Name, setAttendant2Name] = useState("");
  const [attendant1Signature, setAttendant1Signature] = useState("");
  const [attendant2Signature, setAttendant2Signature] = useState("");
  const [odometer, setOdometer] = useState("");
  const [fuelLevel, setFuelLevel] = useState("");
  const [mainO2Psi, setMainO2Psi] = useState("");
  const [portableO2Psi, setPortableO2Psi] = useState("");

  const initialChecklist: Record<string, Status> = {};
  for (const g of CHECKLIST_GROUPS) for (const i of g.items) initialChecklist[i] = "OK";
  const [checklist, setChecklist] = useState<Record<string, Status>>(initialChecklist);

  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function cycle(item: string) {
    setChecklist((c) => ({ ...c, [item]: STATUS_CYCLE[c[item]] }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!truckNumber.trim()) return setError("Truck number required.");
    if (!attendant1Name.trim()) return setError("Attendant 1 name required.");
    if (!attendant1Signature) return setError("Attendant 1 signature required.");
    if (attendant2Name.trim() && !attendant2Signature)
      return setError("Attendant 2 signature required when name is filled in.");

    setSubmitting(true);
    const res = await fetch("/api/truckcheck/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        truckNumber,
        attendant1Name,
        attendant2Name,
        attendant1Signature,
        attendant2Signature,
        odometer,
        fuelLevel,
        mainO2Psi,
        portableO2Psi,
        checklist,
        notes,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Submission failed.");
      return;
    }
    router.push("/truckcheck/submitted");
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Truck + crew */}
      <section style={card}>
        <h2 style={cardTitle}>Crew & Truck</h2>
        <div style={{ display: "grid", gap: 14 }}>
          <Field label="Truck Number" required>
            <input value={truckNumber} onChange={(e) => setTruckNumber(e.target.value)} style={inp} placeholder="e.g. 3926" autoComplete="off" />
          </Field>
          <Field label="Attendant 1 Name" required>
            <input value={attendant1Name} onChange={(e) => setAttendant1Name(e.target.value)} style={inp} placeholder="First Last" autoComplete="off" />
          </Field>
          <Field label="Attendant 2 Name">
            <input value={attendant2Name} onChange={(e) => setAttendant2Name(e.target.value)} style={inp} placeholder="First Last (optional)" autoComplete="off" />
          </Field>
        </div>
      </section>

      {/* Quick numbers */}
      <section style={card}>
        <h2 style={cardTitle}>Quick Readings</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Odometer"><input value={odometer} onChange={(e) => setOdometer(e.target.value)} style={inp} inputMode="numeric" placeholder="miles" /></Field>
          <Field label="Fuel Level"><input value={fuelLevel} onChange={(e) => setFuelLevel(e.target.value)} style={inp} placeholder="e.g. 7/8" /></Field>
          <Field label="Main O₂ (PSI)"><input value={mainO2Psi} onChange={(e) => setMainO2Psi(e.target.value)} style={inp} inputMode="numeric" placeholder="psi" /></Field>
          <Field label="Portable O₂ (PSI)"><input value={portableO2Psi} onChange={(e) => setPortableO2Psi(e.target.value)} style={inp} inputMode="numeric" placeholder="psi" /></Field>
        </div>
      </section>

      {/* Checklist */}
      {CHECKLIST_GROUPS.map((g) => (
        <section key={g.group} style={card}>
          <h2 style={cardTitle}>{g.group}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {g.items.map((item) => {
              const status = checklist[item];
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => cycle(item)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background:
                      status === "OK" ? "rgba(34,197,94,0.10)" : status === "ISSUE" ? "rgba(239,68,68,0.14)" : "rgba(255,255,255,0.04)",
                    color: "white",
                    fontSize: 16,
                    fontWeight: 600,
                    textAlign: "left",
                    touchAction: "manipulation",
                    cursor: "pointer",
                  }}
                >
                  <span>{item}</span>
                  <span
                    style={{
                      minWidth: 64,
                      textAlign: "center",
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 900,
                      letterSpacing: "0.08em",
                      color: status === "OK" ? "#22c55e" : status === "ISSUE" ? "#fca5a5" : "#94a3b8",
                      background: status === "OK" ? "rgba(34,197,94,0.20)" : status === "ISSUE" ? "rgba(239,68,68,0.20)" : "rgba(148,163,184,0.18)",
                      border: `1px solid ${status === "OK" ? "rgba(34,197,94,0.45)" : status === "ISSUE" ? "rgba(239,68,68,0.45)" : "rgba(148,163,184,0.4)"}`,
                    }}
                  >
                    {status === "OK" ? "OK" : status === "ISSUE" ? "ISSUE" : "N/A"}
                  </span>
                </button>
              );
            })}
          </div>
          <p style={{ color: "#64748b", fontSize: 12, marginTop: 10 }}>Tap a row to cycle OK → Issue → N/A.</p>
        </section>
      ))}

      {/* Notes */}
      <section style={card}>
        <h2 style={cardTitle}>Notes / Issues</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Anything broken, low, missing, or noteworthy?"
          style={{ ...inp, resize: "vertical", minHeight: 120 }}
        />
      </section>

      {/* Signatures */}
      <section style={card}>
        <h2 style={cardTitle}>Signatures</h2>
        <div style={{ display: "grid", gap: 24 }}>
          <SignaturePad label={`Attendant 1${attendant1Name ? ` — ${attendant1Name}` : ""}`} value={attendant1Signature} onChange={setAttendant1Signature} />
          {attendant2Name && (
            <SignaturePad label={`Attendant 2 — ${attendant2Name}`} value={attendant2Signature} onChange={setAttendant2Signature} />
          )}
        </div>
      </section>

      {error && (
        <div style={{ padding: 14, borderRadius: 12, background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.45)", color: "#fecaca", fontWeight: 600 }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: "20px 24px",
          borderRadius: 16,
          background: submitting ? "#a07a1c" : "#f0b429",
          color: "#040d1a",
          fontWeight: 900,
          fontSize: 18,
          letterSpacing: "0.04em",
          border: "none",
          cursor: submitting ? "default" : "pointer",
          touchAction: "manipulation",
        }}
      >
        {submitting ? "Submitting…" : "Submit Truck Check"}
      </button>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ color: "#f0b429", fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#fca5a5", marginLeft: 4 }}>*</span>}
      </div>
      {children}
    </label>
  );
}

const card: React.CSSProperties = {
  padding: 20,
  borderRadius: 16,
  background: "#071428",
  border: "1px solid rgba(255,255,255,0.08)",
};

const cardTitle: React.CSSProperties = {
  color: "white",
  fontSize: 18,
  fontWeight: 900,
  marginBottom: 16,
  letterSpacing: "-0.01em",
};

const inp: React.CSSProperties = {
  width: "100%",
  padding: "14px 14px",
  background: "#040d1a",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  color: "white",
  fontSize: 16,
  outline: "none",
  fontFamily: "inherit",
};
