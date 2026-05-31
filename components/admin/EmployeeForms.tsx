"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface FormSummary {
  id: string;
  label: string;
  blurb: string;
  defaultFileTab: string;
  confidentiality: string;
  bulkAssignable: boolean;
  employeeFillable: boolean;
}

interface FormRow {
  id: string;
  formType: string;
  status: "draft" | "finalized" | "rescinded";
  pdfUrl: string | null;
  pdfFilename: string | null;
  finalizedAt: string | null;
  createdAt: string;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US");
}

export default function EmployeeForms({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [registry, setRegistry] = useState<FormSummary[]>([]);
  const [forms, setForms] = useState<FormRow[] | null>(null);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [regRes, formsRes] = await Promise.all([
        fetch("/api/admin/forms", { cache: "no-store" }),
        fetch(`/api/admin/forms?employeeId=${encodeURIComponent(employeeId)}`, { cache: "no-store" }),
      ]);
      if (regRes.ok) {
        const d = await regRes.json();
        setRegistry(Array.isArray(d.registry) ? d.registry : []);
      }
      if (formsRes.ok) {
        const d = await formsRes.json();
        setForms(Array.isArray(d.forms) ? d.forms : []);
      } else {
        setForms([]);
      }
    } catch { setForms([]); }
  }, [employeeId]);

  useEffect(() => { load(); }, [load]);

  async function createForm(formType: string) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formType, employeeId }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d?.error ?? "Could not start form."); return; }
      router.push(`/admin/employees/${employeeId}/forms/${d.form.id}`);
    } finally { setBusy(false); }
  }

  return (
    <div id="forms" className="space-y-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setPicker((p) => !p)} disabled={busy}
          className="bg-[#f0b429] hover:bg-[#fbbf3a] text-[#040d1a] font-black uppercase tracking-wider text-xs px-4 py-2 rounded-lg disabled:opacity-50">
          {picker ? "Hide form catalog" : "New form"}
        </button>
        <Link href="/admin/forms" className="text-slate-400 text-xs underline hover:text-slate-200">
          Bulk push a form to multiple employees →
        </Link>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-lg px-3 py-2">{error}</div>}

      {picker && (
        <div className="grid sm:grid-cols-2 gap-2 bg-[#040d1a]/40 border border-white/5 rounded-2xl p-3">
          {registry.map((r) => (
            <button key={r.id} type="button" disabled={busy}
              onClick={() => createForm(r.id)}
              className="text-left bg-[#071428] border border-white/10 hover:border-[#f0b429]/40 rounded-xl px-4 py-3 disabled:opacity-50">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-bold text-sm">{r.label}</span>
                {r.confidentiality !== "open" && (
                  <span className="text-[10px] font-black uppercase tracking-wider text-red-300 border border-red-500/30 rounded px-1.5 py-0.5">
                    Confidential
                  </span>
                )}
              </div>
              <div className="text-slate-400 text-xs mt-1">{r.blurb}</div>
            </button>
          ))}
        </div>
      )}

      {forms === null ? (
        <div className="text-slate-500 text-sm py-2">Loading…</div>
      ) : forms.length === 0 ? (
        <div className="text-slate-500 text-sm py-2">No forms yet.</div>
      ) : (
        <div className="space-y-2">
          {forms.map((f) => {
            const meta = registry.find((r) => r.id === f.formType);
            return (
              <Link key={f.id} href={`/admin/employees/${employeeId}/forms/${f.id}`}
                className={`block rounded-xl border px-4 py-3 transition hover:border-[#f0b429]/40 ${
                  f.status === "finalized" ? "bg-emerald-500/5 border-emerald-500/25"
                  : f.status === "rescinded" ? "bg-red-500/5 border-red-500/25"
                  : "bg-amber-500/5 border-amber-500/25"
                }`}>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    f.status === "finalized" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : f.status === "rescinded" ? "bg-red-500/15 text-red-300 border-red-500/30"
                    : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  }`}>{f.status}</span>
                  <span className="text-white font-bold">{meta?.label ?? f.formType}</span>
                  <span className="text-slate-500 text-xs ml-auto">
                    {f.finalizedAt ? `Finalized ${fmtDate(f.finalizedAt)}` : `Created ${fmtDate(f.createdAt)}`}
                  </span>
                </div>
                {f.pdfUrl && <div className="text-xs text-slate-500 mt-1">PDF on file</div>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
