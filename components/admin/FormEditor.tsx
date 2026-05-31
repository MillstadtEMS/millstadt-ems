"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SignaturePad from "@/components/lounge/SignaturePad";

interface FieldSpec {
  key: string;
  label: string;
  type: "text" | "longtext" | "date" | "datetime" | "select" | "checkbox" | "number";
  helpText?: string;
  options?: string[];
  required?: boolean;
  placeholder?: string;
  rows?: number;
}
interface SectionSpec { title: string; intro?: string; fields: FieldSpec[] }
interface SignatureSpec {
  who: "manager" | "employee" | "evaluator" | "witness";
  label: string;
  required: boolean;
  certificationText: string;
  allowRefusal?: boolean;
}
export interface FormSpecDto {
  id: string;
  label: string;
  pdfTitle: string;
  defaultFileTab: string;
  confidentiality: string;
  sections: SectionSpec[];
  signatures: SignatureSpec[];
  defaults: { saveToFile: boolean; visibleToEmployee: boolean; emailEmployee: boolean; emailAdminInbox: boolean };
}

interface Signature {
  who: SignatureSpec["who"];
  printedName: string;
  signatureDataUrl: string;
  role: string;
  signedAt: string;
}

export interface FormDto {
  id: string;
  formType: string;
  employeeId: string;
  status: "draft" | "finalized" | "rescinded";
  data: Record<string, unknown>;
  signatures: Signature[];
  refusedToSign: string[];
  share: { saveToFile: boolean; visibleToEmployee: boolean; emailEmployee: boolean; emailAdminInbox: boolean };
  pdfUrl: string | null;
  pdfFilename: string | null;
  finalizedAt: string | null;
  rescindedAt: string | null;
  rescindedReason: string | null;
  rescindedByName: string | null;
  createdAt: string;
}

interface AuditEntry { id: string; actorId: string | null; actorName: string | null; action: string; details: string | null; createdAt: string }

