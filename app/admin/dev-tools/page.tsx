"use client";

/**
 * Admin · Dev Tools
 *
 * Central hub for testing employee-facing flows against the synthetic
 * "Test User" account so leadership can confirm a feature works
 * without spamming a real employee with mock write-ups, forms, or
 * acknowledgments.
 *
 * Each action button calls the same admin API a real flow would, but
 * with the target employee hard-pinned to the @testuser account on
 * the server side (see the linked route handlers).
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface TestUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string | null;
  certification: string | null;
  position: string | null;
}

export default function DevToolsPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ isAdmin: boolean } | null>(null);
  const [tu, setTu] = useState<TestUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/lounge/me").then(async (r) => {
      if (!r.ok) { router.push("/lounge/login"); return; }
      const d = await r.json();
      if (!d.employee?.isAdmin) { router.push("/lounge"); return; }
      setMe(d.employee);
    });
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/dev/test-user", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setTu(d.employee ?? null);
    } else {
      setTu(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (me) load(); }, [me, load]);

  async function reset() {
    if (!tu) return;
    if (!window.confirm("Wipe ALL test-user write-ups, forms, acks, notifications, onboarding, and profile-change requests?")) return;
    setBusy("reset"); setStatus(null);
    const r = await fetch("/api/admin/dev/test-user/reset", { method: "POST" });
    setBusy(null);
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setStatus({ kind: "err", text: d?.error ?? "Reset failed." }); return; }
    const summary = Object.entries(d.counts as Record<string, number>)
      .filter(([, n]) => (n as number) > 0)
      .map(([k, n]) => `${k}: ${n}`)
      .join(", ") || "nothing to delete";
    setStatus({ kind: "ok", text: `Test user wiped clean. (${summary})` });
  }

  async function ackTestNotice() {
    if (!tu) return;
    setBusy("ack"); setStatus(null);
    try {
      const r = await fetch("/api/admin/acks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Dev test notice",
          body: "This is a dev-tools test acknowledgment. Visible only to the @testuser dummy account.",
          requiresAcknowledgment: true,
          targetKind: "explicit",
          targetEmployeeIds: [tu.id],
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setStatus({ kind: "err", text: d?.error ?? "Ack push failed." }); return; }
      setStatus({ kind: "ok", text: "Acknowledgment pushed to Test User only." });
    } finally { setBusy(null); }
  }

  async function sendTestNotification() {
    if (!tu) return;
    setBusy("notif"); setStatus(null);
    try {
      const r = await fetch("/api/admin/dev/test-user/notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Dev-tools test notification",
          body: "If you can see this in the @testuser bell, notifications work end-to-end.",
        }),
      });
      if (!r.ok) {
        // Fall back: hit the generic admin route for arbitrary notifs
        // if/when it exists. For now just surface a clear "no route yet".
        setStatus({ kind: "err", text: "Notification route not built yet. (Coming soon.)" });
        return;
      }
      setStatus({ kind: "ok", text: "Bell notification queued for Test User." });
    } finally { setBusy(null); }
  }

  if (!me) return <p style={{ color: "#94a3b8", padding: 22 }}>Loading…</p>;

  return (
    <div>
      <header style={{ marginBottom: 18 }}>
        <div style={{ color: "#a78bfa", fontSize: 11, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          Admin · Dev tools
        </div>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.85rem", fontWeight: 900, letterSpacing: "-0.015em" }}>
          Test against the dummy account
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "0.92rem", marginTop: 4, lineHeight: 1.55 }}>
          Push forms, write-ups, acknowledgments, and notifications to the synthetic <strong>@testuser</strong> account
          so you can verify the employee-facing experience without spamming real crew. The dev-login PIN (set under
          Vercel env) drops you straight into that account with no 2FA.
        </p>
      </header>

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Loading test user…</p>
      ) : !tu ? (
        <div style={emptyCard}>
          <h2 style={{ color: "white", fontSize: 18, fontWeight: 900, margin: 0 }}>No test user found</h2>
          <p style={{ color: "#94a3b8", marginTop: 6, fontSize: 13 }}>
            Run <code style={code}>npx tsx scripts/ensure-test-user.ts</code> locally with the production
            <code style={code}>DATABASE_URL</code> to create the dummy account.
          </p>
        </div>
      ) : (
        <>
          <section style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "#34d399", fontSize: 10, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>Dummy account</div>
                <div style={{ color: "white", fontSize: 18, fontWeight: 900, marginTop: 4 }}>{tu.firstName} {tu.lastName}</div>
                <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
                  @{tu.username}{tu.certification ? ` · ${tu.certification}` : ""}{tu.position ? ` · ${tu.position}` : ""}
                </div>
                {tu.email && <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>{tu.email}</div>}
              </div>
              <Link
                href={`/admin/employees/${tu.id}`}
                style={ghostBtn}
              >
                Open profile →
              </Link>
            </div>
          </section>

          {status && (
            <div style={{ padding: 12, borderRadius: 10, fontSize: 13, marginBottom: 12, background: status.kind === "ok" ? "rgba(16,185,129,0.12)" : "rgba(248,113,113,0.12)", color: status.kind === "ok" ? "#34d399" : "#fca5a5" }}>
              {status.text}
            </div>
          )}

          <section style={card}>
            <h2 style={cardTitle}>Send to test user</h2>
            <p style={cardHelp}>Each button targets only the @testuser account. Real crew won't see any of it.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 10 }}>
              <Link
                href={`/admin/forms?targetTest=1`}
                style={primaryBtn}
              >
                Push a form
              </Link>
              <Link
                href={`/admin/employees/${tu.id}/writeups/new`}
                style={primaryBtn}
              >
                Start a write-up
              </Link>
              <button
                type="button"
                onClick={ackTestNotice}
                disabled={busy !== null}
                style={primaryBtn}
              >
                {busy === "ack" ? "Sending…" : "Push test acknowledgment"}
              </button>
              <button
                type="button"
                onClick={sendTestNotification}
                disabled={busy !== null}
                style={primaryBtn}
              >
                {busy === "notif" ? "Sending…" : "Drop a bell notification"}
              </button>
            </div>
          </section>

          <section style={card}>
            <h2 style={cardTitle}>Reset</h2>
            <p style={cardHelp}>
              Wipe every dummy-account artifact so the next test run starts from zero.
              This does NOT touch any real employee record.
            </p>
            <button
              type="button"
              onClick={reset}
              disabled={busy !== null}
              style={dangerBtn}
            >
              {busy === "reset" ? "Wiping…" : "Wipe test user clean"}
            </button>
          </section>

          <section style={card}>
            <h2 style={cardTitle}>Dev login</h2>
            <p style={cardHelp}>
              At <Link href="/lounge/login" style={{ color: "#f0b429" }}>/lounge/login</Link> the
              <strong> Dev Shortcut</strong> card lets you skip 2FA with PIN <code style={code}>95723935</code>.
              Pick <strong>Employee</strong> to drop straight into the @testuser account.
            </p>
            <p style={cardHelp}>
              The dev-login UI + endpoint are gated on these Vercel env vars (set both, then redeploy):
            </p>
            <ul style={{ color: "#cbd5e1", fontSize: 13, marginTop: 6, paddingLeft: 18 }}>
              <li><code style={code}>LOUNGE_DEV_LOGIN = 1</code></li>
              <li><code style={code}>NEXT_PUBLIC_LOUNGE_DEV_LOGIN = 1</code></li>
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "16px 18px", marginBottom: 12,
};
const emptyCard: React.CSSProperties = {
  background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "32px 24px", textAlign: "center" as const,
};
const cardTitle: React.CSSProperties = {
  color: "#f0b429", fontSize: 11, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 4px",
};
const cardHelp: React.CSSProperties = {
  color: "#cbd5e1", fontSize: 13, lineHeight: 1.55, margin: "0 0 4px",
};
const primaryBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  background: "#f0b429", color: "#040d1a", border: 0, padding: "10px 16px",
  borderRadius: 10, fontWeight: 900, fontSize: 12, letterSpacing: "0.12em",
  textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", textDecoration: "none",
};
const dangerBtn: React.CSSProperties = {
  background: "rgba(248,113,113,0.16)", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.35)", padding: "10px 16px", borderRadius: 10, fontWeight: 900, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit",
};
const ghostBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)", color: "#cbd5e1", border: "1px solid rgba(255,255,255,0.10)", padding: "8px 12px", borderRadius: 10, fontWeight: 800, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", textDecoration: "none",
};
const code: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
  background: "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: 4, fontSize: 11.5,
};
