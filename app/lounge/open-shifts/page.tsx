"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Resp {
  userId: string;
  firstName: string;
  lastName: string;
  certification: string | null;
  response: "available" | "unavailable";
  note: string | null;
  createdAt: string;
}
interface Shift {
  id: string;
  title: string;
  body: string;
  target: string;
  createdBy: { id: string; firstName: string; lastName: string };
  status: "open" | "awarded" | "canceled";
  awardedTo: { id: string; firstName: string; lastName: string } | null;
  awardedAt: string | null;
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
  responses: Resp[];
  myResponse: Resp | null;
}

export default function OpenShiftsPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ id: string; isAdmin: boolean } | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
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
    const r = await fetch("/api/lounge/open-shifts");
    if (r.ok) setShifts((await r.json()).shifts);
    setLoading(false);
  }, []);
  useEffect(() => { if (me) load(); }, [me, load]);

  function patch(updated: Shift) {
    setShifts((s) => s.map((x) => (x.id === updated.id ? updated : x)));
  }

  async function respond(id: string, response: "available" | "unavailable", note?: string) {
    const res = await fetch(`/api/lounge/open-shifts/${id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response, note }),
    });
    if (res.ok) patch((await res.json()).shift);
  }

  async function award(id: string, userId: string) {
    if (!confirm("Award this shift?")) return;
    const res = await fetch(`/api/lounge/open-shifts/${id}/award`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) patch((await res.json()).shift);
  }

  async function cancel(id: string) {
    if (!confirm("Cancel this shift?")) return;
    const res = await fetch(`/api/lounge/open-shifts/${id}/cancel`, { method: "POST" });
    if (res.ok) patch((await res.json()).shift);
  }

  async function remove(id: string) {
    if (!confirm("Delete this shift entirely? Cannot be undone.")) return;
    const res = await fetch(`/api/lounge/open-shifts/${id}`, { method: "DELETE" });
    if (res.ok) setShifts((s) => s.filter((x) => x.id !== id));
  }

  async function create(input: { title: string; body: string }) {
    const res = await fetch("/api/lounge/open-shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (res.ok) {
      setComposing(false);
      load();
    }
  }

  if (!me) return <div style={pageStyle}><p style={{ color: "#94a3b8" }}>Loading…</p></div>;

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Link href="/lounge" style={backLinkStyle}>← Back to Lounge</Link>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 16, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={eyebrowStyle}>Need Coverage</div>
            <h1 style={titleStyle}>Open Shifts</h1>
            <p style={{ color: "#94a3b8", fontSize: "0.92rem", marginTop: 6 }}>
              See what needs covering. Mark yourself available — admin awards.
            </p>
          </div>
          {me.isAdmin && (
            <button type="button" onClick={() => setComposing(true)} style={goldBtn}>+ Post Shift</button>
          )}
        </header>

        {composing && <Composer onCancel={() => setComposing(false)} onCreate={create} />}

        {loading ? (
          <p style={{ color: "#64748b", marginTop: 24 }}>Loading…</p>
        ) : shifts.length === 0 ? (
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
            <div style={{ fontSize: "2rem" }}>🪑</div>
            <h2 style={{ margin: "10px 0 0", fontSize: "1rem" }}>No open shifts right now.</h2>
          </div>
        ) : (
          <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
            {shifts.map((s) => (
              <ShiftCard
                key={s.id}
                shift={s}
                me={me}
                onRespond={(r, n) => respond(s.id, r, n)}
                onAward={(uid) => award(s.id, uid)}
                onCancel={() => cancel(s.id)}
                onDelete={() => remove(s.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Composer({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (input: { title: string; body: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
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
      <div style={eyebrowStyle}>Post New Shift</div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (e.g. Sat 6/14 — 0600–1800 medic on m3935)"
        style={inputStyle}
        autoFocus
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Details, cert level required, anything else"
        rows={4}
        style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", minHeight: 100 }}
      />
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button type="button" onClick={onCancel} style={ghostBtn}>Cancel</button>
        <button
          type="button"
          onClick={() => onCreate({ title: title.trim(), body: body.trim() })}
          disabled={!title.trim() || !body.trim()}
          style={{ ...goldBtn, opacity: !title.trim() || !body.trim() ? 0.5 : 1 }}
        >
          Post Shift
        </button>
      </div>
    </section>
  );
}

function ShiftCard({
  shift,
  me,
  onRespond,
  onAward,
  onCancel,
  onDelete,
}: {
  shift: Shift;
  me: { id: string; isAdmin: boolean };
  onRespond: (r: "available" | "unavailable", note?: string) => void;
  onAward: (uid: string) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const isOpen = shift.status === "open";
  const available = shift.responses.filter((r) => r.response === "available");
  const accent =
    shift.status === "awarded" ? "#22c55e"
    : shift.status === "canceled" ? "#64748b"
    : "#f0b429";

  return (
    <article
      style={{
        background: "#071428",
        border: "1px solid rgba(255,255,255,0.06)",
        borderLeft: `4px solid ${accent}`,
        borderRadius: 14,
        padding: "16px 18px",
        opacity: shift.status === "canceled" ? 0.6 : 1,
      }}
    >
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: "1.02rem" }}>{shift.title}</div>
          <div style={{ color: "#94a3b8", fontSize: "0.78rem", marginTop: 2 }}>
            Posted by {shift.createdBy.firstName} {shift.createdBy.lastName} · {timeAgo(shift.createdAt)}
          </div>
        </div>
        <StatusPill status={shift.status} awardedTo={shift.awardedTo} />
      </header>
      <p style={{ color: "#e2e8f0", fontSize: "0.93rem", lineHeight: 1.55, marginTop: 10, whiteSpace: "pre-wrap" }}>
        {shift.body}
      </p>

      {/* User response controls */}
      {isOpen && (
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => onRespond("available")}
            style={{
              ...goldBtn,
              background: shift.myResponse?.response === "available" ? "#22c55e" : "#f0b429",
              color: "#040d1a",
            }}
          >
            {shift.myResponse?.response === "available" ? "✓ Available" : "I'm Available"}
          </button>
          <button
            type="button"
            onClick={() => onRespond("unavailable")}
            style={{
              ...ghostBtn,
              background: shift.myResponse?.response === "unavailable" ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.05)",
              color: shift.myResponse?.response === "unavailable" ? "#fca5a5" : "#94a3b8",
            }}
          >
            Unavailable
          </button>
        </div>
      )}

      {/* Response list */}
      {shift.responses.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ color: "#94a3b8", fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
            Responses ({available.length} available)
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {shift.responses.map((r) => (
              <div
                key={r.userId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 10,
                  borderLeft: `3px solid ${r.response === "available" ? "#22c55e" : "#64748b"}`,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                    {r.firstName} {r.lastName}
                  </div>
                  <div style={{ color: r.response === "available" ? "#86efac" : "#94a3b8", fontSize: "0.75rem", marginTop: 2 }}>
                    {r.response === "available" ? "✓ Available" : "✗ Unavailable"}
                    {r.certification && ` · ${r.certification}`}
                  </div>
                </div>
                {isOpen && me.isAdmin && r.response === "available" && (
                  <button type="button" onClick={() => onAward(r.userId)} style={{ ...goldBtn, padding: "8px 12px", fontSize: "0.68rem" }}>
                    Award
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin row */}
      {me.isAdmin && (
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          {isOpen && (
            <button type="button" onClick={onCancel} style={ghostBtn}>Cancel Shift</button>
          )}
          <button type="button" onClick={onDelete} style={{ ...ghostBtn, color: "#fca5a5" }}>Delete</button>
        </div>
      )}
    </article>
  );
}

function StatusPill({
  status,
  awardedTo,
}: {
  status: Shift["status"];
  awardedTo: Shift["awardedTo"];
}) {
  const map: Record<Shift["status"], { bg: string; color: string; label: string }> = {
    open: { bg: "rgba(240,180,41,0.18)", color: "#f0b429", label: "OPEN" },
    awarded: { bg: "rgba(34,197,94,0.18)", color: "#86efac", label: awardedTo ? `AWARDED → ${awardedTo.firstName} ${awardedTo.lastName}` : "AWARDED" },
    canceled: { bg: "rgba(148,163,184,0.18)", color: "#cbd5e1", label: "CANCELED" },
  };
  const s = map[status];
  return (
    <span
      style={{
        fontSize: "0.62rem",
        fontWeight: 900,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        padding: "4px 10px",
        borderRadius: 999,
        background: s.bg,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
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
