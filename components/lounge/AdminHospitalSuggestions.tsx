"use client";

import { useState } from "react";

interface SuggestionAuthor { id: string; firstName: string; lastName: string }

interface Suggestion {
  id: string;
  hospitalId: string | null;
  kind: "code_change" | "new_facility";
  payload: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
  submittedBy: SuggestionAuthor;
  decidedBy: SuggestionAuthor | null;
  adminNotes: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export default function AdminHospitalSuggestions({
  initial,
  hospitalNameById,
}: {
  initial: Suggestion[];
  hospitalNameById: Record<string, string>;
}) {
  const [items, setItems] = useState<Suggestion[]>(initial);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [busy, setBusy] = useState<string | null>(null);

  const visible = filter === "pending" ? items.filter((s) => s.status === "pending") : items;

  async function decide(s: Suggestion, decision: "approved" | "rejected") {
    const notes = prompt(`Notes for ${decision} (optional)`) ?? "";
    setBusy(s.id);
    try {
      const res = await fetch(`/api/admin/hospital-suggestions/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, adminNotes: notes || null }),
      });
      if (res.ok) {
        setItems((arr) => arr.map((x) => x.id === s.id ? { ...x, status: decision, adminNotes: notes || null, decidedAt: new Date().toISOString() } : x));
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "Decision failed.");
      }
    } finally { setBusy(null); }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <button type="button" onClick={() => setFilter("pending")} style={chip(filter === "pending")}>
          Pending ({items.filter((s) => s.status === "pending").length})
        </button>
        <button type="button" onClick={() => setFilter("all")} style={chip(filter === "all")}>
          All ({items.length})
        </button>
      </div>

      {visible.length === 0 ? (
        <p style={{ color: "#64748b", fontSize: 14 }}>Nothing in the queue.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {visible.map((s) => {
            const isCode = s.kind === "code_change";
            const target = s.hospitalId ? (hospitalNameById[s.hospitalId] ?? "Unknown hospital") : "(new facility)";
            const payload = s.payload as Record<string, string | null | undefined>;
            return (
              <article key={s.id} style={card(s.status)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ color: isCode ? "#7dd3fc" : "#fbbf24", fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>
                      {isCode ? "Code change" : "New facility"}
                    </div>
                    <h3 style={{ margin: "4px 0 2px", fontSize: 16, fontWeight: 900, color: "white" }}>{target}</h3>
                    <div style={{ color: "#94a3b8", fontSize: 12.5, marginTop: 2 }}>
                      Submitted by {s.submittedBy.firstName} {s.submittedBy.lastName} · {new Date(s.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <span style={statusPill(s.status)}>{s.status}</span>
                </div>

                <div style={{ marginTop: 10, padding: "10px 12px", background: "#040d1a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
                  {isCode ? (
                    <>
                      <Row label="Code type"  value={String(payload.codeKind ?? "—")} />
                      <Row label="New value"  value={String(payload.newValue ?? "—")} mono />
                      {payload.note && <Row label="Note" value={String(payload.note)} />}
                    </>
                  ) : (
                    <>
                      <Row label="Name"        value={String(payload.name ?? "—")} />
                      <Row label="City, state" value={`${payload.city ?? "—"}, ${payload.state ?? "—"}`} />
                      <Row label="Address"     value={String(payload.address ?? "—")} />
                      <Row label="Patch line"  value={`${payload.primaryLabel ?? "EMS Patch"} · ${payload.primaryPhone ?? "—"}`} />
                      {payload.doorCode    && <Row label="ER door code"    value={String(payload.doorCode)} mono />}
                      {payload.emsRoomCode && <Row label="EMS room code"   value={String(payload.emsRoomCode)} mono />}
                      {payload.note        && <Row label="Note"            value={String(payload.note)} />}
                    </>
                  )}
                </div>

                {s.adminNotes && (
                  <div style={{ marginTop: 8, color: "#94a3b8", fontSize: 12.5 }}>
                    Admin notes: <span style={{ color: "#cbd5e1" }}>{s.adminNotes}</span>
                  </div>
                )}

                {s.status === "pending" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    <button type="button" disabled={busy === s.id} onClick={() => decide(s, "approved")} style={approveBtn}>
                      {busy === s.id ? "Working…" : "Approve & Apply"}
                    </button>
                    <button type="button" disabled={busy === s.id} onClick={() => decide(s, "rejected")} style={rejectBtn}>
                      Reject
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "4px 0" }}>
      <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", minWidth: 110 }}>
        {label}
      </div>
      <div style={{ color: "white", fontSize: 14, fontFamily: mono ? "ui-monospace, SFMono-Regular, monospace" : "inherit", fontWeight: mono ? 900 : 500 }}>
        {value}
      </div>
    </div>
  );
}

function chip(active: boolean): React.CSSProperties {
  return {
    padding: "8px 14px",
    background: active ? "rgba(240,180,41,0.12)" : "transparent",
    color: active ? "#f0b429" : "#94a3b8",
    border: `1px solid ${active ? "rgba(240,180,41,0.30)" : "rgba(255,255,255,0.10)"}`,
    borderRadius: 10,
    fontFamily: "inherit",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    cursor: "pointer",
  };
}
function card(status: Suggestion["status"]): React.CSSProperties {
  const borderColor =
    status === "approved" ? "rgba(134,239,172,0.25)" :
    status === "rejected" ? "rgba(252,165,165,0.25)" :
    "rgba(255,255,255,0.06)";
  return {
    background: "#071428",
    border: `1px solid ${borderColor}`,
    borderRadius: 14,
    padding: "14px 16px",
  };
}
function statusPill(status: Suggestion["status"]): React.CSSProperties {
  const colors =
    status === "approved" ? { bg: "rgba(134,239,172,0.12)", fg: "#86efac" } :
    status === "rejected" ? { bg: "rgba(252,165,165,0.12)", fg: "#fca5a5" } :
                            { bg: "rgba(240,180,41,0.12)", fg: "#f0b429" };
  return {
    padding: "4px 10px",
    borderRadius: 999,
    background: colors.bg,
    color: colors.fg,
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  };
}
const approveBtn: React.CSSProperties = {
  padding: "8px 16px",
  background: "#86efac",
  color: "#022c1d",
  border: 0,
  borderRadius: 10,
  fontFamily: "inherit",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  cursor: "pointer",
};
const rejectBtn: React.CSSProperties = {
  padding: "8px 16px",
  background: "transparent",
  color: "#fca5a5",
  border: "1px solid rgba(252,165,165,0.30)",
  borderRadius: 10,
  fontFamily: "inherit",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  cursor: "pointer",
};
