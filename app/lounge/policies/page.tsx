"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "Operations",
  "Clinical",
  "HR",
  "Safety",
  "Equipment",
  "Administrative",
  "General",
] as const;
type Category = (typeof CATEGORIES)[number];

interface PolicyDoc { url: string; name: string; mime: string; size: number }
interface Policy {
  id: string;
  title: string;
  summary: string;
  category: Category;
  tags: string[];
  document: PolicyDoc | null;
  version: string | null;
  createdBy: { id: string; firstName: string; lastName: string };
  updatedBy: { id: string; firstName: string; lastName: string } | null;
  savedByMe: boolean;
  savedCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function PoliciesPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ id: string; isAdmin: boolean } | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "saved" | Category>("all");

  useEffect(() => {
    fetch("/api/lounge/me")
      .then(async (r) => {
        if (!r.ok) { router.push("/lounge/login"); return; }
        setMe((await r.json()).employee);
      })
      .catch(() => router.push("/lounge/login"));
  }, [router]);

  const load = useCallback(async () => {
    const r = await fetch("/api/lounge/policies");
    if (r.ok) setPolicies((await r.json()).policies);
    setLoading(false);
  }, []);
  useEffect(() => { if (me) load(); }, [me, load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return policies.filter((p) => {
      if (filter === "saved" && !p.savedByMe) return false;
      if (filter !== "all" && filter !== "saved" && p.category !== filter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [policies, query, filter]);

  async function toggleSave(id: string) {
    const res = await fetch(`/api/lounge/policies/${id}/save`, { method: "POST" });
    if (!res.ok) return;
    const { savedByMe, savedCount } = await res.json();
    setPolicies((s) => s.map((p) => (p.id === id ? { ...p, savedByMe, savedCount } : p)));
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this policy? The attached file will also be removed.")) return;
    const res = await fetch(`/api/lounge/policies/${id}`, { method: "DELETE" });
    if (res.ok) setPolicies((s) => s.filter((p) => p.id !== id));
  }

  async function onCreate(fd: FormData) {
    const res = await fetch("/api/lounge/policies", { method: "POST", body: fd });
    if (res.ok) {
      setComposing(false);
      load();
    } else {
      const e = await res.json().catch(() => ({}));
      alert(e.error ?? "Couldn't post policy");
    }
  }

  if (!me) return <div style={pageStyle}><p style={{ color: "#94a3b8" }}>Loading…</p></div>;

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <Link href="/lounge" style={backLinkStyle}>← Back to Lounge</Link>

        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 16, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={eyebrowStyle}>SOPs &amp; Reference</div>
            <h1 style={titleStyle}>Policies</h1>
            <p style={{ color: "#94a3b8", fontSize: "0.92rem", marginTop: 6 }}>
              Search the library. Save the ones you reference often.
            </p>
          </div>
          {me.isAdmin && (
            <button type="button" onClick={() => setComposing(true)} style={goldBtn}>+ Add Policy</button>
          )}
        </header>

        {composing && me.isAdmin && (
          <Composer onCancel={() => setComposing(false)} onCreate={onCreate} />
        )}

        <section style={{ marginTop: 18, display: "grid", gap: 10 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, summary, or tags…"
            style={inputStyle}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <FilterChip label="All" active={filter === "all"} onClick={() => setFilter("all")} />
            <FilterChip label="★ Saved" active={filter === "saved"} onClick={() => setFilter("saved")} />
            {CATEGORIES.map((c) => (
              <FilterChip key={c} label={c} active={filter === c} onClick={() => setFilter(c)} />
            ))}
          </div>
        </section>

        {loading ? (
          <p style={{ color: "#64748b", marginTop: 24 }}>Loading…</p>
        ) : visible.length === 0 ? (
          <div style={emptyStyle}>
            <div style={{ fontSize: "2rem" }}>📘</div>
            <h2 style={{ margin: "10px 0 0", fontSize: "1rem" }}>
              {policies.length === 0
                ? "No policies posted yet."
                : "Nothing matches your filters."}
            </h2>
          </div>
        ) : (
          <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
            {visible.map((p) => (
              <PolicyCard
                key={p.id}
                policy={p}
                me={me}
                onSave={() => toggleSave(p.id)}
                onDelete={() => onDelete(p.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        border: `1px solid ${active ? "#f0b429" : "rgba(255,255,255,0.10)"}`,
        background: active ? "rgba(240,180,41,0.15)" : "rgba(255,255,255,0.03)",
        color: active ? "#f0b429" : "#cbd5e1",
        fontSize: "0.72rem",
        fontWeight: 800,
        letterSpacing: "0.10em",
        textTransform: "uppercase",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {label}
    </button>
  );
}

function PolicyCard({
  policy,
  me,
  onSave,
  onDelete,
}: {
  policy: Policy;
  me: { id: string; isAdmin: boolean };
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <article
      style={{
        background: "#071428",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
        padding: "16px 18px",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: "1.02rem" }}>{policy.title}</span>
            <span style={categoryPillStyle}>{policy.category}</span>
            {policy.version && <span style={versionPillStyle}>v{policy.version}</span>}
          </div>
          {policy.summary && (
            <p style={{ color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.5, marginTop: 8, whiteSpace: "pre-wrap" }}>
              {policy.summary}
            </p>
          )}
          {policy.tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {policy.tags.map((t) => (
                <span key={t} style={tagPillStyle}>#{t}</span>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onSave}
          aria-label={policy.savedByMe ? "Unsave" : "Save"}
          style={{
            background: "transparent",
            border: 0,
            cursor: "pointer",
            color: policy.savedByMe ? "#f0b429" : "#475569",
            fontSize: "1.4rem",
            lineHeight: 1,
            padding: 4,
          }}
        >
          {policy.savedByMe ? "★" : "☆"}
        </button>
      </header>

      <footer
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ color: "#64748b", fontSize: "0.76rem" }}>
          {policy.updatedBy
            ? `Updated by ${policy.updatedBy.firstName} ${policy.updatedBy.lastName}`
            : `Posted by ${policy.createdBy.firstName} ${policy.createdBy.lastName}`}{" "}
          · {timeAgo(policy.updatedAt)}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {policy.document && (
            <a
              href={policy.document.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ ...goldBtn, textDecoration: "none", display: "inline-block" }}
            >
              Open Document
            </a>
          )}
          {me.isAdmin && (
            <button type="button" onClick={onDelete} style={{ ...ghostBtn, color: "#fca5a5" }}>
              Delete
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}

function Composer({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (fd: FormData) => void;
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState<Category>("General");
  const [tags, setTags] = useState("");
  const [version, setVersion] = useState("");
  const [file, setFile] = useState<File | null>(null);

  function submit() {
    const fd = new FormData();
    fd.set("title", title.trim());
    fd.set("summary", summary.trim());
    fd.set("category", category);
    fd.set("tags", tags);
    if (version.trim()) fd.set("version", version.trim());
    if (file) fd.set("file", file);
    onCreate(fd);
  }

  return (
    <section
      style={{
        marginTop: 16,
        background: "#071428",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: 16,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={eyebrowStyle}>New Policy</div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (e.g. Stretcher loading SOP)"
        style={inputStyle}
        autoFocus
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          style={{ ...inputStyle, width: "auto", flex: "1 1 200px" }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="Version (e.g. 2026.1)"
          style={{ ...inputStyle, flex: "1 1 200px" }}
        />
      </div>
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="Tags (comma-separated: stretcher, lifting, back-safety)"
        style={inputStyle}
      />
      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="Short summary. What does this cover and when does it apply?"
        rows={4}
        style={{ ...inputStyle, resize: "vertical", minHeight: 96, fontFamily: "inherit" }}
      />
      <label style={{ display: "grid", gap: 6, fontSize: "0.78rem", color: "#94a3b8" }}>
        Document (PDF preferred, ≤25 MB)
        <input
          type="file"
          accept="application/pdf,.doc,.docx,.txt,.md"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{ ...inputStyle, padding: 10 }}
        />
      </label>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel} style={ghostBtn}>Cancel</button>
        <button
          type="button"
          onClick={submit}
          disabled={!title.trim()}
          style={{ ...goldBtn, opacity: !title.trim() ? 0.5 : 1 }}
        >
          Post Policy
        </button>
      </div>
    </section>
  );
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const pageStyle: React.CSSProperties = {
  padding: "28px 18px 80px",
  minHeight: "100vh",
  background:
    "radial-gradient(900px 500px at 50% -10%, rgba(240,180,41,0.06), transparent 60%), #040d1a",
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
const eyebrowStyle: React.CSSProperties = {
  color: "#f0b429",
  fontSize: "0.7rem",
  fontWeight: 900,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
};
const titleStyle: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: "1.85rem",
  fontWeight: 900,
  letterSpacing: "-0.015em",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: "#040d1a",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 10,
  color: "white",
  fontSize: "0.95rem",
  outline: "none",
  fontFamily: "inherit",
};
const goldBtn: React.CSSProperties = {
  padding: "10px 16px",
  background: "#f0b429",
  color: "#040d1a",
  fontWeight: 900,
  fontSize: "0.74rem",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  borderRadius: 10,
  border: 0,
  cursor: "pointer",
  fontFamily: "inherit",
};
const ghostBtn: React.CSSProperties = {
  padding: "10px 14px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "white",
  borderRadius: 10,
  fontSize: "0.72rem",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  cursor: "pointer",
  fontFamily: "inherit",
};
const emptyStyle: React.CSSProperties = {
  marginTop: 28,
  padding: "44px 22px",
  textAlign: "center",
  background: "#071428",
  border: "1px dashed rgba(255,255,255,0.10)",
  borderRadius: 16,
};
const categoryPillStyle: React.CSSProperties = {
  fontSize: "0.6rem",
  fontWeight: 900,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  padding: "3px 8px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.06)",
  color: "#94a3b8",
};
const versionPillStyle: React.CSSProperties = {
  fontSize: "0.6rem",
  fontWeight: 900,
  letterSpacing: "0.14em",
  padding: "3px 8px",
  borderRadius: 999,
  background: "rgba(240,180,41,0.15)",
  color: "#f0b429",
};
const tagPillStyle: React.CSSProperties = {
  fontSize: "0.7rem",
  fontWeight: 600,
  padding: "3px 8px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.04)",
  color: "#94a3b8",
};
