"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LoungePageHeader from "./LoungePageHeader";

interface CertType {
  id: string;
  name: string;
  slug: string;
  requiresExpiration: boolean;
  isBuiltIn: boolean;
}
interface EmployeeCert {
  id: string;
  certTypeId: string;
  certTypeName: string;
  certTypeSlug: string;
  certRequiresExpiration: boolean;
  fileUrl: string;
  fileName: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
  uploadedAt: string;
  status:
    | "good"
    | "no_expiration"
    | "120"
    | "90"
    | "60"
    | "30"
    | "final_7"
    | "expired";
  daysLeft: number | null;
}
interface StatusRow {
  certType: CertType;
  cert: EmployeeCert | null;
  required: boolean;
}

export default function MyCertsClient() {
  const router = useRouter();
  const [me, setMe] = useState<{ firstName: string } | null>(null);
  const [status, setStatus] = useState<StatusRow[]>([]);
  const [certs, setCerts] = useState<EmployeeCert[]>([]);
  const [allTypes, setAllTypes] = useState<CertType[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  useEffect(() => {
    fetch("/api/lounge/me")
      .then(async (r) => {
        if (!r.ok) { router.push("/lounge/login"); return; }
        const d = await r.json();
        setMe(d.employee);
      })
      .catch(() => router.push("/lounge/login"));
  }, [router]);

  const load = useCallback(async () => {
    const [s, t] = await Promise.all([
      fetch("/api/lounge/certs").then((r) => r.json()),
      fetch("/api/admin/cert-types").then((r) => r.json()),
    ]);
    setStatus(s.status ?? []);
    setCerts(s.certs ?? []);
    setAllTypes(t.certTypes ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { if (me) load(); }, [me, load]);

  async function deleteCert(certId: string, label: string) {
    if (!confirm(`Remove your ${label} upload?`)) return;
    const res = await fetch(`/api/lounge/certs/${certId}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Removed");
      load();
    } else {
      showToast("Could not remove");
    }
  }

  if (!me || loading) {
    return <div style={pageStyle}><p style={{ color: "#94a3b8" }}>Loading…</p></div>;
  }

  // Build the canonical row list: every status row + any cert types not
  // already covered (so employees can add a Vaccination upload even if no
  // class requires it).
  const seenTypeIds = new Set(status.map((r) => r.certType.id));
  const extra: StatusRow[] = allTypes
    .filter((t) => !seenTypeIds.has(t.id))
    .map((t) => ({ certType: t, cert: null, required: false }));
  const rows = [...status, ...extra];

  // Sort: expired first, then expiring soon, then good, then never-uploaded required, then optional.
  rows.sort((a, b) => weight(a) - weight(b));

  // Group by status — required+missing first, then expiring, then good.
  const requiredMissing = rows.filter((r) => r.required && !r.cert);
  const everythingElse  = rows.filter((r) => !(r.required && !r.cert));

  return (
    <div>
      <LoungePageHeader
        kicker="My Certifications"
        title="Track your certifications"
        description={
          <>
            Add each card you carry — driver&apos;s license, EMS licensure, ACLS, BLS, PALS, ITLS,
            NIMS, vaccinations, exemptions — and snap a photo of the front. Cards required for
            your role show a blue badge so you know which ones are mandatory, and the system
            reminds you 120 days before any of them expire.
          </>
        }
        photo="/lounge/brand/skills-demo.jpg"
        photoPosition="center 35%"
      />

      {requiredMissing.length > 0 && (
        <section style={{ marginBottom: 18, padding: "14px 16px", background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.25)", borderLeft: "4px solid #38bdf8", borderRadius: 12 }}>
          <div style={{ color: "#7dd3fc", fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 4 }}>
            Required for your role — not yet uploaded
          </div>
          <div style={{ color: "#e2e8f0", fontSize: 13.5 }}>
            {requiredMissing.map((r) => r.certType.name).join(" · ")}
          </div>
        </section>
      )}

      <section style={{ display: "grid", gap: 10 }}>
        {everythingElse.length === 0 && requiredMissing.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: 13 }}>No cert types defined yet — ask leadership.</p>
        ) : (
          [...requiredMissing, ...everythingElse].map((row) => (
            <CertRow
              key={row.certType.id}
              row={row}
              existingCerts={certs.filter((c) => c.certTypeId === row.certType.id)}
              onUploaded={load}
              onDelete={(id, label) => deleteCert(id, label)}
            />
          ))
        )}
      </section>

      {toast && (
        <div style={toastStyle}>{toast}</div>
      )}
    </div>
  );
}

function weight(row: StatusRow): number {
  if (row.cert?.status === "expired") return 0;
  if (row.cert?.status === "final_7") return 1;
  if (row.cert?.status === "30") return 2;
  if (row.cert?.status === "60") return 3;
  if (row.cert?.status === "90") return 4;
  if (row.cert?.status === "120") return 5;
  if (row.required && !row.cert) return 6;          // required but missing
  if (row.cert) return 7;                           // good
  return 8;                                         // optional, not uploaded
}

function CertRow({
  row,
  existingCerts,
  onUploaded,
  onDelete,
}: {
  row: StatusRow;
  existingCerts: EmployeeCert[];
  onUploaded: () => void;
  onDelete: (id: string, label: string) => void;
}) {
  const { certType, cert, required } = row;
  const [expanded, setExpanded] = useState(false);
  const [issuedOn, setIssuedOn] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (certType.requiresExpiration && !expiresOn) {
      alert(`${certType.name} requires an expiration date — fill it in first.`);
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("certTypeId", certType.id);
    if (issuedOn) fd.append("issuedOn", issuedOn);
    if (expiresOn) fd.append("expiresOn", expiresOn);
    const res = await fetch("/api/lounge/certs", { method: "POST", body: fd });
    const d = await res.json();
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (!res.ok) { alert(d.error || "Upload failed"); return; }
    setExpanded(false);
    setIssuedOn("");
    setExpiresOn("");
    onUploaded();
  }

  const accent = statusColor(cert?.status, required, !!cert);
  const statusLabel = cert ? friendlyStatus(cert) : required ? "REQUIRED — NOT UPLOADED" : "OPTIONAL — NOT UPLOADED";

  return (
    <div
      style={{
        background: "#071428",
        border: `1px solid ${accent.border}`,
        borderLeft: `4px solid ${accent.stripe}`,
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: "1rem", fontWeight: 800 }}>{certType.name}</div>
            {required && (
              <span
                style={{
                  fontSize: "0.55rem",
                  fontWeight: 900,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: "rgba(56,189,248,0.18)",
                  color: "#7dd3fc",
                }}
              >
                Required
              </span>
            )}
          </div>
          <div style={{ color: accent.text, fontSize: "0.82rem", marginTop: 4, fontWeight: 700 }}>
            {statusLabel}
          </div>
          {cert?.expiresOn && (
            <div style={{ color: "#94a3b8", fontSize: "0.78rem", marginTop: 3 }}>
              Expires {new Date(cert.expiresOn).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })}
              {cert.issuedOn && ` · Issued ${new Date(cert.issuedOn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {cert && (
            <a href={cert.fileUrl} target="_blank" rel="noreferrer" style={smallBtn}>View</a>
          )}
          <button onClick={() => setExpanded(!expanded)} style={smallBtn}>
            {cert ? "Replace" : "Upload"}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", display: "grid", gap: 10 }}>
          {certType.requiresExpiration && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <label style={{ display: "grid", gap: 5 }}>
                <span style={fieldLabelStyle}>Issued on (optional)</span>
                <input
                  type="date"
                  value={issuedOn}
                  onChange={(e) => setIssuedOn(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label style={{ display: "grid", gap: 5 }}>
                <span style={fieldLabelStyle}>Expires on <span style={{ color: "#f0b429" }}>*</span></span>
                <input
                  type="date"
                  value={expiresOn}
                  onChange={(e) => setExpiresOn(e.target.value)}
                  style={inputStyle}
                />
              </label>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || (certType.requiresExpiration && !expiresOn)}
            style={{
              ...goldBtn,
              opacity: uploading || (certType.requiresExpiration && !expiresOn) ? 0.5 : 1,
              alignSelf: "flex-start",
            }}
          >
            {uploading ? "Uploading…" : "Choose File & Upload"}
          </button>
          {existingCerts.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ ...fieldLabelStyle, marginBottom: 6 }}>Previous uploads</div>
              <div style={{ display: "grid", gap: 6 }}>
                {existingCerts.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 10px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>
                      {c.fileName ?? "file"} · uploaded {new Date(c.uploadedAt).toLocaleDateString()}
                    </div>
                    <button onClick={() => onDelete(c.id, certType.name)} style={{ ...smallBtn, color: "#fca5a5" }}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function statusColor(
  status: EmployeeCert["status"] | undefined,
  required: boolean,
  hasCert: boolean,
): { stripe: string; border: string; text: string } {
  if (!hasCert && required) {
    return { stripe: "#38bdf8", border: "rgba(56,189,248,0.30)", text: "#7dd3fc" };
  }
  if (!hasCert) {
    return { stripe: "rgba(255,255,255,0.10)", border: "rgba(255,255,255,0.06)", text: "#94a3b8" };
  }
  switch (status) {
    case "expired":   return { stripe: "#ef4444", border: "rgba(239,68,68,0.45)",  text: "#fca5a5" };
    case "final_7":   return { stripe: "#f97316", border: "rgba(249,115,22,0.45)", text: "#fdba74" };
    case "30":        return { stripe: "#f59e0b", border: "rgba(245,158,11,0.40)", text: "#fcd34d" };
    case "60":        return { stripe: "#facc15", border: "rgba(250,204,21,0.35)", text: "#fde68a" };
    case "90":        return { stripe: "#a3e635", border: "rgba(163,230,53,0.30)", text: "#d9f99d" };
    case "120":       return { stripe: "#22d3ee", border: "rgba(34,211,238,0.30)", text: "#a5f3fc" };
    case "no_expiration": return { stripe: "#22c55e", border: "rgba(34,197,94,0.25)",  text: "#86efac" };
    case "good":
    default:          return { stripe: "#22c55e", border: "rgba(34,197,94,0.25)",  text: "#86efac" };
  }
}

function friendlyStatus(c: EmployeeCert): string {
  if (c.status === "no_expiration") return "On file";
  if (c.status === "good") return c.expiresOn ? `Current — ${c.daysLeft} days until renewal` : "On file";
  if (c.status === "expired") return `EXPIRED ${Math.abs(c.daysLeft ?? 0)} days ago — contact management`;
  if (c.status === "final_7") return c.daysLeft === 0 ? "Expires today!" : `Expires in ${c.daysLeft} day${c.daysLeft === 1 ? "" : "s"}`;
  return `Expires in ${c.daysLeft} days`;
}

const pageStyle: React.CSSProperties = {
  padding: "32px 22px 80px",
  minHeight: "100vh",
  background: "#040d1a",
  color: "white",
};
const backLinkStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "0.7rem",
  fontWeight: 800,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  textDecoration: "none",
};
const titleStyle: React.CSSProperties = {
  margin: "16px 0 0",
  fontSize: "1.85rem",
  fontWeight: 900,
  letterSpacing: "-0.01em",
};
const fieldLabelStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "0.7rem",
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};
const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  background: "#040d1a",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 10,
  color: "white",
  fontSize: "0.93rem",
  outline: "none",
  fontFamily: "inherit",
};
const goldBtn: React.CSSProperties = {
  padding: "12px 18px",
  background: "#f0b429",
  color: "#040d1a",
  fontWeight: 900,
  fontSize: "0.78rem",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  borderRadius: 10,
  border: 0,
  cursor: "pointer",
  fontFamily: "inherit",
};
const smallBtn: React.CSSProperties = {
  padding: "8px 12px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "white",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: "0.72rem",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-block",
  fontFamily: "inherit",
};
const toastStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 24,
  left: "50%",
  transform: "translateX(-50%)",
  background: "#071428",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  padding: "10px 16px",
  color: "white",
  fontSize: "0.88rem",
  fontWeight: 700,
  zIndex: 100,
};
