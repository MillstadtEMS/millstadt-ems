"use client";

import { useState } from "react";
import {
  type ApplicantWorkflow,
  type ApplicantStatus,
  type InterviewData,
  type EvaluationData,
  type OnboardingData,
  ONBOARDING_GROUPS,
  EVALUATION_CHECKS,
  onboardingProgress,
  interviewProgress,
  evaluationProgress,
} from "@/lib/applicant-workflow";

const STATUS_STYLES: Record<ApplicantStatus, { bg: string; border: string; text: string; label: string }> = {
  Applied:            { bg: "bg-sky-500/10",     border: "border-sky-500/40",     text: "text-sky-300",     label: "Applied" },
  Waitlisted:         { bg: "bg-amber-500/10",   border: "border-amber-500/40",   text: "text-amber-300",   label: "Waitlisted" },
  "Interview Process":{ bg: "bg-purple-500/10",  border: "border-purple-500/40",  text: "text-purple-300",  label: "Interview Process" },
  "Tentative Hire":   { bg: "bg-emerald-500/10", border: "border-emerald-500/40", text: "text-emerald-300", label: "Tentative Hire" },
  Hired:              { bg: "bg-emerald-600/15", border: "border-emerald-600",    text: "text-emerald-200", label: "Hired" },
  Denied:             { bg: "bg-red-500/10",     border: "border-red-500/40",     text: "text-red-300",     label: "Denied" },
};

export default function ApplicantWorkflowPanel({
  initialWorkflow,
  submissionId,
}: {
  initialWorkflow: ApplicantWorkflow;
  submissionId: string;
}) {
  const [workflow, setWorkflow] = useState<ApplicantWorkflow>(initialWorkflow);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function api(payload: Record<string, unknown>): Promise<void> {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/applicants/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ type: "err", text: data?.error ?? "Update failed" });
        return;
      }
      if (data.workflow) setWorkflow(data.workflow);
      setMsg({ type: "ok", text: "Saved" });
      setTimeout(() => setMsg(null), 1500);
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Network error" });
    } finally {
      setBusy(false);
    }
  }

  const status = workflow.status;
  const styles = STATUS_STYLES[status];

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border-2 border-[#f0b429]/30 bg-[#071428]">
      {/* Header — current status + transition controls */}
      <header className="flex flex-col gap-4 border-b border-white/10 bg-[#040d1a]/60 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-[#f0b429]">Hiring Workflow</div>
          <div className="mt-1 text-sm text-slate-400">Current status:</div>
          <div className={`mt-2 inline-flex items-center rounded-full border-2 px-4 py-1.5 text-sm font-black uppercase tracking-wider ${styles.bg} ${styles.border} ${styles.text}`}>
            {styles.label}
          </div>
        </div>
        <StatusActions status={status} busy={busy} onChange={(newStatus) => api({ status: newStatus })} />
      </header>

      {msg && (
        <div className={`px-6 py-2 text-sm font-bold ${msg.type === "ok" ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"}`}>
          {msg.text}
        </div>
      )}

      {/* Stage panels — distinct cards, all visible at once */}
      <div className="pb-2">
        {(status === "Interview Process" || status === "Tentative Hire" || status === "Hired") && (
          <FlatSection title="Interview Process" accent="purple" progress={interviewProgress(workflow.interview)}>
            <InterviewChecklist workflow={workflow} busy={busy} onSave={(patch) => api({ interview: patch })} />
          </FlatSection>
        )}

        {(status === "Interview Process" || status === "Tentative Hire" || status === "Hired") && (
          <FlatSection title="Interview Evaluation" accent="amber" progress={evaluationProgress(workflow.evaluation)}>
            <EvaluationForm workflow={workflow} busy={busy} onSave={(patch) => api({ evaluation: patch })} onDecision={(decision) => api({ status: decision })} />
          </FlatSection>
        )}

        {(status === "Tentative Hire" || status === "Hired") && (
          <FlatSection title="New Hire Onboarding" accent="emerald" progress={onboardingProgress(workflow.onboarding)}>
            <OnboardingChecklist workflow={workflow} busy={busy} onSave={(patch) => api({ onboarding: patch })} onComplete={() => api({ status: "Hired" })} />
          </FlatSection>
        )}

        {workflow.statusHistory.length > 0 && (
          <FlatSection title="Status History" accent="slate">
            <div className="px-6 py-4">
              <ul className="space-y-2">
                {workflow.statusHistory.slice().reverse().map((h, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-slate-500 font-mono text-xs shrink-0 mt-0.5">{new Date(h.at).toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "short", timeStyle: "short" })}</span>
                    <span className="text-slate-300">
                      {h.from ? <><span className="text-slate-500">{h.from}</span> → </> : null}
                      <span className="font-bold text-white">{h.to}</span>
                      {h.note && <span className="text-slate-500 ml-2">— {h.note}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </FlatSection>
        )}
      </div>
    </div>
  );
}

/* ── Status transition buttons ─────────────────────────────────────── */
function StatusActions({
  status, busy, onChange,
}: {
  status: ApplicantStatus;
  busy: boolean;
  onChange: (s: ApplicantStatus) => void;
}) {
  // Available actions per current status
  const actions: { label: string; to: ApplicantStatus; tone: "emerald" | "amber" | "red" | "purple" | "blue" }[] = [];

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
        <button key={a.to + a.label} type="button" onClick={() => onChange(a.to)} disabled={busy}
          className={`rounded-lg border-2 px-4 py-2 text-xs font-black uppercase tracking-wider transition disabled:opacity-50 cursor-pointer ${toneClass[a.tone]}`}>
          {a.label}
        </button>
      ))}
    </div>
  );
}

