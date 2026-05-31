"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface FormSummary { id: string; label: string; blurb: string; bulkAssignable: boolean; confidentiality: string }
interface AssignmentDto {
  id: string;
  formType: string;
  title: string;
  dueAt: string | null;
  createdByName: string | null;
  createdAt: string;
  progress: { assigned: number; finalized: number; pending: number };
}
interface EmployeeRow { id: string; firstName: string; lastName: string; isAdmin: boolean; certification: string | null }

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US");
}

export default function FormsAdminPage() {
  const router = useRouter();
  const [registry, setRegistry] = useState<FormSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [targetKind, setTargetKind] = useState<"all" | "crew" | "admin" | "explicit">("all");
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [picks, setPicks] = useState<Set<string>>(new Set());
  const [share, setShare] = useState({ saveToFile: true, visibleToEmployee: true, emailEmployee: false, emailAdminInbox: false });
  const [assignments, setAssignments] = useState<AssignmentDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<null | { kind: "ok" | "err"; text: string }>(null);

  const loadRegistry = useCallback(async () => {
    const meRes = await fetch("/api/lounge/me");
    if (!meRes.ok) { router.push("/lounge/login"); return; }
    const me = await meRes.json();
    if (!me.employee?.isAdmin) { router.push("/lounge"); return; }
    const r = await fetch("/api/admin/forms");
    if (r.ok) {
      const d = await r.json();
      setRegistry(Array.isArray(d.registry) ? d.registry : []);
    }
  }, [router]);

  const loadEmployees = useCallback(async () => {
    const r = await fetch("/api/admin/employees");
    if (!r.ok) return;
    const d = await r.json();
    setEmployees(Array.isArray(d.employees) ? d.employees : []);
  }, []);

  const loadAssignments = useCallback(async (formType: string) => {
    const r = await fetch(`/api/admin/form-assignments?formType=${encodeURIComponent(formType)}&all=1`);
    if (!r.ok) { setAssignments([]); return; }
    const d = await r.json();
    setAssignments(Array.isArray(d.assignments) ? d.assignments : []);
  }, []);

  useEffect(() => { loadRegistry(); loadEmployees(); }, [loadRegistry, loadEmployees]);
  useEffect(() => { if (selected) loadAssignments(selected); }, [selected, loadAssignments]);

  function togglePick(id: string) {
    setPicks((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function publish() {
    if (!selected || !title.trim()) {
      setStatus({ kind: "err", text: "Pick a form and add a title." });
      return;
    }
    setBusy(true); setStatus(null);
    try {
      const r = await fetch("/api/admin/form-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formType: selected,
          title: title.trim(),
          summary: summary.trim() || undefined,
          dueAt: dueAt || null,
          share,
          targetKind,
          targetEmployeeIds: targetKind === "explicit" ? Array.from(picks) : [],
        }),
      });
      const d = await r.json();
      if (!r.ok) { setStatus({ kind: "err", text: d?.error ?? "Could not push." }); return; }
      setStatus({ kind: "ok", text: `Pushed to ${d.assignedCount} employee${d.assignedCount === 1 ? "" : "s"}.` });
      setTitle(""); setSummary(""); setDueAt(""); setPicks(new Set()); setTargetKind("all");
      await loadAssignments(selected);
    } finally { setBusy(false); }
  }

  const bulkOnly = registry.filter((r) => r.bulkAssignable);

  return (
    <div className="min-h-screen bg-[#040d1a] text-slate-100">
      <header className="border-b border-white/10 bg-[#071428]/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center gap-4">
          <Link href="/admin" className="text-slate-400 hover:text-slate-200 text-sm">← Admin</Link>
          <div className="ml-auto text-xs uppercase tracking-[0.18em] text-slate-500">Forms & Personnel Documentation</div>
        </div>
        <div className="max-w-5xl mx-auto px-5 pb-4">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f0b429]">Bulk push</div>
          <h1 className="text-2xl font-black text-white mt-1">Send a form to many employees at once</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6 space-y-5">
        <section className="bg-[rgba(7,20,40,0.55)] border border-white/8 rounded-2xl p-5">
          <h2 className="text-white font-black text-lg mb-3">1. Pick the form</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {bulkOnly.map((r) => (
              <button key={r.id} type="button"
                onClick={() => { setSelected(r.id); setTitle(r.label); }}
                className={`text-left rounded-xl px-4 py-3 border transition ${selected === r.id ? "border-[#f0b429] bg-[#f0b429]/10" : "border-white/10 bg-[#071428] hover:border-[#f0b429]/30"}`}>
                <div className="text-white font-bold text-sm">{r.label}</div>
                <div className="text-slate-400 text-xs mt-1">{r.blurb}</div>
              </button>
            ))}
          </div>
        </section>

        {selected && (
          <section className="bg-[rgba(7,20,40,0.55)] border border-white/8 rounded-2xl p-5 space-y-4">
            <h2 className="text-white font-black text-lg">2. Details + audience</h2>
            <label className="block">
              <span className="text-slate-400 text-xs uppercase tracking-wider">Title shown to employees *</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
            </label>
            <label className="block">
              <span className="text-slate-400 text-xs uppercase tracking-wider">Summary / what changed (optional)</span>
              <textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)}
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
            </label>
            <label className="block">
              <span className="text-slate-400 text-xs uppercase tracking-wider">Due date (optional)</span>
              <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)}
                className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
            </label>

            <div className="space-y-2">
              <span className="text-slate-400 text-xs uppercase tracking-wider">Send to</span>
              {[
                { v: "all", label: "All active employees" },
                { v: "crew", label: "All crew (non-admin)" },
                { v: "admin", label: "All admins" },
                { v: "explicit", label: "Specific employees" },
              ].map((opt) => (
                <label key={opt.v} className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="radio" name="targetKind" checked={targetKind === opt.v}
                    onChange={() => setTargetKind(opt.v as typeof targetKind)} style={{ accentColor: "#f0b429" }} />
                  {opt.label}
                </label>
              ))}
              {targetKind === "explicit" && (
                <div className="grid sm:grid-cols-2 gap-1 max-h-64 overflow-y-auto bg-[#040d1a]/40 border border-white/5 rounded-xl p-2">
                  {employees.map((e) => (
                    <label key={e.id} className="flex items-center gap-2 text-sm text-slate-300 px-2 py-1 rounded hover:bg-white/5">
                      <input type="checkbox" checked={picks.has(e.id)} onChange={() => togglePick(e.id)} style={{ accentColor: "#f0b429" }} />
                      <span>{e.firstName} {e.lastName}{e.certification ? ` · ${e.certification}` : ""}{e.isAdmin ? " · admin" : ""}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <span className="text-slate-400 text-xs uppercase tracking-wider">After each employee signs</span>
              <div className="mt-2 space-y-1">
                {([
                  ["saveToFile", "Save the PDF to the employee's personnel file"],
                  ["visibleToEmployee", "Make the PDF visible to the employee in their lounge file"],
                  ["emailEmployee", "Email the PDF to the employee's email on file"],
                  ["emailAdminInbox", "Email the PDF to millstadtems@gmail.com"],
                ] as const).map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 text-sm text-slate-300">
                    <input type="checkbox" checked={share[k]} onChange={(e) => setShare((s) => ({ ...s, [k]: e.target.checked }))} style={{ accentColor: "#f0b429" }} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button type="button" onClick={publish} disabled={busy}
                className="bg-[#f0b429] hover:bg-[#fbbf3a] text-[#040d1a] font-black uppercase tracking-wider text-xs px-5 py-2.5 rounded-lg disabled:opacity-50">
                {busy ? "Publishing…" : "Publish to selected"}
              </button>
              {status && <span className={`text-sm font-bold ${status.kind === "ok" ? "text-emerald-300" : "text-red-300"}`}>{status.text}</span>}
            </div>
          </section>
        )}

        {selected && (
          <section className="bg-[rgba(7,20,40,0.55)] border border-white/8 rounded-2xl p-5">
            <h2 className="text-white font-black text-lg mb-3">Recent pushes for {registry.find((r) => r.id === selected)?.label}</h2>
            {assignments.length === 0 ? (
              <p className="text-slate-500 text-sm">None yet.</p>
            ) : (
              <ul className="space-y-2">
                {assignments.map((a) => (
                  <li key={a.id} className="border border-white/10 rounded-xl px-4 py-3 bg-[#071428]">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="text-white font-bold">{a.title}</span>
                      <span className="text-slate-400 text-xs">Pushed {fmtDate(a.createdAt)} by {a.createdByName ?? "—"}</span>
                      <span className="ml-auto text-xs text-emerald-300">{a.progress.finalized}/{a.progress.assigned} signed</span>
                      {a.progress.pending > 0 && <span className="text-xs text-amber-300">{a.progress.pending} pending</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
