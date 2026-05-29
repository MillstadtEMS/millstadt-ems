"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Ack {
  id: string;
  title: string;
  body: string;
  category: string;
  requiresAcknowledgment: boolean;
  createdBy: { firstName: string; lastName: string };
  createdAt: string;
}

interface RosterEntry {
  employeeId: string;
  firstName: string;
  lastName: string;
  certification: string | null;
  viewedAt: string | null;
  acknowledgedAt: string | null;
  signatureDataUrl: string | null;
}

export default function AdminNoticeDetail() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [ack, setAck] = useState<Ack | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [openSig, setOpenSig] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/lounge/me").then(async (r) => {
      if (!r.ok) { router.push("/lounge/login"); return; }
      const d = await r.json();
      if (!d.employee?.isAdmin) { router.push("/lounge"); return; }
    });
  }, [router]);

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/admin/acks/${id}/roster`);
      if (r.ok) {
        const d = await r.json();
        setAck(d.ack);
        setRoster(d.roster ?? []);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <p style={{ color: "#94a3b8", padding: 22 }}>Loading…</p>;
  if (!ack) return <p style={{ color: "#94a3b8", padding: 22 }}>Notice not found.</p>;

  const acked = roster.filter((e) => e.acknowledgedAt);
  const viewed = roster.filter((e) => !e.acknowledgedAt && e.viewedAt);
  const untouched = roster.filter((e) => !e.acknowledgedAt && !e.viewedAt);

  return (
    <div>
      <header style={{ marginBottom: 18 }}>
        <Link href="/lounge/acks?view=admin" style={{ color: "#94a3b8", fontSize: 12, textDecoration: "none", letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700 }}>
          ← All notices
        </Link>
        <h1 style={{ margin: "8px 0 0", fontSize: "1.85rem", fontWeight: 900 }}>{ack.title}</h1>
        <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
          {ack.category} · Posted by {ack.createdBy.firstName} {ack.createdBy.lastName} · {new Date(ack.createdAt).toLocaleString()}
          {ack.requiresAcknowledgment && <span style={{ marginLeft: 10, color: "#fca5a5", fontWeight: 800 }}>Signature required</span>}
        </div>
      </header>

      <section style={cardStyle}>
        <h2 style={cardTitleStyle}>Notice body</h2>
        <p style={{ color: "#e2e8f0", fontSize: 14, lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>{ack.body}</p>
      </section>

      <CountStrip acked={acked.length} viewed={viewed.length} untouched={untouched.length} total={roster.length} />

      <RosterSection title={`Acknowledged (${acked.length})`} accent="#86efac" entries={acked} kind="acked" onOpenSig={setOpenSig} />
      <RosterSection title={`Viewed, not signed (${viewed.length})`} accent="#7dd3fc" entries={viewed} kind="viewed" onOpenSig={setOpenSig} />
      <RosterSection title={`No engagement (${untouched.length})`} accent="#fca5a5" entries={untouched} kind="untouched" onOpenSig={setOpenSig} />

      {openSig && (
        <div role="dialog" aria-modal onClick={() => setOpenSig(null)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(2,6,12,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 22 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 14, padding: 18, maxWidth: 560 }}>
            <div style={{ color: "#475569", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Acknowledgment signature</div>
            <img src={openSig} alt="" style={{ width: "100%", height: "auto", borderRadius: 8, border: "1px solid #cbd5e1" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button type="button" onClick={() => setOpenSig(null)} style={{ background: "#040d1a", color: "white", border: 0, padding: "8px 14px", borderRadius: 8, fontWeight: 800, fontSize: 12, letterSpacing: "0.10em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CountStrip({ acked, viewed, untouched, total }: { acked: number; viewed: number; untouched: number; total: number }) {
  const pct = total > 0 ? Math.round((acked / total) * 100) : 0;
  return (
    <section style={{ ...cardStyle, marginBottom: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
        <Chip label="Total active" value={total} color="#cbd5e1" />
        <Chip label="Acknowledged" value={acked} color="#86efac" />
        <Chip label="Viewed only" value={viewed} color="#7dd3fc" />
        <Chip label="No view yet" value={untouched} color="#fca5a5" />
        <Chip label="Coverage %" value={`${pct}%`} color="#f0b429" />
      </div>
    </section>
  );
}
function Chip({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: "#040d1a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 12 }}>
      <div style={{ color, fontSize: 10, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: "white", fontSize: 24, fontWeight: 900, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function RosterSection({
  title, accent, entries, kind, onOpenSig,
}: {
  title: string; accent: string;
  entries: RosterEntry[];
  kind: "acked" | "viewed" | "untouched";
  onOpenSig: (url: string) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <section style={{ ...cardStyle, marginBottom: 12 }}>
      <h2 style={{ ...cardTitleStyle, color: accent }}>{title}</h2>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
        {entries.map((e) => (
          <li key={e.employeeId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "#040d1a", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <Link href={`/admin/filing-cabinet/${e.employeeId}`} style={{ color: "white", fontWeight: 700, textDecoration: "none" }}>
              {e.firstName} {e.lastName}{e.certification ? <span style={{ color: "#94a3b8", marginLeft: 8, fontWeight: 600 }}>{e.certification}</span> : null}
            </Link>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {kind === "acked" && (
                <>
                  <span style={{ color: "#86efac", fontSize: 12 }}>{new Date(e.acknowledgedAt!).toLocaleString()}</span>
                  {e.signatureDataUrl && (
                    <button type="button" onClick={() => onOpenSig(e.signatureDataUrl!)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)", color: "#38bdf8", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                      View signature
                    </button>
                  )}
                </>
              )}
              {kind === "viewed" && (
                <span style={{ color: "#7dd3fc", fontSize: 12 }}>Viewed {new Date(e.viewedAt!).toLocaleString()}</span>
              )}
              {kind === "untouched" && <span style={{ color: "#fca5a5", fontSize: 12 }}>Never opened</span>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#071428",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 14,
  padding: "16px 18px",
  marginBottom: 14,
};
const cardTitleStyle: React.CSSProperties = {
  margin: "0 0 10px",
  color: "white",
  fontWeight: 900,
  fontSize: 13,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
};
