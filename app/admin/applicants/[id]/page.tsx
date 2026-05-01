"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { buildApplicationFlags } from "@/lib/application-flags";
import type { ApplicantWorkflow, ApplicantStatus } from "@/lib/applicant-workflow";

interface Submission {
  id: string;
  formType: string;
  fields: Record<string, string | string[]>;
  submittedAt: string;
  readAt: string | null;
}

const STAGE_PAGES: { key: string; label: string; status: ApplicantStatus[] }[] = [
  { key: "info",        label: "Applicant Info",  status: ["Applied", "Waitlisted", "Interview Process", "Tentative Hire", "Hired", "Denied"] },
  { key: "interview",   label: "Interview",       status: ["Interview Process", "Tentative Hire", "Hired"] },
  { key: "evaluation",  label: "Evaluation",      status: ["Interview Process", "Tentative Hire", "Hired"] },
  { key: "onboarding",  label: "Onboarding",      status: ["Tentative Hire", "Hired"] },
  { key: "history",     label: "Status History",  status: ["Applied", "Waitlisted", "Interview Process", "Tentative Hire", "Hired", "Denied"] },
];

const STATUS_STYLES: Record<ApplicantStatus, { bg: string; border: string; text: string; label: string }> = {
  Applied:            { bg: "bg-sky-500/10",     border: "border-sky-500/40",     text: "text-sky-300",     label: "Applied" },
  Waitlisted:         { bg: "bg-amber-500/10",   border: "border-amber-500/40",   text: "text-amber-300",   label: "Waitlisted" },
  "Interview Process":{ bg: "bg-purple-500/10",  border: "border-purple-500/40",  text: "text-purple-300",  label: "Interview Process" },
  "Tentative Hire":   { bg: "bg-emerald-500/10", border: "border-emerald-500/40", text: "text-emerald-300", label: "Tentative Hire" },
  Hired:              { bg: "bg-emerald-600/15", border: "border-emerald-600",    text: "text-emerald-200", label: "Hired" },
  Denied:             { bg: "bg-red-500/10",     border: "border-red-500/40",     text: "text-red-300",     label: "Denied" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" }) + " CT";
}

function formatKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function nameOf(fields: Record<string, string | string[]>) {
  return [String(fields.first_name ?? ""), String(fields.last_name ?? "")].filter(Boolean).join(" ") || "Applicant";
}

export default function ApplicantDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [sub, setSub] = useState<Submission | null>(null);
  const [workflow, setWorkflow] = useState<ApplicantWorkflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activePage, setActivePage] = useState<string>("info");

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/submissions?id=${id}`).then(r => r.json()),
      fetch(`/api/admin/applicants/${id}`).then(r => r.json()),
    ]).then(async ([subData, wfData]) => {
      setSub(subData);
      setWorkflow(wfData?.workflow ?? null);
      setLoading(false);
      // Mark as read
      if (subData && !subData.readAt) {
        await fetch("/api/admin/submissions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      }
    }).catch(() => setLoading(false));
  }, [id]);

  async function api(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/applicants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.workflow) setWorkflow(data.workflow);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="text-slate-500 text-sm py-12 text-center">Loading…</div>;
  if (!sub || !workflow) return <div className="text-slate-500 text-sm py-12 text-center">Applicant not found.</div>;

  const status = workflow.status;
  const styles = STATUS_STYLES[status];
  const flags = buildApplicationFlags(sub.fields);
  const visiblePages = STAGE_PAGES.filter(p => p.status.includes(status));
  const fullName = nameOf(sub.fields);

  return (
    <div className="max-w-5xl">
      {/* Back to list */}
      <Link href={`/admin/applicants?status=${encodeURIComponent(status)}`} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-5 transition-colors">
        <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"/></svg>
        Back to {status}
      </Link>

      {/* Applicant header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="h-px w-8 bg-[#f0b429]" />
          <span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">Applicant</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-3xl font-black text-white">{fullName}</h1>
          <span className={`inline-flex items-center rounded-full border-2 px-4 py-1.5 text-sm font-black uppercase tracking-wider ${styles.bg} ${styles.border} ${styles.text}`}>
            {styles.label}
          </span>
          {flags.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-red-500/20 border border-red-500/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-red-300">
              ⚠ {flags.length} Flag{flags.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <p className="text-slate-400 text-sm mt-2">
          {String(sub.fields.position ?? "—")} · Submitted {fmtDate(sub.submittedAt)}
        </p>
      </div>

      {/* Status transition buttons (always visible) */}
      <StatusActions status={status} busy={busy} onChange={(s) => api({ status: s })} />

      {/* Stage tabs — each is a separate "page" */}
      <div className="mt-8 mb-6 flex flex-wrap gap-2 border-b-2 border-white/10 pb-0">
        {visiblePages.map(p => (
          <button key={p.key} type="button" onClick={() => setActivePage(p.key)}
            className={`relative -mb-[2px] px-5 py-3 text-sm font-black uppercase tracking-wider transition-colors border-b-4 ${
              activePage === p.key
                ? "border-[#f0b429] text-[#f0b429]"
                : "border-transparent text-slate-400 hover:text-white"
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Active page content — only ONE shown at a time, no drop-downs */}
      <div>
        {activePage === "info" && <InfoPage submission={sub} flags={flags} />}
        {activePage === "interview" && <InterviewPage workflow={workflow} busy={busy} onSave={(patch) => api({ interview: patch })} />}
        {activePage === "evaluation" && <EvaluationPage workflow={workflow} busy={busy} onSave={(patch) => api({ evaluation: patch })} onDecision={(s) => api({ status: s })} />}
        {activePage === "onboarding" && <OnboardingPage workflow={workflow} busy={busy} onSave={(patch) => api({ onboarding: patch })} onComplete={() => api({ status: "Hired" })} />}
        {activePage === "history" && <HistoryPage workflow={workflow} />}
      </div>

      {/* Print button at bottom */}
      <div className="mt-10 pt-6 border-t border-white/10 flex justify-between items-center">
        <button type="button" onClick={() => router.push(`/admin/submissions/${id}`)}
          className="text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-300">
          View raw submission
        </button>
        <span className="text-xs text-slate-600">Submission ID: {sub.id}</span>
      </div>
    </div>
  );
}

