"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { buildApplicationFlags } from "@/lib/application-flags";
import SiteIcon, { type SiteIconName } from "@/components/site/SiteIcon";

interface Category { formType: string; total: number; unread: number; latest: string | null; }
interface Submission { id: string; formType: string; fields: Record<string, string | string[]>; submittedAt: string; readAt: string | null; }

function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
  if (m < 60) return `${m}m ago`; if (h < 24) return `${h}h ago`; return `${d}d ago`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

const TYPE_META: Record<string, { short: string; icon: SiteIconName; color: string }> = {
  "Birthday Party Appearance Request": { short: "Birthday Appearance", icon: "cake", color: "text-pink-300 bg-pink-500/10 border-pink-400/25" },
  "Birthday Party at Station Request": { short: "Birthday at Station", icon: "home", color: "text-purple-300 bg-purple-500/10 border-purple-400/25" },
  "Ride Along Request":               { short: "Ride Along",          icon: "ambulance", color: "text-blue-300 bg-blue-500/10 border-blue-400/25" },
  "Event Appearance Request":         { short: "Event Appearance",    icon: "calendar", color: "text-amber-300 bg-amber-500/10 border-amber-400/25" },
  "Employment Application":           { short: "Employment",          icon: "clipboard", color: "text-emerald-300 bg-emerald-500/10 border-emerald-400/25" },
  "Education Request":                { short: "Education",           icon: "education", color: "text-cyan-300 bg-cyan-500/10 border-cyan-400/25" },
  "Equipment Request":                { short: "Equipment",           icon: "tools", color: "text-orange-300 bg-orange-500/10 border-orange-400/25" },
  "Run Number Request":               { short: "Run Number",          icon: "file", color: "text-rose-300 bg-rose-500/10 border-rose-400/25" },
};
// Always show these categories on the admin index, even when there are 0 submissions
const EXPECTED_TYPES = [
  "Employment Application",
  "Run Number Request",
  "Education Request",
  "Equipment Request",
  "Ride Along Request",
  "Event Appearance Request",
  "Birthday Party Appearance Request",
  "Birthday Party at Station Request",
];
function getMeta(t: string) { return TYPE_META[t] ?? { short: t, icon: "file" as SiteIconName, color: "text-slate-300 bg-white/5 border-white/10" }; }

// First name from fields
function nameFromFields(fields: Record<string, string | string[]>) {
  const first = String(fields.first_name ?? fields.name ?? "");
  const last  = String(fields.last_name ?? "");
  return [first, last].filter(Boolean).join(" ") || "Anonymous";
}

