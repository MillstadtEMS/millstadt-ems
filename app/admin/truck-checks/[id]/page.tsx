import Link from "next/link";
import { notFound } from "next/navigation";
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
    attendant1Signature?: string;
    attendant2Signature?: string;
    odometer?: string;
    fuelLevel?: string;
    mainO2Psi?: string;
    portableO2Psi?: string;
    notes?: string;
    checklist?: Record<string, "OK" | "ISSUE" | "NA">;
  };
  submitted_at: string;
};

export default async function TruckCheckDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = sql();
  const rows = (await db`
    SELECT id, fields, submitted_at
    FROM form_submissions
    WHERE form_type = 'truck_check' AND id = ${id}
    LIMIT 1
  `) as unknown as Row[];
  if (rows.length === 0) notFound();
  const row = rows[0];
  const f = row.fields || {};
  const checklist = f.checklist || {};
  const when = new Date(row.submitted_at).toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });

  const issues = Object.entries(checklist).filter(([, v]) => v === "ISSUE");
  const naItems = Object.entries(checklist).filter(([, v]) => v === "NA");
  const okItems = Object.entries(checklist).filter(([, v]) => v === "OK");

  return (
    <main className="min-h-screen bg-[#040d1a] py-10">
      <div className="wrap max-w-3xl">
        <Link href="/admin/truck-checks" className="text-[#f0b429] text-xs font-black uppercase tracking-widest">← All Truck Checks</Link>
        <h1 className="text-3xl font-black text-white mt-3">
          Truck {f.truckNumber || "—"}
        </h1>
        <div className="text-slate-400 text-sm mt-1">{when}</div>

        {/* Crew */}
        <section className="mt-8 p-6 rounded-2xl bg-[#071428] border border-white/8">
          <h2 className="text-white font-black text-lg mb-4">Crew</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-[#f0b429] font-black text-xs uppercase tracking-widest mb-1">Attendant 1</dt>
              <dd className="text-white text-base">{f.attendant1Name || "—"}</dd>
            </div>
            <div>
              <dt className="text-[#f0b429] font-black text-xs uppercase tracking-widest mb-1">Attendant 2</dt>
              <dd className="text-white text-base">{f.attendant2Name || "—"}</dd>
            </div>
          </dl>
        </section>

        {/* Readings */}
        <section className="mt-6 p-6 rounded-2xl bg-[#071428] border border-white/8">
          <h2 className="text-white font-black text-lg mb-4">Readings</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <Reading label="Odometer" value={f.odometer} />
            <Reading label="Fuel" value={f.fuelLevel} />
            <Reading label="Main O₂" value={f.mainO2Psi ? `${f.mainO2Psi} psi` : ""} />
            <Reading label="Portable O₂" value={f.portableO2Psi ? `${f.portableO2Psi} psi` : ""} />
          </dl>
        </section>

        {/* Issues first */}
        {issues.length > 0 && (
          <section className="mt-6 p-6 rounded-2xl bg-red-950/30 border border-red-500/40">
            <h2 className="text-red-300 font-black text-lg mb-4">⚠ Issues ({issues.length})</h2>
            <ul className="space-y-2">
              {issues.map(([item]) => (
                <li key={item} className="text-white text-base">{item}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Notes */}
        {f.notes && (
          <section className="mt-6 p-6 rounded-2xl bg-[#071428] border border-white/8">
            <h2 className="text-white font-black text-lg mb-3">Notes</h2>
            <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{f.notes}</p>
          </section>
        )}

        {/* Full checklist summary */}
        <section className="mt-6 p-6 rounded-2xl bg-[#071428] border border-white/8">
          <h2 className="text-white font-black text-lg mb-4">Checklist Summary</h2>
          <div className="grid sm:grid-cols-3 gap-3 text-xs">
            <span className="px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-black uppercase tracking-wider text-center">{okItems.length} OK</span>
            <span className="px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/40 text-red-300 font-black uppercase tracking-wider text-center">{issues.length} Issues</span>
            <span className="px-3 py-2 rounded-lg bg-slate-500/15 border border-slate-500/40 text-slate-300 font-black uppercase tracking-wider text-center">{naItems.length} N/A</span>
          </div>
        </section>

        {/* Signatures */}
        <section className="mt-6 p-6 rounded-2xl bg-[#071428] border border-white/8">
          <h2 className="text-white font-black text-lg mb-4">Signatures</h2>
          <div className="grid gap-6">
            <SignatureBlock label="Attendant 1" name={f.attendant1Name} dataUrl={f.attendant1Signature} />
            {f.attendant2Name && (
              <SignatureBlock label="Attendant 2" name={f.attendant2Name} dataUrl={f.attendant2Signature} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Reading({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-[#f0b429] font-black text-xs uppercase tracking-widest mb-1">{label}</dt>
      <dd className="text-white text-base">{value || "—"}</dd>
    </div>
  );
}

function SignatureBlock({ label, name, dataUrl }: { label: string; name?: string; dataUrl?: string }) {
  return (
    <div>
      <div className="text-[#f0b429] font-black text-xs uppercase tracking-widest mb-2">{label} {name ? `— ${name}` : ""}</div>
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt={`${label} signature`} className="rounded-xl bg-white border border-white/15" style={{ maxWidth: "100%", display: "block" }} />
      ) : (
        <div className="text-slate-500 italic text-sm">— no signature —</div>
      )}
    </div>
  );
}