/* ── Status transition buttons ─────────────────────────────────────── */
function StatusActions({ status, busy, onChange }: { status: ApplicantStatus; busy: boolean; onChange: (s: ApplicantStatus) => void }) {
  const actions: { label: string; to: ApplicantStatus; tone: string }[] = [];
  if (status === "Applied") {
    actions.push({ label: "Move to Interview", to: "Interview Process", tone: "purple" });
    actions.push({ label: "Waitlist", to: "Waitlisted", tone: "amber" });
    actions.push({ label: "Deny", to: "Denied", tone: "red" });
  } else if (status === "Waitlisted") {
    actions.push({ label: "Move to Interview", to: "Interview Process", tone: "purple" });
    actions.push({ label: "Deny", to: "Denied", tone: "red" });
  } else if (status === "Interview Process") {
    actions.push({ label: "Tentative Hire", to: "Tentative Hire", tone: "emerald" });
    actions.push({ label: "Waitlist", to: "Waitlisted", tone: "amber" });
    actions.push({ label: "Deny", to: "Denied", tone: "red" });
  } else if (status === "Tentative Hire") {
    actions.push({ label: "Mark as Hired", to: "Hired", tone: "emerald" });
    actions.push({ label: "Move back to Interview", to: "Interview Process", tone: "purple" });
    actions.push({ label: "Deny", to: "Denied", tone: "red" });
  } else if (status === "Denied") {
    actions.push({ label: "Restore to Applied", to: "Applied", tone: "blue" });
  } else if (status === "Hired") {
    actions.push({ label: "Revert to Tentative Hire", to: "Tentative Hire", tone: "emerald" });
  }
  const toneClass: Record<string, string> = {
    emerald: "border-emerald-500 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25",
    amber:   "border-amber-500 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25",
    red:     "border-red-500 bg-red-500/15 text-red-300 hover:bg-red-500/25",
    purple:  "border-purple-500 bg-purple-500/15 text-purple-300 hover:bg-purple-500/25",
    blue:    "border-blue-500 bg-blue-500/15 text-blue-300 hover:bg-blue-500/25",
  };
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(a => (
        <button key={a.label} type="button" onClick={() => onChange(a.to)} disabled={busy}
          className={`rounded-lg border-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider transition disabled:opacity-50 cursor-pointer ${toneClass[a.tone]}`}>
          {a.label}
        </button>
      ))}
    </div>
  );
}

