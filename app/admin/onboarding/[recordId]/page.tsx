"use client";

/**
 * Onboarding record detail / editor.
 *
 * Layout:
 *   - Sticky header with employee identity + status badge + finalize CTA
 *   - Progress meter showing completed-required / total-required
 *   - Section accordions; each row shows status pill (5-way),
 *     optional file upload, optional expiration date, optional notes
 *   - Final outcome section
 *   - Three signature panels (employee / preceptor / witness)
 *   - Audit log drawer
 *
 * Mobile: rows stack, signature pads adapt to viewport width, sticky
 * header collapses to a compact bar.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SignaturePad from "@/components/lounge/SignaturePad";
import {
  CREDENTIAL_LEVEL_LABELS,
  EMPLOYEE_ACKNOWLEDGMENT,
  EMPLOYMENT_TYPE_LABELS,
  FINAL_OUTCOME_LABELS,
  ITEM_STATUS_LABELS,
  PRECEPTOR_ATTESTATION,
  WITNESS_ATTESTATION,
} from "@/lib/lounge/onboarding/types";
import type {
  CredentialLevel,
  EmploymentType,
  FinalOutcome,
  ItemRow,
  ItemStatus,
  OnboardingRecord,
  ProgressRow,
  SectionRow,
  SignatureRow,
  SignerWho,
} from "@/lib/lounge/onboarding/types";

interface AuditRow { id: string; actorName: string | null; action: string; details: string | null; createdAt: string }

const STATUS_ORDER: ItemStatus[] = ["completed", "completed_with_followup", "pending", "not_applicable", "not_met"];

function statusTone(s: ItemStatus): { bg: string; fg: string } {
  if (s === "completed")              return { bg: "rgba(16,185,129,0.18)", fg: "#34d399" };
  if (s === "completed_with_followup")return { bg: "rgba(245,158,11,0.18)", fg: "#fcd34d" };
  if (s === "not_met")                return { bg: "rgba(248,113,113,0.18)", fg: "#fca5a5" };
  if (s === "not_applicable")         return { bg: "rgba(148,163,184,0.18)", fg: "#cbd5e1" };
  return                                     { bg: "rgba(255,255,255,0.06)", fg: "#94a3b8" };
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default function OnboardingDetailPage() {
  const { recordId } = useParams<{ recordId: string }>();
  const router = useRouter();
  const [me, setMe] = useState<{ id?: string; isAdmin: boolean } | null>(null);
  const [record, setRecord] = useState<OnboardingRecord | null>(null);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [signatures, setSignatures] = useState<SignatureRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [status, setStatus] = useState<null | { kind: "ok" | "err"; text: string }>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/lounge/me").then(async (r) => {
      if (!r.ok) { router.push("/lounge/login"); return; }
      const d = await r.json();
      if (!d.employee?.isAdmin) { router.push("/lounge"); return; }
      setMe(d.employee);
    });
  }, [router]);

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/onboarding/records/${recordId}`, { cache: "no-store" });
    if (!r.ok) { setStatus({ kind: "err", text: "Could not load record." }); return; }
    const d = await r.json();
    setRecord(d.record);
    setSections(d.template?.sections ?? []);
    setItems(d.template?.items ?? []);
    setProgress(d.progress ?? []);
    setSignatures(d.signatures ?? []);
    setAudit(d.audit ?? []);
  }, [recordId]);

  useEffect(() => { if (me) load(); }, [me, load]);

  const progByItem = useMemo(() => new Map(progress.map((p) => [p.itemId, p])), [progress]);
  const itemsBySection = useMemo(() => {
    const m = new Map<string, ItemRow[]>();
    for (const it of items) {
      if (!it.active) continue;
      if (!m.has(it.sectionId)) m.set(it.sectionId, []);
      m.get(it.sectionId)!.push(it);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.displayOrder - b.displayOrder);
    return m;
  }, [items]);

  const orderedSections = useMemo(() => sections.filter((s) => s.active).sort((a, b) => a.displayOrder - b.displayOrder), [sections]);

  const summary = useMemo(() => {
    const totalRequired = items.filter((i) => i.active && i.required).length;
    let completedRequired = 0;
    for (const it of items) {
      if (!it.active || !it.required) continue;
      const p = progByItem.get(it.id);
      if (p && (p.status === "completed" || p.status === "completed_with_followup" || p.status === "not_applicable")) completedRequired++;
    }
    const pct = totalRequired === 0 ? 100 : Math.round((completedRequired / totalRequired) * 100);
    return { totalRequired, completedRequired, pct };
  }, [items, progByItem]);

  if (!me || !record) return <p style={{ color: "#94a3b8", padding: 22 }}>Loading…</p>;

  const finalized = record.status === "finalized";
  const rescinded = record.status === "rescinded";
  const readOnly = finalized || rescinded;

  async function patchRecord(patch: Partial<{ position: string | null; startDate: string | null; employmentType: EmploymentType | null; credentialLevel: CredentialLevel | null; assignedUnit: string | null; preceptorId: string | null; witnessId: string | null; finalOutcome: FinalOutcome | null; finalNotes: string | null }>) {
    const r = await fetch(`/api/admin/onboarding/records/${recordId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (r.ok) {
      const d = await r.json();
      if (d.record) setRecord(d.record);
    }
  }

  async function patchProgress(itemId: string, patch: Partial<{ status: ItemStatus; notes: string | null; expirationDate: string | null }>) {
    const r = await fetch(`/api/admin/onboarding/records/${recordId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (r.ok) {
      const d = await r.json();
      if (d.progress) {
        setProgress((arr) => {
          const next = arr.filter((p) => p.itemId !== itemId);
          next.push(d.progress);
          return next;
        });
      }
    }
  }

  async function uploadFile(itemId: string, file: File, expirationDate: string | null) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("itemId", itemId);
    if (expirationDate) fd.append("expirationDate", expirationDate);
    const r = await fetch(`/api/admin/onboarding/records/${recordId}/upload`, { method: "POST", body: fd });
    if (r.ok) {
      const d = await r.json();
      if (d.progress) {
        setProgress((arr) => {
          const next = arr.filter((p) => p.itemId !== itemId);
          next.push(d.progress);
          return next;
        });
      }
    } else {
      const d = await r.json().catch(() => ({}));
      setStatus({ kind: "err", text: d.error ?? "Upload failed." });
    }
  }

  async function submitSig(who: SignerWho, printedName: string, signatureDataUrl: string) {
    const r = await fetch(`/api/admin/onboarding/records/${recordId}/signatures`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ who, printedName, signatureDataUrl }),
    });
    if (r.ok) {
      const d = await r.json();
      setSignatures(d.signatures ?? []);
    } else {
      const d = await r.json().catch(() => ({}));
      setStatus({ kind: "err", text: d.error ?? "Could not save signature." });
    }
  }

  async function finalize(visibleToEmployee: boolean) {
    setBusy(true); setStatus(null);
    const r = await fetch(`/api/admin/onboarding/records/${recordId}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibleToEmployee }),
    });
    setBusy(false);
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      const pending = Array.isArray(d.pending) ? `\n\nStill pending:\n· ${d.pending.join("\n· ")}` : "";
      setStatus({ kind: "err", text: (d.error ?? "Could not finalize.") + pending });
      return;
    }
    setStatus({ kind: "ok", text: "Finalized. PDF on file." });
    load();
  }

  async function rescind() {
    const reason = window.prompt("Enter a reason for rescinding this record:");
    if (!reason || !reason.trim()) return;
    const r = await fetch(`/api/admin/onboarding/records/${recordId}/rescind`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    });
    if (r.ok) {
      setStatus({ kind: "ok", text: "Record rescinded." });
      load();
    } else {
      const d = await r.json().catch(() => ({}));
      setStatus({ kind: "err", text: d.error ?? "Could not rescind." });
    }
  }

  return (
    <div>
      <header style={stickyHeader}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ minWidth: 0, flex: "1 1 auto" }}>
            <Link href="/admin/onboarding" style={{ color: "#94a3b8", fontSize: 12, textDecoration: "none", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>
              ← Onboarding
            </Link>
            <h1 style={{ margin: "6px 0 0", fontSize: "1.6rem", fontWeight: 900 }}>{record.employeeName}</h1>
            <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 2 }}>
              {record.position ?? "Position TBD"}
              {record.employmentType ? ` · ${EMPLOYMENT_TYPE_LABELS[record.employmentType]}` : ""}
              {record.credentialLevel ? ` · ${CREDENTIAL_LEVEL_LABELS[record.credentialLevel]}` : ""}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, minWidth: 0 }}>
            <StatusBadge status={record.status} />
            {finalized && record.pdfUrl && (
              <a href={record.pdfUrl} target="_blank" rel="noreferrer" style={pdfBtn}>Open PDF ↗</a>
            )}
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, color: "#94a3b8", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>
            <span>Required progress</span>
            <span>{summary.completedRequired} / {summary.totalRequired} · {summary.pct}%</span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 4 }}>
            <div style={{ height: "100%", width: `${summary.pct}%`, background: "#f0b429", borderRadius: 4 }} />
          </div>
        </div>
      </header>

      {status && (
        <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, fontSize: 13, whiteSpace: "pre-wrap", background: status.kind === "ok" ? "rgba(16,185,129,0.12)" : "rgba(248,113,113,0.12)", color: status.kind === "ok" ? "#34d399" : "#fca5a5" }}>
          {status.text}
        </div>
      )}

      {/* Header / metadata editor */}
      <section style={card}>
        <Card title="Subject of record">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
            <Field label="Position">
              <input disabled={readOnly} defaultValue={record.position ?? ""} onBlur={(e) => patchRecord({ position: e.target.value || null })} style={fieldStyle} />
            </Field>
            <Field label="Start date">
              <input disabled={readOnly} type="date" defaultValue={record.startDate ?? ""} onBlur={(e) => patchRecord({ startDate: e.target.value || null })} style={fieldStyle} />
            </Field>
            <Field label="Assigned unit / shift">
              <input disabled={readOnly} defaultValue={record.assignedUnit ?? ""} onBlur={(e) => patchRecord({ assignedUnit: e.target.value || null })} style={fieldStyle} />
            </Field>
            <Field label="Employment type">
              <select disabled={readOnly} defaultValue={record.employmentType ?? ""} onChange={(e) => patchRecord({ employmentType: (e.target.value || null) as EmploymentType | null })} style={fieldStyle}>
                <option value="">—</option>
                {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Credential level">
              <select disabled={readOnly} defaultValue={record.credentialLevel ?? ""} onChange={(e) => patchRecord({ credentialLevel: (e.target.value || null) as CredentialLevel | null })} style={fieldStyle}>
                <option value="">—</option>
                {Object.entries(CREDENTIAL_LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
          </div>
        </Card>
      </section>

      {/* Checklist sections */}
      {orderedSections.map((sec, idx) => {
        const isOpen = openSection === sec.id;
        const sectionItems = itemsBySection.get(sec.id) ?? [];
        const completedInSec = sectionItems.filter((it) => {
          const p = progByItem.get(it.id);
          return p && (p.status === "completed" || p.status === "completed_with_followup" || p.status === "not_applicable");
        }).length;
        return (
          <section key={sec.id} style={card}>
            <button
              type="button"
              onClick={() => setOpenSection(isOpen ? null : sec.id)}
              style={sectionHeader}
              aria-expanded={isOpen}
            >
              <span>
                <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginRight: 8 }}>Section {idx + 1}</span>
                <span style={{ color: "white", fontWeight: 900, fontSize: 15 }}>{sec.title}</span>
              </span>
              <span style={{ display: "flex", gap: 10, alignItems: "center", color: "#94a3b8", fontSize: 12 }}>
                <span>{completedInSec} / {sectionItems.length}</span>
                <span style={{ width: 24, textAlign: "center", color: "#f0b429" }}>{isOpen ? "▾" : "▸"}</span>
              </span>
            </button>
            {isOpen && (
              <div style={{ padding: "8px 16px 16px" }}>
                {sectionItems.map((it) => (
                  <ChecklistRow
                    key={it.id}
                    item={it}
                    progress={progByItem.get(it.id)}
                    readOnly={readOnly}
                    onStatus={(s) => patchProgress(it.id, { status: s })}
                    onNotes={(v) => patchProgress(it.id, { notes: v || null })}
                    onExpiration={(v) => patchProgress(it.id, { expirationDate: v || null })}
                    onUpload={(f, exp) => uploadFile(it.id, f, exp)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {/* Final outcome */}
      <section style={card}>
        <Card title="Final onboarding outcome">
          <div style={{ display: "grid", gap: 10 }}>
            <Field label="Outcome">
              <select disabled={readOnly} defaultValue={record.finalOutcome ?? ""} onChange={(e) => patchRecord({ finalOutcome: (e.target.value || null) as FinalOutcome | null })} style={fieldStyle}>
                <option value="">—</option>
                {Object.entries(FINAL_OUTCOME_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Notes / explanation">
              <textarea disabled={readOnly} defaultValue={record.finalNotes ?? ""} rows={3} onBlur={(e) => patchRecord({ finalNotes: e.target.value || null })} style={{ ...fieldStyle, resize: "vertical" }} />
            </Field>
          </div>
        </Card>
      </section>

      {/* Signatures */}
      <section style={card}>
        <Card title="Signatures">
          <SignatureBlock who="employee" label="Employee acknowledgment & signature" attestation={EMPLOYEE_ACKNOWLEDGMENT} existing={signatures.find((s) => s.who === "employee") ?? null} disabled={readOnly} onSubmit={(name, data) => submitSig("employee", name, data)} />
          <SignatureBlock who="preceptor" label="Admin / Preceptor signature" attestation={PRECEPTOR_ATTESTATION} existing={signatures.find((s) => s.who === "preceptor") ?? null} disabled={readOnly} onSubmit={(name, data) => submitSig("preceptor", name, data)} />
          <SignatureBlock who="witness" label="Witness signature" attestation={WITNESS_ATTESTATION} existing={signatures.find((s) => s.who === "witness") ?? null} disabled={readOnly} onSubmit={(name, data) => submitSig("witness", name, data)} />
        </Card>
      </section>

      {/* Finalize */}
      {!readOnly && (
        <section style={card}>
          <Card title="Finalize & save to file">
            <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.55, marginTop: 0 }}>
              When the checklist is complete, all three signatures are in, and a final outcome is set, choose how the resulting PDF should be filed.
              Email is not recallable once delivered.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button disabled={busy} onClick={() => finalize(true)} style={primaryBtn}>{busy ? "Working…" : "Finalize · share with employee"}</button>
              <button disabled={busy} onClick={() => finalize(false)} style={secondaryBtn}>{busy ? "Working…" : "Finalize · keep admin-only"}</button>
            </div>
          </Card>
        </section>
      )}

      {/* Rescind */}
      {finalized && (
        <section style={card}>
          <Card title="Rescind">
            <p style={{ color: "#fca5a5", fontSize: 13, lineHeight: 1.55, marginTop: 0 }}>
              Rescinding removes the document from the employee&apos;s personnel file inside the lounge and clearly marks it as rescinded. Emails already sent to the employee cannot be recalled.
            </p>
            <button onClick={rescind} style={dangerBtn}>Rescind this record</button>
          </Card>
        </section>
      )}

      {/* Audit log */}
      <section style={card}>
        <Card title="Audit log">
          {audit.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: 13 }}>No activity recorded yet.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
              {audit.map((a) => (
                <li key={a.id} style={{ display: "flex", gap: 10, fontSize: 12, color: "#cbd5e1", padding: "6px 10px", background: "#040d1a", borderRadius: 8 }}>
                  <span style={{ width: 130, color: "#94a3b8", flexShrink: 0 }}>{fmtDateTime(a.createdAt)}</span>
                  <span style={{ width: 100, color: "#f0b429", textTransform: "uppercase", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", flexShrink: 0, paddingTop: 2 }}>{a.action}</span>
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{a.actorName ?? "—"}{a.details ? ` · ${a.details}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: OnboardingRecord["status"] }) {
  if (status === "finalized")   return <span style={{ background: "rgba(16,185,129,0.18)",  color: "#34d399", padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>Finalized</span>;
  if (status === "rescinded")   return <span style={{ background: "rgba(248,113,113,0.18)", color: "#fca5a5", padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>Rescinded</span>;
  return                                <span style={{ background: "rgba(125,211,252,0.12)", color: "#7dd3fc", padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>In progress</span>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <div style={{ padding: "14px 16px 4px", color: "#f0b429", fontSize: 10, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>{title}</div>
      <div style={{ padding: "8px 16px 16px" }}>{children}</div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", color: "#94a3b8", fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>{label}</span>
      {children}
    </label>
  );
}

function ChecklistRow({
  item, progress, readOnly,
  onStatus, onNotes, onExpiration, onUpload,
}: {
  item: ItemRow;
  progress: ProgressRow | undefined;
  readOnly: boolean;
  onStatus: (s: ItemStatus) => void;
  onNotes: (v: string) => void;
  onExpiration: (v: string) => void;
  onUpload: (f: File, exp: string | null) => void;
}) {
  const status = (progress?.status ?? "pending") as ItemStatus;
  const tone = statusTone(status);
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <div style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 280px", minWidth: 220 }}>
          <div style={{ fontSize: 14, color: "white", fontWeight: item.required ? 800 : 500 }}>
            {item.label}{item.required && <span style={{ color: "#f0b429" }}> *</span>}
          </div>
          {progress?.completedByName && (status === "completed" || status === "completed_with_followup") && (
            <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>
              {progress.completedByName} · {fmtDateTime(progress.completedAt)}
            </div>
          )}
        </div>
        <select
          disabled={readOnly}
          value={status}
          onChange={(e) => onStatus(e.target.value as ItemStatus)}
          style={{ ...statusSelect, background: tone.bg, color: tone.fg, borderColor: tone.fg + "55" }}
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s} style={{ background: "#040d1a", color: "white" }}>{ITEM_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>
      {(item.hasUpload || item.hasExpiration || item.hasNotes) && (
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          {item.hasUpload && (
            <div>
              <span style={{ display: "block", color: "#94a3b8", fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>Document</span>
              {progress?.fileUrl ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <a href={progress.fileUrl} target="_blank" rel="noreferrer" style={{ color: "#38bdf8", textDecoration: "none", fontWeight: 800 }}>↗ {progress.fileName ?? "Open file"}</a>
                  {!readOnly && (
                    <button onClick={() => fileRef.current?.click()} style={miniBtn}>Replace</button>
                  )}
                </div>
              ) : (
                <button disabled={readOnly} onClick={() => fileRef.current?.click()} style={uploadBtn}>Upload PDF / image</button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f, progress?.expirationDate ?? null);
                  e.currentTarget.value = "";
                }}
              />
            </div>
          )}
          {item.hasExpiration && (
            <div>
              <span style={{ display: "block", color: "#94a3b8", fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>Expiration</span>
              <input disabled={readOnly} type="date" defaultValue={progress?.expirationDate ?? ""} onBlur={(e) => onExpiration(e.target.value)} style={fieldStyle} />
              {progress?.expirationDate && <ExpirationBadge date={progress.expirationDate} />}
            </div>
          )}
          {item.hasNotes && (
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={{ display: "block", color: "#94a3b8", fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>Notes</span>
              <textarea disabled={readOnly} defaultValue={progress?.notes ?? ""} rows={2} onBlur={(e) => onNotes(e.target.value)} style={{ ...fieldStyle, resize: "vertical" }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ExpirationBadge({ date }: { date: string }) {
  const [referenceTime, setReferenceTime] = useState<number | null>(null);
  useEffect(() => setReferenceTime(Date.now()), []);
  const d = new Date(date + "T00:00:00");
  const days = referenceTime === null
    ? null
    : Math.round((d.getTime() - referenceTime) / 86_400_000);
  let bg = "rgba(148,163,184,0.16)";
  let fg = "#cbd5e1";
  let label = "Checking";
  if (days !== null) {
    bg = "rgba(16,185,129,0.16)";
    fg = "#34d399";
    label = "Current";
    if (days < 0)      { bg = "rgba(248,113,113,0.18)"; fg = "#fca5a5"; label = `Expired ${-days}d ago`; }
    else if (days < 30){ bg = "rgba(245,158,11,0.18)";  fg = "#fcd34d"; label = `Expires in ${days}d`; }
    else if (days < 90){ bg = "rgba(125,211,252,0.16)"; fg = "#7dd3fc"; label = `Expires in ${days}d`; }
  }
  return (
    <span style={{ display: "inline-block", marginTop: 6, background: bg, color: fg, padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
      {label}
    </span>
  );
}

function SignatureBlock({
  who, label, attestation, existing, disabled, onSubmit,
}: {
  who: SignerWho;
  label: string;
  attestation: string;
  existing: SignatureRow | null;
  disabled: boolean;
  onSubmit: (printedName: string, signatureDataUrl: string) => void;
}) {
  const [printedName, setPrintedName] = useState(existing?.printedName ?? "");
  const [data, setData] = useState<string | null>(existing?.signatureDataUrl ?? null);

  return (
    <div style={{ marginBottom: 16, padding: 14, background: "#040d1a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12 }}>
      <div style={{ color: "#f0b429", fontSize: 10, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 4 }}>
        {who === "employee" ? "Employee" : who === "preceptor" ? "Admin / Preceptor" : "Witness"}
      </div>
      <div style={{ color: "white", fontWeight: 800, fontSize: 14, marginBottom: 8 }}>{label}</div>
      <p style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.55, marginTop: 0, marginBottom: 10 }}>{attestation}</p>

      {existing && !disabled && (
        <p style={{ color: "#34d399", fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
          Signed by {existing.printedName} on {fmtDateTime(existing.signedAt)}. Resign below to replace.
        </p>
      )}

      <label style={{ display: "block", marginBottom: 8 }}>
        <span style={{ display: "block", color: "#94a3b8", fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>Printed name</span>
        <input disabled={disabled} value={printedName} onChange={(e) => setPrintedName(e.target.value)} style={fieldStyle} />
      </label>

      <SignaturePad value={data} onChange={setData} height={140} disabled={disabled} />

      {!disabled && (
        <button
          type="button"
          disabled={!printedName.trim() || !data}
          onClick={() => onSubmit(printedName.trim(), data!)}
          style={{ ...primaryBtn, marginTop: 10, opacity: !printedName.trim() || !data ? 0.5 : 1 }}
        >
          Save signature
        </button>
      )}
    </div>
  );
}

const stickyHeader: React.CSSProperties = {
  position: "sticky", top: 0, zIndex: 5,
  background: "#071428", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16,
  padding: "14px 16px", marginBottom: 14,
};
const card: React.CSSProperties = {
  background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, marginBottom: 12, overflow: "hidden",
};
const sectionHeader: React.CSSProperties = {
  width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
  background: "transparent", border: 0, color: "white", textAlign: "left" as const, padding: "14px 16px", cursor: "pointer", fontFamily: "inherit",
};
const fieldStyle: React.CSSProperties = {
  width: "100%", background: "#040d1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 12px", color: "white", fontSize: 13, fontFamily: "inherit",
};
const statusSelect: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "7px 10px", fontSize: 11, fontWeight: 900, letterSpacing: "0.10em", textTransform: "uppercase", fontFamily: "inherit", cursor: "pointer",
};
const primaryBtn: React.CSSProperties = {
  background: "#f0b429", color: "#040d1a", border: 0, padding: "10px 18px", borderRadius: 10, fontWeight: 900, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit",
};
const secondaryBtn: React.CSSProperties = {
  background: "rgba(125,211,252,0.12)", color: "#7dd3fc", border: "1px solid rgba(125,211,252,0.25)", padding: "10px 18px", borderRadius: 10, fontWeight: 900, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit",
};
const dangerBtn: React.CSSProperties = {
  background: "rgba(248,113,113,0.18)", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.35)", padding: "10px 18px", borderRadius: 10, fontWeight: 900, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit",
};
const uploadBtn: React.CSSProperties = {
  background: "rgba(125,211,252,0.12)", color: "#7dd3fc", border: "1px dashed rgba(125,211,252,0.35)", padding: "9px 14px", borderRadius: 10, fontWeight: 800, fontSize: 12, letterSpacing: "0.10em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit",
};
const miniBtn: React.CSSProperties = {
  background: "transparent", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)", padding: "4px 8px", borderRadius: 6, fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
};
const pdfBtn: React.CSSProperties = {
  background: "#f0b429", color: "#040d1a", padding: "8px 14px", borderRadius: 10, fontWeight: 900, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none",
};
