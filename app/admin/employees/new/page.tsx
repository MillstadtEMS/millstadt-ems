"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewEmployeePage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [certification, setCertification] = useState("");
  const [position, setPosition] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [ssn, setSsn] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [overrideUsername, setOverrideUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Gate: confirm we're admin
  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    fetch("/api/lounge/me")
      .then(async (r) => {
        if (!r.ok) { router.push("/lounge/login"); return; }
        const data = await r.json();
        if (!data.employee?.isAdmin) { router.push("/lounge"); return; }
        setAuthChecked(true);
      })
      .catch(() => router.push("/lounge/login"));
  }, [router]);

  const autoUsername = useMemo(() => {
    if (!firstName || !lastName) return "";
    return (firstName.trim()[0] + lastName.trim()).toLowerCase().replace(/[^a-z]/g, "");
  }, [firstName, lastName]);
  const username = overrideUsername.trim() || autoUsername;
  const defaultPassword = username;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          certification: certification.trim() || undefined,
          position: position.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          dob: dob || undefined,
          ssn: ssn.trim() || undefined,
          hireDate: hireDate || undefined,
          notes: notes.trim() || undefined,
          isAdmin,
          username: overrideUsername.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create employee");
        setSaving(false);
        return;
      }
      router.push(`/admin/employees/${data.employee.id}`);
    } catch {
      setError("Connection error");
      setSaving(false);
    }
  }

  if (!authChecked) {
    return (
      <div style={pageStyle}>
        <p style={{ color: "#94a3b8" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link href="/admin/employees" style={backLinkStyle}>← All Employees</Link>
        <h1 style={titleStyle}>Add Employee</h1>
        <p style={{ color: "#94a3b8", fontSize: "0.92rem", marginTop: 6 }}>
          Initial password will be{" "}
          <code style={{ color: "#f0b429" }}>
            {defaultPassword || "the assigned username"}
          </code>
          . It works once; they&apos;ll be required to choose a permanent password on first login.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: 28, display: "grid", gap: 16 }}>
          <Row>
            <Field label="First name" required>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inputStyle} autoFocus />
            </Field>
            <Field label="Last name" required>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} style={inputStyle} />
            </Field>
          </Row>

          <Field label="Username (optional override)">
            <input
              type="text"
              value={overrideUsername}
              onChange={(e) => setOverrideUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
              placeholder={autoUsername || "Auto: first-initial + last-name"}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              style={inputStyle}
            />
          </Field>
          {username && (
            <div
              style={{
                background: "rgba(240,180,41,0.07)",
                border: "1px solid rgba(240,180,41,0.2)",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: "0.85rem",
                color: "#cbd5e1",
              }}
            >
              Username will be <strong style={{ color: "#f0b429" }}>@{username}</strong>
              {overrideUsername.trim() && autoUsername !== username && (
                <span style={{ color: "#94a3b8", marginLeft: 8 }}>(overridden from <code>@{autoUsername}</code>)</span>
              )}
            </div>
          )}

          <Row>
            <Field label="Certification"><input value={certification} onChange={(e) => setCertification(e.target.value)} style={inputStyle} placeholder="EMT-B / Paramedic / PHRN…" /></Field>
            <Field label="Position"><input value={position} onChange={(e) => setPosition(e.target.value)} style={inputStyle} placeholder="Optional" /></Field>
          </Row>

          <Row>
            <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} /></Field>
            <Field label="Phone"><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} /></Field>
          </Row>

          <Row>
            <Field label="Date of birth"><input type="date" value={dob} onChange={(e) => setDob(e.target.value)} style={inputStyle} /></Field>
            <Field label="Hire date"><input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} style={inputStyle} /></Field>
          </Row>

          <Field label="SSN (encrypted at rest)">
            <input
              type="text"
              value={ssn}
              onChange={(e) => setSsn(e.target.value)}
              placeholder="123-45-6789"
              autoComplete="off"
              style={inputStyle}
            />
          </Field>

          <Field label="Notes (internal)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
            />
          </Field>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 14px",
              background: "#071428",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <span style={{ fontSize: "0.92rem" }}>
              Grant <strong style={{ color: "#f0b429" }}>admin</strong> access
              (employee records, files, settings)
            </span>
          </label>

          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.10)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 10,
                padding: "10px 14px",
                color: "#fca5a5",
                fontSize: "0.875rem",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button
              type="submit"
              disabled={saving || !firstName || !lastName}
              style={{
                background: "#f0b429",
                color: "#040d1a",
                padding: "14px 22px",
                border: 0,
                borderRadius: 10,
                fontWeight: 900,
                fontSize: "0.82rem",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                cursor: saving || !firstName || !lastName ? "not-allowed" : "pointer",
                opacity: saving || !firstName || !lastName ? 0.5 : 1,
                fontFamily: "inherit",
              }}
            >
              {saving ? "Creating…" : "Create Employee"}
            </button>
            <Link
              href="/admin/employees"
              style={{
                padding: "14px 22px",
                color: "#94a3b8",
                fontSize: "0.82rem",
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

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
const titleStyle: React.CSSProperties = {
  margin: "16px 0 0",
  fontSize: "1.85rem",
  fontWeight: 900,
  letterSpacing: "-0.01em",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "#071428",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 10,
  color: "white",
  fontSize: "0.95rem",
  outline: "none",
  fontFamily: "inherit",
};

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 12,
      }}
    >
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span
        style={{
          color: "#94a3b8",
          fontSize: "0.72rem",
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        {label}
        {required && <span style={{ color: "#f0b429", marginLeft: 4 }}>*</span>}
      </span>
      {children}
    </label>
  );
}
