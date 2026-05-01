"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { buildApplicationFlags } from "@/lib/application-flags";
import type { ApplicantStatus } from "@/lib/applicant-workflow";

interface Submission {
  id: string;
  formType: string;
  fields: Record<string, string | string[]>;
  submittedAt: string;
  readAt: string | null;
}

interface WorkflowSummary { status: ApplicantStatus; updatedAt: string }

const STATUSES: { key: ApplicantStatus; label: string; description: string; tone: string }[] = [
  { key: "Applied",            label: "New Applications",   description: "Awaiting initial review", tone: "sky" },
  { key: "Waitlisted",         label: "Waitlisted",         description: "Held for future consideration", tone: "amber" },
  { key: "Interview Process",  label: "Interviewing",       description: "Active interview process", tone: "purple" },
  { key: "Tentative Hire",     label: "Tentative Hires",    description: "Working through onboarding", tone: "emerald" },
  { key: "Hired",              label: "Hired",              description: "Onboarding complete", tone: "emerald-bright" },
  { key: "Denied",             label: "Denied",             description: "Not moving forward", tone: "red" },
];

const TONE_STYLES: Record<string, { card: string; text: string; bar: string; activeRing: string }> = {
  sky:             { card: "border-sky-500/30 bg-sky-500/[0.04]",        text: "text-sky-300",     bar: "bg-sky-500",     activeRing: "ring-sky-500" },
  amber:           { card: "border-amber-500/30 bg-amber-500/[0.04]",    text: "text-amber-300",   bar: "bg-amber-500",   activeRing: "ring-amber-500" },
  purple:          { card: "border-purple-500/30 bg-purple-500/[0.04]",  text: "text-purple-300",  bar: "bg-purple-500",  activeRing: "ring-purple-500" },
  emerald:         { card: "border-emerald-500/30 bg-emerald-500/[0.04]",text: "text-emerald-300", bar: "bg-emerald-500", activeRing: "ring-emerald-500" },
  "emerald-bright":{ card: "border-emerald-400 bg-emerald-500/[0.08]",   text: "text-emerald-200", bar: "bg-emerald-400", activeRing: "ring-emerald-400" },
  red:             { card: "border-red-500/30 bg-red-500/[0.04]",        text: "text-red-300",     bar: "bg-red-500",     activeRing: "ring-red-500" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 30) return `${d}d ago`;
  return fmtDate(iso);
}

function nameOf(fields: Record<string, string | string[]>) {
  const first = String(fields.first_name ?? "");
  const last = String(fields.last_name ?? "");
  return [first, last].filter(Boolean).join(" ") || "Applicant";
}

