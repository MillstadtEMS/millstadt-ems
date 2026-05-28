"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface CertType {
  id: string;
  name: string;
  slug: string;
  requiresExpiration: boolean;
  alertThresholds: number[];
  isBuiltIn: boolean;
}

const PRESETS = [
  { label: "Standard (120 / 90 / 60 / 30)", value: [120, 90, 60, 30] },
  { label: "Aggressive (180 / 120 / 90 / 60 / 30 / 14)", value: [180, 120, 90, 60, 30, 14] },
  { label: "Just 30-day", value: [30] },
];

export default function CertTypesAdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [types, setTypes] = useState<CertType[]>([]);
  const [newName, setNewName] = useState("");
  const [newReqExp, setNewReqExp] = useState(true);
  const [newThresholds, setNewThresholds] = useState("120, 90, 60, 30");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/lounge/me")
      .then(async (r) => {
        if (!r.ok) { router.push("/lounge/login"); return; }
        const d = await r.json();
        if (!d.employee?.isAdmin) { router.push("/lounge"); return; }
        setAuthed(true);
      })
      .catch(() => router.push("/lounge/login"));
  }, [router]);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/cert-types");
    if (r.ok) setTypes((await r.json()).certTypes);
  }, []);
  useEffect(() => { if (authed) load(); }, [authed, load]);

  function parseThresholds(s: string): number[] {
    return s
      .split(",")
      .map((p) => parseInt(p.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0)
      .sort((a, b) => b - a);
  }

  async function create() {
    setError("");
    if (!newName.trim()) return;
    setCreating(true);
    const thresholds = newReqExp ? parseThresholds(newThresholds) : undefined;
    const res = await fetch("/api/admin/cert-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        requiresExpiration: newReqExp,
        alertThresholds: thresholds,
      }),
    });
    const d = await res.json();
    setCreating(false);
    if (!res.ok) { setError(d.error || "Create failed"); return; }
    setNewName(""); setNewReqExp(true); setNewThresholds("120, 90, 60, 30");
    setTypes((s) => [...s, d.certType]);
  }

  async function patch(id: string, patch: Partial<CertType>) {
    const res = await fetch(`/api/admin/cert-types/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const d = await res.json();
      setTypes((s) => s.map((t) => (t.id === id ? d.certType : t)));
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete cert type "${name}"? All employee uploads of this type will also be removed.`)) return;
    const res = await fetch(`/api/admin/cert-types/${id}`, { method: "DELETE" });
    if (res.ok) setTypes((s) => s.filter((t) => t.id !== id));
    else {
      const d = await res.json();
      alert(d.error || "Delete failed");
    }
  }

  if (!authed) return <div style={pageStyle}><p style={{ color: "#94a3b8" }}>Loading…</p></div>;

  const builtIn = types.filter((t) => t.isBuiltIn);
  const custom = types.filter((t) => !t.isBuiltIn);

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <Link href="/lounge" style={backLinkStyle}>← Back to Lounge</Link>
        <h1 style={titleStyle}>Certification Types</h1>
        <p style={{ color: "#94a3b8", fontSize: "0.92rem", marginTop: 6 }}>
          Built-in types can&apos;t be deleted (built into the schema), but their
          alert thresholds are editable. Add your own custom types below.
        </p>

        {/* ── New type form ── */}
        <section style={cardStyle}>
          <div style={eyebrowStyle}>New Cert Type</div>
          <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name (e.g. PHTLS, Fit Test)"
              style={inputStyle}
            />
            <label style={toggleRowStyle}>
              <input
                type="checkbox"
                checked={newReqExp}
                onChange={(e) => setNewReqExp(e.target.checked)}
                style={{ accentColor: "#f0b429" }}
              />
              <span>Requires an expiration date</span>
            </label>
            {newReqExp && (
              <>
                <label style={fieldLabelStyle}>Alert thresholds (days before expiry)</label>
                <input
                  value={newThresholds}
                  onChange={(e) => setNewThresholds(e.target.value)}
                  placeholder="120, 90, 60, 30"
                  style={inputStyle}
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setNewThresholds(p.value.join(", "))}
                      style={presetBtn}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div style={{ color: "#64748b", fontSize: "0.78rem" }}>
                  Final 7 days fire daily automatically. Expired status fires daily until renewal.
                </div>
              </>
            )}
            <button onClick={create} disabled={creating || !newName.trim()} style={{ ...goldBtn, opacity: creating || !newName.trim() ? 0.5 : 1, alignSelf: "flex-start" }}>
              {creating ? "Creating…" : "+ Create"}
            </button>
            {error && (
              <div style={{ color: "#fca5a5", fontSize: "0.88rem" }}>{error}</div>
            )}
          </div>
        </section>

        {/* ── Built-in types ── */}
        <section style={{ marginTop: 28 }}>
          <div style={{ ...eyebrowStyle, marginBottom: 10 }}>Built-In ({builtIn.length})</div>
          <div style={{ display: "grid", gap: 8 }}>
            {builtIn.map((t) => (
              <CertTypeRow key={t.id} t={t} onPatch={(p) => patch(t.id, p)} onDelete={undefined} />
            ))}
          </div>
        </section>

        {/* ── Custom types ── */}
        <section style={{ marginTop: 28 }}>
          <div style={{ ...eyebrowStyle, marginBottom: 10 }}>Custom ({custom.length})</div>
          {custom.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: "0.88rem" }}>None yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {custom.map((t) => (
                <CertTypeRow
                  key={t.id}
                  t={t}
                  onPatch={(p) => patch(t.id, p)}
                  onDelete={() => remove(t.id, t.name)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function CertTypeRow({
  t,
  onPatch,
  onDelete,
}: {
  t: CertType;
  onPatch: (p: Partial<CertType>) => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [thresholds, setThresholds] = useState(t.alertThresholds.join(", "));
  const [reqExp, setReqExp] = useState(t.requiresExpiration);
  useEffect(() => setThresholds(t.alertThresholds.join(", ")), [t.alertThresholds]);
  useEffect(() => setReqExp(t.requiresExpiration), [t.requiresExpiration]);

  return (
    <div
      style={{
        background: "#071428",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 12,
        padding: "12px 14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.95rem", fontWeight: 800 }}>{t.name}</div>
          <div style={{ color: "#94a3b8", fontSize: "0.78rem", marginTop: 2 }}>
            {t.requiresExpiration
              ? `Tracks expiration · ${t.alertThresholds.join(" / ")} day notices`
              : "No expiration tracking"}
            {t.isBuiltIn ? " · built-in" : ""}
          </div>
        </div>
        <button onClick={() => setOpen(!open)} style={smallBtn}>{open ? "Close" : "Edit"}</button>
        {onDelete && (
          <button onClick={onDelete} style={{ ...smallBtn, color: "#fca5a5" }}>Delete</button>
        )}
      </div>

      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", display: "grid", gap: 10 }}>
          <label style={toggleRowStyle}>
            <input
              type="checkbox"
              checked={reqExp}
              onChange={(e) => {
                setReqExp(e.target.checked);
                onPatch({ requiresExpiration: e.target.checked });
              }}
              style={{ accentColor: "#f0b429" }}
            />
            <span>Requires an expiration date</span>
          </label>
          {reqExp && (
            <>
              <label style={fieldLabelStyle}>Alert thresholds</label>
              <input
                value={thresholds}
                onChange={(e) => setThresholds(e.target.value)}
                onBlur={() => {
                  const arr = thresholds
                    .split(",")
                    .map((p) => parseInt(p.trim(), 10))
                    .filter((n) => Number.isFinite(n) && n > 0)
                    .sort((a, b) => b - a);
                  if (JSON.stringify(arr) !== JSON.stringify(t.alertThresholds)) {
                    onPatch({ alertThresholds: arr });
                  }
                }}
                style={inputStyle}
              />
            </>
          )}
        </div>
      )}
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
const cardStyle: React.CSSProperties = {
  marginTop: 22,
  background: "#071428",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 14,
  padding: "18px 20px",
};
const eyebrowStyle: React.CSSProperties = {
  color: "#f0b429",
  fontSize: "0.7rem",
  fontWeight: 900,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
};
const fieldLabelStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "0.7rem",
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};
const toggleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  background: "rgba(255,255,255,0.03)",
  borderRadius: 10,
  cursor: "pointer",
  fontSize: "0.92rem",
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
  fontFamily: "inherit",
};
const presetBtn: React.CSSProperties = {
  padding: "6px 10px",
  background: "rgba(240,180,41,0.10)",
  border: "1px solid rgba(240,180,41,0.25)",
  color: "#f0b429",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: "0.7rem",
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
};
