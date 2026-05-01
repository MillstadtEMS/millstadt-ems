"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { buildApplicationFlags } from "@/lib/application-flags";

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

  // Open a clean printable window with just the submission content — no admin
  // chrome, no dark theme. Reliable across all browsers.
  function printPdf() {
    if (!sub) return;
    const name = String(sub.fields.first_name ?? sub.fields.name ?? "Submission") + " " + String(sub.fields.last_name ?? "");
    const fieldRows = Object.entries(sub.fields)
      .filter(([k]) => k !== "formType" && k !== "review_flags")
      .map(([key, val]) => {
        const label = formatKey(key);
        const value = Array.isArray(val) ? val.join(", ") : (val || "—");
        const escaped = String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>");
        const labelEsc = label.replace(/&/g, "&amp;").replace(/</g, "&lt;");
        return `<tr><td class="lbl">${labelEsc}</td><td class="val">${escaped}</td></tr>`;
      }).join("");

    const flagSection = flags.length > 0 ? `
      <div class="flag-banner">
        <div class="flag-header">⚠ FLAG FOR REVIEW — ${flags.length} item${flags.length === 1 ? "" : "s"} flagged</div>
        <ul>${flags.map(f => `<li>${String(f).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</li>`).join("")}</ul>
      </div>
    ` : "";

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${name.trim() || "Submission"} — ${sub.formType}</title>
<style>
  @page { margin: 0.5in; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #111; margin: 0; padding: 24px; background: #fff; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .meta { color: #555; font-size: 12px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #c9a93a; }
  .form-type { color: #c9a93a; font-size: 11px; font-weight: 900; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 4px; }
  .flag-banner { border: 2px solid #dc2626; background: #fef2f2; padding: 16px; margin-bottom: 20px; }
  .flag-header { color: #b91c1c; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
  .flag-banner ul { margin: 0; padding-left: 20px; }
  .flag-banner li { color: #7f1d1d; font-size: 12px; line-height: 1.5; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 8px 12px; border-bottom: 1px solid #ddd; vertical-align: top; font-size: 12px; }
  td.lbl { width: 200px; color: #555; font-weight: bold; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
  td.val { color: #111; line-height: 1.5; }
  .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #ccc; color: #777; font-size: 10px; display: flex; justify-content: space-between; }
  @media print { body { padding: 0; } }
</style></head><body>
  <div class="form-type">${sub.formType}</div>
  <h1>${(name.trim() || "Submission").replace(/&/g, "&amp;").replace(/</g, "&lt;")}</h1>
  <div class="meta">${fmtDate(sub.submittedAt)}</div>
  ${flagSection}
  <table><tbody>${fieldRows}</tbody></table>
  <div class="footer">
    <span>Submission ID: ${sub.id}</span>
    <span>Millstadt Ambulance Service</span>
  </div>
  <script>window.onload = () => { window.print(); };</script>
</body></html>`;

    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) {
      alert("Pop-up blocked. Please allow pop-ups for this site to print.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  if (loading) return <div className="text-slate-500 text-sm py-12">Loading…</div>;
  if (!sub) return <div className="text-slate-500 text-sm py-12">Submission not found.</div>;

  const fieldEntries = Object.entries(sub.fields).filter(([k]) => k !== "formType" && k !== "review_flags");
  // Only run flag detection on Employment Application submissions
  const flags = sub.formType === "Employment Application" ? buildApplicationFlags(sub.fields) : [];

  return (
    <>
      {/* Print styles — hide everything except the print-area card.
          Uses visibility (not display) so ancestors stay laid out, and
          repositions the print-area to fill the page. */}
      <style>{`
        @media print {
          @page { margin: 0.5in; }
          body { background: #ffffff !important; color: #000 !important; }
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #000 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .print-area * {
            background: transparent !important;
            color: #000 !important;
            border-color: #ccc !important;
          }
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
              <button onClick={printPdf} className="no-print flex items-center gap-2 bg-[#071428] border border-white/10 hover:border-white/20 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-sm transition-colors">
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

        {/* ── Flag for review banner — prominent at the top ── */}
        {flags.length > 0 && (
          <div className="mb-6 overflow-hidden rounded-2xl border-2 border-red-500/60 bg-red-950/30">
            <div className="flex items-center gap-3 px-6 py-4 bg-red-600 text-white">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current shrink-0"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
              <div className="flex-1">
                <div className="font-black text-base uppercase tracking-wider">Flag for Review</div>
                <div className="text-sm opacity-90">{flags.length} item{flags.length === 1 ? "" : "s"} flagged on this application</div>
              </div>
            </div>
            <ul className="divide-y divide-red-500/20">
              {flags.map((flag, i) => (
                <li key={i} className="flex items-start gap-3 px-6 py-3">
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <span className="text-red-100 text-sm leading-relaxed">{flag}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-red-500/20 bg-red-950/40 px-6 py-3 text-xs text-red-300/80">
              Auto-generated based on the applicant&apos;s answers. Review before scheduling an interview or extending an offer.
            </div>
          </div>
        )}

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
