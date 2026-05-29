"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Admin-only Personnel Records panel embedded inside /admin/employees/[id].
 * Lists records by category, lets admins create new records, attach files,
 * flip visibility (admin / employee / restricted_hr), require acknowledgment,
 * and archive. All audit-logged on the server.
 */

interface PRecord {
  id: string;
  employeeId: string;
  category: string;
  recordType: string;
  title: string;
  summary: string | null;
  actionTaken: string | null;
  severity: string;
  status: string;
  incidentDate: string | null;
  supervisorId: string | null;
  witnesses: string | null;
  relatedUnit: string | null;
  relatedCall: string | null;
  followUpRequired: boolean;
  followUpDueDate: string | null;
  followUpCompletedAt: string | null;
  employeeVisible: boolean;
  restrictedVisibility: boolean;
  acknowledgmentRequired: boolean;
  acknowledgedAt: string | null;
  employeeResponse: string | null;
  locked: boolean;
  accommodationType: string | null;
  accommodationStart: string | null;
  accommodationEnd: string | null;
  accommodationReview: string | null;
  workLimitations: string | null;
  adminNotes: string | null;
  createdAt: string;
}

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileMime: string | null;
  visibilityLevel: "admin" | "employee" | "restricted_hr";
  uploadedAt: string;
}

const CATEGORIES: { key: string; label: string; description: string }[] = [
  { key: "conduct",        label: "Conduct & Discipline",      description: "Counseling, warnings, suspensions, policy violations." },
  { key: "performance",    label: "Performance & Coaching",    description: "Performance concerns, PIPs, supervisor feedback." },
  { key: "attendance",     label: "Attendance & Scheduling",   description: "Tardiness, NCNS, availability issues." },
  { key: "accommodations", label: "Accommodations & Restrictions", description: "ADA, light duty, return-to-work — restricted access." },
  { key: "clinical",       label: "Clinical / Operational",    description: "Protocol concerns, driving, equipment damage." },
  { key: "positive",       label: "Positive Recognition",      description: "Commendations, awards, positive feedback." },
  { key: "attachments",    label: "Attachments & Archived",    description: "Older docs + supporting files." },
];

const RECORD_TYPES: Record<string, string[]> = {
  conduct: ["Verbal Counseling", "Written Warning", "Suspension", "Termination", "Policy Violation", "Investigation"],
  performance: ["Performance Concern", "Improvement Plan", "Training Remediation", "Coaching Note", "Clinical Remediation"],
  attendance: ["Tardiness", "No-Call/No-Show", "Call-Off Pattern", "Schedule Accommodation"],
  accommodations: ["ADA Accommodation", "Light Duty", "Pregnancy Accommodation", "School Schedule", "Medical Restriction", "Return-to-Work", "Workers' Comp"],
  clinical: ["Driving Concern", "Equipment Damage", "Protocol Concern", "QA Follow-up", "Safety Issue"],
  positive: ["Commendation", "Award", "Positive Feedback"],
  attachments: ["Supporting Document", "Archived Record"],
};

