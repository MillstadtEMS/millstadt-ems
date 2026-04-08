"use client";

import { useEffect, useRef, useState } from "react";

// ── Content Model ─────────────────────────────────────────────────────────
// These are the ONLY editable fields. No code is exposed to the editor.

type FieldType = "text" | "textarea" | "url" | "tel" | "email";

interface ContentField {
  key: string;
  label: string;
  type: FieldType;
  fallback: string;    // Original hardcoded value — shown if no DB value
  hint?: string;
}

interface PageSection {
  title: string;
  fields: ContentField[];
}

interface EditablePage {
  id: string;
  label: string;
  path: string;
  sections: PageSection[];
}

const PAGES: EditablePage[] = [
  {
    id: "homepage",
    label: "Homepage",
    path: "/",
    sections: [
      {
        title: "Hero Section",
        fields: [
          { key: "homepage.hero.eyebrow",           label: "Eyebrow Text",          type: "text",     fallback: "Millstadt, Illinois · Est. 1980" },
          { key: "homepage.hero.title.line1",        label: "Title — Line 1",        type: "text",     fallback: "Millstadt" },
          { key: "homepage.hero.title.line2",        label: "Title — Line 2 (Gold)", type: "text",     fallback: "Ambulance" },
          { key: "homepage.hero.title.line3",        label: "Title — Line 3",        type: "text",     fallback: "Service" },
          { key: "homepage.hero.subtitle",           label: "Subtitle",              type: "text",     fallback: "Advanced Life Support When it Matters Most." },
          { key: "homepage.hero.subtitle2",          label: "Subtitle Line 2",       type: "text",     fallback: "24 hours a day, every day." },
          { key: "homepage.hero.primaryBtn.text",    label: "Primary Button Text",   type: "text",     fallback: "Pay Your Bill" },
          { key: "homepage.hero.primaryBtn.href",    label: "Primary Button URL",    type: "url",      fallback: "https://emsecurepay.emsbilling.com/" },
          { key: "homepage.hero.secondaryBtn.text",  label: "Secondary Button Text", type: "text",     fallback: "Donate" },
          { key: "homepage.hero.secondaryBtn.href",  label: "Secondary Button URL",  type: "url",      fallback: "/donate" },
        ],
      },
      {
        title: "Stats Bar",
        fields: [
          { key: "homepage.stats.0.num",   label: "Stat 1 — Number",  type: "text", fallback: "1980" },
          { key: "homepage.stats.0.label", label: "Stat 1 — Label",   type: "text", fallback: "Established" },
          { key: "homepage.stats.1.num",   label: "Stat 2 — Number",  type: "text", fallback: "ALS / BLS" },
          { key: "homepage.stats.1.label", label: "Stat 2 — Label",   type: "text", fallback: "Level of Care" },
          { key: "homepage.stats.2.num",   label: "Stat 3 — Number",  type: "text", fallback: "24 / 7" },
          { key: "homepage.stats.2.label", label: "Stat 3 — Label",   type: "text", fallback: "Emergency Response" },
          { key: "homepage.stats.3.num",   label: "Stat 4 — Number",  type: "text", fallback: "Millstadt" },
          { key: "homepage.stats.3.label", label: "Stat 4 — Label",   type: "text", fallback: "Service Area" },
        ],
      },
    ],
  },
  {
    id: "about",
    label: "About",
    path: "/about",
    sections: [
      {
        title: "Page Header",
        fields: [
          { key: "about.header.eyebrow",   label: "Eyebrow Text",  type: "text",     fallback: "Who We Are" },
          { key: "about.header.title",     label: "Page Title",    type: "text",     fallback: "About Millstadt EMS" },
          { key: "about.header.subtitle",  label: "Subtitle",      type: "textarea", fallback: "Serving Millstadt and the surrounding area with Advanced Life Support since 1980." },
        ],
      },
      {
        title: "Mission Statement",
        fields: [
          { key: "about.mission.body", label: "Mission Text", type: "textarea", fallback: "At Millstadt EMS, our mission is to provide exceptional, compassionate, and timely emergency medical care to our diverse community. We are dedicated to advancing health and safety through highly trained professionals, cutting-edge technology, and a commitment to continuous improvement, ensuring the well-being of every person we serve." },
        ],
      },
      {
        title: "Vision Statement",
        fields: [
          { key: "about.vision.body", label: "Vision Text", type: "textarea", fallback: "Our vision is to be a leader in pre-hospital care, setting the standard for emergency medical services through innovation, education, and collaboration. We strive to enhance the quality of life in our region by delivering the highest level of care, fostering community partnerships, and preparing for the challenges of tomorrow with excellence and integrity." },
        ],
      },
    ],
  },
  {
    id: "leadership",
    label: "Leadership",
    path: "/leadership",
    sections: [
      {
        title: "Page Header",
        fields: [
          { key: "leadership.header.title",    label: "Page Title", type: "text",     fallback: "Leadership" },
          { key: "leadership.header.subtitle", label: "Subtitle",   type: "textarea", fallback: "The people guiding Millstadt Ambulance Service — bringing decades of clinical experience, operational expertise, and a commitment to the community." },
        ],
      },
      {
        title: "EMS Chief",
        fields: [
          { key: "leadership.chief.name",  label: "Chief Name",   type: "text", fallback: "Jennifer Goetz" },
          { key: "leadership.chief.title", label: "Title",        type: "text", fallback: "EMS Chief" },
          { key: "leadership.chief.since", label: "Tenure Line",  type: "text", fallback: "Serving since 2024" },
        ],
      },
      {
        title: "Assistant Chief",
        fields: [
          { key: "leadership.asst-chief.name",  label: "Name",   type: "text", fallback: "Kenneth James" },
          { key: "leadership.asst-chief.title", label: "Title",  type: "text", fallback: "Assistant Chief of Operations" },
          { key: "leadership.asst-chief.since", label: "Tenure", type: "text", fallback: "Serving since 2015" },
        ],
      },
    ],
  },
  {
    id: "fleet",
    label: "Fleet",
    path: "/fleet",
    sections: [
      {
        title: "Page Header",
        fields: [
          { key: "fleet.header.title",    label: "Page Title", type: "text",     fallback: "The Fleet" },
          { key: "fleet.header.subtitle", label: "Subtitle",   type: "textarea", fallback: "Advanced and basic life support units maintained to the highest standards — ready to respond 24 hours a day, every day of the year." },
        ],
      },
      {
        title: "Unit M3935",
        fields: [
          { key: "fleet.unit3935.badge",       label: "Badge",       type: "text",     fallback: "Paramedic Unit" },
          { key: "fleet.unit3935.headline",    label: "Unit Name",   type: "text",     fallback: "M3935" },
          { key: "fleet.unit3935.subhead",     label: "Model",       type: "text",     fallback: "Demers E450" },
          { key: "fleet.unit3935.description", label: "Description", type: "textarea", fallback: "M3935 serves as the primary paramedic response unit for Millstadt Ambulance Service. Built on a 2025 Ford E450 Demers chassis, it represents the highest standard in advanced life support — equipped to manage cardiac, respiratory, and multi-system emergencies in the field." },
        ],
      },
      {
        title: "Unit M3926",
        fields: [
          { key: "fleet.unit3926.badge",       label: "Badge",       type: "text",     fallback: "ALS Upgradeable" },
          { key: "fleet.unit3926.headline",    label: "Unit Name",   type: "text",     fallback: "M3926" },
          { key: "fleet.unit3926.subhead",     label: "Model",       type: "text",     fallback: "Demers F350" },
          { key: "fleet.unit3926.description", label: "Description", type: "textarea", fallback: "M3926 serves as a versatile response unit for Millstadt Ambulance Service, supporting both daily operations and regional coverage." },
        ],
      },
      {
        title: "Unit M3925",
        fields: [
          { key: "fleet.unit3925.badge",       label: "Badge",       type: "text",     fallback: "Reserve Unit" },
          { key: "fleet.unit3925.headline",    label: "Unit Name",   type: "text",     fallback: "M3925" },
          { key: "fleet.unit3925.subhead",     label: "Model",       type: "text",     fallback: "Demers Sprinter Van" },
          { key: "fleet.unit3925.description", label: "Description", type: "textarea", fallback: "Unit M3925 is the reserve response unit for Millstadt Ambulance Service. Maintained in ready status, it serves as backup during maintenance cycles." },
        ],
      },
    ],
  },
  {
    id: "contact",
    label: "Contact",
    path: "/contact",
    sections: [
      {
        title: "Contact Info",
        fields: [
          { key: "contact.phone",    label: "Phone Number", type: "tel",   fallback: "(618) 234-2021",        hint: "Used in contact page and footer" },
          { key: "contact.address",  label: "Address",      type: "text",  fallback: "101 N Forest St, Millstadt, IL 62260" },
          { key: "contact.email",    label: "Email",        type: "email", fallback: "millstadtems@gmail.com" },
          { key: "contact.hours",    label: "Hours",        type: "text",  fallback: "24 Hours / 7 Days a Week" },
        ],
      },
    ],
  },
  {
    id: "careers",
    label: "Careers",
    path: "/careers",
    sections: [
      {
        title: "Page Header",
        fields: [
          { key: "careers.header.title",    label: "Page Title",  type: "text",     fallback: "Join Our Team" },
          { key: "careers.header.subtitle", label: "Subtitle",    type: "textarea", fallback: "Millstadt Ambulance Service is always looking for dedicated EMS professionals." },
        ],
      },
    ],
  },
  {
    id: "donate",
    label: "Donate",
    path: "/donate",
    sections: [
      {
        title: "Donation Info",
        fields: [
          { key: "donate.header.title",    label: "Page Title",   type: "text",     fallback: "Support Millstadt EMS" },
          { key: "donate.header.subtitle", label: "Subtitle",     type: "textarea", fallback: "Your donation directly supports our ability to serve the community." },
          { key: "donate.venmo.handle",    label: "Venmo Handle", type: "text",     fallback: "@MillstadtEMS", hint: "Used in the donation page Venmo section" },
        ],
      },
    ],
  },
  {
    id: "community-education",
    label: "Community Ed",
    path: "/community-education",
    sections: [
      {
        title: "Page Header",
        fields: [
          { key: "community-ed.header.title",    label: "Page Title", type: "text",     fallback: "Community Education" },
          { key: "community-ed.header.subtitle", label: "Subtitle",   type: "textarea", fallback: "Millstadt Ambulance Service is committed to keeping our community safe and informed through education and outreach." },
        ],
      },
    ],
  },
  {
    id: "links",
    label: "Links",
    path: "/links",
    sections: [
      {
        title: "Page Header",
        fields: [
          { key: "links.header.title",    label: "Page Title", type: "text",     fallback: "Important Links" },
          { key: "links.header.subtitle", label: "Subtitle",   type: "textarea", fallback: "Community resources, EMS education, and public safety links for Millstadt and the surrounding area." },
        ],
      },
    ],
  },
];

