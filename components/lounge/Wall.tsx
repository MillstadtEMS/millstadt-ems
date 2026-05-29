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
  position: string | null;
  photoUrl: string | null;
  isAdmin: boolean;
}
interface Reaction {
  userId: string;
  kind: string;
  firstName: string;
  lastName: string;
}
interface Mention { id: string; firstName: string; lastName: string }
interface Post {
  id: string;
  author: Author;
  body: string;
  subject: string | null;
  mentions: Mention[];
  media: { url: string; kind: "image" | "video" | "file"; name?: string }[];
  pinned: boolean;
  highlighted: boolean;
  savedByMe: boolean;
  reactions: Reaction[];
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

interface RosterMember { id: string; firstName: string; lastName: string }

const WALL_SUBJECT_TAGS = [
  "Agency announcements",
  "New hires",
  "Promotions",
  "Clinical saves",
  "Training photos",
  "Community event photos",
  "Equipment updates",
  "Message from the Chief",
  "Shift highlights",
  "Recognition posts",
] as const;
type WallSubjectTag = (typeof WALL_SUBJECT_TAGS)[number];

const SUBJECT_COLORS: Record<string, { fg: string; bg: string; border: string }> = {
  "Agency announcements":     { fg: "#f0b429", bg: "rgba(240,180,41,0.12)", border: "rgba(240,180,41,0.35)" },
  "New hires":                { fg: "#86efac", bg: "rgba(134,239,172,0.12)", border: "rgba(134,239,172,0.35)" },
  "Promotions":               { fg: "#a78bfa", bg: "rgba(167,139,250,0.14)", border: "rgba(167,139,250,0.35)" },
  "Clinical saves":           { fg: "#fb7185", bg: "rgba(251,113,133,0.14)", border: "rgba(251,113,133,0.35)" },
  "Training photos":          { fg: "#7dd3fc", bg: "rgba(125,211,252,0.12)", border: "rgba(125,211,252,0.35)" },
  "Community event photos":   { fg: "#fcd34d", bg: "rgba(252,211,77,0.12)", border: "rgba(252,211,77,0.35)" },
  "Equipment updates":        { fg: "#fdba74", bg: "rgba(253,186,116,0.12)", border: "rgba(253,186,116,0.35)" },
  "Message from the Chief":   { fg: "#fecaca", bg: "rgba(254,202,202,0.10)", border: "rgba(254,202,202,0.35)" },
  "Shift highlights":         { fg: "#a5f3fc", bg: "rgba(165,243,252,0.10)", border: "rgba(165,243,252,0.35)" },
  "Recognition posts":        { fg: "#fef3c7", bg: "rgba(254,243,199,0.10)", border: "rgba(254,243,199,0.35)" },
};
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
  const [filterSubject, setFilterSubject] = useState<WallSubjectTag | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/lounge/feed");
    if (r.ok) setPosts((await r.json()).posts);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  function patchPost(updated: Post) {
    setPosts((s) => s.map((p) => (p.id === updated.id ? updated : p)));
  }

