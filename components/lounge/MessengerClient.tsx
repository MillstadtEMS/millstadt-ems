"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Crew messenger.
 *
 * Embedded surface that handles both DMs and group chats. Every backend
 * contract is identical to the previous revision — same endpoints, same
 * polling cadence, same Vercel Blob upload flow, same MediaRecorder pipeline,
 * same optimistic reaction updates, same read-receipt math. The redesign
 * affects only the visual layer (tokens, typography, animation, copy).
 */

interface ConversationPreview {
  id: string;
  kind: "dm" | "group";
  title: string | null;
  participants: { id: string; firstName: string; lastName: string; photoUrl: string | null }[];
  lastMessage: { body: string; authorId: string; createdAt: string } | null;
  unreadCount: number;
  updatedAt: string;
}

type MessageMediaKind = "image" | "video" | "audio" | "file";
interface MessageMedia { url: string; kind: MessageMediaKind; name?: string; mime?: string }
type MessageReactionKind = "like" | "love" | "laugh" | "wow" | "sad" | "angry";
const MESSAGE_REACTIONS: { kind: MessageReactionKind; emoji: string; label: string }[] = [
  { kind: "like",  emoji: "👍", label: "Like" },
  { kind: "love",  emoji: "❤️", label: "Love" },
  { kind: "laugh", emoji: "😂", label: "Haha" },
  { kind: "wow",   emoji: "😮", label: "Wow" },
  { kind: "sad",   emoji: "😢", label: "Sad" },
  { kind: "angry", emoji: "😡", label: "Angry" },
];
const MAX_MESSENGER_UPLOAD_BYTES = 500 * 1024 * 1024;
const SMALL_UPLOAD_FALLBACK_BYTES = 4 * 1024 * 1024;

interface MessageReaction { userId: string; firstName: string; lastName: string; kind: MessageReactionKind }
interface MessageReplyTo { id: string; authorFirstName: string; authorLastName: string; bodyPreview: string; hasMedia: boolean }
interface Message {
  id: string;
  conversationId: string;
  authorId: string;
  authorFirstName: string;
  authorLastName: string;
  authorPhotoUrl: string | null;
  body: string;
  media: MessageMedia[];
  reactions: MessageReaction[];
  replyTo: MessageReplyTo | null;
  createdAt: string;
}
interface RosterEntry {
  id: string;
  firstName: string;
  lastName: string;
  certification: string | null;
}

const POLL_MS = 4000;

type UploadProgressState = { name: string; index: number; total: number; percent: number; fallback?: boolean };

function cleanAttachmentName(name: string): string {
  return (name || "upload").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "upload";
}

function uploadNonce(): string {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function mediaKindForFile(file: File): MessageMediaKind {
  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  if (mime.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp|tiff?)$/i.test(name)) return "image";
  if (mime.startsWith("video/") || /\.(mp4|mov|m4v|webm|3gp|3gpp|avi|mpeg|mpg)$/i.test(name)) return "video";
  if (mime.startsWith("audio/") || /\.(m4a|mp3|wav|ogg|webm|aac|caf)$/i.test(name)) return "audio";
  return "file";
}

function mimeForFile(file: File): string {
  if (file.type) return file.type;
  const name = (file.name || "").toLowerCase();
  if (name.endsWith(".mov")) return "video/quicktime";
  if (name.endsWith(".m4v")) return "video/x-m4v";
  if (name.endsWith(".mp4")) return "video/mp4";
  if (name.endsWith(".webm")) return "video/webm";
  if (name.endsWith(".heic")) return "image/heic";
  if (name.endsWith(".heif")) return "image/heif";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".m4a")) return "audio/mp4";
  if (name.endsWith(".mp3")) return "audio/mpeg";
  if (name.endsWith(".wav")) return "audio/wav";
  return "application/octet-stream";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 100 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
}

async function uploadMessengerFile(
  file: File,
  index: number,
  total: number,
  setProgress: (state: UploadProgressState | null) => void,
): Promise<MessageMedia> {
  if (file.size > MAX_MESSENGER_UPLOAD_BYTES) {
    throw new Error(`File is ${formatBytes(file.size)}. Messenger limit is ${formatBytes(MAX_MESSENGER_UPLOAD_BYTES)}.`);
  }

  const mime = mimeForFile(file);
  const kind = mediaKindForFile(file);
  const name = file.name || "Attachment";
  const pathname = `lounge-messages/${Date.now()}-${uploadNonce()}-${cleanAttachmentName(name)}`;
  setProgress({ name, index, total, percent: 0 });

  try {
    const { upload } = await import("@vercel/blob/client");
    const blob = await upload(pathname, file, {
      access: "public",
      handleUploadUrl: "/api/lounge/messages/media",
      contentType: mime,
      clientPayload: JSON.stringify({ mime, name, size: file.size, kind }),
      multipart: file.size > 8 * 1024 * 1024,
      onUploadProgress: ({ percentage }) => {
        setProgress({ name, index, total, percent: Math.max(1, Math.min(100, Math.round(percentage))) });
      },
    });
    setProgress({ name, index, total, percent: 100 });
    return { url: blob.url, kind, name, mime: blob.contentType || mime };
  } catch (e) {
    if (file.size > SMALL_UPLOAD_FALLBACK_BYTES) {
      const reason = e instanceof Error ? e.message : "Upload failed";
      throw new Error(`${reason}. Large videos need the direct Blob upload token to be working.`);
    }

    setProgress({ name, index, total, percent: 5, fallback: true });
    const form = new FormData();
    form.append("file", file, name);
    const res = await fetch("/api/lounge/messages/media", { method: "POST", body: form });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Upload failed.");
    setProgress({ name, index, total, percent: 100, fallback: true });
    return {
      url: String(json.url),
      kind: (json.kind === "video" || json.kind === "audio" || json.kind === "file" || json.kind === "image") ? json.kind : kind,
      name: typeof json.name === "string" ? json.name : name,
      mime: typeof json.mime === "string" ? json.mime : mime,
    };
  }
}

