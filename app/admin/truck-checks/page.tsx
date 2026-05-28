import Link from "next/link";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return neon(url);
}

type Row = {
  id: string;
  fields: {
    truckNumber?: string;
    attendant1Name?: string;
    attendant2Name?: string;
    notes?: string;
    checklist?: Record<string, "OK" | "ISSUE" | "NA">;
  };
  submitted_at: string;
  read_at: string | null;
};

export default async function TruckChecksPage() {
  const db = sql();
  const rows = (await db`
    SELECT id, fields, submitted_at, read_at
    FROM form_submissions
    WHERE form_type = 'truck_check'
    ORDER BY submitted_at DESC
    LIMIT 200
  `) as unknown as Row[];

  return (
    <main className="min-h-screen bg-[#040d1a] py-10">
      <div className="wrap">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-[#f0b429] text-xs font-black uppercase tracking-widest">← Admin</Link>
            <h1 className="text-3xl font-black text-white mt-2">Truck Checks</h1>
          </div>
          <div className="text-slate-400 text-sm">{rows.length} submission{rows.length === 1 ? "" : "s"}</div>
        </div>

        {rows.length === 0 ? (
          <div className="p-10 rounded-2xl bg-[#071428] border border-white/8 text-center text-slate-400">
            No truck checks submitted yet.
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden border border-white/8 bg-[#071428]">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-slate-400 uppercase tracking-wider text-xs">
                <tr>
                  <th className="text-left px-5 py-3 font-black">When</th>
                  <th className="text-left px-5 py-3 font-black">Truck</th>
                  <th className="text-left px-5 py-3 font-black">Attendants</th>
                  <th className="text-left px-5 py-3 font-black">Issues</th>
                  <th className="text-left px-5 py-3 font-black"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const f = r.fields || {};
                  const checklist = f.checklist || {};
                  const issueCount = Object.values(checklist).filter((v) => v === "ISSUE").length;
                  const when = new Date(r.submitted_at).toLocaleString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                    hour: "numeric", minute: "2-digit",
                  });
                  return (
                    <tr key={r.id} className="border-t border-white/5 hover:bg-white/3 transition-colors">
                      <td className="px-5 py-4 text-slate-200 whitespace-nowrap">{when}</td>
                      <td className="px-5 py-4 text-white font-black">{f.truckNumber || "—"}</td>
                      <td className="px-5 py-4 text-slate-300">
                        {f.attendant1Name || "—"}
                        {f.attendant2Name ? <span className="text-slate-500"> + {f.attendant2Name}</span> : null}
                      </td>
                      <td className="px-5 py-4">
                        {issueCount > 0 ? (
                          <span className="inline-block px-3 py-1 rounded-full bg-red-500/15 border border-red-500/40 text-red-300 font-black text-xs">
                            {issueCount} ISSUE{issueCount === 1 ? "" : "S"}
                          </span>
                        ) : (
                          <span className="text-emerald-400 text-xs font-black uppercase tracking-wider">All OK</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link href={`/admin/truck-checks/${r.id}`} className="text-[#f0b429] font-black text-xs uppercase tracking-wider hover:underline">
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