  async function onCreate(
    body: string,
    media: { url: string; kind: "image" | "video" | "file"; name?: string }[],
    subject: WallSubjectTag | null,
    mentions: string[],
  ) {
    const res = await fetch("/api/lounge/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, media, subject, mentions }),
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
          "linear-gradient(180deg, rgba(7,20,40,0.96), rgba(4,13,26,0.98))",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 18,
        padding: "14px",
        boxShadow: "0 12px 34px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div>
          <div style={{ color: "#f0b429", fontSize: "0.66rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
            Internal Social Feed
          </div>
          <h2 style={{ margin: "4px 0 0", fontSize: "1.08rem", fontWeight: 900, color: "white" }}>
            Shift-to-Shift Feed
          </h2>
        </div>
        <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>
          {posts.length} post{posts.length === 1 ? "" : "s"}
        </span>
      </div>

      <Composer me={me} onCreate={onCreate} />

      <SubjectFilterBar value={filterSubject} onChange={setFilterSubject} posts={posts} />

      {loading ? (
        <p style={{ color: "#64748b", marginTop: 24 }}>Loading feed…</p>
      ) : (() => {
        const visible = filterSubject
          ? posts.filter((p) => p.subject === filterSubject)
          : posts;
        if (visible.length === 0) {
          return filterSubject ? (
            <p style={{ color: "#64748b", marginTop: 16, fontSize: 13 }}>
              No posts tagged <strong style={{ color: "#cbd5e1" }}>{filterSubject}</strong> yet.
            </p>
          ) : <EmptyState />;
        }
        return (
          <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
            {visible.map((p) => (
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
        );
      })()}
    </section>
  );
}

function SubjectFilterBar({
  value,
  onChange,
  posts,
}: {
  value: WallSubjectTag | null;
  onChange: (v: WallSubjectTag | null) => void;
  posts: Post[];
}) {
  const counts = WALL_SUBJECT_TAGS.reduce<Record<string, number>>((acc, t) => {
    acc[t] = posts.filter((p) => p.subject === t).length;
    return acc;
  }, {});
  return (
    <div style={{ marginTop: 14, marginBottom: 4 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => onChange(null)}
          style={subjectChipStyle(value === null, "#94a3b8")}
        >
          All posts
        </button>
        {WALL_SUBJECT_TAGS.map((t) => {
          const c = counts[t];
          if (c === 0) return null;
          const colors = SUBJECT_COLORS[t];
          return (
            <button
              key={t}
              type="button"
              onClick={() => onChange(value === t ? null : t)}
              style={subjectChipStyle(value === t, colors.fg)}
            >
              {t} · {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function subjectChipStyle(active: boolean, color: string): React.CSSProperties {
  return {
    padding: "5px 11px",
    background: active ? color : "transparent",
    color: active ? "#040d1a" : color,
    border: `1px solid ${active ? color : `${color}66`}`,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.06em",
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

function Composer({
  me,
  onCreate,
}: {
  me: WallMe;
  onCreate: (
    body: string,
    media: { url: string; kind: "image" | "video" | "file"; name?: string }[],
    subject: WallSubjectTag | null,
    mentions: string[],
  ) => Promise<void>;
}) {
  return <ComposerInner me={me} onCreate={onCreate} />;
}

function ComposerInner({
  me,
  onCreate,
}: {
  me: { firstName: string; lastName: string; photoUrl: string | null };
  onCreate: (
    body: string,
    media: { url: string; kind: "image" | "video" | "file"; name?: string }[],
    subject: WallSubjectTag | null,
    mentions: string[],
  ) => Promise<void>;
}) {
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [media, setMedia] = useState<{ url: string; kind: "image" | "video" | "file"; name?: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [subject, setSubject] = useState<WallSubjectTag | null>(null);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [mentioned, setMentioned] = useState<RosterMember[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionAnchor, setMentionAnchor] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch("/api/lounge/roster")
      .then((r) => r.ok ? r.json() : { employees: [] })
      .then((d) => setRoster(Array.isArray(d.employees) ? d.employees : []));
  }, []);

  // Watch for @… mention triggers in the textarea
  function onBodyChange(value: string) {
    setBody(value);
    const ta = textareaRef.current;
    if (!ta) return;
    const caret = ta.selectionStart ?? value.length;
    // Look back from caret for the most recent @
    const beforeCaret = value.slice(0, caret);
    const atIdx = beforeCaret.lastIndexOf("@");
    if (atIdx === -1) { setMentionQuery(null); return; }
    // Only trigger if @ is at start or after whitespace
    if (atIdx > 0 && !/\s/.test(beforeCaret[atIdx - 1])) { setMentionQuery(null); return; }
    const between = beforeCaret.slice(atIdx + 1);
    if (/\s/.test(between)) { setMentionQuery(null); return; }
    if (between.length > 30) { setMentionQuery(null); return; }
    setMentionQuery(between.toLowerCase());
    setMentionAnchor(atIdx);
  }

  const mentionMatches = mentionQuery === null
    ? []
    : roster
        .filter((r) => `${r.firstName} ${r.lastName}`.toLowerCase().includes(mentionQuery))
        .slice(0, 6);

  function pickMention(r: RosterMember) {
    const ta = textareaRef.current;
    const before = body.slice(0, mentionAnchor);
    const after = body.slice((ta?.selectionStart ?? body.length));
    const display = `@${r.firstName} ${r.lastName}`;
    const next = `${before}${display} ${after}`;
    setBody(next);
    setMentioned((s) => (s.find((m) => m.id === r.id) ? s : [...s, r]));
    setMentionQuery(null);
    // Restore caret after the inserted mention
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      const pos = (before + display + " ").length;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(pos, pos);
    });
  }

  async function pickMedia() {
    fileRef.current?.click();
  }
  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      // Client-side upload via signed token — required for any file over
      // ~4MB (phone videos especially), since Vercel's function body cap
      // refuses larger multipart POSTs.
      const { upload } = await import("@vercel/blob/client");
      for (const f of Array.from(files)) {
        try {
          const pathname = `lounge-wall/${Date.now()}-${(f.name || "upload").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100)}`;
          const blob = await upload(pathname, f, {
            access: "public",
            handleUploadUrl: "/api/lounge/feed/media",
            contentType: f.type || undefined,
            clientPayload: JSON.stringify({ mime: f.type || "" }),
            multipart: true,
          });
          const kind = (f.type || "").startsWith("video/")
            ? "video"
            : (f.type || "").startsWith("image/")
              ? "image"
              : /\.(mp4|mov|webm|m4v|3gp|avi)$/i.test(f.name)
                ? "video"
                : "image";
          setMedia((s) => [...s, { url: blob.url, kind, name: f.name }]);
        } catch (e) {
          console.error("[wall upload]", e);
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
      // Only count mentions whose @First Last is still in the body
      // text — if the user typed @ then deleted it, we shouldn't ping.
      const liveMentions = mentioned.filter((m) =>
        body.includes(`@${m.firstName} ${m.lastName}`)
      );
      await onCreate(body.trim(), media, subject, liveMentions.map((m) => m.id));
      setBody("");
      setMedia([]);
      setSubject(null);
      setMentioned([]);
      setMentionQuery(null);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 12,
        background: "rgba(2,9,18,0.54)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 14,
        padding: 12,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", position: "relative" }}>
        <Avatar firstName={me.firstName} lastName={me.lastName} photoUrl={me.photoUrl} size={40} />
        <div style={{ flex: 1, position: "relative" }}>
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && mentionQuery !== null) { setMentionQuery(null); return; }
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder="What's going on this shift? Type @ to tag someone."
            rows={2}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.045)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 14,
              color: "white",
              padding: "12px 14px",
              fontSize: "0.95rem",
              outline: "none",
              fontFamily: "inherit",
              resize: "vertical",
              minHeight: 58,
            }}
          />
          {mentionMatches.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, zIndex: 30,
              background: "#040d1a", border: "1px solid rgba(240,180,41,0.30)", borderRadius: 12,
              boxShadow: "0 14px 30px rgba(0,0,0,0.45)", padding: 4, maxHeight: 240, overflowY: "auto",
            }}>
              {mentionMatches.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => pickMention(m)}
                  style={{ display: "flex", width: "100%", gap: 10, alignItems: "center", padding: "8px 10px", background: "transparent", border: 0, color: "white", textAlign: "left", cursor: "pointer", borderRadius: 8, fontFamily: "inherit" }}
                  onMouseOver={(e) => (e.currentTarget.style.background = "rgba(240,180,41,0.10)")}
                  onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontSize: 13, fontWeight: 800 }}>{m.firstName} {m.lastName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
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
      <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
        <div style={{ color: "#94a3b8", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Subject (optional)
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {WALL_SUBJECT_TAGS.map((t) => {
            const colors = SUBJECT_COLORS[t];
            const active = subject === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setSubject(active ? null : t)}
                style={{
                  padding: "4px 10px",
                  background: active ? colors.fg : "transparent",
                  color: active ? "#040d1a" : colors.fg,
                  border: `1px solid ${active ? colors.fg : `${colors.fg}66`}`,
                  borderRadius: 999,
                  fontSize: 10.5,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>
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
            {(post.author.position ?? post.author.certification) && (
              <>{post.author.position ?? post.author.certification} · </>
            )}
            {timeAgo(post.createdAt)}
          </div>
        </div>
      </header>

      {post.subject && SUBJECT_COLORS[post.subject] && (
        <span
          style={{
            display: "inline-block",
            marginTop: 10,
            padding: "3px 9px",
            background: SUBJECT_COLORS[post.subject].bg,
            color: SUBJECT_COLORS[post.subject].fg,
            border: `1px solid ${SUBJECT_COLORS[post.subject].border}`,
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
          }}
        >
          {post.subject}
        </span>
      )}

      <p style={{ whiteSpace: "pre-wrap", margin: "12px 0 0", fontSize: "0.95rem", lineHeight: 1.55, color: "#e2e8f0" }}>
        {renderBodyWithMentions(post.body, post.mentions)}
      </p>

      {post.media.length > 0 && (() => {
        const isSingle = post.media.length === 1;
        // Facebook-style: single image fills the post column but is capped
        // to a sane viewing height with the rest letterboxed against a dark
        // backdrop. Grids of 2+ stay square-ish thumbnails.
        const gridCols = isSingle ? "1fr" : "repeat(auto-fit, minmax(160px, 1fr))";
        const imgStyle: React.CSSProperties = isSingle
          ? { width: "100%", maxHeight: 480, height: "auto", objectFit: "contain", display: "block" }
          : { width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" };
        const videoStyle: React.CSSProperties = isSingle
          ? { width: "100%", maxHeight: 480, display: "block" }
          : { width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" };
        return (
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: gridCols, gap: 8 }}>
            {post.media.map((m, i) =>
              m.kind === "video" ? (
                <div key={i} style={{ display: "block", borderRadius: 10, overflow: "hidden", background: "#020912" }}>
                  <video src={m.url} controls playsInline preload="metadata" style={videoStyle} />
                </div>
              ) : (
                <a key={i} href={m.url} target="_blank" rel="noreferrer" style={{ display: "block", borderRadius: 10, overflow: "hidden", background: "#020912" }}>
                  {m.kind === "image" ? (
                    <img src={m.url} alt="" style={imgStyle} />
                  ) : (
                    <div style={{ padding: 14, color: "#cbd5e1", fontSize: "0.85rem" }}>📎 {m.name ?? "attachment"}</div>
                  )}
                </a>
              ),
            )}
          </div>
        );
      })()}

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
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [mentioned, setMentioned] = useState<RosterMember[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionAnchor, setMentionAnchor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/lounge/feed/${postId}/comments`)
      .then(async (r) => { if (r.ok) setComments((await r.json()).comments); })
      .catch(() => {});
    fetch("/api/lounge/roster").then((r) => r.ok ? r.json() : { employees: [] }).then((d) => setRoster(Array.isArray(d.employees) ? d.employees : []));
  }, [postId]);

  function onBodyChange(value: string) {
    setBody(value);
    const el = inputRef.current;
    if (!el) return;
    const caret = el.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const atIdx = before.lastIndexOf("@");
    if (atIdx === -1) { setMentionQuery(null); return; }
    if (atIdx > 0 && !/\s/.test(before[atIdx - 1])) { setMentionQuery(null); return; }
    const between = before.slice(atIdx + 1);
    if (/\s/.test(between)) { setMentionQuery(null); return; }
    if (between.length > 30) { setMentionQuery(null); return; }
    setMentionQuery(between.toLowerCase());
    setMentionAnchor(atIdx);
  }

  function pickMention(r: RosterMember) {
    const el = inputRef.current;
    const before = body.slice(0, mentionAnchor);
    const after = body.slice(el?.selectionStart ?? body.length);
    const display = `@${r.firstName} ${r.lastName}`;
    const next = `${before}${display} ${after}`;
    setBody(next);
    setMentioned((s) => s.find((m) => m.id === r.id) ? s : [...s, r]);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      if (!inputRef.current) return;
      const pos = (before + display + " ").length;
      inputRef.current.focus();
      inputRef.current.setSelectionRange(pos, pos);
    });
  }

  const mentionMatches = mentionQuery === null
    ? []
    : roster
        .filter((r) => `${r.firstName} ${r.lastName}`.toLowerCase().includes(mentionQuery))
        .slice(0, 6);

  async function submit() {
    if (!body.trim() || posting) return;
    setPosting(true);
    try {
      const liveMentions = mentioned.filter((m) => body.includes(`@${m.firstName} ${m.lastName}`));
      const res = await fetch(`/api/lounge/feed/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), mentions: liveMentions.map((m) => m.id) }),
      });
      if (res.ok) {
        const d = await res.json();
        setComments((s) => [...s, d.comment]);
        setBody("");
        setMentioned([]);
        setMentionQuery(null);
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
              {renderBodyWithMentions(c.body, roster.map((r) => ({ id: r.id, firstName: r.firstName, lastName: r.lastName })))}
            </div>
            {(c.author.id === me.id || me.isAdmin) && (
              <button type="button" onClick={() => remove(c.id)} style={{ marginTop: 4, background: "transparent", color: "#64748b", border: 0, fontSize: "0.7rem", cursor: "pointer", padding: 0 }}>
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, position: "relative" }}>
        {mentionMatches.length > 0 && (
          <div style={{
            position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 0, zIndex: 30,
            background: "#040d1a", border: "1px solid rgba(240,180,41,0.30)", borderRadius: 12,
            boxShadow: "0 14px 30px rgba(0,0,0,0.45)", padding: 4, maxHeight: 240, overflowY: "auto",
          }}>
            {mentionMatches.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => pickMention(m)}
                style={{ display: "flex", width: "100%", gap: 10, alignItems: "center", padding: "8px 10px", background: "transparent", border: 0, color: "white", textAlign: "left", cursor: "pointer", borderRadius: 8, fontFamily: "inherit", fontSize: 13, fontWeight: 800 }}
              >
                {m.firstName} {m.lastName}
              </button>
            ))}
          </div>
        )}
        <input
          ref={inputRef}
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && mentionQuery !== null) { setMentionQuery(null); return; }
            if (e.key === "Enter" && mentionQuery === null) submit();
          }}
          placeholder="Write a comment… (@ to tag)"
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
    <div style={{ marginTop: 14, textAlign: "center", padding: "26px 18px", background: "#040d1a", border: "1px dashed rgba(255,255,255,0.10)", borderRadius: 14 }}>
      <div style={{ fontSize: "1.35rem", marginBottom: 8 }}>📋</div>
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

// ── @-mention rendering ─────────────────────────────────────────────────
// Splits the body on every matching "@First Last" substring and wraps
// each hit in a highlighted span. Mentions are matched by exact display
// name; if someone hand-types "@John" without picking John from the
// suggest list, no highlight — that's intentional (avoids false hits).
function renderBodyWithMentions(body: string, mentions: { id: string; firstName: string; lastName: string }[]) {
  if (!mentions || mentions.length === 0) return body;
  // Build a regex that matches any of the mention display names.
  const names = Array.from(new Set(mentions.map((m) => `@${m.firstName} ${m.lastName}`)));
  if (names.length === 0) return body;
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "g");
  const parts = body.split(re);
  return parts.map((part, i) => {
    const m = mentions.find((mm) => `@${mm.firstName} ${mm.lastName}` === part);
    if (!m) return <span key={i}>{part}</span>;
    return (
      <span
        key={i}
        style={{
          color: "#f0b429",
          background: "rgba(240,180,41,0.10)",
          padding: "1px 6px",
          borderRadius: 6,
          fontWeight: 800,
        }}
        title={`Mentioned: ${m.firstName} ${m.lastName}`}
      >
        {part}
      </span>
    );
  });
}
