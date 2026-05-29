"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

interface ConversationPreview {
  id: string;
  kind: "dm" | "group";
  title: string | null;
  participants: { id: string; firstName: string; lastName: string; photoUrl: string | null }[];
  lastMessage: { body: string; authorId: string; createdAt: string } | null;
  unreadCount: number;
  updatedAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  authorId: string;
  authorFirstName: string;
  authorLastName: string;
  authorPhotoUrl: string | null;
  body: string;
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
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
    if (!activeId || !draft.trim() || sending) return;
    setSending(true);
    try {
      const r = await fetch(`/api/lounge/messages/${activeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim() }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.message) setMessages((s) => [...s, d.message as Message]);
        setDraft("");
        loadConversations();
      }
    } finally {
      setSending(false);
    }
  }

  const activeConv = conversations.find((c) => c.id === activeId) ?? null;
  const filteredRoster = roster
    .filter((r) => r.id !== meId)
    .filter((r) => {
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return `${r.firstName} ${r.lastName}`.toLowerCase().includes(q);
    });

  return (
    <div>
      <header style={{ marginBottom: 16 }}>
        <div style={{ color: "#f0b429", fontSize: "0.7rem", fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
          Messages
        </div>
        <h1 style={{ margin: "4px 0 0", fontSize: "1.85rem", fontWeight: 900, letterSpacing: "-0.015em" }}>
          Ongoing crew chat
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "0.92rem", marginTop: 4 }}>
          One thread per person. Messages stay put — no fresh threads, no losing context.
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,320px) minmax(0,1fr)", gap: 14, alignItems: "start" }}>
        {/* Conversation list */}
        <aside style={{ background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 12, maxHeight: 600, overflowY: "auto" }}>
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
                        {photo ? <Image src={photo} alt="" fill sizes="38px" style={{ objectFit: "cover" }} /> : initials.toUpperCase()}
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
        <section style={{ background: "#071428", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 14, minHeight: 500, display: "flex", flexDirection: "column" }}>
          {!activeConv ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
              Pick a conversation or start a new one.
            </div>
          ) : (
            <>
              <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <div style={{ color: "#f0b429", fontSize: 10, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase" }}>
                    {activeConv.kind === "dm" ? "Direct message" : "Group"}
                  </div>
                  <div style={{ color: "white", fontWeight: 800, marginTop: 2 }}>
                    {activeConv.title ?? activeConv.participants.map((p) => `${p.firstName} ${p.lastName}`).join(", ")}
                  </div>
                </div>
              </header>
              <div style={{ flex: 1, overflowY: "auto", padding: "12px 0", display: "flex", flexDirection: "column", gap: 8 }}>
                {messages.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: 13, alignSelf: "center", marginTop: 30 }}>
                    No messages in this thread yet. Say hi.
                  </p>
                ) : messages.map((m) => {
                  const mine = m.authorId === meId;
                  return (
                    <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth: "78%", background: mine ? "#f0b429" : "rgba(255,255,255,0.05)", color: mine ? "#040d1a" : "#e2e8f0", padding: "10px 14px", borderRadius: 14, borderBottomRightRadius: mine ? 4 : 14, borderBottomLeftRadius: mine ? 14 : 4 }}>
                        {!mine && (
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#cbd5e1", marginBottom: 2 }}>
                            {m.authorFirstName} {m.authorLastName}
                          </div>
                        )}
                        <div style={{ fontSize: 14, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>{m.body}</div>
                        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                          {new Date(m.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <div style={{ paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 10 }}>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Message…"
                  style={{ flex: 1, background: "#040d1a", border: "1px solid rgba(255,255,255,0.10)", color: "white", padding: "12px 14px", borderRadius: 12, fontSize: 14, outline: "none", fontFamily: "inherit" }}
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={sending || !draft.trim()}
                  style={{ padding: "12px 18px", background: !draft.trim() ? "rgba(240,180,41,0.4)" : "#f0b429", color: "#040d1a", border: 0, borderRadius: 12, fontWeight: 900, fontSize: 13, letterSpacing: "0.10em", textTransform: "uppercase", cursor: sending || !draft.trim() ? "not-allowed" : "pointer", fontFamily: "inherit" }}
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      <style>{`
        @media (max-width: 767px) {
          aside { max-height: 320px !important; }
        }
      `}</style>
    </div>
  );
}
