"use client";

import { useState, useRef } from "react";

const MONTHS = [
  "january","february","march","april","may","june",
  "july","august","september","october","november","december",
];

type UploadState = "idle" | "uploading" | "fetching" | "done" | "error";

export default function CommercialClubAdmin() {
  const now = new Date();
  const [month,    setMonth]    = useState(MONTHS[now.getMonth()]);
  const [year,     setYear]     = useState(String(now.getFullYear()));
  const [file,     setFile]     = useState<File | null>(null);
  const [state,    setState]    = useState<UploadState>("idle");
  const [msg,      setMsg]      = useState("");
  const [liveUrl,  setLiveUrl]  = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() { setState("idle"); setMsg(""); setLiveUrl(""); }

  function handleFile(f: File | null) {
    if (!f) return;
    if (f.type !== "application/pdf") { setState("error"); setMsg("File must be a PDF."); return; }
    setFile(f); reset();
  }

  async function upload() {
    if (!file) return;
    setState("uploading"); setMsg("");
    const form = new FormData();
    form.append("month", month);
    form.append("year",  year);
    form.append("file",  file);
    try {
      const res  = await fetch("/api/admin/commercial-club", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) { setState("error"); setMsg(json.error ?? "Upload failed."); }
      else { setState("done"); setMsg("Newsletter is live!"); setLiveUrl(json.url); setFile(null); }
    } catch { setState("error"); setMsg("Network error. Try again."); }
  }

  async function fetchFromChamber() {
    setState("fetching"); setMsg(""); setLiveUrl("");
    try {
      const res  = await fetch("/api/admin/commercial-club/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      const json = await res.json();
      if (!res.ok) { setState("error"); setMsg(json.error ?? "Fetch failed."); }
      else { setState("done"); setMsg("Pulled from Chamber website — live!"); setLiveUrl(json.url); }
    } catch { setState("error"); setMsg("Network error. Try again."); }
  }

  const displayMonth = month.charAt(0).toUpperCase() + month.slice(1);
  const busy = state === "uploading" || state === "fetching";

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white mb-1">Commercial Club Newsletter</h1>
        <p className="text-slate-500 text-sm">Upload manually or pull directly from the Chamber website.</p>
      </div>

      {/* Month / Year */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <label className="text-slate-500 text-xs uppercase tracking-widest font-bold block mb-2">Month</label>
          <select
            value={month}
            onChange={e => { setMonth(e.target.value); reset(); }}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white capitalize focus:outline-none focus:border-[#f0b429]/50"
          >
            {MONTHS.map(m => (
              <option key={m} value={m} className="bg-[#040d1a] capitalize">
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <label className="text-slate-500 text-xs uppercase tracking-widest font-bold block mb-2">Year</label>
          <select
            value={year}
            onChange={e => { setYear(e.target.value); reset(); }}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#f0b429]/50"
          >
            {["2024","2025","2026","2027","2028"].map(y => (
              <option key={y} value={y} className="bg-[#040d1a]">{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Auto-fetch from Chamber */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 mb-5">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mt-0.5">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-emerald-400">
              <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-sm mb-0.5">Auto-fetch from Chamber Website</div>
            <div className="text-slate-500 text-xs leading-relaxed mb-3">
              Pulls the {displayMonth} {year} newsletter PDF directly from{" "}
              <span className="text-slate-400">millstadtchamber.org</span> — no download needed.
            </div>
            <button
              onClick={fetchFromChamber}
              disabled={busy}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-black px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2"
            >
              {state === "fetching" ? (
                <>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current animate-spin"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
                  Fetching…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
                  Pull {displayMonth} {year} from Chamber Site
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Manual upload divider */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-white/8" />
        <span className="text-slate-600 text-xs uppercase tracking-widest font-bold">or upload manually</span>
        <div className="flex-1 h-px bg-white/8" />
      </div>

      {/* Drop zone */}
      <div
        className={`rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 cursor-pointer ${
          dragging
            ? "border-[#f0b429]/80 bg-[#f0b429]/10 scale-[1.01]"
            : file
            ? "border-[#f0b429]/40 bg-[#f0b429]/5"
            : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0] ?? null); }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <>
            <svg viewBox="0 0 24 24" className="w-12 h-12 fill-current text-[#f0b429] mx-auto mb-3">
              <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/>
            </svg>
            <p className="text-[#f0b429] font-bold mb-1">{file.name}</p>
            <p className="text-slate-500 text-sm">{(file.size / 1024).toFixed(0)} KB · Click to change</p>
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="w-12 h-12 fill-current text-slate-600 mx-auto mb-3">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
            </svg>
            <p className="text-white font-bold mb-1">Drop PDF here</p>
            <p className="text-slate-500 text-sm">or click to browse</p>
          </>
        )}
      </div>

      {/* Upload button */}
      <div className="mt-5 space-y-3">
        {file && !busy && (
          <button
            onClick={upload}
            className="w-full bg-[#f0b429] hover:bg-[#f5c842] text-[#040d1a] font-black py-3.5 rounded-xl transition-colors text-sm"
          >
            Upload {displayMonth} {year} Newsletter
          </button>
        )}

        {state === "uploading" && (
          <div className="w-full py-3.5 rounded-xl bg-white/5 text-slate-400 text-sm font-bold text-center animate-pulse">
            Uploading…
          </div>
        )}

        {state === "done" && (
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm justify-center py-2">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
            {msg}
            {liveUrl && (
              <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="underline text-emerald-300 ml-1">
                View PDF
              </a>
            )}
          </div>
        )}

        {state === "error" && (
          <p className="text-red-400 text-sm text-center font-bold">{msg}</p>
        )}
      </div>

      <p className="text-slate-700 text-xs text-center mt-6">
        Uploading a new file for the same month replaces the old one automatically.
      </p>
    </div>
  );
}
