"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface CertType {
  id: string;
  name: string;
  slug: string;
  isBuiltIn: boolean;
}
interface LoungeClass {
  id: string;
  name: string;
  description: string | null;
  memberCount?: number;
  requiredCertTypeIds?: string[];
}

export default function ClassesAdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [classes, setClasses] = useState<LoungeClass[]>([]);
  const [certTypes, setCertTypes] = useState<CertType[]>([]);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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
    const [cr, tr] = await Promise.all([
      fetch("/api/admin/classes"),
      fetch("/api/admin/cert-types"),
    ]);
    if (cr.ok) setClasses((await cr.json()).classes);
    if (tr.ok) setCertTypes((await tr.json()).certTypes);
  }, []);
  useEffect(() => { if (authed) load(); }, [authed, load]);

  async function createClass() {
    setError("");
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/admin/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || undefined }),
    });
    const d = await res.json();
    setCreating(false);
    if (!res.ok) { setError(d.error || "Create failed"); return; }
    setNewName(""); setNewDesc("");
    setClasses((s) => [...s, d.class]);
  }

  async function deleteClass(id: string, name: string) {
    if (!confirm(`Delete class "${name}"? Employees will be unassigned.`)) return;
    const res = await fetch(`/api/admin/classes/${id}`, { method: "DELETE" });
    if (res.ok) setClasses((s) => s.filter((c) => c.id !== id));
  }

  async function setRequirements(id: string, certTypeIds: string[]) {
    const res = await fetch(`/api/admin/classes/${id}/requirements`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ certTypeIds }),
    });
    if (res.ok) {
      const d = await res.json();
      setClasses((s) => s.map((c) => (c.id === id ? { ...c, requiredCertTypeIds: d.class.requiredCertTypeIds } : c)));
    }
  }

  if (!authed) return <div style={pageStyle}><p style={{ color: "#94a3b8" }}>Loading…</p></div>;

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <Link href="/lounge" style={backLinkStyle}>← Back to Lounge</Link>
        <h1 style={titleStyle}>Classes</h1>
        <p style={{ color: "#94a3b8", fontSize: "0.92rem", marginTop: 6 }}>
          Admin-defined roles (EMT, Paramedic, Board Member, etc.). Each class
          declares which certifications its members must keep current.
        </p>

        {/* ── New class form ── */}
        <section style={cardStyle}>
          <div style={eyebrowStyle}>New Class</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Class name (e.g. Paramedic)"
              style={{ ...inputStyle, flex: "1 1 220px" }}
            />
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              style={{ ...inputStyle, flex: "2 1 280px" }}
            />
            <button
              onClick={createClass}
              disabled={creating || !newName.trim()}
              style={{ ...goldBtn, opacity: creating || !newName.trim() ? 0.5 : 1 }}
            >
              {creating ? "Creating…" : "+ Create"}
            </button>
          </div>
          {error && (
            <div style={{ marginTop: 10, color: "#fca5a5", fontSize: "0.88rem" }}>{error}</div>
          )}
        </section>

        {/* ── Existing classes ── */}
        <section style={{ marginTop: 20, display: "grid", gap: 12 }}>
          {classes.map((c) => (
            <ClassRow
              key={c.id}
              cls={c}
              certTypes={certTypes}
              expanded={editingId === c.id}
              onToggle={() => setEditingId(editingId === c.id ? null : c.id)}
              onDelete={() => deleteClass(c.id, c.name)}
              onSetRequirements={(ids) => setRequirements(c.id, ids)}
            />
          ))}
          {classes.length === 0 && (
            <p style={{ color: "#64748b", fontSize: "0.88rem", padding: 14 }}>
              No classes yet. Create one above.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function ClassRow({
  cls,
  certTypes,
  expanded,
  onToggle,
  onDelete,
  onSetRequirements,
}: {
  cls: LoungeClass;
  certTypes: CertType[];
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onSetRequirements: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(cls.requiredCertTypeIds ?? []),
  );
  useEffect(() => {
    setSelected(new Set(cls.requiredCertTypeIds ?? []));
  }, [cls.requiredCertTypeIds]);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div
      style={{
        background: "#071428",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
        padding: "16px 18px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "1.05rem", fontWeight: 800 }}>{cls.name}</div>
          <div style={{ color: "#94a3b8", fontSize: "0.82rem", marginTop: 2 }}>
            {cls.description || "—"} · {cls.memberCount ?? 0} member{cls.memberCount === 1 ? "" : "s"} · {(cls.requiredCertTypeIds ?? []).length} required cert{(cls.requiredCertTypeIds ?? []).length === 1 ? "" : "s"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onToggle} style={smallBtn}>{expanded ? "Close" : "Edit Reqs"}</button>
          <button onClick={onDelete} style={{ ...smallBtn, color: "#fca5a5" }}>Delete</button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ ...eyebrowStyle, marginBottom: 10 }}>Required certifications</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 8,
            }}
          >
            {certTypes.map((t) => (
              <label
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  background: selected.has(t.id) ? "rgba(240,180,41,0.08)" : "rgba(255,255,255,0.03)",
                  borderRadius: 8,
                  cursor: "pointer",
                  border: selected.has(t.id)
                    ? "1px solid rgba(240,180,41,0.35)"
                    : "1px solid rgba(255,255,255,0.06)",
                  transition: "background 0.15s",
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.has(t.id)}
                  onChange={() => toggle(t.id)}
                  style={{ accentColor: "#f0b429" }}
                />
                <span style={{ fontSize: "0.88rem" }}>{t.name}</span>
              </label>
            ))}
          </div>
          <button
            onClick={() => onSetRequirements(Array.from(selected))}
            style={{ ...goldBtn, marginTop: 14 }}
          >
            Save Requirements
          </button>
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
