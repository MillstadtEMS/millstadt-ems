"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Author {
  id: string;
  firstName: string;
  lastName: string;
  certification: string | null;
  photoUrl: string | null;
  isAdmin: boolean;
}
interface Reaction {
  userId: string;
  kind: string;
  firstName: string;
  lastName: string;
}
interface Post {
  id: string;
  author: Author;
  body: string;
  media: { url: string; kind: "image" | "file"; name?: string }[];
  pinned: boolean;
  highlighted: boolean;
  savedByMe: boolean;
  reactions: Reaction[];
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}
interface Comment {
  id: string;
  postId: string;
  author: Author;
  body: string;
  createdAt: string;
}

const REACTIONS = ["👍", "❤️", "👀", "🚑", "🔥", "🙏"];

export default function FeedPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ id: string; firstName: string; lastName: string; photoUrl: string | null; isAdmin: boolean } | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/lounge/me")
      .then(async (r) => {
        if (!r.ok) { router.push("/lounge/login"); return; }
        const d = await r.json();
        setMe(d.employee);
      })
      .catch(() => router.push("/lounge/login"));
  }, [router]);

  const load = useCallback(async () => {
    const r = await fetch("/api/lounge/feed");
    if (r.ok) setPosts((await r.json()).posts);
    setLoading(false);
  }, []);
  useEffect(() => { if (me) load(); }, [me, load]);

  function patchPost(updated: Post) {
    setPosts((s) => s.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function onCreate(body: string) {
    const res = await fetch("/api/lounge/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.ok) {
      const d = await res.json();
      // Always prepend; pinned-first ordering happens on next refresh.
      setPosts((s) => [d.post, ...s]);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this post?")) return;
    const res = await fetch(`/api/lounge/feed/${id}`, { method: "DELETE" });
    if (res.ok) setPosts((s) => s.filter((p) => p.id !== id));
  }

  async function onPin(id: string, pinned: boolean) {
    const res = await fetch(`/api/lounge/feed/${id}/pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned }),
    });
    if (res.ok) {
      const d = await res.json();
      patchPost(d.post);
    }
  }

  async function onSave(id: string) {
    const res = await fetch(`/api/lounge/feed/${id}/save`, { method: "POST" });
    if (res.ok) patchPost((await res.json()).post);
  }

  async function onReact(id: string, kind: string | null) {
    const res = await fetch(`/api/lounge/feed/${id}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    if (res.ok) patchPost((await res.json()).post);
  }

  if (!me) {
    return <div style={pageStyle}><p style={{ color: "#94a3b8" }}>Loading…</p></div>;
  }

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link href="/lounge" style={backLinkStyle}>← Back to Lounge</Link>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 16 }}>
          <h1 style={titleStyle}>The Wall</h1>
          <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
            Shift-to-shift • {posts.length} post{posts.length === 1 ? "" : "s"}
          </span>
        </div>

        <Composer me={me} onCreate={onCreate} />

        {loading ? (
          <p style={{ color: "#64748b", marginTop: 24 }}>Loading feed…</p>
        ) : posts.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                me={me}
                onDelete={() => onDelete(p.id)}
                onPin={() => onPin(p.id, !p.pinned)}
                onSave={() => onSave(p.id)}
                onReact={(k) => onReact(p.id, k)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Composer ────────────────────────────────────────────────────────────

function Composer({
  me,
  onCreate,
}: {
  me: { firstName: string; lastName: string; photoUrl: string | null };
  onCreate: (body: string) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  async function submit() {
    if (!body.trim() || posting) return;
    setPosting(true);
    try {
      await onCreate(body.trim());
      setBody("");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 18,
        background: "#071428",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Avatar
          firstName={me.firstName}
          lastName={me.lastName}
          photoUrl={me.photoUrl}
          size={40}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder="What's going on this shift?"
          rows={3}
          style={{
            flex: 1,
            background: "#040d1a",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 12,
            color: "white",
            padding: "12px 14px",
            fontSize: "0.95rem",
            outline: "none",
            fontFamily: "inherit",
            resize: "vertical",
            minHeight: 80,
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 10,
        }}
      >
        <span style={{ color: "#64748b", fontSize: "0.75rem" }}>
          ⌘+Enter to post
        </span>
        <button
          type="button"
          onClick={submit}
          disabled={posting || !body.trim()}
          style={{
            padding: "10px 18px",
            background: posting || !body.trim() ? "rgba(240,180,41,0.4)" : "#f0b429",
            color: "#040d1a",
            fontWeight: 900,
            fontSize: "0.78rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            borderRadius: 10,
            border: 0,
            cursor: posting || !body.trim() ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {posting ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}

// ── Post Card ───────────────────────────────────────────────────────────

function PostCard({
  post,
  me,
  onDelete,
  onPin,
  onSave,
  onReact,
}: {
  post: Post;
  me: { id: string; isAdmin: boolean };
  onDelete: () => void;
  onPin: () => void;
  onSave: () => void;
  onReact: (k: string | null) => void;
}) {
  const myReaction = post.reactions.find((r) => r.userId === me.id)?.kind ?? null;
  const [showComments, setShowComments] = useState(false);

  return (
    <article
      style={{
        background: post.pinned ? "rgba(240,180,41,0.05)" : "#071428",
        border: `1px solid ${post.pinned ? "rgba(240,180,41,0.30)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 16,
        padding: "16px 18px",
        position: "relative",
      }}
    >
      {post.pinned && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 14,
            color: "#f0b429",
            fontSize: "0.6rem",
            fontWeight: 900,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          📌 Pinned
        </div>
      )}

      <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar
          firstName={post.author.firstName}
          lastName={post.author.lastName}
          photoUrl={post.author.photoUrl}
          size={40}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>
              {post.author.firstName} {post.author.lastName}
            </span>
            {post.author.isAdmin && (
              <span
                style={{
                  fontSize: "0.55rem",
                  fontWeight: 900,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: "rgba(240,180,41,0.18)",
                  color: "#f0b429",
                  border: "1px solid rgba(240,180,41,0.30)",
                }}
              >
                Admin
              </span>
            )}
          </div>
          <div style={{ color: "#64748b", fontSize: "0.75rem", marginTop: 1 }}>
            {post.author.certification && <>{post.author.certification} · </>}
            {timeAgo(post.createdAt)}
          </div>
        </div>
      </header>

      <p
        style={{
          whiteSpace: "pre-wrap",
          margin: "12px 0 0",
          fontSize: "0.97rem",
          lineHeight: 1.55,
          color: "#e2e8f0",
        }}
      >
        {post.body}
      </p>

      {post.media.length > 0 && (
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: post.media.length > 1 ? "repeat(auto-fit, minmax(160px, 1fr))" : "1fr",
            gap: 8,
          }}
        >
          {post.media.map((m, i) => (
            <a
              key={i}
              href={m.url}
              target="_blank"
              rel="noreferrer"
              style={{ display: "block", borderRadius: 10, overflow: "hidden", background: "#040d1a" }}
            >
              {m.kind === "image" ? (
                <img
                  src={m.url}
                  alt=""
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              ) : (
                <div style={{ padding: 14, color: "#cbd5e1", fontSize: "0.85rem" }}>
                  📎 {m.name ?? "attachment"}
                </div>
              )}
            </a>
          ))}
        </div>
      )}

      {/* Action bar */}
      <footer
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          gap: 4,
          flexWrap: "wrap",
        }}
      >
        <ReactionPicker
          current={myReaction}
          reactions={post.reactions}
          onPick={(k) => onReact(myReaction === k ? null : k)}
        />
        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          style={iconBtn}
          title="Comments"
        >
          💬 <span style={{ marginLeft: 4, fontSize: "0.8rem" }}>{post.commentCount}</span>
        </button>
        <button
          type="button"
          onClick={onSave}
          style={{
            ...iconBtn,
            color: post.savedByMe ? "#f0b429" : "#94a3b8",
          }}
          title={post.savedByMe ? "Unsave" : "Save"}
        >
          {post.savedByMe ? "🔖" : "🏷️"}
        </button>
        <div style={{ flex: 1 }} />
        {me.isAdmin && (
          <button type="button" onClick={onPin} style={ghostBtn}>
            {post.pinned ? "Unpin" : "Pin"}
          </button>
        )}
        {(post.author.id === me.id || me.isAdmin) && (
          <button type="button" onClick={onDelete} style={{ ...ghostBtn, color: "#fca5a5" }}>
            Delete
          </button>
        )}
      </footer>

      {showComments && <CommentSection postId={post.id} me={me} />}
    </article>
  );
}

function ReactionPicker({
  current,
  reactions,
  onPick,
}: {
  current: string | null;
  reactions: Reaction[];
  onPick: (kind: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const counts = new Map<string, number>();
  for (const r of reactions) counts.set(r.kind, (counts.get(r.kind) ?? 0) + 1);
  const topReactions = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 6 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          ...iconBtn,
          color: current ? "#f0b429" : "#94a3b8",
          fontSize: "1.1rem",
        }}
        title="React"
      >
        {current ?? "😊"}
      </button>
      {topReactions.length > 0 && (
        <div style={{ display: "flex", gap: 4 }}>
          {topReactions.map(([kind, count]) => (
            <span
              key={kind}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 999,
                padding: "3px 9px",
                fontSize: "0.78rem",
                color: "#cbd5e1",
              }}
            >
              {kind} {count}
            </span>
          ))}
        </div>
      )}
      {open && (
        <div
          style={{
            position: "absolute",
            top: -52,
            left: 0,
            background: "#040d1a",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 999,
            padding: "6px 8px",
            display: "flex",
            gap: 4,
            zIndex: 10,
            boxShadow: "0 12px 28px rgba(0,0,0,0.55)",
          }}
        >
          {REACTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => { onPick(r); setOpen(false); }}
              style={{
                background: "transparent",
                border: 0,
                fontSize: "1.2rem",
                cursor: "pointer",
                padding: "3px 6px",
                borderRadius: 6,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Comments ────────────────────────────────────────────────────────────

function CommentSection({
  postId,
  me,
}: {
  postId: string;
  me: { id: string; isAdmin: boolean };
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/lounge/feed/${postId}/comments`)
      .then(async (r) => {
        if (r.ok) setComments((await r.json()).comments);
      })
      .catch(() => {});
  }, [postId]);

  async function submit() {
    if (!body.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/lounge/feed/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (res.ok) {
        const d = await res.json();
        setComments((s) => [...s, d.comment]);
        setBody("");
        inputRef.current?.focus();
      }
    } finally {
      setPosting(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/lounge/feed/comments/${id}`, { method: "DELETE" });
    if (res.ok) setComments((s) => s.filter((c) => c.id !== id));
  }

  return (
    <div
      style={{
        marginTop: 14,
        paddingTop: 14,
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "grid",
        gap: 10,
      }}
    >
      {comments.map((c) => (
        <div key={c.id} style={{ display: "flex", gap: 10 }}>
          <Avatar
            firstName={c.author.firstName}
            lastName={c.author.lastName}
            photoUrl={c.author.photoUrl}
            size={28}
          />
          <div
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.03)",
              borderRadius: 12,
              padding: "8px 12px",
              minWidth: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, justifyContent: "space-between" }}>
              <span style={{ fontWeight: 800, fontSize: "0.85rem" }}>
                {c.author.firstName} {c.author.lastName}
              </span>
              <span style={{ color: "#64748b", fontSize: "0.7rem" }}>{timeAgo(c.createdAt)}</span>
            </div>
            <div style={{ color: "#e2e8f0", fontSize: "0.9rem", marginTop: 2, whiteSpace: "pre-wrap" }}>
              {c.body}
            </div>
            {(c.author.id === me.id || me.isAdmin) && (
              <button
                type="button"
                onClick={() => remove(c.id)}
                style={{
                  marginTop: 4,
                  background: "transparent",
                  color: "#64748b",
                  border: 0,
                  fontSize: "0.7rem",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          ref={inputRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="Write a comment…"
          style={{
            flex: 1,
            background: "#040d1a",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 10,
            color: "white",
            padding: "10px 14px",
            fontSize: "0.9rem",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={posting || !body.trim()}
          style={{
            padding: "10px 16px",
            background: posting || !body.trim() ? "rgba(240,180,41,0.4)" : "#f0b429",
            color: "#040d1a",
            fontWeight: 900,
            fontSize: "0.72rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            borderRadius: 10,
            border: 0,
            cursor: posting || !body.trim() ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function Avatar({
  firstName,
  lastName,
  photoUrl,
  size = 40,
}: {
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  size?: number;
}) {
  if (photoUrl) {
    return (
      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <Image src={photoUrl} alt="" fill sizes={`${size}px`} style={{ objectFit: "cover" }} />
      </div>
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "rgba(240,180,41,0.14)",
        border: "1px solid rgba(240,180,41,0.30)",
        color: "#f0b429",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        fontSize: size <= 30 ? "0.7rem" : "0.85rem",
        flexShrink: 0,
      }}
    >
      {(firstName[0] + lastName[0]).toUpperCase()}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        marginTop: 30,
        textAlign: "center",
        padding: "44px 22px",
        background: "#071428",
        border: "1px dashed rgba(255,255,255,0.10)",
        borderRadius: 16,
      }}
    >
      <div style={{ fontSize: "2rem", marginBottom: 10 }}>📋</div>
      <h2 style={{ color: "white", margin: 0, fontSize: "1.05rem" }}>
        No posts yet. Be the first.
      </h2>
      <p style={{ color: "#94a3b8", fontSize: "0.88rem", marginTop: 6 }}>
        Drop a shift handoff, ask the next crew a question, or share something the team should know.
      </p>
    </div>
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
const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.85rem",
  fontWeight: 900,
  letterSpacing: "-0.015em",
};
const iconBtn: React.CSSProperties = {
  background: "transparent",
  border: 0,
  color: "#94a3b8",
  cursor: "pointer",
  padding: "6px 10px",
  borderRadius: 8,
  fontSize: "0.95rem",
  display: "inline-flex",
  alignItems: "center",
  fontFamily: "inherit",
};
const ghostBtn: React.CSSProperties = {
  background: "transparent",
  border: 0,
  color: "#94a3b8",
  cursor: "pointer",
  padding: "6px 10px",
  fontSize: "0.72rem",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 700,
  fontFamily: "inherit",
};
