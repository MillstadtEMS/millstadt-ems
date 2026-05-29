"use client";

import { useState } from "react";

interface ProfileInitial {
  firstName: string;
  lastName: string;
  certification: string | null;
  position: string | null;
  hireDate: string | null;
  email: string;
  phone: string;
  dob: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZip: string;
  driverLicenseNum: string;
  driverLicenseState: string;
  ecName: string;
  ecRelationship: string;
  ecPhone: string;
  ec2Name: string;
  ec2Relationship: string;
  ec2Phone: string;
  shirtSize: string;
  pantSize: string;
  jacketSize: string;
  allergies: string;
  medicalConditions: string;
  bloodType: string;
  profileCompletedAt: string | null;
}

export default function AboutMeForm({ initial }: { initial: ProfileInitial }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<null | "ok" | "err">(null);

  function set<K extends keyof ProfileInitial>(key: K, value: ProfileInitial[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setSaved(null);
    try {
      const res = await fetch("/api/lounge/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          phone: form.phone,
          dob: form.dob,
          addressStreet: form.addressStreet,
          addressCity: form.addressCity,
          addressState: form.addressState,
          addressZip: form.addressZip,
          driverLicenseNum: form.driverLicenseNum,
          driverLicenseState: form.driverLicenseState,
          ecName: form.ecName,
          ecRelationship: form.ecRelationship,
          ecPhone: form.ecPhone,
          ec2Name: form.ec2Name,
          ec2Relationship: form.ec2Relationship,
          ec2Phone: form.ec2Phone,
          shirtSize: form.shirtSize,
          pantSize: form.pantSize,
          jacketSize: form.jacketSize,
          allergies: form.allergies,
          medicalConditions: form.medicalConditions,
          bloodType: form.bloodType,
        }),
      });
      setSaved(res.ok ? "ok" : "err");
    } catch {
      setSaved("err");
    } finally {
      setSaving(false);
      setTimeout(() => setSaved(null), 3500);
    }
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <ReadOnlyCard title="Identity (managed by admin)" rows={[
        ["Name",          `${form.firstName} ${form.lastName}`],
        ["Certification", form.certification ?? "—"],
        ["Position",      form.position ?? "—"],
        ["Hire date",     form.hireDate ?? "—"],
      ]} />

      <Card title="Contact">
        <Grid>
          <Field label="Email"        type="email" value={form.email}  onChange={(v) => set("email", v)} placeholder="you@example.com" />
          <Field label="Mobile phone" type="tel"   value={form.phone}  onChange={(v) => set("phone", v)} placeholder="(618) 555-0100" />
          <Field label="Date of birth" type="date" value={form.dob}    onChange={(v) => set("dob", v)} />
        </Grid>
      </Card>

      <Card title="Home address">
        <Grid>
          <Field full label="Street" value={form.addressStreet} onChange={(v) => set("addressStreet", v)} placeholder="123 W Laurel St" />
          <Field      label="City"   value={form.addressCity}   onChange={(v) => set("addressCity", v)} />
          <Field      label="State"  value={form.addressState}  onChange={(v) => set("addressState", v)} placeholder="IL" />
          <Field      label="ZIP"    value={form.addressZip}    onChange={(v) => set("addressZip", v)} />
        </Grid>
      </Card>

      <Card title="Driver's license">
        <Grid>
          <Field label="DL number" value={form.driverLicenseNum}  onChange={(v) => set("driverLicenseNum", v)} />
          <Field label="DL state"  value={form.driverLicenseState} onChange={(v) => set("driverLicenseState", v)} placeholder="IL" />
        </Grid>
      </Card>

      <Card title="Emergency contact (primary)">
        <Grid>
          <Field label="Name"         value={form.ecName}         onChange={(v) => set("ecName", v)} />
          <Field label="Relationship" value={form.ecRelationship} onChange={(v) => set("ecRelationship", v)} placeholder="Spouse, parent…" />
          <Field label="Phone"        type="tel" value={form.ecPhone} onChange={(v) => set("ecPhone", v)} />
        </Grid>
      </Card>

      <Card title="Emergency contact (secondary, optional)">
        <Grid>
          <Field label="Name"         value={form.ec2Name}         onChange={(v) => set("ec2Name", v)} />
          <Field label="Relationship" value={form.ec2Relationship} onChange={(v) => set("ec2Relationship", v)} />
          <Field label="Phone"        type="tel" value={form.ec2Phone} onChange={(v) => set("ec2Phone", v)} />
        </Grid>
      </Card>

      <Card title="Uniform sizes">
        <Grid>
          <Field label="Shirt"  value={form.shirtSize}  onChange={(v) => set("shirtSize", v)} placeholder="M, L, XL…" />
          <Field label="Pants"  value={form.pantSize}   onChange={(v) => set("pantSize", v)} placeholder="32x32" />
          <Field label="Jacket" value={form.jacketSize} onChange={(v) => set("jacketSize", v)} placeholder="L" />
        </Grid>
      </Card>

      <Card title="Medical">
        <Grid>
          <Field label="Blood type" value={form.bloodType} onChange={(v) => set("bloodType", v)} placeholder="O+, A-, AB+…" />
        </Grid>
        <div style={{ height: 12 }} />
        <Field full label="Allergies" value={form.allergies}
          onChange={(v) => set("allergies", v)} placeholder="None, latex, penicillin…" />
        <div style={{ height: 12 }} />
        <Field full multiline label="Conditions providers should know" value={form.medicalConditions}
          onChange={(v) => set("medicalConditions", v)}
          placeholder="Anything an on-scene partner might need to know in an emergency." />
      </Card>

      <div
        style={{
          position: "sticky",
          bottom: 12,
          background: "#040d1a",
          border: "1px solid rgba(240,180,41,0.25)",
          borderRadius: 14,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.55)",
          marginTop: 6,
        }}
      >
        <div style={{ color: "#94a3b8", fontSize: "0.86rem" }}>
          {form.profileCompletedAt
            ? `Last updated ${new Date(form.profileCompletedAt).toLocaleDateString()}`
            : "Save your info so management has it on file."}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {saved === "ok" && <span style={{ color: "#34d399", fontSize: "0.86rem", fontWeight: 700 }}>Saved ✓</span>}
          {saved === "err" && <span style={{ color: "#fca5a5", fontSize: "0.86rem", fontWeight: 700 }}>Save failed</span>}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            style={{
              padding: "11px 22px",
              background: saving ? "rgba(240,180,41,0.45)" : "#f0b429",
              color: "#040d1a",
              fontWeight: 900,
              fontSize: 13,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              borderRadius: 12,
              border: 0,
              cursor: saving ? "wait" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      background: "#071428",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16,
      padding: "20px 22px 22px",
    }}>
      <h2 style={{
        margin: "0 0 14px",
        color: "white",
        fontSize: 15,
        fontWeight: 900,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function ReadOnlyCard({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <section style={{
      background: "rgba(255,255,255,0.03)",
      border: "1px dashed rgba(255,255,255,0.10)",
      borderRadius: 16,
      padding: "16px 22px 18px",
    }}>
      <h2 style={{
        margin: "0 0 10px",
        color: "#94a3b8",
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
      }}>
        {title}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <div style={{ color: "#64748b", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</div>
            <div style={{ color: "#e2e8f0", fontSize: 15, marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
      {children}
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder, full, multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  full?: boolean;
  multiline?: boolean;
}) {
  const sharedStyle: React.CSSProperties = {
    width: "100%",
    background: "#040d1a",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 10,
    color: "white",
    padding: "11px 13px",
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
  };
  return (
    <label style={{ display: "block", gridColumn: full ? "1 / -1" : undefined }}>
      <span style={{ display: "block", color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          style={{ ...sharedStyle, resize: "vertical", minHeight: 72 }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={sharedStyle}
        />
      )}
    </label>
  );
}
