"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Station Wall.
 *
 * Embedded surface (no page chrome). Renders a composer, a subject filter,
 * and a post feed. Behavior is unchanged from the previous revision — same
 * API contracts, same state shapes, same upload flow. The redesign affects
 * only typography, spacing, and chrome via the lounge token system.
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
interface Reaction { userId: string; kind: string; firstName: string; lastName: string }
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
interface Comment {
  id: string;
  postId: string;
  author: Author;
  body: string;
  createdAt: string;
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

const SUBJECT_TINT: Record<string, string> = {
  "Agency announcements":   "var(--mas-subj-announcements)",
  "New hires":              "var(--mas-subj-new-hires)",
  "Promotions":             "var(--mas-subj-promotions)",
  "Clinical saves":         "var(--mas-subj-saves)",
  "Training photos":        "var(--mas-subj-training)",
  "Community event photos": "var(--mas-subj-community)",
  "Equipment updates":      "var(--mas-subj-equipment)",
  "Message from the Chief": "var(--mas-subj-chief)",
  "Shift highlights":       "var(--mas-subj-shift)",
  "Recognition posts":      "var(--mas-subj-recognition)",
};

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

  const visible = filterSubject ? posts.filter((p) => p.subject === filterSubject) : posts;
  const pinned = visible.filter((p) => p.pinned);
  const regular = visible.filter((p) => !p.pinned);

