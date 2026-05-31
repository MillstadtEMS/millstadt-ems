"use client";

/**
 * Employee side: review + sign a form pushed to me. Reuses the registry
 * spec to render the same field layout the admin sees, with the editor
 * tuned for an employee:
 *  - Only employee signatures are capturable here (manager signatures
 *    are filled on the admin side before push).
 *  - On signature submit, the form auto-finalizes server-side.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import SignaturePad from "@/components/lounge/SignaturePad";

interface FieldSpec { key: string; label: string; type: string; helpText?: string; options?: string[]; required?: boolean; rows?: number }
interface SectionSpec { title: string; intro?: string; fields: FieldSpec[] }
interface SignatureSpec { who: string; label: string; required: boolean; certificationText: string; allowRefusal?: boolean }
interface FormSpecDto { id: string; label: string; pdfTitle: string; sections: SectionSpec[]; signatures: SignatureSpec[] }
interface FormSignature { who: string; printedName: string; signatureDataUrl: string; role: string; signedAt: string }
interface FormDto {
  id: string; formType: string; status: string;
  data: Record<string, unknown>;
  signatures: FormSignature[];
  refusedToSign: string[];
  assignmentId: string | null;
  pdfUrl: string | null;
  pdfFilename: string | null;
  finalizedAt: string | null;
}

export default function EmployeeFormFillPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<FormDto | null>(null);
  const [spec, setSpec] = useState<FormSpecDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<null | { kind: "ok" | "err"; text: string }>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/lounge/forms/${id}`, { cache: "no-store" });
    if (r.status === 401) { router.push("/lounge/login"); return; }
    if (!r.ok) { setStatus({ kind: "err", text: "Could not load this form." }); return; }
    const d = await r.json();
    setForm(d.form);
    setSpec(d.spec);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  function setData(k: string, v: unknown) {
    setForm((f) => f ? { ...f, data: { ...f.data, [k]: v } } : f);
  }

  async function saveProgress() {
    if (!form) return false;
    const r = await fetch(`/api/lounge/forms/${form.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: form.data }),
    });
    return r.ok;
  }

  if (!form || !spec) {
    return <div className="min-h-screen bg-[#040d1a] text-slate-400 p-8">Loading form…</div>;
  }

  const employeeSigSpec = spec.signatures.find((s) => s.who === "employee");
  const employeeSigned = form.signatures.find((s) => s.who === "employee") ?? null;
  const finalized = form.status !== "draft";

  return (
    <div className="min-h-screen bg-[#040d1a] text-slate-100" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <header className="border-b border-white/10 bg-[#071428]/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-4">
          <Link href="/lounge" className="text-slate-400 hover:text-slate-200 text-sm">← Lounge</Link>
          <div className="ml-auto text-xs uppercase tracking-[0.18em] text-slate-500">{form.status}</div>
        </div>
        <div className="max-w-3xl mx-auto px-5 pb-4">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f0b429]">{spec.label}</div>
          <h1 className="text-2xl font-black text-white mt-1">{spec.pdfTitle}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-6 space-y-4">
        {finalized && form.pdfUrl && (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-sm">
            <strong className="text-emerald-300">Signed and on file.</strong>{" "}
            <a className="text-[#f0b429] underline" href={form.pdfUrl} target="_blank" rel="noopener noreferrer">Open PDF</a>
          </div>
        )}

        {/* Field rendering:
            - Admin-pushed acknowledgments (assignmentId set): all admin-
              filled fields are read-only; the only fields the employee
              can type into are employeeComments / employeeResponse.
            - Employee-initiated drafts (assignmentId null AND no
              non-employee signature yet): the employee is filling this
              out for the first time — every field is editable.
            - Once a non-employee signer has signed OR the form is
              finalized, everything locks. */}
        {spec.sections.map((section) => {
          const hasNonEmployeeSig = form.signatures.some((s) => s.who !== "employee");
          const employeeOwns = form.assignmentId === null && !hasNonEmployeeSig && !finalized;
          return (
          <section key={section.title} className="bg-[rgba(7,20,40,0.55)] border border-white/8 rounded-2xl p-5">
            <h2 className="text-white font-black text-lg">{section.title}</h2>
            {section.intro && <p className="text-slate-400 text-sm mt-1">{section.intro}</p>}
            <div className="mt-3 grid gap-3">
              {section.fields.map((field) => {
                const value = form.data[field.key];
                const display = value === null || value === undefined || value === "" ? "—" : String(value);
                const explicitlyEditable = !finalized && (field.key === "employeeComments" || field.key === "employeeResponse");
                const editable = explicitlyEditable || employeeOwns;
                if (editable) {
                  if (field.type === "longtext") {
                    return (
                      <label key={field.key} className="block">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">{field.label}{field.required && " *"}</span>
                        {field.helpText && <span className="block text-xs text-slate-500 mt-1">{field.helpText}</span>}
                        <textarea rows={field.rows ?? 4} value={String(value ?? "")} onChange={(e) => setData(field.key, e.target.value)}
                          className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                      </label>
                    );
                  }
                  if (field.type === "select") {
                    return (
                      <label key={field.key} className="block">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">{field.label}{field.required && " *"}</span>
                        <select value={String(value ?? "")} onChange={(e) => setData(field.key, e.target.value)}
                          className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
                          <option value="">Select…</option>
                          {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </label>
                    );
                  }
                  if (field.type === "checkbox") {
                    return (
                      <label key={field.key} className="flex items-center gap-2 text-sm text-slate-300">
                        <input type="checkbox" checked={Boolean(value)} onChange={(e) => setData(field.key, e.target.checked)} style={{ accentColor: "#f0b429" }} />
                        <span>{field.label}{field.required && " *"}</span>
                      </label>
                    );
                  }
                  const inputType = field.type === "date" ? "date" : field.type === "datetime" ? "datetime-local" : field.type === "number" ? "number" : "text";
                  return (
                    <label key={field.key} className="block">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">{field.label}{field.required && " *"}</span>
                      {field.helpText && <span className="block text-xs text-slate-500 mt-1">{field.helpText}</span>}
                      <input type={inputType} value={String(value ?? "")} onChange={(e) => setData(field.key, e.target.value)}
                        className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                    </label>
                  );
                }
                return (
                  <div key={field.key}>
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">{field.label}</div>
                    <div className="text-slate-200 text-sm mt-1 whitespace-pre-wrap">{display}</div>
                  </div>
                );
              })}
            </div>
          </section>
          );
        })}

        {employeeSigSpec && !finalized && (
          <EmployeeSign
            spec={employeeSigSpec}
            existing={employeeSigned}
            onSign={async (sig) => {
              setBusy(true); setStatus(null);
              await saveProgress();
              const nextSigs = [...form.signatures.filter((s) => s.who !== "employee"), { ...sig, who: "employee" }];
              const r = await fetch(`/api/lounge/forms/${form.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: form.data, signatures: nextSigs, refusedToSign: form.refusedToSign.filter((x) => x !== "employee") }),
              });
              setBusy(false);
              const d = await r.json().catch(() => ({}));
              if (!r.ok) { setStatus({ kind: "err", text: d?.error ?? "Couldn't submit your signature." }); return; }
              if (d.form) setForm(d.form);
              setStatus({ kind: "ok", text: d.finalized ? "Signed and finalized. Thank you." : "Signed. Awaiting other signers." });
            }}
          />
        )}

        {status && (
          <div className={`text-sm font-bold ${status.kind === "ok" ? "text-emerald-300" : "text-red-300"}`}>{status.text}</div>
        )}
        {busy && <div className="text-slate-400 text-sm">Submitting…</div>}
      </main>
    </div>
  );
}

function EmployeeSign({ spec, existing, onSign }: { spec: SignatureSpec; existing: FormSignature | null; onSign: (sig: Omit<FormSignature, "who">) => Promise<void> }) {
  const [printedName, setPrintedName] = useState(existing?.printedName ?? "");
  const [role, setRole] = useState(existing?.role ?? "Employee");
  const [data, setData] = useState<string | null>(existing?.signatureDataUrl ?? null);
  const padRef = useRef<HTMLDivElement | null>(null);
  return (
    <section className="bg-[rgba(7,20,40,0.55)] border border-white/8 rounded-2xl p-5">
      <h2 className="text-white font-black text-lg">{spec.label}{spec.required && " *"}</h2>
      <p className="text-slate-400 text-sm mt-1">{spec.certificationText}</p>
      <div className="mt-3 grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Printed name</span>
          <input value={printedName} onChange={(e) => setPrintedName(e.target.value)}
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
        </label>
        <label className="block">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Role / title</span>
          <input value={role} onChange={(e) => setRole(e.target.value)}
            className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
        </label>
      </div>
      <div ref={padRef} className="mt-3">
        <SignaturePad value={data} onChange={setData} height={160} />
      </div>
      <button type="button"
        disabled={!printedName.trim() || !data}
        onClick={() => onSign({ printedName: printedName.trim(), signatureDataUrl: data!, role: role.trim() || "Employee", signedAt: new Date().toISOString() })}
        className="mt-3 bg-[#f0b429] hover:bg-[#fbbf3a] text-[#040d1a] font-black uppercase tracking-wider text-xs px-5 py-2.5 rounded-lg disabled:opacity-50">
        Sign & submit
      </button>
    </section>
  );
}
