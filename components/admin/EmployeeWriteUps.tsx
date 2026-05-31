"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface WriteUpRow {
  id: string;
  status: "draft" | "finalized";
  correctiveActionType: string | null;
  issueCategory: string | null;
  dateIssued: string | null;
  finalizedAt: string | null;
  createdAt: string;
  pdfUrl: string | null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[2]}/${m[3]}/${m[1]}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US");
}

export default function EmployeeWriteUps({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [items, setItems] = useState<WriteUpRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/writeups?employeeId=${encodeURIComponent(employeeId)}`, { cache: "no-store" });
      if (!r.ok) { setItems([]); return; }
      const d = await r.json();
      setItems(Array.isArray(d.writeups) ? d.writeups : []);
    } catch {
      setItems([]);
    }
  }, [employeeId]);

  useEffect(() => { load(); }, [load]);

  async function createWriteUp() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/writeups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d?.error ?? "Could not create write-up.");
        return;
      }
      router.push(`/admin/employees/${employeeId}/writeups/${d.writeup.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="writeups" className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={createWriteUp}
          disabled={busy}
          className="bg-[#f0b429] hover:bg-[#fbbf3a] text-[#040d1a] font-black uppercase tracking-wider text-xs px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create Write-Up"}
        </button>
        <span className="text-slate-500 text-xs">
          New corrective-action documentation for this employee
        </span>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-200 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {items === null ? (
        <div className="text-slate-500 text-sm py-2">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-slate-500 text-sm py-2">No write-ups yet.</div>
      ) : (
        <div className="space-y-2">
          {items.map((w) => (
            <Link
              key={w.id}
              href={`/admin/employees/${employeeId}/writeups/${w.id}`}
              className={`block rounded-xl border px-4 py-3 transition hover:border-[#f0b429]/40 ${
                w.status === "finalized"
                  ? "bg-emerald-500/5 border-emerald-500/25"
                  : "bg-amber-500/5 border-amber-500/25"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  w.status === "finalized"
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                }`}>
                  {w.status}
                </span>
                <span className="text-white font-bold">{w.correctiveActionType ?? "(no action type)"}</span>
                {w.issueCategory && <span className="text-slate-400">· {w.issueCategory}</span>}
                <span className="text-slate-500 text-xs ml-auto">
                  {w.dateIssued
                    ? `Issued ${fmtDate(w.dateIssued)}`
                    : `Created ${fmtDate(w.createdAt)}`}
                </span>
              </div>
              {w.pdfUrl && (
                <div className="text-xs text-slate-500 mt-1">
                  PDF on file · finalized {fmtDate(w.finalizedAt)}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
