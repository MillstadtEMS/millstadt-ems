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
        <FormEditor form={form} spec={spec} audit={audit} basePath={`/admin/employees/${id}`} />
      </main>
    </div>
  );
}
