"use client";

import { useState, useEffect } from "react";

interface Report {
  id: string;
  reportType: string;
  filename: string;
  blobUrl: string;
  createdAt: string;
}

interface AuditEntry {
  id: string;
  itemId: string;
  itemName?: string;
  categoryName?: string;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string;
  createdAt: string;
}

interface Submission {
  id: string;
  submittedBy: string;
  categorySlug: string | null;
  itemsUpdated: number;
  notes: string | null;
  createdAt: string;
}

const REPORT_TYPES = [
  { key: "order", label: "Quantity Needed to Order", icon: "📦", desc: "Items below PAR level that need restocking" },
  { key: "expired", label: "Expired Items", icon: "⚠️", desc: "Items with expired quantities" },
  { key: "general", label: "General Inventory", icon: "📋", desc: "Complete inventory snapshot with all details" },
];

export default function InventoryReportsPage() {
  const [tab, setTab] = useState<"generate" | "saved" | "audit" | "history">("generate");
  const [reports, setReports] = useState<Report[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/inventory/reports");
      if (res.ok) setReports(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function loadAudit() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/inventory/reports?type=audit");
      if (res.ok) setAudit(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function loadSubmissions() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/inventory/reports?type=submissions");
      if (res.ok) setSubmissions(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function generateReport(type: string) {
    setGenerating(type);
    try {
      const res = await fetch("/api/admin/inventory/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType: type }),
      });
      if (res.ok) {
        const data = await res.json();
        setReports(prev => [data.report, ...prev]);
        setTab("saved");
      }
    } catch { /* ignore */ }
    setGenerating(null);
  }

  function groupedReports() {
    const groups: Record<string, Report[]> = {};
    for (const r of reports) {
      const label = REPORT_TYPES.find(t => t.key === r.reportType)?.label ?? r.reportType;
      if (!groups[label]) groups[label] = [];
      groups[label].push(r);
    }
    return groups;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="h-px w-8 bg-[#f0b429]" />
          <span className="text-[#f0b429] text-xs font-black tracking-[0.25em] uppercase">Inventory</span>
        </div>
        <h1 className="text-2xl font-black text-white">Reports & History</h1>
        <p className="text-slate-400 text-sm mt-1">Generate reports, view audit log, and track submissions</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#071428] rounded-xl p-1 w-fit">
        {(["generate", "saved", "audit", "history"] as const).map(t => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              if (t === "audit") loadAudit();
              if (t === "history") loadSubmissions();
              if (t === "saved") loadReports();
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t
                ? "bg-[#f0b429]/15 text-[#f0b429]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {t === "generate" ? "Generate" : t === "saved" ? "Saved Reports" : t === "audit" ? "Audit Log" : "Submissions"}
          </button>
        ))}
      </div>

      {/* Generate tab */}
      {tab === "generate" && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {REPORT_TYPES.map(rt => (
            <div key={rt.key} className="bg-[#071428] border border-white/10 rounded-2xl p-6">
              <div className="text-3xl mb-3">{rt.icon}</div>
              <h3 className="text-white font-bold text-base mb-1">{rt.label}</h3>
              <p className="text-slate-400 text-sm mb-4">{rt.desc}</p>
              <button
                onClick={() => generateReport(rt.key)}
                disabled={generating === rt.key}
                className="w-full py-2.5 bg-[#f0b429] hover:bg-[#d4a127] text-[#040d1a] font-bold text-sm rounded-xl transition-colors disabled:opacity-50"
              >
                {generating === rt.key ? "Generating..." : "Generate PDF"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Saved reports tab - folder style */}
      {tab === "saved" && (
        <div className="space-y-6">
          {Object.entries(groupedReports()).map(([label, rpts]) => (
            <div key={label}>
              <div className="flex items-center gap-2 mb-3">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#f0b429]"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
                <span className="text-white font-bold text-sm">{label}</span>
                <span className="text-slate-500 text-xs">({rpts.length})</span>
              </div>
              <div className="space-y-2">
                {rpts.map(r => (
                  <a
                    key={r.id}
                    href={r.blobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-[#071428] border border-white/8 rounded-xl px-4 py-3 hover:border-[#f0b429]/30 transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-red-400 shrink-0"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 9h-2v4h-2v-4H7v-2h6v2zm3-4V3.5L18.5 9H16z"/></svg>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{r.filename}</div>
                      <div className="text-slate-500 text-xs">{new Date(r.createdAt).toLocaleString()}</div>
                    </div>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-slate-600 shrink-0"><path d="M19 19H5V5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
                  </a>
                ))}
              </div>
            </div>
          ))}
          {reports.length === 0 && (
            <div className="text-center py-12 text-slate-600">No reports generated yet</div>
          )}
        </div>
      )}

      {/* Audit log tab */}
      {tab === "audit" && (
        <div className="bg-[#071428] border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#040d1a]">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 text-xs uppercase">Time</th>
                <th className="text-left px-4 py-3 text-slate-500 text-xs uppercase">Item</th>
                <th className="text-left px-4 py-3 text-slate-500 text-xs uppercase hidden sm:table-cell">Field</th>
                <th className="text-center px-4 py-3 text-slate-500 text-xs uppercase hidden sm:table-cell">Old</th>
                <th className="text-center px-4 py-3 text-slate-500 text-xs uppercase hidden sm:table-cell">New</th>
                <th className="text-left px-4 py-3 text-slate-500 text-xs uppercase">By</th>
              </tr>
            </thead>
            <tbody>
              {audit.map(a => (
                <tr key={a.id} className="border-t border-white/5">
                  <td className="px-4 py-2 text-slate-500 text-xs whitespace-nowrap">{new Date(a.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                  <td className="px-4 py-2 text-white text-xs font-medium">{a.itemName ?? a.itemId.slice(0, 8)}</td>
                  <td className="px-4 py-2 text-slate-400 text-xs hidden sm:table-cell">{a.fieldChanged}</td>
                  <td className="px-4 py-2 text-center text-red-400/60 text-xs hidden sm:table-cell">{a.oldValue ?? "—"}</td>
                  <td className="px-4 py-2 text-center text-emerald-400 text-xs hidden sm:table-cell">{a.newValue ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-500 text-xs">{a.changedBy}</td>
                </tr>
              ))}
              {audit.length === 0 && !loading && (
                <tr><td colSpan={6} className="text-center py-12 text-slate-600">No audit entries yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Submissions tab */}
      {tab === "history" && (
        <div className="space-y-3">
          {submissions.map(s => (
            <div key={s.id} className="bg-[#071428] border border-white/10 rounded-xl px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold text-sm">{s.submittedBy}</span>
                  {s.categorySlug && <span className="text-slate-500 text-xs bg-white/5 px-2 py-0.5 rounded-full">{s.categorySlug}</span>}
                </div>
                <span className="text-slate-500 text-xs">{new Date(s.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-slate-400">{s.itemsUpdated} items updated</span>
                {s.notes && <span className="text-slate-500 truncate">"{s.notes}"</span>}
              </div>
            </div>
          ))}
          {submissions.length === 0 && !loading && (
            <div className="text-center py-12 text-slate-600">No submissions yet</div>
          )}
        </div>
      )}
    </div>
  );
}
