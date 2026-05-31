/**
 * Read-only About Me summary. Replaces the inline-edit form for crew —
 * only admins can change About Me values, and they do that from the
 * employee record at /admin/employees/[id]. Crew use the "Request a
 * Change" button below to ask for an update.
 */
"use client";

import type { ReactNode } from "react";

export interface AboutMeSnapshot {
  firstName: string;
  lastName: string;
  certification: string | null;
  position: string | null;
  photoUrl: string | null;
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
}

function maskDob(dob: string): string {
  // Show only month + day so the year doesn't sit in the lounge in plain text.
  if (!dob) return "—";
  const m = dob.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return dob;
  return `${m[2]}/${m[3]}`;
}

function maskLicense(num: string): string {
  if (!num) return "—";
  if (num.length <= 4) return `••• ${num}`;
  return `••• ${num.slice(-4)}`;
}

function joinAddress(p: AboutMeSnapshot): string {
  const street = p.addressStreet;
  const csz = [p.addressCity, p.addressState].filter(Boolean).join(", ");
  const last = [csz, p.addressZip].filter(Boolean).join(" ");
  return [street, last].filter(Boolean).join("\n") || "—";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function AboutMeReadOnly({ p }: { p: AboutMeSnapshot }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <SectionGrid title="Identity">
        <Field label="Name" value={`${p.firstName} ${p.lastName}`} />
        <Field label="Certification" value={p.certification || "—"} />
        <Field label="Position" value={p.position || "—"} />
        <Field label="Hire date" value={fmtDate(p.hireDate)} />
        <Field label="Date of birth" value={maskDob(p.dob)} />
        <Field label="Blood type" value={p.bloodType || "—"} />
      </SectionGrid>

      <SectionGrid title="Contact">
        <Field label="Email" value={p.email || "—"} />
        <Field label="Phone" value={p.phone || "—"} />
        <Field label="Mailing address" value={<span style={pre}>{joinAddress(p)}</span>} wide />
      </SectionGrid>

      <SectionGrid title="Driver's license">
        <Field label="Number" value={maskLicense(p.driverLicenseNum)} />
        <Field label="State" value={p.driverLicenseState || "—"} />
      </SectionGrid>

      <SectionGrid title="Emergency contact #1">
        <Field label="Name" value={p.ecName || "—"} />
        <Field label="Relationship" value={p.ecRelationship || "—"} />
        <Field label="Phone" value={p.ecPhone || "—"} />
      </SectionGrid>

      <SectionGrid title="Emergency contact #2">
        <Field label="Name" value={p.ec2Name || "—"} />
        <Field label="Relationship" value={p.ec2Relationship || "—"} />
        <Field label="Phone" value={p.ec2Phone || "—"} />
      </SectionGrid>

      <SectionGrid title="Uniform sizes">
        <Field label="Shirt" value={p.shirtSize || "—"} />
        <Field label="Pants" value={p.pantSize || "—"} />
        <Field label="Jacket" value={p.jacketSize || "—"} />
      </SectionGrid>

      <SectionGrid title="Medical">
        <Field label="Allergies" value={p.allergies || "—"} wide />
        <Field label="Conditions" value={p.medicalConditions || "—"} wide />
      </SectionGrid>
    </div>
  );
}

function SectionGrid({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={card}>
      <h3 style={heading}>{title}</h3>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {children}
      </div>
    </section>
  );
}

function Field({ label, value, wide }: { label: string; value: ReactNode; wide?: boolean }) {
  return (
    <div style={{ ...fieldBox, gridColumn: wide ? "1 / -1" : undefined }}>
      <div style={fieldLabel}>{label}</div>
      <div style={fieldValue}>{value}</div>
    </div>
  );
}

const card: React.CSSProperties = {
  padding: 18,
  background: "rgba(7,20,40,0.55)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
};
const heading: React.CSSProperties = {
  margin: "0 0 12px",
  color: "#f0b429",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  fontFamily: "var(--font-mas-mono), ui-monospace, monospace",
};
const fieldBox: React.CSSProperties = {
  padding: "10px 12px",
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.05)",
  borderRadius: 10,
};
const fieldLabel: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  marginBottom: 4,
};
const fieldValue: React.CSSProperties = {
  color: "white",
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.4,
  wordBreak: "break-word",
};
const pre: React.CSSProperties = {
  whiteSpace: "pre-wrap",
  display: "inline-block",
};
