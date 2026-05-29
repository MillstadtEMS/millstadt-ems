"use client";

import { useMemo, useState } from "react";

interface CrewEntry { id: string | null; firstName: string; lastName: string }
interface Log {
  id: string;
  unit: string;
  washedAt: string;
  exempt: boolean;
  exemptReason: string | null;
  truckExteriorWashed: boolean;
  interiorFloorsMopped: boolean;
  signatureDataUrl: string;
  crew: CrewEntry[];
  notes: string | null;
  submittedBy: { id: string; firstName: string; lastName: string; photoUrl: string | null };
  createdAt: string;
}

const UNITS = ["", "M3935", "M3926", "M3925"];

export default function AdminTruckWashLog({ initialLogs }: { initialLogs: Log[] }) {
  const [logs, setLogs] = useState<Log[]>(initialLogs);
  const [unit, setUnit] = useState("");
  const [scope, setScope] = useState<"all" | "exempt" | "complete">("all");
  const [open, setOpen] = useState<Log | null>(null);

  const filtered = useMemo(() => logs.filter((l) => {
    if (unit && l.unit !== unit) return false;
    if (scope === "exempt" && !l.exempt) return false;
    if (scope === "complete" && l.exempt) return false;
    return true;
  }), [logs, unit, scope]);

  async function remove(id: string) {
    if (!confirm("Delete this wash log entry? This cannot be undone.")) return;
    const r = await fetch(`/api/admin/truckwash/${id}`, { method: "DELETE" });
    if (r.ok) {
      setLogs((s) => s.filter((l) => l.id !== id));
      setOpen(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <label style={chip}>
          Truck
          <select value={unit} onChange={(e) => setUnit(e.target.value)} style={selStyle}>
            {UNITS.map((u) => <option key={u || "all"} value={u}>{u || "All"}</option>)}
          </select>
        </label>
        <label style={chip}>
          Show
          <select value={scope} onChange={(e) => setScope(e.target.value as "all" | "exempt" | "complete")} style={selStyle}>
            <option value="all">All entries</option>
            <option value="complete">Washed only</option>
            <option value="exempt">Exempt only</option>
          </select>
        </label>
        <span style={{ color: "#64748b", fontSize: 12, marginLeft: "auto" }}>
          Showing {filtered.length} of {logs.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: "#64748b", fontSize: 14 }}>No wash entries match this filter.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((l) => (
            <button key={l.id} type="button" onClick={() => setOpen(l)} style={row}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14.5, color: "white" }}>
                  {l.unit} · {new Date(l.washedAt).toLocaleString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                </div>
                <div style={{ color: "#94a3b8", fontSize: 12.5, marginTop: 3 }}>
                  {l.crew.map((c) => `${c.firstName} ${c.lastName}`).join(", ")}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{
                  padding: "4px 10px", borderRadius: 999,
                  background: l.exempt ? "rgba(251,191,36,0.15)" : "rgba(134,239,172,0.12)",
                  color: l.exempt ? "#fbbf24" : "#86efac",
                  fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase",
                }}>
                  {l.exempt ? "Exempt" : "Complete"}
                </span>
                {l.exempt && l.exemptReason && (
                  <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 4 }}>{l.exemptReason}</div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && (
        <div
          onClick={() => setOpen(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 640, background: "#040d1a", border: "1px solid rgba(240,180,41,0.30)", borderRadius: 16, padding: 22, color: "white", maxHeight: "90vh", overflow: "auto" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div>
                <div style={{ color: "#f0b429", fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                  {open.unit}
                </div>
                <h3 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 900 }}>
                  {new Date(open.washedAt).toLocaleString("en-US", { timeZone: "America/Chicago", weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                </h3>
              </div>
              <button onClick={() => setOpen(null)} type="button" style={{ background: "transparent", border: 0, color: "#cbd5e1", fontSize: 24, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            <Block label="Crew">
              {open.crew.map((c, i) => (
                <div key={i} style={{ fontSize: 14 }}>
                  {c.firstName} {c.lastName} {c.id ? "" : <span style={{ color: "#94a3b8", fontSize: 11, marginLeft: 6 }}>(off-roster)</span>}
                </div>
              ))}
            </Block>

            <Block label="Outcome">
              {open.exempt ? (
                <div style={{ color: "#fbbf24" }}>Exempt — {open.exemptReason}</div>
              ) : (
                <div>
                  <div>{open.truckExteriorWashed ? "✓ Exterior washed" : "—"}</div>
                  <div>{open.interiorFloorsMopped ? "✓ Interior floors mopped" : "—"}</div>
                </div>
              )}
            </Block>

            {open.notes && (
              <Block label="Notes">
                <div style={{ whiteSpace: "pre-wrap", color: "#e2e8f0", fontSize: 13.5 }}>{open.notes}</div>
              </Block>
            )}

            <Block label="Submitter signature">
              <div style={{ background: "white", borderRadius: 10, padding: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={open.signatureDataUrl} alt="Signature" style={{ width: "100%", display: "block" }} />
              </div>
              <div style={{ marginTop: 8, color: "#94a3b8", fontSize: 12 }}>
                Submitted by {open.submittedBy.firstName} {open.submittedBy.lastName} at{" "}
                {new Date(open.createdAt).toLocaleString()}
              </div>
            </Block>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <button
                type="button"
                onClick={() => remove(open.id)}
                style={{ background: "transparent", border: "1px solid rgba(252,165,165,0.30)", color: "#fca5a5", padding: "8px 14px", borderRadius: 10, fontFamily: "inherit", fontSize: 12, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", cursor: "pointer" }}
              >
                Delete entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 14 }}>
      <div style={{ color: "#f0b429", fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </section>
  );
}

const chip: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#071428", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" };
const selStyle: React.CSSProperties = { background: "#040d1a", border: "1px solid rgba(255,255,255,0.10)", color: "white", padding: "6px 10px", borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit" };
const row: React.CSSProperties = { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "14px 16px", background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, color: "white", textAlign: "left", cursor: "pointer", fontFamily: "inherit" };
