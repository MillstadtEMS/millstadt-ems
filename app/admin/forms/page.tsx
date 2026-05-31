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
        <InsightsCard />
        <AwaitingReviewCard />

        <section className="bg-[rgba(7,20,40,0.55)] border border-white/8 rounded-2xl p-5">
          <h2 className="text-white font-black text-lg mb-3">1. Pick the form</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {bulkOnly.map((r) => (
              <div
                key={r.id}
                className={`rounded-xl px-4 py-3 border transition ${selected === r.id ? "border-[#f0b429] bg-[#f0b429]/10" : "border-white/10 bg-[#071428] hover:border-[#f0b429]/30"}`}
              >
                <button type="button"
                  onClick={() => { setSelected(r.id); setTitle(r.label); }}
                  className="text-left w-full"
                >
                  <div className="text-white font-bold text-sm">{r.label}</div>
                  <div className="text-slate-400 text-xs mt-1">{r.blurb}</div>
                </button>
                <a
                  href={`/api/admin/forms/${r.id}/blank-pdf`}
                  className="inline-block mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-sky-300 hover:text-sky-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  ↓ Print blank PDF
                </a>
              </div>
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
                  <li key={a.id}>
                    <Link
                      href={`/admin/forms/${a.id}`}
                      className="block border border-white/10 hover:border-[#f0b429]/40 rounded-xl px-4 py-3 bg-[#071428] transition-colors"
                    >
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="text-white font-bold">{a.title}</span>
                        <span className="text-slate-400 text-xs">Pushed {fmtDate(a.createdAt)} by {a.createdByName ?? "—"}</span>
                        <span className="ml-auto text-xs text-emerald-300">{a.progress.finalized}/{a.progress.assigned} signed</span>
                        {a.progress.pending > 0 && <span className="text-xs text-amber-300">{a.progress.pending} pending</span>}
                      </div>
                    </Link>
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

// ── Awaiting-review card ───────────────────────────────────────────────

interface AwaitingItem {
  formId: string;
  formType: string;
  formLabel: string;
  employeeId: string;
  employeeName: string;
  employeeCertification: string | null;
  submittedAt: string;
}

function AwaitingReviewCard() {
  const [items, setItems] = useState<AwaitingItem[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/forms/awaiting-review", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) { setItems([]); return; }
        const d = await r.json();
        setItems(Array.isArray(d.items) ? d.items : []);
      })
      .catch(() => setItems([]));
  }, []);

  if (items === null) {
    return (
      <section className="bg-[rgba(7,20,40,0.55)] border border-white/8 rounded-2xl p-5">
        <div className="text-slate-500 text-sm">Loading awaiting-review queue…</div>
      </section>
    );
  }
  if (items.length === 0) return null;

  return (
    <section className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-5">
      <div className="flex flex-wrap items-baseline gap-3 mb-3">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Action needed</span>
        <h2 className="text-white font-black text-lg">{items.length} employee submission{items.length === 1 ? "" : "s"} awaiting your review</h2>
      </div>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.formId}>
            <Link
              href={`/admin/employees/${it.employeeId}/forms/${it.formId}`}
              className="flex flex-wrap items-center gap-3 px-3 py-2 bg-[#071428] border border-white/10 rounded-xl hover:border-amber-400/40 text-sm"
            >
              <span className="text-white font-bold">{it.employeeName}</span>
              {it.employeeCertification && <span className="text-slate-500 text-xs">· {it.employeeCertification}</span>}
              <span className="text-amber-300 text-xs uppercase tracking-wider">{it.formLabel}</span>
              <span className="text-slate-500 text-xs ml-auto">Submitted {fmtDate(it.submittedAt)}</span>
              <span className="text-[#f0b429] text-xs font-bold uppercase tracking-wider">Review →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Insights card ──────────────────────────────────────────────────────

interface InsightsDto {
  finalizedThisMonth: number;
  finalizedYtd: number;
  pendingAssigned: number;
  awaitingAdminReview: number;
  overdueAssignments: number;
  draftAssignments: number;
  byTypeLast30: { formType: string; formLabel: string; count: number }[];
  recentActivity: {
    formId: string;
    formType: string;
    formLabel: string;
    employeeId: string;
    employeeName: string;
    action: "finalized" | "awaiting_admin";
    when: string;
  }[];
}

function timeAgo(iso: string): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function InsightsCard() {
  const [data, setData] = useState<InsightsDto | null>(null);

  useEffect(() => {
    fetch("/api/admin/forms/insights", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) { setData(null); return; }
        setData(await r.json());
      })
      .catch(() => setData(null));
  }, []);

  if (data === null) return null;

  const tiles: { label: string; value: number; tone: "gold" | "sky" | "amber" | "emerald" | "rose" }[] = [
    { label: "Finalized this month", value: data.finalizedThisMonth, tone: "emerald" },
    { label: "Finalized YTD", value: data.finalizedYtd, tone: "gold" },
    { label: "Pending signature", value: data.pendingAssigned, tone: "sky" },
    { label: "Awaiting admin review", value: data.awaitingAdminReview, tone: "amber" },
    { label: "Overdue assignments", value: data.overdueAssignments, tone: "rose" },
    { label: "Open assignments", value: data.draftAssignments, tone: "sky" },
  ];

  const toneClass = (tone: typeof tiles[number]["tone"]) => ({
    gold:    "border-[#f0b429]/30 text-[#f0b429]",
    sky:     "border-sky-500/30 text-sky-300",
    amber:   "border-amber-400/30 text-amber-300",
    emerald: "border-emerald-500/30 text-emerald-300",
    rose:    "border-rose-500/30 text-rose-300",
  }[tone]);

  const maxCount = Math.max(1, ...data.byTypeLast30.map((r) => r.count));

  return (
    <section className="bg-[rgba(7,20,40,0.55)] border border-white/8 rounded-2xl p-5">
      <div className="flex flex-wrap items-baseline gap-3 mb-4">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f0b429]">HR snapshot</span>
        <h2 className="text-white font-black text-lg">Forms activity</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-5" style={{ gap: 8 }}>
        {tiles.map((t) => (
          <div key={t.label} className={`rounded-xl border bg-[#040d1a]/40 ${toneClass(t.tone)}`} style={{ padding: "12px 14px" }}>
            <div className="text-[10px] font-black uppercase" style={{ letterSpacing: "0.18em" }}>{t.label}</div>
            <div className="text-white font-black tabular-nums" style={{ fontSize: 26, marginTop: 4 }}>{t.value}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4" style={{ gap: 16 }}>
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 mb-2">Top forms · last 30 days</div>
          {data.byTypeLast30.length === 0 ? (
            <p className="text-slate-500 text-sm">No finalized forms yet this month.</p>
          ) : (
            <ul className="space-y-2">
              {data.byTypeLast30.map((r) => (
                <li key={r.formType}>
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="text-slate-200 text-sm font-bold">{r.formLabel}</span>
                    <span className="text-slate-400 text-xs tabular-nums">{r.count}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded">
                    <div className="h-full rounded bg-[#f0b429]" style={{ width: `${(r.count / maxCount) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 mb-2">Recent activity</div>
          {data.recentActivity.length === 0 ? (
            <p className="text-slate-500 text-sm">Nothing recent.</p>
          ) : (
            <ul className="space-y-1.5">
              {data.recentActivity.map((r) => (
                <li key={`${r.action}-${r.formId}`}>
                  <Link
                    href={`/admin/employees/${r.employeeId}/forms/${r.formId}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-sm"
                  >
                    <span className={r.action === "finalized" ? "text-emerald-300" : "text-amber-300"} style={{ fontSize: 11 }}>●</span>
                    <span className="text-white font-bold truncate flex-1">{r.employeeName}</span>
                    <span className="text-slate-400 text-xs truncate">{r.formLabel}</span>
                    <span className="text-slate-500 text-xs">{timeAgo(r.when)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