function SubmissionsContent() {
  const params = useSearchParams();
  const filterType = params.get("type");

  const [categories, setCategories] = useState<Category[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [workflowMap, setWorkflowMap] = useState<Record<string, { status: string }>>({});
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (filterType) {
      Promise.all([
        fetch(`/api/admin/submissions?type=${encodeURIComponent(filterType)}`).then(r => r.json()),
        filterType === "Employment Application"
          ? fetch("/api/admin/applicants").then(r => r.json())
          : Promise.resolve({ byId: {}, counts: {} }),
      ]).then(([subs, wfData]) => {
        setSubmissions(Array.isArray(subs) ? subs : []);
        setWorkflowMap(wfData?.byId ?? {});
        setStatusCounts(wfData?.counts ?? {});
        setLoading(false);
      });
    } else {
      fetch("/api/admin/submissions")
        .then(r => r.json()).then(d => { setCategories(Array.isArray(d) ? d : []); setLoading(false); });
    }
  }, [filterType]);

  // Merge actual categories (with submissions) with expected categories (zero state)
  const categoriesByType = new Map(categories.map(c => [c.formType, c]));
  const allCategories: Category[] = [
    ...EXPECTED_TYPES.map(t => categoriesByType.get(t) ?? { formType: t, total: 0, unread: 0, latest: null }),
    // Add any types we got from the DB that aren't in EXPECTED_TYPES (custom/legacy)
    ...categories.filter(c => !EXPECTED_TYPES.includes(c.formType)),
  ];

  const totalUnread = categories.reduce((n, c) => n + c.unread, 0);
  const meta = filterType ? getMeta(filterType) : null;

  // ── Category list ──────────────────────────────────────────────────────────
  if (!filterType) {
    return (
      <div className="max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2"><span className="h-px w-8 bg-[#f0b429]" /><span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">Forms</span></div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black text-white">Form Submissions</h1>
            {totalUnread > 0 && <span className="bg-[#f0b429] text-[#020810] text-xs font-black px-2.5 py-1 rounded-full">{totalUnread} unread</span>}
          </div>
          <p className="text-slate-400 text-sm mt-2">All website form submissions, grouped by type.</p>
        </div>
        {loading ? <div className="text-slate-500 text-sm py-12 text-center">Loading…</div> : (
          <div className="grid sm:grid-cols-2 gap-4">
            {allCategories.map(cat => {
              const m = getMeta(cat.formType);
              const isEmpty = cat.total === 0;
              return (
                <Link key={cat.formType} href={`/admin/submissions?type=${encodeURIComponent(cat.formType)}`}
                  className={`group bg-[#071428] border border-white/10 hover:border-[#f0b429]/30 rounded-2xl p-6 flex items-start gap-4 transition-colors ${isEmpty ? "opacity-60 hover:opacity-100" : ""}`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${m.color}`}>
                    <SiteIcon name={m.icon} className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-bold text-base leading-tight">{m.short}</span>
                      {cat.unread > 0 && <span className="bg-[#f0b429] text-[#020810] text-[10px] font-black px-1.5 py-0.5 rounded-full">{cat.unread}</span>}
                    </div>
                    <div className="text-slate-500 text-xs">
                      {isEmpty ? "No submissions yet" : `${cat.total} total · latest ${timeAgo(cat.latest)}`}
                    </div>
                  </div>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-slate-700 group-hover:text-slate-400 transition-colors shrink-0 mt-1"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Filtered list for one form type ───────────────────────────────────────
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <Link href="/admin/submissions" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-5 transition-colors">
          <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"/></svg>
          All Forms
        </Link>
        <div className="flex items-center gap-3 mb-2"><span className="h-px w-8 bg-[#f0b429]" /><span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">Submissions</span></div>
        <h1 className="text-3xl font-black text-white">{meta!.short}</h1>
        <p className="text-slate-400 text-sm mt-1">{submissions.length} submission{submissions.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Status filter pills (Employment Application only) — counts derived
          from the actual submissions list, treating any submission without
          a workflow record as "Applied" (the default). */}
      {filterType === "Employment Application" && submissions.length > 0 && (() => {
        const livecounts: Record<string, number> = { Applied: 0, Waitlisted: 0, "Interview Process": 0, "Tentative Hire": 0, Hired: 0, Denied: 0 };
        for (const sub of submissions) {
          const status = workflowMap[sub.id]?.status ?? "Applied";
          livecounts[status] = (livecounts[status] ?? 0) + 1;
        }
        return (
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { key: "all", label: "All" },
            { key: "Applied", label: "Applied" },
            { key: "Waitlisted", label: "Waitlisted" },
            { key: "Interview Process", label: "Interview" },
            { key: "Tentative Hire", label: "Tentative Hire" },
            { key: "Hired", label: "Hired" },
            { key: "Denied", label: "Denied" },
          ].map(s => {
            const count = s.key === "all" ? submissions.length : (livecounts[s.key] ?? 0);
            const active = statusFilter === s.key;
            return (
              <button key={s.key} type="button" onClick={() => setStatusFilter(s.key)}
                className={`rounded-lg border-2 px-3 py-1.5 text-xs font-black uppercase tracking-wider transition ${
                  active
                    ? "border-[#f0b429] bg-[#f0b429] text-[#040d1a]"
                    : "border-white/15 bg-[#071428] text-slate-300 hover:border-[#f0b429]/40"
                }`}>
                {s.label} <span className="ml-1 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
        );
      })()}

      {loading ? <div className="text-slate-500 text-sm py-12 text-center">Loading…</div> : submissions.length === 0 ? (
        <div className="bg-[#071428] border border-white/10 rounded-2xl p-12 text-center">
          <p className="text-slate-500 text-sm">No submissions yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions
            .filter((sub) => {
              if (statusFilter === "all" || filterType !== "Employment Application") return true;
              const wfStatus = workflowMap[sub.id]?.status ?? "Applied";
              return wfStatus === statusFilter;
            })
            .map(sub => {
            const flagCount = sub.formType === "Employment Application" ? buildApplicationFlags(sub.fields).length : 0;
            const wfStatus = sub.formType === "Employment Application" ? (workflowMap[sub.id]?.status ?? "Applied") : null;
            return (
            <Link key={sub.id} href={`/admin/submissions/${sub.id}`}
              className={`group flex items-center gap-4 border rounded-2xl px-6 py-5 transition-colors ${
                flagCount > 0
                  ? "bg-red-950/20 border-red-500/40 hover:border-red-500/60"
                  : "bg-[#071428] border-white/10 hover:border-[#f0b429]/30"
              }`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <span className="text-white font-bold text-sm">{nameFromFields(sub.fields)}</span>
                  {!sub.readAt && <span className="w-2 h-2 rounded-full bg-[#f0b429] shrink-0" title="Unread" />}
                  {flagCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-300">
                      <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
                      {flagCount} Flag{flagCount === 1 ? "" : "s"}
                    </span>
                  )}
                  {wfStatus && wfStatus !== "Applied" && (
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                      wfStatus === "Hired" ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-200"
                      : wfStatus === "Tentative Hire" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                      : wfStatus === "Interview Process" ? "bg-purple-500/15 border-purple-500/40 text-purple-300"
                      : wfStatus === "Waitlisted" ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                      : wfStatus === "Denied" ? "bg-red-500/15 border-red-500/40 text-red-300"
                      : "bg-slate-500/15 border-slate-500/40 text-slate-300"
                    }`}>{wfStatus}</span>
                  )}
                </div>
                <div className="text-slate-500 text-xs">{fmtDate(sub.submittedAt)}</div>
              </div>
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-slate-700 group-hover:text-slate-400 transition-colors shrink-0"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SubmissionsPage() {
  return (
    <Suspense fallback={<div className="text-slate-500 text-sm py-12 text-center">Loading…</div>}>
      <SubmissionsContent />
    </Suspense>
  );
}