export default function FormEditor({ form, spec, audit, basePath }: {
  form: FormDto;
  spec: FormSpecDto;
  audit: AuditEntry[];
  /** Base path back to the employee profile, e.g. /admin/employees/123 */
  basePath: string;
}) {
  const router = useRouter();
  const [f, setF] = useState<FormDto>(form);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(audit);
  const [status, setStatus] = useState<null | { kind: "ok" | "err"; text: string }>(null);
  const [busy, setBusy] = useState(false);
  const [rescindOpen, setRescindOpen] = useState(false);
  const [rescindReason, setRescindReason] = useState("");
  const [rescindEmail, setRescindEmail] = useState(true);
  const locked = f.status !== "draft";

  function setData<K extends string>(k: K, v: unknown) {
    setF((s) => ({ ...s, data: { ...s.data, [k]: v } }));
    scheduleSave();
  }
  function setShare(partial: Partial<FormDto["share"]>) {
    setF((s) => ({ ...s, share: { ...s.share, ...partial } }));
    scheduleSave();
  }

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleSave() {
    if (locked) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void persist(); }, 700);
  }

  const persist = useCallback(async (override?: Partial<FormDto>) => {
    if (locked) return true;
    try {
      const payload = override ?? { data: f.data, share: f.share, signatures: f.signatures, refusedToSign: f.refusedToSign };
      const r = await fetch(`/api/admin/forms/${f.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setStatus({ kind: "err", text: d?.error ?? "Save failed." }); return false; }
      if (d.form) setF(d.form);
      return true;
    } catch { setStatus({ kind: "err", text: "Save failed." }); return false; }
  }, [f.id, f.data, f.share, f.signatures, f.refusedToSign, locked]);

  async function reloadAudit() {
    try {
      const r = await fetch(`/api/admin/forms/${f.id}`, { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      if (Array.isArray(d.audit)) setAuditLog(d.audit);
    } catch { /* ignore */ }
  }

  async function saveDraft() {
    setBusy(true); setStatus(null);
    const ok = await persist();
    setBusy(false);
    if (ok) setStatus({ kind: "ok", text: "Draft saved." });
    await reloadAudit();
  }

  function openPreview() { window.open(`/api/admin/forms/${f.id}/pdf`, "_blank", "noopener,noreferrer"); }
  function downloadPdf() { window.open(`/api/admin/forms/${f.id}/pdf?download=1`, "_blank", "noopener,noreferrer"); }

  async function finalize() {
    if (!confirm("Finalize this form? It will be locked from editing and a PDF will be generated.")) return;
    setBusy(true); setStatus(null);
    await persist();
    try {
      const r = await fetch(`/api/admin/forms/${f.id}/finalize`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setStatus({ kind: "err", text: Array.isArray(d?.missing) && d.missing.length ? `Missing: ${d.missing.join(", ")}` : (d?.error ?? "Could not finalize.") });
        return;
      }
      if (d.form) setF(d.form);
      setStatus({ kind: "ok", text: `Finalized.${d.emailedEmployee ? " Emailed employee." : ""}${d.emailedAdmin ? " Emailed admin inbox." : ""}` });
      await reloadAudit();
    } finally { setBusy(false); }
  }

  async function rescind() {
    if (!rescindReason.trim()) return;
    setBusy(true); setStatus(null);
    try {
      const r = await fetch(`/api/admin/forms/${f.id}/rescind`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rescindReason.trim(), emailRescindNotice: rescindEmail }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setStatus({ kind: "err", text: d?.error ?? "Could not rescind." }); return; }
      if (d.form) setF(d.form);
      setStatus({ kind: "ok", text: "Form rescinded." });
      setRescindOpen(false);
      setRescindReason("");
      await reloadAudit();
    } finally { setBusy(false); }
  }

  async function discardDraft() {
    if (!confirm("Discard this draft form? This cannot be undone.")) return;
    const r = await fetch(`/api/admin/forms/${f.id}`, { method: "DELETE" });
    if (r.ok) router.push(`${basePath}#forms`);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {f.status === "finalized" && <LockedBanner finalizedAt={f.finalizedAt} pdfUrl={f.pdfUrl} pdfFilename={f.pdfFilename} />}
      {f.status === "rescinded" && <RescindedBanner rescindedAt={f.rescindedAt} reason={f.rescindedReason} byName={f.rescindedByName} pdfUrl={f.pdfUrl} />}

      {spec.sections.map((section) => (
        <Step key={section.title} title={section.title} intro={section.intro}>
          <Grid>
            {section.fields.map((field) => renderField(field, f.data, locked, setData))}
          </Grid>
        </Step>
      ))}

      <Step title="Signatures">
        {spec.signatures.map((sigSpec) => {
          const existing = f.signatures.find((s) => s.who === sigSpec.who) ?? null;
          const refused = f.refusedToSign.includes(sigSpec.who);
          return (
            <div key={sigSpec.who} style={{ display: "grid", gap: 8 }}>
              <p style={helpText}>{sigSpec.certificationText}</p>
              {!refused && (
                <SignatureCapture
                  title={sigSpec.label + (sigSpec.required ? " *" : "")}
                  existing={existing}
                  defaultRole={sigSpec.who === "manager" ? "Supervisor" : sigSpec.who === "employee" ? "Employee" : sigSpec.who === "evaluator" ? "Evaluator" : "Witness"}
                  disabled={locked}
                  onSign={async (sig) => {
                    const next = [...f.signatures.filter((s) => s.who !== sigSpec.who), { ...sig, who: sigSpec.who }];
                    const refusedNext = f.refusedToSign.filter((x) => x !== sigSpec.who);
                    setF((s) => ({ ...s, signatures: next, refusedToSign: refusedNext }));
                    await persist({ signatures: next, refusedToSign: refusedNext });
                    await reloadAudit();
                  }}
                  onClear={async () => {
                    const next = f.signatures.filter((s) => s.who !== sigSpec.who);
                    setF((s) => ({ ...s, signatures: next }));
                    await persist({ signatures: next });
                  }}
                />
              )}
              {sigSpec.allowRefusal && (
                <label style={refusalRow}>
                  <input type="checkbox" disabled={locked} checked={refused}
                    onChange={async (e) => {
                      const checked = e.target.checked;
                      const refusedNext = checked
                        ? Array.from(new Set([...f.refusedToSign, sigSpec.who]))
                        : f.refusedToSign.filter((x) => x !== sigSpec.who);
                      const next = checked ? f.signatures.filter((s) => s.who !== sigSpec.who) : f.signatures;
                      setF((s) => ({ ...s, refusedToSign: refusedNext, signatures: next }));
                      await persist({ refusedToSign: refusedNext, signatures: next });
                    }}
                    style={{ accentColor: "#f0b429", width: 18, height: 18 }} />
                  <span>{sigSpec.who === "employee" ? "Employee declined to sign" : "Signer declined to sign"}</span>
                </label>
              )}
            </div>
          );
        })}
      </Step>

      <Step title="Sharing & delivery">
        <p style={helpText}>
          Choose how this finalized form is shared. Defaults reflect the form type — adjust per record before you finalize.
        </p>
        <label style={refusalRow}>
          <input type="checkbox" disabled={locked} checked={f.share.saveToFile} onChange={(e) => setShare({ saveToFile: e.target.checked })} style={{ accentColor: "#f0b429", width: 18, height: 18 }} />
          <span>Save PDF to this employee&apos;s personnel file</span>
        </label>
        <label style={refusalRow}>
          <input type="checkbox" disabled={locked} checked={f.share.visibleToEmployee} onChange={(e) => setShare({ visibleToEmployee: e.target.checked })} style={{ accentColor: "#f0b429", width: 18, height: 18 }} />
          <span>Make the PDF visible to the employee in their lounge file</span>
        </label>
        <label style={refusalRow}>
          <input type="checkbox" disabled={locked} checked={f.share.emailEmployee} onChange={(e) => setShare({ emailEmployee: e.target.checked })} style={{ accentColor: "#f0b429", width: 18, height: 18 }} />
          <span>Email the PDF to the employee&apos;s email on file</span>
        </label>
        <label style={refusalRow}>
          <input type="checkbox" disabled={locked} checked={f.share.emailAdminInbox} onChange={(e) => setShare({ emailAdminInbox: e.target.checked })} style={{ accentColor: "#f0b429", width: 18, height: 18 }} />
          <span>Email the PDF to millstadtems@gmail.com</span>
        </label>
      </Step>

      <Step title="Actions">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {!locked && <button type="button" onClick={saveDraft} disabled={busy} style={ghostBtn}>{busy ? "Saving…" : "Save draft"}</button>}
          <button type="button" onClick={openPreview} style={ghostBtn}>Preview PDF</button>
          {f.pdfUrl && <button type="button" onClick={downloadPdf} style={ghostBtn}>Download final PDF</button>}
          {!locked && <button type="button" onClick={finalize} disabled={busy} style={primaryBtn}>{busy ? "Finalizing…" : "Finalize form"}</button>}
          {!locked && <button type="button" onClick={discardDraft} style={destructiveBtn}>Discard draft</button>}
          {f.status === "finalized" && <button type="button" onClick={() => setRescindOpen(true)} style={destructiveBtn}>Rescind / void</button>}
        </div>
        {status && (
          <div style={{ color: status.kind === "ok" ? "#86efac" : "#fca5a5", fontSize: 13, fontWeight: 700, marginTop: 6 }}>
            {status.text}
          </div>
        )}
      </Step>

      {rescindOpen && (
        <Step title="Rescind this form">
          <p style={helpText}>
            Rescinding marks the document as void, removes it from employee-visible file access,
            and (optionally) sends a rescind notice to the same recipients the original was sent
            to. The original is preserved in the admin audit trail.
          </p>
          <label style={fieldLabelStyle}>Reason for rescinding *</label>
          <textarea rows={3} value={rescindReason} onChange={(e) => setRescindReason(e.target.value)} style={inputStyle} />
          <label style={refusalRow}>
            <input type="checkbox" checked={rescindEmail} onChange={(e) => setRescindEmail(e.target.checked)} style={{ accentColor: "#f0b429", width: 18, height: 18 }} />
            <span>Send rescind notice to the same recipients (when applicable)</span>
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={rescind} disabled={!rescindReason.trim() || busy} style={primaryBtn}>{busy ? "Rescinding…" : "Confirm rescind"}</button>
            <button type="button" onClick={() => setRescindOpen(false)} style={ghostBtn}>Cancel</button>
          </div>
        </Step>
      )}

      <Step title="Audit trail">
        {auditLog.length === 0 ? (
          <p style={helpText}>No audit entries yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
            {auditLog.map((a) => (
              <li key={a.id} style={auditRow}>
                <strong style={{ color: "white" }}>{a.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</strong>
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

// ── Field renderer ─────────────────────────────────────────────────────

function renderField(field: FieldSpec, data: Record<string, unknown>, disabled: boolean, onChange: (k: string, v: unknown) => void) {
  const raw = data[field.key];
  const value = raw === undefined || raw === null ? "" : String(raw);
  const wide = field.type === "longtext";
  if (field.type === "longtext") {
    return (
      <label key={field.key} style={{ ...labelBox, gridColumn: "1 / -1" }}>
        <span style={fieldLabelStyle}>{field.label}{field.required && " *"}</span>
        {field.helpText && <span style={helpText}>{field.helpText}</span>}
        <textarea
          rows={field.rows ?? 4}
          value={value}
          disabled={disabled}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.key, e.target.value)}
          style={{ ...inputStyle, lineHeight: 1.5, resize: "vertical" }}
        />
      </label>
    );
  }
  if (field.type === "select") {
    return (
      <label key={field.key} style={labelBox}>
        <span style={fieldLabelStyle}>{field.label}{field.required && " *"}</span>
        {field.helpText && <span style={helpText}>{field.helpText}</span>}
        <select value={value} disabled={disabled} onChange={(e) => onChange(field.key, e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
          <option value="">Select…</option>
          {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </label>
    );
  }
  if (field.type === "checkbox") {
    const checked = Boolean(raw);
    return (
      <label key={field.key} style={{ ...refusalRow, gridColumn: wide ? "1 / -1" : undefined }}>
        <input type="checkbox" disabled={disabled} checked={checked} onChange={(e) => onChange(field.key, e.target.checked)} style={{ accentColor: "#f0b429", width: 18, height: 18 }} />
        <span>{field.label}</span>
      </label>
    );
  }
  const inputType = field.type === "date" ? "date" : field.type === "datetime" ? "datetime-local" : field.type === "number" ? "number" : "text";
  return (
    <label key={field.key} style={labelBox}>
      <span style={fieldLabelStyle}>{field.label}{field.required && " *"}</span>
      {field.helpText && <span style={helpText}>{field.helpText}</span>}
      <input type={inputType} value={value} disabled={disabled} placeholder={field.placeholder}
        onChange={(e) => onChange(field.key, e.target.value)} style={inputStyle} />
    </label>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function Step({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section style={card}>
      <header style={{ marginBottom: intro ? 10 : 14 }}>
        <h2 style={heading}>{title}</h2>
        {intro && <p style={helpText}>{intro}</p>}
      </header>
      <div style={{ display: "grid", gap: 12 }}>{children}</div>
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>{children}</div>;
}

function SignatureCapture({ title, existing, defaultRole, onSign, onClear, disabled }: {
  title: string;
  existing: Signature | null;
  defaultRole: string;
  onSign: (sig: Omit<Signature, "who">) => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const [printedName, setPrintedName] = useState(existing?.printedName ?? "");
  const [role, setRole] = useState(existing?.role ?? defaultRole);
  const [data, setData] = useState<string | null>(existing?.signatureDataUrl ?? null);
  useEffect(() => {
    if (existing) { setPrintedName(existing.printedName); setRole(existing.role); setData(existing.signatureDataUrl); }
  }, [existing]);

  function save() {
    if (!printedName.trim() || !data) return;
    onSign({ printedName: printedName.trim(), role: role.trim() || defaultRole, signatureDataUrl: data, signedAt: new Date().toISOString() });
  }

  return (
    <div style={sigBlock}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>{title}</span>
        {existing && <span style={{ color: "#86efac", fontSize: 12, fontWeight: 700 }}>Signed {new Date(existing.signedAt).toLocaleString()}</span>}
      </div>
      <Grid>
        <label style={labelBox}><span style={fieldLabelStyle}>Printed name</span><input value={printedName} onChange={(e) => setPrintedName(e.target.value)} disabled={disabled} style={inputStyle} /></label>
        <label style={labelBox}><span style={fieldLabelStyle}>Role / title</span><input value={role} onChange={(e) => setRole(e.target.value)} disabled={disabled} style={inputStyle} /></label>
      </Grid>
      <div style={{ marginTop: 10 }}>
        <SignaturePad value={data} onChange={setData} height={140} disabled={disabled || Boolean(existing)} />
      </div>
      {!disabled && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button type="button" onClick={save} disabled={!printedName.trim() || !data} style={primaryBtn}>{existing ? "Re-sign" : "Sign"}</button>
          {existing && <button type="button" onClick={onClear} style={destructiveBtn}>Clear signature</button>}
        </div>
      )}
    </div>
  );
}

function LockedBanner({ finalizedAt, pdfUrl, pdfFilename }: { finalizedAt: string | null; pdfUrl: string | null; pdfFilename: string | null }) {
  return (
    <div style={greenBanner}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#86efac", fontWeight: 900, fontSize: 13, letterSpacing: "0.10em", textTransform: "uppercase" }}>Finalized · locked</div>
        <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 4 }}>Finalized {finalizedAt ? new Date(finalizedAt).toLocaleString() : "—"}.</div>
      </div>
      {pdfUrl && (<a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={primaryBtn as React.CSSProperties}>Open final PDF{pdfFilename ? ` (${pdfFilename})` : ""}</a>)}
    </div>
  );
}
function RescindedBanner({ rescindedAt, reason, byName, pdfUrl }: { rescindedAt: string | null; reason: string | null; byName: string | null; pdfUrl: string | null }) {
  return (
    <div style={redBanner}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#fca5a5", fontWeight: 900, fontSize: 13, letterSpacing: "0.10em", textTransform: "uppercase" }}>Rescinded · void</div>
        <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 4 }}>
          {rescindedAt ? `Rescinded ${new Date(rescindedAt).toLocaleString()}` : "Rescinded"}{byName ? ` by ${byName}` : ""}.
          {reason ? ` Reason: ${reason}` : ""}
        </div>
      </div>
      {pdfUrl && (<a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={ghostBtn as React.CSSProperties}>Open rescinded PDF</a>)}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────
const card: React.CSSProperties = { padding: 20, background: "rgba(7,20,40,0.55)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 };
const heading: React.CSSProperties = { color: "white", fontSize: 18, fontWeight: 900, letterSpacing: "-0.015em", margin: 0 };
const labelBox: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };
const fieldLabelStyle: React.CSSProperties = { color: "#94a3b8", fontSize: 11, fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase" };
const helpText: React.CSSProperties = { color: "#94a3b8", fontSize: 12, margin: "0 0 6px", lineHeight: 1.5 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, color: "white", fontSize: 14, fontFamily: "inherit" };
const refusalRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, color: "#cbd5e1", fontSize: 13.5, cursor: "pointer" };
const sigBlock: React.CSSProperties = { padding: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 };
const primaryBtn: React.CSSProperties = { padding: "10px 16px", background: "#f0b429", color: "#040d1a", border: 0, borderRadius: 11, fontWeight: 900, fontSize: 13, letterSpacing: "0.10em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", textDecoration: "none", display: "inline-block" };
const ghostBtn: React.CSSProperties = { padding: "10px 14px", background: "transparent", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 11, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" };
const destructiveBtn: React.CSSProperties = { padding: "10px 14px", background: "transparent", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.30)", borderRadius: 11, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" };
const auditRow: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(160px,200px) 1fr auto", gap: 10, padding: "8px 12px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10, fontSize: 13, color: "#cbd5e1" };
const greenBanner: React.CSSProperties = { padding: "12px 16px", background: "linear-gradient(180deg, rgba(34,197,94,0.10), rgba(34,197,94,0.04))", border: "1px solid rgba(34,197,94,0.30)", borderRadius: 12, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" };
const redBanner: React.CSSProperties = { padding: "12px 16px", background: "linear-gradient(180deg, rgba(239,68,68,0.10), rgba(239,68,68,0.04))", border: "1px solid rgba(239,68,68,0.30)", borderRadius: 12, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" };
