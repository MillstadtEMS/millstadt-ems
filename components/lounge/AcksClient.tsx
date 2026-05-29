"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SignaturePad from "@/components/lounge/SignaturePad";
import LoungePageHeader from "@/components/lounge/LoungePageHeader";

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

export default function AcksClient() {
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

  if (!me) return <p style={{ color: "#94a3b8" }}>Loading…</p>;

  return (
    <div>
      <LoungePageHeader
        kicker="Eyes-on"
        title="Notices"
        description="Mark as read. Some require a formal acknowledgment that's recorded in your file."
        actions={
          me.isAdmin ? (
            <>
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
                + New notice
              </button>
            </>
          ) : null
        }
      />

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
          <h2 style={{ margin: 0, fontSize: "1rem" }}>Nothing pending.</h2>
          <p style={{ color: "#94a3b8", fontSize: "0.88rem", margin: "6px 0 0" }}>
            New notices from leadership will land here.
          </p>
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
      <div style={eyebrowStyle}>New notice</div>
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
          Post notice
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
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [thanks, setThanks] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ack.viewedAt) {
      fetch(`/api/lounge/acks/${ack.id}/view`, { method: "POST" })
        .then(() => onChange({ ...ack, viewedAt: new Date().toISOString() }))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ack.id]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    function check() {
      const e = bodyRef.current;
      if (!e) return;
      if (e.scrollHeight <= e.clientHeight + 4) { setScrolledToEnd(true); return; }
      if (e.scrollTop + e.clientHeight >= e.scrollHeight - 6) setScrolledToEnd(true);
    }
    check();
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [ack.body]);

  async function acknowledge() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/lounge/acks/${ack.id}/ack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ack.requiresAcknowledgment ? { signature } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || "Could not record acknowledgment.");
        return;
      }
      onChange({
        ...ack,
        acknowledgedAt: data.acknowledgedAt ?? new Date().toISOString(),
        viewedAt: ack.viewedAt ?? new Date().toISOString(),
      });
      setThanks(data?.employeeFirstName ?? "thank you");
      setSigning(false);
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
      <div
        ref={bodyRef}
        style={{
          color: "#e2e8f0",
          fontSize: "0.95rem",
          lineHeight: 1.6,
          marginTop: 10,
          whiteSpace: "pre-wrap",
          maxHeight: 320,
          overflowY: "auto",
          padding: "12px 14px",
          background: "#040d1a",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10,
        }}
      >
        {ack.body}
      </div>

      {needsAck && !scrolledToEnd && (
        <p style={{ color: "#fdba74", fontSize: 12, marginTop: 8, marginBottom: 0 }}>
          Scroll to the bottom of the notice to enable the Acknowledge button.
        </p>
      )}

      {needsAck && signing && (
        <div style={{ marginTop: 12, padding: 12, background: "#040d1a", border: "1px solid rgba(240,180,41,0.30)", borderRadius: 12 }}>
          <p style={{ color: "#cbd5e1", fontSize: 13, margin: "0 0 10px" }}>
            By signing, you confirm you read and acknowledge this notice. This signature
            is saved to your personnel file with a timestamp.
          </p>
          <SignaturePad value={signature} onChange={setSignature} label="Acknowledgment signature" height={140} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
            <button type="button" onClick={() => { setSigning(false); setSignature(null); }} style={ghostBtn}>Cancel</button>
            <button
              type="button"
              onClick={acknowledge}
              disabled={busy || !signature}
              style={{ ...goldBtn, opacity: busy || !signature ? 0.5 : 1 }}
            >
              {busy ? "Saving…" : "Sign & acknowledge"}
            </button>
          </div>
          {err && <p style={{ color: "#fca5a5", fontSize: 12, marginTop: 8, marginBottom: 0 }}>{err}</p>}
        </div>
      )}

      {thanks && (
        <div style={{
          marginTop: 12, padding: "12px 14px",
          background: "rgba(34,197,94,0.10)",
          border: "1px solid rgba(34,197,94,0.30)",
          borderRadius: 12,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <Image src="/images/millstadt-ems/crest.png" alt="" width={42} height={42} style={{ objectFit: "contain" }} />
          <div>
            <div style={{ color: "#86efac", fontSize: 11, fontWeight: 900, letterSpacing: "0.20em", textTransform: "uppercase" }}>
              Thank you, {thanks}
            </div>
            <div style={{ color: "#e2e8f0", fontSize: 13.5, marginTop: 2 }}>
              Your acknowledgment is recorded in your personnel file.
            </div>
          </div>
        </div>
      )}

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
          {needsAck && !signing && (
            <button
              type="button"
              onClick={() => setSigning(true)}
              disabled={busy || !scrolledToEnd}
              title={!scrolledToEnd ? "Scroll to the bottom of the notice first" : ""}
              style={{ ...goldBtn, opacity: busy || !scrolledToEnd ? 0.45 : 1, cursor: busy || !scrolledToEnd ? "not-allowed" : "pointer" }}
            >
              {scrolledToEnd ? "Acknowledge" : "Scroll to acknowledge"}
            </button>
          )}
          {me.isAdmin && (
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
      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <Link href={`/admin/notices/${ack.id}`} style={{ color: "#38bdf8", fontSize: 12, fontWeight: 800, textDecoration: "none", letterSpacing: "0.10em", textTransform: "uppercase" }}>
          See who acknowledged →
        </Link>
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

const eyebrowStyle: React.CSSProperties = {
  color: "#f0b429",
  fontSize: "0.7rem",
  fontWeight: 900,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
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
