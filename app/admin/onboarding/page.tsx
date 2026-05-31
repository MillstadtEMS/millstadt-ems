"use client";

/**
 * Admin onboarding hub: lists every onboarding record (in-progress,
 * finalized, rescinded) with completion progress and a "Start onboarding"
 * dialog that picks an employee + initial header fields. Also links to
 * the template editor for changing sections / items.
 *
 * Mobile-first: tile grid collapses to one column on phones, headers
 * wrap cleanly, dialog is a full-width sheet on small screens.
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CREDENTIAL_LEVEL_LABELS, EMPLOYMENT_TYPE_LABELS, FINAL_OUTCOME_LABELS } from "@/lib/lounge/onboarding/types";
import type { CredentialLevel, EmploymentType, FinalOutcome, OnboardingRecord, RecordStatus } from "@/lib/lounge/onboarding/types";

interface EmployeeRow {
  id: string;
  firstName: string;
  lastName: string;
  certification: string | null;
  position: string | null;
}

function fmtDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function statusBadge(s: RecordStatus): { bg: string; fg: string; text: string } {
  if (s === "finalized")   return { bg: "rgba(16,185,129,0.15)",  fg: "#34d399", text: "Finalized" };
  if (s === "rescinded")   return { bg: "rgba(248,113,113,0.15)", fg: "#fca5a5", text: "Rescinded" };
  return                         { bg: "rgba(125,211,252,0.12)",  fg: "#7dd3fc", text: "In progress" };
}

export default function AdminOnboardingPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ isAdmin: boolean } | null>(null);
  const [records, setRecords] = useState<OnboardingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);

  useEffect(() => {
    fetch("/api/lounge/me").then(async (r) => {
      if (!r.ok) { router.push("/lounge/login"); return; }
      const d = await r.json();
      if (!d.employee?.isAdmin) { router.push("/lounge"); return; }
      setMe(d.employee);
    });
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/onboarding/records", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setRecords(Array.isArray(d.records) ? d.records : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (me) load(); }, [me, load]);

  if (!me) return <p style={{ color: "#94a3b8", padding: 22 }}>Loading…</p>;

  return (
    <div>
      <header style={{ marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ color: "#f0b429", fontSize: 11, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Admin · HR · Onboarding
          </div>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.85rem", fontWeight: 900, letterSpacing: "-0.015em" }}>
            Pre-Employment & New Hire Onboarding
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.92rem", marginTop: 4 }}>
            EMS-specific checklist. Items, sections, sharing, and signature flow are all admin-editable.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href="/admin/onboarding/template"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(125,211,252,0.12)", color: "#7dd3fc", border: "1px solid rgba(125,211,252,0.25)", padding: "9px 14px", borderRadius: 10, fontWeight: 800, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none" }}
          >
            Edit template
          </Link>
          <button
            type="button"
            onClick={() => setOpenNew(true)}
            style={{ background: "#f0b429", color: "#040d1a", border: 0, padding: "9px 16px", borderRadius: 10, fontWeight: 900, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}
          >
            + Start onboarding
          </button>
        </div>
      </header>

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Loading records…</p>
      ) : records.length === 0 ? (
        <div style={emptyCard}>
          <h2 style={{ color: "white", fontSize: 18, fontWeight: 900, margin: 0 }}>No onboarding records yet</h2>
          <p style={{ color: "#94a3b8", marginTop: 6 }}>Start your first record to track sections, sign-offs, and produce a signed PDF for the personnel file.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
          {records.map((r) => <RecordCard key={r.id} rec={r} />)}
        </div>
      )}

      {openNew && <NewRecordModal onClose={() => setOpenNew(false)} onCreated={(id) => router.push(`/admin/onboarding/${id}`)} />}
    </div>
  );
}

function RecordCard({ rec }: { rec: OnboardingRecord }) {
  const badge = statusBadge(rec.status);
  return (
    <Link
      href={`/admin/onboarding/${rec.id}`}
      style={{
        display: "block",
        background: "#071428",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: "16px 18px",
        textDecoration: "none",
        color: "white",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 900 }}>{rec.employeeName}</div>
          <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
            {rec.position ?? "Position TBD"}{rec.startDate ? ` · Started ${fmtDate(rec.startDate)}` : ""}
          </div>
        </div>
        <span style={{ background: badge.bg, color: badge.fg, fontSize: 10, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", padding: "4px 8px", borderRadius: 8 }}>
          {badge.text}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        {rec.employmentType && <Chip>{EMPLOYMENT_TYPE_LABELS[rec.employmentType]}</Chip>}
        {rec.credentialLevel && <Chip>{CREDENTIAL_LEVEL_LABELS[rec.credentialLevel]}</Chip>}
        {rec.assignedUnit && <Chip>{rec.assignedUnit}</Chip>}
      </div>

      {rec.finalOutcome && (
        <div style={{ marginTop: 10, color: "#cbd5e1", fontSize: 12 }}>
          <span style={{ color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 10, fontWeight: 800 }}>Outcome · </span>
          {FINAL_OUTCOME_LABELS[rec.finalOutcome]}
        </div>
      )}
    </Link>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ background: "rgba(255,255,255,0.05)", color: "#cbd5e1", fontSize: 11, padding: "3px 8px", borderRadius: 6 }}>{children}</span>
  );
}

function NewRecordModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [position, setPosition] = useState("");
  const [startDate, setStartDate] = useState("");
  const [employmentType, setEmploymentType] = useState<EmploymentType | "">("");
  const [credentialLevel, setCredentialLevel] = useState<CredentialLevel | "">("");
  const [assignedUnit, setAssignedUnit] = useState("");
  const [preceptorId, setPreceptorId] = useState("");
  const [witnessId, setWitnessId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/employees").then(async (r) => {
      if (!r.ok) return;
      const d = await r.json();
      setEmployees(Array.isArray(d.employees) ? d.employees : []);
    });
  }, []);

  async function submit() {
    if (!employeeId) { setErr("Pick an employee."); return; }
    setBusy(true); setErr(null);
    const r = await fetch("/api/admin/onboarding/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId,
        position: position || null,
        startDate: startDate || null,
        employmentType: employmentType || null,
        credentialLevel: credentialLevel || null,
        assignedUnit: assignedUnit || null,
        preceptorId: preceptorId || null,
        witnessId: witnessId || null,
      }),
    });
    setBusy(false);
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(d.error ?? "Could not create record."); return; }
    onCreated(d.record.id);
  }

  return (
    <div role="dialog" aria-modal="true" style={modalBackdrop} onClick={onClose}>
      <div style={modalSheet} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ color: "white", fontSize: 18, fontWeight: 900, margin: 0 }}>Start onboarding</h2>
          <button onClick={onClose} aria-label="Close" style={closeBtn}>×</button>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <Field label="Employee *">
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={fieldStyle}>
              <option value="">Choose…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName}{e.certification ? ` · ${e.certification}` : ""}</option>
              ))}
            </select>
          </Field>
          <Field label="Position">
            <input value={position} onChange={(e) => setPosition(e.target.value)} style={fieldStyle} placeholder="e.g. EMT, Paramedic" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Start date">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={fieldStyle} />
            </Field>
            <Field label="Employment type">
              <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value as EmploymentType | "")} style={fieldStyle}>
                <option value="">—</option>
                {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Credential level">
              <select value={credentialLevel} onChange={(e) => setCredentialLevel(e.target.value as CredentialLevel | "")} style={fieldStyle}>
                <option value="">—</option>
                {Object.entries(CREDENTIAL_LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Assigned unit / shift">
              <input value={assignedUnit} onChange={(e) => setAssignedUnit(e.target.value)} style={fieldStyle} placeholder="e.g. M-71, A shift" />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Preceptor">
              <select value={preceptorId} onChange={(e) => setPreceptorId(e.target.value)} style={fieldStyle}>
                <option value="">—</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
              </select>
            </Field>
            <Field label="Witness">
              <select value={witnessId} onChange={(e) => setWitnessId(e.target.value)} style={fieldStyle}>
                <option value="">—</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
              </select>
            </Field>
          </div>
        </div>
        {err && <p style={{ color: "#fca5a5", marginTop: 10, fontSize: 13 }}>{err}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16, flexWrap: "wrap" }}>
          <button onClick={onClose} style={ghostBtn}>Cancel</button>
          <button disabled={busy} onClick={submit} style={primaryBtn}>{busy ? "Creating…" : "Start"}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>{label}</span>
      {children}
    </label>
  );
}

const emptyCard: React.CSSProperties = {
  background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "32px 24px", textAlign: "center" as const,
};
const fieldStyle: React.CSSProperties = {
  width: "100%", background: "#040d1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 12px", color: "white", fontSize: 13, fontFamily: "inherit",
};
const modalBackdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(2,9,18,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100,
};
const modalSheet: React.CSSProperties = {
  width: "100%", maxWidth: 560, background: "#071428", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 22, maxHeight: "90vh", overflowY: "auto",
};
const closeBtn: React.CSSProperties = {
  background: "transparent", border: 0, color: "#94a3b8", fontSize: 24, lineHeight: 1, cursor: "pointer", padding: "0 4px",
};
const ghostBtn: React.CSSProperties = {
  background: "transparent", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.12)", padding: "9px 16px", borderRadius: 10, fontWeight: 800, fontSize: 12, letterSpacing: "0.10em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit",
};
const primaryBtn: React.CSSProperties = {
  background: "#f0b429", color: "#040d1a", border: 0, padding: "9px 18px", borderRadius: 10, fontWeight: 900, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit",
};