  return (
    <section className="mas-wall">
      <style>{WALL_CSS}</style>

      <header className="mas-wall-head">
        <div>
          <span className="mas-wall-kicker">Station wall</span>
          <h2 className="mas-wall-title">Crew feed</h2>
        </div>
        <span className="mas-wall-count">
          <span className="mas-numeric">{posts.length}</span> {posts.length === 1 ? "post" : "posts"}
        </span>
      </header>

      <Composer me={me} onCreate={onCreate} />

      <SubjectFilterBar value={filterSubject} onChange={setFilterSubject} posts={posts} />

      {loading ? (
        <p className="mas-wall-loading">Loading the feed…</p>
      ) : visible.length === 0 ? (
        filterSubject ? (
          <p className="mas-wall-loading">
            Nothing tagged <strong>{filterSubject}</strong> yet.
          </p>
        ) : (
          <EmptyState />
        )
      ) : (
        <>
          {pinned.length > 0 && (
            <div className="mas-wall-pin-band">
              <span className="mas-wall-pin-band-label">Pinned</span>
            </div>
          )}
          <div className="mas-wall-feed">
            {pinned.map((p) => (
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
            {regular.map((p) => (
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
        </>
      )}
    </section>
  );
}

// ── Composer ─────────────────────────────────────────────────────────────
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

  function onBodyChange(value: string) {
    setBody(value);
    const ta = textareaRef.current;
    if (!ta) return;
    const caret = ta.selectionStart ?? value.length;
    const beforeCaret = value.slice(0, caret);
    const atIdx = beforeCaret.lastIndexOf("@");
    if (atIdx === -1) { setMentionQuery(null); return; }
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
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      const pos = (before + display + " ").length;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(pos, pos);
    });
  }

  function pickMedia() { fileRef.current?.click(); }
  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
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
  function removeMedia(url: string) { setMedia((s) => s.filter((m) => m.url !== url)); }

  async function submit() {
    if ((!body.trim() && media.length === 0) || posting) return;
    setPosting(true);
    try {
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

  const canPost = body.trim().length > 0 || media.length > 0;

  return (
    <div className="mas-composer">
      <div className="mas-composer-row">
        <Avatar firstName={me.firstName} lastName={me.lastName} photoUrl={me.photoUrl} size={40} />
        <div className="mas-composer-input-wrap">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && mentionQuery !== null) { setMentionQuery(null); return; }
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            placeholder="Share something with the crew. Type @ to tag a teammate."
            rows={2}
            className="mas-composer-textarea"
          />
          {mentionMatches.length > 0 && (
            <div className="mas-mention-pop">
              {mentionMatches.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => pickMention(m)}
                  className="mas-mention-pop-item"
                >
                  {m.firstName} {m.lastName}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {media.length > 0 && (
        <div className="mas-composer-media">
          {media.map((m) => (
            <div key={m.url} className="mas-composer-media-tile">
              {m.kind === "image" ? (
                <img src={m.url} alt="" />
              ) : m.kind === "video" ? (
                <video src={m.url} muted playsInline />
              ) : (
                <div className="mas-composer-media-file">{m.name ?? "Attachment"}</div>
              )}
              <button type="button" onClick={() => removeMedia(m.url)} className="mas-composer-media-rm" aria-label="Remove attachment">
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mas-composer-actions">
        <div className="mas-composer-actions-left">
          <label className="mas-composer-subject">
            <span>Topic</span>
            <select
              value={subject ?? ""}
              onChange={(e) => setSubject((e.target.value || null) as WallSubjectTag | null)}
              style={subject ? { color: SUBJECT_TINT[subject], borderColor: SUBJECT_TINT[subject] } : undefined}
            >
              <option value="">No topic</option>
              {WALL_SUBJECT_TAGS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={pickMedia}
            disabled={uploading}
            className="mas-composer-attach"
          >
            {uploading ? "Uploading…" : "Attach a file"}
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*"
            style={{ display: "none" }}
            onChange={(e) => onFiles(e.target.files)}
          />
        </div>
        <div className="mas-composer-actions-right">
          <span className="mas-composer-hint mas-mono">⌘↩ to post</span>
          <button
            type="button"
            onClick={submit}
            disabled={posting || !canPost}
            className="mas-composer-post"
          >
            {posting ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Subject filter ───────────────────────────────────────────────────────
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
    <div className="mas-filter">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={value === null ? "mas-chip is-active" : "mas-chip"}
      >
        All
      </button>
      {WALL_SUBJECT_TAGS.map((t) => {
        const c = counts[t];
        if (c === 0) return null;
        const active = value === t;
        const tint = SUBJECT_TINT[t];
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(active ? null : t)}
            className={active ? "mas-chip is-active" : "mas-chip"}
            style={{
              color: active ? "var(--mas-ink-on-light)" : tint,
              background: active ? tint : "transparent",
              borderColor: active ? tint : `color-mix(in srgb, ${tint} 40%, transparent)`,
            }}
          >
            {t} <span className="mas-chip-count mas-numeric">{c}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Post card ────────────────────────────────────────────────────────────
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
  const tint = post.subject ? SUBJECT_TINT[post.subject] : null;

  return (
    <article className={post.pinned ? "mas-post is-pinned" : "mas-post"}>
      <header className="mas-post-head">
        <Avatar firstName={post.author.firstName} lastName={post.author.lastName} photoUrl={post.author.photoUrl} size={38} />
        <div className="mas-post-byline">
          <div className="mas-post-name-row">
            <span className="mas-post-name">{post.author.firstName} {post.author.lastName}</span>
            {post.author.isAdmin && <span className="mas-post-admin">Admin</span>}
          </div>
          <div className="mas-post-meta">
            {(post.author.position ?? post.author.certification) && (
              <>{post.author.position ?? post.author.certification} · </>
            )}
            <span className="mas-mono">{timeAgo(post.createdAt)}</span>
          </div>
        </div>
        {post.pinned && <span className="mas-post-pin-badge">Pinned</span>}
      </header>

      {post.subject && tint && (
        <span
          className="mas-post-subject"
          style={{
            color: tint,
            background: `color-mix(in srgb, ${tint} 12%, transparent)`,
            borderColor: `color-mix(in srgb, ${tint} 36%, transparent)`,
          }}
        >
          {post.subject}
        </span>
      )}

      {post.body && (
        <p className="mas-post-body">
          {renderBodyWithMentions(post.body, post.mentions)}
        </p>
      )}

      {post.media.length > 0 && <PostMedia media={post.media} />}

      <footer className="mas-post-footer">
        <ReactionPicker current={myReaction} reactions={post.reactions} onPick={(k) => onReact(myReaction === k ? null : k)} />
        <button type="button" onClick={() => setShowComments((v) => !v)} className="mas-post-action">
          Reply <span className="mas-numeric">{post.commentCount}</span>
        </button>
        <button type="button" onClick={onSave} className={post.savedByMe ? "mas-post-action is-active" : "mas-post-action"}>
          {post.savedByMe ? "Saved" : "Save"}
        </button>
        <div style={{ flex: 1 }} />
        {me.isAdmin && (
          <button type="button" onClick={onPin} className="mas-post-action is-quiet">{post.pinned ? "Unpin" : "Pin"}</button>
        )}
        {(post.author.id === me.id || me.isAdmin) && (
          <button type="button" onClick={onDelete} className="mas-post-action is-danger">Delete</button>
        )}
      </footer>

      {showComments && <CommentSection postId={post.id} me={me} />}
    </article>
  );
}

function PostMedia({ media }: { media: Post["media"] }) {
  const isSingle = media.length === 1;
  return (
    <div className={isSingle ? "mas-post-media is-single" : "mas-post-media"}>
      {media.map((m, i) =>
        m.kind === "video" ? (
          <div key={i} className="mas-post-media-tile">
            <video src={m.url} controls playsInline preload="metadata" />
          </div>
        ) : (
          <a key={i} href={m.url} target="_blank" rel="noreferrer" className="mas-post-media-tile">
            {m.kind === "image" ? (
              <img src={m.url} alt="" />
            ) : (
              <div className="mas-post-media-file">
                <span>Attachment</span>
                <strong>{m.name ?? "Open file"}</strong>
              </div>
            )}
          </a>
        ),
      )}
    </div>
  );
}

// ── Reactions ────────────────────────────────────────────────────────────
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
  const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="mas-react">
      <button type="button" onClick={() => setOpen((v) => !v)} className={current ? "mas-react-trigger is-active" : "mas-react-trigger"} aria-label="React">
        {current ?? "React"}
      </button>
      {top.length > 0 && (
        <div className="mas-react-summary">
          {top.map(([kind, count]) => (
            <span key={kind}>
              {kind} <span className="mas-numeric">{count}</span>
            </span>
          ))}
        </div>
      )}
      {open && (
        <div className="mas-react-pop" onMouseLeave={() => setOpen(false)}>
          {REACTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => { onPick(r); setOpen(false); }}
              className="mas-react-pop-btn"
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Comments ─────────────────────────────────────────────────────────────
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
    <div className="mas-comments">
      {comments.map((c) => (
        <div key={c.id} className="mas-comment">
          <Avatar firstName={c.author.firstName} lastName={c.author.lastName} photoUrl={c.author.photoUrl} size={28} />
          <div className="mas-comment-body">
            <div className="mas-comment-head">
              <span className="mas-comment-name">{c.author.firstName} {c.author.lastName}</span>
              <span className="mas-comment-time mas-mono">{timeAgo(c.createdAt)}</span>
            </div>
            <div className="mas-comment-text">
              {renderBodyWithMentions(c.body, roster.map((r) => ({ id: r.id, firstName: r.firstName, lastName: r.lastName })))}
            </div>
            {(c.author.id === me.id || me.isAdmin) && (
              <button type="button" onClick={() => remove(c.id)} className="mas-comment-rm">Delete</button>
            )}
          </div>
        </div>
      ))}
      <div className="mas-comment-composer">
        {mentionMatches.length > 0 && (
          <div className="mas-mention-pop is-above">
            {mentionMatches.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => pickMention(m)}
                className="mas-mention-pop-item"
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
          placeholder="Reply — type @ to tag a teammate."
        />
        <button
          type="button"
          onClick={submit}
          disabled={posting || !body.trim()}
        >
          {posting ? "Sending…" : "Reply"}
        </button>
      </div>
    </div>
  );
}

// ── Avatar ───────────────────────────────────────────────────────────────
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
      <div className="mas-avatar" style={{ width: size, height: size }}>
        <img src={photoUrl} alt="" />
      </div>
    );
  }
  return (
    <div className="mas-avatar is-fallback" style={{ width: size, height: size, fontSize: size <= 30 ? "0.7rem" : "0.85rem" }}>
      {(firstName[0] + lastName[0]).toUpperCase()}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mas-wall-empty">
      <h3>No posts yet.</h3>
      <p>Drop a shift handoff, share a save, or post something the next crew needs to know.</p>
    </div>
  );
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Splits the body on every matching "@First Last" substring and wraps each
// hit in a highlighted span. Mentions are matched by exact display name;
// hand-typed "@John" without the picker stays plain text.
function renderBodyWithMentions(body: string, mentions: { id: string; firstName: string; lastName: string }[]) {
  if (!mentions || mentions.length === 0) return body;
  const names = Array.from(new Set(mentions.map((m) => `@${m.firstName} ${m.lastName}`)));
  if (names.length === 0) return body;
  const escaped = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "g");
  const parts = body.split(re);
  return parts.map((part, i) => {
    const m = mentions.find((mm) => `@${mm.firstName} ${mm.lastName}` === part);
    if (!m) return <span key={i}>{part}</span>;
    return (
      <span key={i} className="mas-mention" title={`Mentioned: ${m.firstName} ${m.lastName}`}>
        {part}
      </span>
    );
  });
}

// ── Styles ───────────────────────────────────────────────────────────────
const WALL_CSS = `
.mas-wall {
  border-radius: var(--mas-r-4);
  border: 1px solid var(--mas-border);
  background: var(--mas-surface-1);
  padding: var(--mas-s-5);
  box-shadow: var(--mas-shadow-2);
}
.mas-wall-head {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: var(--mas-s-3); flex-wrap: wrap;
  margin-bottom: var(--mas-s-4);
}
.mas-wall-kicker {
  display: block;
  color: var(--mas-brand-gold);
  font-family: var(--mas-font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 600;
}
.mas-wall-title {
  margin: 4px 0 0;
  font-size: 1.55rem;
  letter-spacing: -0.02em;
  font-weight: 700;
  color: var(--mas-ink);
}
.mas-wall-count {
  color: var(--mas-ink-soft);
  font-size: 0.82rem;
  font-weight: 500;
}
.mas-wall-loading {
  margin: var(--mas-s-4) 0 0;
  color: var(--mas-ink-soft);
  font-size: 0.9rem;
}

/* Composer */
.mas-composer {
  margin-top: var(--mas-s-3);
  border-radius: var(--mas-r-3);
  background: var(--mas-surface-well);
  border: 1px solid var(--mas-border);
  padding: var(--mas-s-3) var(--mas-s-4) var(--mas-s-3);
  transition: border-color var(--mas-base) var(--mas-ease);
}
.mas-composer:focus-within {
  border-color: var(--mas-border-focus);
  box-shadow: 0 0 0 3px rgba(240,180,41,0.10);
}
.mas-composer-row {
  display: flex; gap: var(--mas-s-3); align-items: flex-start; position: relative;
}
.mas-composer-input-wrap { flex: 1; position: relative; min-width: 0; }
.mas-composer-textarea {
  width: 100%;
  background: transparent;
  border: 0;
  color: var(--mas-ink);
  padding: 10px 4px 0;
  font-size: 0.98rem;
  line-height: 1.55;
  font-family: var(--mas-font-body);
  outline: none;
  resize: vertical;
  min-height: 56px;
}
.mas-composer-textarea::placeholder { color: var(--mas-ink-soft); }
.mas-composer-media {
  margin-top: var(--mas-s-3);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--mas-s-2);
}
.mas-composer-media-tile {
  position: relative;
  height: 110px;
  border-radius: var(--mas-r-2);
  overflow: hidden;
  background: var(--mas-surface);
  border: 1px solid var(--mas-border);
}
.mas-composer-media-tile img,
.mas-composer-media-tile video {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.mas-composer-media-file {
  padding: 12px; color: var(--mas-ink-muted); font-size: 0.82rem;
  display: flex; align-items: center; height: 100%;
}
.mas-composer-media-rm {
  position: absolute; top: 6px; right: 6px;
  width: 22px; height: 22px;
  border-radius: 999px;
  background: rgba(0,0,0,0.7);
  border: 0;
  color: white;
  font-size: 14px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.mas-composer-actions {
  margin-top: var(--mas-s-3);
  padding-top: var(--mas-s-3);
  border-top: 1px solid var(--mas-border);
  display: flex; justify-content: space-between; align-items: center;
  gap: var(--mas-s-3); flex-wrap: wrap;
}
.mas-composer-actions-left {
  display: flex; align-items: center; gap: var(--mas-s-2); flex-wrap: wrap;
}
.mas-composer-actions-right {
  display: flex; align-items: center; gap: var(--mas-s-3);
}
.mas-composer-subject {
  display: inline-flex; align-items: center; gap: var(--mas-s-2);
}
.mas-composer-subject > span {
  color: var(--mas-ink-soft);
  font-family: var(--mas-font-mono);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-weight: 600;
}
.mas-composer-subject select {
  appearance: none;
  -webkit-appearance: none;
  background: var(--mas-surface);
  color: var(--mas-ink-muted);
  border: 1px solid var(--mas-border);
  border-radius: var(--mas-r-2);
  padding: 7px 30px 7px 12px;
  font-size: 12.5px;
  font-weight: 600;
  font-family: var(--mas-font-body);
  cursor: pointer;
  background-image: linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position: calc(100% - 14px) 50%, calc(100% - 10px) 50%;
  background-size: 4px 4px, 4px 4px;
  background-repeat: no-repeat;
}
.mas-composer-attach {
  background: var(--mas-surface);
  color: var(--mas-brand-gold);
  border: 1px solid color-mix(in srgb, var(--mas-brand-gold) 30%, transparent);
  border-radius: var(--mas-r-2);
  padding: 7px 14px;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  font-family: inherit;
  transition: background var(--mas-fast) var(--mas-ease);
}
.mas-composer-attach:hover {
  background: color-mix(in srgb, var(--mas-brand-gold) 10%, var(--mas-surface));
}
.mas-composer-attach:disabled { opacity: 0.6; cursor: wait; }
.mas-composer-hint {
  color: var(--mas-ink-faint); font-size: 11px;
}
.mas-composer-post {
  background: var(--mas-brand-gold);
  color: var(--mas-ink-on-light);
  border: 0;
  border-radius: var(--mas-r-2);
  padding: 9px 18px;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  font-family: inherit;
  transition: transform var(--mas-fast) var(--mas-ease), filter var(--mas-fast) var(--mas-ease);
}
.mas-composer-post:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.06); }
.mas-composer-post:disabled { opacity: 0.45; cursor: not-allowed; }

/* Mention popover */
.mas-mention-pop {
  position: absolute; top: 100%; left: 0; right: 0;
  margin-top: 6px;
  z-index: 30;
  background: var(--mas-surface);
  border: 1px solid var(--mas-border-strong);
  border-radius: var(--mas-r-2);
  box-shadow: var(--mas-shadow-3);
  padding: 4px;
  max-height: 240px;
  overflow-y: auto;
  animation: mas-rise var(--mas-fast) var(--mas-ease-out) both;
}
.mas-mention-pop.is-above {
  top: auto; bottom: 100%; margin-top: 0; margin-bottom: 6px;
}
.mas-mention-pop-item {
  display: block; width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: 0;
  color: var(--mas-ink);
  text-align: left;
  cursor: pointer;
  border-radius: var(--mas-r-1);
  font-family: inherit;
  font-size: 0.88rem;
  font-weight: 500;
  transition: background var(--mas-fast) var(--mas-ease);
}
.mas-mention-pop-item:hover { background: var(--mas-surface-well); color: var(--mas-brand-gold); }

/* Filter chips */
.mas-filter {
  display: flex; flex-wrap: wrap; gap: 6px;
  margin-top: var(--mas-s-4);
  padding-bottom: var(--mas-s-3);
  border-bottom: 1px solid var(--mas-border);
}
.mas-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 11px;
  background: transparent;
  color: var(--mas-ink-soft);
  border: 1px solid var(--mas-border-strong);
  border-radius: var(--mas-r-pill);
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: background var(--mas-fast) var(--mas-ease), color var(--mas-fast) var(--mas-ease), border-color var(--mas-fast) var(--mas-ease);
}
.mas-chip:hover { color: var(--mas-ink); }
.mas-chip.is-active { font-weight: 700; }
.mas-chip-count {
  font-size: 10.5px; opacity: 0.85;
}

/* Pin band */
.mas-wall-pin-band {
  margin-top: var(--mas-s-4);
  padding-bottom: var(--mas-s-2);
}
.mas-wall-pin-band-label {
  color: var(--mas-brand-gold);
  font-family: var(--mas-font-mono);
  font-size: 10.5px;
  letter-spacing: 0.20em;
  text-transform: uppercase;
  font-weight: 600;
}

/* Feed */
.mas-wall-feed {
  margin-top: var(--mas-s-3);
  display: grid;
  gap: var(--mas-s-3);
}
.mas-wall-feed > * { animation: mas-rise var(--mas-base) var(--mas-ease-out) both; }
.mas-wall-feed > *:nth-child(2) { animation-delay: 40ms; }
.mas-wall-feed > *:nth-child(3) { animation-delay: 80ms; }
.mas-wall-feed > *:nth-child(4) { animation-delay: 120ms; }
.mas-wall-feed > *:nth-child(5) { animation-delay: 160ms; }
.mas-wall-feed > *:nth-child(n + 6) { animation-delay: 200ms; }

/* Post card */
.mas-post {
  position: relative;
  border-radius: var(--mas-r-3);
  border: 1px solid var(--mas-border);
  background: var(--mas-surface);
  padding: var(--mas-s-4) var(--mas-s-5) var(--mas-s-4);
  box-shadow: var(--mas-shadow-1);
  transition: border-color var(--mas-base) var(--mas-ease);
}
.mas-post:hover { border-color: var(--mas-border-strong); }
.mas-post.is-pinned {
  border-color: color-mix(in srgb, var(--mas-brand-gold) 35%, transparent);
  background: linear-gradient(180deg, color-mix(in srgb, var(--mas-brand-gold) 6%, var(--mas-surface)) 0%, var(--mas-surface) 60%);
}
.mas-post.is-pinned::before {
  content: ""; position: absolute; left: -1px; top: 14px; bottom: 14px; width: 2px;
  background: var(--mas-brand-gold);
  border-radius: 2px;
}
.mas-post-head {
  display: flex; align-items: center; gap: 12px;
}
.mas-post-byline { flex: 1; min-width: 0; }
.mas-post-name-row {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.mas-post-name {
  color: var(--mas-ink);
  font-size: 0.96rem;
  font-weight: 600;
  letter-spacing: -0.005em;
}
.mas-post-admin {
  display: inline-block;
  padding: 1px 7px;
  border-radius: var(--mas-r-pill);
  background: color-mix(in srgb, var(--mas-brand-gold) 18%, transparent);
  color: var(--mas-brand-gold);
  border: 1px solid color-mix(in srgb, var(--mas-brand-gold) 32%, transparent);
  font-family: var(--mas-font-mono);
  font-size: 9.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 600;
}
.mas-post-meta {
  margin-top: 2px;
  color: var(--mas-ink-soft);
  font-size: 0.78rem;
  letter-spacing: 0.01em;
}
.mas-post-pin-badge {
  color: var(--mas-brand-gold);
  font-family: var(--mas-font-mono);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 600;
}
.mas-post-subject {
  display: inline-block;
  margin-top: 12px;
  padding: 3px 10px;
  border: 1px solid;
  border-radius: var(--mas-r-pill);
  font-family: var(--mas-font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 600;
}
.mas-post-body {
  white-space: pre-wrap;
  margin: 12px 0 0;
  font-size: 0.98rem;
  line-height: 1.6;
  color: var(--mas-ink-muted);
}
.mas-mention {
  color: var(--mas-brand-gold);
  background: color-mix(in srgb, var(--mas-brand-gold) 10%, transparent);
  padding: 1px 6px;
  border-radius: var(--mas-r-1);
  font-weight: 600;
}

/* Post media grid */
.mas-post-media {
  margin-top: 14px;
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}
.mas-post-media.is-single {
  grid-template-columns: 1fr;
}
.mas-post-media-tile {
  display: block;
  border-radius: var(--mas-r-2);
  overflow: hidden;
  background: var(--mas-surface-well);
  border: 1px solid var(--mas-border);
}
.mas-post-media.is-single .mas-post-media-tile img,
.mas-post-media.is-single .mas-post-media-tile video {
  width: 100%;
  max-height: 520px;
  height: auto;
  object-fit: contain;
  display: block;
}
.mas-post-media:not(.is-single) .mas-post-media-tile img,
.mas-post-media:not(.is-single) .mas-post-media-tile video {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  display: block;
}
.mas-post-media-file {
  padding: 16px;
  display: grid; gap: 2px;
}
.mas-post-media-file span {
  color: var(--mas-ink-soft);
  font-family: var(--mas-font-mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.mas-post-media-file strong {
  color: var(--mas-ink);
  font-size: 0.9rem;
}

/* Post footer */
.mas-post-footer {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--mas-border);
  display: flex; align-items: center; gap: 4px; flex-wrap: wrap;
}
.mas-post-action {
  display: inline-flex; align-items: center; gap: 6px;
  background: transparent;
  border: 0;
  color: var(--mas-ink-soft);
  cursor: pointer;
  padding: 6px 10px;
  border-radius: var(--mas-r-2);
  font-size: 0.82rem;
  font-weight: 500;
  font-family: inherit;
  transition: background var(--mas-fast) var(--mas-ease), color var(--mas-fast) var(--mas-ease);
}
.mas-post-action:hover { background: var(--mas-surface-well); color: var(--mas-ink); }
.mas-post-action.is-active { color: var(--mas-brand-gold); }
.mas-post-action.is-quiet {
  font-size: 11px;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  font-weight: 600;
}
.mas-post-action.is-danger { color: var(--mas-critical); }
.mas-post-action.is-danger:hover { background: color-mix(in srgb, var(--mas-critical) 10%, transparent); }

/* Reactions */
.mas-react { position: relative; display: flex; align-items: center; gap: 8px; }
.mas-react-trigger {
  background: transparent;
  border: 0;
  color: var(--mas-ink-soft);
  cursor: pointer;
  padding: 6px 10px;
  border-radius: var(--mas-r-2);
  font-size: 0.85rem;
  font-weight: 500;
  font-family: inherit;
  transition: background var(--mas-fast) var(--mas-ease), color var(--mas-fast) var(--mas-ease);
}
.mas-react-trigger:hover { background: var(--mas-surface-well); color: var(--mas-ink); }
.mas-react-trigger.is-active { font-size: 1.05rem; }
.mas-react-summary {
  display: flex; gap: 4px;
}
.mas-react-summary span {
  display: inline-flex; align-items: center; gap: 4px;
  background: var(--mas-surface-well);
  border: 1px solid var(--mas-border);
  border-radius: var(--mas-r-pill);
  padding: 3px 9px;
  font-size: 0.78rem;
  color: var(--mas-ink-muted);
}
.mas-react-pop {
  position: absolute;
  top: -50px; left: 0;
  background: var(--mas-surface-well);
  border: 1px solid var(--mas-border-strong);
  border-radius: var(--mas-r-pill);
  padding: 6px 8px;
  display: flex; gap: 4px;
  z-index: 10;
  box-shadow: var(--mas-shadow-3);
  animation: mas-rise var(--mas-fast) var(--mas-ease-out) both;
}
.mas-react-pop-btn {
  background: transparent;
  border: 0;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 3px 7px;
  border-radius: var(--mas-r-1);
  transition: background var(--mas-fast) var(--mas-ease), transform var(--mas-fast) var(--mas-ease);
}
.mas-react-pop-btn:hover { background: rgba(255,255,255,0.06); transform: scale(1.15); }

/* Comments */
.mas-comments {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--mas-border);
  display: grid;
  gap: 10px;
  animation: mas-rise var(--mas-base) var(--mas-ease-out) both;
}
.mas-comment {
  display: flex; gap: 10px;
}
.mas-comment-body {
  flex: 1;
  background: var(--mas-surface-well);
  border-radius: var(--mas-r-3);
  padding: 10px 14px;
  min-width: 0;
}
.mas-comment-head {
  display: flex; align-items: baseline; gap: 8px; justify-content: space-between;
}
.mas-comment-name {
  color: var(--mas-ink);
  font-size: 0.85rem;
  font-weight: 600;
}
.mas-comment-time {
  color: var(--mas-ink-soft);
  font-size: 10.5px;
}
.mas-comment-text {
  margin-top: 4px;
  color: var(--mas-ink-muted);
  font-size: 0.9rem;
  line-height: 1.5;
  white-space: pre-wrap;
}
.mas-comment-rm {
  margin-top: 6px;
  background: transparent;
  border: 0;
  color: var(--mas-ink-faint);
  font-size: 0.72rem;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
}
.mas-comment-rm:hover { color: var(--mas-critical); }
.mas-comment-composer {
  display: flex; gap: 8px; position: relative;
}
.mas-comment-composer input {
  flex: 1;
  background: var(--mas-surface-well);
  border: 1px solid var(--mas-border);
  border-radius: var(--mas-r-2);
  color: var(--mas-ink);
  padding: 10px 14px;
  font-size: 0.9rem;
  outline: none;
  font-family: var(--mas-font-body);
  transition: border-color var(--mas-fast) var(--mas-ease);
}
.mas-comment-composer input:focus { border-color: var(--mas-border-focus); }
.mas-comment-composer input::placeholder { color: var(--mas-ink-soft); }
.mas-comment-composer button {
  padding: 10px 18px;
  background: var(--mas-brand-gold);
  color: var(--mas-ink-on-light);
  font-weight: 700;
  font-size: 11.5px;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  border-radius: var(--mas-r-2);
  border: 0;
  cursor: pointer;
  font-family: inherit;
  transition: filter var(--mas-fast) var(--mas-ease);
}
.mas-comment-composer button:hover:not(:disabled) { filter: brightness(1.06); }
.mas-comment-composer button:disabled { opacity: 0.45; cursor: not-allowed; }

/* Avatar */
.mas-avatar {
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid var(--mas-border-strong);
  background: var(--mas-surface-well);
}
.mas-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.mas-avatar.is-fallback {
  display: flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--mas-brand-gold) 14%, transparent);
  border-color: color-mix(in srgb, var(--mas-brand-gold) 30%, transparent);
  color: var(--mas-brand-gold);
  font-weight: 700;
}

/* Empty state */
.mas-wall-empty {
  margin-top: var(--mas-s-4);
  text-align: center;
  padding: var(--mas-s-7) var(--mas-s-5);
  background: var(--mas-surface-well);
  border: 1px dashed var(--mas-border-strong);
  border-radius: var(--mas-r-3);
}
.mas-wall-empty h3 {
  color: var(--mas-ink);
  margin: 0;
  font-size: 1.1rem;
  letter-spacing: -0.015em;
  font-weight: 600;
}
.mas-wall-empty p {
  color: var(--mas-ink-soft);
  font-size: 0.92rem;
  margin: 8px 0 0;
  line-height: 1.55;
}

/* Mobile */
@media (max-width: 720px) {
  .mas-wall { padding: var(--mas-s-4); }
  .mas-wall-title { font-size: 1.3rem; }
  .mas-composer { padding: var(--mas-s-3); }
  .mas-composer-actions {
    flex-direction: column; align-items: stretch;
  }
  .mas-composer-actions-right {
    justify-content: space-between;
  }
  .mas-post { padding: var(--mas-s-4); }
}
`;