/* ── Page: Applicant Info ─────────────────────────────────────────── */
function InfoPage({ submission, flags }: { submission: Submission; flags: string[] }) {
  const fields = Object.entries(submission.fields).filter(([k]) => k !== "formType" && k !== "review_flags");
  return (
    <div className="space-y-6">
      {flags.length > 0 && (
        <div className="rounded-2xl border-2 border-red-500/60 bg-red-950/30 overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 bg-red-600 text-white">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current shrink-0"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
            <div className="flex-1">
              <div className="font-black text-base uppercase tracking-wider">Flag for Review</div>
              <div className="text-sm opacity-90">{flags.length} item{flags.length === 1 ? "" : "s"} flagged</div>
            </div>
          </div>
          <ul className="divide-y divide-red-500/20">
            {flags.map((f, i) => (
              <li key={i} className="flex items-start gap-3 px-6 py-3">
                <span className="mt-1.5 w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span className="text-red-100 text-sm">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border-2 border-white/10 bg-[#071428] overflow-hidden">
        <div className="px-6 py-4 bg-[#040d1a] border-b border-white/10">
          <span className="text-xs font-black uppercase tracking-[0.16em] text-[#f0b429]">Application Details</span>
        </div>
        <div className="divide-y divide-white/5">
          {fields.map(([k, v]) => {
            const value = Array.isArray(v) ? v.join(", ") : (v || "—");
            const isLong = String(value).length > 80;
            return (
              <div key={k} className={`px-6 py-3 ${isLong ? "" : "grid grid-cols-[200px_1fr] gap-4 items-start"}`}>
                <div className="text-slate-500 text-xs font-black uppercase tracking-wider mb-1">{formatKey(k)}</div>
                <div className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                  {value === "—" ? <span className="text-slate-600">—</span> : value}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Page: Interview ─────────────────────────────────────────────────── */
function InterviewPage({ workflow, busy, onSave }: { workflow: ApplicantWorkflow; busy: boolean; onSave: (p: Record<string, unknown>) => void }) {
  const i = workflow.interview;
  const [local, setLocal] = useState(i);
  function save(patch: Record<string, unknown>) { setLocal({ ...local, ...patch }); onSave(patch); }
  return (
    <div className="rounded-2xl border-2 border-purple-500/30 bg-[#071428] overflow-hidden">
      <div className="px-6 py-4 bg-purple-500/10 border-b-2 border-purple-500/30">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-purple-300">Interview Process</div>
        <div className="text-base font-bold text-white mt-1">Track contact attempts and schedule the interview.</div>
      </div>
      <div className="p-6 space-y-5">
        <CheckBlock title="Contacted applicant" checked={!!local.contacted}
          onChange={(v) => save({ contacted: v, contactedAt: v && !local.contactedAt ? new Date().toISOString() : local.contactedAt })}
          disabled={busy}>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <Field label="Date contacted" type="date" value={local.contactedAt?.slice(0,10) ?? ""} onBlur={(v) => save({ contactedAt: v ? new Date(v).toISOString() : "" })} disabled={busy} />
            <FieldText label="Notes" value={local.contactedNotes ?? ""} onBlur={(v) => save({ contactedNotes: v })} disabled={busy} rows={2} />
          </div>
        </CheckBlock>

        <CheckBlock title="Attempted contact (no response)" checked={!!local.attemptedContact}
          onChange={(v) => save({ attemptedContact: v, attemptedContactAt: v && !local.attemptedContactAt ? new Date().toISOString() : local.attemptedContactAt })}
          disabled={busy}>
          <div className="grid sm:grid-cols-1 max-w-xs mt-3">
            <Field label="Date" type="date" value={local.attemptedContactAt?.slice(0,10) ?? ""} onBlur={(v) => save({ attemptedContactAt: v ? new Date(v).toISOString() : "" })} disabled={busy} />
          </div>
        </CheckBlock>

        <div className="rounded-xl border-2 border-[#f0b429]/30 bg-[#f0b429]/[0.04] p-5">
          <CheckBlock title="Interview scheduled" subtitle="When marked, an email goes to the hiring team."
            checked={!!local.scheduled}
            onChange={(v) => save({ scheduled: v })}
            disabled={busy}>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <Field label="Date / time" type="datetime-local" value={local.scheduledAt ? local.scheduledAt.slice(0,16) : ""} onBlur={(v) => save({ scheduledAt: v ? new Date(v).toISOString() : "" })} disabled={busy} />
              <Field label="Location or virtual link" value={local.location ?? ""} onBlur={(v) => save({ location: v })} disabled={busy} placeholder="e.g., Station 1 conference room" />
              <FieldText label="Notes" value={local.notes ?? ""} onBlur={(v) => save({ notes: v })} disabled={busy} rows={2} wide />
            </div>
            {workflow.interviewEmailSentAt && (
              <div className="mt-3 text-xs font-bold text-emerald-400">✓ Email sent {new Date(workflow.interviewEmailSentAt).toLocaleString("en-US", { timeZone: "America/Chicago" })} CT</div>
            )}
          </CheckBlock>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#040d1a]/40 p-5">
          <div className="text-sm font-bold text-white mb-3">Interviewers assigned</div>
          <Field label="Names (comma-separated)" value={(local.interviewers ?? []).join(", ")} onBlur={(v) => save({ interviewers: v.split(",").map(s => s.trim()).filter(Boolean) })} disabled={busy} placeholder="e.g., Kenneth James, Jennifer Goetz" />
        </div>
      </div>
    </div>
  );
}

/* ── Page: Evaluation ─────────────────────────────────────────── */
import { EVALUATION_CHECKS } from "@/lib/applicant-workflow";
function EvaluationPage({ workflow, busy, onSave, onDecision }: { workflow: ApplicantWorkflow; busy: boolean; onSave: (p: Record<string, unknown>) => void; onDecision: (s: ApplicantStatus) => void }) {
  const [local, setLocal] = useState(workflow.evaluation);
  function save(patch: Record<string, unknown>) { setLocal({ ...local, ...patch }); onSave(patch); }
  return (
    <div className="rounded-2xl border-2 border-amber-500/30 bg-[#071428] overflow-hidden">
      <div className="px-6 py-4 bg-amber-500/10 border-b-2 border-amber-500/30">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">Interview Evaluation</div>
        <div className="text-base font-bold text-white mt-1">EMS-focused evaluation — check off observed strengths.</div>
      </div>
      <div className="p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-3">
          {EVALUATION_CHECKS.map(c => (
            <label key={c.key} className="flex items-center gap-3 px-4 py-3 bg-[#040d1a] border border-white/10 rounded-lg cursor-pointer hover:border-[#f0b429]/40">
              <input type="checkbox" checked={!!local[c.key]} onChange={(e) => save({ [c.key]: e.target.checked })} disabled={busy} className="accent-[#f0b429] w-5 h-5 shrink-0" />
              <span className="text-sm text-slate-300">{c.label}</span>
            </label>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Overall rating (1–5)</label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => save({ overallRating: n })} disabled={busy}
                  className={`w-10 h-10 rounded-lg border-2 font-black text-lg ${local.overallRating === n ? "border-[#f0b429] bg-[#f0b429] text-[#040d1a]" : "border-white/15 bg-[#040d1a] text-slate-400 hover:border-[#f0b429]/50"}`}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Recommendation</label>
            <div className="flex flex-wrap gap-2">
              {(["Hire","Waitlist","Do Not Hire"] as const).map(r => (
                <button key={r} type="button" onClick={() => save({ recommendation: r })} disabled={busy}
                  className={`rounded-lg border-2 px-4 py-2 text-xs font-black uppercase tracking-wider ${
                    local.recommendation === r
                      ? r === "Hire" ? "border-emerald-500 bg-emerald-500 text-white"
                      : r === "Waitlist" ? "border-amber-500 bg-amber-500 text-[#040d1a]"
                      : "border-red-500 bg-red-500 text-white"
                      : "border-white/15 bg-[#040d1a] text-slate-400 hover:border-white/30"
                  }`}>{r}</button>
              ))}
            </div>
          </div>
        </div>

        <FieldText label="Strengths" value={local.strengths ?? ""} onBlur={(v) => save({ strengths: v })} disabled={busy} rows={3} wide />
        <FieldText label="Concerns" value={local.concerns ?? ""} onBlur={(v) => save({ concerns: v })} disabled={busy} rows={3} wide />
        <Field label="Evaluator name" value={local.evaluatorName ?? ""} onBlur={(v) => save({ evaluatorName: v, evaluatedAt: v && !local.evaluatedAt ? new Date().toISOString() : local.evaluatedAt })} disabled={busy} />

        <div className="border-t-2 border-white/10 pt-5 mt-2">
          <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Post-interview decision</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onDecision("Tentative Hire")} disabled={busy} className="rounded-lg border-2 border-emerald-500 bg-emerald-500 px-5 py-3 text-sm font-black uppercase tracking-wider text-white hover:bg-emerald-400">Move to Tentative Hire</button>
            <button type="button" onClick={() => onDecision("Waitlisted")} disabled={busy} className="rounded-lg border-2 border-amber-500 bg-amber-500/15 px-5 py-3 text-sm font-black uppercase tracking-wider text-amber-300 hover:bg-amber-500/25">Waitlist</button>
            <button type="button" onClick={() => onDecision("Denied")} disabled={busy} className="rounded-lg border-2 border-red-500 bg-red-500/15 px-5 py-3 text-sm font-black uppercase tracking-wider text-red-300 hover:bg-red-500/25">Deny</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page: Onboarding ─────────────────────────────────────────── */
import { ONBOARDING_GROUPS, onboardingProgress } from "@/lib/applicant-workflow";
function OnboardingPage({ workflow, busy, onSave, onComplete }: { workflow: ApplicantWorkflow; busy: boolean; onSave: (p: Record<string, unknown>) => void; onComplete: () => void }) {
  const [local, setLocal] = useState(workflow.onboarding);
  function toggle(key: string) {
    const next = { ...local, [key]: !(local as Record<string, boolean>)[key] };
    setLocal(next);
    onSave({ [key]: !(local as Record<string, boolean>)[key] });
  }
  const prog = onboardingProgress(local);
  return (
    <div className="rounded-2xl border-2 border-emerald-500/30 bg-[#071428] overflow-hidden">
      <div className="px-6 py-4 bg-emerald-500/10 border-b-2 border-emerald-500/30 flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">New Hire Onboarding</div>
          <div className="text-base font-bold text-white mt-1">{prog.done}/{prog.total} items complete · {prog.pct}%</div>
        </div>
        <div className="w-full sm:w-64 h-3 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${prog.pct}%` }} />
        </div>
      </div>
      <div className="p-6 space-y-7">
        {ONBOARDING_GROUPS.map(group => (
          <div key={group.title}>
            <div className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300 mb-3">{group.icon} {group.title}</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {group.items.map(item => (
                <label key={item.key} className="flex items-center gap-3 px-3 py-2 bg-[#040d1a] border border-white/10 rounded-lg cursor-pointer hover:border-emerald-500/40">
                  <input type="checkbox" checked={!!(local as Record<string, boolean>)[item.key]} onChange={() => toggle(item.key)} disabled={busy} className="accent-emerald-500 w-4 h-4 shrink-0" />
                  <span className="text-sm text-slate-300">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        {workflow.status !== "Hired" && (
          <div className="border-t-2 border-white/10 pt-5">
            <button type="button" onClick={onComplete} disabled={busy || prog.pct < 100}
              className={`w-full rounded-lg border-2 px-5 py-4 text-base font-black uppercase tracking-wider ${prog.pct === 100 ? "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-400" : "border-white/15 bg-white/5 text-slate-500 cursor-not-allowed"}`}>
              {prog.pct === 100 ? "✓ Mark as Hired" : `Complete ${prog.total - prog.done} more item${(prog.total - prog.done) === 1 ? "" : "s"} to finalize`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Page: Status History ─────────────────────────────────────────── */
function HistoryPage({ workflow }: { workflow: ApplicantWorkflow }) {
  return (
    <div className="rounded-2xl border-2 border-white/10 bg-[#071428] overflow-hidden">
      <div className="px-6 py-4 bg-[#040d1a] border-b border-white/10">
        <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Status History</div>
      </div>
      <div className="p-6">
        {workflow.statusHistory.length === 0 ? (
          <p className="text-slate-500 text-sm">No status changes yet — applicant is in default state.</p>
        ) : (
          <ul className="space-y-3">
            {workflow.statusHistory.slice().reverse().map((h, i) => (
              <li key={i} className="flex items-start gap-4 pb-3 border-b border-white/5 last:border-0">
                <span className="text-slate-500 font-mono text-xs shrink-0 mt-0.5 min-w-[140px]">
                  {new Date(h.at).toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "short", timeStyle: "short" })}
                </span>
                <span className="text-slate-300 text-sm">
                  {h.from && <><span className="text-slate-500">{h.from}</span> <span className="text-slate-700">→</span> </>}
                  <span className="font-bold text-white">{h.to}</span>
                  {h.note && <span className="text-slate-500 ml-2 italic">— {h.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ── Inputs ──────────────────────────────────────────────────────── */
function CheckBlock({ title, subtitle, checked, onChange, disabled, children }: { title: string; subtitle?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; children?: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} className="mt-1 accent-[#f0b429] w-5 h-5 shrink-0" />
        <div className="flex-1">
          <div className="text-sm font-bold text-white">{title}</div>
          {subtitle && <div className="text-xs text-amber-300 mt-1">{subtitle}</div>}
          {children}
        </div>
      </label>
    </div>
  );
}

function Field({ label, value, onBlur, disabled, type = "text", placeholder }: { label: string; value: string; onBlur: (v: string) => void; disabled?: boolean; type?: string; placeholder?: string }) {
  const [v, setV] = useState(value);
  return (
    <label className="block">
      <span className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">{label}</span>
      <input type={type} value={v} placeholder={placeholder} disabled={disabled}
        onChange={(e) => setV(e.target.value)} onBlur={() => { if (v !== value) onBlur(v); }}
        className="w-full rounded-lg border border-white/15 bg-[#040d1a] px-3 py-2 text-sm text-white outline-none focus:border-[#f0b429]/60 disabled:opacity-50" />
    </label>
  );
}

function FieldText({ label, value, onBlur, disabled, rows = 3, wide, placeholder }: { label: string; value: string; onBlur: (v: string) => void; disabled?: boolean; rows?: number; wide?: boolean; placeholder?: string }) {
  const [v, setV] = useState(value);
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1">{label}</span>
      <textarea rows={rows} value={v} placeholder={placeholder} disabled={disabled}
        onChange={(e) => setV(e.target.value)} onBlur={() => { if (v !== value) onBlur(v); }}
        className="w-full rounded-lg border border-white/15 bg-[#040d1a] px-3 py-2 text-sm text-white outline-none focus:border-[#f0b429]/60 disabled:opacity-50 resize-y" />
    </label>
  );
}
