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
interface Message {
  id: string;
  conversationId: string;
  authorId: string;
  authorFirstName: string;
  authorLastName: string;
  authorPhotoUrl: string | null;
  body: string;
  media: MessageMedia[];
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

  async function send() {
    if (!activeId || sending) return;
    if (!draft.trim() && pendingMedia.length === 0) return;
    setSending(true);
    try {
      const r = await fetch(`/api/lounge/messages/${activeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim(), media: pendingMedia }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.message) setMessages((s) => [...s, d.message as Message]);
        setDraft("");
        setPendingMedia([]);
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
              <input
                placeholder="Search employees…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", background: "#040d1a", border: "1px solid rgba(255,255,255,0.10)", color: "white", padding: "8px 12px", borderRadius: 10, fontSize: 13, outline: "none", marginBottom: 8 }}
              />
              <div style={{ maxHeight: 220, overflowY: "auto", display: "grid", gap: 4 }}>
                {filteredRoster.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => openDmWith(r.id)}
                    style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, color: "white", fontSize: 13, fontWeight: 700, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    <span>{r.firstName} {r.lastName}</span>
                    {r.certification && <span style={{ color: "#94a3b8", fontSize: 11 }}>{r.certification}</span>}
                  </button>
                ))}
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
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(c.id)}
                      style={{ width: "100%", display: "flex", gap: 10, alignItems: "center", padding: "10px 10px", background: active ? "rgba(240,180,41,0.10)" : "transparent", border: active ? "1px solid rgba(240,180,41,0.30)" : "1px solid transparent", borderRadius: 10, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                    >
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(240,180,41,0.14)", border: "1px solid rgba(240,180,41,0.30)", color: "#f0b429", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, overflow: "hidden", position: "relative", flexShrink: 0 }}>
                        {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : initials.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                          <span style={{ color: "white", fontWeight: 800, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
                          {c.unreadCount > 0 && (
                            <span style={{ background: "#f0b429", color: "#040d1a", padding: "2px 7px", borderRadius: 999, fontSize: 10, fontWeight: 900 }}>{c.unreadCount}</span>
                          )}
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                          {c.lastMessage ? c.lastMessage.body : "No messages yet"}
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
                    return (
                      <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
                        <div style={{ maxWidth: "78%", background: mine ? "#f0b429" : "rgba(255,255,255,0.05)", color: mine ? "#040d1a" : "#e2e8f0", padding: "10px 14px", borderRadius: 14, borderBottomRightRadius: mine ? 4 : 14, borderBottomLeftRadius: mine ? 14 : 4 }}>
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
