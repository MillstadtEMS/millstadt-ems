"use client";

import { useCallback, useEffect, useState } from "react";
import SignaturePad from "@/components/lounge/SignaturePad";

interface Att {
  id: string;
  fileName: string;
  fileUrl: string;
  fileMime: string | null;
  employeeNotes: string | null;
}
interface RecordOut {
  id: string;
  title: string;
  recordType: string;
  summary: string | null;
  actionTaken: string | null;
  incidentDate: string | null;
  createdAt: string;
  acknowledgmentRequired: boolean;
  acknowledgedAt: string | null;
  employeeResponse: string | null;
  attachments: Att[];
}

const ACK_LANGUAGE =
  "My acknowledgment confirms that I have received and reviewed this document. " +
  "It does not necessarily mean that I agree with the contents.";

export default function MyFileClient() {
  const [records, setRecords] = useState<RecordOut[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/lounge/my-file");
    if (r.ok) {
      const d = await r.json();
      setRecords(d.records ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p style={{ color: "#94a3b8" }}>Loading…</p>;

  const pending = records.filter((r) => r.acknowledgmentRequired && !r.acknowledgedAt);
  const rest = records.filter((r) => !(r.acknowledgmentRequired && !r.acknowledgedAt));

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {records.length === 0 && (
        <div style={{ background: "#071428", border: "1px dashed rgba(255,255,255,0.10)", borderRadius: 14, padding: "20px 22px", color: "#94a3b8" }}>
          Nothing has been shared with you yet.
        </div>
      )}

      {pending.length > 0 && (
        <section>
          <h2 style={{ color: "#fca5a5", margin: "0 0 10px", fontSize: 14, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Awaiting your acknowledgment
          </h2>
          <div style={{ display: "grid", gap: 12 }}>
            {pending.map((r) => <RecordCard key={r.id} record={r} onAcked={load} pending />)}
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section>
          <h2 style={{ color: "white", margin: "0 0 10px", fontSize: 14, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Other documents
          </h2>
          <div style={{ display: "grid", gap: 12 }}>
            {rest.map((r) => <RecordCard key={r.id} record={r} onAcked={load} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function RecordCard({ record, onAcked, pending }: { record: RecordOut; onAcked: () => void; pending?: boolean }) {
  const [showAck, setShowAck] = useState(false);
  const [response, setResponse] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function acknowledge() {
    setSaving(true);
    const r = await fetch(`/api/lounge/my-file/${record.id}/acknowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signature, response }),
    });
    setSaving(false);
    if (r.ok) onAcked();
  }

  return (
    <article style={{
      background: "#071428",
      border: `1px solid ${pending ? "rgba(239,68,68,0.30)" : "rgba(255,255,255,0.06)"}`,
      borderRadius: 14,
      padding: "16px 18px",
    }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0, color: "white", fontWeight: 800, fontSize: 15 }}>{record.title}</h3>
          <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
            {record.recordType}{record.incidentDate ? ` · ${record.incidentDate}` : ""}
          </div>
        </div>
        {record.acknowledgedAt ? (
          <span style={{ background: "rgba(34,197,94,0.10)", color: "#86efac", padding: "4px 10px", borderRadius: 999, fontSize: 10, fontWeight: 900, letterSpacing: "0.10em", textTransform: "uppercase" }}>
            Acknowledged {new Date(record.acknowledgedAt).toLocaleDateString()}
          </span>
        ) : record.acknowledgmentRequired ? (
          <span style={{ background: "rgba(239,68,68,0.10)", color: "#fca5a5", padding: "4px 10px", borderRadius: 999, fontSize: 10, fontWeight: 900, letterSpacing: "0.10em", textTransform: "uppercase" }}>
            Ack required
          </span>
        ) : null}
      </header>

      {record.summary && <p style={{ color: "#e2e8f0", fontSize: 13.5, lineHeight: 1.55, marginTop: 12, marginBottom: 0, whiteSpace: "pre-wrap" }}>{record.summary}</p>}
      {record.actionTaken && (
        <div style={{ marginTop: 10, background: "rgba(240,180,41,0.06)", border: "1px solid rgba(240,180,41,0.18)", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ color: "#f0b429", fontSize: 11, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>Action taken</div>
          <div style={{ color: "#e2e8f0", fontSize: 13.5, whiteSpace: "pre-wrap" }}>{record.actionTaken}</div>
        </div>
      )}

      {record.attachments.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>Attached files</div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
            {record.attachments.map((a) => (
              <li key={a.id}>
                <a href={a.fileUrl} target="_blank" rel="noreferrer" style={{ color: "#38bdf8", textDecoration: "none", fontSize: 13 }}>
                  📎 {a.fileName}
                </a>
                {a.employeeNotes && <span style={{ color: "#94a3b8", fontSize: 12, marginLeft: 8 }}>— {a.employeeNotes}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {record.employeeResponse && (
        <div style={{ marginTop: 12 }}>
          <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>Your response</div>
          <div style={{ color: "#e2e8f0", fontSize: 13, whiteSpace: "pre-wrap" }}>{record.employeeResponse}</div>
        </div>
      )}

      {record.acknowledgmentRequired && !record.acknowledgedAt && (
        <div style={{ marginTop: 14 }}>
          {!showAck ? (
            <button type="button" onClick={() => setShowAck(true)} style={{ background: "#f0b429", color: "#040d1a", border: 0, padding: "10px 16px", borderRadius: 12, fontSize: 12, fontWeight: 900, letterSpacing: "0.10em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}>
              Acknowledge receipt
            </button>
          ) : (
            <div style={{ padding: 14, background: "#040d1a", border: "1px solid rgba(240,180,41,0.20)", borderRadius: 12 }}>
              <p style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.55, marginTop: 0 }}>{ACK_LANGUAGE}</p>
              <label style={{ display: "block", marginTop: 6 }}>
                <span style={{ display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>
                  Response (optional)
                </span>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={3}
                  placeholder="Add a comment if you'd like."
                  style={{ width: "100%", background: "#071428", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, color: "white", padding: "10px 12px", fontSize: 13, outline: "none", fontFamily: "inherit", resize: "vertical", minHeight: 72 }}
                />
              </label>
              <div style={{ marginTop: 12 }}>
                <SignaturePad value={signature} onChange={setSignature} label="Sign to acknowledge" height={140} />
              </div>
              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" onClick={() => { setShowAck(false); setSignature(null); setResponse(""); }} style={{ background: "transparent", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.10)", padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={acknowledge}
                  disabled={saving || !signature}
                  style={{ background: signature ? "#f0b429" : "rgba(240,180,41,0.4)", color: "#040d1a", border: 0, padding: "10px 18px", borderRadius: 10, fontSize: 12, fontWeight: 900, letterSpacing: "0.10em", textTransform: "uppercase", cursor: signature && !saving ? "pointer" : "not-allowed", fontFamily: "inherit" }}
                >
                  {saving ? "Saving…" : "Submit acknowledgment"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