/* ── Flat distinct card panel — looks like a section, not a drop-down ── */
function FlatSection({
  title, progress, accent = "amber", children,
}: {
  title: string;
  progress?: { done: number; total: number; pct: number };
  accent?: "amber" | "purple" | "emerald" | "slate";
  children: React.ReactNode;
}) {
  const accentColors: Record<string, { bar: string; text: string }> = {
    amber: { bar: "bg-[#f0b429]", text: "text-[#f0b429]" },
    purple: { bar: "bg-purple-500", text: "text-purple-300" },
    emerald: { bar: "bg-emerald-500", text: "text-emerald-300" },
    slate: { bar: "bg-slate-400", text: "text-slate-400" },
  };
  const c = accentColors[accent];

  return (
    <div className="my-6 mx-6 rounded-xl border-2 border-white/10 bg-[#040d1a] overflow-hidden">
      <div className={`${c.bar} h-1`} />
      <div className="px-6 py-4 bg-[#071428] border-b-2 border-white/10 flex items-center gap-3">
        <span className={`flex-1 font-black text-base uppercase tracking-[0.16em] ${c.text}`}>{title}</span>
        {progress && (
          <span className="flex items-center gap-3">
            <span className="hidden sm:block w-32 h-2 rounded-full bg-white/10 overflow-hidden">
              <span className={`block h-full ${c.bar} transition-all`} style={{ width: `${progress.pct}%` }} />
            </span>
            <span className="text-sm font-mono font-black text-white tabular-nums">{progress.done}/{progress.total}</span>
          </span>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

/* ── Interview Checklist ─────────────────────────────────────────── */
function InterviewChecklist({
  workflow, busy, onSave,
}: {
  workflow: ApplicantWorkflow;
  busy: boolean;
  onSave: (patch: Partial<InterviewData>) => void;
}) {
  const i = workflow.interview;
  const [local, setLocal] = useState<InterviewData>(i);
  function update(patch: Partial<InterviewData>) {
    const next = { ...local, ...patch };
    setLocal(next);
  }
  function save(patch: Partial<InterviewData>) {
    update(patch);
    onSave(patch);
  }
  return (
    <div className="px-6 py-5 space-y-5">
      <div className="rounded-lg border border-white/10 bg-[#040d1a]/40 p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={!!local.contacted} onChange={(e) => save({ contacted: e.target.checked, contactedAt: e.target.checked && !local.contactedAt ? new Date().toISOString() : local.contactedAt })}
            disabled={busy} className="mt-1 accent-[#f0b429] w-5 h-5 shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-bold text-white">Contacted applicant</div>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <Input label="Date contacted" type="date" value={local.contactedAt?.slice(0, 10) ?? ""} onBlur={(v) => save({ contactedAt: v ? new Date(v).toISOString() : "" })} disabled={busy} />
              <TextArea label="Notes" value={local.contactedNotes ?? ""} onBlur={(v) => save({ contactedNotes: v })} disabled={busy} rows={2} />
            </div>
          </div>
        </label>
      </div>

      <div className="rounded-lg border border-white/10 bg-[#040d1a]/40 p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={!!local.attemptedContact} onChange={(e) => save({ attemptedContact: e.target.checked, attemptedContactAt: e.target.checked && !local.attemptedContactAt ? new Date().toISOString() : local.attemptedContactAt })}
            disabled={busy} className="mt-1 accent-[#f0b429] w-5 h-5 shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-bold text-white">Attempted contact (no response)</div>
            <div className="grid sm:grid-cols-1 gap-3 mt-3 max-w-xs">
              <Input label="Date" type="date" value={local.attemptedContactAt?.slice(0, 10) ?? ""} onBlur={(v) => save({ attemptedContactAt: v ? new Date(v).toISOString() : "" })} disabled={busy} />
            </div>
          </div>
        </label>
      </div>

      <div className="rounded-lg border-2 border-[#f0b429]/30 bg-[#f0b429]/[0.04] p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={!!local.scheduled} onChange={(e) => save({ scheduled: e.target.checked })}
            disabled={busy} className="mt-1 accent-[#f0b429] w-5 h-5 shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-bold text-white">Interview scheduled</div>
            <div className="text-xs text-amber-300 mt-1">When marked complete, an email is sent to the hiring team.</div>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <Input label="Date / time" type="datetime-local" value={local.scheduledAt ? local.scheduledAt.slice(0, 16) : ""} onBlur={(v) => save({ scheduledAt: v ? new Date(v).toISOString() : "" })} disabled={busy} />
              <Input label="Location or virtual link" value={local.location ?? ""} onBlur={(v) => save({ location: v })} disabled={busy} placeholder="e.g., Station 1 conference room, or Zoom link" />
              <TextArea label="Notes" value={local.notes ?? ""} onBlur={(v) => save({ notes: v })} disabled={busy} rows={2} wide />
            </div>
            {workflow.interviewEmailSentAt && (
              <div className="mt-3 text-xs text-emerald-400 font-bold">✓ Email sent {new Date(workflow.interviewEmailSentAt).toLocaleString("en-US", { timeZone: "America/Chicago" })} CT</div>
            )}
          </div>
        </label>
      </div>

      <div className="rounded-lg border border-white/10 bg-[#040d1a]/40 p-4">
        <div className="text-sm font-bold text-white mb-3">Interviewers assigned</div>
        <Input label="Names (comma-separated)" value={(local.interviewers ?? []).join(", ")} onBlur={(v) => save({ interviewers: v.split(",").map(s => s.trim()).filter(Boolean) })} disabled={busy} placeholder="e.g., Kenneth James, Jennifer Goetz" />
      </div>
    </div>
  );
}

/* ── Evaluation Form ─────────────────────────────────────────── */
function EvaluationForm({
  workflow, busy, onSave, onDecision,
}: {
  workflow: ApplicantWorkflow;
  busy: boolean;
  onSave: (patch: Partial<EvaluationData>) => void;
  onDecision: (status: ApplicantStatus) => void;
}) {
  const e = workflow.evaluation;
  const [local, setLocal] = useState<EvaluationData>(e);
  function save(patch: Partial<EvaluationData>) {
    setLocal({ ...local, ...patch });
    onSave(patch);
  }
  return (
    <div className="px-6 py-5 space-y-5">
      <div className="grid sm:grid-cols-2 gap-3">
        {EVALUATION_CHECKS.map((c) => (
          <label key={c.key} className="flex items-center gap-3 px-4 py-3 bg-[#040d1a]/60 border border-white/10 rounded-lg cursor-pointer hover:border-[#f0b429]/40">
            <input type="checkbox" checked={!!local[c.key]} onChange={(ev) => save({ [c.key]: ev.target.checked } as Partial<EvaluationData>)} disabled={busy} className="accent-[#f0b429] w-5 h-5 shrink-0" />
            <span className="text-sm text-slate-300">{c.label}</span>
          </label>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4 pt-2">
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Overall rating (1–5)</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => save({ overallRating: n })} disabled={busy}
                className={`w-10 h-10 rounded-lg border-2 font-black text-lg transition ${
                  local.overallRating === n
                    ? "border-[#f0b429] bg-[#f0b429] text-[#040d1a]"
                    : "border-white/15 bg-[#040d1a] text-slate-400 hover:border-[#f0b429]/50"
                }`}>{n}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Recommendation</label>
          <div className="flex flex-wrap gap-2">
            {(["Hire", "Waitlist", "Do Not Hire"] as const).map(r => (
              <button key={r} type="button" onClick={() => save({ recommendation: r })} disabled={busy}
                className={`rounded-lg border-2 px-4 py-2 text-xs font-black uppercase tracking-wider transition ${
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

      <TextArea label="Strengths" value={local.strengths ?? ""} onBlur={(v) => save({ strengths: v })} disabled={busy} rows={3} wide />
      <TextArea label="Concerns" value={local.concerns ?? ""} onBlur={(v) => save({ concerns: v })} disabled={busy} rows={3} wide />
      <Input label="Evaluator name" value={local.evaluatorName ?? ""} onBlur={(v) => save({ evaluatorName: v, evaluatedAt: v && !local.evaluatedAt ? new Date().toISOString() : local.evaluatedAt })} disabled={busy} />

      {/* Post-interview decision buttons */}
      <div className="border-t border-white/10 pt-4 mt-4">
        <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Post-interview decision</div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onDecision("Tentative Hire")} disabled={busy}
            className="rounded-lg border-2 border-emerald-500 bg-emerald-500 px-5 py-3 text-sm font-black uppercase tracking-wider text-white hover:bg-emerald-400 disabled:opacity-50">
            Move to Tentative Hire
          </button>
          <button type="button" onClick={() => onDecision("Waitlisted")} disabled={busy}
            className="rounded-lg border-2 border-amber-500 bg-amber-500/15 px-5 py-3 text-sm font-black uppercase tracking-wider text-amber-300 hover:bg-amber-500/25 disabled:opacity-50">
            Waitlist
          </button>
          <button type="button" onClick={() => onDecision("Denied")} disabled={busy}
            className="rounded-lg border-2 border-red-500 bg-red-500/15 px-5 py-3 text-sm font-black uppercase tracking-wider text-red-300 hover:bg-red-500/25 disabled:opacity-50">
            Deny
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Onboarding Checklist ─────────────────────────────────────────── */
function OnboardingChecklist({
  workflow, busy, onSave, onComplete,
}: {
  workflow: ApplicantWorkflow;
  busy: boolean;
  onSave: (patch: Partial<OnboardingData>) => void;
  onComplete: () => void;
}) {
  const o = workflow.onboarding;
  const [local, setLocal] = useState<OnboardingData>(o);
  function toggle(key: keyof OnboardingData) {
    const next = { ...local, [key]: !local[key] };
    setLocal(next);
    onSave({ [key]: !local[key] } as Partial<OnboardingData>);
  }
  const prog = onboardingProgress(local);
  return (
    <div className="px-6 py-5 space-y-6">
      {ONBOARDING_GROUPS.map((group) => (
        <div key={group.title}>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-[#f0b429] mb-3">{group.icon} {group.title}</div>
          <div className="grid sm:grid-cols-2 gap-2">
            {group.items.map((item) => (
              <label key={item.key} className="flex items-center gap-3 px-3 py-2 bg-[#040d1a]/60 border border-white/10 rounded-lg cursor-pointer hover:border-[#f0b429]/40">
                <input type="checkbox" checked={!!local[item.key]} onChange={() => toggle(item.key)} disabled={busy} className="accent-[#f0b429] w-4 h-4 shrink-0" />
                <span className="text-sm text-slate-300">{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {workflow.status !== "Hired" && (
        <div className="border-t border-white/10 pt-4 mt-2">
          <button type="button" onClick={onComplete} disabled={busy || prog.pct < 100}
            className={`w-full rounded-lg border-2 px-5 py-3 text-sm font-black uppercase tracking-wider transition ${
              prog.pct === 100
                ? "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-400"
                : "border-white/15 bg-white/5 text-slate-500 cursor-not-allowed"
            }`}>
            {prog.pct === 100 ? "Mark as Hired" : `Complete ${prog.total - prog.done} more item${(prog.total - prog.done) === 1 ? "" : "s"} to mark as hired`}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Inputs ───────────────────────────────────────────────────────── */
function Input({ label, value, onBlur, disabled, type = "text", placeholder }: {
  label: string;
  value: string;
  onBlur: (val: string) => void;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
}) {
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

function TextArea({ label, value, onBlur, disabled, rows = 3, wide, placeholder }: {
  label: string;
  value: string;
  onBlur: (val: string) => void;
  disabled?: boolean;
  rows?: number;
  wide?: boolean;
  placeholder?: string;
}) {
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
