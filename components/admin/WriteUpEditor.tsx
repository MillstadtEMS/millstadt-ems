"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SignaturePad from "@/components/lounge/SignaturePad";

// ── Types mirrored from lib/lounge/writeups ────────────────────────────
interface Signature {
  printedName: string;
  signatureDataUrl: string;
  role: string;
  signedAt: string;
}
interface AuditEntry {
  id: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  details: string | null;
  createdAt: string;
}
export interface WriteUpDto {
  id: string;
  employeeId: string;
  status: "draft" | "finalized";
  employeeFullName: string;
  employeePosition: string | null;
  employeeDepartment: string | null;
  supervisorId: string | null;
  supervisorName: string | null;
  dateIssued: string | null;
  incidentDate: string | null;
  incidentLocation: string | null;
  correctiveActionType: string | null;
  issueCategory: string | null;
  factualDescription: string;
  policyViolated: string;
  evidenceReviewed: string;
  priorNoticeOfExpectation: string;
  priorRelatedDiscipline: string;
  operationalImpact: string;
  correctiveExpectations: string;
  actionPlan: string;
  improvementTimeline: string;
  consequencesStatement: string;
  managerInternalNotes: string | null;
  responseStatus: string | null;
  employeeResponseText: string | null;
  managerSignature: Signature | null;
  employeeSignature: Signature | null;
  employeeRefusedToSign: boolean;
  witnessSignature: Signature | null;
  saveToFile: boolean;
  pdfUrl: string | null;
  pdfFilename: string | null;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const CORRECTIVE_ACTION_TYPES = [
  "Documented verbal counseling",
  "Written warning",
  "Final written warning",
  "Suspension recommendation",
  "Performance improvement plan",
  "Termination recommendation",
  "Other",
];
const ISSUE_CATEGORIES = [
  "Attendance / tardiness",
  "Performance concern",
  "Policy violation",
  "Safety issue",
  "Conduct / professionalism",
  "Documentation issue",
  "Patient care concern",
  "Equipment / property issue",
  "Insubordination",
  "Confidentiality / HIPAA concern",
  "Workplace behavior",
  "Other",
];
const RESPONSE_OPTIONS: { value: string; label: string }[] = [
  { value: "provided", label: "Employee provided a response" },
  { value: "declined", label: "Employee declined to provide a response" },
  { value: "submit_later", label: "Employee requested to submit a written response later" },
  { value: "refused_to_participate", label: "Employee refused to participate" },
  { value: "unavailable", label: "Employee unavailable at time of documentation" },
];

const SIGNATURE_ACK =
  "My signature acknowledges that I have received and had the opportunity to review this document. " +
  "My signature does not necessarily indicate agreement with the contents of this document. " +
  "I understand that I may provide a written response.";

const MANAGER_CERT =
  "I certify that this document was reviewed with the employee and that the information " +
  "documented above is based on the information available at the time of review.";

export default function WriteUpEditor({
  initial,
  audit: initialAudit,
}: {
  initial: WriteUpDto;
  audit: AuditEntry[];
}) {
  const router = useRouter();
  const [w, setW] = useState<WriteUpDto>(initial);
  const [audit, setAudit] = useState<AuditEntry[]>(initialAudit);
  const [status, setStatus] = useState<null | { kind: "ok" | "err"; text: string }>(null);
  const [busy, setBusy] = useState(false);
  // Both finalized and rescinded are locked — rescinded keeps the
  // record visible to admins for the audit trail but never reopens
  // for edits.
  const locked = w.status !== "draft";

  const set = useCallback(<K extends keyof WriteUpDto>(k: K, v: WriteUpDto[K]) => {
    setW((s) => ({ ...s, [k]: v }));
  }, []);

  // Debounced auto-save for textual fields so a half-finished draft
  // doesn't vanish if the manager closes the tab.
  //
  // We store the actual pending VALUES (not just the keys) in a ref so
  // the flush sees the latest user input instead of a stale `w` snapshot
  // captured when scheduleAutosave was called. Without this fix, picking
  // a value from a <select> could "snap back" to its prior state because
  // the patch sent to the server was built from the prior render's `w`.
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef<Partial<WriteUpDto>>({});

  function scheduleAutosave<K extends keyof WriteUpDto>(k: K, v: WriteUpDto[K]) {
    if (locked) return;
    set(k, v);
    (dirtyRef.current as Record<string, unknown>)[k as string] = v;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => { void flushAutosave(); }, 800);
  }

