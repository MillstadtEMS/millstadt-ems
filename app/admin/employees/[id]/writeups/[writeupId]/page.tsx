"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import WriteUpEditor, { type WriteUpDto } from "@/components/admin/WriteUpEditor";

interface AuditEntry {
  id: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  details: string | null;
  createdAt: string;
}

export default function WriteUpEditorPage() {
  const { id, writeupId } = useParams<{ id: string; writeupId: string }>();
  const router = useRouter();
  const [writeup, setWriteup] = useState<WriteUpDto | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const meRes = await fetch("/api/lounge/me");
      if (!meRes.ok) { router.push("/lounge/login"); return; }
      const meData = await meRes.json();
      if (!meData.employee?.isAdmin) { router.push("/lounge"); return; }

      const r = await fetch(`/api/admin/writeups/${writeupId}`, { cache: "no-store" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d?.error ?? "Could not load this write-up.");
        return;
      }
      const d = await r.json();
      setWriteup(d.writeup);
      setAudit(Array.isArray(d.audit) ? d.audit : []);
    } catch {
      setError("Connection error.");
    }
  }, [writeupId, router]);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#040d1a] text-slate-100 p-8">
        <p className="text-red-300">{error}</p>
        <Link href={`/admin/employees/${id}#writeups`} className="text-[#f0b429] underline mt-4 inline-block">← Back to employee</Link>
      </div>
    );
  }
  if (!writeup) {
    return <div className="min-h-screen bg-[#040d1a] text-slate-400 p-8">Loading write-up…</div>;
  }

  return (
    <div className="min-h-screen bg-[#040d1a] text-slate-100" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
      <header className="border-b border-white/10 bg-[#071428]/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center gap-4">
          <Link href={`/admin/employees/${id}#writeups`} className="text-slate-400 hover:text-slate-200 text-sm">
            ← {writeup.employeeFullName || "Employee"}
          </Link>
          <div className="ml-auto text-xs uppercase tracking-[0.18em] text-slate-500">
            {writeup.status === "finalized" ? "Finalized · locked" : "Draft"}
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-5 pb-4">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f0b429]">Corrective Action</div>
          <h1 className="text-2xl font-black text-white mt-1">Employee Write-Up</h1>
          <p className="text-slate-400 text-sm mt-1">
            For <span className="text-slate-200 font-semibold">{writeup.employeeFullName}</span>
            {writeup.dateIssued && <> · Date issued {writeup.dateIssued}</>}
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-6">
        <WriteUpEditor initial={writeup} audit={audit} />
      </main>
    </div>
  );
}
