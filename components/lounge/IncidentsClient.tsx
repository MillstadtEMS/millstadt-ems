"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoungePageHeader from "@/components/lounge/LoungePageHeader";

type Status = "pending" | "under_review" | "resolved" | "dismissed";
interface Author {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
}
interface AdminNote {
  authorId: string;
  authorName: string;
  body: string;
  at: string;
}
interface Report {
  id: string;
  createdBy: Author;
  reviewStatus: Status;
  incidentDate: string | null;
  incidentTime: string | null;
  city: string | null;
  specificLocation: string | null;
  unitInvolved: string | null;
  adminNotes: AdminNote[];
  payload: {
    summary?: string;
    patientInvolved?: string;
    witnesses?: string;
    actionsTaken?: string;
    [k: string]: unknown;
  };
  createdAt: string;
}

const UNITS = ["m3925", "m3926", "m3935", "Other", "N/A"];

export default function IncidentsClient() {
  const router = useRouter();
  const [me, setMe] = useState<{ id: string; firstName: string; lastName: string; isAdmin: boolean } | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [composing, setComposing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/lounge/me")
      .then(async (r) => {
        if (!r.ok) { router.push("/lounge/login"); return; }
        setMe((await r.json()).employee);
      })
      .catch(() => router.push("/lounge/login"));
  }, [router]);

  const load = useCallback(async () => {
    const r = await fetch("/api/lounge/incidents");
    if (r.ok) setReports((await r.json()).reports);
    setLoading(false);
  }, []);
  useEffect(() => { if (me) load(); }, [me, load]);

  async function create(input: Partial<Report> & {
    summary: string;
    photos?: { url: string; name?: string }[];
  }) {
    const res = await fetch("/api/lounge/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        incidentDate: input.incidentDate,
        incidentTime: input.incidentTime,
        city: input.city,
        specificLocation: input.specificLocation,
        unitInvolved: input.unitInvolved,
        payload: input.payload,
        media: (input.photos ?? []).map((p) => ({ url: p.url, kind: "image", name: p.name })),
      }),
    });
    if (res.ok) {
      setComposing(false);
      load();
    }
  }

  async function setStatus(id: string, status: Status) {
    const res = await fetch(`/api/lounge/incidents/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const d = await res.json();
      setReports((s) => s.map((r) => (r.id === id ? d.report : r)));
    }
  }

  async function addNote(id: string, body: string) {
    const res = await fetch(`/api/lounge/incidents/${id}/admin-note`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.ok) {
      const d = await res.json();
      setReports((s) => s.map((r) => (r.id === id ? d.report : r)));
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this report?")) return;
    const res = await fetch(`/api/lounge/incidents/${id}`, { method: "DELETE" });
    if (res.ok) setReports((s) => s.filter((r) => r.id !== id));
  }

  if (!me) return <p style={{ color: "#94a3b8" }}>Loading…</p>;

  return (
    <div>
      <LoungePageHeader
        kicker="Safety / Quality"
        title="Incident Reports"
        description={me.isAdmin ? "All reports across the crew." : "Your reports. Only admins can see them."}
        actions={
          <button type="button" onClick={() => setComposing(true)} style={goldBtn}>+ New Report</button>
        }
        photo="/lounge/brand/incident-scene.jpg"
        photoPosition="center 40%"
      />

      {composing && <Composer me={me} onCancel={() => setComposing(false)} onCreate={create} />}

      {loading ? (
        <p style={{ color: "#64748b", marginTop: 24 }}>Loading…</p>
      ) : reports.length === 0 ? (
        <div
          style={{
            marginTop: 28,
            padding: "44px 22px",
            textAlign: "center",
            background: "#071428",
            border: "1px dashed rgba(255,255,255,0.10)",
            borderRadius: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1rem" }}>No reports.</h2>
          <p style={{ color: "#94a3b8", fontSize: "0.88rem", margin: "6px 0 0" }}>
            File a report and it lands here for you (and leadership) to track.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
          {reports.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              me={me}
              onSetStatus={(s) => setStatus(r.id, s)}
              onAddNote={(b) => addNote(r.id, b)}
              onDelete={() => remove(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Composer ────────────────────────────────────────────────────────────

interface RosterEntry { id: string; firstName: string; lastName: string; certification: string | null }

function Composer({
  me,
  onCancel,
  onCreate,
}: {
  me: { id: string; firstName: string; lastName: string };
  onCancel: () => void;
  onCreate: (input: Partial<Report> & { summary: string; photos?: { url: string; name?: string }[] }) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  const [city, setCity] = useState("");
  const [location, setLocation] = useState("");
  const [unit, setUnit] = useState("");
  const [summary, setSummary] = useState("");
  const [patientInvolved, setPatientInvolved] = useState("");
  const [witnesses, setWitnesses] = useState("");
  const [actionsTaken, setActionsTaken] = useState("");

  // Photos
  const [photos, setPhotos] = useState<{ url: string; name?: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  // Involved employees (roster pick)
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [involved, setInvolved] = useState<{ id: string; name: string }[]>([
    { id: me.id, name: `${me.firstName} ${me.lastName}` },
  ]);
  const [rosterSearch, setRosterSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    fetch("/api/lounge/roster").then(async (r) => {
      if (r.ok) setRoster((await r.json()).employees ?? []);
    });
  }, []);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const form = new FormData();
        form.append("file", f);
        const r = await fetch("/api/lounge/incidents/photo", { method: "POST", body: form });
        if (r.ok) {
          const d = await r.json();
          setPhotos((s) => [...s, { url: d.url, name: d.name ?? f.name }]);
        }
      }
    } finally {
      setUploading(false);
    }
  }
  function removePhoto(url: string) {
    setPhotos((s) => s.filter((p) => p.url !== url));
  }

  function addInvolved(e: RosterEntry) {
    if (involved.some((x) => x.id === e.id)) return;
    setInvolved((s) => [...s, { id: e.id, name: `${e.firstName} ${e.lastName}` }]);
  }
  function removeInvolved(id: string) {
    setInvolved((s) => s.filter((x) => x.id !== id));
  }
  const filteredRoster = roster
    .filter((r) => !involved.some((x) => x.id === r.id))
    .filter((r) => {
      const q = rosterSearch.trim().toLowerCase();
      if (!q) return true;
      return `${r.firstName} ${r.lastName}`.toLowerCase().includes(q);
    });

  function submit() {
    if (!summary.trim()) return;
    onCreate({
      incidentDate: date || undefined,
      incidentTime: time || undefined,
      city: city.trim() || undefined,
      specificLocation: location.trim() || undefined,
      unitInvolved: unit || undefined,
      payload: {
        summary: summary.trim(),
        patientInvolved: patientInvolved.trim(),
        witnesses: witnesses.trim(),
        actionsTaken: actionsTaken.trim(),
        submittedBy: `${me.firstName} ${me.lastName}`,
        involvedEmployees: involved,
      },
      summary: summary.trim(),
      photos,
    });
  }

  return (
    <section
      style={{
        marginTop: 16,
        background: "#071428",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: 16,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={eyebrowStyle}>New Incident Report</div>
      <Row>
        <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} /></Field>
        <Field label="Time"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={inputStyle} /></Field>
      </Row>
      <Row>
        <Field label="City"><input value={city} onChange={(e) => setCity(e.target.value)} style={inputStyle} /></Field>
        <Field label="Specific location"><input value={location} onChange={(e) => setLocation(e.target.value)} style={inputStyle} /></Field>
      </Row>
      <Field label="Unit involved">
        <select value={unit} onChange={(e) => setUnit(e.target.value)} style={inputStyle}>
          <option value="">—</option>
          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </Field>
      <Field label="What happened? (summary, required)">
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={4}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", minHeight: 110 }}
        />
      </Field>
      <Row>
        <Field label="Patient involved (initials or 'none')"><input value={patientInvolved} onChange={(e) => setPatientInvolved(e.target.value)} style={inputStyle} /></Field>
        <Field label="Witnesses"><input value={witnesses} onChange={(e) => setWitnesses(e.target.value)} style={inputStyle} /></Field>
      </Row>
      <Field label="Actions taken at scene / immediately after">
        <textarea
          value={actionsTaken}
          onChange={(e) => setActionsTaken(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", minHeight: 80 }}
        />
      </Field>

      {/* Employees involved */}
      <div>
        <div style={eyebrowStyle}>Employees involved ({involved.length})</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          {involved.map((e) => (
            <span key={e.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(240,180,41,0.10)", border: "1px solid rgba(240,180,41,0.30)", color: "white", padding: "6px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
              {e.name}
              {e.id !== me.id && (
                <button type="button" onClick={() => removeInvolved(e.id)} style={{ background: "transparent", border: 0, color: "#fca5a5", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }} aria-label={`Remove ${e.name}`}>×</button>
              )}
            </span>
          ))}
          <button type="button" onClick={() => setShowPicker((v) => !v)} style={{ ...ghostBtn, padding: "6px 12px", fontSize: 12 }}>
            {showPicker ? "Close roster" : "+ Add"}
          </button>
        </div>
        {showPicker && (
          <div style={{ marginTop: 8, background: "#040d1a", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: 8 }}>
            <input
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
              placeholder="Search employees…"
              style={{ ...inputStyle, padding: "8px 10px", fontSize: 13 }}
            />
            <div style={{ maxHeight: 200, overflowY: "auto", marginTop: 8, display: "grid", gap: 4 }}>
              {filteredRoster.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => addInvolved(r)}
                  style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, color: "white", fontSize: 13, fontWeight: 700, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}
                >
                  <span>{r.firstName} {r.lastName}</span>
                  {r.certification && <span style={{ color: "#94a3b8", fontSize: 11 }}>{r.certification}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Photos */}
      <div>
        <div style={eyebrowStyle}>Photos ({photos.length})</div>
        <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 6, marginBottom: 8 }}>
          Take a photo with your phone camera or upload from your library. Each photo appears full-size on its own page in the PDF.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label style={{ ...goldBtn, cursor: uploading ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 16px" }}>
            Take photo
            <input type="file" accept="image/*" capture="environment" onChange={(e) => onFiles(e.target.files)} style={{ display: "none" }} />
          </label>
          <label style={{ ...ghostBtn, cursor: uploading ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 16px" }}>
            Upload
            <input type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files)} style={{ display: "none" }} />
          </label>
          {uploading && <span style={{ color: "#f0b429", fontSize: 12, alignSelf: "center" }}>Uploading…</span>}
        </div>
        {photos.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginTop: 12 }}>
            {photos.map((p) => (
              <div key={p.url} style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "#040d1a", border: "1px solid rgba(255,255,255,0.08)" }}>
                <img src={p.url} alt="" style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} />
                <button type="button" onClick={() => removePhoto(p.url)} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.62)", border: 0, color: "white", padding: "2px 7px", borderRadius: 6, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel} style={ghostBtn}>Cancel</button>
        <button type="button" onClick={submit} disabled={!summary.trim()} style={{ ...goldBtn, opacity: !summary.trim() ? 0.5 : 1 }}>
          Submit Report
        </button>
      </div>
    </section>
  );
}

// ── Report card ─────────────────────────────────────────────────────────

function ReportCard({
  report,
  me,
  onSetStatus,
  onAddNote,
  onDelete,
}: {
  report: Report;
  me: { id: string; isAdmin: boolean };
  onSetStatus: (s: Status) => void;
  onAddNote: (b: string) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  const colors: Record<Status, { bg: string; color: string; label: string }> = {
    pending:      { bg: "rgba(245,158,11,0.18)", color: "#fcd34d", label: "Pending" },
    under_review: { bg: "rgba(56,189,248,0.18)", color: "#7dd3fc", label: "Under Review" },
    resolved:     { bg: "rgba(34,197,94,0.18)",  color: "#86efac", label: "Resolved" },
    dismissed:    { bg: "rgba(148,163,184,0.18)", color: "#cbd5e1", label: "Dismissed" },
  };
  const sty = colors[report.reviewStatus];

  return (
    <article
      style={{
        background: "#071428",
        border: "1px solid rgba(255,255,255,0.06)",
        borderLeft: `4px solid ${sty.color}`,
        borderRadius: 14,
        padding: "14px 18px",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: "0.98rem" }}>
            {report.payload.summary
              ? truncate(String(report.payload.summary), 80)
              : `${report.city ?? "—"} · ${report.unitInvolved ?? "—"}`}
          </div>
          <div style={{ color: "#94a3b8", fontSize: "0.78rem", marginTop: 2 }}>
            {report.createdBy.firstName} {report.createdBy.lastName} · {report.incidentDate ?? timeAgo(report.createdAt)}
            {report.incidentTime && ` · ${report.incidentTime}`}
          </div>
        </div>
        <span
          style={{
            fontSize: "0.62rem",
            fontWeight: 900,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            padding: "4px 10px",
            borderRadius: 999,
            background: sty.bg,
            color: sty.color,
          }}
        >
          {sty.label}
        </span>
      </header>

      <div style={{ marginTop: 10 }}>
        <button type="button" onClick={() => setExpanded(!expanded)} style={ghostBtn}>
          {expanded ? "Hide details" : "Show details"}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", display: "grid", gap: 10 }}>
          {report.payload.summary && <DetailBlock label="Summary" value={String(report.payload.summary)} />}
          {report.payload.patientInvolved && <DetailBlock label="Patient involved" value={String(report.payload.patientInvolved)} />}
          {report.payload.witnesses && <DetailBlock label="Witnesses" value={String(report.payload.witnesses)} />}
          {report.payload.actionsTaken && <DetailBlock label="Actions taken" value={String(report.payload.actionsTaken)} />}
          {report.city && <DetailBlock label="Location" value={`${report.city}${report.specificLocation ? " · " + report.specificLocation : ""}`} />}

          {report.adminNotes.length > 0 && (
            <div>
              <div style={{ ...fieldLabelStyle, marginBottom: 6 }}>Admin notes</div>
              <div style={{ display: "grid", gap: 6 }}>
                {report.adminNotes.map((n, i) => (
                  <div key={i} style={{ padding: "8px 12px", background: "rgba(56,189,248,0.06)", borderLeft: "3px solid #38bdf8", borderRadius: 8 }}>
                    <div style={{ color: "#7dd3fc", fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      {n.authorName} · {timeAgo(n.at)}
                    </div>
                    <div style={{ color: "#e2e8f0", fontSize: "0.9rem", marginTop: 4, whiteSpace: "pre-wrap" }}>{n.body}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {me.isAdmin && (
            <>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(["pending","under_review","resolved","dismissed"] as Status[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onSetStatus(s)}
                    style={{
                      ...ghostBtn,
                      background: report.reviewStatus === s ? colors[s].bg : "rgba(255,255,255,0.05)",
                      color: report.reviewStatus === s ? colors[s].color : "#94a3b8",
                    }}
                  >
                    {colors[s].label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add an admin note…"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  disabled={!note.trim()}
                  onClick={() => { onAddNote(note.trim()); setNote(""); }}
                  style={{ ...goldBtn, opacity: !note.trim() ? 0.5 : 1 }}
                >
                  Add note
                </button>
              </div>
            </>
          )}

          {(report.createdBy.id === me.id || me.isAdmin) && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={onDelete} style={{ ...ghostBtn, color: "#fca5a5" }}>Delete</button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={fieldLabelStyle}>{label}</div>
      <div style={{ color: "#e2e8f0", fontSize: "0.92rem", marginTop: 3, whiteSpace: "pre-wrap" }}>{value}</div>
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 5 }}>
      <span style={fieldLabelStyle}>{label}</span>
      {children}
    </label>
  );
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
function timeAgo(iso: string): string {
  const d = new Date(iso);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const eyebrowStyle: React.CSSProperties = {
  color: "#f0b429",
  fontSize: "0.7rem",
  fontWeight: 900,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
};
const fieldLabelStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "0.7rem",
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  background: "#040d1a",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 10,
  color: "white",
  fontSize: "0.93rem",
  outline: "none",
  fontFamily: "inherit",
};
const goldBtn: React.CSSProperties = {
  padding: "10px 16px",
  background: "#f0b429",
  color: "#040d1a",
  fontWeight: 900,
  fontSize: "0.74rem",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  borderRadius: 10,
  border: 0,
  cursor: "pointer",
  fontFamily: "inherit",
};
const ghostBtn: React.CSSProperties = {
  padding: "9px 14px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "white",
  borderRadius: 10,
  fontSize: "0.72rem",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
};
