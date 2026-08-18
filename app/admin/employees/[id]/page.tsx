"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PersonnelRecordsPanel from "@/components/admin/PersonnelRecordsPanel";
import EmployeeChangeRequests from "@/components/admin/EmployeeChangeRequests";
import EmployeeWriteUps from "@/components/admin/EmployeeWriteUps";
import EmployeeForms from "@/components/admin/EmployeeForms";

interface EmpDto {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  certification: string | null;
  position: string | null;
  email: string | null;
  phone: string | null;
  dob: string | null;
  ssnLast4: string | null;
  photoUrl: string | null;
  hireDate: string | null;
  notes: string | null;
  isAdmin: boolean;
  isActive: boolean;
  mustChangePassword: boolean;
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
  emailSecondary: string | null;
  emailSecondaryAlerts: boolean;
  profileCompletedAt: string | null;
}
interface FileDto {
  id: string;
  fileType: "cert" | "license" | "writeup" | "other";
  title: string;
  fileUrl: string;
  notes: string | null;
  expiresOn: string | null;
  uploadedAt: string;
}
interface LoungeClass {
  id: string;
  name: string;
  description: string | null;
}
interface EmpCertDto {
  id: string;
  certTypeId: string;
  certTypeName: string;
  expiresOn: string | null;
  status:
    | "good" | "no_expiration"
    | "120" | "90" | "60" | "30" | "final_7" | "expired";
  daysLeft: number | null;
}

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [me, setMe] = useState<{ id: string; isAdmin: boolean } | null>(null);
  const [emp, setEmp] = useState<EmpDto | null>(null);
  const [files, setFiles] = useState<FileDto[]>([]);
  const [allClasses, setAllClasses] = useState<LoungeClass[]>([]);
  const [empClassIds, setEmpClassIds] = useState<Set<string>>(new Set());
  const [empCerts, setEmpCerts] = useState<EmpCertDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(() => {
    fetch("/api/lounge/me")
      .then(async (r) => {
        if (!r.ok) { router.push("/lounge/login"); return; }
        const data = await r.json();
        if (!data.employee?.isAdmin) { router.push("/lounge"); return; }
        setMe(data.employee);
      })
      .catch(() => router.push("/lounge/login"));
  }, [router]);

  const reload = useCallback(async () => {
    const [er, fr, ec, cls, allcls] = await Promise.all([
      fetch(`/api/admin/employees/${id}`),
      fetch(`/api/admin/employees/${id}/files`),
      fetch(`/api/admin/employees/${id}/certs-overview`),
      fetch(`/api/admin/employees/${id}/classes`),
      fetch(`/api/admin/classes`),
    ]);
    if (er.ok) setEmp((await er.json()).employee);
    if (fr.ok) setFiles((await fr.json()).files);
    if (ec.ok) setEmpCerts((await ec.json()).certs);
    if (cls.ok) setEmpClassIds(new Set(((await cls.json()).classes as LoungeClass[]).map((c) => c.id)));
    if (allcls.ok) setAllClasses((await allcls.json()).classes);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (me) reload();
  }, [me, reload]);

  async function patch(body: Partial<EmpDto> & { ssn?: string | null }) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setEmp(data.employee);
        showToast("Saved");
      } else {
        showToast(data.error || "Save failed");
      }
    } catch {
      showToast("Connection error");
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhoto(file: File) {
    const fd = new FormData();
    fd.append("photo", file);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/employees/${id}/photo`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        setEmp(data.employee);
        showToast("Photo updated");
      } else {
        showToast(data.error || "Upload failed");
      }
    } finally {
      setSaving(false);
    }
  }

  async function deletePhoto() {
    if (!confirm("Remove this employee's photo?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/employees/${id}/photo`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setEmp(data.employee);
        showToast("Photo removed");
      }
    } finally {
      setSaving(false);
    }
  }

  async function saveClasses(nextIds: Set<string>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/employees/${id}/classes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classIds: Array.from(nextIds) }),
      });
      if (res.ok) {
        setEmpClassIds(nextIds);
        showToast("Classes updated");
        // Class change can flip which certs are "required" — refresh cert overview.
        const ec = await fetch(`/api/admin/employees/${id}/certs-overview`);
        if (ec.ok) setEmpCerts((await ec.json()).certs);
      } else {
        showToast("Save failed");
      }
    } finally {
      setSaving(false);
    }
  }

  async function reset2fa() {
    if (!emp) return;
    if (!confirm(
      `Reset 2FA for ${emp.firstName} ${emp.lastName}?\n\n` +
      `This wipes their Microsoft Authenticator enrollment, any SMS code in flight, ` +
      `and any biometric passkeys on their devices. Next time they sign in they'll ` +
      `be walked through the QR-code setup again. Use this if they lost their phone, ` +
      `if you suspect their account was enrolled by someone else, or if they're ` +
      `rotating to a new authenticator.`,
    )) return;
    const res = await fetch(`/api/admin/employees/${id}/reset-2fa`, { method: "POST" });
    if (res.ok) alert("2FA cleared. They'll set it back up on next sign-in.");
    else alert("Reset failed.");
  }

  async function resetPassword() {
    if (!emp) return;
    if (!confirm(
      `Issue a new one-time setup password for ${emp.firstName} (${emp.username})?\n\n` +
      "They must choose a permanent password at the next sign-in. Existing sessions and trusted devices will be revoked; passkeys and authenticator enrollment will be preserved.",
    )) return;
    const res = await fetch(`/api/admin/employees/${id}/reset-password`, {
      method: "POST",
    });
    const data = await res.json();
    if (res.ok) {
      alert(
        `Password reset.\n\nUsername: ${emp.username}\nOne-time setup password: ${data.setupToken}\n\nThis password is shown once and expires in 24 hours. They'll choose a permanent password at the next sign-in.`,
      );
      reload();
    } else {
      alert(data.error || "Reset failed");
    }
  }

  async function deactivate() {
    if (!emp) return;
    if (!confirm(`Deactivate ${emp.firstName} ${emp.lastName}? They won't be able to sign in.`)) return;
    const res = await fetch(`/api/admin/employees/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/employees");
    }
  }

  async function revealSsn() {
    const res = await fetch(`/api/admin/employees/${id}/ssn`);
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Could not reveal SSN");
      return;
    }
    if (!data.ssn) {
      alert("No SSN on file. Use the edit field to add one.");
      return;
    }
    alert(`SSN: ${data.ssn}\n\n(Logged for audit.)`);
  }

  if (loading || !emp) {
    return (
      <div style={pageStyle}>
        <p style={{ color: "#94a3b8" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <Link href="/admin/employees" style={backLinkStyle}>← All Employees</Link>

        {/* ── Header card ── */}
        <section
          style={{
            marginTop: 16,
            background: "#071428",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 18,
            padding: "26px 26px",
            display: "flex",
            gap: 22,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <PhotoBlock
            url={emp.photoUrl}
            initial={emp.firstName[0] + emp.lastName[0]}
            onUpload={uploadPhoto}
            onDelete={deletePhoto}
            disabled={saving}
          />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ margin: 0, fontSize: "1.7rem", fontWeight: 900, letterSpacing: "-0.01em" }}>
                {emp.firstName} {emp.lastName}
              </h1>
              {emp.isAdmin && <Badge color="#f0b429">Admin</Badge>}
              {!emp.isActive && <Badge color="#94a3b8">Inactive</Badge>}
              {emp.mustChangePassword && <Badge color="#38bdf8">Pending First Login</Badge>}
            </div>
            <div style={{ color: "#94a3b8", marginTop: 6, fontSize: "0.92rem" }}>
              {emp.certification || "—"} · @{emp.username}
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
              <Button onClick={resetPassword}>Reset Password</Button>
              <Button onClick={reset2fa}>Reset 2FA</Button>
              <Button onClick={revealSsn}>Reveal SSN</Button>
              {me?.id !== emp.id && (
                <Button danger onClick={deactivate}>
                  {emp.isActive ? "Deactivate" : "Already Inactive"}
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* ── Profile fields ── */}
        <Card title="Profile">
          <FormGrid>
            <InlineField
              label="First name"
              value={emp.firstName}
              onSave={(v) => patch({ firstName: v })}
            />
            <InlineField
              label="Last name"
              value={emp.lastName}
              onSave={(v) => patch({ lastName: v })}
            />
            <InlineField
              label="Certification"
              value={emp.certification ?? ""}
              onSave={(v) => patch({ certification: v || null })}
            />
            <InlineField
              label="Position"
              value={emp.position ?? ""}
              onSave={(v) => patch({ position: v || null })}
            />
            <InlineField
              label="Email"
              type="email"
              value={emp.email ?? ""}
              onSave={(v) => patch({ email: v || null })}
            />
            <InlineField
              label="Phone"
              type="tel"
              value={emp.phone ?? ""}
              onSave={(v) => patch({ phone: v || null })}
            />
            <InlineField
              label="Secondary email"
              type="email"
              value={emp.emailSecondary ?? ""}
              onSave={(v) => patch({ emailSecondary: v || null })}
            />
            <Toggle
              label="Send lounge alerts to secondary email"
              description="Mirror notifications + change-request emails to the secondary inbox above."
              value={emp.emailSecondaryAlerts}
              disabled={!emp.emailSecondary}
              onChange={(v) => patch({ emailSecondaryAlerts: v })}
            />
            <InlineField
              label="Date of birth"
              type="date"
              value={emp.dob ?? ""}
              onSave={(v) => patch({ dob: v || null })}
            />
            <InlineField
              label="Hire date"
              type="date"
              value={emp.hireDate ?? ""}
              onSave={(v) => patch({ hireDate: v || null })}
            />
          </FormGrid>

          <InlineField
            label={`SSN ${emp.ssnLast4 ? `(last 4: ${emp.ssnLast4})` : "(not set)"}`}
            value=""
            placeholder="123-45-6789 — enter to set or update"
            onSave={(v) => patch({ ssn: v || null })}
          />

          <InlineTextarea
            label="Internal notes"
            value={emp.notes ?? ""}
            onSave={(v) => patch({ notes: v || null })}
          />
        </Card>

        {/* ── About Me (employee-fillable; admin can also edit) ── */}
        <Card
          title={`About Me — Personal Info ${emp.profileCompletedAt ? `· last saved ${new Date(emp.profileCompletedAt).toLocaleDateString()}` : "· not filled in yet"}`}
        >
          <SubHeading>Home address</SubHeading>
          <FormGrid>
            <InlineField label="Street" value={emp.addressStreet ?? ""} onSave={(v) => patch({ addressStreet: v || null })} />
            <InlineField label="City"   value={emp.addressCity ?? ""}   onSave={(v) => patch({ addressCity: v || null })} />
            <InlineField label="State"  value={emp.addressState ?? ""}  onSave={(v) => patch({ addressState: v || null })} />
            <InlineField label="ZIP"    value={emp.addressZip ?? ""}    onSave={(v) => patch({ addressZip: v || null })} />
          </FormGrid>

          <SubHeading>Driver&apos;s license</SubHeading>
          <FormGrid>
            <InlineField label="DL number" value={emp.driverLicenseNum ?? ""}   onSave={(v) => patch({ driverLicenseNum: v || null })} />
            <InlineField label="DL state"  value={emp.driverLicenseState ?? ""} onSave={(v) => patch({ driverLicenseState: v || null })} />
          </FormGrid>

          <SubHeading>Emergency contact (primary)</SubHeading>
          <FormGrid>
            <InlineField label="Name"         value={emp.ecName ?? ""}         onSave={(v) => patch({ ecName: v || null })} />
            <InlineField label="Relationship" value={emp.ecRelationship ?? ""} onSave={(v) => patch({ ecRelationship: v || null })} />
            <InlineField label="Phone" type="tel" value={emp.ecPhone ?? ""}    onSave={(v) => patch({ ecPhone: v || null })} />
          </FormGrid>

          <SubHeading>Emergency contact (secondary)</SubHeading>
          <FormGrid>
            <InlineField label="Name"         value={emp.ec2Name ?? ""}         onSave={(v) => patch({ ec2Name: v || null })} />
            <InlineField label="Relationship" value={emp.ec2Relationship ?? ""} onSave={(v) => patch({ ec2Relationship: v || null })} />
            <InlineField label="Phone" type="tel" value={emp.ec2Phone ?? ""}    onSave={(v) => patch({ ec2Phone: v || null })} />
          </FormGrid>

          <SubHeading>Uniform sizes</SubHeading>
          <FormGrid>
            <InlineField label="Shirt"  value={emp.shirtSize ?? ""}  onSave={(v) => patch({ shirtSize: v || null })} />
            <InlineField label="Pants"  value={emp.pantSize ?? ""}   onSave={(v) => patch({ pantSize: v || null })} />
            <InlineField label="Jacket" value={emp.jacketSize ?? ""} onSave={(v) => patch({ jacketSize: v || null })} />
          </FormGrid>

          <SubHeading>Medical</SubHeading>
          <FormGrid>
            <InlineField label="Blood type" value={emp.bloodType ?? ""} onSave={(v) => patch({ bloodType: v || null })} />
            <InlineField label="Allergies"  value={emp.allergies ?? ""}  onSave={(v) => patch({ allergies: v || null })} />
          </FormGrid>
          <InlineTextarea label="Medical conditions" value={emp.medicalConditions ?? ""} onSave={(v) => patch({ medicalConditions: v || null })} />
        </Card>

        {/* ── Settings ── */}
        <Card title="Access">
          <Toggle
            label="Admin"
            description="Grant employee-records access (KJ/Goetz). Off for everyone else."
            value={emp.isAdmin}
            onChange={(v) => patch({ isAdmin: v })}
            disabled={me?.id === emp.id}
          />
          <Toggle
            label="Active"
            description="When off, this employee cannot sign in."
            value={emp.isActive}
            onChange={(v) => patch({ isActive: v })}
            disabled={me?.id === emp.id}
          />
        </Card>

        {/* ── Classes (drives cert requirements) ── */}
        <Card title="Classes (drives required certifications)">
          {allClasses.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: "0.88rem" }}>
              No classes defined yet.{" "}
              <a href="/admin/classes" style={{ color: "#f0b429", fontWeight: 700 }}>
                Create one
              </a>
              .
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 8,
              }}
            >
              {allClasses.map((c) => {
                const checked = empClassIds.has(c.id);
                return (
                  <label
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 12px",
                      background: checked ? "rgba(240,180,41,0.10)" : "rgba(255,255,255,0.03)",
                      border: checked
                        ? "1px solid rgba(240,180,41,0.35)"
                        : "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = new Set(empClassIds);
                        if (e.target.checked) next.add(c.id);
                        else next.delete(c.id);
                        saveClasses(next);
                      }}
                      style={{ accentColor: "#f0b429" }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>{c.name}</div>
                      {c.description && (
                        <div style={{ color: "#94a3b8", fontSize: "0.74rem", marginTop: 2 }}>
                          {c.description}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </Card>

        {/* ── Cert status overview ── */}
        <Card title="Certification status">
          {empCerts.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: "0.88rem" }}>
              No certifications uploaded yet. Employee adds these from{" "}
              <span style={{ color: "#cbd5e1" }}>Lounge → My Certifications</span>.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {empCerts
                .slice()
                .sort((a, b) => certWeight(a) - certWeight(b))
                .map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 10,
                      padding: "8px 12px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 8,
                      borderLeft: `3px solid ${certColor(c.status)}`,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{c.certTypeName}</div>
                      {c.expiresOn && (
                        <div style={{ color: "#94a3b8", fontSize: "0.74rem", marginTop: 1 }}>
                          Expires {new Date(c.expiresOn).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div style={{ color: certColor(c.status), fontSize: "0.78rem", fontWeight: 800 }}>
                      {certStatusLabel(c)}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>

        {/* ── Personnel Records (admin-only) ── */}
        <PersonnelRecordsPanel employeeId={emp.id} />

        {/* ── Files ── */}
        <Card title="Files (certs, licenses, write-ups)">
          <FileUploader employeeId={emp.id} onAdd={(f) => setFiles([f, ...files])} />
          <FilesList
            files={files}
            onDelete={async (fileId) => {
              if (!confirm("Delete this file? Cannot be undone.")) return;
              const res = await fetch(`/api/admin/employees/${id}/files/${fileId}`, {
                method: "DELETE",
              });
              if (res.ok) setFiles((s) => s.filter((f) => f.id !== fileId));
            }}
          />
        </Card>

        {/* ── Profile change requests submitted by the employee ── */}
        <Card title="About Me change requests">
          <EmployeeChangeRequests employeeId={emp.id} />
        </Card>

        {/* ── Disciplinary write-ups / corrective actions ── */}
        <Card title="Corrective actions / write-ups">
          <EmployeeWriteUps employeeId={emp.id} />
        </Card>

        {/* ── Employee forms (policy acks, training, complaints, leave, etc.) ── */}
        <Card title="Forms & personnel documentation">
          <EmployeeForms employeeId={emp.id} />
        </Card>

        {toast && (
          <div
            style={{
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
              boxShadow: "0 12px 32px rgba(0,0,0,0.55)",
              zIndex: 100,
            }}
          >
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────

function PhotoBlock({
  url,
  initial,
  onUpload,
  onDelete,
  disabled,
}: {
  url: string | null;
  initial: string;
  onUpload: (f: File) => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div
        style={{
          position: "relative",
          width: 120,
          height: 120,
          borderRadius: "50%",
          overflow: "hidden",
          background: "rgba(240,180,41,0.10)",
          border: "1px solid rgba(240,180,41,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#f0b429",
          fontWeight: 900,
          fontSize: "2rem",
        }}
      >
        {url ? (
          <Image src={url} alt="" fill sizes="120px" style={{ objectFit: "cover" }} />
        ) : (
          initial.toUpperCase()
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled} style={smallBtn}>
          {url ? "Replace" : "Upload"}
        </button>
        {url && (
          <button type="button" onClick={onDelete} disabled={disabled} style={{ ...smallBtn, color: "#fca5a5" }}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        marginTop: 22,
        background: "#071428",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 18,
        padding: "28px 30px",
      }}
    >
      <div
        style={{
          color: "#f0b429",
          fontSize: "0.72rem",
          fontWeight: 900,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          marginBottom: 22,
          paddingBottom: 14,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {title}
      </div>
      <div style={{ display: "grid", gap: 22 }}>{children}</div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        color: "#f0b429",
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        marginTop: 10,
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "18px 20px",
      }}
    >
      {children}
    </div>
  );
}

function InlineField({
  label,
  value,
  onSave,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={fieldLabelStyle}>{label}</span>
      <input
        type={type}
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={placeholder}
        onBlur={() => v !== value && onSave(v)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        style={fieldInputStyle}
      />
    </label>
  );
}

function InlineTextarea({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <label style={{ display: "grid", gap: 8, marginTop: 8 }}>
      <span style={fieldLabelStyle}>{label}</span>
      <textarea
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== value && onSave(v)}
        rows={3}
        style={{ ...fieldInputStyle, resize: "vertical", fontFamily: "inherit", padding: "12px 14px" }}
      />
    </label>
  );
}

function Toggle({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 14px",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <div>
        <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>{label}</div>
        <div style={{ color: "#94a3b8", fontSize: "0.8rem", marginTop: 2 }}>{description}</div>
      </div>
      <input
        type="checkbox"
        checked={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 22, height: 22, accentColor: "#f0b429" }}
      />
    </label>
  );
}

function FileUploader({
  employeeId,
  onAdd,
}: {
  employeeId: string;
  onAdd: (f: FileDto) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileType, setFileType] = useState<"cert" | "license" | "writeup" | "other">("cert");
  const [title, setTitle] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [uploading, setUploading] = useState(false);

  async function submit(file: File) {
    if (!title.trim()) {
      alert("Give it a title first.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("fileType", fileType);
      fd.append("title", title.trim());
      if (expiresOn) fd.append("expiresOn", expiresOn);
      const res = await fetch(`/api/admin/employees/${employeeId}/files`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        onAdd(data.file);
        setTitle("");
        setExpiresOn("");
      } else {
        alert(data.error || "Upload failed");
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px dashed rgba(255,255,255,0.12)",
        borderRadius: 12,
        padding: "14px 14px",
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <select
          value={fileType}
          onChange={(e) => setFileType(e.target.value as typeof fileType)}
          style={{ ...fieldInputStyle, width: "auto", flex: "0 0 auto" }}
        >
          <option value="cert">Cert</option>
          <option value="license">License</option>
          <option value="writeup">Write-up</option>
          <option value="other">Other</option>
        </select>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (e.g. EMT-B card, 2026 renewal)"
          style={{ ...fieldInputStyle, flex: 1, minWidth: 200 }}
        />
        <input
          type="date"
          value={expiresOn}
          onChange={(e) => setExpiresOn(e.target.value)}
          style={{ ...fieldInputStyle, width: 170 }}
          placeholder="Expires"
        />
      </div>
      <input
        ref={inputRef}
        type="file"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) submit(f);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || !title.trim()}
        style={{
          padding: "10px 16px",
          background: title.trim() ? "#f0b429" : "rgba(255,255,255,0.06)",
          color: title.trim() ? "#040d1a" : "#475569",
          fontWeight: 900,
          fontSize: "0.78rem",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          borderRadius: 10,
          border: 0,
          cursor: title.trim() ? "pointer" : "not-allowed",
          fontFamily: "inherit",
        }}
      >
        {uploading ? "Uploading…" : "Choose File & Upload"}
      </button>
    </div>
  );
}

function FilesList({
  files,
  onDelete,
}: {
  files: FileDto[];
  onDelete: (id: string) => void;
}) {
  if (files.length === 0) {
    return <p style={{ color: "#64748b", fontSize: "0.88rem", marginTop: 4 }}>No files yet.</p>;
  }
  return (
    <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
      {files.map((f) => (
        <div
          key={f.id}
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            padding: "12px 14px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: 10,
          }}
        >
          <span
            style={{
              fontSize: "0.62rem",
              fontWeight: 900,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: 999,
              background:
                f.fileType === "writeup" ? "rgba(239,68,68,0.18)" :
                f.fileType === "license" ? "rgba(34,197,94,0.18)" :
                f.fileType === "cert"    ? "rgba(56,189,248,0.18)" :
                                            "rgba(148,163,184,0.18)",
              color:
                f.fileType === "writeup" ? "#fca5a5" :
                f.fileType === "license" ? "#86efac" :
                f.fileType === "cert"    ? "#7dd3fc" :
                                            "#cbd5e1",
            }}
          >
            {f.fileType}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <a
              href={f.fileUrl}
              target="_blank"
              rel="noreferrer"
              style={{ color: "white", fontWeight: 700, textDecoration: "none", fontSize: "0.95rem" }}
            >
              {f.title}
            </a>
            <div style={{ color: "#64748b", fontSize: "0.74rem", marginTop: 2 }}>
              Uploaded {new Date(f.uploadedAt).toLocaleDateString()}
              {f.expiresOn && ` · Expires ${new Date(f.expiresOn).toLocaleDateString()}`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onDelete(f.id)}
            style={{ ...smallBtn, color: "#fca5a5" }}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: "0.6rem",
        fontWeight: 900,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        padding: "3px 9px",
        borderRadius: 999,
        background: `${color}26`,
        color,
        border: `1px solid ${color}55`,
      }}
    >
      {children}
    </span>
  );
}

function Button({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "9px 14px",
        background: danger ? "rgba(239,68,68,0.10)" : "rgba(255,255,255,0.06)",
        border: `1px solid ${danger ? "rgba(239,68,68,0.30)" : "rgba(255,255,255,0.10)"}`,
        color: danger ? "#fca5a5" : "white",
        borderRadius: 10,
        fontWeight: 800,
        fontSize: "0.78rem",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

// ── Cert helpers ───────────────────────────────────────────────────────
function certWeight(c: EmpCertDto): number {
  switch (c.status) {
    case "expired":   return 0;
    case "final_7":   return 1;
    case "30":        return 2;
    case "60":        return 3;
    case "90":        return 4;
    case "120":       return 5;
    case "no_expiration": return 7;
    case "good":      return 6;
    default:          return 8;
  }
}
function certColor(s: EmpCertDto["status"]): string {
  switch (s) {
    case "expired":   return "#ef4444";
    case "final_7":   return "#f97316";
    case "30":        return "#f59e0b";
    case "60":        return "#facc15";
    case "90":        return "#a3e635";
    case "120":       return "#22d3ee";
    case "no_expiration":
    case "good":      return "#22c55e";
    default:          return "#64748b";
  }
}
function certStatusLabel(c: EmpCertDto): string {
  if (c.status === "no_expiration") return "On file";
  if (c.status === "expired") return `Expired ${Math.abs(c.daysLeft ?? 0)}d`;
  if (c.status === "final_7") return c.daysLeft === 0 ? "Today!" : `${c.daysLeft}d left`;
  if (c.status === "good") return c.daysLeft != null ? `${c.daysLeft}d left` : "Current";
  return `${c.daysLeft}d left`;
}

// ── Styles ─────────────────────────────────────────────────────────────
const pageStyle: React.CSSProperties = {
  padding: "32px 28px 80px",
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
const fieldLabelStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "0.72rem",
  fontWeight: 800,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
};
const fieldInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  background: "#040d1a",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 10,
  color: "white",
  fontSize: "0.95rem",
  outline: "none",
  fontFamily: "inherit",
  lineHeight: 1.3,
};
const smallBtn: React.CSSProperties = {
  padding: "6px 12px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "white",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: "0.72rem",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
};
