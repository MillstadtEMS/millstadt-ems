"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Submission { id: string; formType: string; fields: Record<string, string | string[]>; submittedAt: string; readAt: string | null; }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" }) + " CT";
}

function formatKey(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function SubmissionDetail() {
  const { id } = useParams<{ id: string }>();
  const [sub, setSub] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/submissions?id=${id}`)
      .then(r => r.json())
      .then(async (data) => {
        setSub(data);
        setLoading(false);
        // Mark as read
        if (data && !data.readAt) {
          await fetch("/api/admin/submissions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
        }
      })
      .catch(() => setLoading(false));
  }, [id]);

  async function del() {
    if (!confirm("Delete this submission permanently?")) return;
    setDeleting(true);
    await fetch("/api/admin/submissions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    window.location.href = `/admin/submissions?type=${encodeURIComponent(sub?.formType ?? "")}`;
  }

  if (loading) return <div className="text-slate-500 text-sm py-12">Loading…</div>;
  if (!sub) return <div className="text-slate-500 text-sm py-12">Submission not found.</div>;

  const fieldEntries = Object.entries(sub.fields).filter(([k]) => k !== "formType");

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .print-area { display: block !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="max-w-3xl">
        {/* Back nav */}
        <Link href={`/admin/submissions?type=${encodeURIComponent(sub.formType)}`} className="no-print inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-6 transition-colors">
          <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd"/></svg>
          Back to {sub.formType}
        </Link>

        {/* Header */}
        <div className="no-print mb-8">
          <div className="flex items-center gap-3 mb-2"><span className="h-px w-8 bg-[#f0b429]" /><span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">{sub.formType}</span></div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-white">
                {String(sub.fields.first_name ?? sub.fields.name ?? "Submission")} {String(sub.fields.last_name ?? "")}
              </h1>
              <p className="text-slate-400 text-sm mt-1">{fmtDate(sub.submittedAt)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => window.print()} className="no-print flex items-center gap-2 bg-[#071428] border border-white/10 hover:border-white/20 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
                Print / PDF
              </button>
              <button onClick={del} disabled={deleting} className="no-print flex items-center gap-2 border border-red-500/20 hover:bg-red-500/10 text-red-400 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-40">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>

        {/* Printable card */}
        <div className="print-area bg-[#071428] border border-white/10 rounded-2xl overflow-hidden">
          {/* Print-only header */}
          <div className="hidden print:block p-8 border-b border-white/10">
            <div className="text-2xl font-black text-white">Millstadt Ambulance Service</div>
            <div className="text-slate-400 text-sm mt-1">{sub.formType} — {fmtDate(sub.submittedAt)}</div>
          </div>

          <div className="p-8 space-y-6">
            {fieldEntries.map(([key, val]) => {
              const value = Array.isArray(val) ? val.join(", ") : (val || "—");
              const isLong = value.length > 80;
              return (
                <div key={key} className={isLong ? "" : "grid grid-cols-[1fr_2fr] gap-4 items-start"}>
                  <div className="text-slate-400 text-sm font-semibold">{formatKey(key)}</div>
                  <div className={`text-white text-sm leading-relaxed ${isLong ? "mt-2 pl-0" : ""}`}>
                    {value === "—" ? <span className="text-slate-600">—</span> : value}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-8 py-4 border-t border-white/8 flex items-center justify-between">
            <span className="text-slate-600 text-xs">Submission ID: {sub.id}</span>
            <span className="text-slate-600 text-xs">{sub.readAt ? `Read ${new Date(sub.readAt).toLocaleDateString()}` : "Unread"}</span>
          </div>
        </div>
      </div>
    </>
  );
}
