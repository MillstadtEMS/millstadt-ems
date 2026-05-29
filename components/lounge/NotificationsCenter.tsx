"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SEEN_STORAGE_KEY = "lounge:notif-last-seen-id";

function readSeenId(): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(SEEN_STORAGE_KEY); } catch { return null; }
}
function writeSeenId(id: string) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(SEEN_STORAGE_KEY, id); } catch { /* ignore */ }
}

interface NotificationRow {
  id: string;
  kind: "post" | "mention" | "message" | "comment";
  title: string;
  bodyPreview: string;
  linkUrl: string;
  sourceId: string | null;
  actor: { id: string; firstName: string; lastName: string; photoUrl: string | null } | null;
  readAt: string | null;
  createdAt: string;
}

const KIND_META: Record<NotificationRow["kind"], { emoji: string; color: string }> = {
  post:    { emoji: "📰", color: "#7dd3fc" },
  mention: { emoji: "@",  color: "#f0b429" },
  message: { emoji: "💬", color: "#a78bfa" },
  comment: { emoji: "↩",  color: "#fcd34d" },
};

/**
 * Background poller + bottom-right toast. Mounted globally in LoungeShell
 * via NotificationsBell + NotificationsToast. The bell shows the unread
 * badge in the sidebar; the toast pops the most recent unseen item.
 */
export function useNotifications() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  // Last-seen ID must live in STATE (not a ref) so dismissing the toast
  // triggers a re-render. Persisted to localStorage so it survives reloads
  // and stays in sync between the toast (in LoungeShell) and the list page
  // — both instances of this hook read from the same storage key.
  const [lastSeenId, setLastSeenId] = useState<string | null>(() => readSeenId());

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/lounge/notifications");
      if (!r.ok) return;
      const d = await r.json();
      setItems(Array.isArray(d.notifications) ? d.notifications : []);
      setUnread(typeof d.unread === "number" ? d.unread : 0);
      // Pick up dismissals made by other hook instances since last poll.
      const fromStorage = readSeenId();
      if (fromStorage) setLastSeenId((cur) => (cur === fromStorage ? cur : fromStorage));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    // Cross-instance sync: if another hook instance dismisses the toast, it
    // writes to localStorage and a `storage` event fires on this tab too
    // (when written from a different document) or we re-check via poll/visibility.
    const onStorage = (e: StorageEvent) => {
      if (e.key === SEEN_STORAGE_KEY && e.newValue) setLastSeenId(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
    };
  }, [load]);

  // Detect a brand-new notification since the last seen one for the toast.
  const newest = items[0] ?? null;
  const isNewSinceLast = Boolean(newest && !newest.readAt && newest.id !== lastSeenId);
  const markToastSeen = useCallback(() => {
    if (!newest) return;
    writeSeenId(newest.id);
    setLastSeenId(newest.id);
  }, [newest]);

  async function markAllRead() {
    await fetch("/api/lounge/notifications/read-all", { method: "POST" });
    setUnread(0);
    setItems((s) => s.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    // Marking everything read should also dismiss any pending toast.
    if (newest) { writeSeenId(newest.id); setLastSeenId(newest.id); }
  }

  async function markOne(id: string) {
    await fetch(`/api/lounge/notifications/${id}/read`, { method: "POST" });
    setItems((s) => s.map((n) => n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n));
    setUnread((c) => Math.max(0, c - 1));
    if (newest && id === newest.id) { writeSeenId(id); setLastSeenId(id); }
  }

  return { items, unread, newest, isNewSinceLast, markToastSeen, markAllRead, markOne, reload: load };
}

/** Persistent bottom-right toast when a fresh notification arrives. */
export function NotificationsToast() {
  const { newest, isNewSinceLast, markToastSeen } = useNotifications();
  const pathname = usePathname() || "";
  // While the user is sitting on the notifications page, the toast is just
  // noise — dismiss it automatically.
  useEffect(() => {
    if (pathname.startsWith("/lounge/notifications") && isNewSinceLast) {
      markToastSeen();
    }
  }, [pathname, isNewSinceLast, markToastSeen]);
  if (!isNewSinceLast || !newest) return null;
  const meta = KIND_META[newest.kind];
  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: "calc(env(safe-area-inset-bottom) + 84px)",
        zIndex: 9000,
        maxWidth: 320,
        background: "rgba(2,9,18,0.96)",
        backdropFilter: "saturate(160%) blur(10px)",
        border: `1px solid ${meta.color}66`,
        borderLeft: `4px solid ${meta.color}`,
        borderRadius: 14,
        padding: "12px 14px",
        boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
        color: "white",
        animation: "lounge-toast-in 220ms ease-out",
      }}
      onClick={markToastSeen}
    >
      <style>{`
        @keyframes lounge-toast-in {
          from { opacity: 0; transform: translate3d(0, 14px, 0); }
          to   { opacity: 1; transform: translate3d(0, 0, 0); }
        }
      `}</style>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ fontSize: 22 }} aria-hidden>{meta.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 13.5 }}>{newest.title}</div>
          {newest.bodyPreview && (
            <div style={{ color: "#cbd5e1", fontSize: 12.5, marginTop: 3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {newest.bodyPreview}
            </div>
          )}
          <Link
            href={newest.linkUrl}
            onClick={markToastSeen}
            style={{ display: "inline-block", marginTop: 6, color: meta.color, fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textDecoration: "none" }}
          >
            Open →
          </Link>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); markToastSeen(); }}
          aria-label="Dismiss"
          style={{ background: "transparent", border: 0, color: "#94a3b8", fontSize: 18, cursor: "pointer", padding: "0 4px", fontFamily: "inherit" }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function NotificationsList() {
  const { items, unread, markAllRead, markOne } = useNotifications();
  return (
    <div>
      <header style={{ marginBottom: 18 }}>
        <div style={{ color: "#f0b429", fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          Notifications
        </div>
        <h1 style={{ margin: "4px 0 6px", fontSize: "1.85rem", fontWeight: 900, letterSpacing: "-0.015em" }}>
          What you&apos;ve missed
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 14, color: "#94a3b8", fontSize: 13 }}>
          <span>{unread} unread</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              style={{ background: "transparent", border: "1px solid rgba(240,180,41,0.30)", color: "#f0b429", padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit" }}
            >
              Mark all read
            </button>
          )}
        </div>
      </header>

      {items.length === 0 ? (
        <p style={{ color: "#64748b", fontSize: 14 }}>No notifications yet.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {items.map((n) => {
            const meta = KIND_META[n.kind];
            return (
              <li key={n.id}>
                <Link
                  href={n.linkUrl}
                  onClick={() => markOne(n.id)}
                  style={{
                    display: "flex", gap: 12, alignItems: "flex-start",
                    padding: "12px 14px",
                    background: n.readAt ? "rgba(7,20,40,0.45)" : "#071428",
                    border: `1px solid ${n.readAt ? "rgba(255,255,255,0.06)" : `${meta.color}55`}`,
                    borderLeft: `4px solid ${meta.color}`,
                    borderRadius: 14, color: "white", textDecoration: "none",
                  }}
                >
                  <span style={{ fontSize: 22 }} aria-hidden>{meta.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>{n.title}</div>
                    {n.bodyPreview && (
                      <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 3, whiteSpace: "pre-wrap" }}>{n.bodyPreview}</div>
                    )}
                    <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {!n.readAt && (
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: meta.color, flexShrink: 0, marginTop: 6 }} />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
