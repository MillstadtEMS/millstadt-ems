/**
 * The only About-Me thing the employee can edit themselves: a secondary
 * email address + a toggle to also fan lounge notifications out to it.
 * Saves through the same /api/lounge/me/profile PUT endpoint the (now
 * admin-only) AboutMeForm uses, but only writes those two fields.
 */
"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  initialEmailSecondary: string;
  initialEmailSecondaryAlerts: boolean;
}

export default function NotificationPreferences({
  initialEmailSecondary,
  initialEmailSecondaryAlerts,
}: Props) {
  const [emailSecondary, setEmailSecondary] = useState(initialEmailSecondary);
  const [emailSecondaryAlerts, setEmailSecondaryAlerts] = useState(initialEmailSecondaryAlerts);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<null | "ok" | "err">(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleSave(nextEmail: string, nextOptIn: boolean) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(nextEmail, nextOptIn), 600);
  }

  async function save(nextEmail: string, nextOptIn: boolean) {
    setSaving(true);
    setSaved(null);
    try {
      const res = await fetch("/api/lounge/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailSecondary: nextEmail.trim() || null,
          emailSecondaryAlerts: nextOptIn,
        }),
      });
      setSaved(res.ok ? "ok" : "err");
    } catch {
      setSaved("err");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <section style={card}>
      <header style={{ marginBottom: 12 }}>
        <div style={kicker}>Notification preferences</div>
        <h2 style={heading}>Secondary email</h2>
        <p style={lede}>
          Add a personal email if you&apos;d like lounge alerts mirrored somewhere other than
          your work address.
        </p>
      </header>

      <label style={fieldLabel} htmlFor="email-secondary">Secondary email</label>
      <input
        id="email-secondary"
        type="email"
        autoComplete="email"
        value={emailSecondary}
        placeholder="you@example.com"
        onChange={(e) => {
          const v = e.target.value;
          setEmailSecondary(v);
          scheduleSave(v, emailSecondaryAlerts);
        }}
        style={input}
      />

      <label style={{ ...checkRow, opacity: emailSecondary.trim() ? 1 : 0.55 }}>
        <input
          type="checkbox"
          checked={emailSecondaryAlerts}
          disabled={!emailSecondary.trim()}
          onChange={(e) => {
            const v = e.target.checked;
            setEmailSecondaryAlerts(v);
            scheduleSave(emailSecondary, v);
          }}
          style={{ width: 18, height: 18, accentColor: "#f0b429" }}
        />
        <span>Also send Millstadt EMS Lounge alerts to this email.</span>
      </label>

      <div style={statusRow}>
        {saving ? "Saving…" : saved === "ok" ? "Saved." : saved === "err" ? "Couldn't save — try again." : " "}
      </div>
    </section>
  );
}

const card: React.CSSProperties = {
  padding: 20,
  background: "rgba(7,20,40,0.55)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 16,
};
const kicker: React.CSSProperties = {
  color: "#f0b429",
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  fontFamily: "var(--font-mas-mono), ui-monospace, monospace",
};
const heading: React.CSSProperties = {
  color: "white",
  fontSize: 18,
  fontWeight: 900,
  letterSpacing: "-0.015em",
  margin: "4px 0 6px",
};
const lede: React.CSSProperties = {
  color: "#cbd5e1",
  fontSize: 13.5,
  lineHeight: 1.55,
  margin: 0,
};
const fieldLabel: React.CSSProperties = {
  display: "block",
  color: "#94a3b8",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  margin: "12px 0 6px",
};
const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 10,
  color: "white",
  fontSize: 14,
  fontFamily: "inherit",
};
const checkRow: React.CSSProperties = {
  marginTop: 12,
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "#cbd5e1",
  fontSize: 13.5,
  cursor: "pointer",
};
const statusRow: React.CSSProperties = {
  marginTop: 10,
  color: "#94a3b8",
  fontSize: 12,
  minHeight: 16,
};
