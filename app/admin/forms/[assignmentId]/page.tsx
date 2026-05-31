"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

interface AssignmentDto {
  id: string;
  formType: string;
  title: string;
  summary: string | null;
  dueAt: string | null;
  createdAt: string;
  createdByName: string | null;
  targetKind: string;
  share: { saveToFile: boolean; visibleToEmployee: boolean; emailEmployee: boolean; emailAdminInbox: boolean };
}

interface RowDto {
  formId: string;
  employeeId: string;
  employeeName: string;
  employeeCertification: string | null;
  employeeIsAdmin: boolean;
  status: "draft" | "finalized" | "rescinded";
  finalizedAt: string | null;
  createdAt: string;
  pdfUrl: string | null;
  pdfFilename: string | null;
  emailedEmployee: boolean;
}

interface Progress { assigned: number; finalized: number; pending: number }

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US");
}
function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("en-US");
}

export default function AssignmentDetailPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const router = useRouter();

  const [assignment, setAssignment] = useState<AssignmentDto | null>(null);
  const [rows, setRows] = useState<RowDto[]>([]);
  const [progress, setProgress] = useState<Progress>({ assigned: 0, finalized: 0, pending: 0 });
  const [filter, setFilter] = useState<"all" | "pending" | "finalized" | "rescinded">("all");
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderStatus, setReminderStatus] = useState<null | { kind: "ok" | "err"; text: string }>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const meRes = await fetch("/api/lounge/me");
      if (!meRes.ok) { router.push("/lounge/login"); return; }
      const me = await meRes.json();
      if (!me.employee?.isAdmin) { router.push("/lounge"); return; }
      const r = await fetch(`/api/admin/form-assignments/${assignmentId}`, { cache: "no-store" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d?.error ?? "Could not load assignment.");
        return;
      }
      const d = await r.json();
      setAssignment(d.assignment);
      setRows(Array.isArray(d.rows) ? d.rows : []);
      setProgress(d.progress);
    } catch {
      setError("Connection error.");
    }
  }, [assignmentId, router]);

  useEffect(() => { load(); }, [load]);

  const filteredRows = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === (filter === "pending" ? "draft" : filter));
  }, [rows, filter]);

  async function sendReminders(emailToo: boolean) {
    if (!confirm(emailToo
      ? "Send a lounge notification AND an email to every employee still pending?"
      : "Send a lounge notification to every employee still pending?")) return;
    setReminderBusy(true);
    setReminderStatus(null);
    try {
      const r = await fetch(`/api/admin/form-assignments/${assignmentId}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailToo }),
      });
      const d = await r.json();
      if (!r.ok) { setReminderStatus({ kind: "err", text: d?.error ?? "Could not send reminders." }); return; }
      setReminderStatus({ kind: "ok", text: `Sent ${d.sent} reminder${d.sent === 1 ? "" : "s"}${emailToo ? ` (+${d.sentEmails} emails)` : ""}.` });
    } finally {
      setReminderBusy(false);
    }
  }

  function downloadCsv() {
    window.open(`/api/admin/form-assignments/${assignmentId}/csv`, "_blank", "noopener,noreferrer");
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#040d1a] text-slate-100 p-8">
        <p className="text-red-300">{error}</p>
        <Link href="/admin/forms" className="text-[#f0b429] underline mt-4 inline-block">← Back to Forms</Link>
      </div>
    );
  }
  if (!assignment) {
    return <div className="min-h-screen bg-[#040d1a] text-slate-400 p-8">Loading assignment…</div>;
  }

  const pct = progress.assigned > 0 ? Math.round((progress.finalized / progress.assigned) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#040d1a] text-slate-100" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <header className="border-b border-white/10 bg-[#071428]/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center gap-4">
          <Link href="/admin/forms" className="text-slate-400 hover:text-slate-200 text-sm">← Forms</Link>
          <div className="ml-auto text-xs uppercase tracking-[0.18em] text-slate-500">
            Pushed {fmtDate(assignment.createdAt)} by {assignment.createdByName ?? "—"}
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-5 pb-4">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f0b429]">Assignment</div>
          <h1 className="text-2xl font-black text-white mt-1">{assignment.title}</h1>
          {assignment.summary && (
            <p className="text-slate-400 text-sm mt-2 max-w-3xl">{assignment.summary}</p>
          )}
          {assignment.dueAt && (
            <p className="text-amber-300 text-xs mt-2 font-bold uppercase tracking-wider">
              Due {fmtDate(assignment.dueAt)}
            </p>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6 space-y-5">

        {/* Progress card */}
        <section className="bg-[rgba(7,20,40,0.55)] border border-white/8 rounded-2xl p-5">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Progress</div>
              <div className="mt-1 text-4xl font-black text-white tabular-nums">
                {progress.finalized}<span className="text-slate-500 text-2xl"> / {progress.assigned}</span>
              </div>
              <div className="text-emerald-300 text-sm font-bold mt-1">{pct}% complete</div>
            </div>
            <div className="flex-1 min-w-[200px] grid grid-cols-3 gap-3 text-center text-xs">
              <Stat label="Assigned" value={progress.assigned} color="text-slate-300" />
              <Stat label="Pending"  value={progress.pending}  color="text-amber-300" />
              <Stat label="Signed"   value={progress.finalized} color="text-emerald-300" />
            </div>
          </div>

          <div className="mt-4 h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full bg-emerald-400" style={{ width: `${pct}%`, transition: "width 0.4s" }} />
          </div>

          <div className="mt-5 flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => sendReminders(false)}
              disabled={reminderBusy || progress.pending === 0}
              className="bg-amber-500/15 border border-amber-500/40 text-amber-200 font-bold text-xs uppercase tracking-wider px-3 py-2 rounded-lg hover:bg-amber-500/25 disabled:opacity-50"
            >
              {reminderBusy ? "Sending…" : `Nudge ${progress.pending} pending (lounge bell)`}
            </button>
            <button
              type="button"
              onClick={() => sendReminders(true)}
              disabled={reminderBusy || progress.pending === 0}
              className="bg-amber-500/15 border border-amber-500/40 text-amber-200 font-bold text-xs uppercase tracking-wider px-3 py-2 rounded-lg hover:bg-amber-500/25 disabled:opacity-50"
            >
              Nudge + email
            </button>
            <button
              type="button"
              onClick={downloadCsv}
              className="bg-white/5 border border-white/15 text-slate-200 font-bold text-xs uppercase tracking-wider px-3 py-2 rounded-lg hover:bg-white/10"
            >
              Export CSV
            </button>
            {reminderStatus && (
              <span className={`text-xs font-bold self-center ${reminderStatus.kind === "ok" ? "text-emerald-300" : "text-red-300"}`}>
                {reminderStatus.text}
              </span>
            )}
          </div>
        </section>

        {/* Roster */}
        <section className="bg-[rgba(7,20,40,0.55)] border border-white/8 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-black text-lg">Roster</h2>
            <div className="flex gap-1">
              {(["all", "pending", "finalized", "rescinded"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilter(k)}
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded ${
                    filter === k
                      ? "bg-[#f0b429] text-[#040d1a]"
                      : "bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <p className="text-slate-500 text-sm py-3">No one in this view.</p>
          ) : (
            <ul className="space-y-2">
              {filteredRows.map((r) => (
                <li key={r.formId} className={`border rounded-xl px-3 py-2 flex flex-wrap items-center gap-3 text-sm ${
                  r.status === "finalized" ? "bg-emerald-500/5 border-emerald-500/25"
                  : r.status === "rescinded" ? "bg-red-500/5 border-red-500/25"
                  : "bg-amber-500/5 border-amber-500/25"
                }`}>
                  <span className="text-white font-bold flex-1 min-w-[180px]">
                    {r.employeeName}
                    {r.employeeCertification && <span className="ml-2 text-slate-500 text-xs">· {r.employeeCertification}</span>}
                    {r.employeeIsAdmin && <span className="ml-2 text-[9px] uppercase tracking-widest text-[#f0b429]">Admin</span>}
                  </span>
                  <StatusPill status={r.status} />
                  <span className="text-slate-500 text-xs ml-auto">
                    {r.finalizedAt ? `Signed ${fmtDateTime(r.finalizedAt)}` : `Sent ${fmtDate(r.createdAt)}`}
                  </span>
                  {r.pdfUrl ? (
                    <a href={r.pdfUrl} target="_blank" rel="noopener noreferrer"
                      className="text-[#f0b429] hover:underline text-xs font-bold uppercase tracking-wider">
                      Open PDF
                    </a>
                  ) : (
                    <Link href={`/admin/employees/${r.employeeId}/forms/${r.formId}`}
                      className="text-slate-300 hover:underline text-xs font-bold uppercase tracking-wider">
                      Review →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg px-2 py-3">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className={`mt-1 text-xl font-black tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: RowDto["status"] }) {
  const styles =
    status === "finalized" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : status === "rescinded" ? "bg-red-500/15 text-red-300 border-red-500/30"
    : "bg-amber-500/15 text-amber-300 border-amber-500/30";
  const label = status === "draft" ? "Pending" : status[0].toUpperCase() + status.slice(1);
  return (
    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${styles}`}>
      {label}
    </span>
  );
}
