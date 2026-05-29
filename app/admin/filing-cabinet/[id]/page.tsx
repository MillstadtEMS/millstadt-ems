"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  certification: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  dob: string | null;
  hireDate: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  driverLicenseNum: string | null;
  driverLicenseState: string | null;
  ecName: string | null;
  ecRelationship: string | null;
  ecPhone: string | null;
  ec2Name: string | null;
  ec2Relationship: string | null;
  ec2Phone: string | null;
  shirtSize: string | null;
  pantSize: string | null;
  jacketSize: string | null;
  allergies: string | null;
  medicalConditions: string | null;
  bloodType: string | null;
  profileCompletedAt: string | null;
  phoneVerifiedAt: string | null;
  isAdmin: boolean;
  isActive: boolean;
}

interface CertType { id: string; name: string; slug: string; requiresExpiration: boolean }
interface EmpCert {
  id: string;
  certTypeId: string;
  certTypeName: string;
  fileUrl: string | null;
  fileName: string | null;
  issuedOn: string | null;
  expiresOn: string | null;
  daysLeft: number | null;
  status: string;
}

export default function FilingCabinetEmployeePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [me, setMe] = useState<{ isAdmin: boolean } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [certs, setCerts] = useState<EmpCert[]>([]);
  const [certTypes, setCertTypes] = useState<CertType[]>([]);
  const [loading, setLoading] = useState(true);

  // Add-cert modal
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    fetch("/api/lounge/me").then(async (r) => {
      if (!r.ok) { router.push("/lounge/login"); return; }
      const d = await r.json();
      if (!d.employee?.isAdmin) { router.push("/lounge"); return; }
      setMe(d.employee);
    });
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, co, ct] = await Promise.all([
      fetch(`/api/admin/employees/${id}`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/admin/employees/${id}/certs-overview`).then((r) => r.ok ? r.json() : null),
      fetch("/api/admin/cert-types").then((r) => r.ok ? r.json() : null),
    ]);
    if (p?.employee) setProfile(p.employee);
    if (co?.certs) setCerts(co.certs);
    if (ct?.certTypes) setCertTypes(ct.certTypes);
    setLoading(false);
  }, [id]);

  useEffect(() => { if (me) load(); }, [me, load]);

  if (!me) return <p style={{ color: "#94a3b8", padding: 22 }}>Loading…</p>;
  if (loading || !profile) return <p style={{ color: "#94a3b8", padding: 22 }}>Loading file…</p>;

  return (
    <div>
      <header style={{ marginBottom: 18 }}>
        <Link href="/admin/filing-cabinet" style={{ color: "#94a3b8", fontSize: 12, textDecoration: "none", letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700 }}>
          ← Filing Cabinet
        </Link>
        <h1 style={{ margin: "8px 0 0", fontSize: "1.85rem", fontWeight: 900 }}>
          {profile.firstName} {profile.lastName}
        </h1>
        <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
          @{profile.username}{profile.certification ? ` · ${profile.certification}` : ""}{profile.position ? ` · ${profile.position}` : ""}
          {profile.isAdmin && <span style={{ marginLeft: 10, color: "#f0b429", fontWeight: 800 }}>Admin</span>}
          {!profile.isActive && <span style={{ marginLeft: 10, color: "#fca5a5", fontWeight: 800 }}>Inactive</span>}
        </div>
      </header>

      {/* About Me — read-only */}
      <Section title="About Me (employee-supplied — read-only)">
        <ReadGrid>
          <Read label="Email" value={profile.email} />
          <Read label="Phone" value={profile.phone} verified={!!profile.phoneVerifiedAt} />
          <Read label="DOB" value={profile.dob} />
          <Read label="Hire date" value={profile.hireDate} />
          <Read label="Blood type" value={profile.bloodType} />
        </ReadGrid>
        <SubHead>Home address</SubHead>
        <ReadGrid>
          <Read label="Street" value={profile.addressStreet} />
          <Read label="City"   value={profile.addressCity} />
          <Read label="State"  value={profile.addressState} />
          <Read label="ZIP"    value={profile.addressZip} />
        </ReadGrid>
        <SubHead>Driver&apos;s license</SubHead>
        <ReadGrid>
          <Read label="DL number" value={profile.driverLicenseNum} />
          <Read label="DL state"  value={profile.driverLicenseState} />
        </ReadGrid>
        <SubHead>Emergency contact (primary)</SubHead>
        <ReadGrid>
          <Read label="Name"         value={profile.ecName} />
          <Read label="Relationship" value={profile.ecRelationship} />
          <Read label="Phone"        value={profile.ecPhone} />
        </ReadGrid>
        <SubHead>Emergency contact (secondary)</SubHead>
        <ReadGrid>
          <Read label="Name"         value={profile.ec2Name} />
          <Read label="Relationship" value={profile.ec2Relationship} />
          <Read label="Phone"        value={profile.ec2Phone} />
        </ReadGrid>
        <SubHead>Sizes</SubHead>
        <ReadGrid>
          <Read label="Shirt"  value={profile.shirtSize} />
          <Read label="Pants"  value={profile.pantSize} />
          <Read label="Jacket" value={profile.jacketSize} />
        </ReadGrid>
        <SubHead>Medical</SubHead>
        <Read label="Allergies"          value={profile.allergies} />
        <Read label="Medical conditions" value={profile.medicalConditions} />
      </Section>

      {/* Certifications + attachments */}
      <Section
        title={`Certifications & attachments (${certs.length})`}
        action={
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            style={{ background: "#f0b429", color: "#040d1a", border: 0, padding: "8px 14px", borderRadius: 10, fontWeight: 900, fontSize: 12, letterSpacing: "0.10em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}
          >
            + Add cert / file
          </button>
        }
      >
        {certs.length === 0 ? (
          <p style={{ color: "#94a3b8", margin: 0 }}>No certs uploaded yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {certs.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px", background: "#040d1a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, color: "white", fontSize: 14 }}>{c.certTypeName}</div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
                    {c.expiresOn ? `Expires ${c.expiresOn}` : "No expiration"}
                    {c.fileName ? ` · ${c.fileName}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: certColor(c.status), fontSize: 11, fontWeight: 900, letterSpacing: "0.10em", textTransform: "uppercase" }}>
                    {certLabel(c.status, c.daysLeft)}
                  </span>
                  {c.fileUrl && (
                    <a href={c.fileUrl} target="_blank" rel="noreferrer" style={{ color: "#38bdf8", fontSize: 12, fontWeight: 800, textDecoration: "none" }}>Open ↗</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {showAdd && (
        <AddCertModal
          employeeId={profile.id}
          certTypes={certTypes}
          onClose={() => setShowAdd(false)}
          onDone={() => { setShowAdd(false); load(); }}
        />
      )}
    </div>
  );
}

function certColor(s: string) {
  if (s === "expired") return "#fca5a5";
  if (s === "final_7" || s === "30") return "#fdba74";
  if (s === "60" || s === "90" || s === "120") return "#7dd3fc";
  if (s === "good" || s === "no_expiration") return "#86efac";
  return "#94a3b8";
}
function certLabel(s: string, days: number | null) {
  if (s === "expired") return `Expired ${days !== null ? Math.abs(days) + "d ago" : ""}`;
  if (s === "final_7") return days === 0 ? "Expires today" : `Expires in ${days}d`;
  if (s === "no_expiration") return "No expiration";
  if (s === "good") return "Current";
  if (days !== null) return `In ${days}d`;
  return s;
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{ background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "18px 22px 20px", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, color: "white", fontWeight: 900, fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase" }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
function SubHead({ children }: { children: React.ReactNode }) {
  return <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 14, marginBottom: 6 }}>{children}</div>;
}
function ReadGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>{children}</div>;
}
function Read({ label, value, verified }: { label: string; value: string | null; verified?: boolean }) {
  return (
    <div style={{ padding: 10, background: "#040d1a", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
      <div style={{ color: "#64748b", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
        {label}{verified && <span style={{ color: "#86efac", marginLeft: 6 }}>✓</span>}
      </div>
      <div style={{ color: value ? "#e2e8f0" : "#475569", fontSize: 14, marginTop: 4 }}>{value || "—"}</div>
    </div>
  );
}

function AddCertModal({
  employeeId, certTypes, onClose, onDone,
}: {
  employeeId: string;
  certTypes: CertType[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [certTypeId, setCertTypeId] = useState<string>("");
  const [customName, setCustomName] = useState("");
  const [expires, setExpires] = useState<"yes" | "no">("no");
  const [expiresOn, setExpiresOn] = useState("");
  const [issuedOn, setIssuedOn] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selectedType = certTypeId ? certTypes.find((t) => t.id === certTypeId) ?? null : null;
  // If the chosen type already requires expiration, pre-set + lock to yes.
  const expiresLocked = !!selectedType?.requiresExpiration;

  async function submit() {
    setErr(null);
    if (!file) { setErr("Pick a file to attach."); return; }
    if (!certTypeId && !customName.trim()) { setErr("Pick a cert type or enter a custom name."); return; }
    const finalExpires = expiresLocked ? "yes" : expires;
    if (finalExpires === "yes" && !expiresOn) { setErr("Set the expiration date."); return; }
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    if (certTypeId) form.append("certTypeId", certTypeId);
    else form.append("certTypeName", customName.trim());
    form.append("expires", finalExpires);
    if (finalExpires === "yes") form.append("expiresOn", expiresOn);
    if (issuedOn) form.append("issuedOn", issuedOn);

    const r = await fetch(`/api/admin/employees/${employeeId}/certs`, { method: "POST", body: form });
    setBusy(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setErr(d.error || `Upload failed (${r.status})`);
      return;
    }
    onDone();
  }

  return (
    <div role="dialog" aria-modal onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(2,6,12,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#071428", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 18, padding: 22, maxWidth: 520, width: "100%", maxHeight: "88vh", overflowY: "auto", color: "white" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontWeight: 900, fontSize: 16 }}>Add certification / attachment</h3>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: 0, color: "#94a3b8", cursor: "pointer", fontSize: 16 }}>×</button>
        </div>

        <label style={fieldLabel}>Cert type (pick or scroll)</label>
        <select value={certTypeId} onChange={(e) => setCertTypeId(e.target.value)} style={selectStyle} size={6}>
          <option value="">— Custom / add new —</option>
          {certTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.name}{t.requiresExpiration ? " (requires expiration)" : ""}</option>
          ))}
        </select>

        {!certTypeId && (
          <>
            <label style={fieldLabel}>Custom cert type name</label>
            <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Boat Operator License" style={inputStyle} />
          </>
        )}

        <label style={fieldLabel}>Does this cert expire?</label>
        <div style={{ display: "flex", gap: 8 }}>
          <ToggleChip active={(expiresLocked ? "yes" : expires) === "yes"} disabled={expiresLocked} onClick={() => setExpires("yes")}>Yes</ToggleChip>
          <ToggleChip active={(expiresLocked ? "yes" : expires) === "no"}  disabled={expiresLocked} onClick={() => setExpires("no")}>No</ToggleChip>
          {expiresLocked && <span style={{ color: "#94a3b8", fontSize: 11, alignSelf: "center" }}>This type always expires.</span>}
        </div>

        {(expiresLocked || expires === "yes") && (
          <>
            <label style={fieldLabel}>Expiration date</label>
            <input type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} style={inputStyle} />
          </>
        )}

        <label style={fieldLabel}>Issued on (optional)</label>
        <input type="date" value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} style={inputStyle} />

        <label style={fieldLabel}>File (PDF or image, max 15 MB)</label>
        <input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ ...inputStyle, padding: 8 }} />

        {err && <p style={{ color: "#fca5a5", fontSize: 13, marginTop: 10, marginBottom: 0 }}>{err}</p>}

        <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)", color: "#cbd5e1", padding: "10px 16px", borderRadius: 10, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button type="button" onClick={submit} disabled={busy} style={{ background: "#f0b429", color: "#040d1a", border: 0, padding: "10px 18px", borderRadius: 10, fontWeight: 900, fontSize: 12, letterSpacing: "0.10em", textTransform: "uppercase", cursor: busy ? "wait" : "pointer", fontFamily: "inherit" }}>{busy ? "Uploading…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

function ToggleChip({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "8px 16px",
        borderRadius: 999,
        background: active ? "#f0b429" : "rgba(255,255,255,0.05)",
        color: active ? "#040d1a" : "#cbd5e1",
        border: active ? "1px solid #f0b429" : "1px solid rgba(255,255,255,0.10)",
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

const fieldLabel: React.CSSProperties = { display: "block", marginTop: 12, marginBottom: 6, color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", background: "#040d1a", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, color: "white", fontSize: 13, outline: "none", fontFamily: "inherit" };
const selectStyle: React.CSSProperties = { ...inputStyle, paddingRight: 12 };
