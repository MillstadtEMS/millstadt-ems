"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Author {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
}
interface Ack {
  id: string;
  title: string;
  body: string;
  category: string;
  createdBy: Author;
  requiresAcknowledgment: boolean;
  attachment: { uri: string | null; name: string | null; type: string | null };
  createdAt: string;
  updatedAt: string;
  viewedAt?: string | null;
  acknowledgedAt?: string | null;
  totalEmployees?: number;
  viewedCount?: number;
  acknowledgedCount?: number;
}

const CATEGORIES = ["General", "Safety", "Policy", "Schedule", "Equipment", "Emergency"];

export default function AcksPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ id: string; isAdmin: boolean } | null>(null);
  const [acks, setAcks] = useState<Ack[]>([]);
  const [view, setView] = useState<"mine" | "admin">("mine");
  const [composing, setComposing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/lounge/me")
      .then(async (r) => {
        if (!r.ok) { router.push("/lounge/login"); return; }
        setMe((await r.json()).employee);
      })
      .catch(() => router.push("/lounge/login"));
  }, [router]);

  const load = useCallback(async () => {
    const url = view === "admin" ? "/api/lounge/acks?admin=1" : "/api/lounge/acks";
    const r = await fetch(url);
    if (r.ok) setAcks((await r.json()).acks);
    setLoading(false);
  }, [view]);
  useEffect(() => { if (me) load(); }, [me, load]);

  async function onCreate(input: {
    title: string;
    body: string;
    category: string;
    requiresAcknowledgment: boolean;
  }) {
    const res = await fetch("/api/lounge/acks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (res.ok) {
      setComposing(false);
      load();
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this notice?")) return;
    const res = await fetch(`/api/lounge/acks/${id}`, { method: "DELETE" });
    if (res.ok) setAcks((s) => s.filter((a) => a.id !== id));
  }

  if (!me) return <div style={pageStyle}><p style={{ color: "#94a3b8" }}>Loading…</p></div>;

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Link href="/lounge" style={backLinkStyle}>← Back to Lounge</Link>

        <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 16, gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={eyebrowStyle}>Eyes-On</div>
            <h1 style={titleStyle}>Notices</h1>
            <p style={{ color: "#94a3b8", fontSize: "0.92rem", marginTop: 6 }}>
              Mark as read. Some require a formal acknowledgment.
            </p>
          </div>
          {me.isAdmin && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setView(view === "mine" ? "admin" : "mine")}
                style={ghostBtn}
              >
                {view === "mine" ? "Admin view" : "My view"}
              </button>
              <button
                type="button"
                onClick={() => setComposing(true)}
                style={goldBtn}
              >
                + New Notice
              </button>
            </div>
          )}
        </header>

        {composing && (
          <Composer
            onCancel={() => setComposing(false)}
            onCreate={onCreate}
          />
        )}

        {loading ? (
          <p style={{ color: "#64748b", marginTop: 24 }}>Loading…</p>
        ) : acks.length === 0 ? (
          <div
            style={{
              marginTop: 28,
              padding: "44px 22px",
              textAlign: "center",
              background: "#071428",
              border: "1px dashed rgba(255,255,255,0.10)",
              borderRadius: 16,
            }}
          >
            <div style={{ fontSize: "2rem" }}>📋</div>
            <h2 style={{ margin: "10px 0 0", fontSize: "1rem" }}>No notices.</h2>
          </div>
        ) : (
          <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
            {acks.map((a) =>
              view === "admin" ? (
                <AdminAckRow key={a.id} ack={a} onDelete={() => onDelete(a.id)} />
              ) : (
                <UserAckCard
                  key={a.id}
                  ack={a}
                  me={me}
                  onChange={(updated) =>
                    setAcks((s) => s.map((x) => (x.id === updated.id ? updated : x)))
                  }
                  onDelete={() => onDelete(a.id)}
                />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Composer ────────────────────────────────────────────────────────────

function Composer({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (input: { title: string; body: string; category: string; requiresAcknowledgment: boolean }) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("General");
  const [requiresAck, setRequiresAck] = useState(true);

  return (
    <section
      style={{
        marginTop: 18,
        background: "#071428",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: 16,
        display: "grid",
        gap: 10,
      }}
    >
      <div style={eyebrowStyle}>New Notice</div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (e.g. New stretcher loading procedure)"
        style={inputStyle}
        autoFocus
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        style={{ ...inputStyle, width: "auto" }}
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Details. Be specific about what changed and what crew needs to do."
        rows={5}
        style={{ ...inputStyle, resize: "vertical", minHeight: 110, fontFamily: "inherit" }}
      />
      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.9rem" }}>
        <input
          type="checkbox"
          checked={requiresAck}
          onChange={(e) => setRequiresAck(e.target.checked)}
          style={{ accentColor: "#f0b429" }}
        />
        Require formal acknowledgment (recorded per employee)
      </label>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel} style={ghostBtn}>Cancel</button>
        <button
          type="button"
          onClick={() => onCreate({ title: title.trim(), body: body.trim(), category, requiresAcknowledgment: requiresAck })}
          disabled={!title.trim() || !body.trim()}
          style={{ ...goldBtn, opacity: !title.trim() || !body.trim() ? 0.5 : 1 }}
        >
          Post Notice
        </button>
      </div>
    </section>
  );
}

// ── User card ───────────────────────────────────────────────────────────

function UserAckCard({
  ack,
  me,
  onChange,
  onDelete,
}: {
  ack: Ack;
  me: { id: string; isAdmin: boolean };
  onChange: (updated: Ack) => void;
  onDelete: () => void;
}) {
  const [busy, setBusy] = useState(false);

  // Auto-mark viewed when first rendered (one-shot per session per ack).
  useEffect(() => {
    if (!ack.viewedAt) {
      fetch(`/api/lounge/acks/${ack.id}/view`, { method: "POST" })
        .then(() => onChange({ ...ack, viewedAt: new Date().toISOString() }))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ack.id]);

  async function acknowledge() {
    setBusy(true);
    try {
      const res = await fetch(`/api/lounge/acks/${ack.id}/ack`, { method: "POST" });
      if (res.ok) onChange({ ...ack, acknowledgedAt: new Date().toISOString(), viewedAt: ack.viewedAt ?? new Date().toISOString() });
    } finally {
      setBusy(false);
    }
  }

  const needsAck = ack.requiresAcknowledgment && !ack.acknowledgedAt;
  const accent = needsAck ? "#ef4444" : ack.acknowledgedAt ? "#22c55e" : "#f0b429";

  return (
    <article
      style={{
        background: "#071428",
        border: `1px solid ${needsAck ? "rgba(239,68,68,0.30)" : "rgba(255,255,255,0.06)"}`,
        borderLeft: `4px solid ${accent}`,
        borderRadius: 14,
        padding: "16px 18px",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 800, fontSize: "1rem" }}>{ack.title}</span>
        <span
          style={{
            fontSize: "0.55rem",
            fontWeight: 900,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            padding: "2px 7px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.06)",
            color: "#94a3b8",
          }}
        >
          {ack.category}
        </span>
        {ack.acknowledgedAt && (
          <span
            style={{
              fontSize: "0.55rem",
              fontWeight: 900,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              padding: "2px 7px",
              borderRadius: 999,
              background: "rgba(34,197,94,0.18)",
              color: "#86efac",
            }}
          >
            ✓ Acknowledged
          </span>
        )}
      </header>
      <p style={{ color: "#e2e8f0", fontSize: "0.92rem", lineHeight: 1.55, marginTop: 8, whiteSpace: "pre-wrap" }}>
        {ack.body}
      </p>
      <footer
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span style={{ color: "#64748b", fontSize: "0.78rem" }}>
          Posted by {ack.createdBy.firstName} {ack.createdBy.lastName} · {timeAgo(ack.createdAt)}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {needsAck && (
            <button
              type="button"
              onClick={acknowledge}
              disabled={busy}
              style={{ ...goldBtn, opacity: busy ? 0.6 : 1 }}
            >
              Acknowledge
            </button>
          )}
          {(ack.createdBy.id === me.id || me.isAdmin) && (
            <button type="button" onClick={onDelete} style={{ ...ghostBtn, color: "#fca5a5" }}>Delete</button>
          )}
        </div>
      </footer>
    </article>
  );
}

// ── Admin row ───────────────────────────────────────────────────────────

function AdminAckRow({ ack, onDelete }: { ack: Ack; onDelete: () => void }) {
  const total = ack.totalEmployees ?? 0;
  const ackd = ack.acknowledgedCount ?? 0;
  const viewed = ack.viewedCount ?? 0;
  const pct = total > 0 ? Math.round((ackd / total) * 100) : 0;
  const complete = ack.requiresAcknowledgment ? ackd === total : viewed === total;

  return (
    <article
      style={{
        background: "#071428",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
        padding: "14px 18px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>{ack.title}</div>
          <div style={{ color: "#94a3b8", fontSize: "0.78rem", marginTop: 2 }}>
            {ack.category} · {timeAgo(ack.createdAt)}
          </div>
        </div>
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 900,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            padding: "4px 10px",
            borderRadius: 999,
            background: complete ? "rgba(34,197,94,0.16)" : "rgba(240,180,41,0.16)",
            color: complete ? "#86efac" : "#f0b429",
          }}
        >
          {ack.requiresAcknowledgment
            ? `${ackd}/${total} ack'd (${pct}%)`
            : `${viewed}/${total} viewed`}
        </span>
      </div>
      <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
        <button type="button" onClick={onDelete} style={{ ...ghostBtn, color: "#fca5a5" }}>Delete</button>
      </div>
    </article>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

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