export default function MessengerClient({ meId }: { meId: string }) {
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [readBy, setReadBy] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [search, setSearch] = useState("");
  const [pendingMedia, setPendingMedia] = useState<MessageMedia[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [presence, setPresence] = useState<Record<string, { online: boolean; lastActivityAt: string | null }>>({});
  const [createMode, setCreateMode] = useState<"dm" | "group">("dm");
  const [groupSelected, setGroupSelected] = useState<RosterEntry[]>([]);
  const [groupTitle, setGroupTitle] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);

  const loadConversations = useCallback(async () => {
    const r = await fetch("/api/lounge/messages");
    if (r.ok) {
      const d = await r.json();
      setConversations(d.conversations ?? []);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    fetch("/api/lounge/roster").then((r) => r.ok ? r.json() : { employees: [] }).then((d) => setRoster(d.employees ?? []));
    async function loadPresence() {
      try {
        const r = await fetch("/api/lounge/presence");
        if (!r.ok) return;
        const d = await r.json();
        const map: Record<string, { online: boolean; lastActivityAt: string | null }> = {};
        for (const p of d.presence ?? []) map[p.id] = { online: !!p.online, lastActivityAt: p.lastActivityAt };
        setPresence(map);
      } catch { /* ignore */ }
    }
    loadPresence();
    const id = setInterval(loadPresence, 30_000);
    return () => clearInterval(id);
  }, [loadConversations]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    async function load() {
      const r = await fetch(`/api/lounge/messages/${activeId}`);
      if (r.ok && !cancelled) {
        const d = await r.json();
        setMessages(d.messages ?? []);
        setReadBy(d.readBy ?? {});
      }
    }
    load();
    const id = setInterval(load, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [activeId]);

  useEffect(() => {
    const id = setInterval(loadConversations, POLL_MS * 2);
    return () => clearInterval(id);
  }, [loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function openDmWith(employeeId: string) {
    const r = await fetch("/api/lounge/messages/dm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId }),
    });
    if (!r.ok) return;
    const d = await r.json();
    setActiveId(d.conversationId);
    setShowRoster(false);
    loadConversations();
  }

  function toggleGroupMember(e: RosterEntry) {
    setGroupSelected((s) => s.find((x) => x.id === e.id) ? s.filter((x) => x.id !== e.id) : [...s, e]);
  }

  async function createGroup() {
    if (groupSelected.length < 2) { alert("Pick at least two other people."); return; }
    const r = await fetch("/api/lounge/messages/group", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantIds: groupSelected.map((m) => m.id), title: groupTitle.trim() || null }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      alert(d.error || "Could not create group.");
      return;
    }
    const d = await r.json();
    setActiveId(d.conversationId);
    setShowRoster(false);
    setGroupSelected([]);
    setGroupTitle("");
    setCreateMode("dm");
    loadConversations();
  }

  async function send() {
    if (!activeId || sending) return;
    if (!draft.trim() && pendingMedia.length === 0) return;
    setSending(true);
    try {
      const r = await fetch(`/api/lounge/messages/${activeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim(), media: pendingMedia, replyToId: replyTo?.id ?? null }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.message) setMessages((s) => [...s, d.message as Message]);
        setDraft("");
        setPendingMedia([]);
        setReplyTo(null);
        loadConversations();
      }
    } finally {
      setSending(false);
    }
  }

  async function onFilesPicked(files: FileList | null) {
    if (!files || files.length === 0) return;
    const picked = Array.from(files);
    setUploadingMedia(true);
    setUploadError(null);
    setUploadProgress(null);
    try {
      const uploaded: MessageMedia[] = [];
      const errors: string[] = [];
      for (let i = 0; i < picked.length; i++) {
        const f = picked[i];
        try {
          const media = await uploadMessengerFile(f, i + 1, picked.length, setUploadProgress);
          uploaded.push(media);
        } catch (e) {
          console.error("[chat upload]", e);
          const msg = e instanceof Error ? e.message : "Upload failed.";
          errors.push(`${f.name || "Attachment"}: ${msg}`);
        }
      }
      if (uploaded.length > 0) setPendingMedia((s) => [...s, ...uploaded]);
      if (errors.length > 0) setUploadError(errors.join(" "));
      setUploadProgress(null);
    } finally { setUploadingMedia(false); }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recordingChunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) recordingChunksRef.current.push(e.data); };
      rec.onstop = async () => {
        try {
          const blob = new Blob(recordingChunksRef.current, { type: rec.mimeType || "audio/webm" });
          const f = new File([blob], `voice-${Date.now()}.${(rec.mimeType || "audio/webm").includes("mp4") ? "m4a" : "webm"}`, { type: rec.mimeType || "audio/webm" });
          setUploadingMedia(true);
          try {
            const { upload } = await import("@vercel/blob/client");
            const pathname = `lounge-messages/${Date.now()}-voice.${(rec.mimeType || "audio/webm").includes("mp4") ? "m4a" : "webm"}`;
            const uploaded = await upload(pathname, f, {
              access: "public",
              handleUploadUrl: "/api/lounge/messages/media",
              contentType: f.type || undefined,
              clientPayload: JSON.stringify({ mime: f.type || "" }),
              multipart: true,
            });
            setPendingMedia((s) => [...s, { url: uploaded.url, kind: "audio", name: f.name, mime: f.type || undefined }]);
          } finally { setUploadingMedia(false); }
        } finally {
          stream.getTracks().forEach((t) => t.stop());
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (e) {
      console.error("[mic]", e);
      alert("Couldn't access the microphone.");
    }
  }
  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }
  function dropPending(url: string) {
    setPendingMedia((s) => s.filter((m) => m.url !== url));
  }

  async function toggleReaction(messageId: string, kind: MessageReactionKind) {
    const myCurrent = messages.find((m) => m.id === messageId)?.reactions.find((r) => r.userId === meId);
    const newKind = myCurrent?.kind === kind ? null : kind;
    setMessages((s) => s.map((m) => {
      if (m.id !== messageId) return m;
      const without = m.reactions.filter((r) => r.userId !== meId);
      return newKind ? { ...m, reactions: [...without, { userId: meId, firstName: "", lastName: "", kind: newKind }] } : { ...m, reactions: without };
    }));
    setReactionPickerFor(null);
    try {
      await fetch(`/api/lounge/messages/${messageId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: newKind }),
      });
    } catch { /* poll will reconcile */ }
  }

  const activeConv = conversations.find((c) => c.id === activeId) ?? null;
  const filteredRoster = roster
    .filter((r) => r.id !== meId)
    .filter((r) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return `${r.firstName} ${r.lastName}`.toLowerCase().includes(q);
    });

  const otherInDm = activeConv?.kind === "dm"
    ? activeConv.participants.find((p) => p.id !== meId)
    : null;
  const activeOnline = activeConv?.participants.some((p) => p.id !== meId && presence[p.id]?.online) ?? false;

  // Group messages into runs by author + adjacency in time (≤ 3 min apart) so
  // we can collapse repeated avatars and names, plus break by day for headers.
  const groupedMessages = useMemo(() => groupMessages(messages), [messages]);

  return (
    <div className={`mas-msgr ${activeConv ? "has-active" : ""}`}>
      <style>{MESSENGER_CSS}</style>

      <header className="mas-msgr-head">
        <div>
          <span className="mas-msgr-kicker">Crew messages</span>
          <h1 className="mas-msgr-title">Messages</h1>
        </div>
      </header>

      <div className="mas-msgr-grid">
        {/* ───── Conversation list ───── */}
        <aside className="mas-msgr-list">
          <button
            type="button"
            onClick={() => setShowRoster((v) => !v)}
            className={showRoster ? "mas-msgr-new is-open" : "mas-msgr-new"}
          >
            {showRoster ? "Cancel" : "New conversation"}
          </button>

          {showRoster && (
            <div className="mas-msgr-newpanel">
              <div className="mas-msgr-newtabs">
                <button type="button" onClick={() => setCreateMode("dm")} className={createMode === "dm" ? "mas-msgr-newtab is-active" : "mas-msgr-newtab"}>
                  Direct
                </button>
                <button type="button" onClick={() => setCreateMode("group")} className={createMode === "group" ? "mas-msgr-newtab is-active" : "mas-msgr-newtab"}>
                  Group chat
                </button>
              </div>

              {createMode === "group" && (
                <div className="mas-msgr-group">
                  <input
                    value={groupTitle}
                    onChange={(e) => setGroupTitle(e.target.value)}
                    placeholder="Name this group (optional)"
                    className="mas-msgr-input"
                  />
                  {groupSelected.length > 0 && (
                    <div className="mas-msgr-chips">
                      {groupSelected.map((m) => (
                        <span key={m.id} className="mas-msgr-chip">
                          {m.firstName} {m.lastName}
                          <button type="button" onClick={() => toggleGroupMember(m)} aria-label="Remove">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={createGroup}
                    disabled={groupSelected.length < 2}
                    className="mas-msgr-group-go"
                  >
                    Start group ({groupSelected.length})
                  </button>
                </div>
              )}

              <input
                placeholder="Search the crew"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mas-msgr-input"
              />
              <div className="mas-msgr-roster">
                {filteredRoster.map((r) => {
                  const checked = groupSelected.some((g) => g.id === r.id);
                  const online = presence[r.id]?.online;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => createMode === "group" ? toggleGroupMember(r) : openDmWith(r.id)}
                      className={checked ? "mas-msgr-rosteritem is-checked" : "mas-msgr-rosteritem"}
                    >
                      <span className="mas-msgr-rosteritem-name">
                        {createMode === "group" && checked && <span className="mas-msgr-checkdot" aria-hidden />}
                        {r.firstName} {r.lastName}
                      </span>
                      <span className="mas-msgr-rosteritem-meta">
                        {online && <span className="mas-msgr-onlinedot" aria-label="Online" />}
                        {r.certification && <span>{r.certification}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {conversations.length === 0 && !showRoster ? (
            <div className="mas-msgr-list-empty">
              <p>No conversations yet.</p>
              <small>Start one with anyone on the crew.</small>
            </div>
          ) : (
            <ul className="mas-msgr-conv-list">
              {conversations.map((c) => {
                const others = c.participants;
                const title = c.title ?? others.map((p) => p.firstName).join(", ");
                const photo = others[0]?.photoUrl ?? null;
                const initials = (others[0]?.firstName?.[0] ?? "?") + (others[0]?.lastName?.[0] ?? "");
                const active = c.id === activeId;
                const onlineSomeone = others.find((p) => presence[p.id]?.online);
                const isOnline = !!onlineSomeone;
                const preview = c.lastMessage
                  ? (c.lastMessage.authorId === meId ? "You: " : "") + (c.lastMessage.body || "Attachment")
                  : "No messages yet";
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(c.id)}
                      className={
                        [
                          "mas-msgr-conv",
                          active ? "is-active" : "",
                          c.unreadCount > 0 ? "is-unread" : "",
                        ].filter(Boolean).join(" ")
                      }
                    >
                      <div className="mas-msgr-conv-avatar">
                        {photo
                          ? <img src={photo} alt="" />
                          : <span>{initials.toUpperCase()}</span>}
                        {isOnline && <OnlineDot />}
                        {c.kind === "group" && <span className="mas-msgr-conv-badge">{others.length}</span>}
                      </div>
                      <div className="mas-msgr-conv-body">
                        <div className="mas-msgr-conv-line1">
                          <span className="mas-msgr-conv-name">{title}</span>
                          <span className="mas-msgr-conv-time mas-mono">{c.lastMessage ? shortTime(c.lastMessage.createdAt) : ""}</span>
                        </div>
                        <div className="mas-msgr-conv-line2">
                          <span className="mas-msgr-conv-preview">{preview}</span>
                          {c.unreadCount > 0 && (
                            <span className="mas-msgr-conv-unread mas-mono">{c.unreadCount}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* ───── Active thread ───── */}
        <section className="mas-msgr-thread">
          {!activeConv ? (
            <div className="mas-msgr-empty-thread">
              <div className="mas-msgr-empty-bg" aria-hidden />
              <div className="mas-msgr-empty-content">
                <span className="mas-msgr-empty-kicker">Crew messages</span>
                <h3>Pick a conversation</h3>
                <p>Or start a new one to message anyone on the crew.</p>
              </div>
            </div>
          ) : (
            <>
              <header className="mas-msgr-thread-head">
                <button
                  type="button"
                  className="mas-msgr-back"
                  onClick={() => setActiveId(null)}
                  aria-label="Back to conversations"
                >
                  ‹
                </button>
                <div className="mas-msgr-thread-titlewrap">
                  <div className="mas-msgr-thread-title">
                    {activeConv.title ?? activeConv.participants.filter((p) => p.id !== meId).map((p) => `${p.firstName} ${p.lastName}`).join(", ")}
                  </div>
                  <div className="mas-msgr-thread-sub">
                    {activeConv.kind === "group"
                      ? `Group · ${activeConv.participants.length} members`
                      : (activeOnline ? "Active now" : (otherInDm ? "Direct message" : "Direct message"))}
                  </div>
                </div>
                {activeOnline && <span className="mas-msgr-thread-live" aria-label="Online" />}
              </header>

              <div className="mas-msgr-thread-body">
                {messages.length === 0 ? (
                  <div className="mas-msgr-thread-empty">
                    <p>No messages yet.</p>
                    <small>Send the first one to start the thread.</small>
                  </div>
                ) : (() => {
                  const lastMineIdx = (() => {
                    for (let i = messages.length - 1; i >= 0; i--) {
                      if (messages[i].authorId === meId) return i;
                    }
                    return -1;
                  })();
                  return groupedMessages.map((group) => (
                    <div key={group.key} className="mas-msgr-group-block">
                      {group.dayLabel && (
                        <div className="mas-msgr-day">
                          <span>{group.dayLabel}</span>
                        </div>
                      )}
                      {group.runs.map((run) => {
                        const mine = run.authorId === meId;
                        return (
                          <div key={run.key} className={mine ? "mas-msgr-run is-mine" : "mas-msgr-run is-theirs"}>
                            {!mine && (
                              <div className="mas-msgr-run-avatar">
                                <AuthorAvatar
                                  firstName={run.items[0].authorFirstName}
                                  lastName={run.items[0].authorLastName}
                                  photoUrl={run.items[0].authorPhotoUrl}
                                />
                              </div>
                            )}
                            <div className="mas-msgr-run-bubbles">
                              {!mine && activeConv.kind === "group" && (
                                <div className="mas-msgr-run-name">{run.items[0].authorFirstName} {run.items[0].authorLastName}</div>
                              )}
                              {run.items.map((m, i) => {
                                const idx = messages.indexOf(m);
                                const showReceipt = mine && idx === lastMineIdx;
                                const receipt = showReceipt ? buildReceipt(m, activeConv, readBy, meId) : null;
                                const isLast = i === run.items.length - 1;
                                const counts = new Map<MessageReactionKind, number>();
                                for (const r of m.reactions) counts.set(r.kind, (counts.get(r.kind) ?? 0) + 1);
                                const myReaction = m.reactions.find((r) => r.userId === meId)?.kind ?? null;
                                return (
                                  <div key={m.id} className="mas-msgr-msg">
                                    <div className="mas-msgr-bubble-row">
                                      <div className={["mas-msgr-bubble", mine ? "is-mine" : "is-theirs", isLast ? "is-tail" : ""].filter(Boolean).join(" ")}>
                                        {m.replyTo && (
                                          <a
                                            href={`#msg-${m.replyTo.id}`}
                                            className="mas-msgr-quote"
                                            onClick={(e) => e.preventDefault()}
                                          >
                                            <span className="mas-msgr-quote-name">
                                              Replying to {m.replyTo.authorFirstName} {m.replyTo.authorLastName}
                                            </span>
                                            <span className="mas-msgr-quote-body">
                                              {m.replyTo.bodyPreview || (m.replyTo.hasMedia ? "Attachment" : "Message")}
                                            </span>
                                          </a>
                                        )}
                                        {m.body && <div className="mas-msgr-text">{m.body}</div>}
                                        {m.media && m.media.length > 0 && (
                                          <div className="mas-msgr-media">
                                            {m.media.map((att, ai) => (
                                              <MessageAttachment key={ai} att={att} mine={mine} />
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <div className="mas-msgr-tools">
                                        <button
                                          type="button"
                                          aria-label="React"
                                          onClick={() => setReactionPickerFor(reactionPickerFor === m.id ? null : m.id)}
                                          className="mas-msgr-tool"
                                        >
                                          <ReactIcon />
                                        </button>
                                        <button
                                          type="button"
                                          aria-label="Reply"
                                          onClick={() => setReplyTo(m)}
                                          className="mas-msgr-tool"
                                        >
                                          <ReplyIcon />
                                        </button>
                                      </div>
                                    </div>

                                    {reactionPickerFor === m.id && (
                                      <div className={mine ? "mas-msgr-reactpop is-mine" : "mas-msgr-reactpop is-theirs"}>
                                        {MESSAGE_REACTIONS.map((r) => (
                                          <button
                                            key={r.kind}
                                            type="button"
                                            aria-label={r.label}
                                            onClick={() => toggleReaction(m.id, r.kind)}
                                            className={myReaction === r.kind ? "mas-msgr-reactpop-btn is-mine" : "mas-msgr-reactpop-btn"}
                                          >
                                            {r.emoji}
                                          </button>
                                        ))}
                                      </div>
                                    )}

                                    {m.reactions.length > 0 && (
                                      <div className={mine ? "mas-msgr-reactrow is-mine" : "mas-msgr-reactrow is-theirs"}>
                                        {MESSAGE_REACTIONS.map((r) => {
                                          const c = counts.get(r.kind) ?? 0;
                                          if (c === 0) return null;
                                          const isMine = myReaction === r.kind;
                                          return (
                                            <button
                                              key={r.kind}
                                              type="button"
                                              onClick={() => toggleReaction(m.id, r.kind)}
                                              className={isMine ? "mas-msgr-reactchip is-mine" : "mas-msgr-reactchip"}
                                            >
                                              {r.emoji} <span className="mas-mono">{c}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {isLast && (
                                      <div className={mine ? "mas-msgr-time is-mine" : "mas-msgr-time is-theirs"}>
                                        <span className="mas-mono">{shortClock(m.createdAt)}</span>
                                        {receipt && <span className="mas-msgr-receipt">· {receipt}</span>}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
                <div ref={messagesEndRef} />
              </div>

              <div className="mas-msgr-composer">
                {replyTo && (
                  <div className="mas-msgr-reply">
                    <div>
                      <span className="mas-msgr-reply-label">Replying to {replyTo.authorFirstName} {replyTo.authorLastName}</span>
                      <span className="mas-msgr-reply-body">
                        {replyTo.body || (replyTo.media.length > 0 ? "Attachment" : "Message")}
                      </span>
                    </div>
                    <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply">×</button>
                  </div>
                )}

                {pendingMedia.length > 0 && (
                  <div className="mas-msgr-pending">
                    {pendingMedia.map((m) => (
                      <PendingMedia key={m.url} m={m} onRemove={() => dropPending(m.url)} />
                    ))}
                  </div>
                )}

                {recording && (
                  <div className="mas-msgr-recording" role="status">
                    <span className="mas-msgr-recording-dot" aria-hidden />
                    <span>Recording — tap stop to send</span>
                  </div>
                )}

                {(uploadingMedia || uploadProgress || uploadError) && (
                  <div className={uploadError ? "mas-msgr-upload-status is-error" : "mas-msgr-upload-status"} role="status">
                    {uploadError ? (
                      <>
                        <span>{uploadError}</span>
                        <button type="button" onClick={() => setUploadError(null)}>Dismiss</button>
                      </>
                    ) : uploadProgress ? (
                      <>
                        <span>
                          {uploadProgress.fallback ? "Finishing" : "Uploading"} {uploadProgress.index}/{uploadProgress.total}: {uploadProgress.name}
                        </span>
                        <strong>{uploadProgress.percent}%</strong>
                        <span className="mas-msgr-upload-bar" aria-hidden>
                          <span style={{ width: `${uploadProgress.percent}%` }} />
                        </span>
                      </>
                    ) : (
                      <span>Preparing attachment…</span>
                    )}
                  </div>
                )}

                <div className="mas-msgr-composer-row">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadingMedia || recording}
                    className="mas-msgr-icon-btn"
                    aria-label="Attach a file"
                  >
                    <AttachIcon />
                  </button>
                  <button
                    type="button"
                    onClick={recording ? stopRecording : startRecording}
                    disabled={uploadingMedia}
                    className={recording ? "mas-msgr-icon-btn is-recording" : "mas-msgr-icon-btn"}
                    aria-label={recording ? "Stop recording" : "Record a voice note"}
                  >
                    {recording ? <StopIcon /> : <MicIcon />}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    style={{ display: "none" }}
                    onChange={(e) => { onFilesPicked(e.target.files); if (fileRef.current) fileRef.current.value = ""; }}
                  />
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder={recording ? "Recording…" : uploadingMedia ? "Uploading…" : "Type a message"}
                    className="mas-msgr-input mas-msgr-draft"
                  />
                  <button
                    type="button"
                    onClick={send}
                    disabled={sending || uploadingMedia || (!draft.trim() && pendingMedia.length === 0)}
                    className="mas-msgr-send"
                    aria-label="Send"
                  >
                    {sending ? <Spinner /> : <SendIcon />}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

// ── Author avatar (used in their-bubble rows) ──────────────────────────
function AuthorAvatar({ firstName, lastName, photoUrl }: { firstName: string; lastName: string; photoUrl: string | null }) {
  if (photoUrl) {
    return (
      <div className="mas-msgr-avatar">
        <img src={photoUrl} alt="" />
      </div>
    );
  }
  return (
    <div className="mas-msgr-avatar is-fallback">
      {(firstName[0] ?? "?") + (lastName[0] ?? "")}
    </div>
  );
}

// ── Pending media tile ─────────────────────────────────────────────────
function PendingMedia({ m, onRemove }: { m: MessageMedia; onRemove: () => void }) {
  const label = m.kind === "audio" ? "Voice note" : m.kind === "video" ? "Video" : m.kind === "image" ? "Image" : (m.name ?? "File");
  return (
    <div className="mas-msgr-pending-tile">
      <div className="mas-msgr-pending-preview">
        {m.kind === "image" ? <img src={m.url} alt="" />
          : m.kind === "video" ? <video src={m.url} muted playsInline />
          : m.kind === "audio" ? <AudioIcon />
          : <FileIcon />}
      </div>
      <div className="mas-msgr-pending-meta">
        <span className="mas-msgr-pending-label">{label}</span>
        {m.name && m.kind !== "audio" && <span className="mas-msgr-pending-name">{m.name}</span>}
      </div>
      <button type="button" onClick={onRemove} aria-label="Remove">×</button>
    </div>
  );
}

// ── Read receipts ──────────────────────────────────────────────────────
interface ReceiptConv { participants: { id: string; firstName: string; lastName: string }[]; kind: "dm" | "group" }
function buildReceipt(
  msg: { createdAt: string },
  conv: ReceiptConv | null,
  readBy: Record<string, string>,
  meId: string,
): string | null {
  if (!conv) return "Sent";
  const others = conv.participants.filter((p) => p.id !== meId);
  if (others.length === 0) return null;
  const msgTime = new Date(msg.createdAt).getTime();
  const seenBy = others.filter((p) => {
    const stamp = readBy[p.id];
    if (!stamp) return false;
    return new Date(stamp).getTime() >= msgTime;
  });
  if (seenBy.length === 0) return "Sent";
  if (conv.kind === "dm") return "Seen";
  if (seenBy.length === others.length) return "Seen by everyone";
  if (seenBy.length === 1) return `Seen by ${seenBy[0].firstName}`;
  if (seenBy.length === 2) return `Seen by ${seenBy[0].firstName} & ${seenBy[1].firstName}`;
  return `Seen by ${seenBy.length} of ${others.length}`;
}

// ── Attachment renderer ────────────────────────────────────────────────
function MessageAttachment({ att, mine }: { att: MessageMedia; mine: boolean }) {
  if (att.kind === "image") {
    return (
      <a href={att.url} target="_blank" rel="noreferrer" className="mas-msgr-att mas-msgr-att-img">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={att.url} alt={att.name ?? ""} />
      </a>
    );
  }
  if (att.kind === "video") {
    return (
      <div className="mas-msgr-att mas-msgr-att-vid">
        <video src={att.url} controls playsInline preload="metadata" />
      </div>
    );
  }
  if (att.kind === "audio") {
    return (
      <div className="mas-msgr-att mas-msgr-att-audio">
        <audio src={att.url} controls preload="metadata" />
      </div>
    );
  }
  return (
    <a
      href={att.url}
      target="_blank"
      rel="noreferrer"
      className={`mas-msgr-att mas-msgr-att-file ${mine ? "is-mine" : "is-theirs"}`}
    >
      <FileIcon />
      <span>{att.name ?? "Attachment"}</span>
    </a>
  );
}

// ── Online indicator (used both on conversation list + thread header) ──
function OnlineDot() {
  return (
    <span className="mas-msgr-online" aria-label="Active now">
      <svg viewBox="0 0 32 32" width="9" height="9" aria-hidden>
        <rect x="14" y="2" width="4" height="28" rx="1.5" fill="#34d399" />
        <rect x="14" y="2" width="4" height="28" rx="1.5" fill="#34d399" transform="rotate(60 16 16)" />
        <rect x="14" y="2" width="4" height="28" rx="1.5" fill="#34d399" transform="rotate(120 16 16)" />
        <circle cx="16" cy="16" r="3.2" fill="#a7f3d0" />
      </svg>
    </span>
  );
}

// ── Time helpers ────────────────────────────────────────────────────────
function shortTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  const yest = new Date(now.getTime() - 86_400_000);
  if (d.toDateString() === yest.toDateString()) return "Yest";
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (days < 7) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function shortClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function dayHeader(d: Date): string {
  const now = new Date();
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, now)) return "Today";
  const yest = new Date(now.getTime() - 86_400_000);
  if (sameDay(d, yest)) return "Yesterday";
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (days < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

// Group messages into day blocks → author runs (consecutive messages from
// the same author within 3 minutes). The renderer uses the result to
// collapse repeated avatars + names, Messenger-style.
interface MsgRun { key: string; authorId: string; items: Message[] }
interface MsgDayBlock { key: string; dayLabel: string | null; runs: MsgRun[] }
function groupMessages(messages: Message[]): MsgDayBlock[] {
  if (messages.length === 0) return [];
  const blocks: MsgDayBlock[] = [];
  let currentBlock: MsgDayBlock | null = null;
  let lastAuthor: string | null = null;
  let lastTime = 0;
  let lastDay = "";

  for (const m of messages) {
    const d = new Date(m.createdAt);
    const dayKey = d.toDateString();
    if (dayKey !== lastDay) {
      currentBlock = { key: dayKey, dayLabel: dayHeader(d), runs: [] };
      blocks.push(currentBlock);
      lastDay = dayKey;
      lastAuthor = null;
    }
    const t = d.getTime();
    const newRun = m.authorId !== lastAuthor || (t - lastTime) > 3 * 60 * 1000;
    if (newRun) {
      currentBlock!.runs.push({ key: m.id, authorId: m.authorId, items: [m] });
    } else {
      currentBlock!.runs[currentBlock!.runs.length - 1].items.push(m);
    }
    lastAuthor = m.authorId;
    lastTime = t;
  }
  return blocks;
}

// ── Icons (inline SVG, currentColor) ───────────────────────────────────
function AttachIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  );
}
function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
    </svg>
  );
}
function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
      <path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a1 1 0 00-1.4 1.04L4 11l9 1-9 1-2 6.36a1 1 0 001.4 1.04z" />
    </svg>
  );
}
function ReactIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}
function ReplyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="9 17 4 12 9 7" />
      <path d="M20 18v-2a4 4 0 00-4-4H4" />
    </svg>
  );
}
function AudioIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M3 12v0M7 9v6M11 6v12M15 9v6M19 12v0" />
    </svg>
  );
}
function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
function Spinner() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="40 60">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.9s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────
const MESSENGER_CSS = `
.mas-msgr { color: var(--mas-ink); font-family: var(--mas-font-body); }
.mas-msgr-head { margin-bottom: var(--mas-s-4); }
.mas-msgr-kicker {
  display: block;
  color: var(--mas-brand-gold);
  font-family: var(--mas-font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 600;
}
.mas-msgr-title {
  margin: 4px 0 0;
  font-family: var(--mas-font-display);
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

/* Grid */
.mas-msgr-grid {
  display: grid;
  grid-template-columns: minmax(0, 340px) minmax(0, 1fr);
  gap: var(--mas-s-4);
  align-items: start;
  min-height: 640px;
}

/* ── List ─────────────────────────────────────────────────────────────── */
.mas-msgr-list {
  background: var(--mas-surface-1);
  border: 1px solid var(--mas-border);
  border-radius: var(--mas-r-3);
  padding: var(--mas-s-3);
  max-height: 700px;
  overflow-y: auto;
  box-shadow: var(--mas-shadow-2);
}
.mas-msgr-new {
  width: 100%;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 11px 14px;
  background: transparent;
  border: 1px dashed color-mix(in srgb, var(--mas-brand-gold) 45%, transparent);
  color: var(--mas-brand-gold);
  border-radius: var(--mas-r-2);
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  font-family: inherit;
  cursor: pointer;
  margin-bottom: var(--mas-s-3);
  transition: background var(--mas-fast) var(--mas-ease), border-color var(--mas-fast) var(--mas-ease);
}
.mas-msgr-new:hover {
  background: color-mix(in srgb, var(--mas-brand-gold) 8%, transparent);
  border-style: solid;
  border-color: var(--mas-brand-gold);
}
.mas-msgr-new.is-open {
  background: var(--mas-surface-well);
  border-style: solid;
  border-color: var(--mas-border-strong);
  color: var(--mas-ink-muted);
}

.mas-msgr-newpanel {
  margin-bottom: var(--mas-s-3);
  padding: var(--mas-s-3);
  border-radius: var(--mas-r-2);
  background: var(--mas-surface-well);
  border: 1px solid var(--mas-border);
  display: grid; gap: var(--mas-s-2);
  animation: mas-rise var(--mas-base) var(--mas-ease-out) both;
}
.mas-msgr-newtabs { display: flex; gap: 6px; }
.mas-msgr-newtab {
  flex: 1;
  padding: 8px 10px;
  background: transparent;
  color: var(--mas-ink-soft);
  border: 1px solid var(--mas-border);
  border-radius: var(--mas-r-1);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  font-family: inherit;
  transition: background var(--mas-fast) var(--mas-ease), color var(--mas-fast) var(--mas-ease);
}
.mas-msgr-newtab.is-active {
  background: color-mix(in srgb, var(--mas-brand-gold) 14%, transparent);
  color: var(--mas-brand-gold);
  border-color: color-mix(in srgb, var(--mas-brand-gold) 35%, transparent);
}

.mas-msgr-group { display: grid; gap: var(--mas-s-2); }
.mas-msgr-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.mas-msgr-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 8px 4px 10px;
  background: color-mix(in srgb, var(--mas-brand-gold) 14%, transparent);
  color: var(--mas-brand-gold);
  border-radius: var(--mas-r-pill);
  font-size: 12px;
  font-weight: 600;
}
.mas-msgr-chip button {
  background: transparent; border: 0; color: inherit;
  font-size: 16px; cursor: pointer; line-height: 1; padding: 0;
}
.mas-msgr-group-go {
  padding: 9px 14px;
  background: var(--mas-brand-gold);
  color: var(--mas-ink-on-light);
  border: 0;
  border-radius: var(--mas-r-2);
  font-weight: 700;
  font-size: 11.5px;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  cursor: pointer;
  font-family: inherit;
}
.mas-msgr-group-go:disabled { opacity: 0.45; cursor: not-allowed; }

.mas-msgr-input {
  width: 100%;
  background: var(--mas-surface);
  border: 1px solid var(--mas-border);
  color: var(--mas-ink);
  padding: 9px 12px;
  border-radius: var(--mas-r-2);
  font-size: 13.5px;
  font-family: var(--mas-font-body);
  outline: none;
  transition: border-color var(--mas-fast) var(--mas-ease);
}
.mas-msgr-input::placeholder { color: var(--mas-ink-soft); }
.mas-msgr-input:focus { border-color: var(--mas-border-focus); }

.mas-msgr-roster {
  max-height: 240px;
  overflow-y: auto;
  display: grid; gap: 3px;
  padding-top: 4px;
}
.mas-msgr-rosteritem {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 11px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--mas-r-2);
  color: var(--mas-ink);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  transition: background var(--mas-fast) var(--mas-ease), border-color var(--mas-fast) var(--mas-ease);
}
.mas-msgr-rosteritem:hover {
  background: var(--mas-surface-well);
  border-color: var(--mas-border);
}
.mas-msgr-rosteritem.is-checked {
  background: color-mix(in srgb, var(--mas-brand-gold) 10%, transparent);
  border-color: color-mix(in srgb, var(--mas-brand-gold) 35%, transparent);
}
.mas-msgr-rosteritem-name { display: inline-flex; align-items: center; gap: 6px; }
.mas-msgr-rosteritem-meta {
  display: inline-flex; align-items: center; gap: 6px;
  color: var(--mas-ink-soft); font-size: 11px;
}
.mas-msgr-checkdot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--mas-brand-gold);
  display: inline-block;
}
.mas-msgr-onlinedot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--mas-positive);
  box-shadow: 0 0 8px color-mix(in srgb, var(--mas-positive) 60%, transparent);
}

.mas-msgr-list-empty {
  padding: var(--mas-s-5) var(--mas-s-3);
  text-align: center;
}
.mas-msgr-list-empty p {
  margin: 0; color: var(--mas-ink-muted); font-size: 0.92rem; font-weight: 500;
}
.mas-msgr-list-empty small {
  display: block; margin-top: 4px; color: var(--mas-ink-soft); font-size: 0.82rem;
}

/* Conversation rows */
.mas-msgr-conv-list {
  list-style: none; margin: 0; padding: 0;
  display: grid; gap: 2px;
}
.mas-msgr-conv {
  width: 100%;
  display: flex; gap: 10px; align-items: center;
  padding: 10px 10px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--mas-r-2);
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: background var(--mas-fast) var(--mas-ease), border-color var(--mas-fast) var(--mas-ease);
}
.mas-msgr-conv:hover { background: var(--mas-surface-well); }
.mas-msgr-conv.is-active {
  background: color-mix(in srgb, var(--mas-brand-gold) 10%, transparent);
  border-color: color-mix(in srgb, var(--mas-brand-gold) 30%, transparent);
}
.mas-msgr-conv-avatar {
  position: relative;
  width: 40px; height: 40px; border-radius: 50%;
  overflow: hidden;
  background: color-mix(in srgb, var(--mas-brand-gold) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--mas-brand-gold) 30%, transparent);
  color: var(--mas-brand-gold);
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 0.84rem;
  flex-shrink: 0;
}
.mas-msgr-conv-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.mas-msgr-conv-badge {
  position: absolute; bottom: -2px; right: -2px;
  min-width: 17px; height: 17px; padding: 0 5px;
  border-radius: 999px;
  background: var(--mas-surface-2);
  border: 2px solid var(--mas-surface-1);
  color: var(--mas-ink-muted);
  font-family: var(--mas-font-mono);
  font-size: 9px;
  display: inline-flex; align-items: center; justify-content: center;
}
.mas-msgr-conv-body { flex: 1; min-width: 0; }
.mas-msgr-conv-line1 {
  display: flex; justify-content: space-between; gap: 8px; align-items: baseline;
}
.mas-msgr-conv-name {
  color: var(--mas-ink); font-weight: 600; font-size: 14px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  letter-spacing: -0.005em;
}
.mas-msgr-conv-time {
  color: var(--mas-ink-soft); font-size: 11px;
  flex-shrink: 0;
}
.mas-msgr-conv-line2 {
  display: flex; justify-content: space-between; gap: 8px; align-items: center;
  margin-top: 2px;
}
.mas-msgr-conv-preview {
  flex: 1; min-width: 0;
  color: var(--mas-ink-soft); font-size: 12.5px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.mas-msgr-conv-unread {
  background: var(--mas-brand-gold);
  color: var(--mas-ink-on-light);
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
}
.mas-msgr-conv.is-unread .mas-msgr-conv-name { font-weight: 700; }
.mas-msgr-conv.is-unread .mas-msgr-conv-preview { color: var(--mas-ink-muted); font-weight: 500; }

/* ── Thread ─────────────────────────────────────────────────────────── */
.mas-msgr-thread {
  background: var(--mas-surface-1);
  border: 1px solid var(--mas-border);
  border-radius: var(--mas-r-3);
  min-height: 640px;
  max-height: 700px;
  display: flex; flex-direction: column;
  overflow: hidden;
  box-shadow: var(--mas-shadow-2);
}
.mas-msgr-empty-thread {
  flex: 1;
  position: relative;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: var(--mas-s-7);
  color: var(--mas-ink-soft);
  overflow: hidden;
}
.mas-msgr-empty-bg {
  position: absolute; inset: 0;
  background:
    linear-gradient(180deg, rgba(8,22,38,0.92) 0%, rgba(8,22,38,0.78) 50%, rgba(8,22,38,0.96) 100%),
    url('/lounge/brand/crew-community.jpg') center / cover no-repeat;
  filter: saturate(0.85);
}
.mas-msgr-empty-content {
  position: relative; z-index: 1;
  max-width: 360px;
  animation: mas-rise var(--mas-base) var(--mas-ease-out) both;
}
.mas-msgr-empty-kicker {
  display: block;
  color: var(--mas-brand-gold);
  font-family: var(--mas-font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 10px;
}
.mas-msgr-empty-thread h3 {
  margin: 0;
  color: var(--mas-ink);
  font-family: var(--mas-font-display);
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.mas-msgr-empty-thread p {
  margin: 8px 0 0;
  color: var(--mas-ink-muted);
  font-size: 0.96rem;
  line-height: 1.5;
}

.mas-msgr-thread-head {
  display: flex; align-items: center; gap: 12px;
  padding: var(--mas-s-3) var(--mas-s-4);
  border-bottom: 1px solid var(--mas-border);
  background: color-mix(in srgb, var(--mas-surface-well) 80%, transparent);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  position: sticky; top: 0; z-index: 4;
}
.mas-msgr-back {
  display: none;
  background: transparent; border: 0;
  color: var(--mas-brand-gold);
  font-size: 22px; cursor: pointer; padding: 4px 8px;
  font-family: inherit; line-height: 1;
}
.mas-msgr-thread-titlewrap { flex: 1; min-width: 0; }
.mas-msgr-thread-title {
  color: var(--mas-ink); font-size: 1.02rem; font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  font-family: var(--mas-font-display);
}
.mas-msgr-thread-sub {
  margin-top: 1px;
  color: var(--mas-ink-soft); font-size: 11.5px;
  font-family: var(--mas-font-mono); letter-spacing: 0.02em;
}
.mas-msgr-thread-live {
  width: 9px; height: 9px; border-radius: 50%;
  background: var(--mas-positive);
  box-shadow: 0 0 10px color-mix(in srgb, var(--mas-positive) 70%, transparent);
}

.mas-msgr-thread-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--mas-s-4);
  scroll-behavior: smooth;
}
.mas-msgr-thread-empty {
  margin: var(--mas-s-7) auto 0;
  text-align: center; color: var(--mas-ink-soft);
}
.mas-msgr-thread-empty p {
  margin: 0; color: var(--mas-ink-muted); font-size: 0.95rem; font-weight: 500;
}
.mas-msgr-thread-empty small {
  display: block; margin-top: 4px; color: var(--mas-ink-soft); font-size: 0.82rem;
}

.mas-msgr-group-block { margin-bottom: var(--mas-s-4); }
.mas-msgr-day {
  display: flex; align-items: center; gap: 12px;
  margin: var(--mas-s-3) 0;
}
.mas-msgr-day::before,
.mas-msgr-day::after {
  content: ""; flex: 1; height: 1px;
  background: var(--mas-border);
}
.mas-msgr-day span {
  color: var(--mas-ink-soft);
  font-family: var(--mas-font-mono);
  font-size: 10.5px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-weight: 600;
}

.mas-msgr-run {
  display: flex; gap: 8px;
  margin-top: 4px;
  animation: mas-rise var(--mas-fast) var(--mas-ease-out) both;
}
.mas-msgr-run.is-mine { flex-direction: row-reverse; }
.mas-msgr-run-avatar { width: 28px; flex-shrink: 0; display: flex; align-items: flex-end; }
.mas-msgr-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--mas-border-strong);
  background: color-mix(in srgb, var(--mas-brand-gold) 14%, transparent);
}
.mas-msgr-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.mas-msgr-avatar.is-fallback {
  display: flex; align-items: center; justify-content: center;
  color: var(--mas-brand-gold);
  font-weight: 700; font-size: 11px;
}
.mas-msgr-run-bubbles {
  max-width: 78%;
  min-width: 0;
  display: flex; flex-direction: column; gap: 3px;
}
.mas-msgr-run.is-mine .mas-msgr-run-bubbles { align-items: flex-end; }
.mas-msgr-run-name {
  margin: 0 8px 2px;
  color: var(--mas-ink-soft);
  font-size: 11px;
  font-weight: 600;
}

.mas-msgr-msg { display: flex; flex-direction: column; }
.mas-msgr-bubble-row {
  display: flex; align-items: flex-end; gap: 6px;
}
.mas-msgr-run.is-mine .mas-msgr-bubble-row { flex-direction: row-reverse; }
.mas-msgr-bubble {
  padding: 8px 13px;
  border-radius: var(--mas-r-3);
  max-width: 100%;
  word-wrap: break-word;
  position: relative;
  font-size: 14.5px;
  line-height: 1.42;
  box-shadow: var(--mas-shadow-1);
}
.mas-msgr-bubble.is-mine {
  background: var(--mas-brand-gold);
  color: var(--mas-ink-on-light);
}
.mas-msgr-bubble.is-mine.is-tail { border-bottom-right-radius: 6px; }
.mas-msgr-bubble.is-theirs {
  background: var(--mas-surface-well);
  color: var(--mas-ink);
  border: 1px solid var(--mas-border);
}
.mas-msgr-bubble.is-theirs.is-tail { border-bottom-left-radius: 6px; }
.mas-msgr-text { white-space: pre-wrap; }

.mas-msgr-quote {
  display: block;
  padding: 6px 10px;
  margin-bottom: 6px;
  border-left: 3px solid;
  border-radius: 6px;
  text-decoration: none;
  font-size: 12.5px;
  line-height: 1.35;
}
.mas-msgr-bubble.is-mine .mas-msgr-quote {
  background: rgba(12,28,46,0.18);
  border-left-color: rgba(12,28,46,0.55);
  color: rgba(12,28,46,0.95);
}
.mas-msgr-bubble.is-theirs .mas-msgr-quote {
  background: color-mix(in srgb, var(--mas-brand-gold) 8%, transparent);
  border-left-color: color-mix(in srgb, var(--mas-brand-gold) 55%, transparent);
  color: var(--mas-ink-muted);
}
.mas-msgr-quote-name {
  display: block; font-weight: 700; font-size: 11px;
}
.mas-msgr-quote-body {
  display: block;
  margin-top: 1px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 240px;
}

.mas-msgr-media {
  margin-top: 6px;
  display: grid; gap: 4px;
}
.mas-msgr-att { display: block; border-radius: var(--mas-r-2); overflow: hidden; }
.mas-msgr-att-img img {
  display: block; max-width: 100%; max-height: 320px; border-radius: var(--mas-r-2);
}
.mas-msgr-att-vid video {
  display: block; width: 100%; max-height: 360px; border-radius: var(--mas-r-2);
  background: var(--mas-surface-well);
}
.mas-msgr-att-audio audio { width: 100%; }
.mas-msgr-att-file {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  border-radius: var(--mas-r-2);
  font-size: 13px; font-weight: 600;
  text-decoration: none;
}
.mas-msgr-att-file.is-mine { background: rgba(12,28,46,0.12); color: rgba(12,28,46,0.95); }
.mas-msgr-att-file.is-theirs { background: color-mix(in srgb, var(--mas-brand-gold) 10%, transparent); color: var(--mas-brand-gold); }

/* Per-message tools (react / reply) — visible on hover, always visible on touch */
.mas-msgr-tools {
  display: flex; flex-direction: column; gap: 4px;
  opacity: 0;
  transition: opacity var(--mas-fast) var(--mas-ease);
}
.mas-msgr-bubble-row:hover .mas-msgr-tools,
.mas-msgr-bubble-row:focus-within .mas-msgr-tools { opacity: 1; }
@media (hover: none) {
  .mas-msgr-tools { opacity: 1; }
}
.mas-msgr-tool {
  width: 24px; height: 24px;
  border-radius: 999px;
  background: var(--mas-surface);
  border: 1px solid var(--mas-border);
  color: var(--mas-ink-soft);
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  transition: color var(--mas-fast) var(--mas-ease), border-color var(--mas-fast) var(--mas-ease);
}
.mas-msgr-tool:hover {
  color: var(--mas-brand-gold);
  border-color: color-mix(in srgb, var(--mas-brand-gold) 40%, transparent);
}

.mas-msgr-reactpop {
  display: inline-flex; gap: 4px;
  padding: 6px 8px;
  margin-top: 4px;
  background: var(--mas-surface-well);
  border: 1px solid var(--mas-border-strong);
  border-radius: var(--mas-r-pill);
  box-shadow: var(--mas-shadow-3);
  align-self: flex-start;
  animation: mas-rise var(--mas-fast) var(--mas-ease-out) both;
}
.mas-msgr-reactpop.is-mine { align-self: flex-end; }
.mas-msgr-reactpop-btn {
  background: transparent;
  border: 0;
  font-size: 19px;
  padding: 4px 6px;
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  transition: transform var(--mas-fast) var(--mas-ease), background var(--mas-fast) var(--mas-ease);
}
.mas-msgr-reactpop-btn:hover { transform: scale(1.18); background: rgba(255,255,255,0.06); }
.mas-msgr-reactpop-btn.is-mine { background: color-mix(in srgb, var(--mas-brand-gold) 18%, transparent); }

.mas-msgr-reactrow {
  display: flex; gap: 4px; flex-wrap: wrap;
  margin-top: 4px;
}
.mas-msgr-reactrow.is-mine { justify-content: flex-end; }
.mas-msgr-reactchip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 9px;
  background: var(--mas-surface-well);
  border: 1px solid var(--mas-border);
  border-radius: var(--mas-r-pill);
  color: var(--mas-ink-muted);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: border-color var(--mas-fast) var(--mas-ease), background var(--mas-fast) var(--mas-ease);
}
.mas-msgr-reactchip:hover { background: var(--mas-surface); border-color: var(--mas-border-strong); }
.mas-msgr-reactchip.is-mine {
  background: color-mix(in srgb, var(--mas-brand-gold) 14%, transparent);
  border-color: color-mix(in srgb, var(--mas-brand-gold) 40%, transparent);
}

.mas-msgr-time {
  margin-top: 4px;
  padding: 0 6px;
  color: var(--mas-ink-soft);
  font-size: 10.5px;
  letter-spacing: 0.02em;
}
.mas-msgr-time.is-mine { align-self: flex-end; }
.mas-msgr-time.is-theirs { align-self: flex-start; }
.mas-msgr-receipt { margin-left: 4px; color: var(--mas-ink-soft); }

/* Composer */
.mas-msgr-composer {
  padding: var(--mas-s-3) var(--mas-s-3) calc(env(safe-area-inset-bottom) + var(--mas-s-3));
  border-top: 1px solid var(--mas-border);
  background: var(--mas-surface-1);
  display: grid; gap: var(--mas-s-2);
}
.mas-msgr-reply {
  display: flex; justify-content: space-between; align-items: center; gap: 8px;
  padding: 8px 12px;
  background: color-mix(in srgb, var(--mas-brand-gold) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--mas-brand-gold) 30%, transparent);
  border-left: 3px solid var(--mas-brand-gold);
  border-radius: var(--mas-r-2);
  animation: mas-rise var(--mas-fast) var(--mas-ease-out) both;
}
.mas-msgr-reply > div { min-width: 0; }
.mas-msgr-reply-label {
  display: block;
  color: var(--mas-brand-gold);
  font-family: var(--mas-font-mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 600;
}
.mas-msgr-reply-body {
  display: block;
  margin-top: 2px;
  color: var(--mas-ink-muted);
  font-size: 12.5px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.mas-msgr-reply button {
  background: transparent; border: 0;
  color: var(--mas-ink-muted);
  font-size: 18px; cursor: pointer; padding: 2px 6px; line-height: 1;
  font-family: inherit;
}

.mas-msgr-pending {
  display: flex; gap: 6px; flex-wrap: wrap;
}
.mas-msgr-pending-tile {
  position: relative;
  display: flex; align-items: center; gap: 8px;
  padding: 6px 30px 6px 6px;
  background: var(--mas-surface-well);
  border: 1px solid var(--mas-border);
  border-radius: var(--mas-r-2);
  font-size: 12px;
  color: var(--mas-ink-muted);
}
.mas-msgr-pending-preview {
  width: 38px; height: 38px; flex-shrink: 0;
  border-radius: var(--mas-r-1);
  background: var(--mas-surface);
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  color: var(--mas-brand-gold);
}
.mas-msgr-pending-preview img,
.mas-msgr-pending-preview video {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.mas-msgr-pending-meta { display: grid; gap: 1px; min-width: 0; }
.mas-msgr-pending-label {
  color: var(--mas-ink);
  font-size: 12px;
  font-weight: 600;
}
.mas-msgr-pending-name {
  color: var(--mas-ink-soft);
  font-size: 11px;
  max-width: 140px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.mas-msgr-pending-tile button {
  position: absolute; top: 4px; right: 4px;
  background: transparent; border: 0;
  color: var(--mas-ink-soft); cursor: pointer; font-size: 16px; padding: 0; line-height: 1;
  font-family: inherit;
}

.mas-msgr-recording {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px;
  background: color-mix(in srgb, var(--mas-critical) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--mas-critical) 36%, transparent);
  border-radius: var(--mas-r-2);
  color: var(--mas-critical);
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.mas-msgr-recording-dot {
  width: 9px; height: 9px; border-radius: 50%;
  background: var(--mas-critical);
  animation: mas-pulse 1.2s ease-in-out infinite;
}

.mas-msgr-upload-status {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 7px 10px;
  align-items: center;
  padding: 9px 12px;
  background: color-mix(in srgb, var(--mas-info) 12%, var(--mas-surface-well));
  border: 1px solid color-mix(in srgb, var(--mas-info) 34%, var(--mas-border));
  border-radius: var(--mas-r-2);
  color: var(--mas-ink-muted);
  font-size: 12.5px;
  font-weight: 650;
}
.mas-msgr-upload-status > span:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mas-msgr-upload-status strong {
  color: var(--mas-brand-gold);
  font-family: var(--mas-font-mono);
  font-size: 11px;
}
.mas-msgr-upload-status.is-error {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  background: color-mix(in srgb, var(--mas-critical) 11%, transparent);
  border-color: color-mix(in srgb, var(--mas-critical) 38%, var(--mas-border));
  color: var(--mas-critical);
}
.mas-msgr-upload-status button {
  flex-shrink: 0;
  background: transparent;
  border: 0;
  color: inherit;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.mas-msgr-upload-bar {
  grid-column: 1 / -1;
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
}
.mas-msgr-upload-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--mas-brand-gold), var(--mas-info));
  transition: width 160ms var(--mas-ease);
}

.mas-msgr-composer-row {
  display: flex; gap: 8px; align-items: center;
}
.mas-msgr-icon-btn {
  width: 42px; height: 42px;
  padding: 0;
  background: var(--mas-surface-well);
  border: 1px solid var(--mas-border);
  color: var(--mas-ink-muted);
  border-radius: var(--mas-r-2);
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  font-family: inherit;
  transition: color var(--mas-fast) var(--mas-ease), border-color var(--mas-fast) var(--mas-ease);
}
.mas-msgr-icon-btn:hover {
  color: var(--mas-brand-gold);
  border-color: color-mix(in srgb, var(--mas-brand-gold) 40%, transparent);
}
.mas-msgr-icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.mas-msgr-icon-btn.is-recording {
  color: var(--mas-critical);
  border-color: color-mix(in srgb, var(--mas-critical) 50%, transparent);
  background: color-mix(in srgb, var(--mas-critical) 8%, var(--mas-surface-well));
}
.mas-msgr-draft {
  flex: 1;
  padding: 12px 16px;
  border-radius: var(--mas-r-3);
  font-size: 14.5px;
}
.mas-msgr-send {
  width: 42px; height: 42px;
  padding: 0;
  background: var(--mas-brand-gold);
  color: var(--mas-ink-on-light);
  border: 0;
  border-radius: var(--mas-r-2);
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  font-family: inherit;
  transition: filter var(--mas-fast) var(--mas-ease), transform var(--mas-fast) var(--mas-ease);
}
.mas-msgr-send:hover:not(:disabled) { filter: brightness(1.06); transform: translateY(-1px); }
.mas-msgr-send:disabled {
  background: var(--mas-surface-well);
  color: var(--mas-ink-soft);
  cursor: not-allowed;
}

/* ── Animations ─────────────────────────────────────────────────────── */
@keyframes mas-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.45; transform: scale(0.85); }
}

/* ── Mobile (single-pane Messenger pattern) ─────────────────────────── */
@media (max-width: 720px) {
  .mas-msgr-head { display: none; }
  .mas-msgr-grid { grid-template-columns: 1fr; gap: 0; min-height: auto; }
  .mas-msgr-list, .mas-msgr-thread {
    border-radius: 0;
    border-left: 0; border-right: 0;
    max-height: none; min-height: 0;
  }
  .mas-msgr-list {
    max-height: calc(100vh - 56px - env(safe-area-inset-bottom) - env(safe-area-inset-top));
  }
  .mas-msgr-thread {
    min-height: calc(100vh - 56px - env(safe-area-inset-bottom) - env(safe-area-inset-top));
  }
  .mas-msgr.has-active .mas-msgr-list { display: none; }
  .mas-msgr:not(.has-active) .mas-msgr-thread { display: none; }
  .mas-msgr-back { display: inline-flex; }
}

/* Online indicator on conv-avatar */
.mas-msgr-online {
  position: absolute;
  bottom: -2px; right: -2px;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: var(--mas-surface-2);
  border: 2px solid var(--mas-surface-1);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 8px color-mix(in srgb, var(--mas-positive) 60%, transparent);
}
`;
