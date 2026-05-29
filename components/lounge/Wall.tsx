"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The shift-to-shift Wall, rendered as an embedded section (no page chrome).
 * Identity is passed in as `me` instead of fetched, so it can live on the
 * /lounge home page alongside the sidebar shell. Logic mirrors the original
 * /lounge/feed page, minus the outer page wrapper + "Back to Lounge" link.
 */

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
  media: { url: string; kind: "image" | "video" | "file"; name?: string }[];
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

export interface WallMe {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  isAdmin: boolean;
}

export default function Wall({ me }: { me: WallMe }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const r = await fetch("/api/lounge/feed");
    if (r.ok) setPosts((await r.json()).posts);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function patchPost(updated: Post) {
    setPosts((s) => s.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function onCreate(body: string, media: { url: string; kind: "image" | "video" | "file"; name?: string }[]) {
    const res = await fetch("/api/lounge/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, media }),
    });
    if (res.ok) {
      const d = await res.json();
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
    if (res.ok) patchPost((await res.json()).post);
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

  return (
    <section
      style={{
        background:
          "radial-gradient(circle at 12% 0%, rgba(56,189,248,0.12), transparent 20rem), linear-gradient(180deg, #071428 0%, #040d1a 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 22,
        padding: "20px 22px 22px",
        boxShadow: "0 18px 50px rgba(0,0,0,0.24)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: "#f0b429", fontSize: "0.66rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Internal Social Feed
          </div>
          <h2 style={{ margin: "4px 0 0", fontSize: "1.35rem", fontWeight: 900, color: "white" }}>
            Shift-to-Shift Feed
          </h2>
        </div>
        <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>
          {posts.length} post{posts.length === 1 ? "" : "s"}
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
    </section>
  );
}

function Composer({
  me,
  onCreate,
}: {
  me: { firstName: string; lastName: string; photoUrl: string | null };
  onCreate: (body: string, media: { url: string; kind: "image" | "video" | "file"; name?: string }[]) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [media, setMedia] = useState<{ url: string; kind: "image" | "video" | "file"; name?: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function pickMedia() {
    fileRef.current?.click();
  }
  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const form = new FormData();
        form.append("file", f);
        const r = await fetch("/api/lounge/feed/media", { method: "POST", body: form });
        if (r.ok) {
          const d = await r.json();
          setMedia((s) => [...s, { url: d.url, kind: d.kind, name: d.name }]);
        }
      }
    } finally {
      setUploading(false);
    }
  }
  function removeMedia(url: string) {
    setMedia((s) => s.filter((m) => m.url !== url));
  }

  async function submit() {
    if ((!body.trim() && media.length === 0) || posting) return;
    setPosting(true);
    try {
      await onCreate(body.trim(), media);
      setBody("");
      setMedia([]);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 18,
        background: "rgba(2,9,18,0.72)",
        border: "1px solid rgba(240,180,41,0.18)",
        borderRadius: 18,
        padding: 16,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Avatar firstName={me.firstName} lastName={me.lastName} photoUrl={me.photoUrl} size={40} />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
          placeholder="What's going on this shift?"
          rows={3}
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.045)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 14,
            color: "white",
            padding: "12px 14px",
            fontSize: "0.95rem",
            outline: "none",
            fontFamily: "inherit",
            resize: "vertical",
            minHeight: 70,
          }}
        />
      </div>
      {media.length > 0 && (
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
          {media.map((m) => (
            <div key={m.url} style={{ position: "relative", background: "#020912", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden", height: 110 }}>
              {m.kind === "image" ? (
                <img src={m.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : m.kind === "video" ? (
                <video src={m.url} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ padding: 12, color: "#cbd5e1", fontSize: 12 }}>📎 {m.name ?? "file"}</div>
              )}
              <button type="button" onClick={() => removeMedia(m.url)} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.6)", border: 0, color: "white", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800, cursor: "pointer" }}>×</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            onClick={pickMedia}
            disabled={uploading}
            style={{ padding: "8px 12px", background: "#020912", border: "1px solid rgba(240,180,41,0.30)", color: "#f0b429", borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: uploading ? "wait" : "pointer", fontFamily: "inherit" }}
          >
            {uploading ? "Uploading…" : "📷 Photos / Videos"}
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*"
            style={{ display: "none" }}
            onChange={(e) => onFiles(e.target.files)}
          />
          <span style={{ color: "#64748b", fontSize: "0.72rem" }}>⌘+Enter to post</span>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={posting || (!body.trim() && media.length === 0)}
          style={{
            padding: "10px 18px",
            background: posting || (!body.trim() && media.length === 0) ? "rgba(240,180,41,0.4)" : "#f0b429",
            color: "#040d1a",
            fontWeight: 900,
            fontSize: "0.76rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            borderRadius: 10,
            border: 0,
            cursor: posting || (!body.trim() && media.length === 0) ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {posting ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}

function PostCard({
  post, me, onDelete, onPin, onSave, onReact,
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
        background: post.pinned
          ? "linear-gradient(135deg, rgba(240,180,41,0.10), rgba(56,189,248,0.04)), rgba(4,13,26,0.92)"
          : "rgba(4,13,26,0.84)",
        border: `1px solid ${post.pinned ? "rgba(240,180,41,0.34)" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 18,
        padding: "16px 18px",
        position: "relative",
        boxShadow: post.pinned ? "0 16px 36px rgba(240,180,41,0.08)" : "0 12px 30px rgba(0,0,0,0.16)",
      }}
    >
      {post.pinned && (
        <div style={{ position: "absolute", top: 10, right: 12, color: "#f0b429", fontSize: "0.6rem", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>
          📌 Pinned
        </div>
      )}

      <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar firstName={post.author.firstName} lastName={post.author.lastName} photoUrl={post.author.photoUrl} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: "0.92rem" }}>{post.author.firstName} {post.author.lastName}</span>
            {post.author.isAdmin && (
              <span style={{ fontSize: "0.55rem", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 999, background: "rgba(240,180,41,0.18)", color: "#f0b429", border: "1px solid rgba(240,180,41,0.30)" }}>
                Admin
              </span>
            )}
          </div>
          <div style={{ color: "#64748b", fontSize: "0.72rem", marginTop: 1 }}>
            {post.author.certification && <>{post.author.certification} · </>}
            {timeAgo(post.createdAt)}
          </div>
        </div>
      </header>

      <p style={{ whiteSpace: "pre-wrap", margin: "12px 0 0", fontSize: "0.95rem", lineHeight: 1.55, color: "#e2e8f0" }}>
        {post.body}
      </p>

      {post.media.length > 0 && (
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: post.media.length > 1 ? "repeat(auto-fit, minmax(160px, 1fr))" : "1fr", gap: 8 }}>
          {post.media.map((m, i) =>
            m.kind === "video" ? (
              <div key={i} style={{ display: "block", borderRadius: 10, overflow: "hidden", background: "#020912" }}>
                <video src={m.url} controls playsInline preload="metadata" style={{ width: "100%", display: "block", maxHeight: 420 }} />
              </div>
            ) : (
              <a key={i} href={m.url} target="_blank" rel="noreferrer" style={{ display: "block", borderRadius: 10, overflow: "hidden", background: "#020912" }}>
                {m.kind === "image" ? (
                  <img src={m.url} alt="" style={{ width: "100%", height: "auto", display: "block" }} />
                ) : (
                  <div style={{ padding: 14, color: "#cbd5e1", fontSize: "0.85rem" }}>📎 {m.name ?? "attachment"}</div>
                )}
              </a>
            ),
          )}
        </div>
      )}

      <footer style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        <ReactionPicker current={myReaction} reactions={post.reactions} onPick={(k) => onReact(myReaction === k ? null : k)} />
        <button type="button" onClick={() => setShowComments((v) => !v)} style={iconBtn} title="Comments">
          💬 <span style={{ marginLeft: 4, fontSize: "0.8rem" }}>{post.commentCount}</span>
        </button>
        <button type="button" onClick={onSave} style={{ ...iconBtn, color: post.savedByMe ? "#f0b429" : "#94a3b8" }} title={post.savedByMe ? "Unsave" : "Save"}>
          {post.savedByMe ? "🔖" : "🏷️"}
        </button>
        <div style={{ flex: 1 }} />
        {me.isAdmin && (
          <button type="button" onClick={onPin} style={ghostBtn}>{post.pinned ? "Unpin" : "Pin"}</button>
        )}
        {(post.author.id === me.id || me.isAdmin) && (
          <button type="button" onClick={onDelete} style={{ ...ghostBtn, color: "#fca5a5" }}>Delete</button>
        )}
      </footer>

      {showComments && <CommentSection postId={post.id} me={me} />}
    </article>
  );
}

function ReactionPicker({
  current, reactions, onPick,
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
      <button type="button" onClick={() => setOpen((v) => !v)} style={{ ...iconBtn, color: current ? "#f0b429" : "#94a3b8", fontSize: "1.05rem" }} title="React">
        {current ?? "😊"}
      </button>
      {topReactions.length > 0 && (
        <div style={{ display: "flex", gap: 4 }}>
          {topReactions.map(([kind, count]) => (
            <span key={kind} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999, padding: "3px 9px", fontSize: "0.78rem", color: "#cbd5e1" }}>
              {kind} {count}
            </span>
          ))}
        </div>
      )}
      {open && (
        <div style={{ position: "absolute", top: -52, left: 0, background: "#020912", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "6px 8px", display: "flex", gap: 4, zIndex: 10, boxShadow: "0 12px 28px rgba(0,0,0,0.55)" }}>
          {REACTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => { onPick(r); setOpen(false); }}
              style={{ background: "transparent", border: 0, fontSize: "1.15rem", cursor: "pointer", padding: "3px 6px", borderRadius: 6 }}
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

function CommentSection({
  postId, me,
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
      .then(async (r) => { if (r.ok) setComments((await r.json()).comments); })
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
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)", display: "grid", gap: 10 }}>
      {comments.map((c) => (
        <div key={c.id} style={{ display: "flex", gap: 10 }}>
          <Avatar firstName={c.author.firstName} lastName={c.author.lastName} photoUrl={c.author.photoUrl} size={26} />
          <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: "8px 12px", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, justifyContent: "space-between" }}>
              <span style={{ fontWeight: 800, fontSize: "0.83rem" }}>{c.author.firstName} {c.author.lastName}</span>
              <span style={{ color: "#64748b", fontSize: "0.7rem" }}>{timeAgo(c.createdAt)}</span>
            </div>
            <div style={{ color: "#e2e8f0", fontSize: "0.88rem", marginTop: 2, whiteSpace: "pre-wrap" }}>
              {c.body}
            </div>
            {(c.author.id === me.id || me.isAdmin) && (
              <button type="button" onClick={() => remove(c.id)} style={{ marginTop: 4, background: "transparent", color: "#64748b", border: 0, fontSize: "0.7rem", cursor: "pointer", padding: 0 }}>
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
            background: "#020912",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            color: "white",
            padding: "10px 14px",
            fontSize: "0.88rem",
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
            fontSize: "0.7rem",
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

function Avatar({
  firstName, lastName, photoUrl, size = 40,
}: {
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  size?: number;
}) {
  if (photoUrl) {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "1px solid rgba(255,255,255,0.10)" }}>
        <img src={photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "rgba(240,180,41,0.14)", border: "1px solid rgba(240,180,41,0.30)", color: "#f0b429", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: size <= 30 ? "0.7rem" : "0.85rem", flexShrink: 0 }}>
      {(firstName[0] + lastName[0]).toUpperCase()}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ marginTop: 20, textAlign: "center", padding: "36px 22px", background: "#040d1a", border: "1px dashed rgba(255,255,255,0.10)", borderRadius: 14 }}>
      <div style={{ fontSize: "1.6rem", marginBottom: 10 }}>📋</div>
      <h3 style={{ color: "white", margin: 0, fontSize: "1rem" }}>No posts yet. Be the first.</h3>
      <p style={{ color: "#94a3b8", fontSize: "0.86rem", marginTop: 6 }}>
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
  fontSize: "0.7rem",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 700,
  fontFamily: "inherit",
};
