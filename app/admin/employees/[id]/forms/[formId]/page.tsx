"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import FormEditor, { type FormDto, type FormSpecDto } from "@/components/admin/FormEditor";

interface AuditEntry { id: string; actorId: string | null; actorName: string | null; action: string; details: string | null; createdAt: string }

export default function AdminFormEditorPage() {
  const { id, formId } = useParams<{ id: string; formId: string }>();
  const router = useRouter();
  const [form, setForm] = useState<FormDto | null>(null);
  const [spec, setSpec] = useState<FormSpecDto | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const meRes = await fetch("/api/lounge/me");
      if (!meRes.ok) { router.push("/lounge/login"); return; }
      const meData = await meRes.json();
      if (!meData.employee?.isAdmin) { router.push("/lounge"); return; }
      const r = await fetch(`/api/admin/forms/${formId}`, { cache: "no-store" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d?.error ?? "Could not load this form.");
        return;
      }
      const d = await r.json();
      setForm(d.form);
      setSpec(d.spec);
      setAudit(Array.isArray(d.audit) ? d.audit : []);
    } catch {
      setError("Connection error.");
    }
  }, [formId, router]);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#040d1a] text-slate-100 p-8">
        <p className="text-red-300">{error}</p>
        <Link href={`/admin/employees/${id}#forms`} className="text-[#f0b429] underline mt-4 inline-block">← Back to employee</Link>
      </div>
    );
  }
  if (!form || !spec) {
    return <div className="min-h-screen bg-[#040d1a] text-slate-400 p-8">Loading form…</div>;
  }
  return (
    <div className="min-h-screen bg-[#040d1a] text-slate-100" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <header className="border-b border-white/10 bg-[#071428]/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center gap-4">
          <Link href={`/admin/employees/${id}#forms`} className="text-slate-400 hover:text-slate-200 text-sm">← Back</Link>
          <div className="ml-auto text-xs uppercase tracking-[0.18em] text-slate-500">{form.status}</div>
        </div>
        <div className="max-w-4xl mx-auto px-5 pb-4">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f0b429]">{spec.label}</div>
          <h1 className="text-2xl font-black text-white mt-1">{spec.pdfTitle}</h1>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-5 py-6">
        <ApprovalActionsBar form={form} onUpdated={(f) => setForm(f)} />
        <FormEditor form={form} spec={spec} audit={audit} basePath={`/admin/employees/${id}`} />
      </main>
    </div>
  );
}

/**
 * Approval-style forms (shift trade, leave request, time correction,
 * accommodation request, education request) get explicit Approve / Deny
 * buttons at the top of the admin view. The decision and reason are
 * written into form.data so they render in the PDF — the existing
 * signature flow then captures the manager's electronic signature as
 * proof of WHO approved or denied.
 */
const APPROVAL_FORM_TYPES = new Set([
  "shift_trade",
  "leave_request",
  "time_correction",
  "accommodation_request",
  "education_request",
]);

function ApprovalActionsBar({ form, onUpdated }: { form: FormDto; onUpdated: (f: FormDto) => void }) {
  const [busy, setBusy] = useState<null | "approve" | "deny">(null);
  const [error, setError] = useState<string | null>(null);

  if (!APPROVAL_FORM_TYPES.has(form.formType)) return null;
  if (form.status !== "draft") return null;
  const employeeSigned = form.signatures.some((s) => s.who === "employee");
  if (!employeeSigned) return null;

  const decision = (form.data as Record<string, unknown>).adminDecision as string | undefined;
  const reason   = (form.data as Record<string, unknown>).adminDecisionReason as string | undefined;

  async function patch(next: { adminDecision: "Approved" | "Denied"; adminDecisionReason?: string }) {
    setBusy(next.adminDecision === "Approved" ? "approve" : "deny");
    setError(null);
    try {
      const r = await fetch(`/api/admin/forms/${form.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            ...form.data,
            adminDecision: next.adminDecision,
            adminDecisionReason: next.adminDecisionReason ?? "",
            adminDecidedAt: new Date().toISOString(),
          },
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d?.error ?? "Could not save decision."); return; }
      if (d.form) onUpdated(d.form);
    } finally { setBusy(null); }
  }

  async function approve() { await patch({ adminDecision: "Approved" }); }
  async function deny() {
    const r = window.prompt("Reason for denying this request? (will be saved on the PDF and shown to the employee)");
    if (!r || !r.trim()) return;
    await patch({ adminDecision: "Denied", adminDecisionReason: r.trim() });
  }

  if (decision) {
    const tone = decision === "Approved" ? "emerald" : "rose";
    const toneClass = tone === "emerald"
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
      : "bg-rose-500/10 border-rose-500/30 text-rose-300";
    return (
      <div className={`rounded-2xl border ${toneClass} p-4 mb-5`}>
        <div className="text-[10px] font-black uppercase tracking-[0.22em] mb-1">Decision recorded</div>
        <div className="text-white font-black text-lg">Request {decision.toLowerCase()}</div>
        {reason && <p className="text-slate-200 text-sm mt-2">Reason: {reason}</p>}
        <p className="text-slate-400 text-xs mt-3">
          Sign as manager below and finalize to generate the signed PDF. The employee will be notified via the existing share settings.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 mb-5">
      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300 mb-1">Action required</div>
      <div className="text-white font-black text-lg mb-3">Approve or deny this request</div>
      {error && <div className="text-rose-300 text-sm mb-2">{error}</div>}
      <div className="flex flex-wrap gap-2">
        <button
          disabled={busy !== null}
          onClick={approve}
          className="px-4 py-2 bg-[#f0b429] text-[#040d1a] rounded-lg text-xs font-black uppercase tracking-[0.12em] hover:bg-[#fbbf3a] disabled:opacity-60"
        >
          {busy === "approve" ? "Saving…" : "Approve"}
        </button>
        <button
          disabled={busy !== null}
          onClick={deny}
          className="px-4 py-2 bg-transparent text-rose-300 border border-rose-500/40 rounded-lg text-xs font-black uppercase tracking-[0.12em] hover:bg-rose-500/10 disabled:opacity-60"
        >
          {busy === "deny" ? "Saving…" : "Deny with reason"}
        </button>
      </div>
      <p className="text-slate-400 text-xs mt-3">
        After recording your decision, sign as manager below and finalize — the PDF will show the decision and reason alongside both signatures.
      </p>
    </div>
  );
}