function ApplicantsContent() {
  const params = useSearchParams();
  const router = useRouter();
  const activeStatus = (params.get("status") ?? "Applied") as ApplicantStatus;

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [workflowMap, setWorkflowMap] = useState<Record<string, WorkflowSummary>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/admin/submissions?type=${encodeURIComponent("Employment Application")}`).then(r => r.json()),
      fetch("/api/admin/applicants").then(r => r.json()),
    ]).then(([subs, wf]) => {
      setSubmissions(Array.isArray(subs) ? subs : []);
      setWorkflowMap(wf?.byId ?? {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Live counts by status (treat missing workflow as "Applied")
  const counts = useMemo(() => {
    const c: Record<ApplicantStatus, number> = {
      Applied: 0, Waitlisted: 0, "Interview Process": 0, "Tentative Hire": 0, Hired: 0, Denied: 0,
    };
    for (const sub of submissions) {
      const status = (workflowMap[sub.id]?.status ?? "Applied") as ApplicantStatus;
      c[status] = (c[status] ?? 0) + 1;
    }
    return c;
  }, [submissions, workflowMap]);

  const filtered = useMemo(() => {
    return submissions
      .filter(sub => {
        const s = (workflowMap[sub.id]?.status ?? "Applied") as ApplicantStatus;
        return s === activeStatus;
      })
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [submissions, workflowMap, activeStatus]);

  function setStatus(s: ApplicantStatus) {
    router.push(`/admin/applicants?status=${encodeURIComponent(s)}`);
  }

  const activeMeta = STATUSES.find(s => s.key === activeStatus)!;
  const activeTone = TONE_STYLES[activeMeta.tone];

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="h-px w-8 bg-[#f0b429]" />
          <span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">Hiring Pipeline</span>
        </div>
        <h1 className="text-3xl font-black text-white">Applicants</h1>
        <p className="text-slate-400 text-sm mt-1">
          {submissions.length} total application{submissions.length === 1 ? "" : "s"}.
          Click a status below to view those applicants.
        </p>
      </div>

      {/* Status cards */}
      <div className="mb-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STATUSES.map(s => {
          const tone = TONE_STYLES[s.tone];
          const isActive = activeStatus === s.key;
          const count = counts[s.key];
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setStatus(s.key)}
              className={`text-left rounded-xl border-2 px-4 py-4 transition-all duration-150 cursor-pointer ${
                isActive
                  ? `${tone.card} ring-2 ${tone.activeRing} shadow-lg`
                  : `${tone.card} hover:brightness-125`
              }`}>
              <div className={`flex items-center gap-2 mb-2`}>
                <span className={`block w-2 h-2 rounded-full ${tone.bar}`} />
                <span className={`text-[10px] font-black uppercase tracking-[0.12em] ${tone.text}`}>{s.label}</span>
              </div>
              <div className={`text-3xl font-black ${tone.text}`}>{count}</div>
              <div className="text-[10px] text-slate-500 mt-1 leading-tight">{s.description}</div>
            </button>
          );
        })}
      </div>

      {/* Active section header */}
      <div className="mb-5 flex items-center gap-3">
        <span className={`block w-3 h-3 rounded-full ${activeTone.bar}`} />
        <h2 className={`text-xl font-black ${activeTone.text} uppercase tracking-[0.16em]`}>{activeMeta.label}</h2>
        <span className="text-slate-500 text-sm">— {filtered.length} applicant{filtered.length === 1 ? "" : "s"}</span>
      </div>

      {/* Applicant list */}
      {loading ? (
        <div className="text-slate-500 text-sm py-12 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-white/10 bg-[#071428] px-12 py-16 text-center">
          <div className="text-5xl mb-3 opacity-30">∅</div>
          <p className="text-slate-400 font-bold text-base">No applicants in this status.</p>
          <p className="text-slate-600 text-sm mt-1">{activeMeta.description}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(sub => {
            const flagCount = buildApplicationFlags(sub.fields).length;
            const wf = workflowMap[sub.id];
            const position = String(sub.fields.position ?? "Position not specified");
            const phone = String(sub.fields.phone ?? "");
            const email = String(sub.fields.email ?? "");
            const lastUpdated = wf?.updatedAt ? timeAgo(wf.updatedAt) : `Submitted ${timeAgo(sub.submittedAt)}`;

            return (
              <Link key={sub.id} href={`/admin/applicants/${sub.id}`}
                className={`group block rounded-xl border-2 px-5 py-5 transition-colors ${
                  flagCount > 0
                    ? "bg-red-950/15 border-red-500/30 hover:border-red-500/60"
                    : "bg-[#071428] border-white/10 hover:border-[#f0b429]/40"
                }`}>
                <div className="flex items-start gap-4">
                  {/* Avatar circle */}
                  <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-base font-black ${activeTone.text} border-2 ${activeTone.card}`}>
                    {(nameOf(sub.fields)).split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-white font-black text-base">{nameOf(sub.fields)}</span>
                      {!sub.readAt && <span className="w-2 h-2 rounded-full bg-[#f0b429]" title="Unread" />}
                      {flagCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-300">
                          <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
                          {flagCount} Flag{flagCount === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-300 font-bold mb-1">{position}</div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      {phone && <span className="font-mono">{phone}</span>}
                      {email && <><span className="text-slate-700">•</span><span className="truncate max-w-xs">{email}</span></>}
                      <span className="text-slate-700">•</span>
                      <span>{lastUpdated}</span>
                    </div>
                  </div>
                  {/* Action arrow */}
                  <div className="shrink-0 text-slate-500 group-hover:text-[#f0b429] transition-colors">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ApplicantsPage() {
  return (
    <Suspense fallback={<div className="text-slate-500 text-sm py-12 text-center">Loading…</div>}>
      <ApplicantsContent />
    </Suspense>
  );
}