export default function PersonnelRecordsPanel({ employeeId }: { employeeId: string }) {
  const [records, setRecords] = useState<PRecord[]>([]);
  const [activeCat, setActiveCat] = useState<string>("conduct");
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/admin/personnel-records?employeeId=${encodeURIComponent(employeeId)}`);
    if (r.ok) {
      const d = await r.json();
      setRecords(d.records ?? []);
    }
    setLoading(false);
  }, [employeeId]);

  useEffect(() => { load(); }, [load]);

  const filtered = records.filter((r) => r.category === activeCat);

  const counts: Record<string, number> = {};
  for (const r of records) counts[r.category] = (counts[r.category] ?? 0) + 1;

  return (
    <section style={{
      marginTop: 18,
      background: "#071428",
      border: "1px solid rgba(220,38,38,0.20)",
      borderRadius: 18,
      padding: "22px 24px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div>
          <div style={{ color: "#fca5a5", fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Admin Only · Personnel Records
          </div>
          <h2 style={{ margin: "4px 0 0", color: "white", fontWeight: 900, fontSize: 17 }}>Secure personnel file</h2>
          <p style={{ color: "#94a3b8", fontSize: 12, margin: "4px 0 0", maxWidth: 560 }}>
            Records below are hidden from the employee unless explicitly flagged employee-visible. All views and changes are audit logged.
          </p>
        </div>
        <button type="button" onClick={() => setShowNew((v) => !v)} style={primaryBtn}>
          {showNew ? "Close" : "+ New record"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 8 }}>
        {CATEGORIES.map((c) => {
          const active = activeCat === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setActiveCat(c.key)}
              style={{
                background: active ? "rgba(240,180,41,0.12)" : "transparent",
                border: `1px solid ${active ? "rgba(240,180,41,0.40)" : "rgba(255,255,255,0.08)"}`,
                color: active ? "#f0b429" : "#cbd5e1",
                padding: "8px 12px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {c.label} {counts[c.key] ? `(${counts[c.key]})` : ""}
            </button>
          );
        })}
      </div>

      {showNew && <NewRecordForm employeeId={employeeId} category={activeCat} onCreated={() => { setShowNew(false); load(); }} />}

      {loading
        ? <p style={{ color: "#94a3b8", marginTop: 14 }}>Loading…</p>
        : filtered.length === 0
          ? <p style={{ color: "#94a3b8", marginTop: 14 }}>No records in this category yet.</p>
          : (
            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
              {filtered.map((r) => <RecordRow key={r.id} record={r} onChanged={load} />)}
            </div>
          )}
    </section>
  );
}

function NewRecordForm({ employeeId, category, onCreated }: { employeeId: string; category: string; onCreated: () => void }) {
  const [form, setForm] = useState({
    recordType: RECORD_TYPES[category]?.[0] ?? "",
    title: "",
    summary: "",
    actionTaken: "",
    severity: "informational",
    incidentDate: "",
    employeeVisible: false,
    restrictedVisibility: category === "accommodations",
    acknowledgmentRequired: false,
    followUpRequired: false,
    followUpDueDate: "",
    accommodationType: "",
    accommodationStart: "",
    accommodationEnd: "",
    accommodationReview: "",
    workLimitations: "",
    adminNotes: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function submit() {
    if (!form.title.trim() || !form.recordType.trim()) {
      setErr("Title and type required.");
      return;
    }
    setSaving(true);
    setErr(null);
    const res = await fetch("/api/admin/personnel-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId,
        category,
        recordType: form.recordType,
        title: form.title.trim(),
        summary: form.summary.trim() || null,
        actionTaken: form.actionTaken.trim() || null,
        severity: form.severity,
        incidentDate: form.incidentDate || null,
        employeeVisible: form.employeeVisible,
        restrictedVisibility: form.restrictedVisibility,
        acknowledgmentRequired: form.acknowledgmentRequired,
        followUpRequired: form.followUpRequired,
        followUpDueDate: form.followUpDueDate || null,
        accommodationType: form.accommodationType || null,
        accommodationStart: form.accommodationStart || null,
        accommodationEnd: form.accommodationEnd || null,
        accommodationReview: form.accommodationReview || null,
        workLimitations: form.workLimitations || null,
        adminNotes: form.adminNotes.trim() || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Save failed");
      return;
    }
    onCreated();
  }

  const isAccommodation = category === "accommodations";

  return (
    <div style={{ marginTop: 14, padding: 16, background: "#040d1a", border: "1px solid rgba(240,180,41,0.20)", borderRadius: 14 }}>
      <h3 style={{ color: "white", margin: 0, fontSize: 14, fontWeight: 900 }}>New {CATEGORIES.find((c) => c.key === category)?.label} record</h3>

      <div style={grid}>
        <Label label="Type"><select value={form.recordType} onChange={(e) => set("recordType", e.target.value)} style={input}>
          {(RECORD_TYPES[category] ?? []).map((t) => <option key={t} value={t}>{t}</option>)}
        </select></Label>
        <Label label="Date of event"><input type="date" value={form.incidentDate} onChange={(e) => set("incidentDate", e.target.value)} style={input} /></Label>
        <Label label="Severity"><select value={form.severity} onChange={(e) => set("severity", e.target.value)} style={input}>
          {["informational", "coaching", "minor", "moderate", "serious", "critical"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select></Label>
      </div>

      <Label label="Title" full><input value={form.title} onChange={(e) => set("title", e.target.value)} style={input} placeholder="Short, descriptive title" /></Label>
      <Label label="Summary" full><textarea value={form.summary} onChange={(e) => set("summary", e.target.value)} rows={3} style={{ ...input, resize: "vertical", minHeight: 72 }} placeholder="What happened?" /></Label>
      <Label label="Action taken" full><textarea value={form.actionTaken} onChange={(e) => set("actionTaken", e.target.value)} rows={2} style={{ ...input, resize: "vertical", minHeight: 56 }} placeholder="What did leadership do or decide?" /></Label>
      <Label label="Admin notes (private)" full><textarea value={form.adminNotes} onChange={(e) => set("adminNotes", e.target.value)} rows={2} style={{ ...input, resize: "vertical", minHeight: 56 }} placeholder="Internal context — not shown to the employee." /></Label>

      {isAccommodation && (
        <div style={{ marginTop: 12, padding: 12, background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.25)", borderRadius: 12 }}>
          <div style={{ color: "#7dd3fc", fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>
            Accommodation details
          </div>
          <Label label="Accommodation type" full><input value={form.accommodationType} onChange={(e) => set("accommodationType", e.target.value)} style={input} placeholder="ADA, light duty, school schedule…" /></Label>
          <div style={grid}>
            <Label label="Start"><input type="date" value={form.accommodationStart} onChange={(e) => set("accommodationStart", e.target.value)} style={input} /></Label>
            <Label label="End"><input type="date" value={form.accommodationEnd} onChange={(e) => set("accommodationEnd", e.target.value)} style={input} /></Label>
            <Label label="Review"><input type="date" value={form.accommodationReview} onChange={(e) => set("accommodationReview", e.target.value)} style={input} /></Label>
          </div>
          <Label label="Work limitations" full><textarea value={form.workLimitations} onChange={(e) => set("workLimitations", e.target.value)} rows={2} style={{ ...input, resize: "vertical", minHeight: 56 }} placeholder="What is the employee limited from doing?" /></Label>
        </div>
      )}

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <Toggle label="Employee-visible" sub="Let the employee see this record in their lounge." value={form.employeeVisible} onChange={(v) => set("employeeVisible", v)} />
        <Toggle label="Restricted (HR-only)" sub="Hides from non-HR admin views. Use for medical/ADA." value={form.restrictedVisibility} onChange={(v) => set("restrictedVisibility", v)} />
        <Toggle label="Requires acknowledgment" sub="Employee must acknowledge receipt." value={form.acknowledgmentRequired} onChange={(v) => set("acknowledgmentRequired", v)} />
        <Toggle label="Follow-up required" sub="Add a due date below." value={form.followUpRequired} onChange={(v) => set("followUpRequired", v)} />
        {form.followUpRequired && (
          <Label label="Follow-up due"><input type="date" value={form.followUpDueDate} onChange={(e) => set("followUpDueDate", e.target.value)} style={input} /></Label>
        )}
      </div>

      {err && <p style={{ color: "#fca5a5", marginTop: 12, fontSize: 13 }}>{err}</p>}

      <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button type="button" onClick={submit} disabled={saving} style={primaryBtn}>
          {saving ? "Saving…" : "Save record"}
        </button>
      </div>
    </div>
  );
}

function RecordRow({ record, onChanged }: { record: PRecord; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [atts, setAtts] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadVisibility, setUploadVisibility] = useState<"admin" | "employee" | "restricted_hr">("admin");

  const sevColor =
    record.severity === "critical" || record.severity === "serious" ? "#fca5a5" :
    record.severity === "moderate" || record.severity === "minor" ? "#fdba74" :
    record.severity === "coaching" ? "#7dd3fc" :
    "#94a3b8";

  async function loadAtts() {
    const r = await fetch(`/api/admin/personnel-records/${record.id}/attachments`);
    if (r.ok) {
      const d = await r.json();
      setAtts(d.attachments ?? []);
    }
  }
  useEffect(() => { if (open) loadAtts(); }, [open, record.id]);

  async function patch(patchBody: Partial<PRecord>) {
    const r = await fetch(`/api/admin/personnel-records/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patchBody),
    });
    if (r.ok) onChanged();
  }
  async function archive() {
    if (!confirm("Archive this record? It will be hidden from active lists.")) return;
    const r = await fetch(`/api/admin/personnel-records/${record.id}`, { method: "DELETE" });
    if (r.ok) onChanged();
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", f);
    form.append("visibility", uploadVisibility);
    const r = await fetch(`/api/admin/personnel-records/${record.id}/attachments`, { method: "POST", body: form });
    setUploading(false);
    e.target.value = "";
    if (r.ok) loadAtts();
  }
  async function deleteAtt(attId: string) {
    if (!confirm("Delete this attachment?")) return;
    await fetch(`/api/admin/personnel-records/${record.id}/attachments?attachmentId=${attId}`, { method: "DELETE" });
    loadAtts();
  }

  return (
    <article style={{
      background: "#040d1a",
      border: `1px solid ${record.restrictedVisibility ? "rgba(56,189,248,0.30)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: 12,
      padding: 14,
    }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div>
          <span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>{record.title}</span>
          <span style={{ color: "#94a3b8", marginLeft: 10, fontSize: 12 }}>{record.recordType}</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <Pill bg="rgba(240,180,41,0.10)" fg="#f0b429">{record.status}</Pill>
          <Pill bg={`${sevColor}22`} fg={sevColor}>{record.severity}</Pill>
          {record.employeeVisible && <Pill bg="rgba(34,197,94,0.10)" fg="#86efac">Employee-visible</Pill>}
          {record.restrictedVisibility && <Pill bg="rgba(56,189,248,0.10)" fg="#7dd3fc">HR-only</Pill>}
          {record.acknowledgmentRequired && (
            record.acknowledgedAt
              ? <Pill bg="rgba(34,197,94,0.10)" fg="#86efac">Acknowledged</Pill>
              : <Pill bg="rgba(239,68,68,0.10)" fg="#fca5a5">Ack pending</Pill>
          )}
        </div>
      </header>
      <div style={{ marginTop: 6, color: "#94a3b8", fontSize: 12 }}>
        {record.incidentDate ? `Event ${record.incidentDate}` : "No incident date"} · Created {new Date(record.createdAt).toLocaleDateString()}
      </div>
      <button type="button" onClick={() => setOpen((v) => !v)} style={{ ...secondaryBtn, marginTop: 10 }}>
        {open ? "Hide details" : "Show details"}
      </button>
      {open && (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {record.summary && <Block label="Summary" value={record.summary} />}
          {record.actionTaken && <Block label="Action taken" value={record.actionTaken} />}
          {record.workLimitations && <Block label="Work limitations" value={record.workLimitations} />}
          {record.adminNotes && <Block label="Admin notes (private)" value={record.adminNotes} muted />}
          {record.employeeResponse && <Block label="Employee response" value={record.employeeResponse} />}

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 6 }}>
            <button type="button" onClick={() => patch({ ...record, employeeVisible: !record.employeeVisible })} style={secondaryBtn}>
              {record.employeeVisible ? "Hide from employee" : "Show to employee"}
            </button>
            <button type="button" onClick={() => patch({ ...record, restrictedVisibility: !record.restrictedVisibility })} style={secondaryBtn}>
              {record.restrictedVisibility ? "Allow general admin" : "Restrict to HR"}
            </button>
            <button type="button" onClick={() => patch({ ...record, acknowledgmentRequired: !record.acknowledgmentRequired })} style={secondaryBtn}>
              {record.acknowledgmentRequired ? "Cancel ack requirement" : "Require acknowledgment"}
            </button>
            <button type="button" onClick={() => patch({ ...record, status: record.status === "resolved" ? "active" : "resolved" })} style={secondaryBtn}>
              Mark {record.status === "resolved" ? "active" : "resolved"}
            </button>
            <button type="button" onClick={archive} style={{ ...secondaryBtn, color: "#fca5a5" }}>
              Archive
            </button>
          </div>

          <div style={{ marginTop: 8, padding: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <strong style={{ color: "white", fontSize: 13 }}>Attachments ({atts.length})</strong>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select value={uploadVisibility} onChange={(e) => setUploadVisibility(e.target.value as "admin" | "employee" | "restricted_hr")} style={{ ...input, padding: "6px 10px", fontSize: 12, width: "auto" }}>
                  <option value="admin">Admin only</option>
                  <option value="employee">Employee can view</option>
                  <option value="restricted_hr">HR only</option>
                </select>
                <label style={{ ...primaryBtn, cursor: "pointer" }}>
                  {uploading ? "Uploading…" : "Upload file"}
                  <input type="file" hidden onChange={upload} accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" />
                </label>
              </div>
            </div>
            {atts.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: 12, marginTop: 8 }}>No files yet.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "grid", gap: 6 }}>
                {atts.map((a) => (
                  <li key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 10px", background: "#040d1a", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
                    <a href={a.fileUrl} target="_blank" rel="noreferrer" style={{ color: "#38bdf8", fontSize: 13, textDecoration: "none", flex: 1, minWidth: 0 }}>
                      {a.fileName}
                    </a>
                    <span style={{ color: "#94a3b8", fontSize: 11 }}>{a.visibilityLevel}</span>
                    <button type="button" onClick={() => deleteAtt(a.id)} style={{ background: "transparent", border: 0, color: "#fca5a5", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function Toggle({ label, sub, value, onChange }: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", gap: 12, padding: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, cursor: "pointer" }}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 4 }} />
      <span>
        <span style={{ color: "white", fontWeight: 700, fontSize: 13 }}>{label}</span>
        <span style={{ display: "block", color: "#94a3b8", fontSize: 12, marginTop: 2 }}>{sub}</span>
      </span>
    </label>
  );
}

function Pill({ children, bg, fg }: { children: React.ReactNode; bg: string; fg: string }) {
  return <span style={{ background: bg, color: fg, padding: "3px 8px", borderRadius: 999, fontSize: 10, fontWeight: 900, letterSpacing: "0.10em", textTransform: "uppercase" }}>{children}</span>;
}

function Label({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginTop: 12, gridColumn: full ? "1 / -1" : undefined }}>
      <span style={{ display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

function Block({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <div style={{ color: muted ? "#64748b" : "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: muted ? "#94a3b8" : "#e2e8f0", fontSize: 13, marginTop: 4, whiteSpace: "pre-wrap" }}>{value}</div>
    </div>
  );
}

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginTop: 8,
};
const input: React.CSSProperties = {
  width: "100%",
  background: "#040d1a",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 10,
  color: "white",
  padding: "10px 12px",
  fontSize: 13,
  outline: "none",
  fontFamily: "inherit",
};
const primaryBtn: React.CSSProperties = {
  background: "#f0b429",
  color: "#040d1a",
  border: 0,
  padding: "8px 14px",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
};
const secondaryBtn: React.CSSProperties = {
  background: "transparent",
  color: "#cbd5e1",
  border: "1px solid rgba(255,255,255,0.10)",
  padding: "6px 12px",
  borderRadius: 10,
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: "inherit",
};