// ── Types ─────────────────────────────────────────────────────────────────

interface ContentRow { key: string; liveValue: string; draftValue: string | null; }

// ── Component ─────────────────────────────────────────────────────────────

export default function VisualEditorPage() {
  const [authed, setAuthed]         = useState(false);
  const [checking, setChecking]     = useState(true);
  const [password, setPassword]     = useState("");
  const [pwError, setPwError]       = useState("");
  const [unlocking, setUnlocking]   = useState(false);

  const [content, setContent]       = useState<ContentRow[]>([]);
  const [edits, setEdits]           = useState<Record<string, string>>({});
  const [selectedPage, setSelectedPage] = useState<EditablePage>(PAGES[0]);
  const [saving, setSaving]         = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saveMsg, setSaveMsg]       = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Check session on mount
  useEffect(() => {
    fetch("/api/admin/visual-editor/content")
      .then(r => { if (r.ok) { setAuthed(true); return r.json(); } })
      .then(data => { if (data) setContent(data); })
      .finally(() => setChecking(false));
  }, []);

  async function unlock() {
    setUnlocking(true); setPwError("");
    const r = await fetch("/api/admin/visual-editor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (r.ok) {
      setAuthed(true);
      const content = await fetch("/api/admin/visual-editor/content").then(r => r.json());
      setContent(content);
    } else {
      setPwError("Incorrect password.");
    }
    setUnlocking(false);
  }

  function getLive(key: string, fallback: string) {
    if (key in edits) return edits[key];
    return content.find(c => c.key === key)?.draftValue
      ?? content.find(c => c.key === key)?.liveValue
      ?? fallback;
  }

  function hasDraft(key: string) {
    if (key in edits) return true;
    return content.find(c => c.key === key)?.draftValue !== null && content.find(c => c.key === key)?.draftValue !== undefined;
  }

  const anyEdits = Object.keys(edits).length > 0;
  const anyDrafts = content.some(c => c.draftValue !== null) || anyEdits;

  async function saveDrafts() {
    if (!anyEdits) return;
    setSaving(true);
    const drafts = Object.entries(edits).map(([key, value]) => ({ key, value }));
    await fetch("/api/admin/visual-editor/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drafts }),
    });
    const updated = await fetch("/api/admin/visual-editor/content").then(r => r.json());
    setContent(updated);
    setEdits({});
    setSaving(false);
    setSaveMsg("Draft saved"); setTimeout(() => setSaveMsg(""), 3000);
  }

  async function publish() {
    setPublishing(true);
    if (anyEdits) await saveDrafts();
    await fetch("/api/admin/visual-editor/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const updated = await fetch("/api/admin/visual-editor/content").then(r => r.json());
    setContent(updated);
    setEdits({});
    setPublishing(false);
    setSaveMsg("Published — site updated"); setTimeout(() => setSaveMsg(""), 5000);
    // Refresh preview iframe
    if (iframeRef.current) iframeRef.current.src = `${selectedPage.path}?preview=ve&t=${Date.now()}`;
  }

  const inp  = "w-full bg-[#040d1a] border border-white/15 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f0b429]/50 placeholder:text-slate-600 transition-colors";
  const lbl  = "block text-slate-300 text-sm font-semibold mb-2";

  // ── Password gate ─────────────────────────────────────────────────────────
  if (checking) return <div className="text-slate-500 text-sm py-12">Checking session…</div>;

  if (!authed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-sm">
          <div className="bg-[#071428] border border-[#f0b429]/20 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#f0b429]/10 border border-[#f0b429]/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-[#f0b429]"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
              </div>
              <div>
                <div className="text-white font-black text-lg">Visual Editor</div>
                <div className="text-slate-500 text-xs">Second password required</div>
              </div>
            </div>
            <div className="mb-5">
              <label className={lbl}>Editor Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && unlock()}
                className={inp}
                placeholder="Enter editor password"
                autoFocus
              />
              {pwError && <p className="text-red-400 text-xs mt-2">{pwError}</p>}
            </div>
            <button onClick={unlock} disabled={unlocking || !password} className="w-full bg-[#f0b429] hover:bg-[#f5c842] disabled:opacity-40 text-[#020810] font-black py-3 rounded-xl transition-colors">
              {unlocking ? "Verifying…" : "Unlock Editor"}
            </button>
            <p className="text-slate-600 text-xs mt-4 text-center">This is separate from your main admin login.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main editor UI ────────────────────────────────────────────────────────
  return (
    <div className="flex gap-0 -m-6 md:-m-8 h-[calc(100vh-3.5rem)]">
      {/* Left: page navigator */}
      <aside className="w-52 shrink-0 bg-[#020f24] border-r border-white/8 flex flex-col overflow-y-auto">
        <div className="px-4 pt-5 pb-3 border-b border-white/8">
          <div className="text-[#f0b429] text-[10px] font-black tracking-[0.2em] uppercase mb-0.5">Visual Editor</div>
          <div className="text-white font-black text-sm">Page Navigator</div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {PAGES.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPage(p)}
              className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${selectedPage.id === p.id ? "bg-[#f0b429]/15 text-[#f0b429] font-bold" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>
              {p.label}
            </button>
          ))}
        </nav>
        {/* Lock */}
        <div className="px-2 py-3 border-t border-white/8">
          <button onClick={async () => { await fetch("/api/admin/visual-editor", { method: "DELETE" }); setAuthed(false); }} className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-slate-600 hover:text-slate-400 transition-colors">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
            Lock Editor
          </button>
        </div>
      </aside>

      {/* Center: live preview iframe */}
      <div className="flex-1 flex flex-col bg-[#010c1e] overflow-hidden">
        <div className="h-10 border-b border-white/8 flex items-center px-4 gap-3 shrink-0">
          <span className="text-slate-500 text-xs font-mono">{selectedPage.path}</span>
          <span className="text-[#f0b429]/60 text-xs">— Draft preview</span>
          <button onClick={() => { if (iframeRef.current) iframeRef.current.src = `${selectedPage.path}?preview=ve&t=${Date.now()}`; }} className="ml-auto text-slate-600 hover:text-slate-300 transition-colors" title="Refresh preview">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
          </button>
        </div>
        <iframe
          ref={iframeRef}
          src={`${selectedPage.path}?preview=ve`}
          className="flex-1 w-full border-none"
          title="Page preview"
        />
      </div>

      {/* Right: edit panel */}
      <aside className="w-80 shrink-0 bg-[#020f24] border-l border-white/8 flex flex-col overflow-y-auto">
        {/* Header + actions */}
        <div className="px-5 pt-5 pb-4 border-b border-white/8 shrink-0">
          <div className="text-white font-black text-base mb-1">{selectedPage.label}</div>
          <div className="text-slate-500 text-xs mb-4">Editing structured content only — no code is exposed.</div>
          <div className="flex gap-2">
            <button
              onClick={saveDrafts}
              disabled={!anyEdits || saving}
              className="flex-1 bg-[#071428] border border-white/10 hover:border-white/20 disabled:opacity-40 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-colors"
            >
              {saving ? "Saving…" : "Save Draft"}
            </button>
            <button
              onClick={publish}
              disabled={!anyDrafts || publishing}
              className="flex-1 bg-[#f0b429] hover:bg-[#f5c842] disabled:opacity-40 text-[#020810] font-black py-2.5 rounded-xl text-xs transition-colors"
            >
              {publishing ? "Publishing…" : "Publish"}
            </button>
          </div>
          {saveMsg && <p className="text-emerald-400 text-xs mt-2 text-center font-semibold">{saveMsg}</p>}
          {anyDrafts && !saveMsg && <p className="text-[#f0b429] text-xs mt-2 text-center">Unpublished changes</p>}
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-8">
          {selectedPage.sections.map(section => (
            <div key={section.title}>
              <div className="flex items-center gap-2 mb-4">
                <span className="h-px w-5 bg-[#f0b429]" />
                <span className="text-[#f0b429] text-[10px] font-black tracking-widest uppercase">{section.title}</span>
              </div>
              <div className="space-y-4">
                {section.fields.map(field => {
                  const val = getLive(field.key, field.fallback);
                  const draft = hasDraft(field.key);
                  return (
                    <div key={field.key}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <label className="text-slate-300 text-xs font-semibold">{field.label}</label>
                        {draft && <span className="text-[#f0b429] text-[9px] font-black uppercase tracking-widest bg-[#f0b429]/10 px-1.5 py-0.5 rounded">Draft</span>}
                      </div>
                      {field.hint && <p className="text-slate-600 text-xs mb-1.5">{field.hint}</p>}
                      {field.type === "textarea" ? (
                        <textarea
                          value={val}
                          onChange={e => setEdits(prev => ({ ...prev, [field.key]: e.target.value }))}
                          rows={3}
                          className="w-full bg-[#040d1a] border border-white/15 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-[#f0b429]/50 placeholder:text-slate-600 resize-none transition-colors"
                        />
                      ) : (
                        <input
                          type={field.type}
                          value={val}
                          onChange={e => setEdits(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className="w-full bg-[#040d1a] border border-white/15 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-[#f0b429]/50 placeholder:text-slate-600 transition-colors"
                        />
                      )}
                      {(field.key in edits) && edits[field.key] !== field.fallback && (
                        <button onClick={() => {
                          const next = { ...edits };
                          delete next[field.key];
                          setEdits(next);
                        }} className="text-slate-600 hover:text-slate-400 text-xs mt-1 transition-colors">Revert</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
