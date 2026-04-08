"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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

const TYPE_META: Record<string, { short: string; icon: string; color: string }> = {
  "Birthday Party Appearance Request": { short: "Birthday Appearance", icon: "🎂", color: "text-pink-400 bg-pink-400/10 border-pink-400/20" },
  "Birthday Party at Station Request": { short: "Birthday at Station", icon: "🎉", color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  "Ride Along Request":               { short: "Ride Along",          icon: "🚑", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  "Event Appearance Request":         { short: "Event Appearance",    icon: "📅", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  "Employment Application":           { short: "Employment",          icon: "📋", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
};
function getMeta(t: string) { return TYPE_META[t] ?? { short: t, icon: "📄", color: "text-slate-400 bg-white/5 border-white/10" }; }

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (filterType) {
      fetch(`/api/admin/submissions?type=${encodeURIComponent(filterType)}`)
        .then(r => r.json()).then(d => { setSubmissions(Array.isArray(d) ? d : []); setLoading(false); });
    } else {
      fetch("/api/admin/submissions")
        .then(r => r.json()).then(d => { setCategories(Array.isArray(d) ? d : []); setLoading(false); });
    }
  }, [filterType]);

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
        {loading ? <div className="text-slate-500 text-sm py-12 text-center">Loading…</div> : categories.length === 0 ? (
          <div className="bg-[#071428] border border-white/10 rounded-2xl p-12 text-center">
            <p className="text-slate-500 text-sm">No form submissions yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {categories.map(cat => {
              const m = getMeta(cat.formType);
              return (
                <Link key={cat.formType} href={`/admin/submissions?type=${encodeURIComponent(cat.formType)}`}
                  className="group bg-[#071428] border border-white/10 hover:border-[#f0b429]/30 rounded-2xl p-6 flex items-start gap-4 transition-colors">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border ${m.color}`}>{m.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-bold text-base leading-tight">{m.short}</span>
                      {cat.unread > 0 && <span className="bg-[#f0b429] text-[#020810] text-[10px] font-black px-1.5 py-0.5 rounded-full">{cat.unread}</span>}
                    </div>
                    <div className="text-slate-500 text-xs">{cat.total} total · latest {timeAgo(cat.latest)}</div>
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

      {loading ? <div className="text-slate-500 text-sm py-12 text-center">Loading…</div> : submissions.length === 0 ? (
        <div className="bg-[#071428] border border-white/10 rounded-2xl p-12 text-center">
          <p className="text-slate-500 text-sm">No submissions yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map(sub => (
            <Link key={sub.id} href={`/admin/submissions/${sub.id}`}
              className="group flex items-center gap-4 bg-[#071428] border border-white/10 hover:border-[#f0b429]/30 rounded-2xl px-6 py-5 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-white font-bold text-sm">{nameFromFields(sub.fields)}</span>
                  {!sub.readAt && <span className="w-2 h-2 rounded-full bg-[#f0b429] shrink-0" title="Unread" />}
                </div>
                <div className="text-slate-500 text-xs">{fmtDate(sub.submittedAt)}</div>
              </div>
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-slate-700 group-hover:text-slate-400 transition-colors shrink-0"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
            </Link>
          ))}
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
