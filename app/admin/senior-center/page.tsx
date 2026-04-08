"use client";

import { useState, useRef } from "react";

const MONTHS = [
  "january","february","march","april","may","june",
  "july","august","september","october","november","december",
];

const DOC_TYPES = [
  { type: "menu",         label: "Monthly Menu",      color: "amber" },
  { type: "activities",  label: "Activities",         color: "emerald" },
  { type: "newsletter",  label: "Newsletter",         color: "blue" },
];

type Status = { type: string; state: "idle" | "uploading" | "done" | "error"; msg?: string };

export default function SeniorCenterAdmin() {
  const now = new Date();
  const [password,  setPassword]  = useState("");
  const [authed,    setAuthed]    = useState(false);
  const [authErr,   setAuthErr]   = useState("");
  const [month,     setMonth]     = useState(MONTHS[now.getMonth()]);
  const [year,      setYear]      = useState(String(now.getFullYear()));
  const [statuses,  setStatuses]  = useState<Record<string, Status>>({});
  const [files,     setFiles]     = useState<Record<string, File | null>>({});
  const [dragging,  setDragging]  = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function setStatus(type: string, s: Status) {
    setStatuses(prev => ({ ...prev, [type]: s }));
  }

  function handleFile(type: string, file: File | null) {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setStatus(type, { type, state: "error", msg: "Must be a PDF file" });
      return;
    }
    setFiles(prev => ({ ...prev, [type]: file }));
    setStatus(type, { type, state: "idle" });
  }

  async function upload(type: string) {
    const file = files[type];
    if (!file) return;
    setStatus(type, { type, state: "uploading" });

    const form = new FormData();
    form.append("password", password);
    form.append("type", type);
    form.append("month", month);
    form.append("year", year);
    form.append("file", file);

    try {
      const res = await fetch("/api/admin/senior-center", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setStatus(type, { type, state: "error", msg: json.error ?? "Upload failed" });
      } else {
        setStatus(type, { type, state: "done", msg: "Live on the site!" });
        setFiles(prev => ({ ...prev, [type]: null }));
      }
    } catch {
      setStatus(type, { type, state: "error", msg: "Network error" });
    }
  }

  async function checkPassword() {
    // Quick probe — upload nothing, just check auth via a dummy request
    const form = new FormData();
    form.append("password", password);
    form.append("type", "menu");
    form.append("month", "test");
    form.append("year", "0000");
    const res = await fetch("/api/admin/senior-center", { method: "POST", body: form });
    if (res.status === 401) {
      setAuthErr("Wrong password.");
    } else {
      // 400 = bad fields but password passed
      setAuthed(true);
      setAuthErr("");
    }
  }

  const colorMap: Record<string, string> = {
    amber:   "border-amber-500/30 bg-amber-500/5 hover:border-amber-400/60",
    emerald: "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-400/60",
    blue:    "border-blue-500/30 bg-blue-500/5 hover:border-blue-400/60",
  };
  const iconColorMap: Record<string, string> = {
    amber: "text-amber-400", emerald: "text-emerald-400", blue: "text-blue-400",
  };
  const btnColorMap: Record<string, string> = {
    amber:   "bg-amber-500 hover:bg-amber-400",
    emerald: "bg-emerald-500 hover:bg-emerald-400",
    blue:    "bg-blue-500 hover:bg-blue-400",
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#040d1a] px-4">
        <div className="w-full max-w-sm glass rounded-2xl p-8 border border-white/10">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-[#f0b429]/10 border border-[#f0b429]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-[#f0b429] fill-current">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
            </div>
            <h1 className="text-white font-black text-xl">Senior Center Admin</h1>
            <p className="text-slate-500 text-sm mt-1">Enter your password to upload documents</p>
          </div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && checkPassword()}
            placeholder="Password"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-[#f0b429]/50 mb-3"
          />
          {authErr && <p className="text-red-400 text-sm mb-3">{authErr}</p>}
          <button
            onClick={checkPassword}
            className="w-full bg-[#f0b429] hover:bg-[#f5c842] text-[#040d1a] font-black py-3 rounded-lg transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040d1a] px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-black text-white mb-1">Senior Center Uploads</h1>
          <p className="text-slate-400 text-sm">Drop in the PDFs — they go live on the site instantly.</p>
        </div>

        {/* Month / Year selectors */}
        <div className="flex gap-4 mb-8">
          <div className="flex-1">
            <label className="text-slate-500 text-xs uppercase tracking-widest font-bold block mb-2">Month</label>
            <select
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white capitalize focus:outline-none focus:border-[#f0b429]/50"
            >
              {MONTHS.map(m => (
                <option key={m} value={m} className="bg-[#040d1a] capitalize">{m.charAt(0).toUpperCase() + m.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="text-slate-500 text-xs uppercase tracking-widest font-bold block mb-2">Year</label>
            <select
              value={year}
              onChange={e => setYear(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#f0b429]/50"
            >
              {["2026","2027","2028"].map(y => (
                <option key={y} value={y} className="bg-[#040d1a]">{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Upload cards */}
        <div className="flex flex-col gap-5">
          {DOC_TYPES.map(({ type, label, color }) => {
            const status = statuses[type];
            const file   = files[type];
            const isDrag = dragging === type;

            return (
              <div
                key={type}
                className={`rounded-2xl border-2 border-dashed p-6 transition-all duration-200 cursor-pointer ${colorMap[color]} ${isDrag ? "scale-[1.02] border-opacity-100" : ""}`}
                onClick={() => inputRefs.current[type]?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(type); }}
                onDragLeave={() => setDragging(null)}
                onDrop={e => {
                  e.preventDefault();
                  setDragging(null);
                  handleFile(type, e.dataTransfer.files[0] ?? null);
                }}
              >
                <input
                  ref={el => { inputRefs.current[type] = el; }}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={e => handleFile(type, e.target.files?.[0] ?? null)}
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <svg viewBox="0 0 24 24" className={`w-9 h-9 fill-current shrink-0 ${iconColorMap[color]}`}>
                      <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/>
                    </svg>
                    <div>
                      <div className="text-white font-bold text-base">{label}</div>
                      <div className="text-slate-500 text-sm mt-0.5">
                        {file ? (
                          <span className={iconColorMap[color]}>{file.name}</span>
                        ) : (
                          "Drop PDF here or click to browse"
                        )}
                      </div>
                    </div>
                  </div>

                  {file && !status?.state || (file && status?.state === "idle") ? (
                    <button
                      onClick={e => { e.stopPropagation(); upload(type); }}
                      className={`shrink-0 ${btnColorMap[color]} text-white font-bold px-5 py-2 rounded-lg text-sm transition-colors`}
                    >
                      Upload
                    </button>
                  ) : status?.state === "uploading" ? (
                    <div className="shrink-0 text-slate-400 text-sm font-bold animate-pulse">Uploading…</div>
                  ) : status?.state === "done" ? (
                    <div className="shrink-0 flex items-center gap-1.5 text-emerald-400 text-sm font-bold">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                      Live!
                    </div>
                  ) : status?.state === "error" ? (
                    <div className="shrink-0 text-red-400 text-xs font-bold max-w-[120px] text-right">{status.msg}</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-slate-600 text-xs text-center mt-8">
          Files go live immediately — no deploy needed. Uploading a new file for the same month replaces the old one.
        </p>
      </div>
    </div>
  );
}