  async function flushAutosave() {
    if (locked) return;
    const dirty = { ...dirtyRef.current };
    if (Object.keys(dirty).length === 0) return;
    dirtyRef.current = {};
    await persist(dirty);
  }

  async function persist(patch: Partial<WriteUpDto>): Promise<boolean> {
    try {
      const r = await fetch(`/api/admin/writeups/${w.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setStatus({ kind: "err", text: d?.error ?? "Save failed." });
        return false;
      }
      // Merge any field the user has touched since this save started over
      // the server's response. Without this, a slow round-trip would
      // clobber whatever the user just typed.
      if (d.writeup) setW({ ...d.writeup, ...dirtyRef.current });
      return true;
    } catch {
      setStatus({ kind: "err", text: "Save failed." });
      return false;
    }
  }

  async function reloadAudit() {
    try {
      const r = await fetch(`/api/admin/writeups/${w.id}`, { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      if (Array.isArray(d.audit)) setAudit(d.audit);
    } catch { /* ignore */ }
  }

  async function saveDraft() {
    setBusy(true);
    setStatus(null);
    await flushAutosave();
    const ok = await persist(w);
    setBusy(false);
    setStatus(ok ? { kind: "ok", text: "Draft saved." } : status);
    await reloadAudit();
  }

  function openPreview() {
    window.open(`/api/admin/writeups/${w.id}/pdf`, "_blank", "noopener,noreferrer");
  }
  function downloadPdf() {
    window.open(`/api/admin/writeups/${w.id}/pdf?download=1`, "_blank", "noopener,noreferrer");
  }

  async function finalize() {
    if (!confirm("Finalize this write-up? It will be locked from editing and a PDF will be generated.")) return;
    setBusy(true);
    setStatus(null);
    await flushAutosave();
    try {
      const r = await fetch(`/api/admin/writeups/${w.id}/finalize`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (Array.isArray(d.missing) && d.missing.length > 0) {
          setStatus({ kind: "err", text: `Missing required fields: ${d.missing.join(", ")}` });
        } else {
          setStatus({ kind: "err", text: d?.error ?? "Could not finalize." });
        }
        return;
      }
      if (d.writeup) setW(d.writeup);
      setStatus({ kind: "ok", text: "Write-up finalized." });
      await reloadAudit();
    } finally {
      setBusy(false);
    }
  }

  async function discardDraft() {
    if (!confirm("Discard this draft write-up? This cannot be undone.")) return;
    const r = await fetch(`/api/admin/writeups/${w.id}`, { method: "DELETE" });
    if (r.ok) router.push(`/admin/employees/${w.employeeId}#writeups`);
  }

  async function rescindWriteUp() {
    const reason = window.prompt(
      "Reason for rescinding this write-up?\n\n" +
      "Heads up: email cannot be truly unsent once delivered. Instead we will:\n" +
      "  • Delete the PDF + attachment from the employee's personnel file\n" +
      "  • Send the employee an in-lounge notification\n" +
      "  • Email them a rescission notice they can keep alongside the original\n\n" +
      "Type a reason to continue (or Cancel to abort):"
    );
    if (!reason || !reason.trim()) return;
    setBusy(true); setStatus(null);
    try {
      const r = await fetch(`/api/admin/writeups/${w.id}/rescind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setStatus({ kind: "err", text: d?.error ?? "Could not rescind." });
        return;
      }
      const parts: string[] = ["Rescinded."];
      if (d.attachmentsDeleted) parts.push(`${d.attachmentsDeleted} attachment(s) deleted.`);
      if (d.rescissionEmailed) parts.push("Rescission email sent.");
      else if (w.saveToFile) parts.push("Email couldn't be sent — please follow up by phone.");
      setStatus({ kind: "ok", text: parts.join(" ") });
      // Bounce back to the employee record after a short pause so the
      // admin can see the confirmation.
      setTimeout(() => router.push(`/admin/employees/${w.employeeId}#writeups`), 1200);
    } finally { setBusy(false); }
  }

  // Force a flush whenever the page is about to navigate / close.
  useEffect(() => {
    const onBeforeUnload = () => { void flushAutosave(); };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const missing = useMemo(() => computeMissing(w), [w]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {locked && <LockedBanner finalizedAt={w.finalizedAt} pdfUrl={w.pdfUrl} pdfFilename={w.pdfFilename} />}

      {/* Step 1 — Employee & Incident Information */}
      <Step number={1} title="Employee & incident information">
        <Grid>
          <Field label="Employee full name *" value={w.employeeFullName} disabled={locked}
            onChange={(v) => scheduleAutosave("employeeFullName", v)} />
          <Field label="Position / title" value={w.employeePosition ?? ""} disabled={locked}
            onChange={(v) => scheduleAutosave("employeePosition", v || null)} />
          <Field label="Department / shift / station" value={w.employeeDepartment ?? ""} disabled={locked}
            onChange={(v) => scheduleAutosave("employeeDepartment", v || null)} />
          <Field label="Supervisor issuing this document *" value={w.supervisorName ?? ""} disabled={locked}
            onChange={(v) => scheduleAutosave("supervisorName", v || null)} />
          <Field label="Date write-up issued *" type="date" value={w.dateIssued ?? ""} disabled={locked}
            onChange={(v) => scheduleAutosave("dateIssued", v || null)} />
          <Field label="Date / time of incident *" type="datetime-local" value={dtLocal(w.incidentDate)} disabled={locked}
            onChange={(v) => scheduleAutosave("incidentDate", v ? new Date(v).toISOString() : null)} />
          <Field label="Location of incident" value={w.incidentLocation ?? ""} disabled={locked}
            onChange={(v) => scheduleAutosave("incidentLocation", v || null)} wide />
        </Grid>
      </Step>

      {/* Step 2 — Issue details */}
      <Step number={2} title="Issue details & policy violation">
        <Grid>
          <SelectField label="Type of corrective action *" value={w.correctiveActionType ?? ""}
            options={CORRECTIVE_ACTION_TYPES} disabled={locked}
            onChange={(v) => scheduleAutosave("correctiveActionType", v || null)} />
          <SelectField label="Category of issue *" value={w.issueCategory ?? ""}
            options={ISSUE_CATEGORIES} disabled={locked}
            onChange={(v) => scheduleAutosave("issueCategory", v || null)} />
        </Grid>
        <Textarea
          label="Detailed factual description of incident *"
          help="Describe only what was observed, reported, documented, or confirmed. Avoid opinions, labels, or emotional language."
          value={w.factualDescription} disabled={locked}
          rows={6}
          onChange={(v) => scheduleAutosave("factualDescription", v)}
        />
        <Textarea
          label="Policy, handbook section, SOP, job duty, or standard violated *"
          help="Identify the specific policy, SOP, job description duty, or known workplace expectation involved."
          value={w.policyViolated} disabled={locked}
          rows={4}
          onChange={(v) => scheduleAutosave("policyViolated", v)}
        />
      </Step>

      {/* Step 3 — Evidence, prior notice, impact */}
      <Step number={3} title="Evidence, prior notice & impact">
        <Textarea label="Evidence or sources reviewed" value={w.evidenceReviewed} disabled={locked} rows={3}
          help="Reports, recordings, witnesses, call logs, attendance records, etc."
          onChange={(v) => scheduleAutosave("evidenceReviewed", v)} />
        <Textarea label="How the employee was previously informed of this expectation" value={w.priorNoticeOfExpectation} disabled={locked} rows={3}
          help="Handbook acknowledgment, training, prior counseling, meeting notes, or job description."
          onChange={(v) => scheduleAutosave("priorNoticeOfExpectation", v)} />
        <Textarea label="Prior related discipline (if applicable)" value={w.priorRelatedDiscipline} disabled={locked} rows={3}
          help="List only relevant prior discipline related to this issue. Leave blank if there is none."
          onChange={(v) => scheduleAutosave("priorRelatedDiscipline", v)} />
        <Textarea label="Operational, safety, compliance, patient care, or workplace impact" value={w.operationalImpact} disabled={locked} rows={3}
          onChange={(v) => scheduleAutosave("operationalImpact", v)} />
      </Step>

      {/* Step 4 — Corrective expectations & timeline */}
      <Step number={4} title="Corrective expectations & timeline">
        <Textarea label="Corrective expectations going forward *" value={w.correctiveExpectations} disabled={locked} rows={4}
          help="Corrective expectations should be specific, measurable, and time-bound."
          onChange={(v) => scheduleAutosave("correctiveExpectations", v)} />
        <Textarea label="Action plan or remediation steps" value={w.actionPlan} disabled={locked} rows={3}
          onChange={(v) => scheduleAutosave("actionPlan", v)} />
        <Field label="Timeline for improvement *" value={w.improvementTimeline} disabled={locked}
          onChange={(v) => scheduleAutosave("improvementTimeline", v)} wide />
        <Textarea label="Consequences if issue is not corrected *" value={w.consequencesStatement} disabled={locked} rows={3}
          onChange={(v) => scheduleAutosave("consequencesStatement", v)} />
        <Textarea label="Manager notes / internal notes (not shown to employee on PDF)" value={w.managerInternalNotes ?? ""} disabled={locked} rows={3}
          onChange={(v) => scheduleAutosave("managerInternalNotes", v || null)} />
      </Step>

      {/* Step 5 — Employee response */}
      <Step number={5} title="Employee response / statement">
        <p style={helpText}>
          The following reflects the employee&apos;s statement and does not necessarily indicate
          agreement by management.
        </p>
        <div style={{ display: "grid", gap: 6 }}>
          {RESPONSE_OPTIONS.map((opt) => (
            <label key={opt.value} style={radioRow}>
              <input
                type="radio"
                name="responseStatus"
                checked={w.responseStatus === opt.value}
                disabled={locked}
                onChange={() => scheduleAutosave("responseStatus", opt.value)}
                style={{ accentColor: "#f0b429" }}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
        {w.responseStatus === "provided" && (
          <Textarea label="Employee statement / response" value={w.employeeResponseText ?? ""} disabled={locked} rows={6}
            onChange={(v) => scheduleAutosave("employeeResponseText", v || null)} />
        )}
      </Step>

      {/* Step 6 — Signatures */}
      <Step number={6} title="Signatures">
        <p style={helpText}>{MANAGER_CERT}</p>
        <SignatureCapture
          title="Manager / Supervisor signature"
          existing={w.managerSignature}
          defaultRole="Supervisor"
          defaultName={w.supervisorName ?? ""}
          disabled={locked}
          onSign={async (sig) => {
            const ok = await persist({ managerSignature: sig });
            if (ok) setW((s) => ({ ...s, managerSignature: sig }));
            await reloadAudit();
          }}
          onClear={async () => {
            const ok = await persist({ managerSignature: null });
            if (ok) setW((s) => ({ ...s, managerSignature: null }));
          }}
        />

        <p style={helpText}>{SIGNATURE_ACK}</p>
        {!w.employeeRefusedToSign && (
          <SignatureCapture
            title="Employee signature"
            existing={w.employeeSignature}
            defaultRole={w.employeePosition ?? "Employee"}
            defaultName={w.employeeFullName}
            disabled={locked}
            onSign={async (sig) => {
              const ok = await persist({ employeeSignature: sig, employeeRefusedToSign: false });
              if (ok) setW((s) => ({ ...s, employeeSignature: sig, employeeRefusedToSign: false }));
              await reloadAudit();
            }}
            onClear={async () => {
              const ok = await persist({ employeeSignature: null });
              if (ok) setW((s) => ({ ...s, employeeSignature: null }));
            }}
          />
        )}
        <label style={refusalRow}>
          <input
            type="checkbox"
            checked={w.employeeRefusedToSign}
            disabled={locked}
            onChange={async (e) => {
              const checked = e.target.checked;
              const patch: Partial<WriteUpDto> = checked
                ? { employeeRefusedToSign: true, employeeSignature: null }
                : { employeeRefusedToSign: false };
              const ok = await persist(patch);
              if (ok) setW((s) => ({ ...s, ...patch }));
              await reloadAudit();
            }}
            style={{ accentColor: "#f0b429", width: 18, height: 18 }}
          />
          <span>Employee refused to sign</span>
        </label>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12, marginTop: 8 }}>
          <div style={subheading}>Witness signature (optional)</div>
          {w.witnessSignature ? (
            <SignatureCapture
              title="Witness signature"
              existing={w.witnessSignature}
              defaultRole="Witness"
              defaultName={w.witnessSignature.printedName}
              disabled={locked}
              onSign={async (sig) => {
                const ok = await persist({ witnessSignature: sig });
                if (ok) setW((s) => ({ ...s, witnessSignature: sig }));
                await reloadAudit();
              }}
              onClear={async () => {
                const ok = await persist({ witnessSignature: null });
                if (ok) setW((s) => ({ ...s, witnessSignature: null }));
              }}
            />
          ) : !locked ? (
            <button
              type="button"
              style={ghostBtn}
              onClick={() => setW((s) => ({
                ...s,
                witnessSignature: { printedName: "", signatureDataUrl: "", role: "Witness", signedAt: "" },
              }))}
            >
              + Add witness signature
            </button>
          ) : (
            <p style={helpText}>No witness signature recorded.</p>
          )}
        </div>
      </Step>

      {/* Step 7 — Save & finalize */}
      <Step number={7} title="Save & finalize">
        <div style={{ display: "grid", gap: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 900, color: "#f0b429", letterSpacing: "0.20em", textTransform: "uppercase" }}>
            Who can see this when finalized?
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button
              type="button"
              disabled={locked}
              onClick={() => !locked && scheduleAutosave("saveToFile", false)}
              style={!w.saveToFile ? visibilityCardActive("#fda4af") : visibilityCardIdle}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>🔒</span>
                <strong style={{ color: !w.saveToFile ? "#fda4af" : "#cbd5e1", fontSize: 14, letterSpacing: "0.02em" }}>Admin only</strong>
              </div>
              <p style={{ color: "#94a3b8", fontSize: 12, margin: 0, lineHeight: 1.45 }}>
                The PDF stays internal. The employee will <strong>not</strong> see this write-up on their personnel file.
              </p>
            </button>
            <button
              type="button"
              disabled={locked}
              onClick={() => !locked && scheduleAutosave("saveToFile", true)}
              style={w.saveToFile ? visibilityCardActive("#86efac") : visibilityCardIdle}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>👤</span>
                <strong style={{ color: w.saveToFile ? "#86efac" : "#cbd5e1", fontSize: 14, letterSpacing: "0.02em" }}>Visible to employee</strong>
              </div>
              <p style={{ color: "#94a3b8", fontSize: 12, margin: 0, lineHeight: 1.45 }}>
                Saves the PDF to the employee&apos;s personnel file. They will see it on <em>My File</em> in the lounge.
              </p>
            </button>
          </div>
        </div>

        {missing.length > 0 && !locked && (
          <div style={missingBox}>
            <strong>Before finalizing, please complete:</strong>
            <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
              {missing.map((m) => <li key={m}>{m}</li>)}
            </ul>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
          {!locked && (
            <button type="button" onClick={saveDraft} disabled={busy} style={ghostBtn}>
              {busy ? "Saving…" : "Save draft"}
            </button>
          )}
          <button type="button" onClick={openPreview} style={ghostBtn}>Preview PDF</button>
          {w.pdfUrl && (
            <button type="button" onClick={downloadPdf} style={ghostBtn}>Download PDF</button>
          )}
          {!locked && (
            <button type="button" onClick={finalize} disabled={busy || missing.length > 0} style={primaryBtn}>
              {busy ? "Finalizing…" : "Finalize write-up"}
            </button>
          )}
          {!locked && (
            <button type="button" onClick={discardDraft} style={destructiveBtn}>Discard draft</button>
          )}
          {locked && w.status === "finalized" && (
            <button type="button" onClick={rescindWriteUp} disabled={busy} style={destructiveBtn}>
              {busy ? "Working…" : "Remove & rescind"}
            </button>
          )}
        </div>

        {status && (
          <div style={{ color: status.kind === "ok" ? "#86efac" : "#fca5a5", fontSize: 13, fontWeight: 700, marginTop: 6 }}>
            {status.text}
          </div>
        )}
      </Step>

      {/* Audit trail (admin-only, never surfaces to employees) */}
      <Step number={8} title="Audit trail">
        {audit.length === 0 ? (
          <p style={helpText}>No audit entries yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
            {audit.map((a) => (
              <li key={a.id} style={auditRow}>
                <strong style={{ color: "white" }}>{auditLabel(a.action)}</strong>
                <span style={{ color: "#94a3b8" }}>{a.actorName ?? "—"}</span>
                <span style={{ color: "#64748b", fontSize: 12 }}>{new Date(a.createdAt).toLocaleString()}</span>
                {a.details && <span style={{ color: "#cbd5e1", fontSize: 12, gridColumn: "1 / -1" }}>{a.details}</span>}
              </li>
            ))}
          </ul>
        )}
      </Step>
    </div>
  );
}

function auditLabel(a: string): string {
  return a.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function dtLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function computeMissing(w: WriteUpDto): string[] {
  const out: string[] = [];
  if (!w.employeeFullName?.trim()) out.push("Employee name");
  if (!w.supervisorName?.trim()) out.push("Manager name");
  if (!w.dateIssued) out.push("Date issued");
  if (!w.incidentDate) out.push("Incident date / time");
  if (!w.correctiveActionType) out.push("Corrective action type");
  if (!w.issueCategory) out.push("Category of issue");
  if (!w.factualDescription?.trim()) out.push("Factual description");
  if (!w.policyViolated?.trim()) out.push("Policy / expectation violated");
  if (!w.correctiveExpectations?.trim()) out.push("Corrective expectations");
  if (!w.improvementTimeline?.trim()) out.push("Timeline for improvement");
  if (!w.consequencesStatement?.trim()) out.push("Consequence statement");
  if (!w.managerSignature) out.push("Manager signature");
  if (!w.employeeSignature && !w.employeeRefusedToSign) out.push("Employee signature or refusal");
  return out;
}

// ── Sub-components ─────────────────────────────────────────────────────

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section style={card}>
      <header style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={stepBadge}>{number}</span>
        <h2 style={heading}>{title}</h2>
      </header>
      <div style={{ display: "grid", gap: 12 }}>{children}</div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>{children}</div>;
}

function Field({ label, value, onChange, disabled, type = "text", wide }: {
  label: string; value: string; onChange: (v: string) => void; disabled?: boolean; type?: string; wide?: boolean;
}) {
  return (
    <label style={{ ...labelBox, gridColumn: wide ? "1 / -1" : undefined }}>
      <span style={fieldLabel}>{label}</span>
      <input type={type} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} style={input} />
    </label>
  );
}

function SelectField({ label, value, onChange, options, disabled }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; disabled?: boolean;
}) {
  return (
    <label style={labelBox}>
      <span style={fieldLabel}>{label}</span>
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} style={{ ...input, appearance: "none" }}>
        <option value="">Select…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function Textarea({ label, value, onChange, rows = 4, help, disabled }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; help?: string; disabled?: boolean;
}) {
  return (
    <label style={labelBox}>
      <span style={fieldLabel}>{label}</span>
      {help && <span style={helpText}>{help}</span>}
      <textarea value={value} disabled={disabled} rows={rows} onChange={(e) => onChange(e.target.value)} style={{ ...input, lineHeight: 1.5, resize: "vertical" }} />
    </label>
  );
}

function SignatureCapture({
  title, existing, defaultRole, defaultName, onSign, onClear, disabled,
}: {
  title: string;
  existing: Signature | null;
  defaultRole: string;
  defaultName: string;
  onSign: (sig: Signature) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const [printedName, setPrintedName] = useState(existing?.printedName ?? defaultName);
  const [role, setRole] = useState(existing?.role ?? defaultRole);
  const [data, setData] = useState<string | null>(existing?.signatureDataUrl ?? null);
  useEffect(() => {
    if (existing) {
      setPrintedName(existing.printedName);
      setRole(existing.role);
      setData(existing.signatureDataUrl);
    }
  }, [existing]);

  function save() {
    if (!printedName.trim() || !data) return;
    onSign({
      printedName: printedName.trim(),
      role: role.trim() || defaultRole,
      signatureDataUrl: data,
      signedAt: new Date().toISOString(),
    });
  }

  return (
    <div style={sigBlock}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>{title}</span>
        {existing && (
          <span style={{ color: "#86efac", fontSize: 12, fontWeight: 700 }}>
            Signed {new Date(existing.signedAt).toLocaleString()}
          </span>
        )}
      </div>
      <Grid>
        <Field label="Printed name" value={printedName} onChange={setPrintedName} disabled={disabled} />
        <Field label="Role / title" value={role} onChange={setRole} disabled={disabled} />
      </Grid>
      <div style={{ marginTop: 10 }}>
        <SignaturePad value={data} onChange={setData} height={140} disabled={disabled || Boolean(existing)} />
      </div>
      {!disabled && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button type="button" onClick={save} disabled={!printedName.trim() || !data} style={primaryBtn}>
            {existing ? "Re-sign" : "Sign"}
          </button>
          {existing && (
            <button type="button" onClick={onClear} style={destructiveBtn}>Clear signature</button>
          )}
        </div>
      )}
    </div>
  );
}

function LockedBanner({ finalizedAt, pdfUrl, pdfFilename }: { finalizedAt: string | null; pdfUrl: string | null; pdfFilename: string | null }) {
  return (
    <div style={{
      padding: "12px 16px",
      background: "linear-gradient(180deg, rgba(34,197,94,0.10), rgba(34,197,94,0.04))",
      border: "1px solid rgba(34,197,94,0.30)",
      borderRadius: 12,
      display: "flex",
      gap: 14,
      alignItems: "center",
      flexWrap: "wrap",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#86efac", fontWeight: 900, fontSize: 13, letterSpacing: "0.10em", textTransform: "uppercase" }}>
          Finalized · locked
        </div>
        <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 4 }}>
          Finalized {finalizedAt ? new Date(finalizedAt).toLocaleString() : "—"}. This write-up is read-only.
        </div>
      </div>
      {pdfUrl && (
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={primaryBtn as React.CSSProperties}>
          Open final PDF{pdfFilename ? ` (${pdfFilename})` : ""}
        </a>
      )}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  padding: 20,
  background: "rgba(7,20,40,0.55)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
};
const stepBadge: React.CSSProperties = {
  display: "inline-flex",
  width: 28,
  height: 28,
  borderRadius: 8,
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(240,180,41,0.16)",
  color: "#f0b429",
  fontWeight: 900,
  fontSize: 13,
  border: "1px solid rgba(240,180,41,0.30)",
  fontFamily: "var(--font-mas-mono), ui-monospace, monospace",
};
const heading: React.CSSProperties = {
  color: "white",
  fontSize: 18,
  fontWeight: 900,
  letterSpacing: "-0.015em",
  margin: 0,
};
const subheading: React.CSSProperties = {
  color: "#cbd5e1",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  margin: "6px 0 8px",
};
const labelBox: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};
const fieldLabel: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
};
const helpText: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 12,
  margin: "0 0 6px",
  lineHeight: 1.5,
};
const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 10,
  color: "white",
  fontSize: 14,
  fontFamily: "inherit",
};
const radioRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  padding: "8px 12px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 10,
  color: "#cbd5e1",
  fontSize: 13.5,
  cursor: "pointer",
};
const refusalRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 10,
  color: "#cbd5e1",
  fontSize: 13.5,
  cursor: "pointer",
};
const visibilityCardIdle: React.CSSProperties = {
  textAlign: "left",
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 12,
  padding: "14px 16px",
  cursor: "pointer",
  fontFamily: "inherit",
  color: "#cbd5e1",
  transition: "border-color 0.15s, background 0.15s",
};
function visibilityCardActive(accent: string): React.CSSProperties {
  return {
    ...visibilityCardIdle,
    background: `${accent}15`,
    border: `1.5px solid ${accent}`,
    boxShadow: `0 0 0 2px ${accent}25`,
  };
}
const sigBlock: React.CSSProperties = {
  padding: 14,
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 12,
};
const primaryBtn: React.CSSProperties = {
  padding: "10px 16px",
  background: "#f0b429",
  color: "#040d1a",
  border: 0,
  borderRadius: 11,
  fontWeight: 900,
  fontSize: 13,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
  textDecoration: "none",
  display: "inline-block",
};
const ghostBtn: React.CSSProperties = {
  padding: "10px 14px",
  background: "transparent",
  color: "#cbd5e1",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 11,
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
};
const destructiveBtn: React.CSSProperties = {
  padding: "10px 14px",
  background: "transparent",
  color: "#fca5a5",
  border: "1px solid rgba(239,68,68,0.30)",
  borderRadius: 11,
  fontWeight: 800,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
};
const missingBox: React.CSSProperties = {
  padding: "10px 12px",
  background: "rgba(239,68,68,0.06)",
  border: "1px solid rgba(239,68,68,0.20)",
  borderRadius: 10,
  color: "#fecaca",
  fontSize: 13,
};
const auditRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(160px,200px) 1fr auto",
  gap: 10,
  padding: "8px 12px",
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: 10,
  fontSize: 13,
  color: "#cbd5e1",
};
