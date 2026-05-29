"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

  // Poll active thread for new messages
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

  // Refresh conversation list every 8s for unread/last-message updates
  useEffect(() => {
    const id = setInterval(loadConversations, POLL_MS * 2);
    return () => clearInterval(id);
  }, [loadConversations]);

  // Auto-scroll to bottom on new messages
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
    setUploadingMedia(true);
    try {
      const { upload } = await import("@vercel/blob/client");
      for (const f of Array.from(files)) {
        try {
          const pathname = `lounge-messages/${Date.now()}-${(f.name || "upload").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120)}`;
          const blob = await upload(pathname, f, {
            access: "public",
            handleUploadUrl: "/api/lounge/messages/media",
            contentType: f.type || undefined,
            clientPayload: JSON.stringify({ mime: f.type || "" }),
            multipart: true,
          });
          const kind: MessageMediaKind =
            (f.type || "").startsWith("video/") ? "video" :
            (f.type || "").startsWith("audio/") ? "audio" :
            (f.type || "").startsWith("image/") ? "image" :
            /\.(mp4|mov|webm)$/i.test(f.name) ? "video" :
            /\.(m4a|mp3|wav|ogg|webm|aac)$/i.test(f.name) ? "audio" :
            "image";
          setPendingMedia((s) => [...s, { url: blob.url, kind, name: f.name, mime: f.type || undefined }]);
        } catch (e) {
          console.error("[chat upload]", e);
        }
      }
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
    // Optimistic update so the picker feels snappy on slow connections.
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

  // Phone-portrait: show one pane at a time (Messenger-style). The CSS
  // classes are toggled by media query below — no JS resize listener
  // needed, and the SSR shell stays identical.
  return (
    <div className={`messenger-root ${activeConv ? "has-active" : ""}`}>
      <style>{`
        .messenger-root .messenger-header { margin-bottom: 16px; }
        .messenger-grid { display: grid; grid-template-columns: minmax(0,320px) minmax(0,1fr); gap: 14px; align-items: start; }
        .messenger-list { background:#071428; border:1px solid rgba(255,255,255,0.06); border-radius:14px; padding:12px; max-height:600px; overflow-y:auto; }
        .messenger-thread { background:#071428; border:1px solid rgba(255,255,255,0.06); border-radius:14px; padding:14px; min-height:500px; display:flex; flex-direction:column; }
        .messenger-back { display: none; }
        .messenger-row:hover .messenger-row-tools { opacity: 1 !important; }
        @media (max-width: 720px) {
          .messenger-row-tools { opacity: 1 !important; }
        }
        @media (max-width: 720px) {
          .messenger-root .messenger-header { display: none; }
          .messenger-grid { grid-template-columns: 1fr; gap: 0; }
          .messenger-list, .messenger-thread { border-radius: 0; border-left: 0; border-right: 0; }
          .messenger-list { max-height: calc(100vh - 56px - env(safe-area-inset-bottom) - env(safe-area-inset-top)); }
          .messenger-thread { min-height: calc(100vh - 56px - env(safe-area-inset-bottom) - env(safe-area-inset-top)); padding: 0; }
          .messenger-root.has-active .messenger-list { display: none; }
          .messenger-root:not(.has-active) .messenger-thread { display: none; }
          .messenger-back { display: inline-flex; }
        }
      `}</style>

      <header className="messenger-header">
        <div style={{ color: "#f0b429", fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          Messages
        </div>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.85rem", fontWeight: 900, letterSpacing: "-0.015em" }}>
          Millstadt EMS DM&apos;s
        </h1>
      </header>

      <div className="messenger-grid">
        {/* Conversation list */}
        <aside className="messenger-list">
          <button
            type="button"
            onClick={() => setShowRoster((v) => !v)}
            style={{ width: "100%", padding: "10px 12px", background: "#040d1a", border: "1px solid rgba(240,180,41,0.30)", color: "#f0b429", borderRadius: 10, fontSize: 12, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", marginBottom: 10 }}
          >
            {showRoster ? "Hide directory" : "+ Start a chat"}
          </button>

          {showRoster && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <button type="button" onClick={() => setCreateMode("dm")} style={modeTab(createMode === "dm")}>1:1 DM</button>
                <button type="button" onClick={() => setCreateMode("group")} style={modeTab(createMode === "group")}>Group</button>
              </div>
              {createMode === "group" && (
                <div style={{ display: "grid", gap: 8, marginBottom: 8 }}>
                  <input
                    value={groupTitle}
                    onChange={(e) => setGroupTitle(e.target.value)}
                    placeholder="Group name (optional)"
                    style={{ width: "100%", background: "#040d1a", border: "1px solid rgba(255,255,255,0.10)", color: "white", padding: "8px 12px", borderRadius: 10, fontSize: 13, outline: "none" }}
                  />
                  {groupSelected.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {groupSelected.map((m) => (
                        <span key={m.id} style={{ padding: "4px 8px", background: "rgba(240,180,41,0.15)", color: "#f0b429", borderRadius: 999, fontSize: 12, fontWeight: 800 }}>
                          {m.firstName} {m.lastName}
                          <button type="button" onClick={() => toggleGroupMember(m)} style={{ background: "transparent", border: 0, color: "#f0b429", marginLeft: 4, fontSize: 14, cursor: "pointer" }}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={createGroup}
                    disabled={groupSelected.length < 2}
                    style={{ padding: "8px 14px", background: groupSelected.length < 2 ? "rgba(240,180,41,0.4)" : "#f0b429", color: "#040d1a", border: 0, borderRadius: 10, fontWeight: 900, fontSize: 12, letterSpacing: "0.10em", textTransform: "uppercase", cursor: groupSelected.length < 2 ? "not-allowed" : "pointer", fontFamily: "inherit" }}
                  >
                    Start group ({groupSelected.length})
                  </button>
                </div>
              )}
              <input
                placeholder="Search employees…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", background: "#040d1a", border: "1px solid rgba(255,255,255,0.10)", color: "white", padding: "8px 12px", borderRadius: 10, fontSize: 13, outline: "none", marginBottom: 8 }}
              />
              <div style={{ maxHeight: 220, overflowY: "auto", display: "grid", gap: 4 }}>
                {filteredRoster.map((r) => {
                  const checked = groupSelected.some((g) => g.id === r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => createMode === "group" ? toggleGroupMember(r) : openDmWith(r.id)}
                      style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", background: checked ? "rgba(240,180,41,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${checked ? "rgba(240,180,41,0.30)" : "rgba(255,255,255,0.06)"}`, borderRadius: 8, color: "white", fontSize: 13, fontWeight: 700, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      <span>{createMode === "group" ? `${checked ? "✓ " : ""}` : ""}{r.firstName} {r.lastName}</span>
                      {r.certification && <span style={{ color: "#94a3b8", fontSize: 11 }}>{r.certification}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {conversations.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: 13, padding: 8 }}>No conversations yet. Use “Start a chat” to message someone.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4 }}>
              {conversations.map((c) => {
                const title = c.title ?? c.participants.map((p) => `${p.firstName} ${p.lastName}`).join(", ");
                const photo = c.participants[0]?.photoUrl ?? null;
                const initials = (c.participants[0]?.firstName?.[0] ?? "?") + (c.participants[0]?.lastName?.[0] ?? "");
                const active = c.id === activeId;
                // For DMs, presence reflects the single other participant.
                // For groups, "online" is anyone-online so the indicator
                // tells you somebody's likely around.
                const counterparts = c.participants;
                const onlineSomeone = counterparts.find((p) => presence[p.id]?.online);
                const isOnline = !!onlineSomeone;
                const newestActivity = counterparts
                  .map((p) => presence[p.id]?.lastActivityAt)
                  .filter((s): s is string => !!s)
                  .sort()
                  .pop() ?? null;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(c.id)}
                      style={{ width: "100%", display: "flex", gap: 10, alignItems: "center", padding: "10px 10px", background: active ? "rgba(240,180,41,0.10)" : "transparent", border: active ? "1px solid rgba(240,180,41,0.30)" : "1px solid transparent", borderRadius: 10, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                    >
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(240,180,41,0.14)", border: "1px solid rgba(240,180,41,0.30)", color: "#f0b429", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, overflow: "hidden", position: "relative", flexShrink: 0 }}>
                        {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : initials.toUpperCase()}
                        {isOnline && <OnlineDot />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                          <span style={{ color: "white", fontWeight: 800, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
                          {c.unreadCount > 0 && (
                            <span style={{ background: "#f0b429", color: "#040d1a", padding: "2px 7px", borderRadius: 999, fontSize: 10, fontWeight: 900 }}>{c.unreadCount}</span>
                          )}
                        </div>
                        <div style={{ color: isOnline ? "#86efac" : "#94a3b8", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2, fontWeight: isOnline ? 700 : 400 }}>
                          {isOnline ? `● Active now${c.kind === "group" ? ` · ${onlineSomeone?.firstName}` : ""}` : (newestActivity ? `Last active ${relTime(newestActivity)}` : (c.lastMessage ? c.lastMessage.body : "No messages yet"))}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Active thread */}
        <section className="messenger-thread">
          {!activeConv ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
              Pick a conversation or start a new one.
            </div>
          ) : (
            <>
              <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(2,9,18,0.65)", position: "sticky", top: 0, zIndex: 5, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0, flex: 1 }}>
                  <button
                    type="button"
                    className="messenger-back"
                    onClick={() => setActiveId(null)}
                    aria-label="Back to conversations"
                    style={{ background: "transparent", border: 0, color: "#f0b429", fontSize: 22, padding: 4, cursor: "pointer", fontFamily: "inherit", alignItems: "center" }}
                  >
                    ‹
                  </button>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "#f0b429", fontSize: 10, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
                      {activeConv.kind === "dm" ? "Direct message" : "Group"}
                    </div>
                    <div style={{ color: "white", fontWeight: 800, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {activeConv.title ?? activeConv.participants.map((p) => `${p.firstName} ${p.lastName}`).join(", ")}
                    </div>
                  </div>
                </div>
              </header>
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                {messages.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: 13, alignSelf: "center", marginTop: 30 }}>
                    No messages in this thread yet. Say hi.
                  </p>
                ) : (() => {
                  // Pre-compute the id of the last message I sent so we only
                  // render one "Seen by…" receipt at the bottom of the thread
                  // (Messenger-style — no per-message ticks above it).
                  const lastMineIdx = (() => {
                    for (let i = messages.length - 1; i >= 0; i--) {
                      if (messages[i].authorId === meId) return i;
                    }
                    return -1;
                  })();
                  return messages.map((m, idx) => {
                    const mine = m.authorId === meId;
                    const showReceipt = mine && idx === lastMineIdx;
                    const receipt = showReceipt ? buildReceipt(m, activeConv, readBy, meId) : null;
                    const counts = new Map<MessageReactionKind, number>();
                    for (const r of m.reactions) counts.set(r.kind, (counts.get(r.kind) ?? 0) + 1);
                    const myReaction = m.reactions.find((r) => r.userId === meId)?.kind ?? null;
                    return (
                      <div
                        key={m.id}
                        className="messenger-row"
                        style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", position: "relative" }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, flexDirection: mine ? "row-reverse" : "row", maxWidth: "92%" }}>
                          <div style={{ maxWidth: "100%", background: mine ? "#f0b429" : "rgba(255,255,255,0.05)", color: mine ? "#040d1a" : "#e2e8f0", padding: "10px 14px", borderRadius: 14, borderBottomRightRadius: mine ? 4 : 14, borderBottomLeftRadius: mine ? 14 : 4 }}>
                            {m.replyTo && (
                              <div style={{
                                background: mine ? "rgba(4,13,26,0.18)" : "rgba(255,255,255,0.04)",
                                borderLeft: `3px solid ${mine ? "rgba(4,13,26,0.45)" : "rgba(56,189,248,0.55)"}`,
                                padding: "6px 8px", borderRadius: 6, marginBottom: 6,
                                fontSize: 12,
                              }}>
                                <div style={{ color: mine ? "rgba(4,13,26,0.85)" : "#7dd3fc", fontWeight: 800, fontSize: 11 }}>
                                  Replying to {m.replyTo.authorFirstName} {m.replyTo.authorLastName}
                                </div>
                                <div style={{ color: mine ? "rgba(4,13,26,0.85)" : "#cbd5e1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>
                                  {m.replyTo.bodyPreview || (m.replyTo.hasMedia ? "📎 Attachment" : "(message)")}
                                </div>
                              </div>
                            )}
                            {!mine && (
                              <div style={{ fontSize: 11, fontWeight: 800, color: "#cbd5e1", marginBottom: 2 }}>
                                {m.authorFirstName} {m.authorLastName}
                              </div>
                            )}
                            {m.body && <div style={{ fontSize: 14, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>{m.body}</div>}
                            {m.media && m.media.length > 0 && (
                              <div style={{ display: "grid", gap: 6, marginTop: m.body ? 6 : 0 }}>
                                {m.media.map((att, ai) => (
                                  <MessageAttachment key={ai} att={att} mine={mine} />
                                ))}
                              </div>
                            )}
                            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                              {new Date(m.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="messenger-row-tools" style={{ display: "flex", flexDirection: "column", gap: 4, opacity: 0, transition: "opacity 0.15s" }}>
                            <button
                              type="button"
                              title="React"
                              onClick={() => setReactionPickerFor(reactionPickerFor === m.id ? null : m.id)}
                              style={toolBtn}
                            >
                              😊
                            </button>
                            <button
                              type="button"
                              title="Reply"
                              onClick={() => setReplyTo(m)}
                              style={toolBtn}
                            >
                              ↩
                            </button>
                          </div>
                        </div>

                        {reactionPickerFor === m.id && (
                          <div style={{
                            marginTop: 4,
                            display: "flex", gap: 4,
                            padding: "6px 8px",
                            background: "rgba(2,9,18,0.92)",
                            border: "1px solid rgba(240,180,41,0.30)",
                            borderRadius: 999,
                            boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
                          }}>
                            {MESSAGE_REACTIONS.map((r) => (
                              <button
                                key={r.kind}
                                type="button"
                                title={r.label}
                                onClick={() => toggleReaction(m.id, r.kind)}
                                style={{
                                  background: myReaction === r.kind ? "rgba(240,180,41,0.20)" : "transparent",
                                  border: 0, fontSize: 20, padding: "4px 6px",
                                  borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
                                }}
                              >
                                {r.emoji}
                              </button>
                            ))}
                          </div>
                        )}

                        {m.reactions.length > 0 && (
                          <div style={{ marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {MESSAGE_REACTIONS.map((r) => {
                              const c = counts.get(r.kind) ?? 0;
                              if (c === 0) return null;
                              const isMine = myReaction === r.kind;
                              return (
                                <button
                                  key={r.kind}
                                  type="button"
                                  onClick={() => toggleReaction(m.id, r.kind)}
                                  style={{
                                    padding: "2px 8px",
                                    background: isMine ? "rgba(240,180,41,0.20)" : "rgba(255,255,255,0.06)",
                                    border: `1px solid ${isMine ? "rgba(240,180,41,0.40)" : "rgba(255,255,255,0.10)"}`,
                                    borderRadius: 999, color: "#e2e8f0",
                                    fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                                  }}
                                >
                                  {r.emoji} {c}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {receipt && (
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, marginRight: 4, fontWeight: 700 }}>
                            {receipt}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
                <div ref={messagesEndRef} />
              </div>
              <div style={{ padding: "10px 14px calc(env(safe-area-inset-bottom) + 12px)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "grid", gap: 8, background: "#071428", position: "sticky", bottom: 0 }}>
                {replyTo && (
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 10px", background: "rgba(56,189,248,0.08)",
                    border: "1px solid rgba(56,189,248,0.25)", borderLeft: "3px solid #38bdf8",
                    borderRadius: 8, gap: 8,
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: "#7dd3fc", fontSize: 11, fontWeight: 800 }}>
                        Replying to {replyTo.authorFirstName} {replyTo.authorLastName}
                      </div>
                      <div style={{ color: "#cbd5e1", fontSize: 12.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {replyTo.body || (replyTo.media.length > 0 ? "📎 Attachment" : "(message)")}
                      </div>
                    </div>
                    <button type="button" onClick={() => setReplyTo(null)} style={{ background: "transparent", border: 0, color: "#cbd5e1", fontSize: 16, cursor: "pointer", padding: "2px 6px", fontFamily: "inherit" }}>×</button>
                  </div>
                )}
                {pendingMedia.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {pendingMedia.map((m) => (
                      <div key={m.url} style={{ position: "relative", background: "#040d1a", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10, padding: 6, paddingRight: 28, fontSize: 12, color: "#cbd5e1", display: "flex", alignItems: "center", gap: 6 }}>
                        <span aria-hidden>{m.kind === "image" ? "🖼️" : m.kind === "video" ? "🎬" : m.kind === "audio" ? "🎙️" : "📎"}</span>
                        <span style={{ maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name ?? m.kind}</span>
                        <button type="button" onClick={() => dropPending(m.url)} style={{ position: "absolute", top: 4, right: 4, background: "transparent", border: 0, color: "#94a3b8", cursor: "pointer", fontSize: 16, lineHeight: 1, fontFamily: "inherit" }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadingMedia || recording}
                    style={iconBtnStyle}
                    title="Attach photo / video / file"
                  >
                    📎
                  </button>
                  <button
                    type="button"
                    onClick={recording ? stopRecording : startRecording}
                    disabled={uploadingMedia}
                    style={{ ...iconBtnStyle, color: recording ? "#fca5a5" : "#f0b429", borderColor: recording ? "rgba(252,165,165,0.40)" : "rgba(240,180,41,0.30)" }}
                    title={recording ? "Stop recording" : "Record voice note"}
                  >
                    {recording ? "■" : "🎙️"}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*"
                    style={{ display: "none" }}
                    onChange={(e) => { onFilesPicked(e.target.files); if (fileRef.current) fileRef.current.value = ""; }}
                  />
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder={recording ? "Recording…" : uploadingMedia ? "Uploading…" : "Message…"}
                    style={{ flex: 1, background: "#040d1a", border: "1px solid rgba(255,255,255,0.10)", color: "white", padding: "12px 14px", borderRadius: 12, fontSize: 14, outline: "none", fontFamily: "inherit" }}
                  />
                  <button
                    type="button"
                    onClick={send}
                    disabled={sending || uploadingMedia || (!draft.trim() && pendingMedia.length === 0)}
                    style={{ padding: "12px 18px", background: !draft.trim() && pendingMedia.length === 0 ? "rgba(240,180,41,0.4)" : "#f0b429", color: "#040d1a", border: 0, borderRadius: 12, fontWeight: 900, fontSize: 13, letterSpacing: "0.10em", textTransform: "uppercase", cursor: sending || uploadingMedia ? "not-allowed" : "pointer", fontFamily: "inherit" }}
                  >
                    {sending ? "Sending…" : "Send"}
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

// ── Read receipts ────────────────────────────────────────────────────────
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
  if (conv.kind === "dm") return "Seen ✓✓";
  if (seenBy.length === others.length) return "Seen by everyone";
  if (seenBy.length === 1) return `Seen by ${seenBy[0].firstName}`;
  if (seenBy.length === 2) return `Seen by ${seenBy[0].firstName} & ${seenBy[1].firstName}`;
  return `Seen by ${seenBy.length} of ${others.length}`;
}

// ── Inline attachment renderer ──────────────────────────────────────────
function MessageAttachment({ att, mine }: { att: MessageMedia; mine: boolean }) {
  if (att.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <a href={att.url} target="_blank" rel="noreferrer" style={{ display: "block", borderRadius: 10, overflow: "hidden" }}>
        <img src={att.url} alt={att.name ?? ""} style={{ display: "block", maxWidth: "100%", maxHeight: 320, borderRadius: 10 }} />
      </a>
    );
  }
  if (att.kind === "video") {
    return (
      <video src={att.url} controls playsInline preload="metadata" style={{ width: "100%", maxHeight: 360, borderRadius: 10, background: "#020912" }} />
    );
  }
  if (att.kind === "audio") {
    return (
      <audio src={att.url} controls preload="metadata" style={{ width: "100%" }} />
    );
  }
  return (
    <a href={att.url} target="_blank" rel="noreferrer" style={{ color: mine ? "#040d1a" : "#7dd3fc", textDecoration: "underline", fontWeight: 700, fontSize: 13 }}>
      📎 {att.name ?? "Attachment"}
    </a>
  );
}

const iconBtnStyle: React.CSSProperties = {
  padding: "10px 12px",
  background: "transparent",
  color: "#cbd5e1",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 10,
  fontFamily: "inherit",
  fontSize: 16,
  cursor: "pointer",
  lineHeight: 1,
};

// ── Online presence helpers ─────────────────────────────────────────────
function OnlineDot() {
  // Little star-of-life chip stuck to the corner of the avatar — green
  // outline ring, classic 6-point star inside.
  return (
    <span
      title="Active now"
      aria-label="Active now"
      style={{
        position: "absolute",
        bottom: -2,
        right: -2,
        width: 16,
        height: 16,
        borderRadius: "50%",
        background: "#04140a",
        border: "2px solid #071428",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0 10px rgba(134,239,172,0.55)",
      }}
    >
      <svg viewBox="0 0 32 32" width="11" height="11" aria-hidden>
        <rect x="14" y="2" width="4" height="28" rx="1.5" fill="#86efac" />
        <rect x="14" y="2" width="4" height="28" rx="1.5" fill="#86efac" transform="rotate(60 16 16)" />
        <rect x="14" y="2" width="4" height="28" rx="1.5" fill="#86efac" transform="rotate(120 16 16)" />
        <circle cx="16" cy="16" r="3" fill="#bbf7d0" />
      </svg>
    </span>
  );
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  return `${d}d ago`;
}

function modeTab(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: "8px 10px",
    background: active ? "rgba(240,180,41,0.15)" : "transparent",
    color: active ? "#f0b429" : "#94a3b8",
    border: `1px solid ${active ? "rgba(240,180,41,0.35)" : "rgba(255,255,255,0.10)"}`,
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.10em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

const toolBtn: React.CSSProperties = {
  background: "rgba(2,9,18,0.65)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "#cbd5e1",
  width: 26,
  height: 26,
  borderRadius: 999,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
  padding: 0,
  lineHeight: 1,
};
