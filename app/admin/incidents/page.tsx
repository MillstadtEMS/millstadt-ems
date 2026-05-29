"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface InvolvedEmployee { id: string; name: string }

interface Report {
  id: string;
  createdBy: { id: string; firstName: string; lastName: string };
  reviewStatus: "pending" | "under_review" | "resolved" | "dismissed";
  incidentDate: string | null;
  incidentTime: string | null;
  city: string | null;
  unitInvolved: string | null;
  media: { url: string; kind: string; name?: string }[];
  payload: {
    summary?: string;
    patientInvolved?: string;
    witnesses?: string;
    actionsTaken?: string;
    involvedEmployees?: InvolvedEmployee[];
  };
  pdfUrl?: string | null;
  emailSentAt?: string | null;
  createdAt: string;
}

export default function AdminIncidentsPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<null | boolean>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "under_review" | "resolved">("all");

  useEffect(() => {
    fetch("/api/lounge/me").then(async (r) => {
      if (!r.ok) { router.push("/lounge/login"); return; }
      const d = await r.json();
      if (!d.employee?.isAdmin) { router.push("/lounge"); return; }
      setAuthed(true);
    });
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/lounge/incidents");
    if (r.ok) setReports((await r.json()).reports ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { if (authed) load(); }, [authed, load]);

  if (!authed) return <p style={{ color: "#94a3b8", padding: 22 }}>Loading…</p>;

  const filtered = reports.filter((r) => filter === "all" ? true : r.reviewStatus === filter);

  return (
    <div>
      <header style={{ marginBottom: 18 }}>
        <div style={{ color: "#fca5a5", fontSize: 11, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          Admin · Incidents
        </div>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.85rem", fontWeight: 900 }}>Incident Reports</h1>
        <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
          Every submitted report. PDF is auto-generated, emailed to leadership, and saved to each involved employee&apos;s file.
        </p>
      </header>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {(["all", "pending", "under_review", "resolved"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              background: filter === s ? "#f0b429" : "rgba(255,255,255,0.05)",
              color: filter === s ? "#040d1a" : "#cbd5e1",
              border: filter === s ? "1px solid #f0b429" : "1px solid rgba(255,255,255,0.10)",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? <p style={{ color: "#94a3b8" }}>Loading…</p> : filtered.length === 0 ? (
        <p style={{ color: "#94a3b8" }}>No reports.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((r) => <ReportCard key={r.id} r={r} />)}
        </div>
      )}
    </div>
  );
}

function ReportCard({ r }: { r: Report }) {
  const status = r.reviewStatus;
  const accent = status === "resolved" ? "#86efac" : status === "dismissed" ? "#64748b" : status === "under_review" ? "#7dd3fc" : "#fca5a5";
  const involved = r.payload.involvedEmployees ?? [];
  const photoCount = r.media.filter((m) => m.kind === "image").length;
  return (
    <article style={{ background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderLeft: `4px solid ${accent}`, borderRadius: 14, padding: "14px 18px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div>
          <strong style={{ color: "white", fontSize: 15 }}>
            {r.incidentDate || "—"} {r.incidentTime || ""} · {r.city || "—"} · {r.unitInvolved || "Unit?"}
          </strong>
          <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
            Submitted by {r.createdBy.firstName} {r.createdBy.lastName} · {new Date(r.createdAt).toLocaleString()}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ color: accent, fontSize: 10, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 999, background: `${accent}22`, border: `1px solid ${accent}55` }}>
            {status.replace("_", " ")}
          </span>
          {r.pdfUrl && (
            <a href={r.pdfUrl} target="_blank" rel="noreferrer" style={{ color: "#38bdf8", fontSize: 12, fontWeight: 800, textDecoration: "none" }}>
              PDF ↗
            </a>
          )}
        </div>
      </header>

      {r.payload.summary && (
        <p style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 1.55, marginTop: 10, whiteSpace: "pre-wrap" }}>
          {r.payload.summary}
        </p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12, color: "#94a3b8", fontSize: 12 }}>
        {involved.length > 0 && (
          <span>
            <strong style={{ color: "#cbd5e1" }}>Involved:</strong>{" "}
            {involved.map((e, i) => (
              <span key={e.id}>
                <Link href={`/admin/filing-cabinet/${e.id}`} style={{ color: "#f0b429", textDecoration: "none" }}>{e.name}</Link>
                {i < involved.length - 1 ? ", " : ""}
              </span>
            ))}
          </span>
        )}
        <span>· {photoCount} photo{photoCount === 1 ? "" : "s"}</span>
        <span>· Email {r.emailSentAt ? `sent ${new Date(r.emailSentAt).toLocaleString()}` : "pending"}</span>
      </div>
    </article>
  );
}
